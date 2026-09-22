import { LoginResponse } from "./authApi.type";

export function decodeLoginResponse(response: LoginResponse): LoginResponse {
  return {
    token: response.token,
    refreshToken: response.refreshToken,
    success: true,
    user: {
      email: response.user.email,
      role: response.user.role,
      id: response.user.id,
      username: response.user.username,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      picture: response.user.picture,
      permissions: response.user.permissions,
    },
  };
}
