import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Mail,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  AbandonedCart,
  Customer,
  MessageChannel,
  MessageTone,
  RecoveryStatus,
} from '../../types/cartpilot';
import {
  calculatePriorityScore,
  formatAbandonmentDuration,
  getCartTotalInr,
} from '../../services/scoringEngine';
import {
  RECOVERY_STATUS_ORDER,
  deterministicRecoveryService,
  formatInr,
} from '../../services/recoveryService';
import { PriorityClassificationLabel, StatusLabel } from '../ui/StatusIndicators';

interface CartDetailDrawerProps {
  cart: AbandonedCart | null;
  customer: Customer | null;
  onClose: () => void;
  onOpenCustomer: (customerId: string) => void;
  onUpdateCart: (
    cartId: string,
    updates: Partial<AbandonedCart>,
    interactionSummary?: string,
    customerStatusUpdate?: Customer['purchaseStatus']
  ) => void;
}

export const CartDetailDrawer: React.FC<CartDetailDrawerProps> = ({
  cart,
  customer,
  onClose,
  onOpenCustomer,
  onUpdateCart,
}) => {
  const [channel, setChannel] = useState<MessageChannel>('Email');
  const [tone, setTone] = useState<MessageTone>('Warm Reminder');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    if (cart) {
      setChannel(cart.channel);
      setTone(cart.tone);
      setSubject(cart.generatedSubject ?? '');
      setMessageBody(cart.generatedMessage ?? '');
      setShowRejectInput(false);
      setRejectionNote('');
      setFeedbackBanner(null);
    }
  }, [cart?.id, cart?.recoveryStatus, cart?.generatedMessage]);

  if (!cart || !customer) return null;

  const totalInr = getCartTotalInr(cart.items);
  const scoreBreakdown = calculatePriorityScore(
    customer,
    totalInr,
    cart.abandonedHoursAgo
  );

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setFeedbackBanner(null);
    try {
      const result = await deterministicRecoveryService.generatePersonalizedMessage({
        customer,
        cart,
        scoreBreakdown,
        channel,
        tone,
      });

      setSubject(result.subject);
      setMessageBody(result.body);

      const nextStatus: RecoveryStatus =
        cart.recoveryStatus === 'Pending' ? 'Message generated' : cart.recoveryStatus;

      onUpdateCart(
        cart.id,
        {
          channel,
          tone,
          generatedSubject: result.subject,
          generatedMessage: result.body,
          recoveryStatus: nextStatus,
        },
        `Generated ${tone.toLowerCase()} ${channel} recovery draft (${formatInr(totalInr)}).`
      );
      setFeedbackBanner('Draft generated locally using deterministic template engine (no external messages sent).');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditsAndSubmit = () => {
    if (!messageBody.trim()) return;
    onUpdateCart(
      cart.id,
      {
        channel,
        tone,
        generatedSubject: subject,
        generatedMessage: messageBody,
        recoveryStatus: 'Awaiting approval',
      },
      `Submitted ${channel} recovery message for team approval.`
    );
    setFeedbackBanner('Message queued for approval.');
  };

  const handleApprove = () => {
    onUpdateCart(
      cart.id,
      {
        channel,
        tone,
        generatedSubject: subject || cart.generatedSubject,
        generatedMessage: messageBody || cart.generatedMessage,
        recoveryStatus: 'Approved',
        lastActionNote: 'Approved in CartPilot review queue (preview mode; no live dispatch).',
      },
      `Approved ${channel} recovery follow-up for ${customer.name}.`
    );
    setShowRejectInput(false);
    setFeedbackBanner('Recovery action approved. Live sending is disabled in this frontend preview.');
  };

  const handleReject = () => {
    const note = rejectionNote.trim() || 'Draft rejected for revision.';
    onUpdateCart(
      cart.id,
      {
        recoveryStatus: 'Pending',
        lastActionNote: `Rejected: ${note}`,
      },
      `Rejected suggested recovery action: ${note}`
    );
    setShowRejectInput(false);
    setRejectionNote('');
    setFeedbackBanner('Suggested action rejected and returned to Pending.');
  };

  const handleMarkRecovered = () => {
    onUpdateCart(
      cart.id,
      {
        recoveryStatus: 'Recovered',
        lastActionNote: `Marked recovered (${formatInr(totalInr)}).`,
      },
      `Cart ${cart.id} marked as Recovered (${formatInr(totalInr)}).`,
      'Recovered'
    );
    setFeedbackBanner('Cart marked as Recovered. Dashboard metrics updated.');
  };

  const handleDirectStatusChange = (newStatus: RecoveryStatus) => {
    const custStatus =
      newStatus === 'Recovered'
        ? 'Recovered'
        : customer.purchaseStatus === 'Recovered'
        ? 'Abandoned'
        : undefined;
    onUpdateCart(
      cart.id,
      {
        recoveryStatus: newStatus,
        lastActionNote: `Status updated manually to ${newStatus}.`,
      },
      `Updated cart ${cart.id} recovery status to ${newStatus}.`,
      custStatus
    );
    setFeedbackBanner(`Status updated to ${newStatus}.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-10 w-full max-w-2xl bg-white h-full border-l border-slate-200 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{cart.id}</span>
              <span aria-hidden="true">·</span>
              <span>Abandoned {formatAbandonmentDuration(cart.abandonedHoursAgo)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h2 id="cart-drawer-title" className="text-lg font-semibold text-slate-900">
                {customer.name}
              </h2>
              <StatusLabel status={cart.recoveryStatus} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => onOpenCustomer(customer.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <User className="w-3.5 h-3.5" />
                View Customer Profile ({customer.id})
              </button>
              <PriorityClassificationLabel
                level={scoreBreakdown.level}
                score={scoreBreakdown.score}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close cart recovery drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {feedbackBanner && (
            <div className="px-4 py-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between gap-3">
              <span>{feedbackBanner}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-indigo-700 hover:text-indigo-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Status & Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Abandoned Basket Value</p>
              <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatInr(totalInr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Drop-off Step</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {customer.checkoutStepReached}
              </p>
            </div>
            <div>
              <label
                htmlFor="recovery-status-select"
                className="block text-xs text-slate-500 mb-1"
              >
                Recovery Status
              </label>
              <select
                id="recovery-status-select"
                value={cart.recoveryStatus}
                onChange={(e) => handleDirectStatusChange(e.target.value as RecoveryStatus)}
                className="w-full px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RECOVERY_STATUS_ORDER.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Abandoned Products Table */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Products Abandoned ({cart.items.length})
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">SKU & Product</th>
                    <th className="py-2.5 px-3 font-medium text-right">Unit Price</th>
                    <th className="py-2.5 px-3 font-medium text-right">Qty</th>
                    <th className="py-2.5 px-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.items.map((item) => (
                    <tr key={item.sku}>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.sku} · {item.variant}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatInr(item.unitPriceInr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatInr(item.unitPriceInr * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Personalized Message Composer */}
          <section className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recovery Message Draft
                </h3>
                <p className="text-xs text-slate-500">
                  Generate and review follow-up copy before approval. No live messages are sent in this preview.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating
                  ? 'Generating...'
                  : messageBody
                  ? 'Regenerate Draft'
                  : 'Generate Recovery Message'}
              </button>
            </div>

            {/* Channel & Tone Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Delivery Channel
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['Email', 'WhatsApp'] as MessageChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                        channel === ch
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ch === 'Email' ? (
                        <Mail className="w-3.5 h-3.5" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5" />
                      )}
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="tone-select"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Follow-up Approach
                </label>
                <select
                  id="tone-select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as MessageTone)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Warm Reminder">Warm Reminder</option>
                  <option value="Gentle Incentive">Gentle Incentive (10% Off)</option>
                  <option value="VIP Concierge">VIP Concierge (Free Express Shipping)</option>
                </select>
              </div>
            </div>

            {/* Draft Editor */}
            <div className="space-y-3">
              {channel === 'Email' && (
                <div>
                  <label
                    htmlFor="draft-subject"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Subject Line
                  </label>
                  <input
                    id="draft-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Generate a draft or write a custom subject line..."
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="draft-body"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Message Preview
                </label>
                <textarea
                  id="draft-body"
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Click 'Generate Recovery Message' to compose a personalised draft tailored to this customer's skin profile and abandoned items..."
                  className="w-full px-3 py-2.5 text-xs leading-relaxed text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {cart.lastActionNote && (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Latest log: </span>
                {cart.lastActionNote}
              </p>
            )}

            {showRejectInput && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2.5">
                <label
                  htmlFor="reject-reason"
                  className="block text-xs font-medium text-rose-900"
                >
                  Rejection / revision note (optional)
                </label>
                <input
                  id="reject-reason"
                  type="text"
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g., Adjust discount offer or switch channel to WhatsApp"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {cart.recoveryStatus !== 'Recovered' && (
              <button
                type="button"
                onClick={handleMarkRecovered}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Recovered
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cart.recoveryStatus !== 'Recovered' && (
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-white border border-slate-300 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reject
              </button>
            )}

            {messageBody.trim() &&
              cart.recoveryStatus !== 'Awaiting approval' &&
              cart.recoveryStatus !== 'Approved' &&
              cart.recoveryStatus !== 'Recovered' && (
                <button
                  type="button"
                  onClick={handleSaveEditsAndSubmit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit for Approval
                </button>
              )}

            {cart.recoveryStatus !== 'Approved' &&
              cart.recoveryStatus !== 'Recovered' && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!messageBody.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Action
                </button>
              )}
          </div>
        </div>
      </aside>
    </div>
  );
};
