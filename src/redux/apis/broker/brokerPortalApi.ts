import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryConfigWithRefresh } from '@redux/baseQueryConfig';
import { ENDPOINTS } from '@config/constants/endpoints';
import { MethodsEnum } from '@config/enums/method.enum';
import type {
  Broker,
  BrokerDocument,
  BrokerLead,
  BrokerNegotiation,
  BrokerOrder,
  BrokerQuoteRequest,
  CreateLeadPayload,
  CreateNegotiationPayload,
  CreateQuoteRequestPayload,
  LeadRelated,
  LeadStatus,
  UpdateLeadPayload,
} from 'types/models/Broker';

export interface BrokerPortalDashboard {
  greetingName: string;
  broker: Broker | null;
  summary: {
    activeLeads: number;
    draftLeads: number;
    validated: number;
    quotesInProgress: number;
    negotiations: number;
    ordersCreated: number;
    conversionRate: number;
    pipelineValue: number;
  };
  pipeline: Array<{
    status: LeadStatus;
    count: number;
    value: number;
    percent: number;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    companyName: string;
    priority: string;
    followUpAt: string;
    overdue: boolean;
    status: string;
    sourceType?: 'lead' | 'task';
    referenceCode?: string;
  }>;
  recentActivity: Array<{
    leadId: string;
    leadCode: string;
    companyName: string;
    status: LeadStatus;
    action: string;
    detail: string;
    actorName: string;
    createdAt: string;
  }>;
}

