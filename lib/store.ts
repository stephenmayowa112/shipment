// lib/store.ts
// In-memory data store and business logic engine mirroring Django ORM models and Celery task queue

export type BatchStatusType =
  | 'announced'
  | 'collection_open'
  | 'collection_closed'
  | 'departed'
  | 'in_transit'
  | 'arrived'
  | 'ready_for_pickup'
  | 'completed';

export type DeliveryStatusType = 'sent' | 'failed' | 'pending' | 'partial';

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  created_at: string;
}

export interface ShipmentItem {
  id: string;
  batch_id: string;
  customer_id: string;
  customer?: Customer;
  description_of_goods: string;
  tracking_reference: string;
  status_override?: string;
  weight_kg?: number;
  created_at: string;
}

export interface MilestoneUpdate {
  id: string;
  batch_id: string;
  label: string;
  timestamp: string;
  admin_note?: string;
  created_at: string;
}

export interface RecipientDeliveryRecord {
  customer_name: string;
  phone_number: string;
  tracking_codes: string;
  status: 'sent' | 'failed';
  message_id: string;
  error?: string;
  retry_count?: number;
}

export interface NotificationLog {
  id: string;
  batch_id: string;
  message_content: string;
  timestamp: string;
  delivery_status: DeliveryStatusType;
  recipient_count: number;
  recipients_data: RecipientDeliveryRecord[];
  error_message?: string;
}

export interface Batch {
  id: string;
  route: string;
  departure_date: string;
  collection_deadline: string;
  status: BatchStatusType;
  registration_code: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  text: string;
  timestamp: string;
  template_name?: string;
  status?: 'sent' | 'delivered' | 'read';
}

// Global in-memory storage singleton for demo and Next.js API routes
class ShipTrackStore {
  batches: Batch[] = [];
  customers: Customer[] = [];
  shipmentItems: ShipmentItem[] = [];
  milestones: MilestoneUpdate[] = [];
  notificationLogs: NotificationLog[] = [];
  simulatedWhatsAppChat: WhatsAppMessage[] = [];

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    const now = new Date();
    const dMinus10 = new Date(now.getTime() - 10 * 86400000).toISOString();
    const dMinus5 = new Date(now.getTime() - 5 * 86400000).toISOString();
    const dMinus3 = new Date(now.getTime() - 3 * 86400000).toISOString();
    const dMinus2 = new Date(now.getTime() - 2 * 86400000).toISOString();
    const dPlus3 = new Date(now.getTime() + 3 * 86400000).toISOString();
    const dPlus7 = new Date(now.getTime() + 7 * 86400000).toISOString();

    // 1. Seed Batches
    this.batches = [
      {
        id: 'batch-01',
        route: 'Lagos (LOS) → Houston, TX (IAH)',
        departure_date: dPlus7,
        collection_deadline: dPlus3,
        status: 'collection_open',
        registration_code: 'LOS-OCT26',
        created_at: dMinus5,
        updated_at: dMinus2,
      },
      {
        id: 'batch-02',
        route: 'New York (JFK) → Lagos (LOS)',
        departure_date: dMinus5,
        collection_deadline: dMinus10,
        status: 'in_transit',
        registration_code: 'JFK-SEP26',
        created_at: dMinus10,
        updated_at: dMinus2,
      },
      {
        id: 'batch-03',
        route: 'Lagos (LOS) → Atlanta, GA (ATL)',
        departure_date: dMinus10,
        collection_deadline: dMinus10,
        status: 'ready_for_pickup',
        registration_code: 'ATL-SEP26',
        created_at: dMinus10,
        updated_at: dMinus2,
      }
    ];

    // 2. Seed Customers
    this.customers = [
      {
        id: 'cust-01',
        name: 'Chinedu Okafor',
        phone_number: '+2348031234567',
        email: 'chinedu.okafor@gmail.com',
        created_at: dMinus5,
      },
      {
        id: 'cust-02',
        name: 'Folake Adeyemi',
        phone_number: '+17135550199',
        email: 'folake.ade@yahoo.com',
        created_at: dMinus5,
      },
      {
        id: 'cust-03',
        name: 'Babatunde Adeleke',
        phone_number: '+2349029876543',
        email: 'badeleke@outlook.com',
        created_at: dMinus10,
      },
      {
        id: 'cust-04',
        name: 'Grace Nwosu',
        phone_number: '+14045550144',
        email: 'grace.nwosu@gmail.com',
        created_at: dMinus10,
      },
    ];

