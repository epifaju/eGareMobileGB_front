import { baseApi } from '@/shared/api/baseApi';

import type {
  LoginRequest,
  OtpRequest,
  OtpResponse,
  RegisterRequest,
  TokenResponse,
} from '@/features/auth/types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<TokenResponse, LoginRequest>({
      query: (body) => ({
        url: '/api/auth/login',
        method: 'POST',
        body,
      }),
    }),
    register: builder.mutation<TokenResponse, RegisterRequest>({
      query: (body) => ({
        url: '/api/auth/register',
        method: 'POST',
        body,
      }),
    }),
    requestOtp: builder.mutation<OtpResponse, OtpRequest>({
      query: (body) => ({
        url: '/api/auth/otp',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useRequestOtpMutation } = authApi;
