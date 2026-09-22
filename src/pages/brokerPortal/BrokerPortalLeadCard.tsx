import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CurrencyPoundRoundedIcon from '@mui/icons-material/CurrencyPoundRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import {
  useAddPortalLeadCommunicationMutation,
  useCreatePortalDocumentMutation,
  useCreatePortalNegotiationMutation,
  useGetPortalLeadByIdQuery,
  useHandoffPortalLeadMutation,
  useMarkPortalLeadLostMutation,
  useRecordPortalNegotiationUpdateMutation,
  useUpdatePortalLeadMutation,
  useUpdatePortalNegotiationMutation,
} from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { showError as showErrorSnackbar, showSuccess } from '@redux/slices/snackbarSlice';
import PostcodeAddressLookup from '@components/autocomplete/PostcodeAddressLookup';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';
import {
  COLLECTION_TIME_SLOTS,
  COMMUNICATION_TYPES,
  LEAD_STAGE_FLOW,
  LEAD_STAGE_LABELS,
  deriveLeadStage,
  getContactedStatus,
  getLeadStageChipSx,
  getLeadStageIndex,
  type BrokerLead,
  type BrokerNegotiation,
  type CommunicationType,
  type LeadCommunicationLog,
  type LeadPriority,
  type LeadRelated,
  type LeadStage,
} from 'types/models/Broker';
import {
  BROKER_PORTAL_STAGE_DESCRIPTIONS,
  formatPortalDate,
  formatPortalMoney,
  getLeadInitials,
} from './brokerPortalFigma';
import { brokerPortalTheme } from './brokerPortalTheme';
import { portalCardSx, portalPrimaryButtonSx } from './BrokerPortalUi';

const ArrowIcon = resolveIcon(ArrowForwardRoundedIcon);
const AttachIcon = resolveIcon(AttachFileRoundedIcon);
const CheckIcon = resolveIcon(CheckRoundedIcon);
const MessageIcon = resolveIcon(ChatBubbleOutlineRoundedIcon);
const CopyIcon = resolveIcon(ContentCopyOutlinedIcon);
const EditIcon = resolveIcon(EditOutlinedIcon);
const ExpandIcon = resolveIcon(ExpandMoreRoundedIcon);
const PhoneIcon = resolveIcon(LocalPhoneOutlinedIcon);
const MailIcon = resolveIcon(MailOutlineRoundedIcon);
const PlaceIcon = resolveIcon(PlaceOutlinedIcon);

const STAGE_ICONS: Record<Exclude<LeadStage, 'Lost'>, MuiIconComponent> = {
  SubmitLead: resolveIcon(SendOutlinedIcon),
  Contact: resolveIcon(LocalPhoneOutlinedIcon),
  RequestQuote: resolveIcon(DescriptionOutlinedIcon),
  Negotiation: resolveIcon(ForumOutlinedIcon),
  PriceApproval: resolveIcon(CurrencyPoundRoundedIcon),
  ContactBackOffice: resolveIcon(SupportAgentOutlinedIcon),
};

const FREQUENCIES = [
  'Daily',
  '2x per week',
  '3x per week',
  'Weekly',
  'Fortnightly',
  'Monthly',
  'Ad-hoc / One-off',
];

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#fff' },
};

const outlinedButtonSx = {
  borderRadius: 2.5,
  textTransform: 'none' as const,
  fontWeight: 800,
  borderColor: brokerPortalTheme.cardBorder,
  color: brokerPortalTheme.textPrimary,
};

interface EditForm {
  companyName: string;
  industry: string;
  contactName: string;
  phone: string;
  email: string;
  wasteType: string;
  frequency: string;
  collectionDate: string;
  preferredTime: string;
  postalCode: string;
  collectionAddress: string;
  city: string;
  region: string;
  country: string;
  billingAddress: string;
  priority: LeadPriority;
  followUpAt: string;
  notes: string;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function toIso(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

function leadToForm(lead: BrokerLead): EditForm {
  return {
    companyName: lead.companyName || '',
    industry: lead.industry || lead.productSubtype || '',
    contactName: lead.contactName || '',
    phone: lead.phone || '',
    email: lead.email || '',
    wasteType: lead.wasteType || '',
    frequency: lead.frequency || '',
    collectionDate: toDateInput(lead.preferredCollectionDate),
    preferredTime: lead.preferredCollectionTime || lead.preferredContactTime || 'AnyTime',
    postalCode: lead.postalCode || '',
    collectionAddress: lead.addressLine1 || lead.siteAddress || '',
    city: lead.city || '',
    region: lead.region || '',
    country: lead.country || 'United Kingdom',
    billingAddress: lead.billingAddress || '',
    priority: lead.priority || 'Medium',
    followUpAt: toDateInput(lead.followUpAt),
    notes: lead.notes || '',
  };
}

export function getLeadSiteAddress(lead: BrokerLead) {
  return [lead.addressLine1 || lead.siteAddress, lead.addressLine2, lead.city, lead.postalCode]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={1.5}>
      <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={800} textAlign="right">
        {value?.trim() || 'N/A'}
      </Typography>
    </Stack>
  );
}

function FooterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        p: 1.5,
        height: '100%',
        borderRadius: 3,
        bgcolor: '#fafbfa',
        border: `1px solid ${brokerPortalTheme.cardBorder}`,
      }}
    >
      <Typography
        variant="caption"
        color={brokerPortalTheme.textSecondary}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800 }}
      >
        {title}
      </Typography>
      <Stack spacing={0.55} mt={0.8}>
        {children}
      </Stack>
    </Box>
  );
}

