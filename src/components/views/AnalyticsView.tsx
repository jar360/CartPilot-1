import React, { useMemo } from 'react';
import {
  AbandonedCart,
  Customer,
  DailyActivityMetric,
} from '../../types/cartpilot';
import {
  buildLiveActivitySeries,
  computeDashboardMetrics,
  computeIntentDistribution,
  computeRecoveryStatusDistribution,
  formatInr,
} from '../../services/recoveryService';
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
  const liveActivitySeries = buildLiveActivitySeries(activitySeries, metrics);
  const statusDistribution = computeRecoveryStatusDistribution(carts);
  const intentDistribution = computeIntentDistribution(customers, carts);

  const activeCategoryBreakdown = useMemo(() => {
    const totals = new Map<string, { valueInr: number; units: number }>();
    carts
      .filter((cart) => cart.recoveryStatus !== 'Recovered')
      .forEach((cart) => {
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
          Storefront engagement, active abandoned value by category, recovery funnel, and customer intent distribution.
        </p>
      </div>

      {/* Derived Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Average Active Abandoned Basket</p>
          <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatInr(metrics.avgActiveAbandonedValueInr)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            Across {metrics.activeAbandonedCartsCount} active carts ({formatInr(metrics.potentialRecoveryValueInr)} total)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovery Rate</p>
          <p className="font-mono text-xl font-semibold text-emerald-700 tabular-nums mt-1.5">
            {metrics.recoveryRatePct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {metrics.recoveredCartsCount} recovered of {metrics.totalCartsCount} tracked carts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovered Cart Revenue</p>
          <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatInr(metrics.recoveredValueInr)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            Total tracked pool: {formatInr(metrics.totalTrackedCartValueInr)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Mean Active Priority Score</p>
          <p className="font-mono text-xl font-semibold text-indigo-700 tabular-nums mt-1.5">
            {metrics.meanActivePriorityScore}/100
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {metrics.highPriorityCustomersCount} high-priority active customers
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
              6-day simulated baseline + live today snapshot in INR
            </p>
          </div>
          <AbandonedCartTrendChart data={liveActivitySeries} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Engagement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active storefront shoppers compared with checkout starts (simulated 7-day baseline)
            </p>
          </div>
          <CustomerActivityChart data={liveActivitySeries} />
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
              All {metrics.totalCartsCount} tracked carts ({metrics.activeAbandonedCartsCount} active + {metrics.recoveredCartsCount} recovered)
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
              Segment share and average basket size across all {customers.length} customers
            </p>
          </div>
          <IntentDistributionChart items={intentDistribution} />
        </div>
      </div>

      {/* Row 3: Active Skincare Category Value Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Active Abandoned Value by Skincare Category
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Breakdown of {formatInr(metrics.potentialRecoveryValueInr)} potential recovery value across {metrics.activeAbandonedCartsCount} active carts
          </p>
        </div>

        {activeCategoryBreakdown.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            No active abandoned items remaining—all tracked carts are recovered.
          </p>
        ) : (
          <div className="space-y-3">
            {activeCategoryBreakdown.map((row) => (
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
        )}
      </div>
    </div>
  );
};
