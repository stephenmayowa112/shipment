"""
Django REST Views for Cross-Border Shipment Tracker.

Includes:
- Batch management (create, update status with background Celery dispatch)
- Milestone updates (triggers background notification)
- Customer self-registration via shareable code
- Public customer tracking lookup by reference code
- Meta WhatsApp Business Cloud API Webhook receiver (verification & inbound auto-reply)
"""

import json
import logging
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Batch, Customer, ShipmentItem, MilestoneUpdate,
    NotificationLog, BatchStatus, generate_tracking_reference
)
from .tasks import send_batch_notification_task, retry_failed_notification_task
from .whatsapp import WhatsAppClient, normalize_phone_number

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Meta WhatsApp Webhook Endpoint
# ---------------------------------------------------------
@csrf_exempt
def whatsapp_webhook(request):
    """
    Handles Meta WhatsApp Cloud API Webhook.
    
    1. GET: Webhook verification challenge during setup in Meta App Dashboard.
    2. POST: Inbound customer messages (e.g. customer sends 'ST-LOS-8921-X9' to check status).
    """
    # Meta Webhook verification handshake
    if request.method == "GET":
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        expected_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "shiptrack_webhook_secret_verify_token_2026")

        if mode == "subscribe" and token == expected_token:
            logger.info("[WhatsApp Webhook] Verification successful!")
            return HttpResponse(challenge, status=200)
        else:
            logger.warning("[WhatsApp Webhook] Verification failed token mismatch")
            return HttpResponse("Verification token mismatch", status=403)

    # Inbound message reception
    elif request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"status": "invalid json"}, status=400)

        logger.info(f"[WhatsApp Inbound] Received payload: {json.dumps(body)[:200]}...")

        # Parse WhatsApp Cloud API standard payload structure
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            # Could be a delivery status update (sent, delivered, read)
            return JsonResponse({"status": "no_messages_received"}, status=200)

        client = WhatsAppClient()

        for msg in messages:
            sender_phone = msg.get("from")
            msg_type = msg.get("type")
            text_body = ""

            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "").strip()

            if not sender_phone or not text_body:
                continue

            # Check if text looks like a tracking reference (e.g. ST-XXXX or contains ST-)
            cleaned_query = text_body.upper().strip()
            
            # Lookup shipment by tracking reference
            item = ShipmentItem.objects.filter(
                tracking_reference__iexact=cleaned_query
            ).select_related('batch', 'customer').first()

            if item:
                batch = item.batch
                milestones = batch.milestones.order_by('-timestamp')[:3]
                milestone_text = "\n".join([
                    f"• {m.label} ({m.timestamp.strftime('%b %d, %H:%M')})"
                    for m in milestones
                ]) if milestones else "No recent milestones recorded."

                reply_text = (
                    f"📦 *ShipTrack Status: {item.tracking_reference}*\n\n"
                    f"👤 *Recipient:* {item.customer.name}\n"
                    f"🛣 *Route:* {batch.route}\n"
                    f"📍 *Current Status:* {batch.get_status_display()}\n"
                    f"📝 *Goods:* {item.description_of_goods}\n\n"
                    f"🕒 *Recent Milestones:*\n{milestone_text}\n\n"
                    f"🌐 Full Tracking Link: https://shiptrack.app/track?code={item.tracking_reference}"
                )
            else:
                reply_text = (
                    f"Hello! 👋 We could not find a shipment matching '{text_body}'.\n\n"
                    f"Please double-check your tracking code (format: ST-XXXX-XXXX) "
                    f"or visit https://shiptrack.app/track to search."
                )

            # Auto-respond within the 24-hr customer service window using standard text message
            client.send_text_message(recipient_phone=sender_phone, message_body=reply_text)

        return JsonResponse({"status": "success"}, status=200)

    return HttpResponse("Method not allowed", status=405)


