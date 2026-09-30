// app/page.tsx
'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { TrackView } from '@/components/TrackView';
import { RegisterView } from '@/components/RegisterView';
import { AdminDashboard } from '@/components/AdminDashboard';
import { WhatsAppSimulator } from '@/components/WhatsAppSimulator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'track' | 'register' | 'admin' | 'whatsapp'>('track');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [initialWhatsAppQuery, setInitialWhatsAppQuery] = useState('ST-LOS-8921-X9');

  const handleOpenWhatsAppSim = (code: string) => {
    setInitialWhatsAppQuery(code);
    setActiveTab('whatsapp');
  };

  const handleRegistrationComplete = (_trackingCode: string) => {
    setActiveTab('track');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation (Tests removed from primary navigation as requested) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminAuthenticated={isAdminAuthenticated}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
      />

      {/* Main Content Area with mobile bottom padding */}
      <main className="flex-1 pb-24 md:pb-12">
        {activeTab === 'track' && (
          <TrackView onOpenWhatsAppSim={handleOpenWhatsAppSim} />
        )}

        {activeTab === 'register' && (
          <RegisterView onRegistrationComplete={handleRegistrationComplete} />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            isAuthenticated={isAdminAuthenticated}
            onAuthenticate={setIsAdminAuthenticated}
            onNavigateToWhatsApp={() => setActiveTab('whatsapp')}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppSimulator initialQuery={initialWhatsAppQuery} />
        )}
      </main>

      {/* Quiet, Anti-Slop Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 text-xs text-slate-400 mb-14 md:mb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">ShipTrack Logistics</span>
            <span>·</span>
            <span>Nigeria 🇳🇬 ⇄ 🇺🇸 USA Cross-Border Batch Cargo</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('track')}
              className="hover:text-slate-200 transition"
            >
              Track
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('register')}
              className="hover:text-slate-200 transition"
            >
              Register
            </button>
            <span>·</span>
            <button
              onClick={() => {
                setActiveTab('admin');
                setIsAdminAuthenticated(true);
              }}
              className="hover:text-slate-200 transition"
            >
              Admin Portal
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className="hover:text-slate-200 transition"
            >
              WhatsApp Webhook
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
