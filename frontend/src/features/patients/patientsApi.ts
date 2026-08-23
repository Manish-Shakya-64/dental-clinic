import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Gender, Paginated, Patient } from "@/types/api";

interface ListPatientsParams {
  email?: string;
  phone?: string;
  page?: number;
  limit?: number;
}

export interface PatientInput {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  email: string;
  phone: string;
  dob: string;
  address?: string;
  medical_history?: string;
}

export type PatientUpdateInput = Partial<Omit<PatientInput, "dob">>;

function toQueryString(params: ListPatientsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export const patientsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPatient: builder.query<Patient, string>({
      query: (id) => `/patients/${id}`,
      transformResponse: (response: ApiEnvelope<Patient>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Patient", id }],
    }),
    listPatients: builder.query<Paginated<Patient>, ListPatientsParams>({
      query: (params) => `/patients?${toQueryString({ limit: 50, ...params })}`,
      providesTags: (result) =>
        result
          ? [...result.data.map((p) => ({ type: "Patient" as const, id: p._id })), { type: "Patient" as const, id: "LIST" }]
          : [{ type: "Patient" as const, id: "LIST" }],
    }),
    createPatient: builder.mutation<Patient, PatientInput>({
      query: (body) => ({ url: "/patients", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<Patient>) => response.data,
      invalidatesTags: [{ type: "Patient", id: "LIST" }],
    }),
    updatePatient: builder.mutation<Patient, { id: string; body: PatientUpdateInput }>({
      query: ({ id, body }) => ({ url: `/patients/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiEnvelope<Patient>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Patient", id },
        { type: "Patient", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPatientQuery,
  useListPatientsQuery,
  useLazyListPatientsQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
} = patientsApi;
