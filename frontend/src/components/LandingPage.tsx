// frontend/src/components/LandingPage.tsx - UPDATED WITH RFP V2 CONTENT
import { useState } from "react";
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
  Workflow,
  Calendar,
} from "lucide-react";

export default function LandingPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900">
                Private Aviation RFP
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/login"
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Vendor Login
              </a>
              <a
                href="/admin/login"
                className="text-gray-600 hover:text-purple-600 font-medium transition-colors duration-200"
              >
                Admin Login
              </a>
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

          <div className="mt-10">
            <a
              href="/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Begin Submission
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>
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
              private jet charter workflow through the design and implementation
              of a<strong> unified, data-driven platform</strong>.
            </p>

            <p className="text-xl leading-relaxed mb-8">
              The platform should enhance operational efficiency, reduce manual
              dependencies, and deliver a frictionless, high-touch experience
              for both clients and internal teams.
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
                  Simplify booking, communication, and contract execution for
                  members through seamless digital experiences.
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
                  Streamline flight sourcing, vendor management, data flow, and
                  compliance through automated processes.
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
              to move information between systems. While functional, it is not
              scalable or fully auditable as the volume of requests increases.
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
                    re-enters the data into an Admin Tool built on AWS/Postgres
                  </p>
                </div>

                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>
                    This process introduces <strong>data duplication</strong>{" "}
                    and makes reporting inconsistent
                  </p>
                </div>
              </div>

              <h4 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
                Quoting & Booking
              </h4>
              <div className="space-y-3 text-gray-600">
                <p>
                  • Requests manually sent to aircraft operators through Avinode
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
                    Seamless, branded digital interface for flight requests and
                    booking
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
                    Centralized flight management dashboard for all requests and
                    updates
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
                  <em>"a luxury credit card and concierge company"</em>. Company
                  identity will be revealed only after NDA execution.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  const ndaUrl = "/Atlas_NDA.pdf";
                  window.open(ndaUrl, "_blank");
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
              <p>NDA must be signed and uploaded during vendor registration</p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Submit Your Proposal?
          </h3>
          <p className="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
            This RFP focuses on Phase 1: Workflow Optimization. Register as a
            vendor to access the detailed submission portal with multi-step
            capability assessment.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
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
  );
}
