import { apiSlice } from "@/api/apiSlice";
import type { ApiEnvelope, DashboardReport } from "@/types/api";

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardReport: builder.query<DashboardReport, void>({
      query: () => "/reports/dashboard",
      transformResponse: (response: ApiEnvelope<DashboardReport>) => response.data,
      providesTags: [{ type: "Report", id: "DASHBOARD" }],
    }),
  }),
});

export const { useGetDashboardReportQuery } = reportsApi;
