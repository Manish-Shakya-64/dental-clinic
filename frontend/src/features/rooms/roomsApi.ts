import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Room, RoomStatus } from "@/types/api";

export interface RoomInput {
  name: string;
  equipment_tags?: string[];
  status?: RoomStatus;
}

export const roomsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listRooms: builder.query<Room[], void>({
      query: () => "/rooms",
      transformResponse: (response: ApiEnvelope<Room[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((r) => ({ type: "Room" as const, id: r._id })), { type: "Room" as const, id: "LIST" }]
          : [{ type: "Room" as const, id: "LIST" }],
    }),
    createRoom: builder.mutation<Room, RoomInput>({
      query: (body) => ({ url: "/rooms", method: "POST", body }),
      transformResponse: (response: ApiEnvelope<Room>) => response.data,
      invalidatesTags: [{ type: "Room", id: "LIST" }],
    }),
    updateRoom: builder.mutation<Room, { id: string; body: Partial<RoomInput> }>({
      query: ({ id, body }) => ({ url: `/rooms/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiEnvelope<Room>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Room", id },
        { type: "Room", id: "LIST" },
      ],
    }),
    deleteRoom: builder.mutation<void, string>({
      query: (id) => ({ url: `/rooms/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Room", id: "LIST" }],
    }),
  }),
});

export const { useListRoomsQuery, useCreateRoomMutation, useUpdateRoomMutation, useDeleteRoomMutation } = roomsApi;
