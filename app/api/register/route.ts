// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registration_code, name, phone_number, email, description_of_goods, weight_kg } = body;

    if (!registration_code || !name || !phone_number || !description_of_goods) {
      return NextResponse.json(
        { error: 'registration_code, name, phone_number, and description_of_goods are required' },
        { status: 400 }
      );
    }

    const code = registration_code.trim().toUpperCase();
    const batch = store.batches.find((b) => b.registration_code.toUpperCase() === code);

    if (!batch) {
      return NextResponse.json(
        { error: `No active batch found matching registration code '${code}'. Please verify the code from the logistics operator.` },
        { status: 404 }
      );
    }

    if (batch.status !== 'announced' && batch.status !== 'collection_open') {
      return NextResponse.json(
        { error: `This batch is currently '${batch.status}' and is no longer accepting new items.` },
        { status: 400 }
      );
    }

    // Find or create Customer
    let customer = store.customers.find((c) => c.phone_number === phone_number.trim());
    if (!customer) {
      customer = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone_number: phone_number.trim(),
        email: email ? email.trim() : undefined,
        created_at: new Date().toISOString(),
      };
      store.customers.push(customer);
    }

    // Generate unique tracking code
    const originCode = batch.route.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'LOS');
    const trackingCode = `ST-${originCode}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const shipmentItem = {
      id: `item-${Date.now()}`,
      batch_id: batch.id,
      customer_id: customer.id,
      description_of_goods: description_of_goods.trim(),
      tracking_reference: trackingCode,
      weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
      created_at: new Date().toISOString(),
    };

    store.shipmentItems.unshift(shipmentItem);

    // Send instant WhatsApp welcome confirmation
    const welcomeText = (
      `Hello ${customer.name}! 👋 Welcome to ShipTrack.\n\n` +
      `Your shipment has been registered for: ${batch.route}.\n` +
      `📦 Goods: ${shipmentItem.description_of_goods}\n` +
      `🔖 Tracking Reference: ${trackingCode}\n` +
      `⏰ Drop-off Deadline: ${new Date(batch.collection_deadline).toLocaleDateString()}\n\n` +
      `Track your package in real-time: https://shiptrack.app/track?code=${trackingCode}\n` +
      `Reply to this WhatsApp number with your tracking code anytime for automated status!`
    );

    store.simulatedWhatsAppChat.unshift({
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      from: '+15550100999 (ShipTrack Business)',
      to: `${customer.phone_number} (${customer.name})`,
      text: welcomeText,
      timestamp: new Date().toISOString(),
      template_name: 'shiptrack_registration_confirm',
      status: 'delivered',
    });

    return NextResponse.json({
      success: true,
      tracking_reference: trackingCode,
      batch: {
        id: batch.id,
        route: batch.route,
        collection_deadline: batch.collection_deadline,
        departure_date: batch.departure_date,
        status: batch.status,
      },
      item: {
        id: shipmentItem.id,
        description_of_goods: shipmentItem.description_of_goods,
        customer_name: customer.name,
      },
      message: 'Registration successful! Your tracking code has been issued and WhatsApp confirmation sent.',
    }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