    // 3. Seed Shipment Items
    this.shipmentItems = [
      {
        id: 'item-01',
        batch_id: 'batch-01',
        customer_id: 'cust-01',
        description_of_goods: '3 boxes dried foodstuffs: crayfish, egusi, palm oil bottles, and dried bitter leaf',
        tracking_reference: 'ST-LOS-8921-X9',
        weight_kg: 24.5,
        created_at: dMinus5,
      },
      {
        id: 'item-02',
        batch_id: 'batch-01',
        customer_id: 'cust-02',
        description_of_goods: '2 large luggage bags: tailored aso-oke fabrics, coral beads & souvenir packages',
        tracking_reference: 'ST-LOS-8922-Y2',
        weight_kg: 32.0,
        created_at: dMinus5,
      },
      {
        id: 'item-03',
        batch_id: 'batch-02',
        customer_id: 'cust-03',
        description_of_goods: 'Electronics: 2 Apple MacBook Pros, 3 iPhones and designer footwear',
        tracking_reference: 'ST-JFK-4102-B3',
        weight_kg: 12.8,
        created_at: dMinus10,
      },
      {
        id: 'item-04',
        batch_id: 'batch-03',
        customer_id: 'cust-04',
        description_of_goods: 'Personal effects & traditional wedding gifts',
        tracking_reference: 'ST-ATL-1904-C8',
        weight_kg: 18.0,
        created_at: dMinus10,
      }
    ];

    // 4. Seed Milestones
    this.milestones = [
      {
        id: 'ms-01',
        batch_id: 'batch-01',
        label: 'Batch announced & warehouse collection open',
        timestamp: dMinus5,
        admin_note: 'Drop-offs accepted at Ikeja collection center daily 9am - 5pm.',
        created_at: dMinus5,
      },
      {
        id: 'ms-02',
        batch_id: 'batch-02',
        label: 'Cargo departure from JFK Cargo Terminal',
        timestamp: dMinus5,
        admin_note: 'Flight departed on schedule via Ethiopian Cargo.',
        created_at: dMinus5,
      },
      {
        id: 'ms-03',
        batch_id: 'batch-02',
        label: 'Transit handling at Addis Ababa Bole Int. Hub',
        timestamp: dMinus3,
        admin_note: 'Connecting flight ET501 confirmed for Lagos.',
        created_at: dMinus3,
      },
      {
        id: 'ms-04',
        batch_id: 'batch-03',
        label: 'Landed at Atlanta Hartsfield-Jackson',
        timestamp: dMinus3,
        admin_note: 'Cleared US customs without inspection hold.',
        created_at: dMinus3,
      },
      {
        id: 'ms-05',
        batch_id: 'batch-03',
        label: 'Available for pickup at Duluth Hub',
        timestamp: dMinus10,
        admin_note: 'Pickup address: 3450 Gwinnett Place Dr, Duluth GA 30096. Bring valid government ID.',
        created_at: dMinus10,
      },
    ];

    // 5. Seed Notification Logs
    this.notificationLogs = [
      {
        id: 'notif-01',
        batch_id: 'batch-01',
        message_content: 'Batch Lagos (LOS) → Houston, TX (IAH) collection is now OPEN. Drop-off deadline: ' + new Date(dPlus3).toLocaleDateString(),
        timestamp: dMinus5,
        delivery_status: 'sent',
        recipient_count: 2,
        recipients_data: [
          {
            customer_name: 'Chinedu Okafor',
            phone_number: '+2348031234567',
            tracking_codes: 'ST-LOS-8921-X9',
            status: 'sent',
            message_id: 'wamid.HBgLMTIzNDU2Nzg',
          },
          {
            customer_name: 'Folake Adeyemi',
            phone_number: '+17135550199',
            tracking_codes: 'ST-LOS-8922-Y2',
            status: 'sent',
            message_id: 'wamid.HBgLMTIzNDU2ODk',
          }
        ]
      },
      {
        id: 'notif-02',
        batch_id: 'batch-02',
        message_content: 'Batch New York (JFK) → Lagos (LOS) has DEPARTED JFK. Transit ETA 3 days.',
        timestamp: dMinus5,
        delivery_status: 'sent',
        recipient_count: 1,
        recipients_data: [
          {
            customer_name: 'Babatunde Adeleke',
            phone_number: '+2349029876543',
            tracking_codes: 'ST-JFK-4102-B3',
            status: 'sent',
            message_id: 'wamid.HBgLMTIzNDU2OTA',
          }
        ]
      }
    ];

