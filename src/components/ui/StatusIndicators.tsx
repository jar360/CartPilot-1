import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  PriorityLevel,
  PurchaseIntent,
  PurchaseStatus,
  RecoveryStatus,
} from '../../types/cartpilot';

export const StatusLabel: React.FC<{ status: RecoveryStatus }> = ({ status }) => {
  const config: Record<
    RecoveryStatus,
    { color: string; dot: string; icon: React.ReactNode }
  > = {
    Pending: {
      color: 'text-slate-700',
      dot: 'bg-slate-400',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    },
    'Message generated': {
      color: 'text-indigo-700',
      dot: 'bg-indigo-500',
      icon: <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
    },
    'Awaiting approval': {
      color: 'text-amber-700',
      dot: 'bg-amber-500',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    },
    Approved: {
      color: 'text-violet-700',
      dot: 'bg-violet-600',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />,
    },
    Recovered: {
      color: 'text-emerald-700',
      dot: 'bg-emerald-600',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${current.color}`}>
      {current.icon}
      <span>{status}</span>
    </span>
  );
};

export const PurchaseStatusLabel: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
  const styles: Record<PurchaseStatus, string> = {
    Abandoned: 'text-rose-700',
    'At Checkout': 'text-amber-700',
    Recovered: 'text-emerald-700',
    Converted: 'text-indigo-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      <span
        className={`w-1.5 h-1.5 rounded-sm shrink-0 ${
          status === 'Abandoned'
            ? 'bg-rose-500'
            : status === 'At Checkout'
            ? 'bg-amber-500'
            : status === 'Recovered'
            ? 'bg-emerald-500'
            : 'bg-indigo-600'
        }`}
      />
      {status}
    </span>
  );
};

export const IntentLabel: React.FC<{ intent: PurchaseIntent }> = ({ intent }) => {
  const styles: Record<PurchaseIntent, string> = {
    High: 'text-indigo-700 font-semibold',
    Medium: 'text-slate-700 font-medium',
    Low: 'text-slate-500 font-normal',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${styles[intent]}`}>
      <span
        className={`inline-block w-2 h-2 rounded-xs ${
          intent === 'High'
            ? 'bg-indigo-600'
            : intent === 'Medium'
            ? 'bg-violet-400'
            : 'bg-slate-300'
        }`}
      />
      {intent} Intent
    </span>
  );
};

export const PriorityClassificationLabel: React.FC<{
  level: PriorityLevel;
  score?: number;
}> = ({ level, score }) => {
  const textColors: Record<PriorityLevel, string> = {
    High: 'text-indigo-700',
    Medium: 'text-amber-700',
    Low: 'text-slate-600',
  };
  const barColors: Record<PriorityLevel, string> = {
    High: 'bg-indigo-600',
    Medium: 'bg-amber-500',
    Low: 'bg-slate-400',
  };

  return (
    <div className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`w-1.5 h-3.5 rounded-xs ${barColors[level]}`} />
      <span className={`text-xs font-semibold ${textColors[level]}`}>
        {level}
      </span>
      {score !== undefined && (
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {score}/100
        </span>
      )}
    </div>
  );
};

export const EmptyStateBlock: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white border border-slate-200 rounded-xl">
    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
      <Sparkles className="w-5 h-5" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
