// components/AdminDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Package,
  Calendar,
  Send,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Share2,
  Lock,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Plane,
  ArrowLeft,
  Truck,
  Play,
  Terminal,
  Barcode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BatchItem {
  id: string;
  tracking_reference: string;
  description_of_goods: string;
  weight_kg?: number;
  status_override?: string;
  customer?: {
    id: string;
    name: string;
    phone_number: string;
    email?: string;
  };
}

interface Milestone {
  id: string;
  label: string;
  timestamp: string;
  admin_note?: string;
}

interface NotificationLog {
  id: string;
  batch_id: string;
  message_content: string;
  timestamp: string;
  delivery_status: 'sent' | 'failed' | 'partial' | 'pending';
  recipient_count: number;
  recipients_data: Array<{
    customer_name: string;
    phone_number: string;
    tracking_codes: string;
    status: 'sent' | 'failed';
    message_id: string;
    error?: string;
    retry_count?: number;
  }>;
}

interface Batch {
  id: string;
  route: string;
  departure_date: string;
  collection_deadline: string;
  status: string;
  registration_code: string;
  items_count?: number;
  milestones_count?: number;
  notifications_count?: number;
  created_at: string;
}

const BATCH_STATUSES = [
  { key: 'announced', label: 'Announced' },
  { key: 'collection_open', label: 'Collection Open' },
  { key: 'collection_closed', label: 'Collection Closed' },
  { key: 'departed', label: 'Departed' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'completed', label: 'Completed' },
];