# ---------------------------------------------------------
# Public Tracking Endpoint
# ---------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def track_shipment_item(request, tracking_reference):
    """
    Public lookup endpoint for customers to see their batch status and milestone history.
    """
    try:
        item = ShipmentItem.objects.select_related('batch', 'customer').get(
            tracking_reference__iexact=tracking_reference.strip()
        )
    except ShipmentItem.DoesNotExist:
        return Response(
            {"error": f"No shipment found with tracking code '{tracking_reference}'"},
            status=status.HTTP_404_NOT_FOUND
        )

    batch = item.batch
    milestones = batch.milestones.all().values('id', 'label', 'timestamp', 'admin_note')

    # Mask phone number for customer privacy on public page
    raw_phone = item.customer.phone_number
    masked_phone = raw_phone[:4] + " ••• ••• " + raw_phone[-4:] if len(raw_phone) >= 8 else raw_phone

    return Response({
        "tracking_reference": item.tracking_reference,
        "customer_name": item.customer.name,
        "masked_phone": masked_phone,
        "description_of_goods": item.description_of_goods,
        "status_override": item.status_override,
        "batch": {
            "id": batch.id,
            "route": batch.route,
            "status": batch.status,
            "status_display": batch.get_status_display(),
            "departure_date": batch.departure_date,
            "collection_deadline": batch.collection_deadline,
        },
        "milestones": list(milestones)
    })


