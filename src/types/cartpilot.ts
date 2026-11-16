export type NavSection =
  | 'overview'
  | 'customers'
  | 'intelligence'
  | 'recovery'
  | 'analytics';

export type PurchaseStatus =
  | 'Abandoned'
  | 'At Checkout'
  | 'Recovered'
  | 'Converted';

export type PurchaseIntent = 'High' | 'Medium' | 'Low';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export type RecoveryStatus =
  | 'Pending'
  | 'Message generated'
  | 'Awaiting approval'
  | 'Approved'
  | 'Recovered';

export type MessageChannel = 'Email' | 'WhatsApp';

export type MessageTone =
  | 'Warm Reminder'
  | 'Gentle Incentive'
  | 'VIP Concierge';

export interface CartItem {
  sku: string;
  name: string;
  category: 'Serums' | 'Moisturizers' | 'Cleansers' | 'Sun Care' | 'Treatments';
  variant: string;
  unitPriceInr: number;
  quantity: number;
}

export interface CustomerInteraction {
  id: string;
  timestamp: string;
  channel: 'Web Store' | 'Email' | 'WhatsApp' | 'System Review';
  summary: string;
  outcome?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  event: string;
  detail: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  skinProfile: string;
  purchaseStatus: PurchaseStatus;
  intent: PurchaseIntent;
  lastActivityIso: string;
  lastActivityLabel: string;
  sessionsLast7Days: number;
  productViewsLast7Days: number;
  previousOrders: number;
  lifetimeValueInr: number;
  checkoutStepReached: 'Product Page' | 'Cart Review' | 'Shipping Details' | 'Payment Page' | 'Completed';
  cartItems: CartItem[];
  abandonedHoursAgo: number | null;
  interactions: CustomerInteraction[];
  activityTimeline: ActivityEvent[];
}

export interface AbandonedCart {
  id: string;
  customerId: string;
  items: CartItem[];
  abandonedHoursAgo: number;
  abandonedAtIso: string;
  recoveryStatus: RecoveryStatus;
  channel: MessageChannel;
  tone: MessageTone;
  generatedSubject?: string;
  generatedMessage?: string;
  lastActionNote?: string;
  updatedAtIso: string;
}

export interface PriorityScoreBreakdown {
  score: number;
  level: PriorityLevel;
  components: {
    cartValuePts: number;
    intentPts: number;
    recencyPts: number;
  };
  reasons: string[];
  recommendedAction: string;
}

export interface DailyActivityMetric {
  dateLabel: string;
  activeCustomers: number;
  checkoutStarts: number;
  abandonedValueInr: number;
  recoveredValueInr: number;
  emailOpenRatePct: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  targetSection: NavSection;
  targetId?: string;
  read: boolean;
}

/**
 * Contract for future Stage-2 server-side Gemini API integration (/api/recovery/generate).
 * Kept strictly isolated from UI components so real LLM generation replaces the deterministic
 * template generator without altering component interfaces.
 */
export interface RecoveryAIServiceContract {
  generatePersonalizedMessage(params: {
    customer: Customer;
    cart: AbandonedCart;
    scoreBreakdown: PriorityScoreBreakdown;
    channel: MessageChannel;
    tone: MessageTone;
  }): Promise<{ subject: string; body: string; provider: 'deterministic-template' | 'gemini-server' }>;
}
