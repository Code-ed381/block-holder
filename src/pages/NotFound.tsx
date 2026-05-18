/**
 * Not Found Page
 * 404 error page for undefined routes or unauthorized access
 */

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const NotFound: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const dashboardLink =
    isAuthenticated && user
      ? user.role === "Supervisor"
        ? "/supervisor"
        : "/manager"
      : "/login";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-2xl text-blue-100 mb-6">Page Not Found</p>
        <p className="text-blue-100 mb-8">
          The page you're looking for doesn't exist or you don't have permission
          to access it.
        </p>
        <Link
          to={dashboardLink}
          className="bg-white text-blue-600 font-bold py-3 px-6 rounded-lg hover:bg-blue-50 transition"
        >
          Go Back to Dashboard
        </Link>
      </div>
    </div>
  );
};
