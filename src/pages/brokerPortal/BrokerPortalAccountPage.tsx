import {
  Avatar,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import {
  useGetPortalDashboardQuery,
  useGetPortalOrdersQuery,
} from '@redux/apis/broker/brokerPortalApi';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';
import { brokerPortalTheme } from './brokerPortalTheme';
import { formatPortalDate, formatPortalMoney, getLeadInitials } from './brokerPortalFigma';
import { PortalPageHeading, PortalSectionCard, portalCardSx } from './BrokerPortalUi';

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
  const broker = data?.data?.broker;
  const summary = data?.data?.summary;
  const totalLeads = data?.data?.pipeline.reduce((sum, stage) => sum + stage.count, 0) || 0;
  const commission = (ordersData?.data || [])
    .filter((order) => !['Draft', 'Cancelled'].includes(order.status))
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const rate =
    broker?.commissionType === 'Fixed'
      ? `${formatPortalMoney(broker.commissionValue)} per order`
      : `${Number(broker?.commissionValue || 0)}% per order`;

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

      <PortalSectionCard title="Commission Agreement">
        <Grid container spacing={1.25}>
          {[
            { label: 'Commission', value: rate },
            { label: 'Type', value: broker?.commissionType || 'Percentage' },
          ].map((item) => (
            <Grid item xs={12} sm={6} key={item.label}>
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
