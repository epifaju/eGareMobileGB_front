import type {
  AdminAuditEntry,
  AdminDashboard,
  AdminStation,
  AdminStationWrite,
  AdminUserSummary,
  AdminVehicle,
  AdminVehicleCreate,
  AdminVehicleUpdate,
  SpringPage,
  UpdateUserRoleBody,
} from '@/features/admin/types';
import { baseApi } from '@/shared/api/baseApi';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<AdminDashboard, void>({
      query: () => '/api/admin/dashboard',
      providesTags: [{ type: 'AdminDashboard', id: 'SNAPSHOT' }],
    }),

    getAdminStations: builder.query<
      SpringPage<AdminStation>,
      { page?: number; size?: number; includeArchived?: boolean }
    >({
      query: ({ page = 0, size = 50, includeArchived = false }) => ({
        url: '/api/admin/stations',
        params: { page, size, includeArchived, sort: 'name,asc' },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'AdminStation' as const, id })),
              { type: 'AdminStation', id: 'LIST' },
            ]
          : [{ type: 'AdminStation', id: 'LIST' }],
    }),

    createAdminStation: builder.mutation<AdminStation, AdminStationWrite>({
      query: (body) => ({ url: '/api/admin/stations', method: 'POST', body }),
      invalidatesTags: [
        { type: 'AdminStation', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
        { type: 'Station', id: 'LIST' },
      ],
    }),

    updateAdminStation: builder.mutation<AdminStation, { stationId: number; body: AdminStationWrite }>({
      query: ({ stationId, body }) => ({
        url: `/api/admin/stations/${stationId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { stationId }) => [
        { type: 'AdminStation', id: stationId },
        { type: 'AdminStation', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
        { type: 'Station', id: stationId },
        { type: 'Station', id: 'LIST' },
      ],
    }),

    archiveAdminStation: builder.mutation<AdminStation, number>({
      query: (stationId) => ({
        url: `/api/admin/stations/${stationId}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, stationId) => [
        { type: 'AdminStation', id: stationId },
        { type: 'AdminStation', id: 'LIST' },
        { type: 'AdminVehicle', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
        { type: 'Station', id: 'LIST' },
        { type: 'Vehicle', id: stationId },
      ],
    }),

    getAdminVehicles: builder.query<
      SpringPage<AdminVehicle>,
      { stationId?: number; page?: number; size?: number; includeArchived?: boolean }
    >({
      query: ({ stationId, page = 0, size = 50, includeArchived = false }) => ({
        url: '/api/admin/vehicles',
        params: {
          ...(stationId != null ? { stationId } : {}),
          page,
          size,
          includeArchived,
          sort: 'id,asc',
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'AdminVehicle' as const, id })),
              { type: 'AdminVehicle', id: 'LIST' },
            ]
          : [{ type: 'AdminVehicle', id: 'LIST' }],
    }),

    createAdminVehicle: builder.mutation<
      AdminVehicle,
      { stationId: number; body: AdminVehicleCreate }
    >({
      query: ({ stationId, body }) => ({
        url: `/api/admin/stations/${stationId}/vehicles`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { stationId }) => [
        { type: 'AdminVehicle', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
        { type: 'Vehicle', id: stationId },
      ],
    }),

    updateAdminVehicle: builder.mutation<
      AdminVehicle,
      { vehicleId: number; body: AdminVehicleUpdate }
    >({
      query: ({ vehicleId, body }) => ({
        url: `/api/admin/vehicles/${vehicleId}`,
        method: 'PUT',
        body: stripUndefined(body as Record<string, unknown>),
      }),
      invalidatesTags: (_r, _e, { vehicleId }) => [
        { type: 'AdminVehicle', id: vehicleId },
        { type: 'AdminVehicle', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
      ],
    }),

    archiveAdminVehicle: builder.mutation<AdminVehicle, number>({
      query: (vehicleId) => ({
        url: `/api/admin/vehicles/${vehicleId}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, vehicleId) => [
        { type: 'AdminVehicle', id: vehicleId },
        { type: 'AdminVehicle', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
      ],
    }),

    getAdminUsers: builder.query<SpringPage<AdminUserSummary>, { q?: string; page?: number; size?: number }>(
      {
        query: ({ q, page = 0, size = 20 }) => ({
          url: '/api/admin/users',
          params: { ...(q != null && q.trim() !== '' ? { q: q.trim() } : {}), page, size, sort: 'id,asc' },
        }),
        providesTags: (result) =>
          result
            ? [
                ...result.content.map(({ id }) => ({ type: 'AdminUser' as const, id })),
                { type: 'AdminUser', id: 'LIST' },
              ]
            : [{ type: 'AdminUser', id: 'LIST' }],
      },
    ),

    getAdminUserById: builder.query<AdminUserSummary, number>({
      query: (id) => `/api/admin/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminUser', id }],
    }),

    updateAdminUserRole: builder.mutation<
      { id: number; phoneNumber: string; role: string },
      { userId: number; body: UpdateUserRoleBody }
    >({
      query: ({ userId, body }) => ({
        url: `/api/admin/users/${userId}/role`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: 'AdminUser', id: userId },
        { type: 'AdminUser', id: 'LIST' },
        { type: 'AdminDashboard', id: 'SNAPSHOT' },
      ],
    }),

    getAdminAuditLog: builder.query<SpringPage<AdminAuditEntry>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({
        url: '/api/admin/audit-log',
        params: { page, size },
      }),
      providesTags: [{ type: 'AdminAudit', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetAdminStationsQuery,
  useCreateAdminStationMutation,
  useUpdateAdminStationMutation,
  useArchiveAdminStationMutation,
  useGetAdminVehiclesQuery,
  useCreateAdminVehicleMutation,
  useUpdateAdminVehicleMutation,
  useArchiveAdminVehicleMutation,
  useGetAdminUsersQuery,
  useGetAdminUserByIdQuery,
  useUpdateAdminUserRoleMutation,
  useGetAdminAuditLogQuery,
} = adminApi;
