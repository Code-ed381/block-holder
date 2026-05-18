/**
 * ProtectedRoute Component
 * Enforces authentication and role-based access control
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuth();

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but role not allowed - redirect to 404
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/not-found" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
};
