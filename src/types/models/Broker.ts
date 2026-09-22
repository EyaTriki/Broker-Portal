export type BrokerStatus = 'Active' | 'Inactive';
export type CommissionType = 'Percentage' | 'Fixed';

/**
 * Lead statuses as stored by the backend (`LEAD_STATUSES` in
 * models/BrokerLead.js) and shown in the back office.
 */
export type LeadStatus =
  | 'Draft'
  | 'NewLead'
  | 'ContactAttempted'
  | 'Contacted'
  | 'WaitingForCustomer'
  | 'QuotationSent'
  | 'FollowUpRequired'
  | 'Negotiation'
  | 'Converted'
  | 'Lost';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  Draft: 'Draft',
  NewLead: 'New Lead',
  ContactAttempted: 'Contact Attempted',
  Contacted: 'Contacted',
  WaitingForCustomer: 'Waiting for Customer',
  QuotationSent: 'Quotation Sent',
  FollowUpRequired: 'Follow-up Required',
  Negotiation: 'Negotiation',
  Converted: 'Converted to Order',
  Lost: 'Lost',
};

/**
 * The six broker journey steps shown in the portal. These are a presentation
 * layer over the back-office lead status: the server owns `status`, and the
 * portal derives the step from it via `deriveLeadStage`.
 */
export type LeadStage =
  | 'SubmitLead'
  | 'Contact'
  | 'RequestQuote'
  | 'Negotiation'
  | 'PriceApproval'
  | 'ContactBackOffice'
  | 'Lost';

export type LeadPriority = 'High' | 'Medium' | 'Low';

export const LEAD_STAGE_FLOW: Exclude<LeadStage, 'Lost'>[] = [
  'SubmitLead',
  'Contact',
  'RequestQuote',
  'Negotiation',
  'PriceApproval',
  'ContactBackOffice',
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  SubmitLead: 'Submit Lead',
  Contact: 'Contact',
  RequestQuote: 'Request a Quote',
  Negotiation: 'Negotiation',
  PriceApproval: 'Price Approval',
  ContactBackOffice: 'Contact Back Office',
  Lost: 'Lost',
};

export const LEAD_STAGE_FILTER_OPTIONS: LeadStage[] = [...LEAD_STAGE_FLOW, 'Lost'];

export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  SubmitLead: '#2563eb',
  Contact: '#7c3aed',
  RequestQuote: '#0d9488',
  Negotiation: '#0369a1',
  PriceApproval: '#c2410c',
  ContactBackOffice: '#16a34a',
  Lost: '#64748b',
};

export function getLeadStageChipSx(stage: LeadStage | string) {
  const color = LEAD_STAGE_COLORS[stage as LeadStage] || '#64748b';
  return {
    bgcolor: `${color}18`,
    color,
    border: `1px solid ${color}55`,
    fontWeight: 700,
  };
}

export function getLeadStageIndex(stage: LeadStage) {
  return LEAD_STAGE_FLOW.indexOf(stage as Exclude<LeadStage, 'Lost'>);
}

/** Coarse step for a lead when only its status is known. */
const STATUS_TO_STAGE: Record<LeadStatus, LeadStage> = {
  Draft: 'SubmitLead',
  NewLead: 'SubmitLead',
  ContactAttempted: 'Contact',
  Contacted: 'Contact',
  WaitingForCustomer: 'Contact',
  FollowUpRequired: 'Contact',
  QuotationSent: 'RequestQuote',
  Negotiation: 'Negotiation',
  Converted: 'ContactBackOffice',
  Lost: 'Lost',
};

export interface LeadRelated {
  quotes?: BrokerQuoteRequest[];
  negotiations?: BrokerNegotiation[];
  orders?: BrokerOrder[];
  documents?: BrokerDocument[];
}

/**
 * Resolves which of the six portal steps a lead is on. The lead status alone
 * cannot separate Negotiation from Price Approval or the back-office handoff,
 * so when the lead's quotes, negotiations and orders are available they refine
 * the answer. Without them the status mapping is used as-is.
 */
