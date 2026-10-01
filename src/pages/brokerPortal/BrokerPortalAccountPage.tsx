import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import {
  useGetPortalDashboardQuery,
  useGetPortalOrdersQuery,
  useUpdatePortalProfileMutation,
} from '@redux/apis/broker/brokerPortalApi';
import { useAppDispatch } from '@redux/hooks';
import { showError, showSuccess } from '@redux/slices/snackbarSlice';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';
import { brokerPortalTheme } from './brokerPortalTheme';
import { formatPortalDate, formatPortalMoney, getLeadInitials } from './brokerPortalFigma';
import { PortalPageHeading, PortalSectionCard, portalCardSx, portalPrimaryButtonSx } from './BrokerPortalUi';

const EmailIcon = resolveIcon(EmailOutlinedIcon);
const LocationIcon = resolveIcon(LocationOnOutlinedIcon);
const PersonIcon = resolveIcon(PersonOutlineRoundedIcon);
const PhoneIcon = resolveIcon(PhoneOutlinedIcon);

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon: MuiIconComponent;
}) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center">
      <Avatar
        sx={{
          width: 38,
          height: 38,
          bgcolor: '#f1f5f9',
          color: brokerPortalTheme.textSecondary,
        }}
      >
        <Icon sx={{ fontSize: 19 }} />
      </Avatar>
      <Box minWidth={0}>
        <Typography
          variant="caption"
          color={brokerPortalTheme.textSecondary}
          sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}
        >
          {label}
        </Typography>
        <Typography fontWeight={800} noWrap>
          {value || 'Not provided'}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function BrokerPortalAccountPage() {
  const { data } = useGetPortalDashboardQuery();
  const { data: ordersData } = useGetPortalOrdersQuery({});
  const dispatch = useAppDispatch();
  const broker = data?.data?.broker;
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankSortCode, setBankSortCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [saveProfile, { isLoading: savingProfile }] = useUpdatePortalProfileMutation();
  const summary = data?.data?.summary;
  const totalLeads = data?.data?.pipeline.reduce((sum, stage) => sum + stage.count, 0) || 0;
  const commission = (ordersData?.data || [])
    .filter((order) => !['Draft', 'Cancelled'].includes(order.status))
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  useEffect(() => {
    setBankAccountName(broker?.bankAccountName || '');
    setBankSortCode(broker?.bankSortCode || '');
    setBankAccountNumber(broker?.bankAccountNumber || '');
  }, [broker?.bankAccountName, broker?.bankSortCode, broker?.bankAccountNumber]);

  const saveBankDetails = async () => {
    try {
      await saveProfile({
        bankAccountName: bankAccountName.trim(),
        bankSortCode: bankSortCode.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
      }).unwrap();
      dispatch(showSuccess('Bank details saved'));
    } catch (error: any) {
      dispatch(showError(error?.data?.message || 'Failed to save bank details'));
    }
  };

  return (
    <Stack spacing={2.25}>
      <PortalPageHeading
        title="My Account"
        subtitle="Your broker profile, commission agreement, and performance."
      />

      <Card
        elevation={0}
        sx={{
          ...portalCardSx,
          overflow: 'hidden',
          background: brokerPortalTheme.bannerGradient,
          color: '#fff',
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, sm: 3 }, '&:last-child': { pb: { xs: 2.25, sm: 3 } } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 58,
                height: 58,
                borderRadius: 3,
                bgcolor: brokerPortalTheme.accentGreen,
                color: '#fff',
                fontWeight: 900,
              }}
            >
              {getLeadInitials(broker?.companyName)}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={900}>
                {broker?.companyName || 'Broker Account'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
                {broker?.brokerCode || 'Broker'}
                {broker?.createdAt ? ` · Partner since ${formatPortalDate(broker.createdAt)}` : ''}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <PortalSectionCard title="Contact Information">
        <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6}>
            <Detail label="Contact Person" value={broker?.contactName} icon={PersonIcon} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Detail label="Phone Number" value={broker?.phone} icon={PhoneIcon} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Detail label="Email Address" value={broker?.email} icon={EmailIcon} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Detail label="Address" value={broker?.address} icon={LocationIcon} />
          </Grid>
        </Grid>
      </PortalSectionCard>

      {broker?.accountManagerName && (
        <PortalSectionCard title="Your Account Manager">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: brokerPortalTheme.accentGreenTint,
                color: brokerPortalTheme.accentGreen,
                fontWeight: 900,
              }}
            >
              {getLeadInitials(broker.accountManagerName)}
            </Avatar>
            <Box flex={1}>
              <Typography fontWeight={900}>{broker.accountManagerName}</Typography>
              <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
                London Waste Management
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {broker.accountManagerPhone && (
                <Button
                  variant="outlined"
                  href={`tel:${broker.accountManagerPhone.replace(/\s+/g, '')}`}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                >
                  Call
                </Button>
              )}
              {broker.accountManagerEmail && (
                <Button
                  variant="outlined"
                  href={`mailto:${broker.accountManagerEmail}`}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5 }}
                >
                  Email
                </Button>
              )}
            </Stack>
          </Stack>
        </PortalSectionCard>
      )}

      <PortalSectionCard title="Commission Agreement">
        <Grid container spacing={1.25}>
          {[
            {
              label: 'Per Order',
              value:
                broker?.commissionType === 'Fixed'
                  ? formatPortalMoney(broker.commissionValue)
                  : `${Number(broker?.commissionValue || 0)}%`,
            },
            { label: 'Type', value: broker?.commissionType || 'Percentage' },
            {
              label: 'Day Payment',
              value: `${broker?.commissionPaymentDays ?? 30} days after customer payment`,
            },
          ].map((item) => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Box
                sx={{
                  bgcolor: '#f7f9f8',
                  borderRadius: 3,
                  p: 1.5,
                  height: '100%',
                }}
              >
                <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                  {item.label}
                </Typography>
                <Typography fontWeight={900} mt={0.25}>
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PortalSectionCard>

      <PortalSectionCard
        title="Bank Details"
        subtitle="Used for commission payments. Saved details are used only for paying your commission."
      >
        <Grid container spacing={1.25}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Name of Account"
              value={bankAccountName}
              onChange={(event) => setBankAccountName(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Sort Code"
              value={bankSortCode}
              onChange={(event) => setBankSortCode(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Account Number"
              value={bankAccountNumber}
              onChange={(event) => setBankAccountNumber(event.target.value)}
            />
          </Grid>
        </Grid>
        <Button
          variant="contained"
          onClick={saveBankDetails}
          disabled={savingProfile}
          sx={{ ...portalPrimaryButtonSx, mt: 1.5 }}
        >
          {savingProfile ? 'Saving…' : 'Save Bank Details'}
        </Button>
      </PortalSectionCard>

      <PortalSectionCard title="Your Performance">
        <Grid container spacing={1.25}>
          {[
            { label: 'Leads Submitted', value: totalLeads },
            { label: 'Converted', value: summary?.ordersCreated || 0 },
            { label: 'Conv. Rate', value: `${summary?.conversionRate || 0}%` },
            { label: 'Commission Earned', value: formatPortalMoney(commission) },
          ].map((metric) => (
            <Grid item xs={6} md={3} key={metric.label}>
              <Box textAlign="center" p={1.5} sx={{ bgcolor: '#f7f9f8', borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={900}>
                  {metric.value}
                </Typography>
                <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                  {metric.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PortalSectionCard>
    </Stack>
  );
}
