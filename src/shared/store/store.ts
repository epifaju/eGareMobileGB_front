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
    getDefaultMiddleware({
      // Émulateur / gros cache RTK Query : éviter les WARN dev sur le seuil 32 ms par défaut.
      serializableCheck: { warnAfter: 128 },
      immutableCheck: { warnAfter: 128 },
    })
      .prepend(authListener.middleware)
      .concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
