// app/api/batches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batch = store.getBatch(id);
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const items = store.getBatchItems(id);
  const milestones = store.getBatchMilestones(id);
  const notifications = store.getBatchNotifications(id);

  return NextResponse.json({
    ...batch,
    items,
    milestones,
    notifications,
  });
}

export async function PATCH(
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
    if (body.route) batch.route = body.route;
    if (body.departure_date) batch.departure_date = new Date(body.departure_date).toISOString();
    if (body.collection_deadline) batch.collection_deadline = new Date(body.collection_deadline).toISOString();
    if (body.registration_code) batch.registration_code = body.registration_code.toUpperCase();
    batch.updated_at = new Date().toISOString();

    return NextResponse.json(batch);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = store.batches.findIndex((b) => b.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  store.batches.splice(index, 1);
  return NextResponse.json({ success: true });
}
