// frontend/src/components/AdminLogin.tsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  ChevronRight,
  Building2,
  Server,
  Cpu,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus email
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Rate limiting and lockout
  useEffect(() => {
    if (loginAttempts >= 3) {
      setIsLocked(true);
      setLockTime(30); // 30 seconds lockout

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
      const res = await axios.post(
        `${API_BASE}/api/admin/login`,
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
        // Secure session storage
        const adminData = {
          ...res.data.admin,
          loginTime: Date.now(),
          sessionId: Math.random().toString(36).substr(2, 9),
        };

        localStorage.setItem("admin", JSON.stringify(adminData));
        localStorage.setItem("admin_session", "active");

        // Redirect with replace (no back button)
        navigate("/admin", { replace: true });
      } else {
        throw new Error(res.data.error || "Login failed");
      }
    } catch (err: any) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);

      let errorMessage = "Invalid credentials. Please try again.";

      if (err.code === "ECONNABORTED" || err.response?.status === 408) {
        errorMessage = "Request timeout. Please check your connection.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      if (attempts >= 3) {
        errorMessage = `Too many failed attempts. Account locked for 30 seconds.`;
      } else {
        errorMessage += ` (${attempts}/3 attempts)`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="text-white space-y-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Atlas RFP
                </h1>
                <p className="text-blue-200 text-sm font-medium">
                  Enterprise Admin Portal
                </p>
              </div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              Secure Admin
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h2>

            <p className="text-lg text-blue-200/80 leading-relaxed max-w-md">
              Access the complete vendor management system with enterprise-grade
              security and real-time analytics.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-200/90">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-medium">Real-time Analytics Dashboard</span>
            </div>

            <div className="flex items-center gap-3 text-blue-200/90">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-medium">Vendor Approval System</span>
            </div>

            <div className="flex items-center gap-3 text-blue-200/90">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="font-medium">Advanced RFP Management</span>
            </div>
          </div>

          {/* Security Badges */}
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-300">
                256-bit AES
              </span>
            </div>
            <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">
                2FA Ready
              </span>
            </div>
            <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">
                SOC 2 Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="relative z-10">
          {/* Security Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-white">
                  Admin Authentication
                </p>
                <p className="text-sm text-blue-200/80">
                  Restricted Access • Enterprise Portal
                </p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                Secure Login
              </h1>
              <p className="text-blue-200/80 text-sm">
                Enter your enterprise admin credentials
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-blue-300/80" />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition placeholder-blue-200/50 text-white backdrop-blur-sm"
                    placeholder="admin@atlasrfp.com"
                    required
                    autoComplete="username"
                    spellCheck={false}
                    disabled={isLocked || loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-white"
                  >
                    Master Password
                  </label>
                  {password && (
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
                      <span className="text-xs text-blue-200/80 capitalize">
                        {securityLevel} security
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-300/80" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-4 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-white backdrop-blur-sm placeholder-blue-200/50"
                    placeholder="Enter your secure password"
                    required
                    autoComplete="current-password"
                    minLength={8}
                    disabled={isLocked || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300/80 hover:text-blue-200 transition"
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
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 text-sm backdrop-blur-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Authentication Failed</p>
                    <p className="text-red-100/90 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Lockout Timer */}
              {isLocked && (
                <div className="bg-orange-500/20 border border-orange-500/30 text-orange-200 p-4 rounded-xl flex items-center gap-3 text-sm backdrop-blur-sm">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Account Temporarily Locked</p>
                    <p className="text-orange-100/90 mt-1">
                      Please wait {lockTime} seconds before trying again
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isLocked || !email || !password}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl text-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                    <span className="relative z-10">Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Secure Login</span>
                    <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Footer */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center justify-center gap-6 text-xs text-blue-200/70">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="w-1 h-1 bg-blue-400/50 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Rate-limited</span>
                </div>
                <div className="w-1 h-1 bg-blue-400/50 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Session-bound</span>
                </div>
              </div>
            </div>

            {/* Support & Back Links */}
            <div className="mt-6 space-y-3 text-center">
              <p className="text-xs text-blue-200/60">
                Need access? Contact{" "}
                <a
                  href="mailto:security@atlasrfp.com"
                  className="text-blue-300 hover:text-blue-200 font-medium underline transition"
                >
                  security@atlasrfp.com
                </a>
              </p>

              <div className="pt-3 border-t border-white/10">
                <Link
                  to="/"
                  className="text-xs text-blue-300/70 hover:text-blue-200 font-medium transition inline-flex items-center gap-1"
                >
                  ← Back to Main Site
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 text-center">
            <p className="text-xs text-blue-300/50 font-medium">
              Atlas RFP Platform • v2.4.1 • Enterprise Edition
            </p>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>
    </div>
  );
}