export function AdminDashboard({
  isAuthenticated,
  onAuthenticate,
  onNavigateToWhatsApp,
}: {
  isAuthenticated: boolean;
  onAuthenticate: (val: boolean) => void;
  onNavigateToWhatsApp?: () => void;
}) {
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Batches State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<{
    batch: Batch | null;
    items: BatchItem[];
    milestones: Milestone[];
    notifications: NotificationLog[];
  }>({
    batch: null,
    items: [],
    milestones: [],
    notifications: [],
  });

  // Mobile navigation state (toggle between list & detail on small screens)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const [activeBatchTab, setActiveBatchTab] = useState<'items' | 'milestones' | 'notifications' | 'tests'>('items');
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Modals
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Action Form States
  const [targetStatus, setTargetStatus] = useState('departed');
  const [adminNote, setAdminNote] = useState('');
  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [milestoneNote, setMilestoneNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Automated Tests Runner State
  const [runningTests, setRunningTests] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // New Batch Form
  const [newRoute, setNewRoute] = useState('Lagos (LOS) → Houston, TX (IAH)');
  const [newDeparture, setNewDeparture] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newRegCode, setNewRegCode] = useState('');

  // Add Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemPhone, setNewItemPhone] = useState('+234');
  const [newItemEmail, setNewItemEmail] = useState('');
  const [newItemGoods, setNewItemGoods] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');

  // Fetch batches
  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBatches(data);
        if (!selectedBatchId && data.length > 0) {
          setSelectedBatchId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Fetch batch details
  const fetchBatchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/batches/${id}`);
      const data = await res.json();
      if (res.ok) {
        setBatchDetails({
          batch: data,
          items: data.items || [],
          milestones: data.milestones || [],
          notifications: data.notifications || [],
        });
      }
    } catch (err) {
      console.error('Failed to load batch details:', err);
    }
  };

  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      fetch('/api/batches')
        .then((res) => res.json())
        .then((data) => {
          if (active && Array.isArray(data)) {
            setBatches(data);
            if (!selectedBatchId && data.length > 0) {
              setSelectedBatchId(data[0].id);
            }
          }
        })
        .catch((err) => console.error('Failed to load batches:', err));
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedBatchId]);

  useEffect(() => {
    let active = true;
    if (selectedBatchId) {
      fetch(`/api/batches/${selectedBatchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (active && data && !data.error) {
            setBatchDetails({
              batch: data,
              items: data.items || [],
              milestones: data.milestones || [],
              notifications: data.notifications || [],
            });
          }
        })
        .catch((err) => console.error('Failed to load batch details:', err));
    }
    return () => {
      active = false;
    };
  }, [selectedBatchId]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'shiptrack2026!' || passwordInput === 'admin') {
      onAuthenticate(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // Handle Status Update (enqueues Celery background job)
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          admin_note: adminNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || 'Status updated & background worker dispatched.');
        setShowStatusModal(false);
        setAdminNote('');
        fetchBatchDetails(selectedBatchId);
        fetchBatches();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch {
      alert('Network error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Milestone (enqueues Celery background job)
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !milestoneLabel.trim()) return;

    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: milestoneLabel.trim(),
          admin_note: milestoneNote.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || 'Milestone added & notification dispatched.');
        setShowMilestoneModal(false);
        setMilestoneLabel('');
        setMilestoneNote('');
        fetchBatchDetails(selectedBatchId);
        fetchBatches();
      } else {
        alert(data.error || 'Failed to add milestone');
      }
    } catch {
      alert('Network error adding milestone');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Item Manually
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          phone_number: newItemPhone.trim(),
          email: newItemEmail.trim(),
          description_of_goods: newItemGoods.trim(),
          weight_kg: newItemWeight ? parseFloat(newItemWeight) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`Item added with tracking code: ${data.tracking_reference}`);
        setShowAddItemModal(false);
        setNewItemName('');
        setNewItemGoods('');
        setNewItemWeight('');
        fetchBatchDetails(selectedBatchId);
        fetchBatches();
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch {
      alert('Network error adding shipment item');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: newRoute.trim(),
          departure_date: newDeparture,
          collection_deadline: newDeadline,
          registration_code: newRegCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`Batch ${data.route} created.`);
        setShowNewBatchModal(false);
        fetchBatches();
        setSelectedBatchId(data.id);
        setMobileDetailOpen(true);
      } else {
        alert(data.error || 'Failed to create batch');
      }
    } catch {
      alert('Network error creating batch');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Retry Notification
  const handleRetryNotification = async (logId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message);
        if (selectedBatchId) fetchBatchDetails(selectedBatchId);
      }
    } catch {
      alert('Retry failed');
    }
  };

  // Run Test Suite inside Admin
  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/run-tests');
      const data = await res.json();
      setTestResult(data);
    } catch {
      alert('Test run error');
    } finally {
      setRunningTests(false);
    }
  };

  const copyShareLink = (code: string) => {
    const link = `${window.location.origin}/register?code=${code}`;
    const broadcastMsg = `ShipTrack Batch Announcement 📦\nRoute: ${selectedBatch?.route}\nSelf-register your items here: ${link}`;
    navigator.clipboard.writeText(broadcastMsg);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batchDetails.batch;

  // Render Authentication Gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-3 sm:px-6 py-12 sm:py-20 text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 sm:p-8 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Logistics Admin Portal</h2>
          <p className="text-xs text-slate-400 mt-1.5 mb-6 leading-relaxed">
            Operations dashboard for single-operator batch dispatch, automated WhatsApp broadcast triggers, and customer management.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password (e.g. admin)"
                className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {authError && (
                <p className="text-xs text-rose-400 mt-1.5 text-left">
                  Invalid password. (Use: <code className="font-mono text-emerald-400">admin</code>)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg"
            >
              Sign In to Admin
            </button>

            <button
              type="button"
              onClick={() => {
                onAuthenticate(true);
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              1-Click Demo Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <span>Operations & Batch Dashboard</span>
            </h1>
            <span className="rounded-md bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-400">
              Admin Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch batches, update cargo milestones, and trigger automated WhatsApp notifications.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const now = new Date();
              const dep = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
              const ddl = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0];
              setNewDeparture(dep);
              setNewDeadline(ddl);
              setNewRegCode(`NG-${Math.floor(100 + Math.random() * 900)}`);
              setShowNewBatchModal(true);
            }}
            className="min-h-[40px] flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Batch</span>
          </button>

          {onNavigateToWhatsApp && (
            <button
              onClick={onNavigateToWhatsApp}
              className="min-h-[40px] flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Open WhatsApp simulator"
            >
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>WhatsApp Sim</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs sm:text-sm text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs text-emerald-400 hover:underline ml-4"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* KPI Stat Cards with Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Batches</span>
            <Plane className="h-4 w-4 text-emerald-400 opacity-60" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {batches.length}
          </p>
          <span className="text-[10px] text-slate-500">Nigeria 🇳🇬 ⇄ 🇺🇸 USA</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Shipment Items</span>
            <Package className="h-4 w-4 text-emerald-400 opacity-60" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {batches.reduce((acc, b) => acc + (b.items_count || 0), 0)}
          </p>
          <span className="text-[10px] text-slate-500">Across active batches</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">WhatsApp Updates</span>
            <MessageSquare className="h-4 w-4 text-emerald-400 opacity-60" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {batches.reduce((acc, b) => acc + (b.notifications_count || 0), 0)}
          </p>
          <span className="text-[10px] text-slate-500">Outbound notifications</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Queue Worker</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold font-mono text-emerald-400 mt-2">
            Celery / Redis
          </p>
          <span className="text-[10px] text-slate-500">Async dispatch active</span>
        </div>
      </div>

      {/* Main Responsive Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Batches List (Hidden on mobile if detail is open) */}
        <div
          className={`lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 space-y-3 ${
            mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Plane className="h-4 w-4 text-emerald-400" />
              <span>Shipment Batches</span>
            </h2>
            <button
              onClick={fetchBatches}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition"
              title="Refresh batches list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingBatches ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            {batches.map((b) => {
              const isSelected = b.id === selectedBatchId;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBatchId(b.id);
                    setMobileDetailOpen(true);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {b.registration_code}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium ${
                        b.status === 'in_transit' || b.status === 'departed'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                          : b.status === 'ready_for_pickup' || b.status === 'completed'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1">
                    {b.route}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono tabular-nums">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-slate-500" />
                      <span>{b.items_count || 0} items</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{b.milestones_count || 0} milestones</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Selected Batch Details & Operations (Visible on mobile if detail is open, or always on desktop) */}
        <div
          className={`lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 sm:p-6 space-y-6 ${
            !mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          {selectedBatch ? (
            <>
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold py-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Batches List</span>
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  Batch: {selectedBatch.registration_code}
                </span>
              </div>

              {/* Batch Banner & Quick Action Buttons */}
              <div className="space-y-4 border-b border-slate-700/60 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-slate-400">
                        Selected Batch
                      </span>
                      <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                        {selectedBatch.registration_code}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {selectedBatch.route}
                    </h2>
                  </div>

                  {/* One-Tap Status Update Trigger */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setTargetStatus(selectedBatch.status);
                        setShowStatusModal(true);
                      }}
                      className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Update Status</span>
                    </button>

                    <button
                      onClick={() => setShowMilestoneModal(true)}
                      className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                    >
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Add Milestone</span>
                    </button>
                  </div>
                </div>

                {/* Shareable Registration Link Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      Customer Registration Code:{' '}
                      <strong className="text-emerald-400 font-mono text-sm">{selectedBatch.registration_code}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => copyShareLink(selectedBatch.registration_code)}
                    className="min-h-[36px] flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Registration Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Current State:</span>
                  <span className="font-bold text-white capitalize bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {selectedBatch.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Sub-tabs: Items, Milestones, Notifications, Tests */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-1 overflow-x-auto">
                <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl">
                  <button
                    onClick={() => setActiveBatchTab('items')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      activeBatchTab === 'items'
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Items ({batchDetails.items.length})
                  </button>
                  <button
                    onClick={() => setActiveBatchTab('milestones')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      activeBatchTab === 'milestones'
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Milestones ({batchDetails.milestones.length})
                  </button>
                  <button
                    onClick={() => setActiveBatchTab('notifications')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      activeBatchTab === 'notifications'
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    WhatsApp Logs ({batchDetails.notifications.length})
                  </button>
                  <button
                    onClick={() => setActiveBatchTab('tests')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      activeBatchTab === 'tests'
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pipeline Tests
                  </button>
                </div>

                {activeBatchTab === 'items' && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Shipment Items & Customers */}
              {activeBatchTab === 'items' && (
                <div className="space-y-3">
                  {batchDetails.items.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No items registered in this batch yet. Customers can self-register using code{' '}
                      <span className="font-mono text-emerald-400">{selectedBatch.registration_code}</span>.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {batchDetails.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-emerald-400 font-bold text-xs">
                              {item.tracking_reference}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.weight_kg ? `${item.weight_kg} kg` : 'Weight pending'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-1">
                            <span className="font-medium text-white">
                              {item.customer?.name || 'Customer'}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {item.customer?.phone_number || 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                            {item.description_of_goods}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Milestones */}
              {activeBatchTab === 'milestones' && (
                <div className="space-y-3">
                  {batchDetails.milestones.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No milestones recorded. Add a milestone to trigger outbound WhatsApp alerts.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {batchDetails.milestones.map((ms) => (
                        <div
                          key={ms.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                        >
                          <div>
                            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{ms.label}</span>
                            </span>
                            {ms.admin_note && (
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                {ms.admin_note}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            {new Date(ms.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Notification History */}
              {activeBatchTab === 'notifications' && (
                <div className="space-y-4">
                  {batchDetails.notifications.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No notifications sent for this batch yet. Status changes or milestones will enqueue background jobs here.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {batchDetails.notifications.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                                  log.delivery_status === 'sent'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                                    : log.delivery_status === 'partial'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                                }`}
                              >
                                {log.delivery_status}
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                WhatsApp Notification Dispatch
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg font-mono leading-relaxed border border-slate-800">
                            {log.message_content}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Recipients ({log.recipient_count} customer phone numbers):</span>
                              {log.delivery_status !== 'sent' && (
                                <button
                                  onClick={() => handleRetryNotification(log.id)}
                                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Retry Failed Recipients</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {log.recipients_data.map((rec, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-2.5 py-1.5 border border-slate-700/50"
                                >
                                  <div>
                                    <span className="text-slate-200 font-medium block">
                                      {rec.customer_name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {rec.phone_number} ({rec.tracking_codes})
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                                      rec.status === 'sent'
                                        ? 'text-emerald-400 bg-emerald-950/60'
                                        : 'text-rose-400 bg-rose-950/60'
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Automated Pipeline Tests (Embedded in Admin) */}
              {activeBatchTab === 'tests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-emerald-400" />
                        <span>Background Pipeline Test Runner</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Validates the status update → Celery job → WhatsApp template trigger flow.
                      </p>
                    </div>
                    <button
                      onClick={handleRunTests}
                      disabled={runningTests}
                      className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                    >
                      {runningTests ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Run Tests</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult ? (
                    <div className="space-y-3">
                      <div
                        className={`rounded-xl p-3.5 border text-xs flex items-center justify-between ${
                          testResult.all_passed
                            ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                            : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
                        }`}
                      >
                        <span className="font-semibold">
                          {testResult.all_passed ? 'All 5 Automated Tests Passed' : 'Some Tests Failed'}
                        </span>
                        <span className="font-mono text-[11px]">
                          {testResult.total_duration_ms} ms
                        </span>
                      </div>

                      <div className="space-y-2">
                        {testResult.results.map((t: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>{t.name}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {t.duration_ms} ms
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px]">{t.description}</p>
                            <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-1.5 rounded">
                              {t.details}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Click &quot;Run Tests&quot; to verify the notification triggers and state machines.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              Select or create a batch to view details and operations.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: UPDATE STATUS & DISPATCH NOTIFICATION --- */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-400" />
                <span>Update Status & Dispatch WhatsApps</span>
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Enqueues a Celery background job that sends WhatsApp template messages to all batch customers.
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select New Status:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:border-emerald-500 focus:outline-none capitalize"
                >
                  {BATCH_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Admin Note / Instructions (Included in WhatsApp message):
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Flight EK784 departed Lagos. Expected arrival in Houston on Friday. Pickups commence Saturday 10 AM."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                >
                  {actionLoading ? 'Dispatching...' : 'Confirm Status & Dispatch'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 2: ADD MILESTONE UPDATE --- */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Log Milestone & Dispatch WhatsApp</span>
              </h3>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Milestone Label (Free text) *
                </label>
                <input
                  type="text"
                  required
                  value={milestoneLabel}
                  onChange={(e) => setMilestoneLabel(e.target.value)}
                  placeholder="e.g. Departed Lagos port or Cleared US Customs at IAH"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Optional Admin Note & Specifics
                </label>
                <textarea
                  rows={3}
                  value={milestoneNote}
                  onChange={(e) => setMilestoneNote(e.target.value)}
                  placeholder="e.g. All customs duties cleared. Items moving to local fulfillment hub."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                >
                  {actionLoading ? 'Logging...' : 'Log Milestone & Notify'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 3: CREATE NEW BATCH --- */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Create New Cross-Border Batch</span>
              </h3>
              <button
                onClick={() => setShowNewBatchModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Route (Origin → Destination) *
                </label>
                <input
                  type="text"
                  required
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                  placeholder="e.g. Lagos (LOS) → Houston, TX (IAH)"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Collection Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Departure Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeparture}
                    onChange={(e) => setNewDeparture(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registration Code (e.g. LOS-OCT26)
                </label>
                <input
                  type="text"
                  value={newRegCode}
                  onChange={(e) => setNewRegCode(e.target.value.toUpperCase())}
                  placeholder="Auto-generated if left blank"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                >
                  {actionLoading ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 4: ADD CUSTOMER ITEM MANUALLY --- */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                <span>Add Customer Shipment Item to Batch</span>
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Dapo Agbaje"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newItemPhone}
                    onChange={(e) => setNewItemPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newItemEmail}
                    onChange={(e) => setNewItemEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description of Goods *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newItemGoods}
                  onChange={(e) => setNewItemGoods(e.target.value)}
                  placeholder="e.g. 2 boxes dried food items, clothes, shoes."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Weight (kg, optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newItemWeight}
                  onChange={(e) => setNewItemWeight(e.target.value)}
                  placeholder="20.0"
                  className="w-full sm:w-36 min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                >
                  {actionLoading ? 'Adding...' : 'Generate Tracking & Add'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
