import {
  Customer,
  PriorityLevel,
  PriorityScoreBreakdown,
  PurchaseIntent,
} from '../types/cartpilot';

export function getCartTotalInr(items: { unitPriceInr: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
}

export function formatAbandonmentDuration(hours: number | null): string {
  if (hours === null) {
    return 'No active abandonment';
  }
  if (hours < 1) {
    const mins = Math.max(15, Math.round(hours * 60));
    return `${mins} mins ago`;
  }
  if (hours < 24) {
    const rounded = Math.round(hours);
    return `${rounded} ${rounded === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  if (remHours === 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  return `${days}d ${remHours}h ago`;
}

/**
 * Deterministic rule-based priority scoring engine (0–100).
 * Combines Cart Value (0–35 pts), Purchase Intent & Funnel Depth (0–40 pts),
 * and Abandonment Window Recency (0–25 pts).
 */
export function calculatePriorityScore(
  customer: Customer,
  overrideCartValueInr?: number,
  overrideAbandonedHours?: number | null
): PriorityScoreBreakdown {
  const cartValue =
    overrideCartValueInr !== undefined
      ? overrideCartValueInr
      : getCartTotalInr(customer.cartItems);

  const abandonedHours =
    overrideAbandonedHours !== undefined
      ? overrideAbandonedHours
      : customer.abandonedHoursAgo;

  // 1. Cart Value Component (0 - 35 points)
  let cartValuePts = 0;
  if (cartValue >= 4500) {
    cartValuePts = 35;
  } else if (cartValue >= 3000) {
    cartValuePts = 29;
  } else if (cartValue >= 2000) {
    cartValuePts = 22;
  } else if (cartValue >= 1200) {
    cartValuePts = 15;
  } else if (cartValue > 0) {
    cartValuePts = 9;
  }

  // 2. Purchase Intent & Behavioral Depth Component (0 - 40 points)
  const baseIntentMap: Record<PurchaseIntent, number> = {
    High: 28,
    Medium: 18,
    Low: 8,
  };
  let intentPts = baseIntentMap[customer.intent];

  if (customer.checkoutStepReached === 'Payment Page') {
    intentPts += 8;
  } else if (customer.checkoutStepReached === 'Shipping Details') {
    intentPts += 5;
  } else if (customer.checkoutStepReached === 'Cart Review') {
    intentPts += 2;
  }

  if (customer.previousOrders >= 1) {
    intentPts += 4;
  }
  intentPts = Math.min(40, intentPts);

  // 3. Abandonment Window Recency Component (0 - 25 points)
  // Peak recovery responsiveness happens within 1–12 hours of abandonment.
  let recencyPts = 0;
  if (abandonedHours === null) {
    recencyPts = customer.purchaseStatus === 'Converted' ? 6 : 10;
  } else if (abandonedHours <= 4) {
    recencyPts = 25;
  } else if (abandonedHours <= 12) {
    recencyPts = 21;
  } else if (abandonedHours <= 24) {
    recencyPts = 16;
  } else if (abandonedHours <= 48) {
    recencyPts = 11;
  } else {
    recencyPts = 6;
  }

  const rawScore = cartValuePts + intentPts + recencyPts;
  const score = Math.max(0, Math.min(100, rawScore));

  let level: PriorityLevel = 'Low';
  if (score >= 72) {
    level = 'High';
  } else if (score >= 46) {
    level = 'Medium';
  }

  // Construct transparent, human-readable scoring reasons
  const reasons: string[] = [];

  if (cartValue >= 3000) {
    reasons.push(`High basket value (₹${cartValue.toLocaleString('en-IN')}) qualifies for top revenue impact.`);
  } else if (cartValue >= 1500) {
    reasons.push(`Moderate basket value (₹${cartValue.toLocaleString('en-IN')}) above typical single-SKU order.`);
  } else if (cartValue > 0) {
    reasons.push(`Entry basket value (₹${cartValue.toLocaleString('en-IN')}) carries lower margin headroom.`);
  } else {
    reasons.push('No active unrecovered basket currently open.');
  }

  if (customer.checkoutStepReached === 'Payment Page') {
    reasons.push('Dropped at Payment Page after completing shipping details.');
  } else if (customer.checkoutStepReached === 'Shipping Details') {
    reasons.push('Entered delivery address before leaving checkout.');
  } else if (customer.intent === 'High') {
    reasons.push(`${customer.sessionsLast7Days} storefront sessions and ${customer.productViewsLast7Days} product views this week.`);
  } else if (customer.intent === 'Medium') {
    reasons.push(`Moderate engagement (${customer.sessionsLast7Days} sessions in 7 days) without payment initiation.`);
  } else {
    reasons.push('Early browsing behaviour with limited checkout commitment.');
  }

  if (abandonedHours !== null) {
    if (abandonedHours <= 12) {
      reasons.push(`Abandoned ${formatAbandonmentDuration(abandonedHours)} — still inside the optimal 12-hour recall window.`);
    } else if (abandonedHours <= 36) {
      reasons.push(`Abandoned ${formatAbandonmentDuration(abandonedHours)} — requires timely reminder before intent decays.`);
    } else {
      reasons.push(`Abandoned ${formatAbandonmentDuration(abandonedHours)} — older cart may need an incentive or routine tip.`);
    }
  }

  if (customer.previousOrders > 0) {
    reasons.push(`Repeat buyer (${customer.previousOrders} prior ${customer.previousOrders === 1 ? 'order' : 'orders'}) with established brand trust.`);
  }

  // Recommended next action
  let recommendedAction = 'Monitor passive storefront activity';
  if (customer.purchaseStatus === 'Converted' || customer.purchaseStatus === 'Recovered') {
    recommendedAction = 'Send post-purchase skincare regimen guide';
  } else if (level === 'High' && customer.checkoutStepReached === 'Payment Page') {
    recommendedAction = 'Send instant checkout-resume link via WhatsApp with free express shipping';
  } else if (level === 'High') {
    recommendedAction = 'Draft personalised concierge follow-up highlighting key active ingredients';
  } else if (level === 'Medium' && (abandonedHours ?? 0) > 24) {
    recommendedAction = 'Offer 10% welcome/return incentive via Email';
  } else if (level === 'Medium') {
    recommendedAction = 'Send gentle cart reminder with regimen pairing advice';
  } else {
    recommendedAction = 'Queue low-touch educational email digest';
  }

  return {
    score,
    level,
    components: {
      cartValuePts,
      intentPts,
      recencyPts,
    },
    reasons,
    recommendedAction,
  };
}
