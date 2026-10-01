import type { LeadStage } from 'types/models/Broker';

/**
 * Presentation-only helpers for the broker journey.
 *
 * The stage itself is never computed here: the server derives it from real
 * actions and returns it on every lead, which is why the portal and the back
 * office can never disagree about where a lead stands.
 */
export const BROKER_PORTAL_STAGE_DESCRIPTIONS: Record<LeadStage, string> = {
  SubmitLead: 'Review, update and validate the lead information',
  Contact: 'Reach out to the prospect',
  RequestQuote: 'Submit a quotation request for this lead',
  Negotiation: 'Track discussions, counteroffers and price changes',
  PriceApproval: 'Confirm the final price accepted by the customer',
  ContactBackOffice: 'Hand over to create the order',
  Lost: 'This opportunity is closed',
};

/** Short line under the current-stage title on the step header. */
export const BROKER_PORTAL_STAGE_HINTS: Record<Exclude<LeadStage, 'Lost'>, string> = {
  SubmitLead: 'Capture & validate the lead',
  Contact: 'Reach out & log interactions',
  RequestQuote: 'Send a quotation request',
  Negotiation: 'Discuss & counteroffer',
  PriceApproval: 'Confirm the final price',
  ContactBackOffice: 'Hand over to create the order',
};

export function getLeadInitials(companyName = '') {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'LD';
  return `${words[0]?.[0] || ''}${words[1]?.[0] || words[0]?.[1] || ''}`.toUpperCase();
}

export function formatPortalMoney(value?: number | null) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatPortalDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
