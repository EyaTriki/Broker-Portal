import { Stack, TextField, Button } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useBrokerLoginMutation } from '@redux/apis/auth/authApi';
import { LoginRequest } from '@redux/apis/auth/authApi.type';
import { useAppDispatch } from '@redux/hooks';
import { showError } from '@redux/slices/snackbarSlice';

export default function BrokerLoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({ mode: 'onChange' });
  const dispatch = useAppDispatch();
  const [brokerLogin, { isLoading }] = useBrokerLoginMutation();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await brokerLogin(values).unwrap();
    } catch (error: any) {
      dispatch(showError(error?.data?.message || 'Login failed'));
    }
  });

  return (
    <form noValidate onSubmit={onSubmit}>
      <Stack spacing={2.5}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          {...register('email', { required: 'Email is required' })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
}
