import { Mutex } from 'async-mutex';
import {
  fetchBaseQuery,
  FetchArgs,
  FetchBaseQueryError,
  BaseQueryApi,
  BaseQueryFn,
} from '@reduxjs/toolkit/query/react';
import {
  clearLocalStorage,
  getFromLocalStorage,
  setToLocalStorage,
} from '@utils/localStorage/storage';
import { LocalStorageKeysEnum } from '@config/enums/localStorage.enum';
import { ConfigEnv } from '@config/configEnv';
import { ENDPOINTS } from '@config/constants/endpoints';
import { MethodsEnum } from '@config/enums/method.enum';
import { PATHS } from '@config/constants/paths';

export const baseQueryConfig = (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: object,
) =>
  fetchBaseQuery({
    baseUrl: `${ConfigEnv.API_ENDPOINT}`,
    prepareHeaders: (headers) => {
      const token = getFromLocalStorage(LocalStorageKeysEnum.AccessToken);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      headers.set('Accept-Language', 'en');
      return headers;
    },
  })(args, api, extraOptions);

const handleForcedLogout = (api: BaseQueryApi) => {
  clearLocalStorage();
  api.dispatch({ type: 'auth/logout' });

  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.location.href = `/${PATHS.AUTH.ROOT}/${PATHS.AUTH.LOGIN}`;
    }, 100);
  }
};

const mutex = new Mutex();
const refreshTokenBaseQuery = fetchBaseQuery({
  baseUrl: `${ConfigEnv.API_ENDPOINT}`,
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json');
    headers.set('Accept-Language', 'en');
    headers.set(
      'Authorization',
      `Bearer ${getFromLocalStorage(LocalStorageKeysEnum.RefreshToken)}`,
    );
    return headers;
  },
});

export const baseQueryConfigWithRefresh: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const refreshToken = getFromLocalStorage(LocalStorageKeysEnum.RefreshToken);
  const accessToken = getFromLocalStorage(LocalStorageKeysEnum.AccessToken);

  if (accessToken && !refreshToken) {
    handleForcedLogout(api);
    return {
      error: {
        status: 401,
        data: { message: 'Session expired' },
      } as FetchBaseQueryError,
    };
  }

  let result = await baseQueryConfig(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const currentRefreshToken = getFromLocalStorage(LocalStorageKeysEnum.RefreshToken);
        if (!currentRefreshToken) {
          handleForcedLogout(api);
          return result;
        }

        const refreshResult = await refreshTokenBaseQuery(
          {
            url: ENDPOINTS.REFRESH_TOKEN,
            method: MethodsEnum.POST,
            body: JSON.stringify({
              refresh_token: currentRefreshToken,
            }),
          },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          setToLocalStorage(
            LocalStorageKeysEnum.AccessToken,
            (refreshResult.data as { data: { access_token: string } }).data.access_token,
          );
          result = await baseQueryConfig(args, api, extraOptions);
        } else {
          handleForcedLogout(api);
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await baseQueryConfig(args, api, extraOptions);
    }
  }

  if (result.error && result.error.status === 403) {
    handleForcedLogout(api);
  }

  return result;
};
