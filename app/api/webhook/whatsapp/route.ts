// app/api/webhook/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'shiptrack_webhook_secret_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge || 'ok', { status: 200 });
  }

  return new Response('Verification token mismatch', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'no_messages' }, { status: 200 });
    }

    const replies = [];

    for (const msg of messages) {
      const from = msg.from || 'Customer';
      const text = (msg.text?.body || msg.body || '').trim();

      if (!text) continue;

      // Log inbound message
      store.simulatedWhatsAppChat.unshift({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        direction: 'inbound',
        from: `+${from}`,
        to: '+15550100999 (ShipTrack Business)',
        text,
        timestamp: new Date().toISOString(),
      });

      // Search for tracking code pattern
      const trackingMatch = text.match(/ST-[A-Z]{3,4}-[0-9A-Z]{4,6}-[0-9A-Z]{1,4}/i) || [text.trim()];
      const searchCode = trackingMatch[0].toUpperCase();

      const item = store.shipmentItems.find(
        (it) => it.tracking_reference.toUpperCase() === searchCode
      );

      let replyText = '';

      if (item) {
        const batch = store.getBatch(item.batch_id);
        const customer = store.customers.find((c) => c.id === item.customer_id);
        const milestones = store.getBatchMilestones(item.batch_id);
        const latestMs = milestones[0];

        const statusFormat = batch ? batch.status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';

        replyText = (
          `📦 *ShipTrack Automated Status Update*\n\n` +
          `🔖 *Tracking Code:* ${item.tracking_reference}\n` +
          `👤 *Customer:* ${customer?.name || 'Valued Customer'}\n` +
          `🛣 *Route:* ${batch?.route || 'Cross-Border Route'}\n` +
          `📍 *Status:* ${statusFormat}\n` +
          `📝 *Goods:* ${item.description_of_goods}\n` +
          (latestMs ? `\n🕒 *Latest Milestone:* ${latestMs.label} (${new Date(latestMs.timestamp).toLocaleDateString()})\n` : '') +
          (batch?.departure_date ? `🛫 *Departure:* ${new Date(batch.departure_date).toLocaleDateString()}\n` : '') +
          `\n🌐 View detailed tracking page: https://shiptrack.app/track?code=${item.tracking_reference}`
        );
      } else {
        replyText = (
          `Hello! 👋 Thank you for messaging ShipTrack.\n\n` +
          `We could not find an active shipment matching: "${text}".\n\n` +
          `Please check that your tracking code follows the format (e.g. ST-LOS-8921-X9). ` +
          `You can also look up shipments anytime at https://shiptrack.app/track`
        );
      }

      // Log automated outbound reply
      store.simulatedWhatsAppChat.unshift({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        direction: 'outbound',
        from: '+15550100999 (ShipTrack Business)',
        to: `+${from}`,
        text: replyText,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      });

      replies.push({
        to: from,
        reply: replyText,
      });
    }

    return NextResponse.json({
      status: 'success',
      processed: messages.length,
      replies,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
