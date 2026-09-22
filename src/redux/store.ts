import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import snackbarReducer from './slices/snackbarSlice';
import themeReducer from './slices/theme';
import authReducer from './slices/authSlice';
import { authApi } from '@redux/apis/auth/authApi';
import { brokerPortalApi } from './apis/broker/brokerPortalApi';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    snackbar: snackbarReducer,
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [brokerPortalApi.reducerPath]: brokerPortalApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, brokerPortalApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
