import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Gender, PersonName } from "@/types/api";

export interface DoctorSummary extends PersonName {
  _id: string;
  gender: Gender;
  specialties: string[];
  profile_image?: string | null;
}

export const doctorsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDoctors: builder.query<DoctorSummary[], void>({
      query: () => "/doctors",
      transformResponse: (response: ApiEnvelope<DoctorSummary[]>) => response.data,
    }),
    getDoctorImage: builder.query<Blob, string>({
      query: (id) => ({ url: `/doctors/${id}/image`, responseHandler: (response) => response.blob() }),
    }),
  }),
});

export const { useListDoctorsQuery, useLazyGetDoctorImageQuery } = doctorsApi;
