import { apiSlice } from "@/api/apiSlice";
import type { Gender, Paginated, Role, StaffRow, WorkingHours } from "@/types/api";

export interface ListStaffParams {
  role?: Role;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

function toQueryString(params: ListStaffParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export interface CreateStaffInput {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  specialties?: string[];
  working_hours?: WorkingHours;
}

export interface UpdateStaffInput {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  specialties?: string[];
  working_hours?: WorkingHours;
  is_active?: boolean;
}

export const staffApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listStaff: builder.query<Paginated<StaffRow>, ListStaffParams | void>({
      query: (params) => `/staff?${toQueryString({ limit: 20, ...(params ?? {}) })}`,
      providesTags: (result) =>
        result
          ? [...result.data.map((s) => ({ type: "Staff" as const, id: s.id })), { type: "Staff" as const, id: "LIST" }]
          : [{ type: "Staff" as const, id: "LIST" }],
    }),
    createStaff: builder.mutation<void, CreateStaffInput>({
      query: (body) => ({ url: "/staff", method: "POST", body }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
    updateStaff: builder.mutation<void, { id: string; body: UpdateStaffInput }>({
      query: ({ id, body }) => ({ url: `/staff/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
      ],
    }),
    removeStaff: builder.mutation<void, string>({
      query: (id) => ({ url: `/staff/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
  }),
});

export const { useListStaffQuery, useCreateStaffMutation, useUpdateStaffMutation, useRemoveStaffMutation } = staffApi;
