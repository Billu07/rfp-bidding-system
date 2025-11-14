// frontend/src/components/dashboard.tsx - SIMPLIFIED FOR SINGLE RFP
import { useState, useEffect } from "react";
import axios from "axios";
import VendorQuestions from "./VendorQuestions";
import {
  FileText,
  Target,
  BarChart3,
  LogOut,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Zap,
} from "lucide-react";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import NavLink from "./NavLink";

// Single RFP Data - Hardcoded as per requirements
const AVIATION_RFP = {
  id: "aviation-workflow-2025",
  name: "Private Aviation Workflow Modernization",
  description:
    "Technology partner for modernizing private jet charter workflows through unified, data-driven platform",
  deadline: "2025-12-31", // Set your actual deadline
  status: "Active",
  focus: "Phase 1: Workflow Optimization",
  scope:
    "Client-facing and internal workflow automation, data integration, and operational efficiency",
};

export default function Dashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    const saved = localStorage.getItem("vendor");
    if (!saved) {
      navigate("/login");
      return;
    }
    const vendorData = JSON.parse(saved);
    setVendor(vendorData);
    fetchSubmissions(vendorData.id);
    fetchDraft(vendorData.id);
  }, [navigate]);

  const fetchSubmissions = async (vendorId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/vendor/submissions`, {
        headers: {
          "X-Vendor-Data": JSON.stringify({ id: vendorId }),
        },
      });
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to your dashboard component
  const handleDeleteDraft = async () => {
    if (
      confirm(
        "Are you sure you want to delete your draft? This cannot be undone."
      )
    ) {
      try {
        const vendorData = localStorage.getItem("vendor");
        if (!vendorData) return;

        const vendor = JSON.parse(vendorData);

        const response = await fetch("/api/delete-draft", {
          method: "DELETE",
          headers: {
            "X-Vendor-Data": JSON.stringify({ id: vendor.id }),
          },
        });

        const result = await response.json();

        if (result.success) {
          // Refresh the dashboard to remove the draft section
          fetchDraft(vendor.id);
          alert("Draft deleted successfully");
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Failed to delete draft:", error);
        alert("Failed to delete draft");
      }
    }
  };

  const fetchDraft = async (vendorId: string) => {
    try {
      const response = await fetch("/api/load-draft", {
        headers: {
          "X-Vendor-Data": JSON.stringify({ id: vendorId }),
        },
      });
      const result = await response.json();
      if (result.success && result.draft) {
        setDraft({
          lastSaved: result.lastSaved,
          data: result.draft,
        });
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  };

  const handleBeginSubmission = () => {
    navigate("/submit-proposal");
  };

  const handleContinueDraft = () => {
    navigate("/submit-proposal");
  };

  const handleViewSubmissions = () => {
    navigate("/submissions");
  };

  const handleLogout = () => {
    localStorage.removeItem("vendor");
    navigate("/"); // Navigate to landing page
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Your Dashboard</p>
        </div>
      </div>
    );
  }

  const deadline = new Date(AVIATION_RFP.deadline);
  const daysLeft = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysLeft <= 7 && daysLeft > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header - Keep your existing header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Vendor Portal
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">
                    Welcome back, {vendor?.name}
                  </p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-1 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50">
                <NavLink
                  to="/dashboard"
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/submissions"
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  My Submissions
                </NavLink>
                <a
                  href="/"
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 text-gray-600 hover:text-blue-600"
                >
                  <Eye className="w-4 h-4" />
                  View RFP
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - SIMPLIFIED FOR SINGLE RFP */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Submissions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 bg-gradient-to-r ${
                  isUrgent
                    ? "from-orange-500 to-orange-600"
                    : "from-green-500 to-green-600"
                } rounded-xl flex items-center justify-center shadow-lg`}
              >
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Days Left</p>
                <p
                  className={`text-2xl font-bold ${
                    isUrgent ? "text-orange-600" : "text-gray-900"
                  }`}
                >
                  {daysLeft}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {draft ? "Draft" : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Single RFP Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {AVIATION_RFP.name}
                  </h2>
                  <p className="text-gray-600">{AVIATION_RFP.focus}</p>
                </div>
              </div>

              <p className="text-gray-600 mb-4 leading-relaxed">
                {AVIATION_RFP.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Due {format(deadline, "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{AVIATION_RFP.status}</span>
                </div>
                {isUrgent && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600 font-semibold">
                      Urgent: {daysLeft} days left
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {draft ? (
                <>
                  <button
                    onClick={handleContinueDraft}
                    className="w-full py-3 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition flex items-center justify-center gap-2 mb-2"
                  >
                    <Edit className="w-4 h-4" />
                    Continue Draft
                  </button>
                  <button
                    onClick={handleDeleteDraft}
                    className="w-full py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Draft
                  </button>
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Last saved:{" "}
                    {format(new Date(draft.lastSaved), "MMM d, h:mm a")}
                  </p>
                </>
              ) : (
                <button
                  onClick={handleBeginSubmission}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Begin 5-Step Submission
                </button>
              )}

              {submissions.length > 0 && (
                <button
                  onClick={handleViewSubmissions}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Submissions ({submissions.length})
                </button>
              )}
            </div>
          </div>

          {/* Scope & Requirements */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Project Scope
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Client-Facing Workflows
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Seamless booking interface</li>
                  <li>• Transparent pricing display</li>
                  <li>• Digital contract execution</li>
                  <li>• Automated communications</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="font-semibold text-purple-900 mb-2">
                  Internal Workflows
                </h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Centralized flight management</li>
                  <li>• Avinode integration</li>
                  <li>• System connectivity (Zendesk, Slack, etc.)</li>
                  <li>• Automated documentation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {submissions.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Submissions
            </h3>
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Submitted{" "}
                      {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {submission.status}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/submissions/${submission.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Section - ADD THIS RIGHT HERE */}
        <div className="mb-8">
          <VendorQuestions />
        </div>
      </main>
    </div>
  );
}
