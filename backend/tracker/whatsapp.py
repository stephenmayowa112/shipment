"""
WhatsApp Business Cloud API Integration Module.

Provides:
1. Outbound WhatsApp message dispatcher using approved Meta Cloud API templates.
   (Required by Meta for messages sent outside the 24-hour customer service window).
2. Direct text message sender (when within the 24-hour service window).
3. Inbound webhook payload parser and status lookup auto-responder.
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Standard WhatsApp Business Cloud API endpoints
WHATSAPP_GRAPH_URL = "https://graph.facebook.com"

# Approved Meta Template Configuration
# Note: For outbound broadcasts outside 24h conversation windows, Meta requires pre-approved templates
APPROVED_TEMPLATES = {
    "batch_status_update": {
        "name": "shiptrack_batch_status_update",
        "language": "en_US",
        "description": "Triggered when batch status transitions (announced, departed, arrived, etc.)",
        # Template components:
        # {{1}}: Customer Name
        # {{2}}: Route (e.g. Lagos -> Houston)
        # {{3}}: New Status / Milestone
        # {{4}}: Admin Note & Instructions
        # {{5}}: Tracking Code
    },
    "milestone_announcement": {
        "name": "shiptrack_milestone_update",
        "language": "en_US",
        "description": "Triggered on free-text milestone updates (e.g., Cleared Customs)",
    },
    "self_registration_confirmation": {
        "name": "shiptrack_registration_confirm",
        "language": "en_US",
        "description": "Welcome confirmation upon customer registering items into batch",
    }
}


def normalize_phone_number(phone: str) -> str:
    """
    Cleans and normalizes phone numbers to international E.164 without '+' or spaces.
    e.g.:
      "+234 801 234 5678" -> "2348012345678"
      "(713) 555-0192" (US) -> "17135550192"
      "08012345678" (Nigeria local) -> "2348012345678"
    """
    cleaned = re.sub(r'[\s\-\(\)\+]', '', str(phone).strip())
    # Handle Nigerian local phone format: 080... or 070... or 090... -> 23480...
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '234' + cleaned[1:]
    # Handle US 10-digit format without leading 1
    elif len(cleaned) == 10 and not cleaned.startswith('1'):
        cleaned = '1' + cleaned
    return cleaned


class WhatsAppClient:
    """
    Client for Meta WhatsApp Business Cloud API.
    Handles template messages, raw messages, and simulated dry-runs.
    """

    def __init__(self):
        # TODO: Configure your Meta WhatsApp Business API credentials in .env or settings.py
        # 1. Sign up at https://developers.facebook.com
        # 2. Add 'WhatsApp' product to your App
        # 3. Create a Permanent System User Token with 'whatsapp_business_messaging' permission
        # 4. Copy Phone Number ID and Business Account ID from WhatsApp > API Setup
        self.api_token = getattr(settings, 'WHATSAPP_API_TOKEN', 'YOUR_WHATSAPP_API_TOKEN')
        self.phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', 'YOUR_WHATSAPP_PHONE_NUMBER_ID')
        self.api_version = getattr(settings, 'WHATSAPP_API_VERSION', 'v20.0')
        self.is_configured = bool(
            self.api_token
            and not self.api_token.startswith('YOUR_')
            and not self.api_token.startswith('EAABxxxx')
            and self.phone_number_id
            and not self.phone_number_id.startswith('YOUR_')
        )

    def _get_url(self) -> str:
        return f"{WHATSAPP_GRAPH_URL}/{self.api_version}/{self.phone_number_id}/messages"

    def send_template_message(
        self,
        recipient_phone: str,
        template_name: str,
        parameters: List[str],
        language_code: str = "en_US"
    ) -> Dict[str, Any]:
        """
        Sends an approved Meta WhatsApp template message.
        Required for any outbound notification outside the 24-hr customer service window.
        """
        normalized_to = normalize_phone_number(recipient_phone)

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": normalized_to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(param)} for param in parameters
                        ]
                    }
                ]
            }
        }

        return self._execute_request(payload, normalized_to)

    def send_text_message(self, recipient_phone: str, message_body: str) -> Dict[str, Any]:
        """
        Sends a standard freeform text message.
        Note: Per Meta guidelines, text messages can only be sent within 24 hours of
        the user sending an inbound message to the business number (Customer Service Window).
        """
        normalized_to = normalize_phone_number(recipient_phone)
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": normalized_to,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message_body
            }
        }
        return self._execute_request(payload, normalized_to)

    def _execute_request(self, payload: Dict[str, Any], recipient: str) -> Dict[str, Any]:
        """
        Executes HTTP request or returns sandbox simulation response if credentials are mock.
        """
        if not self.is_configured:
            logger.info(
                f"[WhatsApp Sandbox Sim] Meta credentials not yet set or in sandbox mode. "
                f"Simulating delivery to +{recipient}."
            )
            return {
                "simulated": True,
                "success": True,
                "recipient": recipient,
                "message_id": f"wamid.SIMULATED_{recipient[-4:]}_{json.dumps(payload)[:16]}",
                "status": "delivered",
                "payload": payload
            }

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(self._get_url(), headers=headers, json=payload, timeout=10)
            data = response.json()
            if response.status_code in [200, 201]:
                return {
                    "simulated": False,
                    "success": True,
                    "recipient": recipient,
                    "message_id": data.get("messages", [{}])[0].get("id", "wamid.success"),
                    "data": data
                }
            else:
                error_msg = data.get("error", {}).get("message", response.text)
                logger.error(f"[WhatsApp API Error] Failed to send message to +{recipient}: {error_msg}")
                return {
                    "simulated": False,
                    "success": False,
                    "recipient": recipient,
                    "error": error_msg,
                    "status_code": response.status_code
                }
        except Exception as exc:
            logger.exception(f"[WhatsApp Network Error] Exception sending to +{recipient}: {str(exc)}")
            return {
                "simulated": False,
                "success": False,
                "recipient": recipient,
                "error": str(exc)
            }


def format_batch_notification_text(
    batch_route: str,
    status_label: str,
    admin_note: Optional[str] = None,
    customer_name: Optional[str] = None,
    tracking_code: Optional[str] = None
) -> str:
    """
    Constructs the notification copy sent to customers on batch updates.
    """
    greeting = f"Hello {customer_name},\n\n" if customer_name else "ShipTrack Logistics Update:\n\n"
    content = (
        f"{greeting}📦 Route: {batch_route}\n"
        f"📍 Status: {status_label}\n"
    )
    if admin_note:
        content += f"ℹ️ Update Note: {admin_note}\n"
    if tracking_code:
        content += f"🔖 Your Tracking Code: {tracking_code}\n"
        content += f"🌐 Track online anytime: https://shiptrack.app/track?code={tracking_code}\n"

    content += "\nReply with your tracking code to this chat anytime for an instant automated status update."
    return content
