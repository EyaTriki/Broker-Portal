import { Stack, Typography } from '@mui/material';

function AuthHeader({ title }: { title: string }) {
  return (
    <Stack spacing={{ xs: 1, sm: 1.5 }} sx={{ mt: { xs: 0, sm: 2, md: 4 }, mb: 3, textAlign: 'left' }}>
      <Typography variant="h5" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        Welcome back
      </Typography>
      <Typography
        variant="h4"
        fontWeight={800}
        sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}
      >
        {title}
      </Typography>
    </Stack>
  );
}

export default AuthHeader;
