import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useCreatePortalQuoteRequestMutation,
  useGetPortalDashboardQuery,
  useGetPortalLeadsQuery,
  useGetPortalNegotiationsQuery,
  useGetPortalOrdersQuery,
  useGetPortalQuoteRequestsQuery,
} from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { showError, showSuccess } from '@redux/slices/snackbarSlice';
import { PATHS } from '@config/constants/paths';
import { resolveIcon } from '@utils/resolveMuiIcon';
import {
  LEAD_STAGE_FILTER_OPTIONS,
  LEAD_STAGE_LABELS,
  deriveLeadStage,
  type BrokerLead,
  type CreateQuoteRequestPayload,
  type LeadRelated,
  type LeadStage,
} from 'types/models/Broker';
import { brokerPortalTheme } from './brokerPortalTheme';
import BrokerPortalLeadCard, { getLeadSiteAddress } from './BrokerPortalLeadCard';
import { PortalEmptyState, PortalPageHeading, portalCardSx, portalPrimaryButtonSx } from './BrokerPortalUi';

const AddIcon = resolveIcon(AddRoundedIcon);
const SearchIcon = resolveIcon(SearchRoundedIcon);
const SendIcon = resolveIcon(SendRoundedIcon);

const dialogFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#fff' },
};

const emptyQuote: CreateQuoteRequestPayload = {
  leadId: '',
  companyName: '',
  siteAddress: '',
  wasteType: '',
  frequency: '',
  estimatedValue: 0,
  description: '',
  notes: '',
};

function getLeadId(lead: BrokerLead) {
  return String(lead._id || lead.id || '');
}

