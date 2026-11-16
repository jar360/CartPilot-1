import { INITIAL_ABANDONED_CARTS, INITIAL_CUSTOMERS } from '../data/mockData';
import {
  AbandonedCart,
  Customer,
  MessageChannel,
  MessageTone,
  PriorityScoreBreakdown,
  PurchaseIntent,
  RecoveryAIServiceContract,
  RecoveryStatus,
} from '../types/cartpilot';
import { calculatePriorityScore, getCartTotalInr } from './scoringEngine';

const STORAGE_KEY = 'cartpilot_demo_state_v1';

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export const RECOVERY_STATUS_ORDER: RecoveryStatus[] = [
  'Pending',
  'Message generated',
  'Awaiting approval',
  'Approved',
  'Recovered',
];

/**
 * Deterministic template-based recovery message generator.
 * Implements RecoveryAIServiceContract so Stage-2 server-side Gemini calls
 * can replace this implementation cleanly without changing UI components.
 */
export const deterministicRecoveryService: RecoveryAIServiceContract = {
  async generatePersonalizedMessage({
    customer,
    cart,
    scoreBreakdown,
    channel,
    tone,
  }: {
    customer: Customer;
    cart: AbandonedCart;
    scoreBreakdown: PriorityScoreBreakdown;
    channel: MessageChannel;
    tone: MessageTone;
  }) {
    const firstName = customer.name.split(' ')[0];
    const totalInr = formatInr(getCartTotalInr(cart.items));
    const itemNames = cart.items.map((item) => item.name);
    const primaryItem = itemNames[0] ?? 'your skincare essentials';
    const extraCount = itemNames.length > 1 ? ` + ${itemNames.length - 1} more` : '';

    let subject = `${firstName}, your ${primaryItem} is still saved in your bag`;
    let body = '';

    if (tone === 'VIP Concierge') {
      subject = `${firstName}, priority dispatch reserved for your ${primaryItem}${extraCount}`;
      if (channel === 'WhatsApp') {
        body = `Hi ${firstName}, this is the VedaGlow Care team. We saved your ${primaryItem}${extraCount} (${totalInr}) for ${customer.city} delivery. Since you reached ${customer.checkoutStepReached.toLowerCase()}, you can complete checkout in 1 tap with complimentary express shipping. Reply here if you'd like regimen pairing advice for ${customer.skinProfile.toLowerCase()} skin.`;
      } else {
        body = `Hi ${firstName},\n\nWe noticed you left ${itemNames.join(' and ')} in your bag (${totalInr}). Because you are a valued VedaGlow customer in ${customer.city}, we have reserved your stock along with complimentary express dispatch.\n\nYour ${customer.skinProfile.toLowerCase()} routine is ready whenever you are—resume your saved checkout below without re-entering your address.\n\nWarmly,\nVedaGlow Botanicals Concierge`;
      }
    } else if (tone === 'Gentle Incentive') {
      subject = `${firstName}, enjoy 10% off your ${primaryItem}${extraCount}`;
      if (channel === 'WhatsApp') {
        body = `Hi ${firstName}! Your VedaGlow bag (${totalInr}) with ${primaryItem}${extraCount} is still waiting. Use code VEDA10 for 10% off your order before stock refreshes tonight. Happy to help with any ingredient questions!`;
      } else {
        body = `Hi ${firstName},\n\nStill thinking over ${itemNames.join(' and ')}? We have kept your cart saved (${totalInr}) and unlocked code VEDA10 for 10% off at checkout.\n\nFormulated for ${customer.skinProfile.toLowerCase()} skin, this pairing ships fresh within 24 hours to ${customer.city}.\n\nBest,\nVedaGlow Botanicals`;
      }
    } else {
      subject = `${firstName}, pick up where you left off (${totalInr})`;
      if (channel === 'WhatsApp') {
        body = `Hi ${firstName}, quick reminder from VedaGlow Botanicals—your ${primaryItem}${extraCount} (${totalInr}) is reserved in your bag. Tap your saved link to finish checkout in under 30 seconds.`;
      } else {
        body = `Hi ${firstName},\n\nLooks like you stepped away before completing your order for ${itemNames.join(' and ')} (${totalInr}).\n\nWe have kept everything in your bag for ${customer.city} delivery. Priority score note: ${scoreBreakdown.level} recovery readiness.\n\nResume checkout whenever it is convenient.\n\nWarm regards,\nVedaGlow Botanicals`;
      }
    }

    return {
      subject,
      body,
      provider: 'deterministic-template' as const,
    };
  },
};