# ---------------------------------------------------------
# Customer Self-Registration
# ---------------------------------------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def self_register_customer(request):
    """
    Allows a customer to self-register goods into an open batch using the batch registration code.
    """
    code = request.data.get('registration_code')
    name = request.data.get('name')
    phone = request.data.get('phone_number')
    email = request.data.get('email', '')
    description = request.data.get('description_of_goods')

    if not code or not name or not phone or not description:
        return Response(
            {"error": "registration_code, name, phone_number, and description_of_goods are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        batch = Batch.objects.get(registration_code=code.strip().upper())
    except Batch.DoesNotExist:
        return Response({"error": "Invalid or expired batch registration code."}, status=status.HTTP_404_NOT_FOUND)

    # Check if batch allows registration
    if batch.status not in [BatchStatus.ANNOUNCED, BatchStatus.COLLECTION_OPEN]:
        return Response(
            {"error": f"Batch is in '{batch.get_status_display()}' status and is no longer accepting new items."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create or update Customer
    customer, _ = Customer.objects.get_or_create(
        phone_number=phone.strip(),
        defaults={'name': name.strip(), 'email': email.strip() or None}
    )

    # Create ShipmentItem
    item = ShipmentItem.objects.create(
        batch=batch,
        customer=customer,
        description_of_goods=description.strip()
    )

    # Send Welcome Confirmation via WhatsApp
    client = WhatsAppClient()
    welcome_msg = (
        f"Hello {customer.name}! 👋 Your items have been registered with ShipTrack.\n\n"
        f"📦 Route: {batch.route}\n"
        f"🔖 Tracking Code: {item.tracking_reference}\n"
        f"📅 Drop-off Deadline: {batch.collection_deadline.strftime('%b %d, %Y')}\n\n"
        f"You will receive automatic updates here as your shipment moves. "
        f"Track online: https://shiptrack.app/track?code={item.tracking_reference}"
    )
    client.send_text_message(recipient_phone=customer.phone_number, message_body=welcome_msg)

    return Response({
        "success": True,
        "tracking_reference": item.tracking_reference,
        "batch_route": batch.route,
        "collection_deadline": batch.collection_deadline,
        "message": "Self-registration successful! Tracking code generated."
    }, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------
# Admin Batch & Notification Endpoints
# ---------------------------------------------------------
@api_view(['GET', 'POST'])
def batch_list_create(request):
    """
    List all shipment batches or create a new batch.
    """
    if request.method == 'GET':
        batches = Batch.objects.all().prefetch_related('shipment_items')
        data = []
        for b in batches:
            data.append({
                "id": b.id,
                "route": b.route,
                "departure_date": b.departure_date,
                "collection_deadline": b.collection_deadline,
                "status": b.status,
                "status_display": b.get_status_display(),
                "registration_code": b.registration_code,
                "items_count": b.shipment_items.count(),
                "created_at": b.created_at
            })
        return Response(data)

    elif request.method == 'POST':
        route = request.data.get('route')
        departure_date = request.data.get('departure_date')
        collection_deadline = request.data.get('collection_deadline')

        if not route or not departure_date or not collection_deadline:
            return Response({"error": "route, departure_date, and collection_deadline are required."}, status=400)

        batch = Batch.objects.create(
            route=route,
            departure_date=departure_date,
            collection_deadline=collection_deadline,
            status=BatchStatus.ANNOUNCED
        )
        return Response({
            "id": batch.id,
            "route": batch.route,
            "status": batch.status,
            "registration_code": batch.registration_code,
            "message": "Batch created successfully"
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def update_batch_status(request, batch_id):
    """
    Admin updates batch status.
    CRITICAL: This enqueues the Celery background notification job!
    """
    try:
        batch = Batch.objects.get(pk=batch_id)
    except Batch.DoesNotExist:
        return Response({"error": "Batch not found"}, status=404)

    new_status = request.data.get('status')
    admin_note = request.data.get('admin_note', '')

    if new_status not in dict(BatchStatus.choices):
        return Response({"error": f"Invalid status '{new_status}'"}, status=400)

    old_status = batch.status
    batch.status = new_status
    batch.save(update_fields=['status', 'updated_at'])

    # Enqueue background Celery task
    # Celery task sends WhatsApp notifications to all customers in batch asynchronously
    task_result = send_batch_notification_task.delay(
        batch_id=batch.id,
        status_label=batch.get_status_display(),
        admin_note=admin_note,
        is_milestone=False
    )

    return Response({
        "success": True,
        "batch_id": batch.id,
        "previous_status": old_status,
        "new_status": batch.status,
        "enqueued_task_id": str(task_result.id) if hasattr(task_result, 'id') else "task-enqueued",
        "message": f"Status updated to '{batch.get_status_display()}'. Background notification worker dispatched."
    })


@api_view(['POST'])
def add_milestone_update(request, batch_id):
    """
    Admin logs a custom milestone (e.g. 'Departed Lagos Port', 'Customs Clearance in JFK').
    CRITICAL: Enqueues background notification task!
    """
    try:
        batch = Batch.objects.get(pk=batch_id)
    except Batch.DoesNotExist:
        return Response({"error": "Batch not found"}, status=404)

    label = request.data.get('label')
    admin_note = request.data.get('admin_note', '')

    if not label:
        return Response({"error": "Milestone label is required"}, status=400)

    milestone = MilestoneUpdate.objects.create(
        batch=batch,
        label=label,
        admin_note=admin_note
    )

    # Enqueue background Celery task
    task_result = send_batch_notification_task.delay(
        batch_id=batch.id,
        status_label=f"Milestone: {label}",
        admin_note=admin_note,
        is_milestone=True
    )

    return Response({
        "success": True,
        "milestone_id": milestone.id,
        "label": milestone.label,
        "enqueued_task_id": str(task_result.id) if hasattr(task_result, 'id') else "task-enqueued",
        "message": "Milestone added. Background WhatsApp notification dispatched."
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def batch_notification_history(request, batch_id):
    """
    Returns audit history of notifications sent for this batch.
    """
    logs = NotificationLog.objects.filter(batch_id=batch_id).values(
        'id', 'batch_id', 'message_content', 'timestamp',
        'delivery_status', 'recipient_count', 'recipients_data', 'error_message'
    )
    return Response(list(logs))


@api_view(['POST'])
def retry_notification(request, log_id):
    """
    Retries failed recipients from a NotificationLog via Celery.
    """
    task_result = retry_failed_notification_task.delay(notification_log_id=log_id)
    return Response({
        "success": True,
        "message": "Notification retry enqueued.",
        "task_id": str(task_result.id) if hasattr(task_result, 'id') else "retry-enqueued"
    })
