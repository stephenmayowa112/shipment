// components/TrackView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Plane,
  Warehouse,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  MapPin,
  Barcode,
  Truck,
  Scale,
  Sparkles,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Milestone {
  id: string;
  label: string;
  timestamp: string;
  admin_note?: string;
}

interface TrackingData {
  tracking_reference: string;
  customer_name: string;
  masked_phone: string;
  description_of_goods: string;
  weight_kg?: number;
  status_override?: string;
  batch: {
    id: string;
    route: string;
    status: string;
    departure_date: string;
    collection_deadline: string;
  } | null;
  milestones: Milestone[];
}

const STAGES = [
  { key: 'announced', label: 'Announced', icon: Calendar },
  { key: 'collection_open', label: 'Collection Open', icon: Warehouse },
  { key: 'collection_closed', label: 'Collection Closed', icon: Package },
  { key: 'departed', label: 'Departed', icon: Plane },
  { key: 'in_transit', label: 'In Transit', icon: Plane },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export function TrackView({ onOpenWhatsAppSim }: { onOpenWhatsAppSim?: (code: string) => void }) {
  const [trackingCode, setTrackingCode] = useState('ST-LOS-8921-X9');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch tracking data
  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || trackingCode).trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Shipment not found');
        setTrackingData(null);
      } else {
        setTrackingData(data);
        setError(null);
      }
    } catch {
      setError('Unable to fetch tracking details. Please try again.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    fetch(`/api/track/${encodeURIComponent('ST-LOS-8921-X9')}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data && !data.error) {
          setTrackingData(data);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageIndex = (statusKey?: string) => {
    if (!statusKey) return -1;
    return STAGES.findIndex((s) => s.key === statusKey);
  };

  const currentStageIndex = getStageIndex(trackingData?.batch?.status);

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Visual Hero & Search Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        {/* Visual Route Graphic Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 text-xs text-emerald-300">
          <span className="text-base">🇳🇬</span>
          <span className="font-semibold">Lagos (LOS)</span>
          <Plane className="h-3.5 w-3.5 text-emerald-400 rotate-90 sm:rotate-0" />
          <span className="font-semibold">USA (IAH / JFK / ATL)</span>
          <span className="text-base">🇺🇸</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance leading-tight">
          Track Your Cross-Border Batch Cargo
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Real-time visibility into Nigeria ⇄ US air cargo batches, verified customs clearances, and milestone notifications.
        </p>

        {/* Input Bar - Mobile Optimized Touch Target */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-lg mx-auto"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              placeholder="e.g. ST-LOS-8921-X9"
              className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-800/90 py-3 pl-11 pr-4 text-sm font-mono tracking-wide text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] px-6 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 transition shrink-0 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Searching...</span>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Track Package</span>
              </>
            )}
          </button>
        </form>

        {/* Sample Code Quick Pickers (Thumb-friendly Chips) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 mr-1 text-[11px]">Quick Samples:</span>
          {[
            { code: 'ST-LOS-8921-X9', label: '🇳🇬 Lagos → Houston (Foodstuffs)' },
            { code: 'ST-JFK-4102-B3', label: '🇺🇸 New York → Lagos (Electronics)' },
            { code: 'ST-ATL-1904-C8', label: '🇳🇬 Lagos → Atlanta (Pickup Ready)' },
          ].map((sample) => (
            <button
              key={sample.code}
              type="button"
              onClick={() => {
                setTrackingCode(sample.code);
                handleSearch(sample.code);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition text-[11px] font-mono"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg rounded-xl border border-rose-800/50 bg-rose-950/40 p-4 text-rose-300 flex items-start gap-3 text-xs sm:text-sm"
        >
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tracking Code Not Found</p>
            <p className="mt-1 text-xs text-rose-300/80">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Tracking Result View */}
      <AnimatePresence mode="wait">
        {trackingData && (
          <motion.div
            key={trackingData.tracking_reference}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Visual Shipment Card Header with Route Illustration */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 sm:p-6 shadow-xl space-y-6 overflow-hidden relative">
              {/* Subtle Flight Path Map Vector Art Background */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none hidden sm:block">
                <svg viewBox="0 0 400 300" className="w-full h-full fill-none stroke-emerald-400 stroke-[1.5]">
                  <path d="M 20 200 Q 180 50 360 120" strokeDasharray="6 6" />
                  <circle cx="20" cy="200" r="6" fill="#10b981" />
                  <circle cx="360" cy="120" r="6" fill="#10b981" />
                </svg>
              </div>

              {/* Top Row: Reference, Route & WhatsApp Action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                      <Barcode className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Tracking Reference</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(trackingData.tracking_reference)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition px-1.5 py-0.5 rounded bg-slate-800"
                      title="Copy Tracking Reference"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tracking-wide mt-1">
                    {trackingData.tracking_reference}
                  </h2>

                  {/* SVG Barcode Graphic */}
                  <div className="mt-2 flex items-center gap-0.5 opacity-70">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 4, 1].map((width, i) => (
                      <span
                        key={i}
                        className="bg-slate-400 h-5"
                        style={{ width: `${width * 1.5}px` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Route Header Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Batch Logistics Route
                      </span>
                      <p className="text-sm sm:text-base font-bold text-slate-100">
                        {trackingData.batch?.route || 'Route Unavailable'}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Direct Query CTA */}
                  {onOpenWhatsAppSim && (
                    <button
                      onClick={() => onOpenWhatsAppSim(trackingData.tracking_reference)}
                      className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition text-xs font-semibold shrink-0"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp Auto-Update</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Stepper - Mobile Scrollable & Clean Responsive Layout */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="font-semibold text-slate-300">Shipment Progression Lifecycle</span>
                  <span className="text-[11px] font-mono text-emerald-400 capitalize">
                    Current: {trackingData.batch?.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Stepper Grid (Responsive for Mobile) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {STAGES.map((stage, idx) => {
                    const isDone = currentStageIndex >= idx;
                    const isCurrent = currentStageIndex === idx;
                    const StageIcon = stage.icon;

                    return (
                      <div
                        key={stage.key}
                        className={`flex flex-col p-2.5 sm:p-3 rounded-xl border transition ${
                          isCurrent
                            ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/40'
                            : isDone
                            ? 'border-slate-700 bg-slate-900/70 text-slate-300'
                            : 'border-slate-800/60 bg-slate-900/30 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <StageIcon
                            className={`h-4 w-4 ${
                              isCurrent
                                ? 'text-emerald-400 animate-bounce'
                                : isDone
                                ? 'text-emerald-500'
                                : 'text-slate-600'
                            }`}
                          />
                          {isDone ? (
                            <CheckCircle2
                              className={`h-3.5 w-3.5 ${
                                isCurrent ? 'text-emerald-400' : 'text-emerald-500'
                              }`}
                            />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-800" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold leading-tight line-clamp-1">
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <span className="mt-1 text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                            Live Stage
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Two-Column Grid: Shipment Metadata & Milestone Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Shipment Specs & Customer Details */}
              <div className="md:col-span-1 space-y-4 sm:space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-700/50 pb-3">
                    <Package className="h-4 w-4 text-emerald-400" />
                    <span>Package Manifest</span>
                  </h3>

                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Recipient</span>
                    <p className="text-sm font-semibold text-slate-100">
                      {trackingData.customer_name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {trackingData.masked_phone}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Declared Goods</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      {trackingData.description_of_goods}
                    </p>
                  </div>

                  {trackingData.weight_kg && (
                    <div className="flex items-center gap-2 text-xs">
                      <Scale className="h-4 w-4 text-emerald-400" />
                      <span className="text-slate-400">Weight:</span>
                      <span className="font-mono text-white font-semibold">
                        {trackingData.weight_kg} kg
                      </span>
                    </div>
                  )}

                  {trackingData.status_override && (
                    <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 p-3 text-xs text-amber-300">
                      <span className="font-semibold block mb-0.5">Special Handling:</span>
                      {trackingData.status_override}
                    </div>
                  )}
                </div>

                {/* Batch Deadlines & Dates */}
                <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-700/50 pb-3">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    <span>Schedule & Deadlines</span>
                  </h3>

                  <div className="flex items-start gap-2.5">
                    <Plane className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400">Scheduled Departure</span>
                      <p className="text-xs font-mono text-slate-200 mt-0.5">
                        {trackingData.batch?.departure_date
                          ? new Date(trackingData.batch.departure_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'To be confirmed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Warehouse className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400">Drop-off Deadline</span>
                      <p className="text-xs font-mono text-slate-200 mt-0.5">
                        {trackingData.batch?.collection_deadline
                          ? new Date(trackingData.batch.collection_deadline).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customs Clearance Visual Badge */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-xs text-emerald-300 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-emerald-200 mb-0.5">
                      Verified Batch Tracking
                    </span>
                    <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                      All customers receive outbound WhatsApp notifications automatically as this batch moves between airports and customs inspection hubs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Milestone Update Timeline */}
              <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-800/40 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-emerald-400" />
                      <span>Verified Milestone History</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Official handling logs and checkpoint verifications.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 tabular-nums bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    {trackingData.milestones.length} checkpoints
                  </span>
                </div>

                {trackingData.milestones.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No milestone updates logged for this batch yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                    {trackingData.milestones.map((ms, idx) => (
                      <div key={ms.id || idx} className="relative group">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 ${
                            idx === 0
                              ? 'border-emerald-500 bg-emerald-400 shadow-sm shadow-emerald-500/50'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        />

                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                              <span>{ms.label}</span>
                              {idx === 0 && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                                  LATEST
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-mono text-slate-400 tabular-nums">
                              {new Date(ms.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {ms.admin_note && (
                            <p className="mt-2 text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-xl p-3 leading-relaxed">
                              {ms.admin_note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
