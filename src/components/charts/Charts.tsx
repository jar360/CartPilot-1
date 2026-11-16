import React, { useState } from 'react';
import { DailyActivityMetric, PurchaseIntent, RecoveryStatus } from '../../types/cartpilot';
import { formatInr } from '../../services/recoveryService';

interface ActivityChartProps {
  data: DailyActivityMetric[];
  height?: number;
}

export const CustomerActivityChart: React.FC<ActivityChartProps> = ({
  data,
  height = 220,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
        No customer activity records available.
      </div>
    );
  }

  const width = 560;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.activeCustomers, d.checkoutStarts)),
    10
  );
  const yCeiling = Math.ceil(maxVal / 10) * 10 + 10;

  const getX = (i: number) =>
    padLeft + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const getY = (val: number) => padTop + chartH - (val / yCeiling) * chartH;

  const activePoints = data.map((d, i) => `${getX(i)},${getY(d.activeCustomers)}`).join(' ');
  const checkoutPoints = data.map((d, i) => `${getX(i)},${getY(d.checkoutStarts)}`).join(' ');

  const areaPath = [
    `M ${getX(0)},${padTop + chartH}`,
    ...data.map((d, i) => `L ${getX(i)},${getY(d.activeCustomers)}`),
    `L ${getX(data.length - 1)},${padTop + chartH}`,
    'Z',
  ].join(' ');

  const yTicks = [0, Math.round(yCeiling * 0.33), Math.round(yCeiling * 0.66), yCeiling];

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-end gap-5 mb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-indigo-600 inline-block" />
          Active shoppers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-violet-500 inline-block" />
          Checkout starts
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Customer activity and checkout starts over the last 7 days"
        >
          <defs>
            <linearGradient id="cpActiveArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#cpActiveArea)" />

          <polyline
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={activePoints}
          />

          <polyline
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={checkoutPoints}
          />

          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoverIdx === i;
            return (
              <g key={d.dateLabel}>
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + chartH}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={x}
                  cy={getY(d.activeCustomers)}
                  r={isHovered ? 4.5 : 3}
                  fill="#4F46E5"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <circle
                  cx={x}
                  cy={getY(d.checkoutStarts)}
                  r={isHovered ? 4.5 : 3}
                  fill="#8B5CF6"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {d.dateLabel}
                </text>
                <rect
                  x={x - chartW / (data.length * 2)}
                  y={padTop}
                  width={chartW / data.length}
                  height={chartH + 16}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {hoverIdx !== null && data[hoverIdx] && (
          <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs tabular-nums">
            <span className="font-medium text-slate-200">{data[hoverIdx].dateLabel}</span>
            <div className="flex items-center gap-4">
              <span>Active shoppers: <strong className="font-mono">{data[hoverIdx].activeCustomers}</strong></span>
              <span>Checkout starts: <strong className="font-mono">{data[hoverIdx].checkoutStarts}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AbandonedCartTrendChart: React.FC<ActivityChartProps> = ({
  data,
  height = 220,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
        No abandoned cart trend data available.
      </div>
    );
  }

  const width = 560;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.abandonedValueInr, d.recoveredValueInr)),
    10000
  );
  const yCeiling = Math.ceil(maxVal / 5000) * 5000;

  const slotW = chartW / data.length;
  const barW = Math.min(18, slotW * 0.28);
  const yTicks = [0, Math.round(yCeiling * 0.5), yCeiling];

  const getY = (val: number) => padTop + chartH - (val / yCeiling) * chartH;

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-end gap-5 mb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
          Abandoned value
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
          Recovered value
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Daily abandoned cart value compared with recovered value in INR"
      >
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {tick === 0 ? '₹0' : `₹${Math.round(tick / 1000)}k`}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padLeft + i * slotW + slotW / 2;
          const abH = (d.abandonedValueInr / yCeiling) * chartH;
          const recH = (d.recoveredValueInr / yCeiling) * chartH;
          const isHovered = hoverIdx === i;

          return (
            <g
              key={d.dateLabel}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {isHovered && (
                <rect
                  x={cx - slotW * 0.42}
                  y={padTop}
                  width={slotW * 0.84}
                  height={chartH}
                  rx="4"
                  fill="#F1F5F9"
                />
              )}
              <rect
                x={cx - barW - 2}
                y={padTop + chartH - abH}
                width={barW}
                height={Math.max(2, abH)}
                rx="3"
                fill={isHovered ? '#4338CA' : '#6366F1'}
              />
              <rect
                x={cx + 2}
                y={padTop + chartH - recH}
                width={barW}
                height={Math.max(2, recH)}
                rx="3"
                fill={isHovered ? '#059669' : '#10B981'}
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {d.dateLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIdx !== null && data[hoverIdx] && (
        <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs tabular-nums">
          <span className="font-medium text-slate-200">{data[hoverIdx].dateLabel}</span>
          <div className="flex items-center gap-4">
            <span>Abandoned: <strong className="font-mono">{formatInr(data[hoverIdx].abandonedValueInr)}</strong></span>
            <span>Recovered: <strong className="font-mono text-emerald-300">{formatInr(data[hoverIdx].recoveredValueInr)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

interface RecoveryStatusRow {
  status: RecoveryStatus;
  count: number;
  valueInr: number;
  percentage: number;
}

export const RecoveryStatusChart: React.FC<{ items: RecoveryStatusRow[] }> = ({ items }) => {
  const colorMap: Record<RecoveryStatus, string> = {
    Pending: 'bg-slate-400',
    'Message generated': 'bg-indigo-500',
    'Awaiting approval': 'bg-amber-500',
    Approved: 'bg-violet-600',
    Recovered: 'bg-emerald-500',
  };

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4">
      <div className="w-full h-3 rounded-md bg-slate-100 overflow-hidden flex">
        {items.map((item) => {
          const widthPct = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
          if (widthPct === 0) return null;
          return (
            <div
              key={item.status}
              style={{ width: `${widthPct}%` }}
              className={`${colorMap[item.status]} h-full border-r border-white last:border-r-0 transition-all duration-200`}
              title={`${item.status}: ${item.count} carts (${formatInr(item.valueInr)})`}
            />
          );
        })}
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.status} className="py-2.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${colorMap[item.status]}`} />
              <span className="font-medium text-slate-800 truncate">{item.status}</span>
            </div>
            <div className="flex items-center gap-4 tabular-nums shrink-0">
              <span className="font-mono text-slate-500">{item.count} {item.count === 1 ? 'cart' : 'carts'}</span>
              <span className="font-mono font-medium text-slate-900 w-20 text-right">
                {formatInr(item.valueInr)}
              </span>
              <span className="font-mono text-slate-400 w-9 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface IntentRow {
  intent: PurchaseIntent;
  count: number;
  totalValueInr: number;
  avgValueInr: number;
  percentage: number;
}

export const IntentDistributionChart: React.FC<{ items: IntentRow[] }> = ({ items }) => {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  const strokeMap: Record<PurchaseIntent, string> = {
    High: '#4F46E5',
    Medium: '#8B5CF6',
    Low: '#CBD5E1',
  };
  const bgMap: Record<PurchaseIntent, string> = {
    High: 'bg-indigo-600',
    Medium: 'bg-violet-500',
    Low: 'bg-slate-300',
  };

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="14"
          />
          {items.map((item) => {
            const fraction = total > 0 ? item.count / total : 0;
            const dashLength = fraction * circumference;
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += dashLength;
            if (dashLength === 0) return null;
            return (
              <circle
                key={item.intent}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={strokeMap[item.intent]}
                strokeWidth="14"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">{total}</span>
          <span className="text-[11px] text-slate-500">Customers</span>
        </div>
      </div>

      <div className="flex-1 w-full divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.intent} className="py-2.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${bgMap[item.intent]}`} />
              <div>
                <p className="font-medium text-slate-900">{item.intent} Intent</p>
                <p className="text-[11px] text-slate-500 tabular-nums">
                  Avg basket {formatInr(item.avgValueInr)}
                </p>
              </div>
            </div>
            <div className="text-right tabular-nums">
              <p className="font-mono font-semibold text-slate-900">
                {item.count} ({item.percentage}%)
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                {formatInr(item.totalValueInr)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
