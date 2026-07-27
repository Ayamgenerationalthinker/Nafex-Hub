import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "business_owner" | "admin";
  emailVerified?: boolean;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const getInitialUser = (): User | null => {
  try {
    const raw = localStorage.getItem("nafex_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[useAuth] Failed to parse stored user, clearing invalid session:", err);
    try {
      localStorage.removeItem("nafex_user");
      localStorage.removeItem("nafex_token");
    } catch {}
    return null;
  }
};

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("nafex_token"),
  user: getInitialUser(),
  setAuth: (token, user) => {
    try {
      localStorage.setItem("nafex_token", token);
      localStorage.setItem("nafex_user", JSON.stringify(user));
    } catch {}
    set({ token, user });
  },
  updateUser: (patch) => {
    set((state) => {
      if (!state.user) return state;
      const next = { ...state.user, ...patch };
      try {
        localStorage.setItem("nafex_user", JSON.stringify(next));
      } catch {}
      return { user: next };
    });
  },
  logout: () => {
    try {
      localStorage.removeItem("nafex_token");
      localStorage.removeItem("nafex_user");
    } catch {}
    set({ token: null, user: null });
  },
}));
