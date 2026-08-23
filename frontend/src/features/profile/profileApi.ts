import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, Gender, Patient, Practitioner, Role, StaffMember, WorkingHours } from "@/types/api";

export interface ProfileResponse {
  role: Role;
  profile: Practitioner | Patient | StaffMember;
}

export interface UpdateProfileBody {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  specialties?: string[];
  working_hours?: WorkingHours;
}

export const profileApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<ProfileResponse, void>({
      query: () => "/profile",
      transformResponse: (response: ApiEnvelope<ProfileResponse>) => response.data,
      providesTags: [{ type: "Profile", id: "ME" }],
    }),
    updateMyProfile: builder.mutation<ProfileResponse, UpdateProfileBody>({
      query: (body) => ({ url: "/profile", method: "PATCH", body }),
      transformResponse: (response: ApiEnvelope<ProfileResponse>) => response.data,
      invalidatesTags: [{ type: "Profile", id: "ME" }],
    }),
    getMyProfileImage: builder.query<Blob, void>({
      query: () => ({ url: "/profile/image", responseHandler: (response) => response.blob() }),
      providesTags: [{ type: "Profile", id: "IMAGE" }],
    }),
    uploadProfileImage: builder.mutation<ProfileResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("image", file);
        return { url: "/profile/image", method: "POST", body: formData };
      },
      transformResponse: (response: ApiEnvelope<ProfileResponse>) => response.data,
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "IMAGE" },
      ],
    }),
    deleteProfileImage: builder.mutation<void, void>({
      query: () => ({ url: "/profile/image", method: "DELETE" }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "IMAGE" },
      ],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useLazyGetMyProfileImageQuery,
  useUploadProfileImageMutation,
  useDeleteProfileImageMutation,
} = profileApi;
