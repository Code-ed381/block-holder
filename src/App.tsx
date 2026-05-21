/**
 * App Component
 * Main routing and app setup with role-based access control
 */

import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { EmployeeManagement } from "./pages/EmployeeManagement";
import { ProductionLogging } from "./pages/ProductionLogging";
import { Inventory } from "./pages/Inventory";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { ProductionConfig } from "./pages/ProductionConfig";
import { SalaryApproval } from "./pages/SalaryApproval";
import { SalaryBatchSubmission } from "./pages/SalaryBatchSubmission";
import { Reports } from "./pages/Reports";
import { AllDataView } from "./pages/AllDataView";
import { NotFound } from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ToastProvider } from "./context/ToastContext";

function AppContent() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={
                user?.role === "Supervisor"
                  ? "/supervisor"
                  : user?.role === "Employee"
                  ? "/employee"
                  : "/manager"
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate
              to={
                user?.role === "Supervisor"
                  ? "/supervisor"
                  : user?.role === "Employee"
                  ? "/employee"
                  : "/manager"
              }
              replace
            />
          ) : (
            <Signup />
          )
        }
      />

      {/* Protected routes - Employee */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={["Employee"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - Supervisor */}
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute allowedRoles={["Supervisor"]}>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/employees"
        element={
          <ProtectedRoute allowedRoles={["Supervisor"]}>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/production"
        element={
          <ProtectedRoute allowedRoles={["Supervisor"]}>
            <ProductionLogging />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/inventory"
        element={
          <ProtectedRoute allowedRoles={["Supervisor"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/salary-batch"
        element={
          <ProtectedRoute allowedRoles={["Supervisor"]}>
            <SalaryBatchSubmission />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/employees"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/inventory"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/production-config"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <ProductionConfig />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/salary-approval"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <SalaryApproval />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/reports"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/all-data"
        element={
          <ProtectedRoute allowedRoles={["Manager"]}>
            <AllDataView />
          </ProtectedRoute>
        }
      />

      {/* Home redirect */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <Navigate
              to={
                user.role === "Supervisor"
                  ? "/supervisor"
                  : user.role === "Employee"
                  ? "/employee"
                  : "/manager"
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 page */}
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App;
