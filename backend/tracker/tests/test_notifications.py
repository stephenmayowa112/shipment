"""
Django Unit Tests for Batch Status Update -> Notification Trigger Flow.
"""

from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from tracker.models import Batch, Customer, ShipmentItem, MilestoneUpdate, NotificationLog, BatchStatus, DeliveryStatus
from tracker.tasks import send_batch_notification_task

class BatchNotificationFlowTests(TestCase):
    def setUp(self):
        # Create a test batch
        self.batch = Batch.objects.create(
            route="Lagos (LOS) -> Houston (IAH)",
            departure_date=timezone.now() + timezone.timedelta(days=7),
            collection_deadline=timezone.now() + timezone.timedelta(days=3),
            status=BatchStatus.COLLECTION_OPEN,
            registration_code="TESTCODE1"
        )

        # Create two test customers
        self.customer_ng = Customer.objects.create(
            name="Chinedu Okafor",
            phone_number="+2348031234567",
            email="chinedu@example.ng"
        )
        self.customer_us = Customer.objects.create(
            name="Folake Adeyemi",
            phone_number="+17135550199",
            email="folake@example.com"
        )

        # Create shipment items for these customers in this batch
        self.item1 = ShipmentItem.objects.create(
            batch=self.batch,
            customer=self.customer_ng,
            description_of_goods="3 cartons dried pepper, egusi and smoked catfish",
            tracking_reference="ST-LOS-TEST-01"
        )
        self.item2 = ShipmentItem.objects.create(
            batch=self.batch,
            customer=self.customer_us,
            description_of_goods="Traditional wedding attire and beads",
            tracking_reference="ST-LOS-TEST-02"
        )

    @patch('tracker.tasks.WhatsAppClient')
    def test_status_update_triggers_whatsapp_notifications(self, mock_client_class):
        """
        Verify that changing batch status and invoking notification task sends
        WhatsApp notifications to all customers and creates an audit NotificationLog.
        """
        mock_instance = MagicMock()
        mock_instance.send_template_message.return_value = {
            "success": True,
            "message_id": "wamid.TEST12345",
            "simulated": True
        }
        mock_client_class.return_value = mock_instance

        # Admin updates status to DEPARTED with an admin note
        self.batch.status = BatchStatus.DEPARTED
        self.batch.save()
        admin_note = "Flight EK784 departed on schedule."

        # Execute notification worker task
        result = send_batch_notification_task(
            batch_id=self.batch.id,
            status_label=self.batch.get_status_display(),
            admin_note=admin_note,
            is_milestone=False
        )

        # Verify task result
        self.assertEqual(result["status"], DeliveryStatus.SENT)
        self.assertEqual(result["sent_count"], 2)
        self.assertEqual(result["failed_count"], 0)

        # Verify WhatsApp client was called for each customer
        self.assertEqual(mock_instance.send_template_message.call_count, 2)

        # Verify NotificationLog was created
        log = NotificationLog.objects.get(pk=result["log_id"])
        self.assertEqual(log.batch, self.batch)
        self.assertEqual(log.delivery_status, DeliveryStatus.SENT)
        self.assertEqual(log.recipient_count, 2)
        self.assertIn("Lagos (LOS) -> Houston (IAH)", log.message_content)
        self.assertIn(admin_note, log.message_content)

    @patch('tracker.tasks.WhatsAppClient')
    def test_milestone_update_triggers_notification(self, mock_client_class):
        """
        Verify that adding a milestone update logs a milestone and dispatches WhatsApp alerts.
        """
        mock_instance = MagicMock()
        mock_instance.send_template_message.return_value = {
            "success": True,
            "message_id": "wamid.MILESTONE999",
            "simulated": True
        }
        mock_client_class.return_value = mock_instance

        milestone = MilestoneUpdate.objects.create(
            batch=self.batch,
            label="Cleared US Customs at IAH Houston Hub",
            admin_note="Pickup will start tomorrow at 10 AM."
        )

        result = send_batch_notification_task(
            batch_id=self.batch.id,
            status_label=f"Milestone: {milestone.label}",
            admin_note=milestone.admin_note,
            is_milestone=True
        )

        self.assertEqual(result["sent_count"], 2)
        log = NotificationLog.objects.get(pk=result["log_id"])
        self.assertIn("Cleared US Customs", log.message_content)
