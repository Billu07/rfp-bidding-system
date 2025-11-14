// frontend/src/components/AdminDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import AdminQuestionsPanel from "./AdminQuestionsPanel";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield,
  Users,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  Building2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart3,
  X,
  Eye,
  RefreshCw,
  UserCheck,
  ClipboardList,
  Target,
  MessageSquare,
} from "lucide-react";

interface Vendor {
  id: string;
  "Vendor Name": string;
  Email: string;
  "Contact Person": string;
  "Contact Title"?: string;
  Phone?: string;
  Website?: string;
  Country?: string;
  "Company Size"?: string;
  "NDA Cloudinary URL"?: string;
  "NDA Cloudinary Public ID"?: string;
  "NDA View URL"?: string;
  Status?: string;
  "Last Login"?: string;
}

interface Submission {
  id: string;
  rfpName: string;
  vendorName: string;
  vendorId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  status: string;
  submittedAt: string;
  adminNotes?: string;
  implementationTimeline?: string;
  upfrontCost?: number;
  monthlyCost?: number;
  // Step 3 integration capabilities
  integrationScores?: {
    zendesk: string;
    oracleSql: string;
    quickbooks: string;
    slack: string;
    brex: string;
    avinode: string;
  };
}

// Safe formatting functions
const safeFormatDistance = (dateString: string | undefined): string => {
  if (!dateString) return "Unknown date";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid date"
      : formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Date error";
  }
};

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "Unknown";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d, yyyy");
  } catch {
    return "Date error";
  }
};

const safeFormatPrice = (price: number | undefined): string => {
  return price === undefined || price === null || price === 0
    ? "Not specified"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
};

