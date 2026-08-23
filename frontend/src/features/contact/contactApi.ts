import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope } from "@/types/api";

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export const contactApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    submitContact: builder.mutation<{ message: string }, ContactInput>({
      query: (body) => ({ url: "/contact", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<{ message: string }>) => response.data,
    }),
  }),
});

export const { useSubmitContactMutation } = contactApi;
