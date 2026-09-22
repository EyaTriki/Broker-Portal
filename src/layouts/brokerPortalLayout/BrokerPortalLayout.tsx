import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGetPortalDashboardQuery } from '@redux/apis/broker/brokerPortalApi';
import { brokerPortalTheme } from '@pages/brokerPortal/brokerPortalTheme';
import BrokerPortalHeader from './BrokerPortalHeader';
import BrokerPortalIdentity from './BrokerPortalIdentity';
import { BROKER_PORTAL_NAV, isBrokerPortalNavSelected } from './brokerPortalNav';

export default function BrokerPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useGetPortalDashboardQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: brokerPortalTheme.pageBg,
        color: brokerPortalTheme.textPrimary,
        '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 'none',
          mx: 0,
          px: { xs: 1.5, sm: 2.5, md: 3, lg: 4 },
          pb: { xs: 3, md: 5 },
          boxSizing: 'border-box',
        }}
      >
        <BrokerPortalHeader onMenuClick={() => setMenuOpen(true)} />
        <BrokerPortalIdentity broker={data?.data?.broker} />
        <Box component="main" sx={{ pt: { xs: 2, md: 2.5 } }}>
          <Outlet />
        </Box>
      </Box>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 290,
            maxWidth: '86vw',
            borderRadius: '0 24px 24px 0',
            border: 0,
            bgcolor: '#fff',
          },
        }}
      >
        <Stack p={2.5} spacing={2}>
          <Box>
            <Typography fontWeight={900} fontSize={18}>
              Broker Portal
            </Typography>
            <Typography variant="body2" color={brokerPortalTheme.textSecondary}>
              {data?.data?.broker?.companyName || 'London Waste Management'}
            </Typography>
          </Box>
          <List disablePadding>
            {BROKER_PORTAL_NAV.map((item) => {
              const Icon = item.icon;
              const selected = isBrokerPortalNavSelected(location.pathname, item);
              return (
                <ListItemButton
                  key={item.path}
                  selected={selected}
                  onClick={() => {
                    navigate(item.path);
                    setMenuOpen(false);
                  }}
                  sx={{
                    mb: 0.5,
                    borderRadius: '12px',
                    '&.Mui-selected': {
                      bgcolor: brokerPortalTheme.accentGreen,
                      color: '#fff',
                      '&:hover': { bgcolor: brokerPortalTheme.accentGreenHover },
                    },
                    '&:hover': {
                      bgcolor: brokerPortalTheme.accentGreenTint,
                      color: brokerPortalTheme.accentGreen,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: selected ? 700 : 600 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Stack>
      </Drawer>
    </Box>
  );
}
