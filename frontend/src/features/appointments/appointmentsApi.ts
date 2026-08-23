import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Appointment, Medicine, Paginated } from "@/types/api";

interface ListAppointmentsParams {
  from?: string;
  to?: string;
  patient?: string;
  practitioner?: string;
  status?: string;
  code?: string;
  limit?: number;
}

export interface CreateAppointmentInput {
  /** Omit entirely for a PATIENT booking their own appointment — the server derives it from the
   *  auth token. Required when RECEPTIONIST/ADMIN books on a patient's behalf. */
  patientId?: string;
  practitionerId: string;
  roomId: string;
  treatmentId: string;
  startTime: string;
  slotId?: string;
}

function toQueryString(params: ListAppointmentsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export const appointmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listAppointments: builder.query<Paginated<Appointment>, ListAppointmentsParams>({
      query: (params) => `/appointments?${toQueryString({ limit: 100, ...params })}`,
      providesTags: (result) =>
        result
          ? [...result.data.map((a) => ({ type: "Appointment" as const, id: a._id })), { type: "Appointment" as const, id: "LIST" }]
          : [{ type: "Appointment" as const, id: "LIST" }],
    }),
    getAppointment: builder.query<Appointment, string>({
      query: (id) => `/appointments/${id}`,
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),
    addClinicalNote: builder.mutation<Appointment, { id: string; noteText: string }>({
      query: ({ id, noteText }) => ({ url: `/appointments/${id}/notes`, method: "POST", body: { noteText } }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: "Appointment", id }],
    }),
    addMedicine: builder.mutation<Appointment, { id: string; medicine: Medicine }>({
      query: ({ id, medicine }) => ({ url: `/appointments/${id}/medicines`, method: "POST", body: medicine }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: "Appointment", id }],
    }),
    markAppointmentComplete: builder.mutation<Appointment, string>({
      query: (id) => ({ url: `/appointments/${id}`, method: "PATCH", body: { action: "complete" } }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),
    createAppointment: builder.mutation<Appointment, CreateAppointmentInput>({
      query: (body) => ({ url: "/appointments", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: [{ type: "Appointment", id: "LIST" }],
    }),
    checkInAppointment: builder.mutation<Appointment, string>({
      query: (id) => ({ url: `/appointments/${id}`, method: "PATCH", body: { action: "check-in" } }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),
    completeCheckout: builder.mutation<Appointment, string>({
      query: (id) => ({ url: `/appointments/${id}/checkout`, method: "POST" }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),
    rescheduleAppointment: builder.mutation<
      Appointment,
      { id: string; startTime: string; practitionerId?: string; roomId?: string; slotId?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/appointments/${id}`, method: "PATCH", body: { action: "reschedule", ...body } }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
        { type: "Slot", id: "LIST" },
      ],
    }),
    cancelAppointment: builder.mutation<Appointment, string>({
      query: (id) => ({ url: `/appointments/${id}`, method: "PATCH", body: { action: "cancel" } }),
      transformResponse: (response: ApiEnvelope<{ appointment: Appointment }>) => response.data.appointment,
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListAppointmentsQuery,
  useLazyListAppointmentsQuery,
  useGetAppointmentQuery,
  useAddClinicalNoteMutation,
  useAddMedicineMutation,
  useMarkAppointmentCompleteMutation,
  useCreateAppointmentMutation,
  useCheckInAppointmentMutation,
  useCompleteCheckoutMutation,
  useRescheduleAppointmentMutation,
  useCancelAppointmentMutation,
} = appointmentsApi;
