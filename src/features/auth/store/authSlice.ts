import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { tokenStorage } from '@/shared/lib/tokenStorage';

type AuthState = {
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  isAuthenticated: tokenStorage.hasValidSession(),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    logout(state) {
      tokenStorage.clearTokens();
      state.isAuthenticated = false;
    },
    hydrateFromStorage(state) {
      state.isAuthenticated = tokenStorage.hasValidSession();
    },
  },
});

export const { setAuthenticated, logout, hydrateFromStorage } = authSlice.actions;
