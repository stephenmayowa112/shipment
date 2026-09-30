from django.urls import path
from . import views

urlpatterns = [
    # Public & Customer endpoints
    path('track/<str:tracking_reference>/', views.track_shipment_item, name='track-item'),
    path('register/', views.self_register_customer, name='self-register'),
    
    # Meta WhatsApp Business Cloud API Webhook
    path('webhook/whatsapp/', views.whatsapp_webhook, name='whatsapp-webhook'),

    # Admin endpoints
    path('batches/', views.batch_list_create, name='batch-list-create'),
    path('batches/<int:batch_id>/status/', views.update_batch_status, name='update-batch-status'),
    path('batches/<int:batch_id>/milestones/', views.add_milestone_update, name='add-milestone'),
    path('batches/<int:batch_id>/notifications/', views.batch_notification_history, name='batch-notifications'),
    path('notifications/<int:log_id>/retry/', views.retry_notification, name='retry-notification'),
]
