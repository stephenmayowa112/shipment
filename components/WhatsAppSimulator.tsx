// components/WhatsAppSimulator.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCheck,
  Smartphone,
  Info,
  Key,
  Webhook,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface WhatsAppMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  text: string;
  timestamp: string;
  template_name?: string;
  status?: string;
}

export function WhatsAppSimulator({ initialQuery }: { initialQuery?: string }) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState(initialQuery || 'ST-LOS-8921-X9');
  const [senderPhone, setSenderPhone] = useState('2348031234567');
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'docs' | 'templates'>('chat');

  // Load chat messages from simulated store
  const loadChat = async () => {
    try {
      const res = await fetch('/api/webhook/whatsapp', { method: 'GET' });
      // or fetch notification history
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Poll or load initial mock messages
    fetch('/api/notifications')
      .then((res) => res.json())
      .catch(() => {});
  }, []);

  // Send simulated inbound WhatsApp message to webhook
  const handleSendMessage = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const query = (customCode || inputText).trim();
    if (!query) return;

    setLoading(true);

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789098765',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550100999',
                  phone_number_id: '109876543210123',
                },
                contacts: [
                  {
                    profile: { name: 'Customer User' },
                    wa_id: senderPhone,
                  },
                ],
                messages: [
                  {
                    from: senderPhone,
                    id: `wamid.HBgL${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: query },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Optimistically append messages to UI
      const inboundMsg: WhatsAppMessage = {
        id: `in-${Date.now()}`,
        direction: 'inbound',
        from: `+${senderPhone}`,
        to: '+15550100999 (ShipTrack Business)',
        text: query,
        timestamp: new Date().toISOString(),
      };

      const replies: WhatsAppMessage[] = (data.replies || []).map((r: { reply: string }, idx: number) => ({
        id: `out-${Date.now()}-${idx}`,
        direction: 'outbound' as const,
        from: '+15550100999 (ShipTrack Business)',
        to: `+${senderPhone}`,
        text: r.reply,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      }));

      setMessages((prev) => [inboundMsg, ...replies, ...prev]);
      if (!customCode) setInputText('');
    } catch (err) {
      console.error('Failed to dispatch webhook simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    const curlCommand = `curl -X POST "${window.location.origin}/api/webhook/whatsapp" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "2348031234567",
            "type": "text",
            "text": { "body": "ST-LOS-8921-X9" }
          }]
        }
      }]
    }]
  }'`;
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              WhatsApp Business Cloud API Simulator
            </h1>
            <span className="rounded-md bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Interactive Webhook
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test the automated inbound status query webhook and preview approved WhatsApp templates used for batch notification broadcasts.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'chat'
                ? 'bg-slate-900 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live WhatsApp Chat
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'templates'
                ? 'bg-slate-900 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved Meta Templates
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'docs'
                ? 'bg-slate-900 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            API Credentials & Setup
          </button>
        </div>
      </div>

      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Pane: WhatsApp Phone Device Frame */}
          <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[580px]">
            {/* WhatsApp App Header */}
            <div className="bg-emerald-900/90 border-b border-emerald-800 px-4 py-3 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-700 border border-emerald-500/40 flex items-center justify-center font-bold text-sm">
                  ST
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">
                    ShipTrack Logistics Verified
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Official Business Account</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-300">
                +1 (555) 010-0999
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]/90 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Privacy pill banner */}
              <div className="text-center my-2">
                <span className="bg-slate-900/90 text-slate-400 text-[10px] px-3 py-1 rounded-md border border-slate-800">
                  Messages are end-to-end encrypted with WhatsApp Cloud API
                </span>
              </div>

              {/* Seed / Dynamic Messages */}
              <div className="space-y-3 flex flex-col-reverse">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    Send a tracking reference below (e.g.{' '}
                    <button
                      onClick={() => handleSendMessage(undefined, 'ST-LOS-8921-X9')}
                      className="text-emerald-400 underline font-mono"
                    >
                      ST-LOS-8921-X9
                    </button>
                    ) to trigger the automated webhook responder!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOutbound = m.direction === 'outbound';
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isOutbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs shadow-md space-y-1 ${
                            isOutbound
                              ? 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-tl-none'
                              : 'bg-emerald-800 text-white rounded-tr-none'
                          }`}
                        >
                          <div className="text-[10px] font-mono opacity-60">
                            {isOutbound ? 'ShipTrack Bot' : 'Customer WhatsApp'}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">
                            {m.text}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-[9px] opacity-75">
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOutbound && <CheckCheck className="h-3 w-3 text-emerald-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="bg-slate-900 border-t border-slate-800 p-2.5 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value.toUpperCase())}
                placeholder="Type tracking code (e.g. ST-LOS-8921-X9)..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="h-9 w-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50 transition shrink-0"
                title="Send to Webhook"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Right Pane: Quick Queries & Webhook Tester */}
          <div className="md:col-span-5 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span>Simulated Customer Phone</span>
              </h3>
              <p className="text-xs text-slate-400">
                Incoming messages arrive with this caller phone number:
              </p>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick Test Clicks */}
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">
                Test Webhook Auto-Replies
              </h3>
              <p className="text-xs text-slate-400">
                Click any prompt to simulate sending it from customer&apos;s WhatsApp:
              </p>
              <div className="space-y-2">
                {[
                  { code: 'ST-LOS-8921-X9', label: 'Valid Code: Lagos → Houston' },
                  { code: 'ST-JFK-4102-B3', label: 'Valid Code: JFK → Lagos' },
                  { code: 'ST-ATL-1904-C8', label: 'Valid Code: Lagos → Atlanta' },
                  { code: 'ST-INVALID-999', label: 'Invalid / Unrecognized Code' },
                ].map((sample) => (
                  <button
                    key={sample.code}
                    onClick={() => {
                      setInputText(sample.code);
                      handleSendMessage(undefined, sample.code);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-900 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-emerald-400 font-semibold block">
                        {sample.code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {sample.label}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Direct cURL Trigger */}
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Webhook cURL Request</span>
                <button
                  onClick={copyCurl}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                >
                  {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You can test this endpoint directly from terminal or Meta Webhook tester:
              </p>
              <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto">
                POST /api/webhook/whatsapp
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Meta Approved Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Approved Meta WhatsApp Message Templates</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Under WhatsApp Business Platform guidelines, outbound notifications sent outside the 24-hour customer service window must use pre-approved templates with variable parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  shiptrack_batch_status_update
                </span>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded">
                  APPROVED (en_US)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triggered automatically whenever an admin changes the batch status (e.g. Announced → Departed → In Transit).
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                {`Hello {{1}},

