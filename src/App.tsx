import { useEffect, useMemo, useState } from 'react';
import { DAILY_ACTIVITY_SERIES } from './data/mockData';
import {
  AbandonedCart,
  Customer,
  NavSection,
  NotificationItem,
  RecoveryStatus,
} from './types/cartpilot';
import {
  computeDashboardMetrics,
  formatInr,
  loadPersistedState,
  resetPersistedState,
  savePersistedState,
} from './services/recoveryService';
import { getCartTotalInr } from './services/scoringEngine';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/views/OverviewView';
import { CustomersView } from './components/views/CustomersView';
import { IntelligenceView } from './components/views/IntelligenceView';
import { CartRecoveryView } from './components/views/CartRecoveryView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { CustomerProfileDrawer } from './components/drawers/CustomerProfileDrawer';
import { CartDetailDrawer } from './components/drawers/CartDetailDrawer';
import { fetchCustomers, fetchCarts } from './services/api';
export default function App() {
  const [initialState] = useState(() => loadPersistedState());
  const [customers, setCustomers] = useState<Customer[]>(initialState.customers);
  const [carts, setCarts] = useState<AbandonedCart[]>(initialState.carts);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(
    initialState.readNotificationIds
  );

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  useEffect(() => {
  let isMounted = true;

  async function loadApiData() {
    try {
      setIsLoading(true);
      setApiError(null);

      const [customerData, cartData] = await Promise.all([
        fetchCustomers(),
        fetchCarts(),
      ]);

      if (isMounted) {
        setCustomers(customerData);
        setCarts(cartData);
      }
    } catch (error) {
      console.error('Failed to load API data:', error);

      if (isMounted) {
        setApiError(
          error instanceof Error
            ? error.message
            : 'Unable to load data from the server'
        );
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  loadApiData();

  return () => {
    isMounted = false;
  };
}, []);
  useEffect(() => {
    savePersistedState({
      customers,
      carts,
      readNotificationIds,
    });
  }, [customers, carts, readNotificationIds]);

  const metrics = useMemo(
    () => computeDashboardMetrics(customers, carts),
    [customers, carts]
  );

  const notifications = useMemo<NotificationItem[]>(() => {
    const custMap = new Map(customers.map((c) => [c.id, c]));
    const items: NotificationItem[] = [];

    carts
      .filter((c) => c.recoveryStatus === 'Awaiting approval')
      .forEach((cart) => {
        const cust = custMap.get(cart.customerId);
        const val = formatInr(getCartTotalInr(cart.items));
        const id = `notif-approval-${cart.id}`;
        items.push({
          id,
          title: `Approval needed · ${cust?.name ?? cart.customerId}`,
          detail: `${cart.id} (${val}) draft is waiting for review.`,
          timeLabel: 'Action',
          targetSection: 'recovery',
          targetId: cart.id,
          read: readNotificationIds.includes(id),
        });
      });

    carts
      .filter((c) => c.recoveryStatus === 'Pending' && c.abandonedHoursAgo <= 6)
      .forEach((cart) => {
        const cust = custMap.get(cart.customerId);
        const val = formatInr(getCartTotalInr(cart.items));
        const id = `notif-urgent-${cart.id}`;
        items.push({
          id,
          title: `Recent high-value abandonment`,
          detail: `${cust?.name ?? cart.customerId} left ${val} at checkout.`,
          timeLabel: `${cart.abandonedHoursAgo}h ago`,
          targetSection: 'recovery',
          targetId: cart.id,
          read: readNotificationIds.includes(id),
        });
      });

    return items;
  }, [carts, customers, readNotificationIds]);

  const handleMarkNotificationRead = (notificationId: string) => {
    setReadNotificationIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setReadNotificationIds(notifications.map((n) => n.id));
  };

  const handleUpdateCart = (
    cartId: string,
    updates: Partial<AbandonedCart>,
    interactionSummary?: string,
    customerStatusUpdate?: Customer['purchaseStatus']
  ) => {
    const targetCart = carts.find((c) => c.id === cartId);
    if (!targetCart) return;

    const nowIso = new Date().toISOString();
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id === cartId
          ? { ...cart, ...updates, updatedAtIso: nowIso }
          : cart
      )
    );

    if (interactionSummary || customerStatusUpdate) {
      const now = new Date();
      const istParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const getPart = (type: string) => istParts.find((p) => p.type === type)?.value ?? '00';
      const formattedTimestamp = `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')} IST`;

      setCustomers((prev) =>
        prev.map((cust) => {
          if (cust.id !== targetCart.customerId) return cust;
          const nextInteractions = interactionSummary
            ? [
                {
                  id: `INT-${Date.now()}`,
                  timestamp: formattedTimestamp,
                  channel: 'System Review' as const,
                  summary: interactionSummary,
                  outcome: updates.recoveryStatus ?? targetCart.recoveryStatus,
                },
                ...cust.interactions,
              ]
            : cust.interactions;
          return {
            ...cust,
            purchaseStatus: customerStatusUpdate ?? cust.purchaseStatus,
            interactions: nextInteractions,
          };
        })
      );
    }
  };

  const handleQuickApprove = (cartId: string) => {
    const cart = carts.find((c) => c.id === cartId);
    const cust = customers.find((c) => c.id === cart?.customerId);
    handleUpdateCart(
      cartId,
      {
        recoveryStatus: 'Approved',
        lastActionNote: 'Approved from Cart Recovery queue (preview mode).',
      },
      `Approved ${cart?.channel ?? 'Email'} recovery message for ${cust?.name ?? 'customer'}.`
    );
  };

  const handleQuickReject = (cartId: string) => {
    handleUpdateCart(
      cartId,
      {
        recoveryStatus: 'Pending',
        lastActionNote: 'Rejected in queue; returned to Pending for revision.',
      },
      `Rejected recovery draft for ${cartId}; returned to Pending.`
    );
  };

  const handleChangeStatus = (cartId: string, newStatus: RecoveryStatus) => {
    const cart = carts.find((c) => c.id === cartId);
    const cust = customers.find((c) => c.id === cart?.customerId);
    const nextCustStatus =
      newStatus === 'Recovered'
        ? 'Recovered'
        : cust?.purchaseStatus === 'Recovered'
        ? 'Abandoned'
        : undefined;

    handleUpdateCart(
      cartId,
      {
        recoveryStatus: newStatus,
        lastActionNote: `Status changed to ${newStatus}.`,
      },
      `Recovery status updated to ${newStatus}.`,
      nextCustStatus
    );
  };

  const handleResetDemoData = () => {
    const fresh = resetPersistedState();
    setCustomers(fresh.customers);
    setCarts(fresh.carts);
    setReadNotificationIds([]);
    setSelectedCartId(null);
    setSelectedCustomerId(null);
    setSearchQuery('');
  };

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;
  const selectedCustomerCart = selectedCustomer
    ? carts.find((c) => c.customerId === selectedCustomer.id)
    : undefined;

  const selectedCart = carts.find((c) => c.id === selectedCartId) ?? null;
  const selectedCartCustomer = selectedCart
    ? customers.find((c) => c.id === selectedCart.customerId) ?? null
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeCartCount={metrics.activeAbandonedCartsCount}
        highPriorityCount={metrics.highPriorityCustomersCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeSection={activeSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          customers={customers}
          carts={carts}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onSelectCustomer={(id) => {
            setSelectedCartId(null);
            setSelectedCustomerId(id);
          }}
          onSelectCart={(id) => {
            setSelectedCustomerId(null);
            setSelectedCartId(id);
          }}
          onNavigate={setActiveSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onResetDemoData={handleResetDemoData}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView
              customers={customers}
              carts={carts}
              activitySeries={DAILY_ACTIVITY_SERIES}
              onNavigate={setActiveSection}
              onSelectCustomer={(id) => {
                setSelectedCartId(null);
                setSelectedCustomerId(id);
              }}
              onSelectCart={(id) => {
                setSelectedCustomerId(null);
                setSelectedCartId(id);
              }}
            />
          )}

          {activeSection === 'customers' && (
            <CustomersView
              customers={customers}
              carts={carts}
              globalSearch={searchQuery}
              onClearGlobalSearch={() => setSearchQuery('')}
              onSelectCustomer={(id) => {
                setSelectedCartId(null);
                setSelectedCustomerId(id);
              }}
            />
          )}

          {activeSection === 'intelligence' && (
            <IntelligenceView
              customers={customers}
              carts={carts}
              onSelectCustomer={(id) => {
                setSelectedCartId(null);
                setSelectedCustomerId(id);
              }}
              onSelectCart={(id) => {
                setSelectedCustomerId(null);
                setSelectedCartId(id);
              }}
            />
          )}

          {activeSection === 'recovery' && (
            <CartRecoveryView
              carts={carts}
              customers={customers}
              globalSearch={searchQuery}
              onClearGlobalSearch={() => setSearchQuery('')}
              onSelectCart={(id) => {
                setSelectedCustomerId(null);
                setSelectedCartId(id);
              }}
              onSelectCustomer={(id) => {
                setSelectedCartId(null);
                setSelectedCustomerId(id);
              }}
              onQuickApprove={handleQuickApprove}
              onQuickReject={handleQuickReject}
              onChangeStatus={handleChangeStatus}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView
              customers={customers}
              carts={carts}
              activitySeries={DAILY_ACTIVITY_SERIES}
            />
          )}
        </main>
      </div>

      {/* Customer Profile Slide-Over */}
      <CustomerProfileDrawer
        customer={selectedCustomer}
        cart={selectedCustomerCart}
        onClose={() => setSelectedCustomerId(null)}
        onOpenCart={(cartId) => {
          setSelectedCustomerId(null);
          setSelectedCartId(cartId);
        }}
      />

      {/* Cart Recovery Slide-Over */}
      <CartDetailDrawer
        cart={selectedCart}
        customer={selectedCartCustomer}
        onClose={() => setSelectedCartId(null)}
        onOpenCustomer={(customerId) => {
          setSelectedCartId(null);
          setSelectedCustomerId(customerId);
        }}
        onUpdateCart={handleUpdateCart}
      />
    </div>
  );
}
