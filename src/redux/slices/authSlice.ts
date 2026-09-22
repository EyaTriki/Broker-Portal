import { LocalStorageKeysEnum } from '@config/enums/localStorage.enum';
import { authApi } from '@redux/apis/auth/authApi';
import { RootState } from '@redux/store';
import { createSlice } from '@reduxjs/toolkit';
import {
  getUserFromLocalStorage,
  removeFromLocalStorage,
  setToLocalStorage,
} from '@utils/localStorage/storage';
import { GLOBAL_VARIABLES } from '@config/constants/globalVariables';

const initialState = {
  user: getUserFromLocalStorage(),
  isAuthenticated: !!getUserFromLocalStorage(),
  role: getUserFromLocalStorage()?.role || '',
  permissions: getUserFromLocalStorage()?.permissions || {},
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.role = '';
      state.permissions = {};
      removeFromLocalStorage(LocalStorageKeysEnum.AccessToken);
      removeFromLocalStorage(LocalStorageKeysEnum.RefreshToken);
      removeFromLocalStorage(LocalStorageKeysEnum.User);
    },
  },
  extraReducers: (builder) => {
    const handleLoginFulfilled = (state: typeof initialState, payload: any) => {
      const { token, refreshToken, user } = payload;
      state.user = user;
      state.isAuthenticated = true;
      state.role = user.role || GLOBAL_VARIABLES.EMPTY_STRING;
      state.permissions = user.permissions || {};

      setToLocalStorage(LocalStorageKeysEnum.AccessToken, token);
      setToLocalStorage(LocalStorageKeysEnum.RefreshToken, refreshToken);
      setToLocalStorage(LocalStorageKeysEnum.User, JSON.stringify(user));
    };

    builder
      .addMatcher(authApi.endpoints.brokerLogin.matchFulfilled, (state, { payload }) => {
        handleLoginFulfilled(state, payload);
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.role = '';
        state.permissions = {};
        removeFromLocalStorage(LocalStorageKeysEnum.AccessToken);
        removeFromLocalStorage(LocalStorageKeysEnum.RefreshToken);
        removeFromLocalStorage(LocalStorageKeysEnum.User);
      });
  },
});

export const { logout } = authSlice.actions;
export const selectAuth = (state: RootState) => state.auth;
export default authSlice.reducer;
