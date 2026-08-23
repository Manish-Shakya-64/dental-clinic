import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Slot, SlotStatus } from "@/types/api";

interface ListSlotsParams {
  practitioner?: string;
  status?: SlotStatus;
  from?: string;
  to?: string;
}

export interface CreateSlotInput {
  practitionerId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  repeatWeeks?: number;
}

export interface UpdateSlotInput {
  startTime?: string;
  endTime?: string;
  status?: SlotStatus;
}

function toQueryString(params: ListSlotsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

export const slotsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listSlots: builder.query<Slot[], ListSlotsParams>({
      query: (params) => `/slots?${toQueryString(params)}`,
      transformResponse: (response: ApiEnvelope<Slot[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((s) => ({ type: "Slot" as const, id: s._id })), { type: "Slot" as const, id: "LIST" }]
          : [{ type: "Slot" as const, id: "LIST" }],
    }),
    createSlot: builder.mutation<void, CreateSlotInput>({
      query: (body) => ({ url: "/slots", method: "POST", body }),
      invalidatesTags: [{ type: "Slot", id: "LIST" }],
    }),
    updateSlot: builder.mutation<Slot, { id: string; body: UpdateSlotInput }>({
      query: ({ id, body }) => ({ url: `/slots/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiEnvelope<Slot>) => response.data,
      invalidatesTags: [{ type: "Slot", id: "LIST" }],
    }),
    deleteSlot: builder.mutation<void, string>({
      query: (id) => ({ url: `/slots/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Slot", id: "LIST" }],
    }),
  }),
});

export const { useListSlotsQuery, useCreateSlotMutation, useUpdateSlotMutation, useDeleteSlotMutation } = slotsApi;
