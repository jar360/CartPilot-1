import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  PurchaseIntent,
  PurchaseStatus,
} from '../../types/cartpilot';
import { getCartTotalInr } from '../../services/scoringEngine';
import { formatInr } from '../../services/recoveryService';
import {
  EmptyStateBlock,
  IntentLabel,
  PurchaseStatusLabel,
} from '../ui/StatusIndicators';

interface CustomersViewProps {
  customers: Customer[];
  carts: AbandonedCart[];
  globalSearch: string;
  onSelectCustomer: (customerId: string) => void;
}

type SortField = 'cartValue' | 'lastActivity' | 'name';

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  carts,
  globalSearch,
  onSelectCustomer,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'All'>('All');
  const [intentFilter, setIntentFilter] = useState<PurchaseIntent | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('cartValue');
  const [sortAsc, setSortAsc] = useState(false);

  const cartByCustomerId = useMemo(
    () => new Map(carts.map((c) => [c.customerId, c])),
    [carts]
  );

  const effectiveQuery = (localSearch || globalSearch).trim().toLowerCase();

  const filteredCustomers = useMemo(() => {
    return customers
      .map((customer) => {
        const cart = cartByCustomerId.get(customer.id);
        const cartValueInr = cart
          ? getCartTotalInr(cart.items)
          : getCartTotalInr(customer.cartItems);
        return { customer, cartValueInr };
      })
      .filter(({ customer }) => {
        if (statusFilter !== 'All' && customer.purchaseStatus !== statusFilter) {
          return false;
        }
        if (intentFilter !== 'All' && customer.intent !== intentFilter) {
          return false;
        }
        if (effectiveQuery) {
          const hay = `${customer.id} ${customer.name} ${customer.email} ${customer.city} ${customer.skinProfile}`.toLowerCase();
          if (!hay.includes(effectiveQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'cartValue') {
          cmp = a.cartValueInr - b.cartValueInr;
        } else if (sortField === 'lastActivity') {
          cmp = a.customer.lastActivityIso.localeCompare(b.customer.lastActivityIso);
        } else {
          cmp = a.customer.name.localeCompare(b.customer.name);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [customers, cartByCustomerId, statusFilter, intentFilter, effectiveQuery, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const clearFilters = () => {
    setLocalSearch('');
    setStatusFilter('All');
    setIntentFilter('All');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
          Customer Directory
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Search, filter, and inspect shopper profiles, purchase status, and active cart value.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter by Customer ID, name, email, or city..."
            aria-label="Filter customers"
            className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PurchaseStatus | 'All')}
            aria-label="Filter by purchase status"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Purchase Statuses</option>
            <option value="Abandoned">Abandoned</option>
            <option value="At Checkout">At Checkout</option>
            <option value="Recovered">Recovered</option>
            <option value="Converted">Converted</option>
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'High', 'Medium', 'Low'] as const).map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => setIntentFilter(intent)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  intentFilter === intent
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {intent === 'All' ? 'All Intent' : intent}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Table */}
      {filteredCustomers.length === 0 ? (
        <EmptyStateBlock
          title="No matching customers found"
          description="Try clearing your active status, intent, or search filters to view all shopper profiles."
          actionLabel="Reset Filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Customer ID</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Email</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('cartValue')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                    >
                      Cart Value
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Purchase Status</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('lastActivity')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Last Activity
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Customer Intent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map(({ customer, cartValueInr }) => (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer.id)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {customer.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 whitespace-nowrap">
                        {customer.name}
                      </p>
                      <p className="text-[11px] text-slate-500 whitespace-nowrap">
                        {customer.city} · {customer.previousOrders} prior orders
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {customer.email}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {cartValueInr > 0 ? formatInr(cartValueInr) : '₹0'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PurchaseStatusLabel status={customer.purchaseStatus} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {customer.lastActivityLabel}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <IntentLabel intent={customer.intent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="font-mono text-slate-700">{filteredCustomers.length}</strong> of{' '}
              <strong className="font-mono text-slate-700">{customers.length}</strong> customers
            </span>
            <span>Click any row to open full customer profile</span>
          </div>
        </div>
      )}
    </div>
  );
};
