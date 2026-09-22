import { ENDPOINTS } from '@config/constants/endpoints';
import { MethodsEnum } from '@config/enums/method.enum';
import { createApi } from '@reduxjs/toolkit/query/react';
import { LoginRequest, LoginResponse } from './authApi.type';
import { decodeLoginResponse } from './authApi.transform';
import { baseQueryConfig } from '@redux/baseQueryConfig';
import { Notification } from 'types/models/Notifications';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryConfig,
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    brokerLogin: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: ENDPOINTS.BROKER_LOGIN,
        method: MethodsEnum.POST,
        body,
      }),
      transformResponse: (response: LoginResponse): LoginResponse =>
        decodeLoginResponse(response),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: ENDPOINTS.LOGOUT,
        method: MethodsEnum.POST,
      }),
    }),
    getUserNotifications: builder.query<Notification[], void>({
      query: () => ({
        url: ENDPOINTS.GET_USER_NOTIFICATIONS,
        method: MethodsEnum.GET,
      }),
      transformResponse: (response: {
        message: string;
        notifications: Notification[];
      }) => response.notifications,
      providesTags: ['Notifications'],
    }),
    markNotificationsRead: builder.mutation<{ message: string; updated: number }, void>({
      query: () => ({
        url: ENDPOINTS.MARK_NOTIFICATIONS_READ,
        method: MethodsEnum.PATCH,
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useBrokerLoginMutation,
  useLogoutMutation,
  useGetUserNotificationsQuery,
  useMarkNotificationsReadMutation,
} = authApi;
