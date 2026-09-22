import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { useNavigate } from 'react-router-dom';
import {
  useGetPortalDashboardQuery,
  useGetPortalOrdersQuery,
} from '@redux/apis/broker/brokerPortalApi';
import { PATHS } from '@config/constants/paths';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';
import { brokerPortalTheme } from './brokerPortalTheme';
import {
  formatPortalDate,
  formatPortalMoney,
  getLeadInitials,
} from './brokerPortalFigma';
import { LEAD_STAGE_LABELS, deriveLeadStage, getLeadStageChipSx } from 'types/models/Broker';
import {
  PortalEmptyState,
  PortalPageHeading,
  portalCardSx,
  portalPrimaryButtonSx,
} from './BrokerPortalUi';

const ClockIcon = resolveIcon(AccessTimeRoundedIcon);
const CheckIcon = resolveIcon(CheckCircleRoundedIcon);
const GroupsIcon = resolveIcon(GroupsRoundedIcon);
const PercentIcon = resolveIcon(PercentRoundedIcon);
const TrendingIcon = resolveIcon(TrendingUpRoundedIcon);

function MetricCard({
  value,
  label,
  helper,
  icon: Icon,
  color,
  background,
  borderColor,
}: {
  value: string | number;
  label: string;
  helper: string;
  icon: MuiIconComponent;
  color: string;
  background: string;
  borderColor: string;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        ...portalCardSx,
        height: '100%',
        borderColor,
        transition: 'box-shadow 150ms ease',
        '&:hover': { boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box minWidth={0}>
            <Typography
              variant="h4"
              fontWeight={800}
              color={brokerPortalTheme.textPrimary}
              sx={{ letterSpacing: '-0.04em', fontSize: { xs: '1.65rem', sm: '1.9rem' } }}
            >
              {value}
            </Typography>
            <Typography fontWeight={700} color={brokerPortalTheme.textPrimary} mt={0.35} fontSize={14}>
              {label}
            </Typography>
            <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
              {helper}
            </Typography>
          </Box>
          <Avatar sx={{ width: 40, height: 40, bgcolor: background, color }}>
            <Icon fontSize="small" />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function BrokerPortalDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetPortalDashboardQuery();
  const { data: ordersData } = useGetPortalOrdersQuery({});
  const dashboard = data?.data;
  const orders = ordersData?.data || [];

  const totalCommission = orders
    .filter((order) => !['Draft', 'Cancelled'].includes(order.status))
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const paidCommission = orders
    .filter((order) => order.commissionStatus === 'Paid')
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const totalLeads = dashboard?.pipeline.reduce((sum, stage) => sum + stage.count, 0) || 0;

  /** Opens the lead on the leads page with its card already expanded. */
  const openLead = (leadId: string) =>
    navigate(`${PATHS.BROKER_PORTAL.LEADS}?leadId=${leadId}`);

  if (isLoading && !dashboard) {
    return (
      <Stack minHeight={260} alignItems="center" justifyContent="center">
        <CircularProgress size={28} sx={{ color: brokerPortalTheme.accentGreen }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25}>
      <PortalPageHeading
        title={`Welcome back, ${dashboard?.greetingName || 'Broker'}`}
        subtitle="Here is the latest performance and activity from your referrals."
        action={
          <Button
            variant="contained"
            onClick={() => navigate(PATHS.BROKER_PORTAL.SUBMIT_LEAD)}
            sx={portalPrimaryButtonSx}
          >
            + Submit Lead
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        <Grid item xs={6} lg={3}>
          <MetricCard
            value={totalLeads}
            label="Leads Submitted"
            helper="All time"
            icon={GroupsIcon}
            color={brokerPortalTheme.blue}
            background={brokerPortalTheme.blueLight}
            borderColor={brokerPortalTheme.blueBorder}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            value={dashboard?.summary.ordersCreated || 0}
            label="Converted Orders"
            helper={`${dashboard?.summary.conversionRate || 0}% rate`}
            icon={CheckIcon}
            color={brokerPortalTheme.accentGreen}
            background={brokerPortalTheme.accentGreenTint}
            borderColor={brokerPortalTheme.greenBorder}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            value={dashboard?.summary.activeLeads || 0}
            label="Active Pipeline"
            helper="Awaiting outcome"
            icon={ClockIcon}
            color={brokerPortalTheme.orange}
            background={brokerPortalTheme.orangeLight}
            borderColor={brokerPortalTheme.orangeBorder}
          />
        </Grid>
        <Grid item xs={6} lg={3}>
          <MetricCard
            value={formatPortalMoney(totalCommission)}
            label="Commission Earned"
            helper={`${formatPortalMoney(paidCommission)} paid`}
            icon={PercentIcon}
            color="#b45309"
            background={brokerPortalTheme.amberLight}
            borderColor={brokerPortalTheme.amberBorder}
          />
        </Grid>
      </Grid>

      <Card elevation={0} sx={portalCardSx}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.75}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: brokerPortalTheme.accentGreenTint,
                  color: brokerPortalTheme.accentGreen,
                }}
              >
                <TrendingIcon sx={{ fontSize: 19 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={800} fontSize="1.05rem">
                Recent Updates
              </Typography>
            </Stack>
            <Button
              onClick={() => navigate(PATHS.BROKER_PORTAL.LEADS)}
              sx={{ color: brokerPortalTheme.accentGreen, textTransform: 'none', fontWeight: 700 }}
            >
              All leads
            </Button>
          </Stack>

          {!dashboard?.recentActivity.length ? (
            <PortalEmptyState>
              <Typography fontWeight={800} color={brokerPortalTheme.textPrimary}>
                No updates yet
              </Typography>
              <Typography variant="body2">Updates from your submitted leads will appear here.</Typography>
            </PortalEmptyState>
          ) : (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${brokerPortalTheme.cardBorder}` }} />}>
              {dashboard.recentActivity.slice(0, 5).map((activity, index) => {
                const stage = activity.status
                  ? deriveLeadStage({ status: activity.status })
                  : null;
                return (
                  <Stack
                    key={`${activity.leadId}-${activity.createdAt}-${index}`}
                    direction="row"
                    spacing={1.5}
                    py={1.6}
                    alignItems="flex-start"
                    onClick={() => openLead(activity.leadId)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      px: 1,
                      mx: -1,
                      '&:hover': { bgcolor: brokerPortalTheme.accentGreenTint },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        bgcolor: '#f1f5f9',
                        color: brokerPortalTheme.textPrimary,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {getLeadInitials(activity.companyName)}
                    </Avatar>
                    <Box minWidth={0} flex={1}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ sm: 'center' }}
                        gap={0.5}
                      >
                        <Typography fontWeight={800}>{activity.companyName}</Typography>
                        <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                          {formatPortalDate(activity.createdAt)}
                        </Typography>
                      </Stack>
                      {stage && (
                        <Chip
                          size="small"
                          label={LEAD_STAGE_LABELS[stage]}
                          sx={{
                            mt: 0.7,
                            height: 22,
                            fontSize: 11,
                            ...getLeadStageChipSx(stage),
                          }}
                        />
                      )}
                      <Typography variant="body2" color={brokerPortalTheme.textSecondary} mt={0.7}>
                        {activity.action}
                        {activity.detail ? ` — ${activity.detail}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