function buildQuery(params: Record<string, unknown> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface PortalLeadDetail extends BrokerLead {
  counts?: {
    quotes: number;
    negotiations: number;
    orders: number;
    documents: number;
  };
  related?: LeadRelated;
  commercial?: {
    estimatedBudget?: number;
    proposedPrice?: number | null;
    agreedPrice?: number | null;
  };
}

export const brokerPortalApi = createApi({
  reducerPath: 'brokerPortalApi',
  baseQuery: baseQueryConfigWithRefresh,
  tagTypes: [
    'PortalDashboard',
    'PortalLeads',
    'PortalQuotes',
    'PortalNegotiations',
    'PortalOrders',
    'PortalDocuments',
  ],
  endpoints: (builder) => ({
    getPortalDashboard: builder.query<{ data: BrokerPortalDashboard }, void>({
      query: () => ({
        url: ENDPOINTS.BROKER_PORTAL_DASHBOARD,
        method: MethodsEnum.GET,
      }),
      providesTags: ['PortalDashboard'],
    }),

    getPortalLeads: builder.query<
      { data: BrokerLead[] },
      { status?: string; keyword?: string; priority?: string }
    >({
      query: (params) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_LEADS}${buildQuery(params)}`,
        method: MethodsEnum.GET,
      }),
      providesTags: ['PortalLeads'],
    }),

    getPortalLeadById: builder.query<{ data: PortalLeadDetail }, string>({
      query: (leadId) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_LEADS}/${leadId}`,
        method: MethodsEnum.GET,
      }),
      providesTags: (_result, _error, leadId) => [{ type: 'PortalLeads', id: leadId }],
    }),

    createPortalLead: builder.mutation<{ data: BrokerLead }, CreateLeadPayload>({
      query: (body) => ({
        url: ENDPOINTS.BROKER_PORTAL_LEADS,
        method: MethodsEnum.POST,
        body,
      }),
      invalidatesTags: ['PortalLeads', 'PortalDashboard'],
    }),

    updatePortalLead: builder.mutation<
      { data: BrokerLead },
      { leadId: string; body: UpdateLeadPayload }
    >({
      query: ({ leadId, body }) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_LEADS}/${leadId}`,
        method: MethodsEnum.PATCH,
        body,
      }),
      invalidatesTags: (_result, _error, { leadId }) => [
        'PortalLeads',
        'PortalDashboard',
        { type: 'PortalLeads', id: leadId },
      ],
    }),

    /**
     * The backend stores the trail on the lead and replaces the array wholesale,
     * so callers send the full list with the new entry prepended.
     */
    addPortalLeadCommunication: builder.mutation<
      { data: BrokerLead },
      { leadId: string; body: UpdateLeadPayload }
    >({
      query: ({ leadId, body }) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_LEADS}/${leadId}`,
        method: MethodsEnum.PATCH,
        body,
      }),
      invalidatesTags: (_result, _error, { leadId }) => [
        'PortalLeads',
        'PortalDashboard',
        { type: 'PortalLeads', id: leadId },
      ],
    }),

    /**
     * Raises the Draft order the back office reviews. Draft orders stay out of
     * the main system until an admin confirms them, which is what turns the
     * lead into a Task.
     */
    handoffPortalLead: builder.mutation<
      { data: BrokerOrder },
      {
        leadId: string;
        negotiationId: string;
        companyName?: string;
        orderAmount?: number | null;
        notes?: string;
      }
    >({
      query: ({ leadId, negotiationId, companyName, orderAmount, notes }) => ({
        url: ENDPOINTS.BROKER_PORTAL_ORDERS,
        method: MethodsEnum.POST,
        body: {
          leadId,
          negotiationId,
          companyName,
          orderAmount,
          notes,
          status: 'Draft',
        },
      }),
      invalidatesTags: (_result, _error, { leadId }) => [
        'PortalLeads',
        'PortalOrders',
        'PortalNegotiations',
        'PortalDashboard',
        { type: 'PortalLeads', id: leadId },
      ],
    }),

    markPortalLeadLost: builder.mutation<
      { data: BrokerLead },
      { leadId: string; body?: UpdateLeadPayload }
    >({
      query: ({ leadId, body }) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_LEADS}/${leadId}`,
        method: MethodsEnum.PATCH,
        body: { ...body, status: 'Lost' },
      }),
      invalidatesTags: (_result, _error, { leadId }) => [
        'PortalLeads',
        'PortalDashboard',
        { type: 'PortalLeads', id: leadId },
      ],
    }),

    createPortalQuoteRequest: builder.mutation<
      { data: BrokerQuoteRequest },
      CreateQuoteRequestPayload
    >({
      query: (body) => ({
        url: ENDPOINTS.BROKER_PORTAL_QUOTE_REQUESTS,
        method: MethodsEnum.POST,
        body,
      }),
      // Submitting a quote advances the lead's stage server-side.
      invalidatesTags: ['PortalQuotes', 'PortalLeads', 'PortalDashboard'],
    }),

    createPortalNegotiation: builder.mutation<
      { data: BrokerNegotiation },
      CreateNegotiationPayload
    >({
      query: (body) => ({
        url: ENDPOINTS.BROKER_PORTAL_NEGOTIATIONS,
        method: MethodsEnum.POST,
        body,
      }),
      invalidatesTags: ['PortalNegotiations', 'PortalQuotes', 'PortalLeads', 'PortalDashboard'],
    }),

    updatePortalNegotiation: builder.mutation<
      { data: BrokerNegotiation },
      { negotiationId: string; body: Partial<CreateNegotiationPayload> }
    >({
      query: ({ negotiationId, body }) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_NEGOTIATIONS}/${negotiationId}`,
        method: MethodsEnum.PATCH,
        body,
      }),
      invalidatesTags: ['PortalNegotiations', 'PortalLeads', 'PortalDashboard'],
    }),

    /** Appends a dated note to the negotiation trail and moves the offer on. */
    recordPortalNegotiationUpdate: builder.mutation<
      { data: BrokerNegotiation },
      { negotiationId: string; detail?: string; proposedPrice?: number | null }
    >({
      query: ({ negotiationId, detail, proposedPrice }) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_NEGOTIATIONS}/${negotiationId}`,
        method: MethodsEnum.PATCH,
        body: {
          updateNote: detail,
          ...(proposedPrice != null ? { counterOffer: proposedPrice } : {}),
        },
      }),
      invalidatesTags: ['PortalNegotiations', 'PortalLeads', 'PortalDashboard'],
    }),

    getPortalQuoteRequests: builder.query<
      { data: BrokerQuoteRequest[] },
      { status?: string; leadId?: string; keyword?: string }
    >({
      query: (params) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_QUOTE_REQUESTS}${buildQuery(params)}`,
        method: MethodsEnum.GET,
      }),
      providesTags: ['PortalQuotes'],
    }),

    getPortalNegotiations: builder.query<
      { data: BrokerNegotiation[] },
      { status?: string; leadId?: string; keyword?: string }
    >({
      query: (params) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_NEGOTIATIONS}${buildQuery(params)}`,
        method: MethodsEnum.GET,
      }),
      providesTags: ['PortalNegotiations'],
    }),

    getPortalOrders: builder.query<
      { data: BrokerOrder[] },
      { status?: string; leadId?: string; keyword?: string }
    >({
      query: (params) => ({
        url: `${ENDPOINTS.BROKER_PORTAL_ORDERS}${buildQuery(params)}`,
        method: MethodsEnum.GET,
      }),
      providesTags: ['PortalOrders'],
    }),

    createPortalDocument: builder.mutation<{ data: BrokerDocument }, FormData>({
      query: (body) => ({
        url: ENDPOINTS.BROKER_PORTAL_DOCUMENTS,
        method: MethodsEnum.POST,
        body,
      }),
      invalidatesTags: ['PortalDocuments', 'PortalDashboard', 'PortalLeads'],
    }),
  }),
});

export const {
  useGetPortalDashboardQuery,
  useGetPortalLeadsQuery,
  useGetPortalLeadByIdQuery,
  useCreatePortalLeadMutation,
  useUpdatePortalLeadMutation,
  useAddPortalLeadCommunicationMutation,
  useHandoffPortalLeadMutation,
  useMarkPortalLeadLostMutation,
  useCreatePortalQuoteRequestMutation,
  useCreatePortalNegotiationMutation,
  useUpdatePortalNegotiationMutation,
  useRecordPortalNegotiationUpdateMutation,
  useGetPortalQuoteRequestsQuery,
  useGetPortalNegotiationsQuery,
  useGetPortalOrdersQuery,
  useCreatePortalDocumentMutation,
} = brokerPortalApi;
