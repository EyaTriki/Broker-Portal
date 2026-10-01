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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import {
  useGetPortalDashboardQuery,
  useGetPortalOrdersQuery,
} from '@redux/apis/broker/brokerPortalApi';
import { resolveIcon, type MuiIconComponent } from '@utils/resolveMuiIcon';
import { brokerPortalTheme } from './brokerPortalTheme';
import { formatPortalDate, formatPortalMoney } from './brokerPortalFigma';
import { PortalEmptyState, PortalPageHeading, PortalSectionCard, portalCardSx } from './BrokerPortalUi';

const ClockIcon = resolveIcon(AccessTimeRoundedIcon);
const CheckIcon = resolveIcon(CheckCircleRoundedIcon);
const DownloadIcon = resolveIcon(DownloadOutlinedIcon);
const AwardIcon = resolveIcon(WorkspacePremiumOutlinedIcon);

function SummaryCard({
  value,
  title,
  helper,
  color,
  background,
  icon: Icon,
}: {
  value: string;
  title: string;
  helper: string;
  color: string;
  background: string;
  icon: MuiIconComponent;
}) {
  return (
    <Card elevation={0} sx={{ ...portalCardSx, height: '100%' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h4" fontWeight={900} color={color} letterSpacing="-0.04em">
              {value}
            </Typography>
            <Typography fontWeight={850} mt={0.5}>
              {title}
            </Typography>
            <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
              {helper}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: background, color }}>
            <Icon fontSize="small" />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function BrokerPortalCommissionsPage() {
  const { data, isLoading } = useGetPortalOrdersQuery({});
  const { data: dashboardData } = useGetPortalDashboardQuery();
  const orders = (data?.data || []).filter(
    (order) => !['Draft', 'Cancelled'].includes(order.status),
  );
  const broker = dashboardData?.data?.broker;

  const paid = orders.filter((order) => order.commissionStatus === 'Paid');
  const pending = orders.filter((order) => order.commissionStatus !== 'Paid');
  const totalValue = orders.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const paidValue = paid.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const pendingValue = pending.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const rate =
    broker?.commissionType === 'Percentage' ? `${Number(broker.commissionValue || 0)}%` : 'Fixed';

  const downloadStatement = () => {
    const rows = [
      ['Company', 'Order', 'Order Value', 'Rate', 'Commission', 'Status', 'Paid Date'],
      ...orders.map((order) => [
        order.companyName,
        order.referenceCode,
        String(order.orderAmount || 0),
        rate,
        String(order.commissionAmount || 0),
        order.commissionStatus || 'Pending',
        order.commissionPaidAt || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'broker-commission-statement.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2.25}>
      <PortalPageHeading
        title="Commissions"
        subtitle="Track earned, paid, and processing commission."
        action={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadStatement}
            disabled={!orders.length}
            sx={{
              borderRadius: 3,
              borderColor: brokerPortalTheme.cardBorder,
              color: brokerPortalTheme.textPrimary,
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            Download CSV
          </Button>
        }
      />

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={4}>
          <SummaryCard
            value={formatPortalMoney(totalValue)}
            title="Total Earned "
            helper="All commission records"
            color={brokerPortalTheme.textPrimary}
            background="#f1f5f9"
            icon={AwardIcon}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <SummaryCard
            value={formatPortalMoney(paidValue)}
            title="Paid Out"
            helper={`${paid.length} payment${paid.length === 1 ? '' : 's'}`}
            color={brokerPortalTheme.accentGreen}
            background={brokerPortalTheme.accentGreenTint}
            icon={CheckIcon}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <SummaryCard
            value={formatPortalMoney(pendingValue)}
            title="Pending / Processing"
            helper="Awaiting confirmation"
            color={brokerPortalTheme.orange}
            background={brokerPortalTheme.orangeLight}
            icon={ClockIcon}
          />
        </Grid>
      </Grid>

      <PortalSectionCard title="Your Commission Agreement">
        <Typography color={brokerPortalTheme.textSecondary} lineHeight={1.8}>
          You earn{' '}
          <Box component="span" color={brokerPortalTheme.textPrimary} fontWeight={900}>
            {rate}
          </Box>{' '}
          {broker?.commissionType === 'Percentage'
            ? 'of the order value for every lead that converts to a confirmed order'
            : 'for every lead that converts to a confirmed order'}
          . Commissions are paid within {broker?.commissionPaymentDays ?? 30} days after the customer
          makes payment.
        </Typography>
      </PortalSectionCard>

      <PortalSectionCard title="Statement" subtitle={`Showing ${orders.length} records`}>
        {isLoading ? (
          <Stack minHeight={180} alignItems="center" justifyContent="center">
            <CircularProgress size={28} sx={{ color: brokerPortalTheme.accentGreen }} />
          </Stack>
        ) : !orders.length ? (
          <PortalEmptyState>
            <Typography fontWeight={850}>No commission records yet</Typography>
            <Typography variant="body2">Converted leads will appear here.</Typography>
          </PortalEmptyState>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Lead / Order', 'Order Date', 'Order Value', 'Rate', 'Commission', 'Status', 'Paid On'].map(
                    (heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          color: brokerPortalTheme.textSecondary,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading.toUpperCase()}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => {
                  const paidOrder = order.commissionStatus === 'Paid';
                  return (
                    <TableRow key={order._id || order.id}>
                      <TableCell>
                        <Typography fontWeight={800} fontSize={14}>
                          {order.companyName}
                        </Typography>
                        <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                          {order.referenceCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatPortalDate(order.createdAt)}</TableCell>
                      <TableCell>{formatPortalMoney(order.orderAmount)}</TableCell>
                      <TableCell>{rate}</TableCell>
                      <TableCell>
                        <Typography fontWeight={800} color={brokerPortalTheme.accentGreen}>
                          {formatPortalMoney(order.commissionAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={paidOrder ? 'Paid' : order.commissionStatus || 'Pending'}
                          sx={{
                            bgcolor: paidOrder
                              ? brokerPortalTheme.accentGreenTint
                              : brokerPortalTheme.orangeLight,
                            color: paidOrder ? brokerPortalTheme.accentGreen : '#c2410c',
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {paidOrder && order.commissionPaidAt
                          ? formatPortalDate(order.commissionPaidAt)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </PortalSectionCard>
    </Stack>
  );
}
