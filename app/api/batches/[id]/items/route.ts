// app/api/batches/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batch = store.getBatch(id);
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, phone_number, email, description_of_goods, weight_kg, status_override } = body;

    if (!name || !phone_number || !description_of_goods) {
      return NextResponse.json(
        { error: 'name, phone_number, and description_of_goods are required' },
        { status: 400 }
      );
    }

    // Find or create customer
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
    } else {
      if (email) customer.email = email.trim();
    }

    // Generate unique tracking code
    const trackingCode = `ST-${batch.route.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const item = {
      id: `item-${Date.now()}`,
      batch_id: batch.id,
      customer_id: customer.id,
      description_of_goods: description_of_goods.trim(),
      tracking_reference: trackingCode,
      weight_kg: weight_kg ? parseFloat(weight_kg) : undefined,
      status_override: status_override ? status_override.trim() : undefined,
      created_at: new Date().toISOString(),
    };

    store.shipmentItems.unshift(item);

    return NextResponse.json({
      success: true,
      item: { ...item, customer },
      tracking_reference: item.tracking_reference,
    }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
