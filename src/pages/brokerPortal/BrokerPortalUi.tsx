import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { brokerPortalTheme } from './brokerPortalTheme';

export const portalCardSx: SxProps<Theme> = {
  borderRadius: `${brokerPortalTheme.cardRadius}px`,
  border: `1px solid ${brokerPortalTheme.cardBorder}`,
  boxShadow: brokerPortalTheme.cardShadow,
  bgcolor: brokerPortalTheme.cardBg,
};

/** Figma primary CTA: green gradient, white label. */
export const portalPrimaryButtonSx: SxProps<Theme> = {
  borderRadius: '12px',
  px: 2.25,
  py: 1.1,
  textTransform: 'none',
  fontWeight: 800,
  fontSize: 14,
  color: '#fff',
  background: brokerPortalTheme.accentGreenGradient,
  boxShadow: '0 1px 3px rgba(31, 180, 56, 0.3)',
  '&:hover': {
    background: brokerPortalTheme.accentGreenGradient,
    filter: 'brightness(0.97)',
    boxShadow: '0 8px 20px rgba(31, 180, 56, 0.28)',
    color: '#fff',
  },
  '&.Mui-disabled': {
    color: 'rgba(255,255,255,0.7)',
    background: brokerPortalTheme.accentGreen,
  },
  '& .MuiButton-startIcon': { color: '#fff' },
};

export function PortalPageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
    >
      <Box>
        <Typography
          variant="h5"
          fontWeight={800}
          color={brokerPortalTheme.textPrimary}
          sx={{ letterSpacing: '-0.025em', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography color={brokerPortalTheme.textSecondary} mt={0.4} fontSize={14}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

export function PortalSectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card elevation={0} sx={portalCardSx}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        {(title || action) && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1.5}
            mb={2}
          >
            <Stack direction="row" spacing={1.15} alignItems="center">
              {icon}
              <Box>
                {title && (
                  <Typography fontWeight={800} color={brokerPortalTheme.textPrimary}>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="caption" color={brokerPortalTheme.textSecondary}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
            {action}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function PortalEmptyState({ children }: { children: ReactNode }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      spacing={0.75}
      sx={{ minHeight: 180, color: brokerPortalTheme.textSecondary, px: 2 }}
    >
      {children}
    </Stack>
  );
}
