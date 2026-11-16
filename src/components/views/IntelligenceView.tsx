import React, { useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  PriorityLevel,
  PurchaseIntent,
} from '../../types/cartpilot';
import {
  PRIORITY_THRESHOLDS,
  calculatePriorityScore,
  formatAbandonmentDuration,
  getCartTotalInr,
} from '../../services/scoringEngine';
import { formatInr } from '../../services/recoveryService';
import {
  EmptyStateBlock,
  IntentLabel,
  PriorityClassificationLabel,
} from '../ui/StatusIndicators';

interface IntelligenceViewProps {
  customers: Customer[];
  carts: AbandonedCart[];
  onSelectCustomer: (customerId: string) => void;
  onSelectCart: (cartId: string) => void;
}

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({
  customers,
  carts,
  onSelectCustomer,
  onSelectCart,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'All'>('All');
  const [intentFilter, setIntentFilter] = useState<PurchaseIntent | 'All'>('All');

  const cartByCustomer = useMemo(
    () => new Map(carts.map((c) => [c.customerId, c])),
    [carts]
  );

  const analyzedRows = useMemo(() => {
    return customers
      .map((customer) => {
        const cart = cartByCustomer.get(customer.id);
        const cartValueInr = cart
          ? getCartTotalInr(cart.items)
          : getCartTotalInr(customer.cartItems);
        const abandonedHours = cart ? cart.abandonedHoursAgo : customer.abandonedHoursAgo;
        const breakdown = calculatePriorityScore(
          customer,
          cartValueInr,
          abandonedHours,
          cart?.recoveryStatus
        );
        return {
          customer,
          cart,
          cartValueInr,
          abandonedHours,
          breakdown,
        };
      })
      .filter((row) => {
        if (priorityFilter !== 'All' && row.breakdown.level !== priorityFilter) {
          return false;
        }
        if (intentFilter !== 'All' && row.customer.intent !== intentFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.breakdown.score - a.breakdown.score);
  }, [customers, cartByCustomer, priorityFilter, intentFilter]);

  const counts = useMemo(() => {
    const all = customers.map((customer) => {
      const cart = cartByCustomer.get(customer.id);
      const val = cart ? getCartTotalInr(cart.items) : getCartTotalInr(customer.cartItems);
      const hrs = cart ? cart.abandonedHoursAgo : customer.abandonedHoursAgo;
      return calculatePriorityScore(customer, val, hrs, cart?.recoveryStatus).level;
    });
    return {
      High: all.filter((l) => l === 'High').length,
      Medium: all.filter((l) => l === 'Medium').length,
      Low: all.filter((l) => l === 'Low').length,
    };
  }, [customers, cartByCustomer]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Customer Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Purchase intent evaluation, deterministic priority scoring, and recommended recovery actions.
          </p>
        </div>
      </div>

      {/* Deterministic Scoring Methodology Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-600 space-y-0.5">
            <p className="font-semibold text-slate-900">
              Deterministic Rule-Based Priority Model (0–100)
            </p>
            <p>
              Scores are computed transparently from <strong className="text-slate-800">Cart Value (0–35 pts)</strong>,{' '}
              <strong className="text-slate-800">Purchase Intent & Funnel Depth (0–40 pts)</strong>, and{' '}
              <strong className="text-slate-800">Abandonment Window Recency (0–25 pts)</strong>. Resolved/recovered records score 0/100 so active carts stay prioritised. These are rule-based demo scores, not live AI predictions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs tabular-nums shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <span>High <strong className="font-mono text-indigo-700">≥{PRIORITY_THRESHOLDS.HIGH}</strong></span>
          <span>Medium <strong className="font-mono text-amber-700">{PRIORITY_THRESHOLDS.MEDIUM}–{PRIORITY_THRESHOLDS.HIGH - 1}</strong></span>
          <span>Low <strong className="font-mono text-slate-600">&lt;{PRIORITY_THRESHOLDS.MEDIUM}</strong></span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'High', 'Medium', 'Low'] as const).map((level) => {
            const count =
              level === 'All' ? customers.length : counts[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => setPriorityFilter(level)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  priorityFilter === level
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {level === 'All' ? 'All Priorities' : `${level} Priority`}{' '}
                <span className="font-mono text-slate-400 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value as PurchaseIntent | 'All')}
          aria-label="Filter by customer purchase intent"
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Purchase Intents</option>
          <option value="High">High Intent</option>
          <option value="Medium">Medium Intent</option>
          <option value="Low">Low Intent</option>
        </select>
      </div>

      {/* Intelligence List */}
      {analyzedRows.length === 0 ? (
        <EmptyStateBlock
          title="No customers match these intelligence filters"
          description="Adjust your priority tier or purchase intent filter to inspect customer scoring breakdowns."
          actionLabel="Show All Customers"
          onAction={() => {
            setPriorityFilter('All');
            setIntentFilter('All');
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          {analyzedRows.map(({ customer, cart, cartValueInr, abandonedHours, breakdown }) => (
            <div
              key={customer.id}
              className="p-5 hover:bg-slate-50/60 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {/* Customer & Metrics Column */}
              <div className="lg:col-span-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600 text-left"
                  >
                    {customer.name}
                  </button>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {customer.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <IntentLabel intent={customer.intent} />
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700 font-medium">
                    {cartValueInr > 0 ? formatInr(cartValueInr) : '₹0'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatAbandonmentDuration(abandonedHours)}</span>
                </div>

                {/* Score Bar */}
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <PriorityClassificationLabel
                      level={breakdown.level}
                      score={breakdown.score}
                    />
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      V:{breakdown.components.cartValuePts} · I:{breakdown.components.intentPts} · R:{breakdown.components.recencyPts}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${breakdown.components.cartValuePts}%` }}
                      className="bg-indigo-600 h-full"
                    />
                    <div
                      style={{ width: `${breakdown.components.intentPts}%` }}
                      className="bg-violet-500 h-full"
                    />
                    <div
                      style={{ width: `${breakdown.components.recencyPts}%` }}
                      className="bg-emerald-500 h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Scoring Reasons Column */}
              <div className="lg:col-span-5 space-y-1.5">
                <p className="text-xs font-medium text-slate-700">
                  Reasons behind priority score
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {breakdown.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Action Column */}
              <div className="lg:col-span-3 flex flex-col justify-between gap-3 lg:items-end lg:text-right">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Recommended Next Action
                  </p>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed">
                    {breakdown.recommendedAction}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Profile
                  </button>
                  {cart && (
                    <button
                      type="button"
                      onClick={() => onSelectCart(cart.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {cart.recoveryStatus === 'Recovered' ? 'View Cart' : 'Recover Cart'}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
