import { Stack, styled } from '@mui/material';

export const AuthShell = styled(Stack)({
  width: '100%',
  minHeight: '100vh',
  flexDirection: 'row',
  '@supports (min-height: 100dvh)': {
    minHeight: '100dvh',
  },
});

export const WelcomeContainer = styled(Stack)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'none',
  overflow: 'hidden',
  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
}));

export const StyledPaper = styled('div')(({ theme }) => ({
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  boxSizing: 'border-box',
  '@supports (min-height: 100dvh)': {
    minHeight: '100dvh',
  },
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  [theme.breakpoints.up('md')]: {
    width: '46%',
    maxWidth: 560,
    flexShrink: 0,
    padding: theme.spacing(6),
  },
  [theme.breakpoints.up('lg')]: {
    width: '42%',
    maxWidth: 640,
    padding: theme.spacing(8),
  },
}));
