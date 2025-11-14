import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Shield,
  CheckCircle2,
  Sparkles,
  UserCog,
  Key,
  Briefcase,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"vendor" | "admin">("vendor");
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email on load
  useEffect(() => {
    emailInputRef.current?.focus();
  }, [activeTab]);

  // Rate limiting and lockout
  useEffect(() => {
    if (loginAttempts >= 5) {
      setIsLocked(true);
      setLockTime(30);

      const timer = setInterval(() => {
        setLockTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsLocked(false);
            setLoginAttempts(0);
            setError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loginAttempts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Account temporarily locked. Try again in ${lockTime} seconds.`);
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      if (activeTab === "vendor") {
        // Vendor login
        const res = await axios.post(
          `${API_BASE}/api/login`,
          {
            email: email.trim().toLowerCase(),
            password,
          },
          {
            timeout: 15000,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
          }
        );

        if (res.data.success) {
          const vendorData = {
            ...res.data.vendor,
            loginTime: Date.now(),
            sessionId: Math.random().toString(36).substr(2, 9),
          };

          localStorage.setItem("vendor", JSON.stringify(vendorData));
          localStorage.setItem("vendor_session", "active");
          // REDIRECT TO LANDING PAGE INSTEAD OF DASHBOARD
          window.location.href = "/";
        } else {
          throw new Error(res.data.error || "Login failed");
        }
      } else {
        // Admin login
        const res = await axios.post(
          `${API_BASE}/api/admin/login`,
          {
            email: email.trim().toLowerCase(),
            password,
          },
          {
            timeout: 15000,
          }
        );

        if (res.data.success) {
          localStorage.setItem("admin", JSON.stringify(res.data.admin));
          // REDIRECT TO LANDING PAGE INSTEAD OF ADMIN DASHBOARD
          window.location.href = "/";
        } else {
          throw new Error(res.data.error || "Admin login failed");
        }
      }
    } catch (err: any) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);

      let errorMessage =
        activeTab === "vendor"
          ? "Invalid credentials. Please try again."
          : "Invalid admin credentials.";

      if (err.code === "ECONNABORTED" || err.response?.status === 408) {
        errorMessage = "Request timeout. Please check your connection.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;

        // Handle vendor account status errors
        if (activeTab === "vendor") {
          if (err.response.data.status === "Pending Approval") {
            errorMessage =
              "Your account is pending admin approval. You'll receive an email once approved.";
          } else if (err.response.data.status === "Declined") {
            errorMessage =
              "Your account has been declined. Please contact support for more information.";
          }
        }
      }

      if (attempts >= 5) {
        errorMessage = `Too many failed attempts. Account locked for 30 seconds.`;
      } else {
        errorMessage += ` (${attempts}/5 attempts)`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityLevel = () => {
    if (password.length === 0) return "low";
    if (password.length < 8) return "medium";
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    )
      return "high";
    return "medium";
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding & Features */}
        <div className="text-gray-900 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Private Aviation RFP Portal
                </h1>
                <p className="text-gray-600 text-sm font-medium">
                  Secure Access Gateway
                </p>
              </div>
            </div>

            <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Aviation RFP
              </span>
            </h2>

            <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
              Access your dedicated portal. Vendors can submit proposals, admins
              can manage the RFP process for a luxury credit card and concierge
              company.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-gray-700">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">For Vendors</p>
                <p className="text-sm text-gray-600">
                  Access RFPs, submit proposals, track submissions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">For Administrators</p>
                <p className="text-sm text-gray-600">
                  Manage vendors, review submissions, create RFPs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Secure & Efficient</p>
                <p className="text-sm text-gray-600">
                  End-to-end encrypted, streamlined workflows
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-3 pt-6">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                NDA Protected
              </span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Secure Access
              </span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">
                24/7 Support
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Login Card */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-200/60">
              {/* Tab Selection */}
              <div className="flex gap-2 mb-8 bg-gray-100/80 p-1.5 rounded-2xl">
                <button
                  onClick={() => {
                    setActiveTab("vendor");
                    setError("");
                    setEmail("");
                    setPassword("");
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    activeTab === "vendor"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Briefcase className="w-4 h-4" />
                    Vendor Login
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("admin");
                    setError("");
                    setEmail("");
                    setPassword("");
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    activeTab === "admin"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <UserCog className="w-4 h-4" />
                    Admin Login
                  </div>
                </button>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <div
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4 ${
                    activeTab === "vendor"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "bg-gradient-to-r from-orange-600 to-red-600"
                  }`}
                >
                  {activeTab === "vendor" ? (
                    <Lock className="w-7 h-7 text-white" />
                  ) : (
                    <Key className="w-7 h-7 text-white" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab === "vendor" ? "Vendor Portal" : "Admin Portal"}
                </h1>
                <p className="text-gray-600 mt-2">
                  {activeTab === "vendor"
                    ? "Sign in to your vendor account"
                    : "Administrative access only"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-3"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400 bg-white/50 backdrop-blur-sm"
                      placeholder={
                        activeTab === "vendor"
                          ? "you@company.com"
                          : "admin@company.com"
                      }
                      required
                      autoComplete="email"
                      disabled={isLocked || loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700"
                    >
                      Password
                    </label>
                    {password && activeTab === "vendor" && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            securityLevel === "low"
                              ? "bg-red-400"
                              : securityLevel === "medium"
                              ? "bg-yellow-400"
                              : "bg-green-400"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-500 capitalize">
                          {securityLevel}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white/50 backdrop-blur-sm placeholder-gray-400"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={isLocked || loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                      disabled={isLocked || loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Sign in failed</p>
                      <p className="text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Lockout Timer */}
                {isLocked && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">
                        Account Temporarily Locked
                      </p>
                      <p className="text-orange-600 mt-1">
                        Please wait {lockTime} seconds before trying again
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || isLocked || !email || !password}
                  className={`w-full py-4 text-white font-bold rounded-xl focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-lg group relative overflow-hidden ${
                    activeTab === "vendor"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-100"
                      : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:ring-orange-100"
                  }`}
                >
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      activeTab === "vendor"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-gradient-to-r from-orange-500 to-red-500"
                    }`}
                  ></div>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      <span className="relative z-10">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">
                        {activeTab === "vendor"
                          ? "Sign In to Vendor Portal"
                          : "Sign In to Admin Portal"}
                      </span>
                      <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-8 text-center space-y-4">
                {activeTab === "vendor" && (
                  <p className="text-sm text-gray-600">
                    Not registered yet?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
                    >
                      Register as Vendor
                    </Link>
                  </p>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {activeTab === "vendor"
                      ? "Secure vendor portal access"
                      : "Restricted administrative access"}
                  </p>
                </div>

                <p className="text-xs text-gray-500 pt-2">
                  Need help?{" "}
                  <a
                    href="mailto:support@aviationrfp.com"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>

            {/* Security Footer */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secure portal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        ></div>
      </div>
    </div>
  );
}
