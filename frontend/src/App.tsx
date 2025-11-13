// frontend/src/App.tsx - COMPLETE FIXED VERSION
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import RegisterVendor from "./components/RegisterVendor";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import MySubmissions from "./components/MySubmissions";
import MultiStepSubmission from "./components/MultiStepSubmission";

// Simple auth check functions
const isVendorAuthenticated = () => {
  return !!localStorage.getItem("vendor");
};

const isAdminAuthenticated = () => {
  return !!localStorage.getItem("admin");
};

// Protected Route components
const VendorRoute = ({ children }: { children: React.ReactNode }) => {
  return isVendorAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  return isAdminAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/admin/login" replace />
  );
};

function App() {
  console.log("=== APP COMPONENT LOADED ===");
  console.log("MultiStepSubmission component:", MultiStepSubmission);
  console.log("MySubmissions component:", MySubmissions);
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Default route - Password protected RFP landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterVendor />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected vendor routes */}
          <Route
            path="/dashboard"
            element={
              <VendorRoute>
                <Dashboard />
              </VendorRoute>
            }
          />
          <Route
            path="/submissions"
            element={
              <VendorRoute>
                <MySubmissions />
              </VendorRoute>
            }
          />
          <Route
            path="/submit-proposal"
            element={
              <VendorRoute>
                <MultiStepSubmission />
              </VendorRoute>
            }
          />
          {/* Add route for editing submissions */}
          <Route
            path="/submissions/:submissionId"
            element={
              <VendorRoute>
                <MultiStepSubmission />
              </VendorRoute>
            }
          />

          {/* Protected admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Navigate to="/admin/dashboard" replace />
              </AdminRoute>
            }
          />

          {/* Catch all route - MUST BE LAST */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
