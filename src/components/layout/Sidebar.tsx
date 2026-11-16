import React from 'react';
import {
  BarChart3,
  BrainCircuit,
  LayoutDashboard,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { NavSection } from '../../types/cartpilot';
import { STORE_PROFILE } from '../../data/mockData';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeCartCount: number;
  highPriorityCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'intelligence', label: 'Customer Intelligence', icon: BrainCircuit },
  { id: 'recovery', label: 'Cart Recovery', icon: ShoppingCart },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  activeCartCount,
  highPriorityCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const renderNav = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      {/* Brand Lockup */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectSection('overview');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 7h14l-1.5 8.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 7Z" />
              <path d="M9 11l2 2 4-4" />
            </svg>
          </div>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CartPilot
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Store Context */}
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-[11px] font-medium text-slate-400">Workspace Store</p>
        <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
          {STORE_PROFILE.brandName}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{STORE_PROFILE.category}</p>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const countLabel =
            item.id === 'recovery'
              ? activeCartCount
              : item.id === 'intelligence'
              ? highPriorityCount
              : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {countLabel !== null && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-indigo-700' : 'text-slate-400'
                  }`}
                >
                  {countLabel}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Note */}
      <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">Deterministic Scoring Preview</p>
        <p>Changes persist locally in your browser. Live email/SMS dispatch is disabled.</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block shrink-0">{renderNav()}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{renderNav()}</div>
        </div>
      )}
    </>
  );
};
