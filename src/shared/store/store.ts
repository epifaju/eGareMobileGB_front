import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';

import { logout, authSlice } from '@/features/auth/store/authSlice';
import { baseApi } from '@/shared/api/baseApi';

import '@/features/auth/api/authApi';
import '@/features/reservation/api/bookingApi';
import '@/features/search/api/searchApi';
import '@/features/station/api/stationApi';
import '@/features/vehicle/api/vehicleApi';

const authListener = createListenerMiddleware();

authListener.startListening({
  matcher: logout.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(baseApi.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authListener.middleware).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