const getIntegrationStatusIcon = (status: string) => {
  switch (status) {
    case "✅ Can integrate and have done previously":
      return "✅";
    case "⚙️ Can integrate but have not done previously":
      return "⚙️";
    case "❌ Cannot integrate":
      return "❌";
    default:
      return "❓";
  }
};

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "vendors" | "submissions" | "questions"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "cost">("date");
  const [showNdaPreview, setShowNdaPreview] = useState<string | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState<{
    show: boolean;
    submission: Submission | null;
    action: string;
  }>({
    show: false,
    submission: null,
    action: "",
  });
  const [showSubmissionDetail, setShowSubmissionDetail] =
    useState<Submission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin")) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      let vendorsData: Vendor[] = [];
      let submissionsData: Submission[] = [];

      try {
        const vRes = await axios.get(`${API_BASE}/api/admin/pending-vendors`);
        vendorsData = vRes.data.vendors;
      } catch (err: any) {
        console.error(
          "Failed to fetch vendors:",
          err.response?.data || err.message
        );
      }

      try {
        const sRes = await axios.get(`${API_BASE}/api/admin/submissions`);
        submissionsData = sRes.data.submissions;
      } catch (err: any) {
        console.error(
          "Failed to fetch submissions:",
          err.response?.data || err.message
        );
      }

      setVendors(vendorsData);
      setSubmissions(submissionsData);
    } catch (err: any) {
      setError(
        `Failed to load admin data: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleVendorAction = async (
    id: string,
    action: "approve" | "decline"
  ) => {
    try {
      await axios.post(`${API_BASE}/api/admin/vendor-action`, {
        vendorId: id,
        action,
      });
      fetchData();
    } catch (err) {
      alert("Action failed. Please try again.");
    }
  };

  const handleSubmissionAction = async (
    submissionId: string,
    action: "approve" | "shortlist" | "decline"
  ) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/admin/submission-action`,
        {
          submissionId,
          action,
          notes: adminNotes,
        }
      );

      alert(response.data.message || `Submission ${action}d successfully!`);
      setShowSubmissionModal({ show: false, submission: null, action: "" });
      setAdminNotes("");
      fetchData();
    } catch (err: any) {
      alert(`Action failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    window.location.href = "/";
  };

  // Stats Calculation
  const stats = useMemo(
    () => ({
      pendingVendors: vendors.length,
      totalSubmissions: submissions.length,
      approvedSubmissions: submissions.filter((s) => s.status === "Approved")
        .length,
      shortlistedSubmissions: submissions.filter(
        (s) => s.status === "Shortlisted"
      ).length,
      pendingReviewSubmissions: submissions.filter(
        (s) => s.status === "Pending" || s.status === "Under Review"
      ).length,
    }),
    [vendors, submissions]
  );

  // Filter & Sort Logic
  const filteredVendors = useMemo(() => {
    return vendors.filter(
      (v) =>
        v["Vendor Name"].toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.Email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
          );
        case "cost":
          return (b.upfrontCost || 0) - (a.upfrontCost || 0);
        default:
          return 0;
      }
    });
  }, [submissions, searchQuery, filterStatus, sortBy]);

  const getStatusBadge = (status: string) => {
    const base =
      "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors";
    switch (status) {
      case "Pending":
        return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case "Under Review":
        return `${base} bg-blue-100 text-blue-800 border border-blue-200`;
      case "Shortlisted":
        return `${base} bg-purple-100 text-purple-800 border border-purple-200`;
      case "Approved":
        return `${base} bg-green-100 text-green-800 border border-green-200`;
      case "Rejected":
        return `${base} bg-red-100 text-red-800 border border-red-200`;
      default:
        return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Loading Admin Dashboard...
          </p>
          <p className="text-sm text-gray-500 mt-2">Preparing your workspace</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Unable to Load Dashboard
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/admin/login")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Back to Login
            </button>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Aviation RFP Portal
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Private Aviation Workflow Modernization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <Eye className="w-4 h-4" />
                View RFP
              </a>
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Vendors
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pendingVendors}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Submissions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.approvedSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pendingReviewSubmissions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs and Controls */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-start lg:items-center justify-between">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 shadow-sm">
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "vendors", label: "Vendors", icon: Users },
              { id: "submissions", label: "Submissions", icon: FileText },
              { id: "questions", label: "Q&A", icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 min-w-[120px] justify-center ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "vendors" && vendors.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {vendors.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-80">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={
                  activeTab === "vendors"
                    ? "Search vendors..."
                    : activeTab === "submissions"
                    ? "Search companies or contacts..."
                    : "Search..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
              />
            </div>

            {activeTab === "submissions" && (
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="date">Latest First</option>
                  <option value="cost">Highest Cost</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Recent Submissions
                </h3>
                <span className="text-sm text-gray-500">
                  {submissions.length} total
                </span>
              </div>
              <div className="space-y-3">
                {submissions.slice(0, 6).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 hover:bg-white transition cursor-pointer"
                    onClick={() => setShowSubmissionDetail(submission)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {submission.companyName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {submission.contactPerson}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {safeFormatDistance(submission.submittedAt)}
                      </p>
                    </div>
                    <span className={getStatusBadge(submission.status)}>
                      {submission.status}
                    </span>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No submissions yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab("vendors")}
                  className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition text-left border border-blue-200/50 group"
                >
                  <Users className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">
                    Vendor Approvals
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {vendors.length} pending review
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("submissions")}
                  className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-md transition text-left border border-green-200/50 group"
                >
                  <FileText className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">
                    Review Submissions
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats.pendingReviewSubmissions} need attention
                  </p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("submissions");
                    setFilterStatus("Shortlisted");
                  }}
                  className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition text-left border border-purple-200/50 group"
                >
                  <UserCheck className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">
                    Shortlisted Proposals
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats.shortlistedSubmissions} candidates
                  </p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("submissions");
                    setFilterStatus("Approved");
                  }}
                  className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:shadow-md transition text-left border border-emerald-200/50 group"
                >
                  <Target className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">
                    Approved Solutions
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats.approvedSubmissions} ready
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === "vendors" && (
          <div className="space-y-6">
            {filteredVendors.length === 0 ? (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No pending vendors
                </p>
                <p className="text-gray-400 mt-2">
                  All vendor applications have been processed
                </p>
              </div>
            ) : (
              filteredVendors.map((v) => (
                <div
                  key={v.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-lg transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                {v["Vendor Name"]}
                              </h3>
                              <p className="text-gray-600 flex items-center gap-1 mt-1">
                                <Mail className="w-4 h-4" /> {v.Email}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="space-y-2">
                              <p className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">
                                  Contact:
                                </span>{" "}
                                {v["Contact Person"]}
                                {v["Contact Title"] && (
                                  <span className="text-gray-500">
                                    {" "}
                                    · {v["Contact Title"]}
                                  </span>
                                )}
                              </p>
                              {v.Phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  <span className="font-medium">
                                    Phone:
                                  </span>{" "}
                                  {v.Phone}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              {v.Website && (
                                <p className="flex items-center gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  <a
                                    href={v.Website}
                                    target="_blank"
                                    className="text-blue-600 hover:underline font-medium"
                                  >
                                    Visit Website
                                  </a>
                                </p>
                              )}
                              {v["Last Login"] && (
                                <p className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span className="font-medium">
                                    Last Login:
                                  </span>
                                  {safeFormatDistance(v["Last Login"])}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {v.Country && (
                          <div className="text-right">
                            <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                              <p className="font-semibold text-gray-900">
                                {v.Country}
                              </p>
                              <p className="text-sm text-gray-600">
                                {v["Company Size"]}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
                      {/* NDA Preview Button */}
                      {(v["NDA Cloudinary URL"] || v["NDA View URL"]) && (
                        <button
                          onClick={() =>
                            setShowNdaPreview(
                              v["NDA View URL"] ||
                                v["NDA Cloudinary URL"] ||
                                null
                            )
                          }
                          className="px-5 py-2.5 bg-blue-100 text-blue-700 font-semibold rounded-xl hover:bg-blue-200 transition flex items-center gap-2 border border-blue-200 hover:shadow-md"
                        >
                          <Eye className="w-4 h-4" />
                          Review NDA
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVendorAction(v.id, "approve")}
                          className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition flex items-center gap-2 flex-1 justify-center"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleVendorAction(v.id, "decline")}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg transition flex items-center gap-2 flex-1 justify-center"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === "submissions" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Company & Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Costs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                          No submissions match your filters
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Try adjusting your search or filters
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50/50 transition cursor-pointer"
                        onClick={() => setShowSubmissionDetail(s)}
                      >
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {s.companyName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {s.contactPerson}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {safeFormatDate(s.submittedAt)}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {safeFormatDistance(s.submittedAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              Upfront: {safeFormatPrice(s.upfrontCost)}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <DollarSign className="w-4 h-4 text-blue-600" />
                              Monthly: {safeFormatPrice(s.monthlyCost)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {s.implementationTimeline || "Not specified"}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={getStatusBadge(s.status)}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "approve",
                                  });
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Approve
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "shortlist",
                                  });
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                              >
                                <ClipboardList className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Shortlist
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "decline",
                                  });
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Decline
                                </span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && <AdminQuestionsPanel />}
      </div>

      {/* Enhanced NDA Preview Modal */}
      {showNdaPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  NDA Document Preview
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Review vendor's signed NDA before approval
                </p>
              </div>
              <button
                onClick={() => setShowNdaPreview(null)}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* PDF Viewer Section with Google Docs */}
            <div className="flex-1 p-6 min-h-[500px]">
              {showNdaPreview ? (
                <div className="w-full h-full border-2 border-gray-200 rounded-xl overflow-hidden">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(
                      showNdaPreview
                    )}&embedded=true`}
                    className="w-full h-full"
                    title="NDA Document Preview"
                    style={{ minHeight: "500px" }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <FileText className="w-16 h-16 mb-4" />
                  <p>Unable to load NDA document</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <p>Review the NDA document before approving the vendor.</p>
                <p className="text-xs text-gray-500 mt-1">
                  The vendor will not be able to submit proposals until
                  approved.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={showNdaPreview || "#"}
                  download="vendor-nda-document.pdf"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => !showNdaPreview && e.preventDefault()}
                >
                  <Download className="w-4 h-4" /> Download NDA
                </a>
                <button
                  onClick={() => setShowNdaPreview(null)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {showSubmissionDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Submission Details
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {showSubmissionDetail.companyName} -{" "}
                  {showSubmissionDetail.contactPerson}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionDetail(null)}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Company Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Company:</strong>{" "}
                      {showSubmissionDetail.companyName}
                    </p>
                    <p>
                      <strong>Contact:</strong>{" "}
                      {showSubmissionDetail.contactPerson}
                    </p>
                    <p>
                      <strong>Email:</strong> {showSubmissionDetail.email}
                    </p>
                    <p>
                      <strong>Submitted:</strong>{" "}
                      {safeFormatDate(showSubmissionDetail.submittedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Pricing & Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Upfront Cost:</strong>{" "}
                      {safeFormatPrice(showSubmissionDetail.upfrontCost)}
                    </p>
                    <p>
                      <strong>Monthly Cost:</strong>{" "}
                      {safeFormatPrice(showSubmissionDetail.monthlyCost)}
                    </p>
                    <p>
                      <strong>Timeline:</strong>{" "}
                      {showSubmissionDetail.implementationTimeline ||
                        "Not specified"}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={getStatusBadge(showSubmissionDetail.status)}
                      >
                        {showSubmissionDetail.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Integration Capabilities */}
              {showSubmissionDetail.integrationScores && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Integration Capabilities
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {Object.entries(showSubmissionDetail.integrationScores).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                          <span>{getIntegrationStatusIcon(value)}</span>
                          <span className="capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Admin Notes
                </h4>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes or feedback for this submission..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSubmissionDetail(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSubmissionAction(showSubmissionDetail.id, "shortlist");
                  setShowSubmissionDetail(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition"
              >
                Shortlist
              </button>
              <button
                onClick={() => {
                  handleSubmissionAction(showSubmissionDetail.id, "approve");
                  setShowSubmissionDetail(null);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl hover:shadow-lg transition"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Action Modal */}
      {showSubmissionModal.show && showSubmissionModal.submission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 capitalize">
                {showSubmissionModal.action} Submission
              </h3>
              <button
                onClick={() =>
                  setShowSubmissionModal({
                    show: false,
                    submission: null,
                    action: "",
                  })
                }
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                You are about to{" "}
                <strong className="text-gray-900">
                  {showSubmissionModal.action}
                </strong>{" "}
                the submission from{" "}
                <strong className="text-gray-900">
                  {showSubmissionModal.submission.companyName}
                </strong>
                .
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes or feedback for the vendor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setShowSubmissionModal({
                    show: false,
                    submission: null,
                    action: "",
                  })
                }
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSubmissionAction(
                    showSubmissionModal.submission!.id,
                    showSubmissionModal.action as any
                  )
                }
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:shadow-lg transition"
              >
                Confirm {showSubmissionModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
