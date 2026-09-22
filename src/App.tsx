import CssBaseline from '@mui/material/CssBaseline';
import { useMemo, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CircularProgress, Box } from '@mui/material';
import AppAlert from '@components/appAlert/AppAlert';
import { useAppSelector } from '@redux/hooks';
import { generateAppTheme } from './theme/theme';
import { Routers } from './routes/Routers';

function App() {
  const { mode } = useAppSelector((state) => state.theme);
  const theme = useMemo(() => generateAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppAlert />
      <BrowserRouter>
        <Suspense
          fallback={
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
              <CircularProgress />
            </Box>
          }
        >
          <Routers />
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
