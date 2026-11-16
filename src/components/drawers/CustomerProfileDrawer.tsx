import React from 'react';
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  X,
} from 'lucide-react';
import { AbandonedCart, Customer } from '../../types/cartpilot';
import {
  calculatePriorityScore,
  formatAbandonmentDuration,
  getCartTotalInr,
} from '../../services/scoringEngine';
import { formatInr } from '../../services/recoveryService';
import {
  IntentLabel,
  PriorityClassificationLabel,
  PurchaseStatusLabel,
  StatusLabel,
} from '../ui/StatusIndicators';

interface CustomerProfileDrawerProps {
  customer: Customer | null;
  cart: AbandonedCart | undefined;
  onClose: () => void;
  onOpenCart: (cartId: string) => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  customer,
  cart,
  onClose,
  onOpenCart,
}) => {
  if (!customer) return null;

  const items = cart ? cart.items : customer.cartItems;
  const cartValueInr = getCartTotalInr(items);
  const abandonedHours = cart ? cart.abandonedHoursAgo : customer.abandonedHoursAgo;
  const scoreBreakdown = calculatePriorityScore(customer, cartValueInr, abandonedHours);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-10 w-full max-w-xl bg-white h-full border-l border-slate-200 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{customer.id}</span>
              <span aria-hidden="true">·</span>
              <span>{customer.city}</span>
              <span aria-hidden="true">·</span>
              <span>{customer.skinProfile}</span>
            </div>
            <h2
              id="customer-drawer-title"
              className="text-lg font-semibold text-slate-900 mt-1 truncate"
            >
              {customer.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {customer.email}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close customer profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Current Cart</p>
              <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatInr(cartValueInr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Lifetime Spend</p>
              <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatInr(customer.lifetimeValueInr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Purchase Status</p>
              <div className="mt-1">
                <PurchaseStatusLabel status={customer.purchaseStatus} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Intent Signal</p>
              <div className="mt-1">
                <IntentLabel intent={customer.intent} />
              </div>
            </div>
          </div>

          {/* Priority Score Assessment */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Priority Assessment
                </h3>
                <p className="text-xs text-slate-500">
                  Deterministic scoring model (Cart Value + Intent + Recency)
                </p>
              </div>
              <PriorityClassificationLabel
                level={scoreBreakdown.level}
                score={scoreBreakdown.score}
              />
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${scoreBreakdown.components.cartValuePts}%` }}
                className="bg-indigo-600 h-full"
                title={`Cart Value: ${scoreBreakdown.components.cartValuePts}/35`}
              />
              <div
                style={{ width: `${scoreBreakdown.components.intentPts}%` }}
                className="bg-violet-500 h-full"
                title={`Intent & Funnel: ${scoreBreakdown.components.intentPts}/40`}
              />
              <div
                style={{ width: `${scoreBreakdown.components.recencyPts}%` }}
                className="bg-emerald-500 h-full"
                title={`Recency: ${scoreBreakdown.components.recencyPts}/25`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 tabular-nums">
              <span>Cart value: <strong className="font-mono text-slate-900">{scoreBreakdown.components.cartValuePts}/35</strong></span>
              <span>Intent & depth: <strong className="font-mono text-slate-900">{scoreBreakdown.components.intentPts}/40</strong></span>
              <span>Window recency: <strong className="font-mono text-slate-900">{scoreBreakdown.components.recencyPts}/25</strong></span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-600 pt-1">
              {scoreBreakdown.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
              <span className="font-medium text-slate-900">Recommended next action: </span>
              {scoreBreakdown.recommendedAction}
            </div>
          </section>

          {/* Cart Information */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cart Information
                </h3>
                <p className="text-xs text-slate-500">
                  {cart
                    ? `${cart.id} · Abandoned ${formatAbandonmentDuration(cart.abandonedHoursAgo)}`
                    : 'No active abandoned cart on record'}
                </p>
              </div>
              {cart && (
                <div className="flex items-center gap-3">
                  <StatusLabel status={cart.recoveryStatus} />
                  <button
                    type="button"
                    onClick={() => onOpenCart(cart.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Manage Recovery
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {items.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Product</th>
                      <th className="py-2.5 px-3 font-medium text-right">Qty</th>
                      <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.sku}>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.category} · {item.variant}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                          {formatInr(item.unitPriceInr * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 font-medium text-slate-700">
                        Total Basket Value
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatInr(cartValueInr)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg text-xs text-slate-500">
                <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Customer completed their recent order with no open items remaining.</span>
              </div>
            )}
          </section>

          {/* Storefront Activity Timeline */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {customer.sessionsLast7Days} sessions · {customer.productViewsLast7Days} product views (7d)
              </span>
            </div>
            <div className="space-y-3">
              {customer.activityTimeline.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{act.event}</p>
                      <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{act.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Previous Interactions */}
          <section className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Previous Interactions
            </h3>
            {customer.interactions.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {customer.interactions.map((interaction) => (
                  <div key={interaction.id} className="p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{interaction.channel}</span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {interaction.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{interaction.summary}</p>
                    {interaction.outcome && (
                      <p className="text-[11px] text-indigo-700 font-medium mt-1">
                        Outcome: {interaction.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No recorded interactions yet.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};
