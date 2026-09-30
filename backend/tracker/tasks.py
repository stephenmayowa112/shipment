"""
Celery Background Tasks for Asynchronous Notification Processing.

Triggered whenever:
1. Batch status changes (e.g. collection_closed -> departed -> in_transit -> arrived).
2. A new milestone update is logged by the admin.
3. Failed sends are retried from the admin notification audit history.
"""

import logging
from celery import shared_task
from django.utils import timezone
from .models import Batch, NotificationLog, DeliveryStatus
from .whatsapp import WhatsAppClient, APPROVED_TEMPLATES, format_batch_notification_text

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_batch_notification_task(
    self,
    batch_id: int,
    status_label: str,
    admin_note: str = "",
    is_milestone: bool = False
):
    """
    Enqueued on batch status change or milestone update.
    Sends WhatsApp notifications to all customers who have shipment items in this batch.
    Logs delivery status and customer attempts to NotificationLog.
    """
    try:
        batch = Batch.objects.prefetch_related('shipment_items__customer').get(pk=batch_id)
    except Batch.DoesNotExist:
        logger.error(f"[Task Error] Batch with id {batch_id} not found.")
        return {"error": f"Batch {batch_id} not found"}

    shipment_items = batch.shipment_items.all()
    if not shipment_items.exists():
        logger.info(f"[Task Info] Batch {batch_id} has no shipment items. Skipping notifications.")
        return {"info": "No items in batch to notify"}

    client = WhatsAppClient()
    recipients_data = []
    sent_count = 0
    failed_count = 0

    # Build representative message content for the audit log
    sample_content = format_batch_notification_text(
        batch_route=batch.route,
        status_label=status_label,
        admin_note=admin_note,
        customer_name="[Customer Name]",
        tracking_code="[ST-TRACKING-CODE]"
    )

    # Initial log entry in PENDING status
    notification_log = NotificationLog.objects.create(
        batch=batch,
        message_content=sample_content,
        timestamp=timezone.now(),
        delivery_status=DeliveryStatus.PENDING,
        recipient_count=shipment_items.count()
    )

    # Group by customer phone to avoid duplicate blasts if a customer has multiple items
    # but include their tracking codes
    customer_items_map = {}
    for item in shipment_items:
        cust = item.customer
        if cust.phone_number not in customer_items_map:
            customer_items_map[cust.phone_number] = {
                "customer": cust,
                "items": []
            }
        customer_items_map[cust.phone_number]["items"].append(item)

    for phone, data in customer_items_map.items():
        cust = data["customer"]
        items = data["items"]
        tracking_codes_str = ", ".join([it.tracking_reference for it in items])

        try:
            # For notifications outside customer service window, use approved Meta template
            template_info = (
                APPROVED_TEMPLATES["milestone_announcement"]
                if is_milestone else APPROVED_TEMPLATES["batch_status_update"]
            )

            # Meta template parameters:
            # {{1}}: Customer name
            # {{2}}: Batch route
            # {{3}}: Status / Milestone label
            # {{4}}: Admin Note
            # {{5}}: Tracking code(s)
            params = [
                cust.name,
                batch.route,
                status_label,
                admin_note or "No additional notes.",
                tracking_codes_str
            ]

            result = client.send_template_message(
                recipient_phone=cust.phone_number,
                template_name=template_info["name"],
                parameters=params,
                language_code="en_US"
            )

            is_success = result.get("success", False)
            if is_success:
                sent_count += 1
            else:
                failed_count += 1

            recipients_data.append({
                "customer_name": cust.name,
                "phone_number": cust.phone_number,
                "tracking_codes": tracking_codes_str,
                "status": "sent" if is_success else "failed",
                "message_id": result.get("message_id"),
                "error": result.get("error") if not is_success else None,
                "simulated": result.get("simulated", False)
            })

        except Exception as exc:
            logger.exception(f"Error notifying {cust.phone_number}: {exc}")
            failed_count += 1
            recipients_data.append({
                "customer_name": cust.name,
                "phone_number": cust.phone_number,
                "tracking_codes": tracking_codes_str,
                "status": "failed",
                "error": str(exc)
            })

    # Update final audit status
    if failed_count == 0:
        overall_status = DeliveryStatus.SENT
    elif sent_count > 0:
        overall_status = DeliveryStatus.PARTIAL
    else:
        overall_status = DeliveryStatus.FAILED

    notification_log.delivery_status = overall_status
    notification_log.recipient_count = len(customer_items_map)
    notification_log.recipients_data = recipients_data
    notification_log.save(update_fields=['delivery_status', 'recipient_count', 'recipients_data'])

    logger.info(
        f"[Task Complete] Batch {batch_id} notification run finished. "
        f"Status: {overall_status}, Sent: {sent_count}, Failed: {failed_count}."
    )

    return {
        "log_id": notification_log.id,
        "batch_id": batch_id,
        "status": overall_status,
        "sent_count": sent_count,
        "failed_count": failed_count
    }


@shared_task(bind=True, max_retries=3)
def retry_failed_notification_task(self, notification_log_id: int):
    """
    Retries failed recipient notifications recorded in a NotificationLog.
    """
    try:
        log_entry = NotificationLog.objects.select_related('batch').get(pk=notification_log_id)
    except NotificationLog.DoesNotExist:
        return {"error": f"NotificationLog {notification_log_id} not found"}

    client = WhatsAppClient()
    updated_recipients = []
    recovered_count = 0

    for rec in log_entry.recipients_data:
        if rec.get("status") == "failed":
            # Attempt resend
            result = client.send_text_message(
                recipient_phone=rec["phone_number"],
                message_body=f"Retry Notice: {log_entry.message_content}"
            )
            if result.get("success", False):
                rec["status"] = "sent"
                rec["error"] = None
                rec["retry_timestamp"] = timezone.now().isoformat()
                recovered_count += 1
            else:
                rec["error"] = result.get("error", "Retry failed")
        updated_recipients.append(rec)

    still_failed = any(r.get("status") == "failed" for r in updated_recipients)
    log_entry.recipients_data = updated_recipients
    log_entry.delivery_status = DeliveryStatus.PARTIAL if still_failed else DeliveryStatus.SENT
    log_entry.save(update_fields=['recipients_data', 'delivery_status'])

    return {
        "log_id": notification_log_id,
        "recovered_count": recovered_count,
        "delivery_status": log_entry.delivery_status
    }
