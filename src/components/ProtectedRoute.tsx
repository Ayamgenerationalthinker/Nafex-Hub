// src/components/ProtectedRoute.tsx
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  component: React.ComponentType;
  roles?: Array<"user" | "business_owner" | "admin">;
  to?: string;
}

export default function ProtectedRoute({ component: Component, roles, to = "/login" }: ProtectedRouteProps) {
  const { user } = useAuth();
  const [, nav] = useLocation();

  useEffect(() => {
    if (!user) nav(to);
    else if (roles && !roles.includes(user.role)) nav(to);
  }, [user, roles, nav, to]);

  if (!user || (roles && !roles.includes(user.role))) return null;
  return <Component />;
}
