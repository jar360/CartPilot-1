import React, { useMemo } from 'react';
import {
  AbandonedCart,
  Customer,
  DailyActivityMetric,
} from '../../types/cartpilot';
import {
  computeDashboardMetrics,
  computeIntentDistribution,
  computeRecoveryStatusDistribution,
  formatInr,
} from '../../services/recoveryService';
import { calculatePriorityScore, getCartTotalInr } from '../../services/scoringEngine';
import {
  AbandonedCartTrendChart,
  CustomerActivityChart,
  IntentDistributionChart,
  RecoveryStatusChart,
} from '../charts/Charts';

interface AnalyticsViewProps {
  customers: Customer[];
  carts: AbandonedCart[];
  activitySeries: DailyActivityMetric[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  customers,
  carts,
  activitySeries,
}) => {
  const metrics = computeDashboardMetrics(customers, carts);
  const statusDistribution = computeRecoveryStatusDistribution(carts);
  const intentDistribution = computeIntentDistribution(customers, carts);

  const avgCartValueInr = useMemo(() => {
    if (!carts.length) return 0;
    const total = carts.reduce((sum, c) => sum + getCartTotalInr(c.items), 0);
    return Math.round(total / carts.length);
  }, [carts]);

  const avgPriorityScore = useMemo(() => {
    if (!customers.length) return 0;
    const cartMap = new Map(carts.map((c) => [c.customerId, c]));
    const sum = customers.reduce((acc, cust) => {
      const cart = cartMap.get(cust.id);
      const val = cart ? getCartTotalInr(cart.items) : getCartTotalInr(cust.cartItems);
      const hrs = cart ? cart.abandonedHoursAgo : cust.abandonedHoursAgo;
      return acc + calculatePriorityScore(cust, val, hrs).score;
    }, 0);
    return Math.round(sum / customers.length);
  }, [customers, carts]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, { valueInr: number; units: number }>();
    carts.forEach((cart) => {
      cart.items.forEach((item) => {
        const prev = totals.get(item.category) ?? { valueInr: 0, units: 0 };
        totals.set(item.category, {
          valueInr: prev.valueInr + item.unitPriceInr * item.quantity,
          units: prev.units + item.quantity,
        });
      });
    });
    const list = Array.from(totals.entries())
      .map(([category, info]) => ({ category, ...info }))
      .sort((a, b) => b.valueInr - a.valueInr);
    const maxVal = Math.max(...list.map((l) => l.valueInr), 1);
    return list.map((item) => ({
      ...item,
      widthPct: Math.round((item.valueInr / maxVal) * 100),
    }));
  }, [carts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
          Analytics & Revenue Attribution
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Storefront engagement, abandoned basket value by category, recovery funnel, and customer intent distribution.
        </p>
      </div>

      {/* Derived Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Average Abandoned Basket</p>
          <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatInr(avgCartValueInr)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Current Recovery Rate</p>
          <p className="font-mono text-xl font-semibold text-emerald-700 tabular-nums mt-1.5">
            {metrics.recoveryRatePct}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovered Cart Value</p>
          <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatInr(metrics.recoveredValueInr)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Mean Priority Score</p>
          <p className="font-mono text-xl font-semibold text-indigo-700 tabular-nums mt-1.5">
            {avgPriorityScore}/100
          </p>
        </div>
      </div>

      {/* Row 1: Abandoned Cart Value & Customer Engagement */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Abandoned Cart Value vs. Recovered Revenue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              7-day storefront checkout drop-off and recovery performance in INR
            </p>
          </div>
          <AbandonedCartTrendChart data={activitySeries} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Engagement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active storefront shoppers compared with checkout starts
            </p>
          </div>
          <CustomerActivityChart data={activitySeries} />
        </div>
      </div>

      {/* Row 2: Recovery Status Distribution & Customer Intent Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recovery Status Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live cart count and INR value across every recovery stage
            </p>
          </div>
          <RecoveryStatusChart items={statusDistribution} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Intent Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Segment share and average basket size across purchase intent tiers
            </p>
          </div>
          <IntentDistributionChart items={intentDistribution} />
        </div>
      </div>

      {/* Row 3: Skincare Category Value Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Abandoned Cart Value by Skincare Category
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Derived directly from active and recovered cart SKUs across VedaGlow Botanicals
          </p>
        </div>

        <div className="space-y-3">
          {categoryBreakdown.map((row) => (
            <div key={row.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">
                  {row.category}{' '}
                  <span className="text-slate-400 font-normal">
                    ({row.units} {row.units === 1 ? 'unit' : 'units'})
                  </span>
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatInr(row.valueInr)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${row.widthPct}%` }}
                  className="h-full bg-indigo-600 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