📦 Route: {{2}}
📍 Status: {{3}}
ℹ️ Update Note: {{4}}
🔖 Tracking Code: {{5}}

🌐 Track online anytime: https://shiptrack.app/track?code={{5}}
Reply to this message with your tracking code for instant automated status.`}
              </div>
            </div>

            {/* Template 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  shiptrack_milestone_update
                </span>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded">
                  APPROVED (en_US)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triggered on free-text milestone updates (e.g. Customs clearance, transit flights, warehouse arrival).
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                {`ShipTrack Milestone Alert:

Hello {{1}}, your shipment for {{2}} has reached a new milestone:
📍 Milestone: {{3}}
📝 Details: {{4}}
🔖 Tracking: {{5}}

Thank you for choosing ShipTrack.`}
              </div>
            </div>

            {/* Template 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  shiptrack_registration_confirm
                </span>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded">
                  APPROVED (en_US)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dispatched immediately to the customer when they self-register goods into an open batch.
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                {`Hello {{1}}! 👋 Welcome to ShipTrack.
Your items for route {{2}} are confirmed.
Drop-off deadline: {{3}}
Tracking code: {{4}}

Track live at https://shiptrack.app/track?code={{4}}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Docs / Credentials Tab */}
      {activeTab === 'docs' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              <span>WhatsApp Business Cloud API Production Setup Guide</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              To connect your real Meta WhatsApp Business account, follow these simple steps and update your environment variables:
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-lg bg-slate-900/80 p-3.5 border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">
                  Step 1: Create Meta App
                </span>
                Go to{' '}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline"
                >
                  developers.facebook.com
                </a>
                , create a Business App, and add the <strong>WhatsApp</strong> product.
              </div>

              <div className="rounded-lg bg-slate-900/80 p-3.5 border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">
                  Step 2: Obtain Phone Number ID & Access Token
                </span>
                In the WhatsApp &gt; API Setup tab, copy your <strong>Phone Number ID</strong> and create a permanent System User Token with the <code className="font-mono text-emerald-400">whatsapp_business_messaging</code> permission.
              </div>

              <div className="rounded-lg bg-slate-900/80 p-3.5 border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">
                  Step 3: Webhook Verification
                </span>
                Under WhatsApp &gt; Configuration, set the Callback URL to:
                <code className="block mt-1 font-mono text-slate-200 bg-slate-950 p-2 rounded">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.app'}/api/webhook/whatsapp
                </code>
                and Verify Token to:
                <code className="block mt-1 font-mono text-slate-200 bg-slate-950 p-2 rounded">
                  shiptrack_webhook_secret_verify_token_2026
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
