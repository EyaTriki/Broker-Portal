import { useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ScannerOutlinedIcon from '@mui/icons-material/ScannerOutlined';
import { useNavigate } from 'react-router-dom';
import {
  useCreatePortalDocumentMutation,
  useCreatePortalLeadMutation,
  useUpdatePortalLeadMutation,
} from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { showError, showSuccess } from '@redux/slices/snackbarSlice';
import { PATHS } from '@config/constants/paths';
import {
  COLLECTION_DAYS,
  COLLECTION_FREQUENCIES,
  COLLECTION_TIME_SLOTS,
  type LeadPriority,
} from 'types/models/Broker';
import { resolveIcon } from '@utils/resolveMuiIcon';
import PostcodeAddressLookup from '@components/autocomplete/PostcodeAddressLookup';
import { brokerPortalTheme } from './brokerPortalTheme';
import { PortalPageHeading, PortalSectionCard, portalPrimaryButtonSx } from './BrokerPortalUi';
import {
  canScanFile,
  countExtractedFields,
  scanBusinessCard,
  type ScanProgress,
} from './businessCardOcr';
import {
  formatFileSize,
  SCAN_ACCEPTED_EXTENSIONS,
  validateCardFile,
} from './scanFileUtils';

const BusinessIcon = resolveIcon(BusinessOutlinedIcon);
const CopyIcon = resolveIcon(ContentCopyOutlinedIcon);
const DeleteIcon = resolveIcon(DeleteOutlineRoundedIcon);
const DescriptionIcon = resolveIcon(DescriptionOutlinedIcon);
const UploadIcon = resolveIcon(FileUploadOutlinedIcon);
const LocationIcon = resolveIcon(LocationOnOutlinedIcon);
const PersonIcon = resolveIcon(PersonOutlineRoundedIcon);
const CameraIcon = resolveIcon(PhotoCameraOutlinedIcon);
const ScannerIcon = resolveIcon(ScannerOutlinedIcon);

interface LeadForm {
  companyName: string;
  industry: string;
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  wasteType: string;
  frequency: string;
  collectionDays: string[];
  preferredTime: string;
  postalCode: string;
  collectionAddress: string;
  city: string;
  region: string;
  country: string;
  billingPostcode: string;
  billingAddress: string;
  priority: LeadPriority;
  notes: string;
}

const emptyForm: LeadForm = {
  companyName: '',
  industry: '',
  firstName: '',
  lastName: '',
  phone: '',
  secondaryPhone: '',
  email: '',
  wasteType: '',
  frequency: '',
  collectionDays: [],
  preferredTime: 'AnyTime',
  postalCode: '',
  collectionAddress: '',
  city: '',
  region: '',
  country: 'United Kingdom',
  billingPostcode: '',
  billingAddress: '',
  priority: 'Medium',
  notes: '',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    bgcolor: '#fff',
  },
};

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <Avatar
      sx={{
        width: 36,
        height: 36,
        bgcolor: brokerPortalTheme.accentGreenTint,
        color: brokerPortalTheme.accentGreen,
      }}
    >
      {children}
    </Avatar>
  );
}

export default function BrokerPortalCreateLeadPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<LeadForm>(emptyForm);
  const cardFileRef = useRef<File | null>(null);
  const draftLeadIdRef = useRef<string | null>(null);
  const documentAttachedRef = useRef(false);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [draftLeadId, setDraftLeadId] = useState<string | null>(null);
  const [createLead, { isLoading: creatingLead }] = useCreatePortalLeadMutation();
  const [updateLead, { isLoading: updatingLead }] = useUpdatePortalLeadMutation();
  const [createDocument, { isLoading: attachingDocument }] = useCreatePortalDocumentMutation();
  const isLoading = creatingLead || updatingLead || attachingDocument;
  formRef.current = form;

  const update = (patch: Partial<LeadForm>) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      formRef.current = next;
      return next;
    });
  };

  const buildPayload = (source: LeadForm) => ({
    companyName: source.companyName.trim(),
    firstName: source.firstName.trim(),
    lastName: source.lastName.trim(),
    contactName: [source.firstName, source.lastName].filter(Boolean).join(' ').trim(),
    phone: source.phone.trim(),
    secondaryPhone: source.secondaryPhone.trim(),
    email: source.email.trim(),
    wasteType: source.wasteType.trim(),
    frequency: source.frequency,
    industry: source.industry.trim(),
    preferredCollectionDays: source.collectionDays.join(','),
    preferredCollectionTime: source.preferredTime,
    addressLine1: source.collectionAddress.trim(),
    city: source.city,
    region: source.region,
    postalCode: source.postalCode,
    country: source.country,
    billingAddress: source.billingAddress.trim(),
    notes: source.notes.trim(),
    priority: source.priority,
  });

  const attachCard = async (targetLeadId: string, file: File, companyName: string) => {
    const body = new FormData();
    body.append('file', file);
    body.append('leadId', targetLeadId);
    body.append('companyName', companyName);
    body.append('title', `Lead source document - ${companyName || 'draft lead'}`);
    body.append('type', 'BusinessCard');
    await createDocument(body).unwrap();
  };

  const saveDraft = async (source: LeadForm, file: File, jobTitle?: string) => {
    const body = {
      ...buildPayload(source),
      ...(jobTitle ? { jobTitle } : {}),
      status: 'Draft' as const,
      leadSource: 'Business Card',
      customerType: 'Company',
      customerCategory: 'Prospect',
    };

    let leadId = draftLeadIdRef.current;
    if (!leadId) {
      const result = await createLead(body).unwrap();
      leadId = String(result.data._id || result.data.id || '');
      if (!leadId) {
        throw new Error('Draft lead was created without an id');
      }
      draftLeadIdRef.current = leadId;
      setDraftLeadId(leadId);
    } else {
      await updateLead({ leadId, body }).unwrap();
    }

    documentAttachedRef.current = false;
    await attachCard(leadId, file, source.companyName.trim());
    documentAttachedRef.current = true;
  };

  const readCard = async (file: File) => {
    const error = validateCardFile(file);
    if (error) {
      dispatch(showError(error));
      return;
    }
    cardFileRef.current = file;
    setCardFile(file);
    if (!canScanFile(file)) {
      dispatch(
        showError(
          'Automatic reading is not available for this file type. It will still be attached to the lead.',
        ),
      );
      return;
    }

    setScanProgress({ status: 'Loading scanner', progress: 0 });
    let parsed;
    try {
      parsed = await scanBusinessCard(file, setScanProgress);
    } catch (scanError) {
      console.error('Business card scan failed:', scanError);
      setScanProgress(null);
      dispatch(showError('The document could not be read. You can still fill the form manually.'));
      return;
    }

    const current = formRef.current;
    const next: LeadForm = {
      ...current,
      companyName: parsed.companyName || current.companyName,
      firstName: parsed.firstName || current.firstName,
      lastName: parsed.lastName || current.lastName,
      phone: parsed.phone || parsed.mobile || current.phone,
      email: parsed.email || current.email,
      postalCode: parsed.postalCode || current.postalCode,
      collectionAddress: parsed.addressLine1 || current.collectionAddress,
      city: parsed.city || current.city,
    };
    formRef.current = next;
    setForm(next);

    const count = countExtractedFields(parsed);
    if (!count) {
      setScanProgress(null);
      dispatch(showError('No fields were read. Please enter the lead manually.'));
      return;
    }

    setScanProgress({ status: 'Saving draft', progress: 1 });
    try {
      await saveDraft(next, file, parsed.jobTitle);
    } catch (requestError: any) {
      setScanProgress(null);
      dispatch(
        showError(requestError?.data?.message || requestError?.message || 'Failed to save the draft lead'),
      );
      return;
    }

    setScanProgress(null);
    dispatch(
      showSuccess(
        `Draft lead saved with ${count} field${count === 1 ? '' : 's'} from the document`,
      ),
    );
  };

  const clearFileInputs = () => {
    if (inputRef.current) inputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared straight away so re-picking the same file still fires a change event.
    clearFileInputs();
    if (file) void readCard(file);
  };

  const validate = () => {
    if (!form.companyName.trim()) return 'Company / Business Name is required';
    if (!form.industry.trim()) return 'Industry is required';
    if (!form.firstName.trim()) return 'First Name is required';
    if (!form.lastName.trim()) return 'Last Name is required';
    if (!form.phone.trim()) return 'Phone Number 1 is required';
    if (!form.wasteType.trim()) return 'Waste Type is required';
    if (!form.collectionAddress.trim()) return 'Collection Address is required';
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      dispatch(showError(error));
      return;
    }

    const source = formRef.current;
    const file = cardFileRef.current;
    const payload = {
      ...buildPayload(source),
      leadSource: file ? 'Business Card' : 'Broker Portal',
      customerType: 'Company' as const,
      customerCategory: 'Prospect',
      status: 'NewLead' as const,
    };

    try {
      let leadId = draftLeadIdRef.current;
      if (leadId) {
        await updateLead({ leadId, body: payload }).unwrap();
      } else {
        const result = await createLead(payload).unwrap();
        leadId = String(result.data._id || result.data.id || '');
        if (!leadId) {
          dispatch(showError('Lead was submitted without an id'));
          return;
        }
        draftLeadIdRef.current = leadId;
        setDraftLeadId(leadId);
      }

      if (file && !documentAttachedRef.current) {
        await attachCard(leadId, file, source.companyName.trim());
        documentAttachedRef.current = true;
      }

      dispatch(showSuccess('Lead submitted successfully'));
      navigate(PATHS.BROKER_PORTAL.LEADS);
    } catch (requestError: any) {
      dispatch(showError(requestError?.data?.message || requestError?.message || 'Failed to submit lead'));
    }
  };

  return (
    <Stack spacing={2.25}>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept={SCAN_ACCEPTED_EXTENSIONS.join(',')}
        onChange={pickFile}
      />
      {/* `capture` belongs on a dedicated camera input: on the picker above it would
          force the camera and hide the user's saved photos and PDFs. */}
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={pickFile} />

      <PortalPageHeading
        title="Submit Lead"
        subtitle="Share a new opportunity with London Waste Management."
      />

      <PortalSectionCard
        title="Scan a business card or document"
        subtitle="Upload a photo and we’ll auto-fill the form for you"
        icon={
          <SectionIcon>
            <ScannerIcon sx={{ fontSize: 19 }} />
          </SectionIcon>
        }
      >
        <Box
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (isLoading || scanProgress) return;
            const file = event.dataTransfer.files?.[0];
            if (file) void readCard(file);
          }}
          onClick={() => !isLoading && !scanProgress && inputRef.current?.click()}
          sx={{
            border: `2px dashed ${
              dragging ? brokerPortalTheme.accentGreen : brokerPortalTheme.cardBorder
            }`,
            borderRadius: 4,
            bgcolor: dragging ? brokerPortalTheme.accentGreenTint : '#fafbfa',
            minHeight: 150,
            p: 2.5,
            cursor: scanProgress ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {scanProgress ? (
            <Box width="100%" maxWidth={360}>
              <CircularProgress size={30} sx={{ color: brokerPortalTheme.accentGreen, mb: 1 }} />
              <Typography fontWeight={850}>{scanProgress.status}…</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.round(scanProgress.progress * 100)}
                sx={{
                  mt: 1,
                  height: 7,
                  borderRadius: 99,
                  bgcolor: brokerPortalTheme.accentGreenLight,
                  '& .MuiLinearProgress-bar': { bgcolor: brokerPortalTheme.accentGreen },
                }}
              />
            </Box>
          ) : cardFile ? (
            <Stack alignItems="center" spacing={0.7}>
              <Chip
                icon={<UploadIcon />}
                label={`${cardFile.name} · ${formatFileSize(cardFile.size)}`}
                sx={{ fontWeight: 800 }}
              />
              <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
                {draftLeadId
                  ? 'Saved as a draft lead. Complete the form, then submit.'
                  : 'Tap to replace this document'}
              </Typography>
              <Button
                size="small"
                startIcon={<DeleteIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  cardFileRef.current = null;
                  setCardFile(null);
                  clearFileInputs();
                }}
                sx={{ color: '#b42318', textTransform: 'none' }}
              >
                Remove
              </Button>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={0.7}>
              <Avatar sx={{ bgcolor: '#eef1ef', color: brokerPortalTheme.textSecondary }}>
                <UploadIcon />
              </Avatar>
              <Typography fontWeight={850}>Tap to upload a file</Typography>
              <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                Business card, letterhead, or invoice · PNG, JPG, PDF · Max 10 MB
              </Typography>
              <Button
                size="small"
                startIcon={<CameraIcon />}
                onClick={(event) => {
                  event.stopPropagation();
                  cameraRef.current?.click();
                }}
                sx={{
                  mt: 0.5,
                  textTransform: 'none',
                  fontWeight: 800,
                  color: brokerPortalTheme.accentGreen,
                }}
              >
                Take a photo
              </Button>
            </Stack>
          )}
        </Box>
      </PortalSectionCard>

      <PortalSectionCard
        title="Company"
        icon={
          <SectionIcon>
            <BusinessIcon sx={{ fontSize: 19 }} />
          </SectionIcon>
        }
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Company / Business Name"
              placeholder="e.g. Acme Ltd"
              value={form.companyName}
              onChange={(event) => update({ companyName: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Industry"
              placeholder="e.g. Hospitality, Construction, Retail"
              value={form.industry}
              onChange={(event) => update({ industry: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard
        title="Contact Person"
        icon={
          <SectionIcon>
            <PersonIcon sx={{ fontSize: 19 }} />
          </SectionIcon>
        }
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="First Name"
              value={form.firstName}
              onChange={(event) => update({ firstName: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Last Name"
              value={form.lastName}
              onChange={(event) => update({ lastName: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Phone Number 1"
              placeholder="+44 7700 900000"
              value={form.phone}
              onChange={(event) => update({ phone: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Phone Number 2 (optional)"
              value={form.secondaryPhone}
              onChange={(event) => update({ secondaryPhone: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              type="email"
              label="Email Address"
              placeholder="email@company.co.uk"
              value={form.email}
              onChange={(event) => update({ email: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard
        title="Waste & Collection"
        icon={
          <SectionIcon>
            <DescriptionIcon sx={{ fontSize: 19 }} />
          </SectionIcon>
        }
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Waste Type"
              placeholder="e.g. General Commercial, Food Waste"
              value={form.wasteType}
              onChange={(event) => update({ wasteType: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              size="small"
              label="Collection Frequency"
              value={form.frequency}
              onChange={(event) => update({ frequency: event.target.value })}
              sx={fieldSx}
            >
              <MenuItem value="">Select frequency...</MenuItem>
              {COLLECTION_FREQUENCIES.map((frequency) => (
                <MenuItem value={frequency} key={frequency}>
                  {frequency}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight={800} mb={1}>
              Preferred Collection Day (select all that apply)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {COLLECTION_DAYS.map((day) => {
                const selected = form.collectionDays.includes(day);
                return (
                  <Chip
                    key={day}
                    label={day}
                    onClick={() =>
                      update({
                        collectionDays: selected
                          ? form.collectionDays.filter((item) => item !== day)
                          : [...form.collectionDays, day],
                      })
                    }
                    sx={{
                      fontWeight: 800,
                      bgcolor: selected ? brokerPortalTheme.accentGreen : '#fff',
                      color: selected ? '#fff' : brokerPortalTheme.textPrimary,
                      border: `1px solid ${
                        selected ? brokerPortalTheme.accentGreen : brokerPortalTheme.cardBorder
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
              select
              size="small"
              label="Preferred Time Slot"
              value={form.preferredTime}
              onChange={(event) => update({ preferredTime: event.target.value })}
              sx={fieldSx}
            >
              {COLLECTION_TIME_SLOTS.map((slot) => (
                <MenuItem key={slot.value} value={slot.value}>
                  {slot.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard
        title="Addresses"
        icon={
          <SectionIcon>
            <LocationIcon sx={{ fontSize: 19 }} />
          </SectionIcon>
        }
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={800} mb={1}>
              Collection Address *
            </Typography>
            <PostcodeAddressLookup
              postcode={form.postalCode}
              onPostcodeChange={(postalCode) => update({ postalCode })}
              onAddressSelect={(address) =>
                update({
                  collectionAddress: [address.addressLine1, address.addressLine2]
                    .filter(Boolean)
                    .join(', '),
                  city: address.city,
                  postalCode: address.postalCode,
                  region: address.region,
                  country: address.country,
                })
              }
            />
            <TextField
              fullWidth
              required
              multiline
              minRows={3}
              label="Collection Address"
              value={form.collectionAddress}
              onChange={(event) => update({ collectionAddress: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight={800}>
                Billing Address
              </Typography>
              <IconButton
                size="small"
                aria-label="Copy collection address"
                onClick={() =>
                  update({
                    billingAddress: form.collectionAddress,
                    billingPostcode: form.postalCode,
                  })
                }
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Stack>
            <PostcodeAddressLookup
              postcode={form.billingPostcode}
              onPostcodeChange={(billingPostcode) => update({ billingPostcode })}
              onAddressSelect={(address) =>
                update({
                  billingPostcode: address.postalCode,
                  billingAddress: [address.addressLine1, address.addressLine2, address.city, address.postalCode]
                    .filter(Boolean)
                    .join(', '),
                })
              }
            />
            <TextField
              fullWidth
              multiline
              minRows={5}
              label="Full Billing Address"
              placeholder="Leave blank if it is the same as the collection address"
              value={form.billingAddress}
              onChange={(event) => update({ billingAddress: event.target.value })}
              sx={{ ...fieldSx, mt: 1.5 }}
            />
          </Grid>
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard title="Additional Notes (optional)">
        <TextField
          fullWidth
          multiline
          minRows={4}
          placeholder="Urgency, special requirements, how you know this prospect, budget range..."
          value={form.notes}
          onChange={(event) => update({ notes: event.target.value })}
          sx={fieldSx}
        />
      </PortalSectionCard>

      <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
        By submitting this lead, you confirm that the prospect has given permission to be contacted
        by London Waste Management. Commission is payable only on confirmed and paid orders.
      </Typography>

      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1.25}>
        <Button
          variant="outlined"
          onClick={() => {
            formRef.current = emptyForm;
            cardFileRef.current = null;
            draftLeadIdRef.current = null;
            documentAttachedRef.current = false;
            setForm(emptyForm);
            setCardFile(null);
            setDraftLeadId(null);
          }}
          disabled={isLoading}
          sx={{
            borderRadius: 3,
            borderColor: brokerPortalTheme.cardBorder,
            color: brokerPortalTheme.textPrimary,
            textTransform: 'none',
            fontWeight: 800,
            px: 3,
          }}
        >
          Clear Form
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={isLoading || Boolean(scanProgress)}
          sx={{ ...portalPrimaryButtonSx, px: 4 }}
        >
          {isLoading ? 'Submitting…' : 'Submit Lead'}
        </Button>
      </Stack>
    </Stack>
  );
}