export interface DashboardMetricsSummary {
  totalCustomers: number;
  activeAbandonedCartsCount: number;
  recoveredCartsCount: number;
  totalCartsCount: number;
  potentialRecoveryValueInr: number;
  recoveredValueInr: number;
  highPriorityCustomersCount: number;
  awaitingApprovalCount: number;
  recoveryRatePct: number;
}

export function computeDashboardMetrics(
  customers: Customer[],
  carts: AbandonedCart[]
): DashboardMetricsSummary {
  const activeCarts = carts.filter((c) => c.recoveryStatus !== 'Recovered');
  const recoveredCarts = carts.filter((c) => c.recoveryStatus === 'Recovered');

  const potentialRecoveryValueInr = activeCarts.reduce(
    (sum, cart) => sum + getCartTotalInr(cart.items),
    0
  );

  const recoveredValueInr = recoveredCarts.reduce(
    (sum, cart) => sum + getCartTotalInr(cart.items),
    0
  );

  const cartByCustomerId = new Map<string, AbandonedCart>();
  carts.forEach((c) => cartByCustomerId.set(c.customerId, c));

  const highPriorityCustomersCount = customers.filter((customer) => {
    const cart = cartByCustomerId.get(customer.id);
    const val = cart ? getCartTotalInr(cart.items) : getCartTotalInr(customer.cartItems);
    const hours = cart ? cart.abandonedHoursAgo : customer.abandonedHoursAgo;
    if (cart?.recoveryStatus === 'Recovered' || customer.purchaseStatus === 'Converted') {
      return false;
    }
    return calculatePriorityScore(customer, val, hours).level === 'High';
  }).length;

  const awaitingApprovalCount = carts.filter(
    (c) => c.recoveryStatus === 'Awaiting approval'
  ).length;

  const recoveryRatePct =
    carts.length > 0 ? Math.round((recoveredCarts.length / carts.length) * 100) : 0;

  return {
    totalCustomers: customers.length,
    activeAbandonedCartsCount: activeCarts.length,
    recoveredCartsCount: recoveredCarts.length,
    totalCartsCount: carts.length,
    potentialRecoveryValueInr,
    recoveredValueInr,
    highPriorityCustomersCount,
    awaitingApprovalCount,
    recoveryRatePct,
  };
}

export function computeRecoveryStatusDistribution(carts: AbandonedCart[]) {
  return RECOVERY_STATUS_ORDER.map((status) => {
    const matching = carts.filter((c) => c.recoveryStatus === status);
    const valueInr = matching.reduce((sum, c) => sum + getCartTotalInr(c.items), 0);
    return {
      status,
      count: matching.length,
      valueInr,
      percentage: carts.length > 0 ? Math.round((matching.length / carts.length) * 100) : 0,
    };
  });
}

export function computeIntentDistribution(customers: Customer[], carts: AbandonedCart[]) {
  const intents: PurchaseIntent[] = ['High', 'Medium', 'Low'];
  const cartByCustomer = new Map(carts.map((c) => [c.customerId, c]));

  return intents.map((intent) => {
    const matching = customers.filter((c) => c.intent === intent);
    const totalValueInr = matching.reduce((sum, cust) => {
      const cart = cartByCustomer.get(cust.id);
      return sum + (cart ? getCartTotalInr(cart.items) : getCartTotalInr(cust.cartItems));
    }, 0);
    return {
      intent,
      count: matching.length,
      totalValueInr,
      avgValueInr: matching.length > 0 ? Math.round(totalValueInr / matching.length) : 0,
      percentage: customers.length > 0 ? Math.round((matching.length / customers.length) * 100) : 0,
    };
  });
}

export interface PersistedCartPilotState {
  customers: Customer[];
  carts: AbandonedCart[];
  readNotificationIds: string[];
}

export function loadPersistedState(): PersistedCartPilotState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        customers: INITIAL_CUSTOMERS,
        carts: INITIAL_ABANDONED_CARTS,
        readNotificationIds: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedCartPilotState>;
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.carts)) {
      throw new Error('Invalid persisted shape');
    }
    return {
      customers: parsed.customers,
      carts: parsed.carts,
      readNotificationIds: Array.isArray(parsed.readNotificationIds)
        ? parsed.readNotificationIds
        : [],
    };
  } catch {
    return {
      customers: INITIAL_CUSTOMERS,
      carts: INITIAL_ABANDONED_CARTS,
      readNotificationIds: [],
    };
  }
}

export function savePersistedState(state: PersistedCartPilotState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetPersistedState(): PersistedCartPilotState {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return {
    customers: INITIAL_CUSTOMERS,
    carts: INITIAL_ABANDONED_CARTS,
    readNotificationIds: [],
  };
}
