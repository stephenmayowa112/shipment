// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batch_id');

  if (batchId) {
    const logs = store.getBatchNotifications(batchId);
    return NextResponse.json(logs);
  }

  return NextResponse.json(store.notificationLogs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { log_id } = body;

    if (!log_id) {
      return NextResponse.json({ error: 'log_id is required' }, { status: 400 });
    }

    const log = store.notificationLogs.find((l) => l.id === log_id);
    if (!log) {
      return NextResponse.json({ error: 'Notification log not found' }, { status: 404 });
    }

    let recovered = 0;
    for (const rec of log.recipients_data) {
      if (rec.status === 'failed') {
        rec.status = 'sent';
        rec.error = undefined;
        rec.retry_count = (rec.retry_count || 0) + 1;
        recovered++;

        // Add retry message to simulated chat
        store.simulatedWhatsAppChat.unshift({
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          direction: 'outbound',
          from: '+15550100999 (ShipTrack Business)',
          to: `${rec.phone_number} (${rec.customer_name})`,
          text: `[RETRY UPDATE] ${log.message_content}`,
          timestamp: new Date().toISOString(),
          status: 'delivered',
        });
      }
    }

    log.delivery_status = 'sent';

    return NextResponse.json({
      success: true,
      recovered_count: recovered,
      log,
      message: `Retried ${recovered} failed customer deliveries. All now marked delivered.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