    // 6. Seed Simulated WhatsApp Chat
    this.simulatedWhatsAppChat = [
      {
        id: 'msg-01',
        direction: 'outbound',
        from: '+15550100999 (ShipTrack Business)',
        to: '+2348031234567 (Chinedu Okafor)',
        text: 'Hello Chinedu Okafor! 📦 Your items for route Lagos (LOS) → Houston, TX (IAH) have been registered. Drop-off deadline is ' + new Date(dPlus3).toLocaleDateString() + '. Tracking code: ST-LOS-8921-X9.',
        timestamp: dMinus5,
        status: 'delivered',
        template_name: 'shiptrack_registration_confirm',
      },
      {
        id: 'msg-02',
        direction: 'inbound',
        from: '+2348031234567 (Chinedu Okafor)',
        to: '+15550100999 (ShipTrack Business)',
        text: 'ST-LOS-8921-X9',
        timestamp: dMinus2,
      },
      {
        id: 'msg-03',
        direction: 'outbound',
        from: '+15550100999 (ShipTrack Business)',
        to: '+2348031234567 (Chinedu Okafor)',
        text: '📦 *ShipTrack Status: ST-LOS-8921-X9*\n\n👤 *Recipient:* Chinedu Okafor\n🛣 *Route:* Lagos (LOS) → Houston, TX (IAH)\n📍 *Current Status:* Collection Open\n📝 *Goods:* 3 boxes dried foodstuffs...\n\n🕒 *Recent Milestone:*\n• Batch announced & warehouse collection open\n\n🌐 Track online: https://shiptrack.app/track?code=ST-LOS-8921-X9',
        timestamp: dMinus2,
        status: 'read',
      }
    ];
  }

  // --- Helpers ---
  getBatch(id: string) {
    return this.batches.find((b) => b.id === id);
  }

  getBatchItems(batchId: string) {
    return this.shipmentItems
      .filter((item) => item.batch_id === batchId)
      .map((item) => ({
        ...item,
        customer: this.customers.find((c) => c.id === item.customer_id),
      }));
  }

  getBatchMilestones(batchId: string) {
    return this.milestones
      .filter((m) => m.batch_id === batchId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getBatchNotifications(batchId: string) {
    return this.notificationLogs
      .filter((n) => n.batch_id === batchId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Background Job / Notification Dispatch Simulation (Celery Task) ---
  dispatchNotificationJob(
    batchId: string,
    statusLabel: string,
    adminNote: string = '',
    isMilestone: boolean = false
  ): NotificationLog {
    const batch = this.getBatch(batchId);
    if (!batch) throw new Error('Batch not found');

    const items = this.getBatchItems(batchId);
    const recipientsMap = new Map<string, { customer: Customer; items: ShipmentItem[] }>();

    for (const item of items) {
      if (!item.customer) continue;
      const phone = item.customer.phone_number;
      if (!recipientsMap.has(phone)) {
        recipientsMap.set(phone, { customer: item.customer, items: [] });
      }
      recipientsMap.get(phone)!.items.push(item);
    }

    const recipientsData: RecipientDeliveryRecord[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const [phone, { customer, items: custItems }] of recipientsMap.entries()) {
      const trackingCodesStr = custItems.map((i) => i.tracking_reference).join(', ');
      // Simulate WhatsApp Business Cloud API send
      // Deterministically succeed unless phone has "fail" or invalid formatting
      const isFailed = phone.includes('0000') || phone.length < 9;
      const isSuccess = !isFailed;

      if (isSuccess) {
        sentCount++;
      } else {
        failedCount++;
      }

      const msgId = `wamid.SIMULATED_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      recipientsData.push({
        customer_name: customer.name,
        phone_number: phone,
        tracking_codes: trackingCodesStr,
        status: isSuccess ? 'sent' : 'failed',
        message_id: msgId,
        error: isFailed ? 'Meta WhatsApp Cloud API error: Recipient not opt-in' : undefined,
      });

      // Add to simulated WhatsApp chat log
      const messageBody = (
        `Hello ${customer.name}! 👋 ShipTrack Update:\n\n` +
        `📦 Route: ${batch.route}\n` +
        `📍 Status: ${statusLabel}\n` +
        (adminNote ? `ℹ️ Note: ${adminNote}\n` : '') +
        `🔖 Tracking Code: ${trackingCodesStr}\n\n` +
        `🌐 Track: https://shiptrack.app/track?code=${custItems[0]?.tracking_reference}`
      );

      this.simulatedWhatsAppChat.unshift({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        direction: 'outbound',
        from: '+15550100999 (ShipTrack Business)',
        to: `${phone} (${customer.name})`,
        text: messageBody,
        timestamp: new Date().toISOString(),
        template_name: isMilestone ? 'shiptrack_milestone_update' : 'shiptrack_batch_status_update',
        status: isSuccess ? 'delivered' : 'sent',
      });
    }

    let overallStatus: DeliveryStatusType = 'sent';
    if (failedCount > 0 && sentCount > 0) {
      overallStatus = 'partial';
    } else if (failedCount > 0 && sentCount === 0) {
      overallStatus = 'failed';
    } else if (recipientsMap.size === 0) {
      overallStatus = 'sent';
    }

    const log: NotificationLog = {
      id: `notif-${Date.now()}`,
      batch_id: batchId,
      message_content: `Route: ${batch.route} | ${statusLabel}${adminNote ? ` | Note: ${adminNote}` : ''}`,
      timestamp: new Date().toISOString(),
      delivery_status: overallStatus,
      recipient_count: recipientsMap.size,
      recipients_data: recipientsData,
    };

    this.notificationLogs.unshift(log);
    return log;
  }
}

// Global persistent store in Node global context
const globalForStore = globalThis as unknown as { shipTrackStore?: ShipTrackStore };
export const store = globalForStore.shipTrackStore ?? new ShipTrackStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.shipTrackStore = store;
}
