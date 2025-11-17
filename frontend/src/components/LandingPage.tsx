import { useState, useEffect } from "react";
import {
  Lock,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  FileText,
  Users,
  MessageSquare,
  Database,
  BarChart3,
  Eye,
  Workflow,
  Calendar,
  LogOut,
  Lock as LockIcon,
  X,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [showGuidance, setShowGuidance] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check against environment variable or hardcoded for now
    const correctPassword = import.meta.env.VITE_RFP_PASSWORD || "aviation2025";

    if (password === correctPassword) {
      setIsAuthenticated(true);
      setError("");
      // Store in session for duration of visit
      sessionStorage.setItem("rfp_authenticated", "true");
    } else {
      setError("Invalid password. Please try again.");
    }
  };

  // Show guidance popup when vendor logs in and content unlocks
  useEffect(() => {
    const vendor = localStorage.getItem("vendor");
    const hasSeenGuidance = sessionStorage.getItem("hasSeenGuidance");

    if (vendor && !hasSeenGuidance && isAuthenticated) {
      setShowGuidance(true);
      sessionStorage.setItem("hasSeenGuidance", "true");
    }
  }, [isAuthenticated]);

  // Check if already authenticated in this session
  if (!isAuthenticated && !sessionStorage.getItem("rfp_authenticated")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Private Aviation RFP
            </h1>
            <p className="text-white/70">
              Enter the password provided to access this RFP
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                required
              />
            </div>
            {error && (
              <div className="text-red-300 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center justify-center"
            >
              Access RFP
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </form>

          <div className="mt-6 text-center text-white/50 text-sm">
            <p>Password required for security and confidentiality</p>
          </div>
        </div>
      </div>
    );
  }

  // RFP CONTENT (shown after password authentication)
  return (
    <div className="min-h-screen bg-white">
      {/* Guidance Popup */}
      {showGuidance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Welcome Back!
                </h3>
              </div>
              <button
                onClick={() => setShowGuidance(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Full RFP Content Unlocked!
                </h4>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  You now have access to the complete RFP documentation
                  including detailed requirements, technical specifications, and
                  submission guidelines.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                  <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    What to do next:
                  </h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Scroll down to review detailed RFP requirements
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Watch the overview video for context
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Start your submission when ready
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGuidance(false)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-center"
              >
                Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900">
                Private Aviation RFP
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {localStorage.getItem("vendor") ||
              localStorage.getItem("admin") ? (
                // UPDATED: Better header buttons for logged-in users
                <>
                  <a
                    href={
                      localStorage.getItem("admin")
                        ? "/admin/dashboard"
                        : "/dashboard"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </a>

                  {localStorage.getItem("vendor") && (
                    <a
                      href="/submit-proposal"
                      className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-all duration-200 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-200"
                    >
                      <FileText className="w-4 h-4" />
                      New Submission
                    </a>
                  )}

                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-600 font-medium transition-all duration-200 hover:bg-purple-50 rounded-lg border border-transparent hover:border-purple-200"
                  >
                    <Eye className="w-4 h-4" />
                    View RFP
                  </a>

                  <button
                    onClick={() => {
                      localStorage.removeItem("vendor");
                      localStorage.removeItem("admin");
                      sessionStorage.removeItem("hasSeenGuidance");
                      window.location.href = "/";
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-all duration-200 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                // UPDATED: Better login button design
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  Vendor Portal
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-8">
            <Shield className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-700">
              Confidential RFP • Luxury Credit Card & Concierge Company
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
            Private Aviation Workflow
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Modernization RFP
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Seeking a technology partner to modernize private jet charter
            workflows through a unified, data-driven platform that enhances
            operational efficiency and delivers a frictionless, high-touch
            experience for both clients and internal teams.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            {/* FIXED: "Begin Submission" button logic */}
            {localStorage.getItem("vendor") ? (
              // If vendor is logged in, go to new submission
              <a
                href="/submit-proposal"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Begin Submission
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            ) : (
              // If not logged in, go to registration
              <a
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Begin Submission
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            )}

            {!localStorage.getItem("vendor") &&
              !localStorage.getItem("admin") && (
                <a
                  href="/login"
                  className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300 border border-gray-300 hover:shadow-lg"
                >
                  <Lock className="mr-2 h-5 w-5" />
                  Already Registered? Login
                </a>
              )}
          </div>

          {/* Scroll indicator for logged-in vendors */}
          {(localStorage.getItem("vendor") ||
            localStorage.getItem("admin")) && (
            <div className="mt-12 animate-bounce">
              <div className="flex flex-col items-center text-blue-600">
                <span className="text-sm font-medium mb-2">
                  Scroll to explore RFP details
                </span>
                <ArrowRight className="h-5 w-5 transform rotate-90" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Conditional Content - Blurred for non-registered users */}
      <div className="relative">
        {/* Blur overlay for non-registered users */}
        {!localStorage.getItem("vendor") && !localStorage.getItem("admin") && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Vendor Registration Required
              </h3>
              <p className="text-gray-600 mb-6">
                Please register as a vendor to access detailed RFP requirements,
                technical specifications, and submission guidelines.
              </p>
              <div className="space-y-3">
                <a
                  href="/register"
                  className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                >
                  Register as Vendor
                </a>
                <a
                  href="/login"
                  className="block w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-all duration-300"
                >
                  Existing Vendor Login
                </a>
              </div>
            </div>
          </div>
        )}

        {/* YouTube Video Section */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                RFP Overview Video
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                Watch this video to understand the project scope, requirements,
                and submission process in detail.
              </p>
            </div>

            <div
              className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl mx-auto"
              style={{ maxWidth: "896px" }}
            >
              <div
                className="relative"
                style={{ paddingBottom: "56.25%", height: 0 }}
              >
                <iframe
                  src="https://www.youtube.com/embed/2WzI0C5h9Ec"
                  title="Private Aviation Workflow Modernization RFP Overview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
            </div>

            <div className="mt-6 text-center text-gray-500 text-sm">
              <p>
                Video length: Approximately 4 minutes • Closed captions
                available
              </p>
            </div>
          </div>
        </section>

        {/* RFP Content (blurred when not registered) */}
        <div
          className={
            !localStorage.getItem("vendor") && !localStorage.getItem("admin")
              ? "filter blur pointer-events-none"
              : ""
          }
        >
          {/* Executive Summary */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Executive Summary
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto"></div>
              </div>

              <div className="prose prose-lg max-w-none text-gray-600">
                <p className="text-xl leading-relaxed mb-6">
                  The purpose of this RFP is to identify and select a{" "}
                  <strong>technology partner</strong> capable of modernizing a
                  private jet charter workflow through the design and
                  implementation of a
                  <strong> unified, data-driven platform</strong>.
                </p>

                <p className="text-xl leading-relaxed mb-8">
                  The platform should enhance operational efficiency, reduce
                  manual dependencies, and deliver a frictionless, high-touch
                  experience for both clients and internal teams.
                </p>

                <div className="grid md:grid-cols-2 gap-8 my-12">
                  <div className="bg-blue-50 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <Users className="h-6 w-6 text-blue-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        Client-Facing Workflows
                      </h3>
                    </div>
                    <p className="text-gray-600">
                      Simplify booking, communication, and contract execution
                      for members through seamless digital experiences.
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <Workflow className="h-6 w-6 text-purple-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        Internal Operational Workflows
                      </h3>
                    </div>
                    <p className="text-gray-600">
                      Streamline flight sourcing, vendor management, data flow,
                      and compliance through automated processes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Current State Overview */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Current State Overview
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto"></div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 mb-8">
                <p className="text-yellow-800 text-lg leading-relaxed">
                  The existing process supports successful flight bookings but
                  remains{" "}
                  <strong>
                    highly manual, fragmented, and dependent on individual staff
                    members
                  </strong>{" "}
                  to move information between systems. While functional, it is
                  not scalable or fully auditable as the volume of requests
                  increases.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
                    Request Flow
                  </h3>

                  <div className="space-y-4 text-gray-600">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p>
                        Members request flights via{" "}
                        <strong>text message or in-app form</strong>, which
                        automatically generates a customer service ticket via
                        ZenDesk
                      </p>
                    </div>

                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p>
                        An automation tool posts this request into an internal
                        messaging channel (Slack), where a team member manually
                        re-enters the data into an Admin Tool built on
                        AWS/Postgres
                      </p>
                    </div>

                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p>
                        This process introduces{" "}
                        <strong>data duplication</strong> and makes reporting
                        inconsistent
                      </p>
                    </div>
                  </div>

                  <h4 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
                    Quoting & Booking
                  </h4>
                  <div className="space-y-3 text-gray-600">
                    <p>
                      • Requests manually sent to aircraft operators through
                      Avinode
                    </p>
                    <p>• Operators reply with PDF quotes via email</p>
                    <p>• Manual contract generation using Dropbox Sign</p>
                    <p>• Payment processing through internal Slack requests</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Database className="h-6 w-6 text-purple-600 mr-3" />
                    Technical Stack & Limitations
                  </h3>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Core Systems
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>• AWS/Postgres</div>
                      <div>• Oracle SQL</div>
                      <div>• Zendesk</div>
                      <div>• Slack</div>
                      <div>• Avinode</div>
                      <div>• Schedaero</div>
                      <div>• Dropbox Sign</div>
                      <div>• QuickBooks</div>
                    </div>
                  </div>

                  <h4 className="text-xl font-semibold text-gray-900 mb-4">
                    Key Limitations
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">
                        Manual workflows with multiple single points of failure
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">
                        No unified quote tracking or searchable trip history
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">
                        Poor client presentation (multiple PDFs and non-branded
                        documents)
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">
                        Lack of centralized dashboard or real-time visibility
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Desired Future State */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Desired Future State
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto"></div>
                <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
                  The desired system should unify client-facing and internal
                  workflows into a single ecosystem—automating repetitive tasks,
                  centralizing data, and improving both client experience and
                  internal control.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 mb-12">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Client-Facing Workflows
                    </h3>
                  </div>

                  <div className="space-y-4 text-gray-700">
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Seamless, branded digital interface for flight requests
                        and booking
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Curated flight options with aircraft photos, operator
                        details, and transparent pricing
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>Integrated checkout and e-signature flow</span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Automated confirmations, updates, and flight information
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mr-4">
                      <Workflow className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Internal Operational Workflows
                    </h3>
                  </div>

                  <div className="space-y-4 text-gray-700">
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Centralized flight management dashboard for all requests
                        and updates
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Direct Avinode integration for automated quote retrieval
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        System connectivity (Zendesk, Slack, QuickBooks, Brex,
                        Oracle SQL)
                      </span>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Automated generation of contracts and compliance
                        documentation
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phased Implementation */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
                <div className="flex items-center mb-6">
                  <Calendar className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    Phased Implementation Approach
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Phase 1: Workflow Optimization
                    </h4>
                    <p className="text-gray-600">
                      Focus on operational efficiency, automation, and data
                      integration independent of any client-facing app.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      Phase 2: Application Integration
                    </h4>
                    <p className="text-gray-600">
                      Extend functionality into the broader digital ecosystem,
                      enabling direct booking and trip management.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white rounded-xl border border-green-200">
                  <p className="text-green-800 font-semibold text-center">
                    🎯 THIS RFP IS FOCUSED ON PHASE 1: WORKFLOW OPTIMIZATION
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* NDA Section */}
          <section className="py-16 bg-orange-50 border-t border-orange-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Confidentiality & NDA
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-orange-600 to-red-600 mx-auto"></div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-orange-200">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Non-Disclosure Agreement
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Required for all vendors before registration
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Download and review the NDA document
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Sign the NDA with your company details
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Upload the signed NDA during registration
                      </span>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-3">
                      Brand Anonymity
                    </h4>
                    <p className="text-orange-800 text-sm leading-relaxed">
                      Refer only to the client as{" "}
                      <em>"a luxury credit card and concierge company"</em>.
                      Company identity will be revealed only after NDA
                      execution.
                    </p>
                  </div>
                </div>

                {/* Updated Download Button Section */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={() => {
                      // Direct download approach
                      const ndaUrl = "/Atlas_NDA.pdf";
                      const link = document.createElement("a");
                      link.href = ndaUrl;
                      link.download = "Atlas-Aviation-RFP-NDA-Agreement.pdf";
                      link.target = "_blank";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Download NDA Template
                  </button>
                  <a
                    href="/register"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    Proceed to Registration
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </div>

                <div className="mt-6 text-center text-gray-500 text-sm">
                  <p>
                    NDA must be signed and uploaded during vendor registration
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                {localStorage.getItem("vendor") || localStorage.getItem("admin")
                  ? "Continue Working on Your Proposal"
                  : "Ready to Submit Your Proposal?"}
              </h3>
              <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
                {localStorage.getItem("vendor") || localStorage.getItem("admin")
                  ? "Return to your dashboard to manage submissions, track progress, and review vendor applications."
                  : "This RFP focuses on Phase 1: Workflow Optimization. Register as a vendor to access the detailed submission portal with multi-step capability assessment."}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                {localStorage.getItem("vendor") ||
                localStorage.getItem("admin") ? (
                  <>
                    <a
                      href={
                        localStorage.getItem("admin")
                          ? "/admin/dashboard"
                          : "/dashboard"
                      }
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Go to Dashboard
                    </a>
                    <a
                      href={
                        localStorage.getItem("admin")
                          ? "/admin/submissions"
                          : "/submissions"
                      }
                      className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-300"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      {localStorage.getItem("admin")
                        ? "View Submissions"
                        : "My Submissions"}
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="/register"
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Begin Submission
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                    <a
                      href="/login"
                      className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-300"
                    >
                      Vendor Login
                    </a>
                  </>
                )}
              </div>

              <div className="mt-8 text-gray-400 text-sm">
                <p>
                  Submission deadline: Please refer to the vendor portal for
                  specific timeline details
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
