// components/Navbar.tsx
'use client';

import React from 'react';
import { Package, ShieldCheck, MessageSquare, UserPlus, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: 'track' | 'register' | 'admin' | 'whatsapp';
  setActiveTab: (tab: 'track' | 'register' | 'admin' | 'whatsapp') => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (val: boolean) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  isAdminAuthenticated,
  setIsAdminAuthenticated,
}: NavbarProps) {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Zone 1: Single text wordmark with brand icon */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setActiveTab('track')}
              className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded py-1"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-white block leading-tight">
                  ShipTrack
                </span>
                <span className="text-[10px] text-emerald-400 font-medium sm:hidden block">
                  Nigeria 🇳🇬 ⇄ 🇺🇸 USA
                </span>
              </div>
            </button>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 border-l border-slate-700 pl-3">
              Cross-Border Batch Logistics (Nigeria 🇳🇬 ⇄ 🇺🇸 USA)
            </span>
          </div>

          {/* Zone 2: Desktop Navigation Links (single-line, clean typography, NO test tab) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'track'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Track Shipment</span>
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'register'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Self-Register</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'admin'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'whatsapp'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp Sim</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Quick Mode Switch */}
          <div className="flex items-center gap-2">
            {isAdminAuthenticated ? (
              <button
                onClick={() => {
                  setIsAdminAuthenticated(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                title="Click to lock admin portal"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Admin Active</span>
                <span className="sm:hidden text-[11px]">Admin</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setIsAdminAuthenticated(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ergonomic Mobile Bottom Navigation Bar (Thumb Zone Optimization) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1 shadow-2xl">
        <div className="grid grid-cols-4 items-center gap-1">
          <button
            onClick={() => setActiveTab('track')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-lg transition ${
              activeTab === 'track'
                ? 'text-emerald-400 bg-slate-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Track</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-lg transition ${
              activeTab === 'register'
                ? 'text-emerald-400 bg-slate-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Register</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-lg transition ${
              activeTab === 'admin'
                ? 'text-emerald-400 bg-slate-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Admin</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-lg transition ${
              activeTab === 'whatsapp'
                ? 'text-emerald-400 bg-slate-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-tight">WhatsApp</span>
          </button>
        </div>
      </div>
    </>
  );
}
