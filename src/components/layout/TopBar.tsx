import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  RotateCcw,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  NavSection,
  NotificationItem,
} from '../../types/cartpilot';
import { STORE_PROFILE } from '../../data/mockData';
import { getCartTotalInr } from '../../services/scoringEngine';
import { formatInr } from '../../services/recoveryService';

interface TopBarProps {
  activeSection: NavSection;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  customers: Customer[];
  carts: AbandonedCart[];
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectCart: (cartId: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  onResetDemoData: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Overview',
  customers: 'Customers',
  intelligence: 'Customer Intelligence',
  recovery: 'Cart Recovery',
  analytics: 'Analytics',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  searchQuery,
  onSearchChange,
  customers,
  carts,
  notifications,
  onMarkAllNotificationsRead,
  onSelectCustomer,
  onSelectCart,
  onNavigate,
  onOpenMobileMenu,
  onResetDemoData,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const trimmed = searchQuery.trim().toLowerCase();

  const matchingCustomers = trimmed
    ? customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(trimmed) ||
            c.id.toLowerCase().includes(trimmed) ||
            c.email.toLowerCase().includes(trimmed) ||
            c.city.toLowerCase().includes(trimmed)
        )
        .slice(0, 4)
    : [];

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const matchingCarts = trimmed
    ? carts
        .filter((cart) => {
          const cust = customerMap.get(cart.customerId);
          return (
            cart.id.toLowerCase().includes(trimmed) ||
            cart.items.some((item) => item.name.toLowerCase().includes(trimmed)) ||
            (cust && cust.name.toLowerCase().includes(trimmed))
          );
        })
        .slice(0, 3)
    : [];

  const showSearchResults = searchFocused && trimmed.length > 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
      {/* Left: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 whitespace-nowrap">
            {STORE_PROFILE.brandName}
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {SECTION_LABELS[activeSection]}
          </h1>
        </div>
      </div>

      {/* Center/Right: Global Search + Notifications + Store Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Global Search */}
        <div ref={searchRef} className="relative w-44 sm:w-72 md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search customers, IDs, SKUs..."
            aria-label="Search customers, cart IDs, or products"
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />

          {showSearchResults && (
            <div className="absolute right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40">
              {matchingCustomers.length === 0 && matchingCarts.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">
                  No customers or carts match "{searchQuery}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {matchingCustomers.length > 0 && (
                    <div className="py-1.5">
                      <p className="px-3 py-1 text-[11px] font-medium text-slate-400">
                        Customers
                      </p>
                      {matchingCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            onSelectCustomer(cust.id);
                            setSearchFocused(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-900 truncate">
                              {cust.name}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 shrink-0">
                            {cust.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchingCarts.length > 0 && (
                    <div className="py-1.5">
                      <p className="px-3 py-1 text-[11px] font-medium text-slate-400">
                        Abandoned Carts
                      </p>
                      {matchingCarts.map((cart) => {
                        const cust = customerMap.get(cart.customerId);
                        return (
                          <button
                            key={cart.id}
                            type="button"
                            onClick={() => {
                              onSelectCart(cart.id);
                              setSearchFocused(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <ShoppingCart className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-slate-900 truncate">
                                <span className="font-mono font-medium">{cart.id}</span>
                                {cust ? ` · ${cust.name}` : ''}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] font-medium text-slate-700 tabular-nums shrink-0">
                              {formatInr(getCartTotalInr(cart.items))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Recovery Alerts
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-slate-500 text-center">
                    No active recovery notifications.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.targetId && item.targetSection === 'recovery') {
                          onSelectCart(item.targetId);
                        } else {
                          onNavigate(item.targetSection);
                        }
                        setNotifOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        item.read ? 'opacity-70' : 'bg-indigo-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {item.title}
                        </p>
                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {item.timeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                        {item.detail}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Store Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            aria-label="Store account menu"
          >
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
              VG
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-slate-900 leading-none whitespace-nowrap">
                {STORE_PROFILE.managerName}
              </p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 whitespace-nowrap">
                {STORE_PROFILE.brandName}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">
                  {STORE_PROFILE.brandName}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {STORE_PROFILE.managerName} · {STORE_PROFILE.managerRole}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {STORE_PROFILE.location} · Currency: INR (₹)
                </p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset Demo Store Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