interface Props {
  lead: BrokerLead;
  commission: number;
  expanded: boolean;
  onToggle: () => void;
  brokerName: string;
  onConvertToQuotation: (lead: BrokerLead) => void;
  /** Quotes, negotiations and orders known before the card is expanded. */
  related?: LeadRelated;
}

export default function BrokerPortalLeadCard({
  lead,
  commission,
  expanded,
  onToggle,
  brokerName,
  onConvertToQuotation,
  related: knownRelated,
}: Props) {
  const dispatch = useAppDispatch();
  const leadId = String(lead._id || lead.id || '');
  const attachmentRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { data: detailResponse, isFetching } = useGetPortalLeadByIdQuery(leadId, {
    skip: !expanded || !leadId,
  });
  const currentLead = detailResponse?.data || lead;
  const related: LeadRelated = detailResponse?.data?.related || knownRelated || {};
  const stage = deriveLeadStage(currentLead, related);
  const stageIndex = getLeadStageIndex(stage);
  const stageProgress =
    stage === 'Lost'
      ? 100
      : Math.round((stageIndex / (LEAD_STAGE_FLOW.length - 1)) * 100);
  const activeQuote = related.quotes?.find(
    (quote) => !['Rejected', 'Cancelled', 'Draft'].includes(quote.status),
  );
  const quotePriced = activeQuote?.status === 'Quoted';
  const negotiation =
    related.negotiations?.find((item) =>
      ['Open', 'InProgress', 'AwaitingCustomer', 'Agreed'].includes(item.status),
    ) || related.negotiations?.find((item) => item.status === 'Closed');
  const order = related.orders?.find((item) => item.status !== 'Cancelled');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(() => leadToForm(lead));
  const [communicationType, setCommunicationType] =
    useState<CommunicationType>('Phone Call');
  const [communicationText, setCommunicationText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [negotiationFeedback, setNegotiationFeedback] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [approvedPrice, setApprovedPrice] = useState('');
  const [stepNote, setStepNote] = useState('');

  const [updateLead, { isLoading: updatingLead }] = useUpdatePortalLeadMutation();
  const [addCommunication, { isLoading: addingCommunication }] =
    useAddPortalLeadCommunicationMutation();
  const [createNegotiation, { isLoading: creatingNegotiation }] =
    useCreatePortalNegotiationMutation();
  const [recordNegotiationUpdate, { isLoading: recordingUpdate }] =
    useRecordPortalNegotiationUpdateMutation();
  const [updateNegotiation, { isLoading: updatingNegotiation }] =
    useUpdatePortalNegotiationMutation();
  const [handoffLead, { isLoading: handingOff }] = useHandoffPortalLeadMutation();
  const [markLeadLost, { isLoading: markingLost }] = useMarkPortalLeadLostMutation();
  const [uploadDocument, { isLoading: uploading }] = useCreatePortalDocumentMutation();

  const busy =
    updatingLead ||
    addingCommunication ||
    creatingNegotiation ||
    recordingUpdate ||
    updatingNegotiation ||
    handingOff ||
    markingLost ||
    uploading;

  const logs = currentLead.communicationLogs || [];
  const documents = related.documents || [];
  const stageDocuments = documents.filter((document) =>
    document.title?.startsWith(`${LEAD_STAGE_LABELS[stage]} -`),
  );
  const businessCard = documents.find((document) => document.type === 'BusinessCard');
  const negotiationUpdates = useMemo(
    () =>
      (negotiation?.activityLog || []).filter(
        (entry) => entry.action === 'Negotiation update',
      ),
    [negotiation?.activityLog],
  );

  useEffect(() => {
    if (expanded) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [expanded]);

  const showRequestError = (error: any, fallback: string) => {
    dispatch(showErrorSnackbar(error?.data?.message || fallback));
  };

  /** The backend overwrites the trail, so resend it with the new entry on top. */
  const withNewLog = (action: string, detail: string): LeadCommunicationLog[] => [
    { action, detail, actorName: brokerName, createdAt: new Date().toISOString() },
    ...logs,
  ];

  const saveCommunication = async () => {
    if (!communicationText.trim()) {
      dispatch(showErrorSnackbar('Add a communication summary'));
      return;
    }
    const contactedStatus = getContactedStatus(currentLead.status);
    try {
      await addCommunication({
        leadId,
        body: {
          communicationLogs: withNewLog(communicationType, communicationText.trim()),
          ...(followUpDate ? { followUpAt: toIso(followUpDate) } : {}),
          ...(contactedStatus ? { status: contactedStatus } : {}),
        },
      }).unwrap();
      setCommunicationText('');
      dispatch(showSuccess('Communication logged'));
    } catch (error: any) {
      showRequestError(error, 'Failed to log communication');
    }
  };

  const ensureNegotiation = async (): Promise<BrokerNegotiation | null> => {
    if (negotiation) return negotiation;
    if (!activeQuote) {
      dispatch(showErrorSnackbar('Submit a quotation before starting negotiation'));
      return null;
    }
    if (activeQuote.status !== 'Quoted') {
      dispatch(
        showErrorSnackbar('Wait for London Waste Management to price your quote first'),
      );
      return null;
    }
    try {
      const result = await createNegotiation({
        leadId,
        quoteRequestId: String(activeQuote._id || activeQuote.id || ''),
        companyName: currentLead.companyName,
        quotedAmount: activeQuote.quotedAmount || activeQuote.estimatedValue || 0,
        priority: currentLead.priority,
      }).unwrap();
      return result.data;
    } catch (error: any) {
      if (error?.status === 409 && error?.data?.data) return error.data.data;
      showRequestError(error, 'Failed to start negotiation');
      return null;
    }
  };

  const saveNegotiationUpdate = async () => {
    if (!negotiationFeedback.trim() && !proposedPrice) {
      dispatch(showErrorSnackbar('Add customer feedback or a proposed price'));
      return;
    }
    const target = await ensureNegotiation();
    const targetId = String(target?._id || target?.id || '');
    if (!targetId) return;
    try {
      await recordNegotiationUpdate({
        negotiationId: targetId,
        detail: negotiationFeedback.trim(),
        proposedPrice: proposedPrice ? Number(proposedPrice) : null,
      }).unwrap();
      setNegotiationFeedback('');
      setProposedPrice('');
      dispatch(showSuccess('Negotiation update recorded'));
    } catch (error: any) {
      showRequestError(error, 'Failed to record negotiation update');
    }
  };

  const continueToNegotiation = async () => {
    const target = await ensureNegotiation();
    if (target) dispatch(showSuccess('Negotiation started'));
  };

  const continueToPriceApproval = async () => {
    const targetId = String(negotiation?._id || negotiation?.id || '');
    if (!targetId) return;
    if (!negotiationUpdates.length && negotiation?.counterOffer == null) {
      dispatch(showErrorSnackbar('Record a negotiation update before continuing'));
      return;
    }
    try {
      await updateNegotiation({
        negotiationId: targetId,
        body: { status: 'AwaitingCustomer' },
      }).unwrap();
      dispatch(showSuccess('Moved to price approval'));
    } catch (error: any) {
      showRequestError(error, 'Failed to move to price approval');
    }
  };

  const approvePrice = async () => {
    const targetId = String(negotiation?._id || negotiation?.id || '');
    const amount = approvedPrice
      ? Number(approvedPrice)
      : negotiation?.counterOffer || negotiation?.quotedAmount || 0;
    if (!targetId || amount <= 0) {
      dispatch(showErrorSnackbar('Enter the price accepted by the customer'));
      return;
    }
    try {
      await updateNegotiation({
        negotiationId: targetId,
        body: { status: 'Agreed', agreedAmount: amount },
      }).unwrap();
      setApprovedPrice('');
      dispatch(showSuccess('Customer price approval recorded'));
    } catch (error: any) {
      showRequestError(error, 'Failed to approve price');
    }
  };

  const handoff = async () => {
    const negotiationId = String(negotiation?._id || negotiation?.id || '');
    if (!negotiationId) {
      dispatch(showErrorSnackbar('Agree a price with the customer first'));
      return;
    }
    try {
      const result = await handoffLead({
        leadId,
        negotiationId,
        companyName: currentLead.companyName,
        orderAmount: negotiation?.agreedAmount ?? null,
        notes: stepNote.trim(),
      }).unwrap();
      setStepNote('');
      dispatch(
        showSuccess(`Draft order ${result.data.referenceCode} sent to the back office`),
      );
    } catch (error: any) {
      showRequestError(error, 'Failed to notify the back office');
    }
  };

  const saveStepNote = async () => {
    if (!stepNote.trim()) {
      dispatch(showErrorSnackbar('Write a note before saving'));
      return;
    }
    try {
      await addCommunication({
        leadId,
        body: {
          communicationLogs: withNewLog(
            'Internal Note',
            `[${LEAD_STAGE_LABELS[stage]}] ${stepNote.trim()}`,
          ),
        },
      }).unwrap();
      setStepNote('');
      dispatch(showSuccess('Step note added'));
    } catch (error: any) {
      showRequestError(error, 'Failed to save note');
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('leadId', leadId);
      body.append('companyName', currentLead.companyName);
      body.append('title', `${LEAD_STAGE_LABELS[stage]} - ${file.name}`);
      body.append('type', 'Other');
      await uploadDocument(body).unwrap();
      dispatch(showSuccess('Attachment uploaded'));
    } catch (error: any) {
      showRequestError(error, 'Failed to upload attachment');
    }
  };

  const saveDetails = async () => {
    if (!editForm.companyName.trim() || !editForm.contactName.trim()) {
      dispatch(showErrorSnackbar('Company and contact name are required'));
      return;
    }
    try {
      await updateLead({
        leadId,
        body: {
          companyName: editForm.companyName.trim(),
          industry: editForm.industry.trim(),
          contactName: editForm.contactName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
          wasteType: editForm.wasteType.trim(),
          frequency: editForm.frequency,
          preferredCollectionDate: toIso(editForm.collectionDate),
          preferredCollectionTime: editForm.preferredTime,
          addressLine1: editForm.collectionAddress.trim(),
          city: editForm.city,
          region: editForm.region,
          postalCode: editForm.postalCode,
          country: editForm.country,
          billingAddress: editForm.billingAddress.trim(),
          priority: editForm.priority,
          followUpAt: toIso(editForm.followUpAt),
          notes: editForm.notes.trim(),
        },
      }).unwrap();
      setEditing(false);
      dispatch(showSuccess('Prospect updated'));
    } catch (error: any) {
      showRequestError(error, 'Failed to update prospect');
    }
  };

  const markLost = async () => {
    try {
      await markLeadLost({ leadId }).unwrap();
      dispatch(showSuccess('Prospect marked as lost'));
    } catch (error: any) {
      showRequestError(error, 'Failed to mark prospect as lost');
    }
  };

  const renderCurrentStep = () => {
    if (stage === 'Lost') {
      return (
        <Typography color={brokerPortalTheme.textSecondary}>
          This opportunity is closed. You can still review its history and documents.
        </Typography>
      );
    }
    if (stage === 'SubmitLead' || stage === 'Contact') {
      return (
        <Stack spacing={1.5}>
          <Typography fontWeight={800}>Interaction Notes</Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {COMMUNICATION_TYPES.map((type) => (
              <Chip
                key={type}
                size="small"
                label={type}
                onClick={() => setCommunicationType(type)}
                sx={{
                  fontWeight: 800,
                  bgcolor:
                    communicationType === type ? brokerPortalTheme.accentGreenTint : '#fff',
                  color:
                    communicationType === type
                      ? brokerPortalTheme.accentGreen
                      : brokerPortalTheme.textSecondary,
                  border: `1px solid ${
                    communicationType === type
                      ? brokerPortalTheme.accentGreen
                      : brokerPortalTheme.cardBorder
                  }`,
                }}
              />
            ))}
          </Stack>
          <Grid container spacing={1}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a contact update..."
                value={communicationText}
                onChange={(event) => setCommunicationText(event.target.value)}
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Follow-up date"
                InputLabelProps={{ shrink: true }}
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
                sx={fieldSx}
              />
            </Grid>
          </Grid>
          <Box>
            <Button
              variant="contained"
              onClick={saveCommunication}
              disabled={busy}
              sx={portalPrimaryButtonSx}
            >
              Record interaction
            </Button>
          </Box>
          {logs.length > 0 && (
            <Stack spacing={0.75}>
              {logs.slice(0, 5).map((entry, index) => (
                <Box
                  key={`${entry.createdAt}-${index}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: '#fafbfa',
                    border: `1px solid ${brokerPortalTheme.cardBorder}`,
                  }}
                >
                  <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                    {entry.action} · {formatPortalDate(entry.createdAt)} · {entry.actorName}
                  </Typography>
                  <Typography fontSize={13.5}>{entry.detail}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      );
    }
    if (stage === 'RequestQuote') {
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Request a Quote</Typography>
          {activeQuote ? (
            <>
              <FooterCard title={quotePriced ? 'LWM price ready' : 'Waiting for LWM pricing'}>
                <InfoRow label="Reference" value={activeQuote.referenceCode} />
                <InfoRow
                  label="Status"
                  value={
                    quotePriced
                      ? 'Priced by Back Office'
                      : activeQuote.status === 'InReview'
                        ? 'In review at LWM'
                        : 'Submitted — awaiting price'
                  }
                />
                <InfoRow
                  label="Your estimate"
                  value={formatPortalMoney(activeQuote.estimatedValue)}
                />
                {quotePriced && (
                  <InfoRow
                    label="LWM quoted amount"
                    value={formatPortalMoney(activeQuote.quotedAmount)}
                  />
                )}
              </FooterCard>
              <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                {quotePriced
                  ? 'LWM has priced this quote. Continue to Negotiation to discuss it with the customer.'
                  : 'Your quote is with the LWM team. Negotiation unlocks once they set the price.'}
              </Typography>
            </>
          ) : (
            <Typography color={brokerPortalTheme.textSecondary}>
              Send the collection details to LWM so they can price the job.
            </Typography>
          )}
        </Stack>
      );
    }
    if (stage === 'Negotiation') {
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Negotiation</Typography>
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            Track discussions, customer offers and price changes.
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                label="Update / customer feedback"
                placeholder="e.g. Customer countered, wants weekly collection..."
                value={negotiationFeedback}
                onChange={(event) => setNegotiationFeedback(event.target.value)}
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Proposed price (£)"
                value={proposedPrice}
                onChange={(event) => setProposedPrice(event.target.value)}
                sx={fieldSx}
              />
            </Grid>
          </Grid>
          <Box>
            <Button
              variant="contained"
              onClick={saveNegotiationUpdate}
              disabled={busy}
              sx={portalPrimaryButtonSx}
            >
              + Record update
            </Button>
          </Box>
          {negotiationUpdates.length ? (
            <Stack spacing={0.75}>
              {negotiationUpdates.map((entry, index) => (
                <Box
                  key={`${entry.createdAt}-${index}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: '#fafbfa',
                    border: `1px solid ${brokerPortalTheme.cardBorder}`,
                  }}
                >
                  <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                    {formatPortalDate(entry.createdAt)} · {entry.actorName}
                  </Typography>
                  <Typography fontSize={13.5}>{entry.detail}</Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color={brokerPortalTheme.textSecondary} textAlign="center">
              No negotiation updates yet.
            </Typography>
          )}
        </Stack>
      );
    }
    if (stage === 'PriceApproval') {
      const suggested =
        negotiation?.agreedAmount || negotiation?.counterOffer || negotiation?.quotedAmount || 0;
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Price Approval</Typography>
          <FooterCard title="Commercial summary">
            <InfoRow
              label="Quoted price"
              value={formatPortalMoney(negotiation?.quotedAmount)}
            />
            <InfoRow
              label="Latest proposed price"
              value={formatPortalMoney(negotiation?.counterOffer)}
            />
            <InfoRow
              label="Agreed price"
              value={
                negotiation?.agreedAmount
                  ? formatPortalMoney(negotiation.agreedAmount)
                  : 'Awaiting approval'
              }
            />
          </FooterCard>
          {negotiation?.status !== 'Agreed' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Customer-approved price (£)"
                value={approvedPrice || (suggested ? String(suggested) : '')}
                onChange={(event) => setApprovedPrice(event.target.value)}
                sx={fieldSx}
              />
              <Button
                variant="contained"
                onClick={approvePrice}
                disabled={busy}
                sx={{ ...portalPrimaryButtonSx, whiteSpace: 'nowrap' }}
              >
                Confirm approval
              </Button>
            </Stack>
          )}
        </Stack>
      );
    }
    return (
      <Stack spacing={1.25}>
        <Typography fontWeight={800}>Back Office Handoff</Typography>
        <FooterCard title="LWM status">
          <InfoRow
            label="Draft order"
            value={order ? order.referenceCode : 'Not raised yet'}
          />
          <InfoRow
            label="Back office"
            value={
              !order
                ? 'Not notified yet'
                : order.status === 'Draft'
                  ? 'Notified — awaiting confirmation'
                  : order.status === 'Cancelled'
                    ? 'Declined by the back office'
                    : `Order confirmed · ${order.status}`
            }
          />
          <InfoRow label="Agreed price" value={formatPortalMoney(negotiation?.agreedAmount)} />
        </FooterCard>
        {order?.status === 'Draft' && (
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            The LWM team has your draft order and will confirm it shortly.
          </Typography>
        )}
      </Stack>
    );
  };

  const renderContinue = () => {
    if (stage === 'Lost' || stage === 'ContactBackOffice') return null;
    if (stage === 'SubmitLead') {
      return (
        <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
          Log the first interaction to continue to Contact.
        </Typography>
      );
    }
    if (stage === 'Contact') {
      return (
        <Button
          variant="contained"
          endIcon={<ArrowIcon />}
          onClick={() => onConvertToQuotation(currentLead)}
          disabled={!logs.length || busy}
          sx={portalPrimaryButtonSx}
        >
          Continue to Request a Quote
        </Button>
      );
    }
    if (stage === 'RequestQuote') {
      return (
        <Button
          variant="contained"
          endIcon={<ArrowIcon />}
          onClick={continueToNegotiation}
          disabled={!quotePriced || busy}
          sx={portalPrimaryButtonSx}
        >
          {quotePriced ? 'Continue to Negotiation' : 'Waiting for LWM price'}
        </Button>
      );
    }
    if (stage === 'Negotiation') {
      return (
        <Button
          variant="contained"
          endIcon={<ArrowIcon />}
          onClick={continueToPriceApproval}
          disabled={busy}
          sx={portalPrimaryButtonSx}
        >
          Continue to Price Approval
        </Button>
      );
    }
    return (
      <Button
        variant="contained"
        endIcon={<ArrowIcon />}
        onClick={handoff}
        disabled={negotiation?.status !== 'Agreed' || busy}
        sx={portalPrimaryButtonSx}
      >
        Send draft order to Back Office
      </Button>
    );
  };

  return (
    <Box ref={cardRef} sx={{ ...portalCardSx, overflow: 'hidden' }}>
      <Box
        onClick={onToggle}
        sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: '#fbfcfb' } }}
      >
        <Stack direction="row" spacing={1.35} alignItems="flex-start">
          <Avatar
            sx={{
              width: 46,
              height: 46,
              bgcolor: '#eef1ef',
              color: brokerPortalTheme.textPrimary,
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            {getLeadInitials(lead.companyName)}
          </Avatar>
          <Box minWidth={0} flex={1}>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={900}>{lead.companyName}</Typography>
                <Chip
                  size="small"
                  label={LEAD_STAGE_LABELS[stage]}
                  sx={{ height: 22, ...getLeadStageChipSx(stage) }}
                />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {commission > 0 && (
                  <Chip
                    size="small"
                    label={`${formatPortalMoney(commission)} comm.`}
                    sx={{
                      bgcolor: brokerPortalTheme.orangeLight,
                      color: '#c2410c',
                      fontWeight: 800,
                    }}
                  />
                )}
                <ExpandIcon
                  sx={{
                    color: brokerPortalTheme.textSecondary,
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 180ms ease',
                  }}
                />
              </Stack>
            </Stack>
            <Typography variant="body2" color={brokerPortalTheme.textSecondary} mt={0.6}>
              {lead.contactName}
              {lead.wasteType ? ` · ${lead.wasteType}` : ''}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          mt={1.5}
          p={1.25}
          sx={{ bgcolor: '#f7f9f8', borderRadius: 3 }}
        >
          <MessageIcon sx={{ mt: 0.15, fontSize: 17, color: brokerPortalTheme.textSecondary }} />
          <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
            {lead.notes?.trim() || 'No notes added.'}
          </Typography>
        </Stack>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box p={{ xs: 2, sm: 2.5 }}>
          {isFetching ? (
            <LinearProgress sx={{ borderRadius: 99 }} />
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography
                    variant="caption"
                    color={brokerPortalTheme.textSecondary}
                    sx={{ letterSpacing: '0.08em', fontWeight: 800 }}
                  >
                    CURRENT STAGE ·{' '}
                    {stage === 'Lost'
                      ? 'LOST'
                      : `STEP ${Math.max(stageIndex + 1, 1)} OF 6`}
                  </Typography>
                  <Typography fontWeight={900} fontSize={19}>
                    {LEAD_STAGE_LABELS[stage]}
                  </Typography>
                  <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
                    {BROKER_PORTAL_STAGE_DESCRIPTIONS[stage]}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography fontWeight={900} color={brokerPortalTheme.accentGreen}>
                    {stageProgress}%
                  </Typography>
                  <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                    complete
                  </Typography>
                </Box>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={stageProgress}
                sx={{
                  mt: 1.25,
                  height: 6,
                  borderRadius: 99,
                  bgcolor: brokerPortalTheme.accentGreenLight,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: brokerPortalTheme.accentGreen,
                    borderRadius: 99,
                  },
                }}
              />
              <Grid container spacing={1} mt={0.5}>
                {LEAD_STAGE_FLOW.map((flowStage, index) => {
                  const StageIcon = STAGE_ICONS[flowStage];
                  const done = stageIndex > index;
                  const active = stageIndex === index;
                  return (
                    <Grid item xs={6} sm={4} md={2} key={flowStage}>
                      <Stack
                        alignItems="center"
                        spacing={0.45}
                        sx={{
                          height: '100%',
                          p: 1,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          bgcolor: active ? brokerPortalTheme.accentGreenTint : '#fff',
                          border: `1px solid ${
                            active ? brokerPortalTheme.accentGreen : brokerPortalTheme.cardBorder
                          }`,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 29,
                            height: 29,
                            bgcolor: done || active ? brokerPortalTheme.accentGreen : '#f1f5f4',
                            color: done || active ? '#fff' : brokerPortalTheme.textSecondary,
                          }}
                        >
                          {done ? (
                            <CheckIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <StageIcon sx={{ fontSize: 16 }} />
                          )}
                        </Avatar>
                        <Typography variant="caption" fontSize={9} fontWeight={800}>
                          STEP {index + 1}
                        </Typography>
                        <Typography fontSize={11} fontWeight={800} lineHeight={1.15}>
                          {LEAD_STAGE_LABELS[flowStage]}
                        </Typography>
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}
        </Box>

        {!isFetching && (
          <>
            <Divider />
            <Box p={{ xs: 2, sm: 2.5 }}>{renderCurrentStep()}</Box>

            <Divider />
            <Box p={{ xs: 2, sm: 2.5 }}>
              <Typography fontWeight={800} mb={1}>
                Notes
              </Typography>
              <input
                ref={attachmentRef}
                hidden
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (attachmentRef.current) attachmentRef.current.value = '';
                  if (file) void uploadAttachment(file);
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Write a note for the ${LEAD_STAGE_LABELS[stage]} step...`}
                  value={stepNote}
                  onChange={(event) => setStepNote(event.target.value)}
                  sx={fieldSx}
                />
                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={() => attachmentRef.current?.click()}
                    disabled={busy}
                    sx={{ border: `1px solid ${brokerPortalTheme.cardBorder}`, borderRadius: 2.5 }}
                  >
                    <AttachIcon fontSize="small" />
                  </IconButton>
                  <Button
                    variant="contained"
                    onClick={saveStepNote}
                    disabled={busy}
                    sx={portalPrimaryButtonSx}
                  >
                    Add
                  </Button>
                </Stack>
              </Stack>
              {stageDocuments.map((document) => (
                <Stack
                  key={document._id || document.id}
                  direction="row"
                  spacing={1}
                  mt={1}
                  alignItems="center"
                >
                  <AttachIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" fontWeight={800} flex={1} noWrap>
                    {document.fileName}
                  </Typography>
                  <Button
                    size="small"
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </Button>
                </Stack>
              ))}
            </Box>

            {renderContinue() && (
              <Box px={{ xs: 2, sm: 2.5 }} pb={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={1}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: brokerPortalTheme.accentGreenTint,
                    border: `1px solid ${brokerPortalTheme.greenBorder}`,
                  }}
                >
                  <Box>
                    <Typography fontWeight={800} fontSize={13.5}>
                      Finished with {LEAD_STAGE_LABELS[stage]}?
                    </Typography>
                    <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                      Your LWM team sees every update in this workflow.
                    </Typography>
                  </Box>
                  {renderContinue()}
                </Stack>
              </Box>
            )}

            <Box
              p={{ xs: 2, sm: 2.5 }}
              sx={{ bgcolor: '#fafbfa', borderTop: `1px solid ${brokerPortalTheme.cardBorder}` }}
            >
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <FooterCard title="Lead details">
                    <Stack direction="row" spacing={0.75}>
                      <PhoneIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{currentLead.phone || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75}>
                      <MailIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{currentLead.email || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75}>
                      <PlaceIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{getLeadSiteAddress(currentLead)}</Typography>
                    </Stack>
                  </FooterCard>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FooterCard title="Waste details">
                    <InfoRow label="Type" value={currentLead.wasteType} />
                    <InfoRow label="Frequency" value={currentLead.frequency} />
                    <InfoRow label="Time slot" value={currentLead.preferredCollectionTime} />
                  </FooterCard>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FooterCard title="Timeline">
                    <InfoRow label="Submitted" value={formatPortalDate(currentLead.createdAt)} />
                    <InfoRow label="Last update" value={formatPortalDate(currentLead.updatedAt)} />
                    <InfoRow label="Reference" value={currentLead.referenceCode} />
                  </FooterCard>
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1.5}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setEditForm(leadToForm(currentLead));
                    setEditing((value) => !value);
                  }}
                  sx={outlinedButtonSx}
                >
                  Edit Prospect
                </Button>
                {businessCard && (
                  <Button
                    size="small"
                    variant="outlined"
                    href={businessCard.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={outlinedButtonSx}
                  >
                    Open business card
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={markLost}
                  disabled={
                    busy ||
                    currentLead.status === 'Lost' ||
                    currentLead.status === 'Converted'
                  }
                  sx={{ ...outlinedButtonSx, color: '#dc2626', borderColor: '#fecaca' }}
                >
                  Mark as Lost
                </Button>
              </Stack>

              {editing && (
                <Box mt={2}>
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Company Name"
                        value={editForm.companyName}
                        onChange={(event) =>
                          setEditForm({ ...editForm, companyName: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Industry"
                        value={editForm.industry}
                        onChange={(event) =>
                          setEditForm({ ...editForm, industry: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Contact Name"
                        value={editForm.contactName}
                        onChange={(event) =>
                          setEditForm({ ...editForm, contactName: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Phone"
                        value={editForm.phone}
                        onChange={(event) =>
                          setEditForm({ ...editForm, phone: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Email"
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm({ ...editForm, email: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Waste Type"
                        value={editForm.wasteType}
                        onChange={(event) =>
                          setEditForm({ ...editForm, wasteType: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        size="small"
                        label="Collection Frequency"
                        value={editForm.frequency}
                        onChange={(event) =>
                          setEditForm({ ...editForm, frequency: event.target.value })
                        }
                        sx={fieldSx}
                      >
                        <MenuItem value="">Select frequency...</MenuItem>
                        {FREQUENCIES.map((frequency) => (
                          <MenuItem key={frequency} value={frequency}>
                            {frequency}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Preferred Collection Date"
                        InputLabelProps={{ shrink: true }}
                        value={editForm.collectionDate}
                        onChange={(event) =>
                          setEditForm({ ...editForm, collectionDate: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        size="small"
                        label="Preferred Time Slot"
                        value={editForm.preferredTime}
                        onChange={(event) =>
                          setEditForm({ ...editForm, preferredTime: event.target.value })
                        }
                        sx={fieldSx}
                      >
                        {COLLECTION_TIME_SLOTS.map((slot) => (
                          <MenuItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <PostcodeAddressLookup
                        postcode={editForm.postalCode}
                        onPostcodeChange={(postalCode) =>
                          setEditForm((current) => ({ ...current, postalCode }))
                        }
                        onAddressSelect={(address) =>
                          setEditForm((current) => ({
                            ...current,
                            postalCode: address.postalCode,
                            collectionAddress: [address.addressLine1, address.addressLine2]
                              .filter(Boolean)
                              .join(', '),
                            city: address.city,
                            region: address.region,
                            country: address.country || 'United Kingdom',
                          }))
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        label="Collection Address"
                        value={editForm.collectionAddress}
                        onChange={(event) =>
                          setEditForm({ ...editForm, collectionAddress: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        label="Billing Address"
                        value={editForm.billingAddress}
                        onChange={(event) =>
                          setEditForm({ ...editForm, billingAddress: event.target.value })
                        }
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              size="small"
                              onClick={() =>
                                setEditForm((current) => ({
                                  ...current,
                                  billingAddress: current.collectionAddress,
                                }))
                              }
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          ),
                        }}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        select
                        size="small"
                        label="Priority"
                        value={editForm.priority}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            priority: event.target.value as LeadPriority,
                          })
                        }
                        sx={fieldSx}
                      >
                        {(['High', 'Medium', 'Low'] as LeadPriority[]).map((priority) => (
                          <MenuItem key={priority} value={priority}>
                            {priority}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Follow-up Date"
                        InputLabelProps={{ shrink: true }}
                        value={editForm.followUpAt}
                        onChange={(event) =>
                          setEditForm({ ...editForm, followUpAt: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Notes"
                        value={editForm.notes}
                        onChange={(event) =>
                          setEditForm({ ...editForm, notes: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                  </Grid>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1.25}>
                    <Button onClick={() => setEditing(false)} sx={outlinedButtonSx}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={saveDetails}
                      disabled={busy}
                      sx={portalPrimaryButtonSx}
                    >
                      Save Changes
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </>
        )}
      </Collapse>
    </Box>
  );
}
