import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Appointment, Waitlist } from "@/types/api";

export interface JoinWaitlistInput {
  patientId: string;
  treatmentId: string;
  preferredPractitionerId?: string;
  preferredWindowStart?: string;
  preferredWindowEnd?: string;
}

export const waitlistApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listWaitlist: builder.query<Waitlist[], void>({
      query: () => "/waitlist",
      transformResponse: (response: ApiEnvelope<Waitlist[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((w) => ({ type: "Waitlist" as const, id: w._id })), { type: "Waitlist" as const, id: "LIST" }]
          : [{ type: "Waitlist" as const, id: "LIST" }],
    }),
    joinWaitlist: builder.mutation<Waitlist, JoinWaitlistInput>({
      query: (body) => ({ url: "/waitlist", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<Waitlist>) => response.data,
      invalidatesTags: [{ type: "Waitlist", id: "LIST" }],
    }),
    offerSlot: builder.mutation<Appointment, { id: string; slotId: string }>({
      query: ({ id, slotId }) => ({ url: `/waitlist/${id}/offer`, method: "POST", body: { slotId } }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Waitlist", id },
        { type: "Waitlist", id: "LIST" },
        { type: "Appointment", id: "LIST" },
        { type: "Slot", id: "LIST" },
      ],
    }),
    removeFromWaitlist: builder.mutation<void, string>({
      query: (id) => ({ url: `/waitlist/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Waitlist", id: "LIST" }],
    }),
  }),
});

export const { useListWaitlistQuery, useJoinWaitlistMutation, useOfferSlotMutation, useRemoveFromWaitlistMutation } = waitlistApi;
