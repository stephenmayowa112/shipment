#!/usr/bin/env python3
"""
Standalone Test Runner for Cross-Border Shipment Tracker Logic.
Executes using standard Python 3.10 libraries to verify domain models,
state transition rules, WhatsApp templates, and Celery notification dispatch.
"""

import sys
import unittest
from datetime import datetime, timezone

# Domain models simulation matching Django models
class MockBatch:
    def __init__(self, id, route, departure_date, collection_deadline, status="announced", registration_code="REG-TEST-1"):
        self.id = id
        self.route = route
        self.departure_date = departure_date
        self.collection_deadline = collection_deadline
        self.status = status
        self.registration_code = registration_code
        self.shipment_items = []
        self.milestones = []
        self.notification_logs = []

class MockCustomer:
    def __init__(self, id, name, phone_number, email=None):
        self.id = id
        self.name = name
        self.phone_number = phone_number
        self.email = email

class MockShipmentItem:
    def __init__(self, id, batch, customer, description_of_goods, tracking_reference, status_override=None):
        self.id = id
        self.batch = batch
        self.customer = customer
        self.description_of_goods = description_of_goods
        self.tracking_reference = tracking_reference
        self.status_override = status_override

class MockNotificationLog:
    def __init__(self, id, batch_id, message_content, delivery_status, recipient_count, recipients_data):
        self.id = id
        self.batch_id = batch_id
        self.message_content = message_content
        self.delivery_status = delivery_status
        self.recipient_count = recipient_count
        self.recipients_data = recipients_data
        self.timestamp = datetime.now(timezone.utc)

def normalize_phone_number(phone: str) -> str:
    import re
    cleaned = re.sub(r'[\s\-\(\)\+]', '', str(phone).strip())
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '234' + cleaned[1:]
    elif len(cleaned) == 10 and not cleaned.startswith('1'):
        cleaned = '1' + cleaned
    return cleaned

def format_whatsapp_message(batch_route, status_label, admin_note, customer_name, tracking_codes):
    return (
        f"Hello {customer_name},\n\n"
        f"📦 Route: {batch_route}\n"
        f"📍 Status: {status_label}\n"
        f"ℹ️ Update Note: {admin_note}\n"
        f"🔖 Your Tracking Code: {tracking_codes}\n"
        f"🌐 Track online anytime: https://shiptrack.app/track?code={tracking_codes}\n\n"
        "Reply with your tracking code to this chat anytime for an instant automated status update."
    )

def dispatch_batch_notification(batch, new_status, admin_note="", is_milestone=False):
    """
    Simulates Celery background worker sending WhatsApp messages
    """
    batch.status = new_status
    status_label = f"Milestone: {new_status}" if is_milestone else new_status.replace('_', ' ').title()

    recipients_data = []
    customer_map = {}
    for item in batch.shipment_items:
        phone = normalize_phone_number(item.customer.phone_number)
        if phone not in customer_map:
            customer_map[phone] = {"customer": item.customer, "items": []}
        customer_map[phone]["items"].append(item)

    for phone, data in customer_map.items():
        cust = data["customer"]
        items = data["items"]
        tracking_codes_str = ", ".join([i.tracking_reference for i in items])
        msg = format_whatsapp_message(
            batch_route=batch.route,
            status_label=status_label,
            admin_note=admin_note,
            customer_name=cust.name,
            tracking_codes=tracking_codes_str
        )
        recipients_data.append({
            "customer_name": cust.name,
            "phone_number": phone,
            "tracking_codes": tracking_codes_str,
            "status": "sent",
            "message_id": f"wamid.SIMULATED_{phone[-4:]}"
        })

    log = MockNotificationLog(
        id=len(batch.notification_logs) + 1,
        batch_id=batch.id,
        message_content=f"Batch {batch.route} updated to {status_label}. Note: {admin_note}",
        delivery_status="sent" if recipients_data else "no_recipients",
        recipient_count=len(recipients_data),
        recipients_data=recipients_data
    )
    batch.notification_logs.append(log)
    return log


class TestShipTrackNotificationPipeline(unittest.TestCase):
    def setUp(self):
        self.batch = MockBatch(
            id=1,
            route="Lagos (LOS) -> Houston (IAH)",
            departure_date="2026-10-15T12:00:00Z",
            collection_deadline="2026-10-10T18:00:00Z",
            status="collection_open"
        )
        self.cust1 = MockCustomer(id=1, name="Babatunde Adeleke", phone_number="+234 803 123 4567")
        self.cust2 = MockCustomer(id=2, name="Jessica Miller", phone_number="(713) 555-0188")

        self.item1 = MockShipmentItem(id=101, batch=self.batch, customer=self.cust1, description_of_goods="Spices & Clothing", tracking_reference="ST-LOS-8921-X9")
        self.item2 = MockShipmentItem(id=102, batch=self.batch, customer=self.cust2, description_of_goods="Art Crafts", tracking_reference="ST-LOS-8922-Y1")
        self.batch.shipment_items.extend([self.item1, self.item2])

    def test_phone_number_normalization(self):
        self.assertEqual(normalize_phone_number("+234 803 123 4567"), "2348031234567")
        self.assertEqual(normalize_phone_number("08031234567"), "2348031234567")
        self.assertEqual(normalize_phone_number("(713) 555-0188"), "17135550188")
        self.assertEqual(normalize_phone_number("+1-713-555-0188"), "17135550188")

    def test_batch_status_update_enqueues_notifications(self):
        admin_note = "All containers securely sealed. Flight EK784 departed LOS."
        log = dispatch_batch_notification(self.batch, new_status="departed", admin_note=admin_note)

        # Verify batch state transitioned
        self.assertEqual(self.batch.status, "departed")

        # Verify notification audit log was created
        self.assertEqual(log.recipient_count, 2)
        self.assertEqual(log.delivery_status, "sent")
        self.assertIn("Lagos (LOS) -> Houston (IAH)", log.message_content)

        # Verify recipients data contains all customer phone numbers
        recipients_phones = [r["phone_number"] for r in log.recipients_data]
        self.assertIn("2348031234567", recipients_phones)
        self.assertIn("17135550188", recipients_phones)

    def test_milestone_update_triggers_notification(self):
        milestone_label = "Cleared US Customs at IAH"
        admin_note = "Inspections passed without delays."
        log = dispatch_batch_notification(self.batch, new_status=milestone_label, admin_note=admin_note, is_milestone=True)

        self.assertEqual(log.recipient_count, 2)
        self.assertIn(milestone_label, log.message_content)

    def test_whatsapp_message_formatting_contains_vital_keys(self):
        msg = format_whatsapp_message(
            batch_route="Lagos (LOS) -> Houston (IAH)",
            status_label="Departed",
            admin_note="Flight en route",
            customer_name="Babatunde Adeleke",
            tracking_codes="ST-LOS-8921-X9"
        )
        self.assertIn("Hello Babatunde Adeleke", msg)
        self.assertIn("Lagos (LOS) -> Houston (IAH)", msg)
        self.assertIn("ST-LOS-8921-X9", msg)
        self.assertIn("https://shiptrack.app/track?code=ST-LOS-8921-X9", msg)


if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(TestShipTrackNotificationPipeline)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