export function deriveLeadStage(
  lead: Pick<BrokerLead, 'status'>,
  related?: LeadRelated,
): LeadStage {
  if (lead.status === 'Lost') return 'Lost';

  const orders = related?.orders || [];
  if (orders.some((order) => order.status !== 'Cancelled')) return 'ContactBackOffice';

  const negotiation = (related?.negotiations || []).find(
    (item) => item.status !== 'Declined',
  );
  if (negotiation) {
    // Closed means an order was already raised from it.
    if (negotiation.status === 'Closed') return 'ContactBackOffice';
    // Agreed still sits on Price Approval: the broker has the customer's price
    // and the handoff to the back office is the action that ends the step.
    if (negotiation.status === 'Agreed' || negotiation.status === 'AwaitingCustomer') {
      return 'PriceApproval';
    }
    return 'Negotiation';
  }

  const hasLiveQuote = (related?.quotes || []).some(
    (quote) => !['Draft', 'Rejected', 'Cancelled'].includes(quote.status),
  );
  if (hasLiveQuote) return 'RequestQuote';

  return STATUS_TO_STAGE[lead.status] || 'SubmitLead';
}

/**
 * Status to write back when the broker logs their first interaction, which is
 * what moves a lead off the Submit Lead step.
 */
export function getContactedStatus(status: LeadStatus): LeadStatus | undefined {
  return status === 'Draft' || status === 'NewLead' ? 'Contacted' : undefined;
}

/** Communication types offered by the back office log dialog. */
export const COMMUNICATION_TYPES = [
  'Phone Call',
  'Email',
  'WhatsApp',
  'Site Visit',
  'Internal Note',
] as const;

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

/** Mirrors the backend `available` enum in models/Task.js. */
export const COLLECTION_TIME_SLOTS: Array<{ value: string; label: string }> = [
  { value: 'AnyTime', label: 'Any Time' },
  { value: '7am-12pm', label: '7am-12pm' },
  { value: '12pm-5pm', label: '12pm-5pm' },
];

