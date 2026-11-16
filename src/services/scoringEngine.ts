import {
  Customer,
  PriorityLevel,
  PriorityScoreBreakdown,
  PurchaseIntent,
  RecoveryStatus,
} from '../types/cartpilot';

export const PRIORITY_THRESHOLDS = {
  HIGH: 72,
  MEDIUM: 46,
} as const;

export const SCORE_COMPONENT_MAX = {
  CART_VALUE: 35,
  INTENT_AND_DEPTH: 40,
  RECENCY: 25,
} as const;

export function getCartTotalInr(items: { unitPriceInr: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
}

export function formatAbandonmentDuration(hours: number | null): string {
  if (hours === null) {
    return 'No active abandonment';
  }
  const safeHours = Math.max(0, hours);
  if (safeHours < 1) {
    const mins = Math.max(15, Math.round(safeHours * 60));
    return `${mins} mins ago`;
  }
  if (safeHours < 24) {
    const rounded = Math.round(safeHours);
    return `${rounded} ${rounded === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(safeHours / 24);
  const remHours = Math.round(safeHours % 24);
  if (remHours === 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  return `${days}d ${remHours}h ago`;
}

/**
 * Deterministic rule-based priority scoring engine (0–100).
 * Combines Cart Value (0–35 pts), Purchase Intent & Funnel Depth (0–40 pts),
 * and Abandonment Window Recency (0–25 pts).
 *
 * Resolved records (Recovered carts or Converted orders with no active cart)
 * are assigned 0/100 ('Low' active recovery priority) so they are never queued
 * ahead of open abandonment opportunities.
 */
export function calculatePriorityScore(
  customer: Customer,
  overrideCartValueInr?: number,
  overrideAbandonedHours?: number | null,
  recoveryStatus?: RecoveryStatus
): PriorityScoreBreakdown {
  const cartValue = Math.max(
    0,
    overrideCartValueInr !== undefined
      ? overrideCartValueInr
      : getCartTotalInr(customer.cartItems)
  );

  const abandonedHours =
    overrideAbandonedHours !== undefined
      ? overrideAbandonedHours
      : customer.abandonedHoursAgo;

  const isRecovered =
    recoveryStatus === 'Recovered' ||
    (!recoveryStatus && customer.purchaseStatus === 'Recovered');
  const isConverted = customer.purchaseStatus === 'Converted' && cartValue === 0;

  if (isRecovered || isConverted || cartValue === 0) {
    const reasonText = isRecovered
      ? `Cart already recovered (₹${cartValue.toLocaleString('en-IN')}) — no active recovery outreach required.`
      : isConverted
      ? 'Customer completed direct checkout — no abandoned cart open.'
      : 'No active cart value on record (₹0).';

    return {
      score: 0,
      level: 'Low',
      components: {
        cartValuePts: 0,
        intentPts: 0,
        recencyPts: 0,
      },
      reasons: [
        reasonText,
        `Historical profile: ${customer.intent} intent · ${customer.previousOrders} prior ${
          customer.previousOrders === 1 ? 'order' : 'orders'
        }.`,
      ],
      recommendedAction: 'Send post-purchase skincare regimen guide',
    };
  }

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
  } else {
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
  intentPts = Math.min(SCORE_COMPONENT_MAX.INTENT_AND_DEPTH, intentPts);

  // 3. Abandonment Window Recency Component (0 - 25 points)
  let recencyPts = 0;
  if (abandonedHours === null) {
    recencyPts = 10;
  } else {
    const safeHours = Math.max(0, abandonedHours);
    if (safeHours <= 4) {
      recencyPts = 25;
    } else if (safeHours <= 12) {
      recencyPts = 21;
    } else if (safeHours <= 24) {
      recencyPts = 16;
    } else if (safeHours <= 48) {
      recencyPts = 11;
    } else {
      recencyPts = 6;
    }
  }

  const score = Math.max(0, Math.min(100, cartValuePts + intentPts + recencyPts));

  let level: PriorityLevel = 'Low';
  if (score >= PRIORITY_THRESHOLDS.HIGH) {
    level = 'High';
  } else if (score >= PRIORITY_THRESHOLDS.MEDIUM) {
    level = 'Medium';
  }

  // Construct transparent explanations matching exact component thresholds
  const reasons: string[] = [];

  if (cartValue >= 4500) {
    reasons.push(
      `Top-tier basket value (₹${cartValue.toLocaleString('en-IN')}, ≥ ₹4,500) contributes ${cartValuePts}/35 pts.`
    );
  } else if (cartValue >= 3000) {
    reasons.push(
      `High basket value (₹${cartValue.toLocaleString('en-IN')}, ₹3,000–₹4,499 tier) contributes ${cartValuePts}/35 pts.`
    );
  } else if (cartValue >= 2000) {
    reasons.push(
      `Mid-high basket value (₹${cartValue.toLocaleString('en-IN')}, ₹2,000–₹2,999 tier) contributes ${cartValuePts}/35 pts.`
    );
  } else if (cartValue >= 1200) {
    reasons.push(
      `Standard basket value (₹${cartValue.toLocaleString('en-IN')}, ₹1,200–₹1,999 tier) contributes ${cartValuePts}/35 pts.`
    );
  } else {
    reasons.push(
      `Entry basket value (₹${cartValue.toLocaleString('en-IN')}, < ₹1,200 tier) contributes ${cartValuePts}/35 pts.`
    );
  }

  const stepDetail =
    customer.checkoutStepReached === 'Payment Page'
      ? 'dropped at Payment Page (+8)'
      : customer.checkoutStepReached === 'Shipping Details'
      ? 'entered Shipping Details (+5)'
      : customer.checkoutStepReached === 'Cart Review'
      ? 'reached Cart Review (+2)'
      : 'browsed Product Page (+0)';
  const repeatDetail =
    customer.previousOrders >= 1
      ? ` and repeat buyer (${customer.previousOrders} prior ${
          customer.previousOrders === 1 ? 'order' : 'orders'
        }, +4)`
      : '';
  reasons.push(
    `${customer.intent} purchase intent, ${stepDetail}${repeatDetail} contributes ${intentPts}/40 pts.`
  );

  if (abandonedHours === null) {
    reasons.push(`No timestamped abandonment window recorded (${recencyPts}/25 pts).`);
  } else {
    const safeHours = Math.max(0, abandonedHours);
    if (safeHours <= 4) {
      reasons.push(
        `Abandoned ${formatAbandonmentDuration(safeHours)} (≤ 4h peak window) contributes ${recencyPts}/25 pts.`
      );
    } else if (safeHours <= 12) {
      reasons.push(
        `Abandoned ${formatAbandonmentDuration(safeHours)} (≤ 12h optimal window) contributes ${recencyPts}/25 pts.`
      );
    } else if (safeHours <= 24) {
      reasons.push(
        `Abandoned ${formatAbandonmentDuration(safeHours)} (≤ 24h follow-up window) contributes ${recencyPts}/25 pts.`
      );
    } else if (safeHours <= 48) {
      reasons.push(
        `Abandoned ${formatAbandonmentDuration(safeHours)} (24–48h decay window) contributes ${recencyPts}/25 pts.`
      );
    } else {
      reasons.push(
        `Abandoned ${formatAbandonmentDuration(safeHours)} (> 48h aged window) contributes ${recencyPts}/25 pts.`
      );
    }
  }

  // Recommended next action
  let recommendedAction = 'Queue low-touch educational email digest';
  if (level === 'High' && customer.checkoutStepReached === 'Payment Page') {
    recommendedAction = 'Send instant checkout-resume link via WhatsApp with free express shipping';
  } else if (level === 'High') {
    recommendedAction = 'Draft personalised concierge follow-up highlighting key active ingredients';
  } else if (level === 'Medium' && (abandonedHours ?? 0) > 24) {
    recommendedAction = 'Offer 10% welcome/return incentive via Email';
  } else if (level === 'Medium') {
    recommendedAction = 'Send gentle cart reminder with regimen pairing advice';
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