export default function BrokerPortalLeadsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [stage, setStage] = useState<'all' | LeadStage>('all');
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<CreateQuoteRequestPayload>(emptyQuote);
  const [openQuote, setOpenQuote] = useState(false);

  const { data, isLoading } = useGetPortalLeadsQuery({});
  const { data: ordersData } = useGetPortalOrdersQuery({});
  const { data: quotesData } = useGetPortalQuoteRequestsQuery({});
  const { data: negotiationsData } = useGetPortalNegotiationsQuery({});
  const { data: dashboardData } = useGetPortalDashboardQuery();
  const [createQuote, { isLoading: creatingQuote }] = useCreatePortalQuoteRequestMutation();

  const leads = data?.data || [];
  const orders = ordersData?.data || [];
  const brokerName =
    dashboardData?.data?.broker?.contactName || dashboardData?.data?.greetingName || 'Broker';

  /** Deep link from the dashboard: ?leadId=… opens that card straight away. */
  useEffect(() => {
    const requestedLeadId = searchParams.get('leadId');
    if (!requestedLeadId) return;
    setExpandedLeadId(requestedLeadId);
    setStage('all');
    setKeyword('');
    searchParams.delete('leadId');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const commissionByLead = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of orders) {
      if (['Draft', 'Cancelled'].includes(order.status)) continue;
      const leadId = String(order.leadId || '');
      totals.set(leadId, (totals.get(leadId) || 0) + Number(order.commissionAmount || 0));
    }
    return totals;
  }, [orders]);

  /**
   * The journey step is derived from the lead status plus its quotes,
   * negotiations and orders, so group those by lead once for the whole list.
   */
  const relatedByLead = useMemo(() => {
    const map = new Map<string, LeadRelated>();
    const entry = (leadId: string) => {
      const existing = map.get(leadId);
      if (existing) return existing;
      const created: LeadRelated = { quotes: [], negotiations: [], orders: [] };
      map.set(leadId, created);
      return created;
    };
    for (const quote of quotesData?.data || []) {
      entry(String(quote.leadId || '')).quotes!.push(quote);
    }
    for (const negotiation of negotiationsData?.data || []) {
      entry(String(negotiation.leadId || '')).negotiations!.push(negotiation);
    }
    for (const order of orders) {
      entry(String(order.leadId || '')).orders!.push(order);
    }
    return map;
  }, [negotiationsData, orders, quotesData]);

  const filteredLeads = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return leads.filter((lead) => {
      const leadStage = deriveLeadStage(lead, relatedByLead.get(getLeadId(lead)));
      const matchesStage = stage === 'all' || leadStage === stage;
      const matchesSearch =
        !search ||
        [lead.companyName, lead.contactName, lead.wasteType, lead.referenceCode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesStage && matchesSearch;
    });
  }, [keyword, leads, relatedByLead, stage]);

  const openConvertToQuotation = (lead: BrokerLead) => {
    setQuoteForm({
      ...emptyQuote,
      leadId: getLeadId(lead),
      companyName: lead.companyName,
      wasteType: lead.wasteType || '',
      frequency: lead.frequency || '',
      estimatedValue: lead.pipelineValue || 0,
      siteAddress: getLeadSiteAddress(lead),
      notes: lead.notes || '',
    });
    setOpenQuote(true);
  };

  const submitQuote = async () => {
    if (!quoteForm.leadId) return;
    try {
      await createQuote({ ...quoteForm, submit: true }).unwrap();
      dispatch(showSuccess('Prospect converted to quotation'));
      setOpenQuote(false);
      setQuoteForm(emptyQuote);
    } catch (error: any) {
      dispatch(showError(error?.data?.message || 'Failed to create quote request'));
    }
  };

  return (
    <Stack spacing={2.25}>
      <PortalPageHeading
        title="My Leads"
        subtitle="Follow every referral from submission through to the back office."
      />

      <Card elevation={0} sx={portalCardSx}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search leads..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: brokerPortalTheme.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8faf9' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                value={stage}
                onChange={(event) => setStage(event.target.value as 'all' | LeadStage)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8faf9' } }}
              >
                <MenuItem value="all">All Steps</MenuItem>
                {LEAD_STAGE_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {LEAD_STAGE_LABELS[option]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(PATHS.BROKER_PORTAL.SUBMIT_LEAD)}
                sx={{ ...portalPrimaryButtonSx, height: 40 }}
              >
                Submit New Lead
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading ? (
        <Stack minHeight={220} alignItems="center" justifyContent="center">
          <CircularProgress size={28} sx={{ color: brokerPortalTheme.accentGreen }} />
        </Stack>
      ) : !filteredLeads.length ? (
        <Card elevation={0} sx={portalCardSx}>
          <PortalEmptyState>
            <Typography fontWeight={850}>No leads found</Typography>
            <Typography variant="body2">Try another search or submit your first lead.</Typography>
          </PortalEmptyState>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {filteredLeads.map((lead) => {
            const leadId = getLeadId(lead);
            return (
              <BrokerPortalLeadCard
                key={leadId}
                lead={lead}
                commission={commissionByLead.get(leadId) || 0}
                expanded={expandedLeadId === leadId}
                onToggle={() => setExpandedLeadId(expandedLeadId === leadId ? null : leadId)}
                brokerName={brokerName}
                onConvertToQuotation={openConvertToQuotation}
                related={relatedByLead.get(leadId)}
              />
            );
          })}
        </Stack>
      )}

      <Dialog open={openQuote} onClose={() => setOpenQuote(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Convert to Quotation</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.75} pt={0.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Company Name"
                value={quoteForm.companyName || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, companyName: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Site Address"
                value={quoteForm.siteAddress || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, siteAddress: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Waste Type"
                value={quoteForm.wasteType || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, wasteType: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Frequency"
                value={quoteForm.frequency || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, frequency: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Estimated Value (£)"
                value={quoteForm.estimatedValue ?? 0}
                onChange={(event) =>
                  setQuoteForm({ ...quoteForm, estimatedValue: Number(event.target.value) })
                }
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                size="small"
                label="Description"
                value={quoteForm.description || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, description: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                size="small"
                label="Notes"
                value={quoteForm.notes || ''}
                onChange={(event) => setQuoteForm({ ...quoteForm, notes: event.target.value })}
                sx={dialogFieldSx}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenQuote(false)}
            sx={{ textTransform: 'none', fontWeight: 800, color: brokerPortalTheme.textSecondary }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={submitQuote}
            disabled={creatingQuote || !quoteForm.leadId}
            sx={portalPrimaryButtonSx}
          >
            {creatingQuote ? 'Submitting…' : 'Convert & Submit'}
          </Button>
        </DialogActions>
      </Dialog>

    </Stack>
  );
}
