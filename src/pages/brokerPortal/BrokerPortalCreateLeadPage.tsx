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
} from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { showError, showSuccess } from '@redux/slices/snackbarSlice';
import { PATHS } from '@config/constants/paths';
import { COLLECTION_TIME_SLOTS, type LeadPriority } from 'types/models/Broker';
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

const FREQUENCIES = [
  'Daily',
  '2x per week',
  '3x per week',
  'Weekly',
  'Fortnightly',
  'Monthly',
  'Ad-hoc / One-off',
];

interface LeadForm {
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

const emptyForm: LeadForm = {
  companyName: '',
  industry: '',
  contactName: '',
  phone: '',
  email: '',
  wasteType: '',
  frequency: '',
  collectionDate: '',
  preferredTime: 'AnyTime',
  postalCode: '',
  collectionAddress: '',
  city: '',
  region: '',
  country: 'United Kingdom',
  billingAddress: '',
  priority: 'Medium',
  followUpAt: '',
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
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [createLead, { isLoading }] = useCreatePortalLeadMutation();
  const [createDocument] = useCreatePortalDocumentMutation();

  const update = (patch: Partial<LeadForm>) => setForm((current) => ({ ...current, ...patch }));

  const buildPayload = () => ({
    companyName: form.companyName.trim(),
    contactName: form.contactName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    wasteType: form.wasteType.trim(),
    frequency: form.frequency,
    industry: form.industry.trim(),
    preferredCollectionDate: form.collectionDate
      ? new Date(`${form.collectionDate}T12:00:00`).toISOString()
      : null,
    preferredCollectionTime: form.preferredTime,
    addressLine1: form.collectionAddress.trim(),
    city: form.city,
    region: form.region,
    postalCode: form.postalCode,
    country: form.country,
    followUpAt: form.followUpAt ? new Date(`${form.followUpAt}T12:00:00`).toISOString() : null,
    billingAddress: form.billingAddress.trim(),
    notes: form.notes.trim(),
    priority: form.priority,
  });

  const attachCard = async (targetLeadId: string) => {
    if (!cardFile) return;
    const body = new FormData();
    body.append('file', cardFile);
    body.append('leadId', targetLeadId);
    body.append('companyName', form.companyName);
    body.append('title', `Lead source document - ${form.companyName}`);
    body.append('type', 'BusinessCard');
    await createDocument(body).unwrap();
  };

  const readCard = async (file: File) => {
    const error = validateCardFile(file);
    if (error) {
      dispatch(showError(error));
      return;
    }
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
    try {
      const parsed = await scanBusinessCard(file, setScanProgress);
      const parsedContactName = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
      const parsedAddress = parsed.addressLine1 || '';
      update({
        companyName: parsed.companyName || form.companyName,
        contactName: parsedContactName || form.contactName,
        phone: parsed.phone || parsed.mobile || form.phone,
        email: parsed.email || form.email,
        postalCode: parsed.postalCode || form.postalCode,
        collectionAddress: parsedAddress || form.collectionAddress,
        city: parsed.city || form.city,
      });
      const count = countExtractedFields(parsed);
      dispatch(
        count
          ? showSuccess(`${count} field${count === 1 ? '' : 's'} filled from the document`)
          : showError('No fields were read. Please enter the lead manually.'),
      );
    } catch (error) {
      console.error('Business card scan failed:', error);
      dispatch(showError('The document could not be read. You can still fill the form manually.'));
    } finally {
      setScanProgress(null);
    }
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
    if (!form.contactName.trim()) return 'Contact Name is required';
    if (!form.phone.trim()) return 'Phone is required';
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

    try {
      const result = await createLead({
        ...buildPayload(),
        leadSource: cardFile ? 'Business Card' : 'Broker Portal',
        customerType: 'Company',
        customerCategory: 'Prospect',
      }).unwrap();

      const createdLeadId = result.data._id || result.data.id;
      if (cardFile && createdLeadId) {
        try {
          await attachCard(createdLeadId);
        } catch {
          dispatch(showError('Lead submitted, but the source document could not be attached.'));
          navigate(PATHS.BROKER_PORTAL.LEADS);
          return;
        }
      }

      dispatch(showSuccess('Lead submitted successfully'));
      navigate(PATHS.BROKER_PORTAL.LEADS);
    } catch (requestError: any) {
      dispatch(showError(requestError?.data?.message || 'Failed to submit lead'));
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
            const file = event.dataTransfer.files?.[0];
            if (file) void readCard(file);
          }}
          onClick={() => !scanProgress && inputRef.current?.click()}
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
                Tap to replace this document
              </Typography>
              <Button
                size="small"
                startIcon={<DeleteIcon />}
                onClick={(event) => {
                  event.stopPropagation();
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
        title="Contact"
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
              label="Contact Name"
              placeholder="Full name"
              value={form.contactName}
              onChange={(event) => update({ contactName: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              size="small"
              label="Phone"
              placeholder="+44 7700 900000"
              value={form.phone}
              onChange={(event) => update({ phone: event.target.value })}
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
              {FREQUENCIES.map((frequency) => (
                <MenuItem value={frequency} key={frequency}>
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
              value={form.collectionDate}
              onChange={(event) => update({ collectionDate: event.target.value })}
              sx={fieldSx}
            />
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
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              size="small"
              label="Priority"
              value={form.priority}
              onChange={(event) => update({ priority: event.target.value as LeadPriority })}
              sx={fieldSx}
            >
              {(['High', 'Medium', 'Low'] as LeadPriority[]).map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Follow-up Date"
              InputLabelProps={{ shrink: true }}
              value={form.followUpAt}
              onChange={(event) => update({ followUpAt: event.target.value })}
              sx={fieldSx}
            />
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
                  })
                }
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={5}
              label="Full Billing Address"
              placeholder="Leave blank if it is the same as the collection address"
              value={form.billingAddress}
              onChange={(event) => update({ billingAddress: event.target.value })}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard title="Notes">
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

      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1.25}>
        <Button
          variant="outlined"
          onClick={() => {
            setForm(emptyForm);
            setCardFile(null);
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
