/**
 * Private route wrapper - redirects to login if not authenticated
 */

import { Navigate, useLocation } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
