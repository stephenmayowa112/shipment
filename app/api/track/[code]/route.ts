// app/api/track/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: 'Tracking code is required' }, { status: 400 });
  }

  const queryCode = decodeURIComponent(code).trim().toUpperCase();

  const item = store.shipmentItems.find(
    (it) => it.tracking_reference.toUpperCase() === queryCode
  );

  if (!item) {
    return NextResponse.json(
      { error: `No shipment found matching tracking code '${queryCode}'. Please check your code.` },
      { status: 404 }
    );
  }

  const batch = store.getBatch(item.batch_id);
  const customer = store.customers.find((c) => c.id === item.customer_id);
  const milestones = store.getBatchMilestones(item.batch_id);

  // Mask phone for customer privacy
  const rawPhone = customer?.phone_number || '';
  const maskedPhone =
    rawPhone.length >= 8
      ? `${rawPhone.slice(0, 4)} ••• ••• ${rawPhone.slice(-4)}`
      : rawPhone;

  return NextResponse.json({
    tracking_reference: item.tracking_reference,
    description_of_goods: item.description_of_goods,
    weight_kg: item.weight_kg,
    status_override: item.status_override,
    customer_name: customer?.name || 'Customer',
    masked_phone: maskedPhone,
    batch: batch
      ? {
          id: batch.id,
          route: batch.route,
          status: batch.status,
          departure_date: batch.departure_date,
          collection_deadline: batch.collection_deadline,
        }
      : null,
    milestones,
  });
}
