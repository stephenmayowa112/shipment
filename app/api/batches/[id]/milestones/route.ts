// app/api/batches/[id]/milestones/route.ts
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
    const { label, admin_note, timestamp } = body;

    if (!label) {
      return NextResponse.json(
        { error: 'Milestone label is required' },
        { status: 400 }
      );
    }

    const milestone = {
      id: `ms-${Date.now()}`,
      batch_id: batch.id,
      label: label.trim(),
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      admin_note: admin_note ? admin_note.trim() : '',
      created_at: new Date().toISOString(),
    };

    store.milestones.unshift(milestone);

    // Enqueue Celery background notification job for this milestone
    const notifLog = store.dispatchNotificationJob(
      batch.id,
      `Milestone: ${milestone.label}`,
      milestone.admin_note,
      true
    );

    return NextResponse.json({
      success: true,
      milestone,
      notification_log: notifLog,
      message: `Milestone '${milestone.label}' logged. WhatsApp notifications dispatched to all batch customers.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
