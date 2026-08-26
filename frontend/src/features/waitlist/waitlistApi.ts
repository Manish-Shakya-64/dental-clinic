import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Appointment, Waitlist } from "@/types/api";

export interface JoinWaitlistInput {
  patientId: string;
  treatmentId: string;
  preferredPractitionerId?: string;
  preferredWindowStart?: string;
  preferredWindowEnd?: string;
}

/** What the public accept page needs to render before the patient commits. */
export interface WaitlistOfferView {
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "SUPERSEDED";
  expiresAt: string;
  treatmentLabel: string;
  doctorName: string;
  roomName: string;
  startTime: string;
  patientName: string;
  claimable: boolean;
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
    /** Reception's "Send offer" — emails an accept link instead of booking outright. */
    sendWaitlistOffer: builder.mutation<{ sent: number }, { id: string; slotId: string }>({
      query: ({ id, slotId }) => ({ url: `/waitlist/${id}/send-offer`, method: "POST", body: { slotId } }),
      transformResponse: (response: ApiEnvelope<{ sent: number }>) => response.data,
      invalidatesTags: [{ type: "Waitlist", id: "LIST" }],
    }),
    /** Token-authenticated and public — the patient clicking through from email isn't signed in. */
    getWaitlistOffer: builder.query<WaitlistOfferView, string>({
      query: (token) => `/waitlist/offers/${token}`,
      transformResponse: (response: ApiEnvelope<WaitlistOfferView>) => response.data,
      providesTags: (_r, _e, token) => [{ type: "Waitlist", id: `offer-${token}` }],
    }),
    acceptWaitlistOffer: builder.mutation<Appointment, string>({
      query: (token) => ({ url: `/waitlist/offers/${token}/accept`, method: "POST" }),
      transformResponse: (response: ApiEnvelope<Appointment>) => response.data,
      invalidatesTags: (_r, _e, token) => [{ type: "Waitlist", id: `offer-${token}` }],
    }),
    declineWaitlistOffer: builder.mutation<{ message: string }, string>({
      query: (token) => ({ url: `/waitlist/offers/${token}/decline`, method: "POST" }),
      transformResponse: (response: ApiEnvelope<{ message: string }>) => response.data,
      invalidatesTags: (_r, _e, token) => [{ type: "Waitlist", id: `offer-${token}` }],
    }),
    removeFromWaitlist: builder.mutation<void, string>({
      query: (id) => ({ url: `/waitlist/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Waitlist", id: "LIST" }],
    }),
  }),
});

export const {
  useListWaitlistQuery,
  useJoinWaitlistMutation,
  useOfferSlotMutation,
  useSendWaitlistOfferMutation,
  useGetWaitlistOfferQuery,
  useAcceptWaitlistOfferMutation,
  useDeclineWaitlistOfferMutation,
  useRemoveFromWaitlistMutation,
} = waitlistApi;