export interface Broker {
  _id: string;
  id?: string;
  companyName: string;
  brokerCode: string;
  status: BrokerStatus;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  commissionType: CommissionType;
  commissionValue: number;
  notes?: string;
  userId?: string | null;
  prospects?: number;
  orders?: number;
  revenue?: number;
  pipelineValue?: number;
  conversionRate?: number;
  commissionEarned?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadCommunicationLog {
  action: string;
  detail: string;
  actorName: string;
  createdAt: string;
}

export interface BrokerLead {
  _id: string;
  id?: string;
  brokerId: string;
  companyName: string;
  contactName: string;
  phone?: string;
  email?: string;
  /** Owned by the back office; the portal maps it to a journey step. */
  status: LeadStatus;
  priority: LeadPriority;
  wasteType?: string;
  frequency?: string;
  industry?: string;
  preferredCollectionDate?: string | null;
  preferredCollectionTime?: string;
  billingAddress?: string;
  followUpAt?: string | null;
  pipelineValue?: number;
  notes?: string;
  referenceCode?: string;
  assignedBroker?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  siteAddress?: string;
  leadSource?: string;
  lastActivityAt?: string;
  /** Legacy aliases still present on older records. */
  productSubtype?: string;
  preferredContactTime?: string;
  activityLog?: Array<{
    action: string;
    detail: string;
    actorName: string;
    createdAt: string;
  }>;
  communicationLogs?: LeadCommunicationLog[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadPayload {
  companyName: string;
  contactName: string;
  phone?: string;
  email?: string;
  priority?: LeadPriority;
  wasteType?: string;
  frequency?: string;
  industry?: string;
  preferredCollectionDate?: string | null;
  preferredCollectionTime?: string;
  billingAddress?: string;
  followUpAt?: string | null;
  pipelineValue?: number;
  notes?: string;
  customerType?: 'Individual' | 'Company';
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  preferredLanguage?: string;
  preferredCommunication?: string;
  customerCategory?: string;
  existingCustomer?: boolean;
  secondaryEmail?: string;
  secondaryPhone?: string;
  mobile?: string;
  whatsapp?: string;
  preferredContactTime?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country?: string;
  leadTitle?: string;
  description?: string;
  customerNeed?: string;
  productSubtype?: string;
  estimatedQuantity?: string;
  expectedDecisionDate?: string | null;
  expectedDeliveryDate?: string | null;
  leadSource?: string;
  campaign?: string;
  tags?: string;
  internalComments?: string;
  assignedBroker?: string;
  team?: string;
  territory?: string;
  reminder?: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload> & {
  status?: LeadStatus;
  /** The backend replaces the whole trail, so send the full array. */
  communicationLogs?: LeadCommunicationLog[];
};

export type QuoteRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'InReview'
  | 'Quoted'
  | 'Rejected'
  | 'Cancelled';

export interface BrokerQuoteRequest {
  _id: string;
  id?: string;
  brokerId: string;
  leadId: string;
  contactId?: string | null;
  referenceCode: string;
  status: QuoteRequestStatus;
  companyName: string;
  siteAddress?: string;
  wasteType?: string;
  frequency?: string;
  estimatedValue?: number;
  quotedAmount?: number | null;
  description?: string;
  notes?: string;
  submittedAt?: string | null;
  mainQuotationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQuoteRequestPayload {
  leadId: string;
  contactId?: string | null;
  companyName?: string;
  siteAddress?: string;
  wasteType?: string;
  frequency?: string;
  estimatedValue?: number;
  description?: string;
  notes?: string;
  status?: QuoteRequestStatus;
  submit?: boolean;
}

export type NegotiationStatus =
  | 'Open'
  | 'InProgress'
  | 'AwaitingCustomer'
  | 'Agreed'
  | 'Declined'
  | 'Closed';

export interface BrokerNegotiation {
  _id: string;
  id?: string;
  brokerId: string;
  leadId: string;
  quoteRequestId?: string | null;
  referenceCode: string;
  companyName: string;
  status: NegotiationStatus;
  priority: LeadPriority;
  quotedAmount?: number;
  customerOffer?: number | null;
  counterOffer?: number | null;
  agreedAmount?: number | null;
  followUpAt?: string | null;
  notes?: string;
  activityLog?: Array<{
    action: string;
    detail: string;
    actorName: string;
    createdAt: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateNegotiationPayload {
  leadId: string;
  quoteRequestId?: string | null;
  companyName?: string;
  quotedAmount?: number;
  customerOffer?: number | null;
  counterOffer?: number | null;
  agreedAmount?: number | null;
  priority?: LeadPriority;
  followUpAt?: string | null;
  notes?: string;
  status?: NegotiationStatus;
}

export type OrderStatus = 'Draft' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled';

export type CommissionStatus = 'Pending' | 'Paid' | 'Disputed';

export interface BrokerOrder {
  _id: string;
  id?: string;
  brokerId: string;
  leadId: string;
  negotiationId?: string | null;
  quoteRequestId?: string | null;
  referenceCode: string;
  companyName: string;
  status: OrderStatus;
  priority: LeadPriority;
  orderAmount?: number;
  commissionAmount?: number | null;
  commissionStatus?: CommissionStatus;
  commissionPaidAt?: string | null;
  commissionDisputeNote?: string;
  wasteType?: string;
  frequency?: string;
  siteAddress?: string;
  scheduledAt?: string | null;
  notes?: string;
  mainTaskId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentType =
  | 'Quote'
  | 'Contract'
  | 'Invoice'
  | 'WasteTransferNote'
  | 'ProofOfService'
  | 'Identity'
  | 'BusinessCard'
  | 'Other';

export interface BrokerDocument {
  _id: string;
  id?: string;
  brokerId: string;
  leadId: string;
  quoteRequestId?: string | null;
  negotiationId?: string | null;
  orderId?: string | null;
  referenceCode: string;
  companyName: string;
  title: string;
  type: DocumentType;
  mimeType?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
