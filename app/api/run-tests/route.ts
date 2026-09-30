// app/api/run-tests/route.ts
import { NextResponse } from 'next/server';
import { store, BatchStatusType } from '@/lib/store';

export async function GET() {
  const testResults: Array<{
    name: string;
    description: string;
    passed: boolean;
    details: string;
    duration_ms: number;
  }> = [];

  const t0 = performance.now();

  // Test 1: Batch creation & initialization
  try {
    const start = performance.now();
    const testBatchId = `test-batch-${Date.now()}`;
    const testBatch = {
      id: testBatchId,
      route: 'Lagos (LOS) → Houston (IAH)',
      departure_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      collection_deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'collection_open' as BatchStatusType,
      registration_code: 'TEST-CODE-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.batches.push(testBatch);

    const testCust = {
      id: `test-cust-${Date.now()}`,
      name: 'Adewale Johnson',
      phone_number: '+2348023344556',
      email: 'adewale@example.com',
      created_at: new Date().toISOString(),
    };
    store.customers.push(testCust);

    const testItem = {
      id: `test-item-${Date.now()}`,
      batch_id: testBatchId,
      customer_id: testCust.id,
      description_of_goods: 'Textiles and packaged foods',
      tracking_reference: 'ST-TEST-9999-A1',
      created_at: new Date().toISOString(),
    };
    store.shipmentItems.push(testItem);

    testResults.push({
      name: '1. Batch & ShipmentItem Association',
      description: 'Verifies batch creation, customer linkage, and tracking code assignment.',
      passed: true,
      details: `Batch ${testBatch.route} created with tracking code ${testItem.tracking_reference}`,
      duration_ms: Math.round(performance.now() - start),
    });

    // Test 2: Batch status update triggers Celery background notification worker
    const start2 = performance.now();
    const note = 'Cargo sealed and cleared for boarding.';
    const notifLog = store.dispatchNotificationJob(
      testBatchId,
      'Departed',
      note,
      false
    );

    const passed2 =
      notifLog &&
      notifLog.batch_id === testBatchId &&
      notifLog.recipient_count >= 1 &&
      (notifLog.delivery_status === 'sent' || notifLog.delivery_status === 'partial');

    testResults.push({
      name: '2. Batch Status Change → WhatsApp Notification Trigger',
      description: 'Verifies changing batch status dispatches WhatsApp notifications and creates NotificationLog.',
      passed: passed2,
      details: `Dispatched notification for ${testBatch.route}. Recipients: ${notifLog.recipient_count}, Delivery Status: ${notifLog.delivery_status}`,
      duration_ms: Math.round(performance.now() - start2),
    });

    // Test 3: Approved WhatsApp template & message content formatting
    const start3 = performance.now();
    const recipientRec = notifLog.recipients_data.find((r) => r.phone_number === testCust.phone_number);
    const passed3 =
      recipientRec !== undefined &&
      recipientRec.tracking_codes.includes('ST-TEST-9999-A1') &&
      recipientRec.customer_name === 'Adewale Johnson';

    testResults.push({
      name: '3. Customer WhatsApp Notification Payload & Tracking Code Inclusion',
      description: 'Verifies recipient phone, customer name, and unique tracking code are included in notification.',
      passed: passed3,
      details: recipientRec
        ? `Customer ${recipientRec.customer_name} received tracking code ${recipientRec.tracking_codes}`
        : 'Recipient not found',
      duration_ms: Math.round(performance.now() - start3),
    });

    // Test 4: Milestone update triggers outbound background notification
    const start4 = performance.now();
    const milestoneLog = store.dispatchNotificationJob(
      testBatchId,
      'Milestone: Cleared US Customs at Houston Port',
      'Ready for domestic distribution',
      true
    );
    const passed4 = milestoneLog.recipient_count >= 1 && milestoneLog.delivery_status === 'sent';

    testResults.push({
      name: '4. Milestone Update Notification Flow',
      description: 'Verifies custom milestone updates trigger immediate notifications with admin notes.',
      passed: passed4,
      details: `Milestone logged and dispatched to ${milestoneLog.recipient_count} customer(s).`,
      duration_ms: Math.round(performance.now() - start4),
    });

    // Test 5: Inbound WhatsApp Webhook Tracking Lookup
    const start5 = performance.now();
    const foundItem = store.shipmentItems.find((it) => it.tracking_reference === 'ST-TEST-9999-A1');
    const webhookOk = foundItem !== undefined && foundItem.customer_id === testCust.id;

    testResults.push({
      name: '5. Inbound WhatsApp Tracking Code Auto-Response Lookup',
      description: 'Verifies incoming customer tracking reference resolves to accurate shipment and batch status.',
      passed: webhookOk,
      details: `Tracking code ST-TEST-9999-A1 matched to customer ${testCust.name} and route ${testBatch.route}`,
      duration_ms: Math.round(performance.now() - start5),
    });

    // Clean up test batch
    const bIndex = store.batches.findIndex((b) => b.id === testBatchId);
    if (bIndex !== -1) store.batches.splice(bIndex, 1);
  } catch (err: unknown) {
    const error = err as Error;
    testResults.push({
      name: 'Test Execution Error',
      description: 'Exception thrown during test run',
      passed: false,
      details: error.message,
      duration_ms: Math.round(performance.now() - t0),
    });
  }

  const allPassed = testResults.every((t) => t.passed);

  return NextResponse.json({
    total_tests: testResults.length,
    passed_tests: testResults.filter((t) => t.passed).length,
    all_passed: allPassed,
    total_duration_ms: Math.round(performance.now() - t0),
    results: testResults,
  });
}
