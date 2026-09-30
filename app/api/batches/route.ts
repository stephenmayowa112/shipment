// app/api/batches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store, BatchStatusType } from '@/lib/store';

export async function GET() {
  const data = store.batches.map((batch) => {
    const items = store.getBatchItems(batch.id);
    const milestones = store.getBatchMilestones(batch.id);
    const logs = store.getBatchNotifications(batch.id);
    return {
      ...batch,
      items_count: items.length,
      milestones_count: milestones.length,
      notifications_count: logs.length,
      latest_milestone: milestones[0] || null,
    };
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { route, departure_date, collection_deadline, registration_code } = body;

    if (!route || !departure_date || !collection_deadline) {
      return NextResponse.json(
        { error: 'route, departure_date, and collection_deadline are required' },
        { status: 400 }
      );
    }

    const regCode = (registration_code || `REG-${Math.random().toString(36).substring(2, 7)}`).toUpperCase();

    const newBatch = {
      id: `batch-${Date.now()}`,
      route: route.trim(),
      departure_date: new Date(departure_date).toISOString(),
      collection_deadline: new Date(collection_deadline).toISOString(),
      status: 'announced' as BatchStatusType,
      registration_code: regCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.batches.unshift(newBatch);

    // Initial announcement milestone
    store.milestones.unshift({
      id: `ms-${Date.now()}`,
      batch_id: newBatch.id,
      label: 'Batch announced',
      timestamp: new Date().toISOString(),
      admin_note: 'Batch opened for logistics planning and coordination.',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(newBatch, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
