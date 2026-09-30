# ShipTrack Backend (Django + PostgreSQL + Celery + WhatsApp Cloud API)

This directory contains the production-ready backend service for **ShipTrack**, a cross-border logistics tracking platform for goods shipped between Nigeria and the US in batches.

---

## Architecture Overview

- **Framework**: Django 5+ & Django REST Framework
- **Primary Database**: PostgreSQL (configured via `DATABASE_URL`, falls back to SQLite for local development)
- **Task Queue & Broker**: Celery 5+ backed by Redis (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`)
- **Outbound Messaging**: Meta WhatsApp Business Platform (Cloud API)
  - Uses approved WhatsApp message templates outside 24h customer window.
  - Standard text messages inside 24h conversation session.
- **Inbound Webhook**: Meta WhatsApp webhook receiver (`/api/webhook/whatsapp/`) with automatic verification handshake and keyword/tracking reference auto-responder.

---

## Directory Structure

```
backend/
├── manage.py                    # Django management CLI
├── run_tests.py                 # Standalone test runner for notification pipeline
├── shiptrack_backend/
│   ├── __init__.py              # Celery app loading hook
│   ├── celery.py                # Celery configuration with Redis
│   ├── settings.py              # Django settings (Postgres, Celery, WhatsApp)
│   ├── urls.py                  # Root routing table
│   └── wsgi.py                  # WSGI entrypoint
└── tracker/
    ├── apps.py                  # App configuration
    ├── models.py                # Batch, Customer, ShipmentItem, MilestoneUpdate, NotificationLog
    ├── tasks.py                 # Celery background tasks (send_batch_notification, retry)
    ├── views.py                 # REST views & Meta WhatsApp Webhook handler
    ├── urls.py                  # API endpoints
    ├── whatsapp.py              # WhatsApp Business Cloud API client & template specs
    └── tests/
        └── test_notifications.py# Django TestCase for batch status -> Celery notification flow
```

---

## WhatsApp Business Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com).
2. Create or select your Business App and add the **WhatsApp** product.
3. In **WhatsApp > API Setup**:
   - Note down the **Phone number ID**.
   - Note down the **WhatsApp Business Account ID**.
   - Generate a System User Access Token with `whatsapp_business_messaging` permissions.
4. Set the environment variables in `.env`:
   ```bash
   WHATSAPP_API_TOKEN="EAABxxxxxxxx..."
   WHATSAPP_PHONE_NUMBER_ID="109876543210123"
   WHATSAPP_VERIFY_TOKEN="shiptrack_webhook_secret_verify_token_2026"
   ```
5. Configure the Webhook in Meta App Dashboard:
   - **Callback URL**: `https://<your-domain>/api/webhook/whatsapp`
   - **Verify Token**: `shiptrack_webhook_secret_verify_token_2026`
   - Subscribe to the `messages` webhook field.

---

## Running Locally

1. **Start Redis**:
   ```bash
   redis-server
   ```

2. **Run Django Database Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Start the Celery Background Worker**:
   ```bash
   celery -A shiptrack_backend worker --loglevel=info
   ```

4. **Start Django API Server**:
   ```bash
   python manage.py runserver 8000
   ```

5. **Run Tests**:
   ```bash
   python run_tests.py
   # Or using Django's test runner:
   python manage.py test tracker
   ```
