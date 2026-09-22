import { User } from 'types/models/User';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  success: boolean;
  user: User;
}
