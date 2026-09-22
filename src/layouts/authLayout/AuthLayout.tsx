import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AuthShell, StyledPaper, WelcomeContainer } from './AuthLayout.style';
import { Suspense } from 'react';
import FallbackLoader from '@components/fallback/FallbackLoader';
import image from '@assets/images/login.png';

function AuthLayout() {
  return (
    <AuthShell>
      <StyledPaper>
        <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto', textAlign: 'left' }}>
          <Suspense fallback={<FallbackLoader />}>
            <Outlet />
          </Suspense>
        </Box>
      </StyledPaper>
      <WelcomeContainer>
        <Box
          component="img"
          src={image}
          alt="Broker portal"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </WelcomeContainer>
    </AuthShell>
  );
}

export default AuthLayout;
