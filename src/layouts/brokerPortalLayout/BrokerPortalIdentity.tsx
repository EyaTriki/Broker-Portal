import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Broker } from 'types/models/Broker';
import { PATHS } from '@config/constants/paths';
import { brokerPortalTheme } from '@pages/brokerPortal/brokerPortalTheme';
import { formatPortalDate, formatPortalMoney } from '@pages/brokerPortal/brokerPortalFigma';
import { portalPrimaryButtonSx } from '@pages/brokerPortal/BrokerPortalUi';
import { resolveIcon } from '@utils/resolveMuiIcon';
import { BROKER_PORTAL_NAV, isBrokerPortalNavSelected } from './brokerPortalNav';
import { HardHatIcon, LeafIcon, ShieldIcon } from './complianceIcons';

const AddIcon = resolveIcon(AddRoundedIcon);

const COMPLIANCE_BADGES = [
  { label: 'Insurance', title: 'Insurance documents', Icon: ShieldIcon },
  { label: 'H&S', title: 'Health & Safety documents', Icon: HardHatIcon },
  { label: 'EA Docs', title: 'Environment Agency documents', Icon: LeafIcon },
];

function brokerInitials(companyName?: string) {
  const words = (companyName || 'Broker').split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || 'B'}${words[1]?.[0] || words[0]?.[1] || 'R'}`.toUpperCase();
}

function formatCommission(broker?: Partial<Broker> | null) {
  if (broker?.commissionValue == null) return null;
  if (broker.commissionType === 'Fixed') {
    return `Commission: ${formatPortalMoney(broker.commissionValue)}`;
  }
  return `Commission: ${Number(broker.commissionValue)}%`;
}

export default function BrokerPortalIdentity({ broker }: { broker?: Partial<Broker> | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const companyName = broker?.companyName || 'Your Broker Account';
  const contactName = broker?.contactName || 'Broker';
  const commissionLabel = formatCommission(broker);
  const metaParts = [broker?.brokerCode, commissionLabel].filter(Boolean);
  const brokerEmail = broker?.email?.trim();
  const brokerPhone = broker?.phone?.trim();

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: '16px', md: '18px' },
          background: brokerPortalTheme.bannerGradient,
          color: '#fff',
          p: { xs: 2, sm: 2.5, md: 3 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'stretch' }}
          spacing={{ xs: 2.5, md: 3 }}
        >
          <Stack spacing={2.5} minWidth={0} flex={1}>
            <Stack direction="row" alignItems="flex-start" spacing={1.5}>
              <Avatar
                variant="rounded"
                sx={{
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  borderRadius: 3,
                  bgcolor: brokerPortalTheme.accentGreen,
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: { xs: 15, md: 17 },
                  flexShrink: 0,
                }}
              >
                {brokerInitials(companyName)}
              </Avatar>
              <Box minWidth={0} flex={1}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography
                    variant="h5"
                    fontWeight={850}
                    noWrap
                    sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }}
                  >
                    {companyName}
                  </Typography>
                  <Chip
                    size="small"
                    label={`• ${broker?.status || 'Active'}`}
                    sx={{
                      height: 25,
                      bgcolor: 'rgba(31,180,56,0.16)',
                      color: '#86efac',
                      fontWeight: 800,
                    }}
                  />
                </Stack>
                <Typography sx={{ color: 'rgba(255,255,255,0.62)', mt: 0.5, fontSize: 13 }}>
                  {contactName}
                  {broker?.createdAt ? ` · ${formatPortalDate(broker.createdAt)}` : ''}
                </Typography>
                {metaParts.length > 0 && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.48)', mt: 0.25, fontSize: 12.5 }}>
                    {metaParts.join(' · ')}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={0.8}>
              {COMPLIANCE_BADGES.map(({ label, title, Icon }) => (
                <Tooltip key={label} title={title}>
                  <Chip
                    icon={<Icon />}
                    label={label}
                    sx={{
                      height: 34,
                      borderRadius: 99,
                      border: '1px solid rgba(255,255,255,0.18)',
                      bgcolor: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.82)',
                      fontWeight: 700,
                      fontSize: 12.5,
                      '& .MuiChip-icon': { fontSize: 16, color: 'inherit', ml: 1.1, mr: -0.3 },
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Stack>

          <Stack
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'flex-end' }}
            justifyContent="space-between"
            flexShrink={0}
            minWidth={{ md: 180 }}
          >
            <Box textAlign={{ xs: 'left', md: 'right' }}>
              {brokerEmail && (
                <Typography
                  component="a"
                  href={`mailto:${brokerEmail}`}
                  noWrap
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    lineHeight: 1.25,
                    textDecoration: 'none',
                    display: 'block',
                    maxWidth: { xs: '100%', md: 260 },
                    '&:hover': { color: '#dcfce7' },
                  }}
                >
                  {brokerEmail}
                </Typography>
              )}
              {brokerPhone ? (
                <Typography
                  component="a"
                  href={`tel:${brokerPhone.replace(/\s+/g, '')}`}
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 12.5,
                    textDecoration: 'none',
                    display: 'block',
                    mt: 0.35,
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {brokerPhone}
                </Typography>
              ) : null}
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(PATHS.BROKER_PORTAL.SUBMIT_LEAD)}
              sx={{
                ...portalPrimaryButtonSx,
                alignSelf: { xs: 'stretch', sm: 'flex-start', md: 'flex-end' },
                borderRadius: '12px',
              }}
            >
              Submit Lead
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box
        component="nav"
        aria-label="Broker portal"
        sx={{
          bgcolor: '#fff',
          border: `1px solid ${brokerPortalTheme.cardBorder}`,
          borderRadius: '16px',
          p: 0.75,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 0.5,
          boxShadow: brokerPortalTheme.cardShadow,
        }}
      >
        {BROKER_PORTAL_NAV.map((item) => {
          const Icon = item.icon;
          const selected = isBrokerPortalNavSelected(location.pathname, item);
          return (
            <ButtonBase
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              sx={{
                minWidth: 0,
                borderRadius: '12px',
                color: selected ? '#fff' : brokerPortalTheme.textSecondary,
                bgcolor: selected ? brokerPortalTheme.accentGreen : 'transparent',
                boxShadow: selected ? '0 1px 3px rgba(31, 180, 56, 0.3)' : 'none',
                py: { xs: 1.1, sm: 1.25 },
                px: { xs: 0.5, sm: 1 },
                transition: 'all 150ms ease',
                '&:hover': {
                  bgcolor: selected
                    ? brokerPortalTheme.accentGreenHover
                    : brokerPortalTheme.accentGreenTint,
                  color: selected ? '#fff' : brokerPortalTheme.accentGreen,
                },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems="center"
                justifyContent="center"
                spacing={{ xs: 0.3, sm: 0.75 }}
                minWidth={0}
              >
                <Icon sx={{ fontSize: { xs: 20, sm: 18 }, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    fontWeight: selected ? 700 : 600,
                    fontSize: { xs: 9.5, sm: 13 },
                    display: {
                      xs: item.label === 'Submit Lead' ? 'none' : 'block',
                      sm: 'block',
                    },
                  }}
                >
                  {item.shortLabel}
                </Typography>
              </Stack>
            </ButtonBase>
          );
        })}
      </Box>
    </Stack>
  );
}
