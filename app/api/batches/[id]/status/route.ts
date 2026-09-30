// app/api/batches/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { store, BatchStatusType } from '@/lib/store';

const STATUS_LABELS: Record<BatchStatusType, string> = {
  announced: 'Announced',
  collection_open: 'Collection Open',
  collection_closed: 'Collection Closed',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
};

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
    const { status: newStatus, admin_note } = body;

    if (!newStatus || !STATUS_LABELS[newStatus as BatchStatusType]) {
      return NextResponse.json(
        { error: `Invalid status '${newStatus}'` },
        { status: 400 }
      );
    }

    const previousStatus = batch.status;
    batch.status = newStatus as BatchStatusType;
    batch.updated_at = new Date().toISOString();

    const statusLabel = STATUS_LABELS[batch.status];

    // Also record a milestone representing this status transition
    store.milestones.unshift({
      id: `ms-${Date.now()}`,
      batch_id: batch.id,
      label: `Status transitioned to ${statusLabel}`,
      timestamp: new Date().toISOString(),
      admin_note: admin_note || `Batch marked as ${statusLabel}.`,
      created_at: new Date().toISOString(),
    });

    // Enqueue Celery background worker notification job
    const notifLog = store.dispatchNotificationJob(
      batch.id,
      statusLabel,
      admin_note || '',
      false
    );

    return NextResponse.json({
      success: true,
      batch_id: batch.id,
      previous_status: previousStatus,
      new_status: batch.status,
      status_label: statusLabel,
      notification_log: notifLog,
      message: `Batch status changed to ${statusLabel}. Outbound WhatsApp notifications dispatched.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
