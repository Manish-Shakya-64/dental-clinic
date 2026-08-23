import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Treatment } from "@/types/api";

export interface TreatmentInput {
  label: string;
  default_duration_mins: number;
  buffer_after_mins?: number;
  price: number;
  is_active?: boolean;
}

export const treatmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listTreatments: builder.query<Treatment[], void>({
      query: () => "/treatments",
      transformResponse: (response: ApiEnvelope<Treatment[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((t) => ({ type: "Treatment" as const, id: t._id })), { type: "Treatment" as const, id: "LIST" }]
          : [{ type: "Treatment" as const, id: "LIST" }],
    }),
    createTreatment: builder.mutation<Treatment, TreatmentInput>({
      query: (body) => ({ url: "/treatments", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<Treatment>) => response.data,
      invalidatesTags: [{ type: "Treatment", id: "LIST" }],
    }),
    updateTreatment: builder.mutation<Treatment, { id: string; body: Partial<TreatmentInput> }>({
      query: ({ id, body }) => ({ url: `/treatments/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiEnvelope<Treatment>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Treatment", id },
        { type: "Treatment", id: "LIST" },
      ],
    }),
  }),
});

export const { useListTreatmentsQuery, useCreateTreatmentMutation, useUpdateTreatmentMutation } = treatmentsApi;
