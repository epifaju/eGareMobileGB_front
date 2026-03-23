import type { PageBooking } from '@/features/reservation/types';
import { baseApi } from '@/shared/api/baseApi';

export const bookingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBookings: builder.query<
      PageBooking,
      { includeCancelled: boolean; page: number; size: number }
    >({
      query: ({ includeCancelled, page, size }) => ({
        url: '/api/me/bookings',
        params: { includeCancelled, page, size },
      }),
      providesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    cancelBooking: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/bookings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
  }),
});

export const { useGetMyBookingsQuery, useCancelBookingMutation } = bookingApi;
