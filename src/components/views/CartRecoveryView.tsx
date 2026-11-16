import React, { useMemo, useState } from 'react';
import { Check, RotateCcw, Search } from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  RecoveryStatus,
} from '../../types/cartpilot';
import {
  formatAbandonmentDuration,
  getCartTotalInr,
} from '../../services/scoringEngine';
import {
  RECOVERY_STATUS_ORDER,
  formatInr,
} from '../../services/recoveryService';
import { EmptyStateBlock, StatusLabel } from '../ui/StatusIndicators';

interface CartRecoveryViewProps {
  carts: AbandonedCart[];
  customers: Customer[];
  globalSearch: string;
  onClearGlobalSearch: () => void;
  onSelectCart: (cartId: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onQuickApprove: (cartId: string) => void;
  onQuickReject: (cartId: string) => void;
  onChangeStatus: (cartId: string, newStatus: RecoveryStatus) => void;
}

export const CartRecoveryView: React.FC<CartRecoveryViewProps> = ({
  carts,
  customers,
  globalSearch,
  onClearGlobalSearch,
  onSelectCart,
  onSelectCustomer,
  onQuickApprove,
  onQuickReject,
  onChangeStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<RecoveryStatus | 'All'>('All');
  const [localSearch, setLocalSearch] = useState('');

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const effectiveQuery = (localSearch || globalSearch).trim().toLowerCase();

  const statusCounts = useMemo(() => {
    const map: Record<RecoveryStatus, number> = {
      Pending: 0,
      'Message generated': 0,
      'Awaiting approval': 0,
      Approved: 0,
      Recovered: 0,
    };
    carts.forEach((c) => {
      map[c.recoveryStatus] += 1;
    });
    return map;
  }, [carts]);

  const filteredCarts = useMemo(() => {
    return carts
      .filter((cart) => {
        if (statusFilter !== 'All' && cart.recoveryStatus !== statusFilter) {
          return false;
        }
        if (effectiveQuery) {
          const customer = customerMap.get(cart.customerId);
          const itemText = cart.items.map((i) => i.name).join(' ');
          const hay = `${cart.id} ${customer?.name ?? ''} ${customer?.email ?? ''} ${itemText}`.toLowerCase();
          if (!hay.includes(effectiveQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.abandonedHoursAgo - b.abandonedHoursAgo);
  }, [carts, statusFilter, effectiveQuery, customerMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Cart Recovery Queue
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Inspect abandoned baskets, draft personalised recovery messages, and approve or reject actions.
          </p>
        </div>
        <p className="text-xs text-slate-500 whitespace-nowrap">
          Preview workflow · No live emails or SMS dispatched
        </p>
      </div>

      {/* Status Segmented Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Carts <span className="font-mono ml-1 opacity-75">{carts.length}</span>
          </button>
          {RECOVERY_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}{' '}
              <span className="font-mono ml-1 opacity-75">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter by cart ID, customer, or skincare SKU..."
            aria-label="Filter abandoned carts"
            className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Carts Table */}
      {filteredCarts.length === 0 ? (
        <EmptyStateBlock
          title="No abandoned carts in this view"
          description="No cart records match the selected recovery status or search query."
          actionLabel="View All Carts"
          onAction={() => {
            setStatusFilter('All');
            setLocalSearch('');
            onClearGlobalSearch();
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Customer</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Products Abandoned</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Cart Value</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Time Since Abandonment</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Recovery Status</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCarts.map((cart) => {
                  const customer = customerMap.get(cart.customerId);
                  const totalInr = getCartTotalInr(cart.items);
                  const productSummary =
                    cart.items.length === 1
                      ? cart.items[0].name
                      : `${cart.items[0]?.name ?? 'Skincare item'} + ${cart.items.length - 1} more`;

                  return (
                    <tr
                      key={cart.id}
                      onClick={() => onSelectCart(cart.id)}
                      className="hover:bg-indigo-50/35 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (customer) onSelectCustomer(customer.id);
                          }}
                          className="font-semibold text-slate-900 hover:text-indigo-600 text-left whitespace-nowrap"
                        >
                          {customer?.name ?? cart.customerId}
                        </button>
                        <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {cart.id} · {cart.channel}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-800 font-medium truncate" title={cart.items.map((i) => i.name).join(', ')}>
                          {productSummary}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {cart.items.reduce((s, i) => s + i.quantity, 0)} total units
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatInr(totalInr)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatAbandonmentDuration(cart.abandonedHoursAgo)}
                      </td>
                      <td
                        className="py-3.5 px-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <StatusLabel status={cart.recoveryStatus} />
                          <select
                            value={cart.recoveryStatus}
                            onChange={(e) =>
                              onChangeStatus(cart.id, e.target.value as RecoveryStatus)
                            }
                            aria-label={`Change recovery status for ${cart.id}`}
                            className="ml-1 px-1.5 py-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {RECOVERY_STATUS_ORDER.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {cart.recoveryStatus === 'Awaiting approval' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onQuickApprove(cart.id)}
                                title="Approve recovery message"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onQuickReject(cart.id)}
                                title="Reject recovery message"
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectCart(cart.id)}
                            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
