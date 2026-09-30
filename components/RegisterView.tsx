// components/RegisterView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Package,
  Calendar,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Plane,
  Scale,
  Barcode,
  Clock,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BatchSummary {
  id: string;
  route: string;
  registration_code: string;
  status: string;
  collection_deadline: string;
}

export function RegisterView({
  onRegistrationComplete,
}: {
  onRegistrationComplete?: (trackingCode: string) => void;
}) {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState('LOS-OCT26');
  const [customCode, setCustomCode] = useState('');
  const [useCustomCode, setUseCustomCode] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredResult, setRegisteredResult] = useState<{
    tracking_reference: string;
    batch_route: string;
    collection_deadline: string;
    customer_name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch batches on mount
  useEffect(() => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBatches(data);
          const openBatch = data.find(
            (b) => b.status === 'announced' || b.status === 'collection_open'
          );
          if (openBatch) {
            setSelectedBatchCode(openBatch.registration_code);
          }
        }
      })
      .catch((err) => console.error('Error fetching batches:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullPhone = `${phonePrefix}${phoneNumber.replace(/\s+/g, '')}`;
    const code = (useCustomCode ? customCode : selectedBatchCode).trim().toUpperCase();

    if (!code) {
      setError('Please provide or select a batch registration code.');
      return;
    }
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('WhatsApp-enabled phone number is required.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the goods being shipped.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_code: code,
          name: name.trim(),
          phone_number: fullPhone,
          email: email.trim(),
          description_of_goods: description.trim(),
          weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        setRegisteredResult({
          tracking_reference: data.tracking_reference,
          batch_route: data.batch.route,
          collection_deadline: data.batch.collection_deadline,
          customer_name: name.trim(),
        });
        // Reset form inputs
        setName('');
        setPhoneNumber('');
        setEmail('');
        setDescription('');
        setWeightKg('');
      }
    } catch {
      setError('Network error occurred during registration. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs text-emerald-300">
          <UserPlus className="h-3.5 w-3.5" />
          <span>Customer Batch Drop-Off Intake</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
          Self-Register into a Shipment Batch
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Book your items into an active Nigeria ⇄ US batch cargo container. You will automatically receive a unique tracking reference and WhatsApp arrival notifications.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {registeredResult ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-emerald-500/40 bg-slate-900/90 p-5 sm:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden"
          >
            {/* Stamp effect */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                Registration Confirmed & Verified
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                Shipment Registered Successfully
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Your items are booked for route <strong className="text-white">{registeredResult.batch_route}</strong>.
              </p>
            </div>

            {/* Generated Tracking Reference Box with Barcode visual */}
            <div className="max-w-md mx-auto rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-inner space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Unique Tracking Reference:</span>
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded">
                  Official Code
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tracking-wider">
                  {registeredResult.tracking_reference}
                </span>
                <button
                  onClick={() => copyToClipboard(registeredResult.tracking_reference)}
                  className="rounded-lg p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  title="Copy Tracking Code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {/* Barcode visual */}
              <div className="flex items-center justify-center gap-1 opacity-70 pt-1">
                {[2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 4, 1, 2].map((w, i) => (
                  <span key={i} className="bg-slate-300 h-6" style={{ width: `${w * 1.5}px` }} />
                ))}
              </div>

              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                <span>WhatsApp confirmation sent to your phone!</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (onRegistrationComplete) {
                    onRegistrationComplete(registeredResult.tracking_reference);
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg"
              >
                <span>Track This Shipment Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setRegisteredResult(null)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                Register Another Package
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 sm:p-8 shadow-xl space-y-6"
          >
            {error && (
              <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Batch Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Plane className="h-4 w-4 text-emerald-400" />
                <span>1. Select Shipment Batch</span>
              </label>

              {!useCustomCode ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {batches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBatchCode(b.registration_code)}
                        className={`text-left p-3.5 rounded-xl border transition ${
                          selectedBatchCode === b.registration_code
                            ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400 font-mono">
                            {b.registration_code}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize bg-slate-800 px-1.5 py-0.5 rounded">
                            {b.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-100 mt-1 line-clamp-1">
                          {b.route}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>Deadline: {new Date(b.collection_deadline).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomCode(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline pt-1 block"
                  >
                    Have a custom batch code from operator? Enter manually
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LOS-OCT26"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setUseCustomCode(false)}
                    className="text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    Select from active open batches list
                  </button>
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-4 pt-3 border-t border-slate-700/60">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                <span>2. Contact Details</span>
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Babatunde Adeleke"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone with Country Code */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  WhatsApp Phone Number * (Where automated status will be sent)
                </label>
                <div className="flex gap-2">
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                    className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none shrink-0"
                  >
                    <option value="+234">🇳🇬 Nigeria (+234)</option>
                    <option value="+1">🇺🇸 USA (+1)</option>
                    <option value="+44">🇬🇧 UK (+44)</option>
                  </select>
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={phonePrefix === '+234' ? '803 123 4567' : '713 555 0192'}
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-base sm:text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. b.adeleke@example.com"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Shipment Items Description */}
            <div className="space-y-4 pt-3 border-t border-slate-700/60">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                <span>3. Cargo Details</span>
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Description of Goods * (Itemized contents)
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 2 boxes dried foodstuffs (smoked fish, spices, ogbono) & 1 bag tailored clothing."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-base sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Estimated Weight (kg, optional)
                </label>
                <div className="relative w-full sm:w-48">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Scale className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 15.5"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-semibold text-white shadow-xl hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Registering Package...</span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register Shipment & Generate Tracking Code</span>
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
