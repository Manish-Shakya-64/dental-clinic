import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types/api";

const STORAGE_KEY = "brightsmile.auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function persist(state: AuthState) {
  if (state.accessToken && state.refreshToken && state.user) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: state.accessToken, refreshToken: state.refreshToken, user: state.user }),
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

const stored = loadStoredAuth();

const initialState: AuthState = {
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  user: stored?.user ?? null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: AuthUser }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      persist(state);
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      persist(state);
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      persist(state);
    },
  },
});

export const { setCredentials, setAccessToken, logout } = authSlice.actions;
export default authSlice.reducer;
