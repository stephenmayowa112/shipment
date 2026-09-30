import uuid
from django.db import models
from django.utils import timezone

class BatchStatus(models.TextChoices):
    ANNOUNCED = 'announced', 'Announced'
    COLLECTION_OPEN = 'collection_open', 'Collection Open'
    COLLECTION_CLOSED = 'collection_closed', 'Collection Closed'
    DEPARTED = 'departed', 'Departed'
    IN_TRANSIT = 'in_transit', 'In Transit'
    ARRIVED = 'arrived', 'Arrived'
    READY_FOR_PICKUP = 'ready_for_pickup', 'Ready for Pickup'
    COMPLETED = 'completed', 'Completed'

class DeliveryStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    FAILED = 'failed', 'Failed'
    PARTIAL = 'partial', 'Partially Delivered'

def generate_registration_code():
    return uuid.uuid4().hex[:8].upper()

def generate_tracking_reference():
    return f"ST-{uuid.uuid4().hex[:8].upper()}"

class Batch(models.Model):
    """
    Represents a discrete shipment batch moving between Nigeria and the US.
    e.g., Lagos (LOS) -> Houston (IAH) or New York (JFK) -> Lagos (LOS).
    """
    route = models.CharField(
        max_length=200,
        help_text="Origin and destination route, e.g., 'Lagos (LOS) -> Houston (IAH)'"
    )
    departure_date = models.DateTimeField(
        help_text="Scheduled departure date and time"
    )
    collection_deadline = models.DateTimeField(
        help_text="Deadline for customers to drop off goods for this batch"
    )
    status = models.CharField(
        max_length=50,
        choices=BatchStatus.choices,
        default=BatchStatus.ANNOUNCED,
        db_index=True
    )
    registration_code = models.CharField(
        max_length=32,
        unique=True,
        default=generate_registration_code,
        help_text="Unique shareable code for customer self-registration"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Batches'

    def __str__(self):
        return f"[{self.get_status_display()}] {self.route} (Departs {self.departure_date.strftime('%Y-%m-%d')})"

    @property
    def shareable_registration_url(self):
        return f"/register?code={self.registration_code}"


class Customer(models.Model):
    """
    Logistics customer whose goods are placed inside one or more batches.
    """
    name = models.CharField(max_length=255)
    phone_number = models.CharField(
        max_length=32,
        help_text="E.164 formatted WhatsApp-enabled phone number, e.g. +2348012345678 or +17135550192"
    )
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone_number})"


class ShipmentItem(models.Model):
    """
    Specific item or bundle belonging to a customer inside a specific batch.
    Includes a unique tracking reference code for public self-service lookup.
    """
    batch = models.ForeignKey(
        Batch,
        related_name='shipment_items',
        on_delete=models.CASCADE
    )
    customer = models.ForeignKey(
        Customer,
        related_name='shipment_items',
        on_delete=models.CASCADE
    )
    description_of_goods = models.TextField(
        help_text="Summary of contents, e.g. '2 cartons dried spices, traditional attire'"
    )
    tracking_reference = models.CharField(
        max_length=32,
        unique=True,
        default=generate_tracking_reference,
        db_index=True,
        help_text="Non-guessable reference code for public tracking lookup"
    )
    status_override = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional item-specific status note (e.g. 'Held for extra inspection')"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tracking_reference}: {self.customer.name} - {self.description_of_goods[:40]}"


class MilestoneUpdate(models.Model):
    """
    Historical event/milestone logged against a batch (e.g. 'Departed Lagos Port').
    Triggers outbound WhatsApp notifications.
    """
    batch = models.ForeignKey(
        Batch,
        related_name='milestones',
        on_delete=models.CASCADE
    )
    label = models.CharField(
        max_length=255,
        help_text="Milestone summary label, e.g. 'Departed Lagos port' or 'Cleared US Customs'"
    )
    timestamp = models.DateTimeField(default=timezone.now)
    admin_note = models.TextField(
        blank=True,
        null=True,
        help_text="Optional note sent in WhatsApp update and shown on timeline"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.batch.route} - {self.label} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class NotificationLog(models.Model):
    """
    Audit log of outbound notification runs dispatched to WhatsApp Business Cloud API.
    Records delivery status and individual customer attempt outcomes.
    """
    batch = models.ForeignKey(
        Batch,
        related_name='notification_logs',
        on_delete=models.CASCADE
    )
    message_content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    delivery_status = models.CharField(
        max_length=32,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING
    )
    recipient_count = models.PositiveIntegerField(default=0)
    recipients_data = models.JSONField(
        default=list,
        blank=True,
        help_text="Per-recipient detail with phone number, customer name, delivery state and errors"
    )
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Batch #{self.batch_id} - {self.delivery_status} to {self.recipient_count} recipients at {self.timestamp}"
