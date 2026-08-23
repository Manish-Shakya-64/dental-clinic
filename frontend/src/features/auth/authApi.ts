import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Gender, LoginResponse } from "@/types/api";

export interface RegisterInput {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  email: string;
  password: string;
  phone: string;
  dob: string;
  address?: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<LoginResponse>) => response.data,
    }),
    register: builder.mutation<{ id: string; email: string; role: string; patientId: string }, RegisterInput>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<{ id: string; email: string; role: string; patientId: string }>) => response.data,
    }),
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<{ message: string }>) => response.data,
    }),
    resetPassword: builder.mutation<{ message: string }, { token: string; newPassword: string }>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<{ message: string }>) => response.data,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useForgotPasswordMutation, useResetPasswordMutation } = authApi;
