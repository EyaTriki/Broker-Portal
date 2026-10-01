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
import { dateInputToIso, toDateInputValue } from '@utils/dateUtils';
import {
  COLLECTION_DAYS,
  COLLECTION_FREQUENCIES,
  COLLECTION_TIME_SLOTS,
  COMMUNICATION_TYPES,
  LEAD_STAGE_FLOW,
  LEAD_STAGE_LABELS,
  deriveLeadProgressStage,
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
  BROKER_PORTAL_STAGE_HINTS,
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
  firstName: string;
  lastName: string;
  contactName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  wasteType: string;
  binSize: string;
  frequency: string;
  collectionDays: string[];
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

function splitContactName(lead: BrokerLead) {
  if (lead.firstName || lead.lastName) {
    return { firstName: lead.firstName || '', lastName: lead.lastName || '' };
  }
  const parts = (lead.contactName || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function leadToForm(lead: BrokerLead): EditForm {
  const name = splitContactName(lead);
  return {
    companyName: lead.companyName || '',
    industry: lead.industry || lead.productSubtype || '',
    firstName: name.firstName,
    lastName: name.lastName,
    contactName: lead.contactName || '',
    phone: lead.phone || '',
    secondaryPhone: lead.secondaryPhone || '',
    email: lead.email || '',
    wasteType: lead.wasteType || '',
    binSize: lead.binSize || lead.estimatedQuantity || '',
    frequency: lead.frequency || '',
    collectionDays: (lead.preferredCollectionDays || '')
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean),
    collectionDate: toDateInputValue(lead.preferredCollectionDate),
    preferredTime: lead.preferredCollectionTime || lead.preferredContactTime || 'AnyTime',
    postalCode: lead.postalCode || '',
    collectionAddress: lead.addressLine1 || lead.siteAddress || '',
    city: lead.city || '',
    region: lead.region || '',
    country: lead.country || 'United Kingdom',
    billingAddress: lead.billingAddress || '',
    priority: lead.priority || 'Medium',
    followUpAt: toDateInputValue(lead.followUpAt),
    notes: lead.notes || '',
  };
}

export function getLeadSiteAddress(lead: BrokerLead) {
  return [lead.addressLine1 || lead.siteAddress, lead.addressLine2, lead.city, lead.postalCode]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function SummaryField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color={brokerPortalTheme.textSecondary}
        sx={{ letterSpacing: '0.06em', fontWeight: 800 }}
      >
        {label}
      </Typography>
      <Typography fontWeight={800}>{value?.trim() || 'N/A'}</Typography>
    </Box>
  );
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
  const progressStage = deriveLeadProgressStage(currentLead, related);
  const progressIndex = getLeadStageIndex(progressStage);
  const nextStage = LEAD_STAGE_FLOW[progressIndex + 1];
  const stageProgress =
    stage === 'Lost'
      ? 100
      : Math.round((progressIndex / (LEAD_STAGE_FLOW.length - 1)) * 100);
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
  const [communicationType, setCommunicationType] = useState<CommunicationType>('Call');
  const [communicationText, setCommunicationText] = useState('');
  const [negotiationFeedback, setNegotiationFeedback] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [approvedPrice, setApprovedPrice] = useState('');
  const [stepNote, setStepNote] = useState('');
  const [selectedStage, setSelectedStage] = useState<Exclude<LeadStage, 'Lost'> | null>(null);

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

  const viewedStage: Exclude<LeadStage, 'Lost'> =
    selectedStage !== null && getLeadStageIndex(selectedStage) <= progressIndex
      ? selectedStage
      : progressStage;

  const logs = currentLead.communicationLogs || [];
  const documents = related.documents || [];
  const stageLabel = LEAD_STAGE_LABELS[viewedStage];
  const stageDocuments = documents.filter((document) =>
    document.title?.startsWith(`${stageLabel} -`),
  );
  const stageNotes = logs.filter((entry) => entry.detail?.startsWith(`[${stageLabel}]`));
  const businessCard = documents.find((document) => document.type === 'BusinessCard');
  const profileImage = documents.find((document) => {
    const mime = document.mimeType || '';
    const name = `${document.fileName || ''} ${document.fileUrl || ''}`;
    return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(name);
  });
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
        body: {
          agreedAmount: amount,
          ...(negotiation?.status === 'Closed' ? {} : { status: 'Agreed' }),
        },
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
            `[${LEAD_STAGE_LABELS[viewedStage]}] ${stepNote.trim()}`,
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
      body.append('title', `${LEAD_STAGE_LABELS[viewedStage]} - ${file.name}`);
      body.append('type', 'Other');
      await uploadDocument(body).unwrap();
      dispatch(showSuccess('Attachment uploaded'));
    } catch (error: any) {
      showRequestError(error, 'Failed to upload attachment');
    }
  };

  const saveDetails = async () => {
    const contactName = [editForm.firstName, editForm.lastName].filter(Boolean).join(' ').trim();
    if (!editForm.companyName.trim() || !contactName) {
      dispatch(showErrorSnackbar('Company and contact name are required'));
      return;
    }
    try {
      await updateLead({
        leadId,
        body: {
          companyName: editForm.companyName.trim(),
          industry: editForm.industry.trim(),
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          contactName,
          phone: editForm.phone.trim(),
          secondaryPhone: editForm.secondaryPhone.trim(),
          email: editForm.email.trim(),
          wasteType: editForm.wasteType.trim(),
          binSize: editForm.binSize.trim(),
          frequency: editForm.frequency,
          preferredCollectionDays: editForm.collectionDays.join(','),
          preferredCollectionDate: dateInputToIso(editForm.collectionDate),
          preferredCollectionTime: editForm.preferredTime,
          addressLine1: editForm.collectionAddress.trim(),
          city: editForm.city,
          region: editForm.region,
          postalCode: editForm.postalCode,
          country: editForm.country,
          billingAddress: editForm.billingAddress.trim(),
          priority: editForm.priority,
          followUpAt: dateInputToIso(editForm.followUpAt),
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

  const continueToContact = async () => {
    try {
      await updateLead({ leadId, body: { status: 'Contacted' } }).unwrap();
      setSelectedStage('Contact');
      dispatch(showSuccess('Lead moved to Contact'));
    } catch (error: any) {
      showRequestError(error, 'Failed to move the lead to Contact');
    }
  };

  const renderCurrentStep = () => {
    if (viewedStage === 'SubmitLead') {
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography fontWeight={800}>Submit Lead</Typography>
            <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
              Review, update and validate the lead information
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <SummaryField label="COMPANY" value={currentLead.companyName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SummaryField label="CONTACT PERSON" value={currentLead.contactName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SummaryField label="PHONE" value={currentLead.phone} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SummaryField label="EMAIL" value={currentLead.email} />
            </Grid>
            <Grid item xs={12}>
              <SummaryField label="ADDRESS" value={getLeadSiteAddress(currentLead)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SummaryField label="WASTE TYPE" value={currentLead.wasteType} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SummaryField
                label="VALIDATION STATUS"
                value={currentLead.status === 'Draft' ? 'Draft' : 'Validated'}
              />
            </Grid>
          </Grid>
        </Stack>
      );
    }
    if (viewedStage === 'Contact') {
      return (
        <Stack spacing={1.5}>
          <Box>
            <Typography fontWeight={800}>Contact Information</Typography>
            <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
              Reach out to the prospect
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}>
              <SummaryField label="PHONE" value={currentLead.phone} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <SummaryField label="EMAIL" value={currentLead.email} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <SummaryField label="ADDRESS" value={getLeadSiteAddress(currentLead)} />
            </Grid>
          </Grid>
          <Typography fontWeight={800}>Interaction Notes</Typography>
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            Log calls, emails, meetings and other touchpoints
          </Typography>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Add a ${communicationType.toLowerCase()} note...`}
              value={communicationText}
              onChange={(event) => setCommunicationText(event.target.value)}
              sx={fieldSx}
            />
            <Button
              variant="contained"
              onClick={saveCommunication}
              disabled={busy}
              sx={portalPrimaryButtonSx}
            >
              Add
            </Button>
          </Stack>
          {logs.length > 0 ? (
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
          ) : (
            <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
              No notes yet — log your first interaction.
            </Typography>
          )}
        </Stack>
      );
    }
    if (viewedStage === 'RequestQuote') {
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Request a Quote</Typography>
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            {BROKER_PORTAL_STAGE_DESCRIPTIONS.RequestQuote}
          </Typography>
          {activeQuote ? (
            <>
              <Box>
                <Typography fontWeight={800}>Quotation request submitted</Typography>
                <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                  Sent to the pricing team for review.
                </Typography>
              </Box>
              <FooterCard title={quotePriced ? 'LWM price ready' : 'Waiting for LWM pricing'}>
                <InfoRow label="Description" value={activeQuote.description} />
                <InfoRow
                  label="Proposed price"
                  value={formatPortalMoney(activeQuote.estimatedValue)}
                />
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
            </>
          ) : (
            <Typography color={brokerPortalTheme.textSecondary}>
              Send the collection details to LWM so they can price the job.
            </Typography>
          )}
        </Stack>
      );
    }
    if (viewedStage === 'Negotiation') {
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Negotiation</Typography>
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            {BROKER_PORTAL_STAGE_DESCRIPTIONS.Negotiation}
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
                placeholder="e.g. 295"
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
              Record update
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
    if (viewedStage === 'PriceApproval') {
      const suggested =
        negotiation?.agreedAmount || negotiation?.counterOffer || negotiation?.quotedAmount || 0;
      return (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>Price Approval</Typography>
          <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
            {BROKER_PORTAL_STAGE_DESCRIPTIONS.PriceApproval}
          </Typography>
          {negotiation?.status === 'Agreed' && (
            <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
              Customer has agreed. Ready to send to the back office.
            </Typography>
          )}
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Agreed final price (£)"
              value={approvedPrice || (suggested ? String(suggested) : '')}
              onChange={(event) => setApprovedPrice(event.target.value)}
              sx={fieldSx}
            />
            <Button
              variant="contained"
              onClick={approvePrice}
              disabled={busy || !negotiation}
              sx={{ ...portalPrimaryButtonSx, whiteSpace: 'nowrap' }}
            >
              Customer accepted
            </Button>
          </Stack>
        </Stack>
      );
    }
    return (
      <Stack spacing={1.25}>
        <Typography fontWeight={800}>Contact Back Office</Typography>
        <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
          Send the validated request so the back office can create the order
        </Typography>
        {order ? (
          <Box>
            <Typography fontWeight={800}>Sent to the back office</Typography>
            <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
              The back-office team will now create the official order and confirm it.
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
            Once the customer has accepted the final price, send the validated request to the back
            office to create the order.
          </Typography>
        )}
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
      </Stack>
    );
  };

  const renderContinue = () => {
    if (stage === 'Lost' || stage === 'ContactBackOffice') return null;
    if (stage === 'SubmitLead') {
      return (
        <Button
          variant="contained"
          endIcon={<ArrowIcon />}
          onClick={continueToContact}
          disabled={busy}
          sx={portalPrimaryButtonSx}
        >
          Continue to Contact
        </Button>
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
        Continue to Contact Back Office
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
            src={profileImage?.fileUrl || undefined}
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
          {isFetching && !detailResponse ? (
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
                    CURRENT STAGE · STEP {progressIndex + 1} OF 6
                  </Typography>
                  <Typography fontWeight={900} fontSize={19}>
                    {LEAD_STAGE_LABELS[progressStage]}
                  </Typography>
                  <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
                    {BROKER_PORTAL_STAGE_HINTS[progressStage]}
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
              <Grid container spacing={1} mt={1.25}>
                {LEAD_STAGE_FLOW.map((flowStage, index) => {
                  const StageIcon = STAGE_ICONS[flowStage];
                  const done = progressIndex > index;
                  const current = progressIndex === index;
                  const viewing = viewedStage === flowStage;
                  const reachable = index <= progressIndex;
                  return (
                    <Grid item xs={6} sm={4} md={2} key={flowStage}>
                      <Stack
                        component="button"
                        type="button"
                        disabled={!reachable}
                        onClick={() => {
                          if (!reachable) return;
                          setSelectedStage(flowStage === progressStage ? null : flowStage);
                        }}
                        alignItems="center"
                        spacing={0.45}
                        sx={{
                          display: 'flex',
                          width: '100%',
                          height: '100%',
                          p: 1,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          cursor: reachable ? 'pointer' : 'default',
                          font: 'inherit',
                          color: 'inherit',
                          bgcolor: viewing ? brokerPortalTheme.accentGreenTint : '#fff',
                          border: `1px solid ${
                            viewing ? brokerPortalTheme.accentGreen : brokerPortalTheme.cardBorder
                          }`,
                          opacity: reachable ? 1 : 0.55,
                          '&:disabled': { cursor: 'default' },
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 29,
                            height: 29,
                            bgcolor: done || current ? brokerPortalTheme.accentGreen : '#f1f5f4',
                            color: done || current ? '#fff' : brokerPortalTheme.textSecondary,
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
              <Typography
                variant="caption"
                color={brokerPortalTheme.textSecondary}
                display="block"
                mt={1.25}
              >
                {viewedStage === progressStage ? (
                  'Any info you add or update in these steps is shared with your LWM team.'
                ) : (
                  <>
                    You&apos;re viewing <strong>{LEAD_STAGE_LABELS[viewedStage]}</strong>. Any info
                    you update here is shared with your LWM team.
                  </>
                )}
              </Typography>
            </>
          )}
        </Box>

        {(detailResponse || !isFetching) && (
          <>
            <Divider />
            <Box p={{ xs: 2, sm: 2.5 }}>{renderCurrentStep()}</Box>

            <Divider />
            <Box p={{ xs: 2, sm: 2.5 }}>
              <Typography fontWeight={800}>Notes</Typography>
              <Typography variant="caption" color={brokerPortalTheme.textSecondary} display="block" mb={1}>
                Add notes and attachments for the {LEAD_STAGE_LABELS[viewedStage]} step
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
                  placeholder={`Write a note for the ${LEAD_STAGE_LABELS[viewedStage]} step...`}
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
              {!stageDocuments.length && !stageNotes.length && (
                <Typography variant="caption" color={brokerPortalTheme.textSecondary} display="block" mt={1}>
                  No notes yet for this step.
                </Typography>
              )}
              {stageNotes.map((entry, index) => (
                <Box key={`${entry.createdAt}-${index}`} mt={1}>
                  <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                    {formatPortalDate(entry.createdAt)} · {entry.actorName}
                  </Typography>
                  <Typography fontSize={13.5}>
                    {entry.detail.replace(`[${stageLabel}] `, '')}
                  </Typography>
                </Box>
              ))}
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
                {viewedStage !== progressStage ? (
                  <>
                    <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                      You&apos;re viewing <strong>{LEAD_STAGE_LABELS[viewedStage]}</strong>. The
                      lead&apos;s current stage is <strong>{LEAD_STAGE_LABELS[progressStage]}</strong>.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setSelectedStage(null)}
                      sx={portalPrimaryButtonSx}
                    >
                      Back to current step
                    </Button>
                  </>
                ) : progressStage === 'ContactBackOffice' ? (
                  <Typography fontWeight={700} fontSize={13}>
                    Final step — once sent to the back office, they&apos;ll create the official
                    order.
                  </Typography>
                ) : (
                  <>
                    <Box>
                      <Typography fontWeight={800} fontSize={13.5}>
                        Finished with{' '}
                        <Box component="span" sx={{ color: brokerPortalTheme.accentGreen }}>
                          {LEAD_STAGE_LABELS[progressStage]}
                        </Box>
                        ?
                      </Typography>
                      {nextStage && (
                        <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                          Move this lead forward to <strong>{LEAD_STAGE_LABELS[nextStage]}</strong>.
                          Your LWM team will be notified.
                        </Typography>
                      )}
                    </Box>
                    {renderContinue()}
                  </>
                )}
              </Stack>
            </Box>

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
                  </FooterCard>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FooterCard title="Your submission">
                    <InfoRow label="Submitted" value={formatPortalDate(currentLead.createdAt)} />
                    <InfoRow label="Last Update" value={formatPortalDate(currentLead.updatedAt)} />
                  </FooterCard>
                </Grid>
              </Grid>
              {(related.contacts?.length || related.tasks?.length) ? (
                <Grid container spacing={1.5} mt={0.5}>
                  {!!related.contacts?.length && (
                    <Grid item xs={12} md={6}>
                      <FooterCard title="Contacts from back office">
                        {related.contacts.map((contact) => (
                          <Typography key={contact._id || contact.id || contact.email} variant="caption">
                            {[contact.name, contact.jobTitle, contact.phone, contact.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        ))}
                      </FooterCard>
                    </Grid>
                  )}
                  {!!related.tasks?.length && (
                    <Grid item xs={12} md={6}>
                      <FooterCard title="Tasks from back office">
                        {related.tasks.map((task) => (
                          <Typography key={task._id || task.id || task.title} variant="caption">
                            {[task.title, task.status, task.dueAt ? formatPortalDate(task.dueAt) : '']
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        ))}
                      </FooterCard>
                    </Grid>
                  )}
                </Grid>
              ) : null}

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
                        label="First Name"
                        value={editForm.firstName}
                        onChange={(event) =>
                          setEditForm({ ...editForm, firstName: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Last Name"
                        value={editForm.lastName}
                        onChange={(event) =>
                          setEditForm({ ...editForm, lastName: event.target.value })
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
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bin Size"
                        value={editForm.binSize}
                        onChange={(event) =>
                          setEditForm({ ...editForm, binSize: event.target.value })
                        }
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
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
                        {COLLECTION_FREQUENCIES.map((frequency) => (
                          <MenuItem key={frequency} value={frequency}>
                            {frequency}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" fontWeight={800} mb={1}>
                        Preferred Collection Day
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {COLLECTION_DAYS.map((day) => {
                          const selected = editForm.collectionDays.includes(day);
                          return (
                            <Chip
                              key={day}
                              label={day}
                              onClick={() =>
                                setEditForm({
                                  ...editForm,
                                  collectionDays: selected
                                    ? editForm.collectionDays.filter((item) => item !== day)
                                    : [...editForm.collectionDays, day],
                                })
                              }
                              sx={{
                                fontWeight: 800,
                                bgcolor: selected ? brokerPortalTheme.accentGreen : '#fff',
                                color: selected ? '#fff' : brokerPortalTheme.textPrimary,
                                border: `1px solid ${
                                  selected
                                    ? brokerPortalTheme.accentGreen
                                    : brokerPortalTheme.cardBorder
                                }`,
                              }}
                            />
                          );
                        })}
                      </Stack>
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
                        {(editForm.preferredTime &&
                        !COLLECTION_TIME_SLOTS.some((slot) => slot.value === editForm.preferredTime)
                          ? [
                              ...COLLECTION_TIME_SLOTS,
                              { value: editForm.preferredTime, label: editForm.preferredTime },
                            ]
                          : COLLECTION_TIME_SLOTS
                        ).map((slot) => (
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
