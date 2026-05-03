import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "business_owner" | "admin";
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("nafex_token"),
  user: localStorage.getItem("nafex_user") 
    ? JSON.parse(localStorage.getItem("nafex_user")!) 
    : null,
  setAuth: (token, user) => {
    localStorage.setItem("nafex_token", token);
    localStorage.setItem("nafex_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("nafex_token");
    localStorage.removeItem("nafex_user");
    set({ token: null, user: null });
  },
}));
