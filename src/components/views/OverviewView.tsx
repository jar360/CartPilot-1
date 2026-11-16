import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  IndianRupee,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  DailyActivityMetric,
  NavSection,
} from '../../types/cartpilot';
import {
  buildLiveActivitySeries,
  computeDashboardMetrics,
  computeRecoveryStatusDistribution,
  formatInr,
} from '../../services/recoveryService';
import {
  PRIORITY_THRESHOLDS,
  calculatePriorityScore,
  formatAbandonmentDuration,
  getCartTotalInr,
} from '../../services/scoringEngine';
import {
  AbandonedCartTrendChart,
  CustomerActivityChart,
  RecoveryStatusChart,
} from '../charts/Charts';
import {
  PriorityClassificationLabel,
  StatusLabel,
} from '../ui/StatusIndicators';

interface OverviewViewProps {
  customers: Customer[];
  carts: AbandonedCart[];
  activitySeries: DailyActivityMetric[];
  onNavigate: (section: NavSection) => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectCart: (cartId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  customers,
  carts,
  activitySeries,
  onNavigate,
  onSelectCustomer,
  onSelectCart,
}) => {
  const metrics = computeDashboardMetrics(customers, carts);
  const liveActivitySeries = buildLiveActivitySeries(activitySeries, metrics);
  const statusDistribution = computeRecoveryStatusDistribution(carts);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const highPriorityOpportunities = carts
    .filter((cart) => cart.recoveryStatus !== 'Recovered')
    .map((cart) => {
      const customer = customerMap.get(cart.customerId);
      if (!customer) return null;
      const valueInr = getCartTotalInr(cart.items);
      const score = calculatePriorityScore(
        customer,
        valueInr,
        cart.abandonedHoursAgo,
        cart.recoveryStatus
      );
      return { cart, customer, valueInr, score };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 5);

  const recentInteractions = customers
    .flatMap((customer) =>
      customer.interactions.map((interaction) => ({
        ...interaction,
        customerId: customer.id,
        customerName: customer.name,
      }))
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Store Recovery Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Live storefront checkout signals, priority recovery queue, and INR revenue pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('intelligence')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Inspect Priority Scores
          </button>
          <button
            type="button"
            onClick={() => onNavigate('recovery')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
          >
            Review Recovery Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('customers')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Customers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {metrics.totalCustomers}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Tracked D2C skincare shoppers
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('recovery')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Abandoned Carts</span>
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {metrics.activeAbandonedCartsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
            {metrics.totalCartsCount} total tracked ({metrics.recoveredCartsCount} recovered · {metrics.awaitingApprovalCount} awaiting approval)
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('recovery')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Potential Recovery Value</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {formatInr(metrics.potentialRecoveryValueInr)}
          </p>
          <p className="text-xs text-emerald-700 mt-1.5 tabular-nums">
            {formatInr(metrics.recoveredValueInr)} already recovered
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('intelligence')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">High-Priority Customers</span>
            <Flame className="w-4 h-4 text-violet-600" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {metrics.highPriorityCustomersCount}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Active score ≥ {PRIORITY_THRESHOLDS.HIGH}/100
          </p>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Customer Activity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily active shoppers vs. checkout initiations (simulated 7-day baseline)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Analytics
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <CustomerActivityChart data={liveActivitySeries} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Abandoned Cart Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                6-day baseline + live today snapshot in INR
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
              {metrics.recoveryRatePct}% rate
            </span>
          </div>
          <AbandonedCartTrendChart data={liveActivitySeries} />
        </div>
      </div>

      {/* Bottom Grid: High-Priority Opportunities + Status Overview + Recent Interactions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* High-Priority Opportunities */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                High-Priority Recovery Opportunities
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top active carts ranked by deterministic recovery score
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('recovery')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              View all carts
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Customer</th>
                  <th className="py-2.5 px-4 font-medium">Priority</th>
                  <th className="py-2.5 px-4 font-medium text-right">Cart Value</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highPriorityOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                      All active abandoned carts have been recovered.
                    </td>
                  </tr>
                ) : (
                  highPriorityOpportunities.map(({ cart, customer, valueInr, score }) => (
                    <tr
                      key={cart.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(customer.id)}
                          className="font-medium text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {customer.name}
                        </button>
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {cart.id} · {formatAbandonmentDuration(cart.abandonedHoursAgo)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <PriorityClassificationLabel
                          level={score.level}
                          score={score.score}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatInr(valueInr)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={cart.recoveryStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCart(cart.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap"
                        >
                          Open Cart
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recovery Status Overview & Recent Interactions */}
        <div className="xl:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recovery Status Overview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All {metrics.totalCartsCount} tracked carts ({metrics.activeAbandonedCartsCount} active + {metrics.recoveredCartsCount} recovered)
                </p>
              </div>
            </div>
            <RecoveryStatusChart items={statusDistribution} />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Customer Interactions
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
              >
                All customers
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInteractions.map((item) => (
                <div key={item.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(item.customerId)}
                      className="font-medium text-slate-900 hover:text-indigo-600 truncate"
                    >
                      {item.customerName}
                    </button>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                      {item.channel}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 line-clamp-1">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
