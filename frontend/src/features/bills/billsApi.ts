import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Bill } from "@/types/api";

export const billsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBillForAppointment: builder.query<Bill | null, string>({
      query: (appointmentId) => `/bills?appointment=${appointmentId}`,
      transformResponse: (response: ApiEnvelope<Bill[]>) => response.data[0] ?? null,
      providesTags: (_result, _error, appointmentId) => [{ type: "Bill", id: appointmentId }],
    }),
    generateBill: builder.mutation<Bill, string>({
      query: (appointmentId) => ({ url: `/appointments/${appointmentId}/bill`, method: "POST" }),
      transformResponse: (response: ApiEnvelope<Bill>) => response.data,
      invalidatesTags: (_result, _error, appointmentId) => [
        { type: "Appointment", id: appointmentId },
        { type: "Bill", id: appointmentId },
      ],
    }),
    emailBill: builder.mutation<Bill, string>({
      query: (billId) => ({ url: `/bills/${billId}/email`, method: "POST" }),
      transformResponse: (response: ApiEnvelope<Bill>) => response.data,
      invalidatesTags: [{ type: "Appointment", id: "LIST" }],
    }),
    getBillPdf: builder.query<Blob, string>({
      query: (billId) => ({ url: `/bills/${billId}/pdf`, responseHandler: (response) => response.blob() }),
    }),
  }),
});

export const {
  useGetBillForAppointmentQuery,
  useGenerateBillMutation,
  useEmailBillMutation,
  useLazyGetBillPdfQuery,
} = billsApi;
