// frontend/src/components/AdminDashboard.tsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield,
  Users,
  FileText,
  Star,
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
  Plus,
  Target,
  ClipboardList,
  UserCheck,
  FilePlus,
  Eye,
  RefreshCw,
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
  "NDA Document"?: { url: string }[];
  "NDA Upload Date"?: string;
  Status?: string;
}

interface Submission {
  id: string;
  rfpName: string;
  vendorName: string;
  vendorId: string;
  basePrice?: number;
  currency?: string;
  timeline?: number;
  proposalUrl?: string;
  rating?: string;
  status: string;
  submittedAt: string;
  adminNotes?: string;
}

interface RFP {
  id: string;
  "RFP ID"?: number;
  "RFP Name": string;
  Objective: string;
  Scope?: string;
  Timeline?: string;
  "Budget Guidance"?: string;
  "Submission Deadline": string;
  Status: string;
  Owner?: string;
  "Owner Email"?: string;
  "Created Date": string;
  "Last Modified"?: string;
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

const safeFormatPrice = (
  price: number | undefined,
  currency: string = "USD"
): string => {
  return price === undefined || price === null
    ? "Not specified"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
};

const safeFormatTimeline = (timeline: number | undefined): string => {
  return timeline === undefined || timeline === null
    ? "Not specified"
    : `${timeline} days`;
};

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "vendors" | "submissions" | "rfps"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "price" | "rating">("date");
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
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // New RFP Form State
  const [rfpForm, setRfpForm] = useState({
    rfpName: "",
    objective: "",
    description: "",
    submissionDeadline: "",
    category: "General",
    budget: "",
    requirements: "",
    evaluationCriteria: "",
    contactPerson: "",
    contactEmail: "",
  });

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
      let rfpsData: RFP[] = [];

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

      try {
        const rRes = await axios.get(`${API_BASE}/api/admin/rfps`);
        rfpsData = rRes.data.rfps;
      } catch (err: any) {
        console.error(
          "Failed to fetch RFPs:",
          err.response?.data || err.message
        );
      }

      setVendors(vendorsData);
      setSubmissions(submissionsData);
      setRfps(rfpsData);
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

  const handleRating = async (id: string, rating: string) => {
    try {
      await axios.post(`${API_BASE}/api/admin/rate-submission`, {
        submissionId: id,
        rating,
      });
      fetchData();
    } catch (err) {
      alert("Rating failed.");
    }
  };

  const handleCreateRfp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/create-rfp`, rfpForm);
      setShowRfpModal(false);
      setRfpForm({
        rfpName: "",
        objective: "",
        description: "",
        submissionDeadline: "",
        category: "General",
        budget: "",
        requirements: "",
        evaluationCriteria: "",
        contactPerson: "",
        contactEmail: "",
      });
      fetchData();
    } catch (err: any) {
      alert(
        `Failed to create RFP: ${err.response?.data?.error || err.message}`
      );
    }
  };

  const handleRfpStatusChange = async (rfpId: string, status: string) => {
    try {
      await axios.post(`${API_BASE}/api/admin/update-rfp-status`, {
        rfpId,
        status,
      });
      fetchData();
    } catch (err: any) {
      alert(
        `Failed to update RFP status: ${
          err.response?.data?.error || err.message
        }`
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/admin/login");
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
      activeRfps: rfps.filter((r) => r.Status === "Active").length,
      totalRfps: rfps.length,
    }),
    [vendors, submissions, rfps]
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
          s.rfpName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
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
        case "price":
          return (b.basePrice || 0) - (a.basePrice || 0);
        case "rating":
          const ratingOrder: { [key: string]: number } = {
            "5-Star": 5,
            "4-Star": 4,
            "3-Star": 3,
            "2-Star": 2,
            "1-Star": 1,
          };
          return (
            (ratingOrder[b.rating || ""] || 0) -
            (ratingOrder[a.rating || ""] || 0)
          );
        default:
          return 0;
      }
    });
  }, [submissions, searchQuery, filterStatus, sortBy]);

  const filteredRfps = useMemo(() => {
    return rfps.filter(
      (rfp) =>
        rfp["RFP Name"].toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfp.Objective.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rfps, searchQuery]);

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
      case "Active":
        return `${base} bg-emerald-100 text-emerald-800 border border-emerald-200`;
      case "Closed":
        return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
      case "Draft":
        return `${base} bg-orange-100 text-orange-800 border border-orange-200`;
      case "Archived":
        return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
      default:
        return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  };

  const getRatingStars = (rating?: string) => {
    if (!rating) return null;
    const stars = rating.split("-")[0];
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < +stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-xs font-medium text-gray-700">{rating}</span>
      </div>
    );
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
                  Admin Portal
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Vendor & RFP Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active RFPs
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeRfps}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total RFPs
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalRfps}
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
              { id: "rfps", label: "RFPs", icon: Target },
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
                    ? "Search RFPs or vendors..."
                    : activeTab === "rfps"
                    ? "Search RFPs..."
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
                  <option value="price">Highest Price</option>
                  <option value="rating">Best Rated</option>
                </select>
              </div>
            )}

            {activeTab === "rfps" && (
              <button
                onClick={() => setShowRfpModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
              >
                <Plus className="w-5 h-5" />
                New RFP
              </button>
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
                  Recent Activity
                </h3>
                <span className="text-sm text-gray-500">
                  {submissions.length} total submissions
                </span>
              </div>
              <div className="space-y-3">
                {submissions.slice(0, 6).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 hover:bg-white transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {submission.vendorName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        Submitted for {submission.rfpName}
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
                    <p className="text-gray-500">No recent activity</p>
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
                  onClick={() => setActiveTab("rfps")}
                  className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:shadow-md transition text-left border border-orange-200/50 group"
                >
                  <Target className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">Manage RFPs</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {rfps.length} total RFPs
                  </p>
                </button>

                <button
                  onClick={() => setShowRfpModal(true)}
                  className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition text-left border border-purple-200/50 group"
                >
                  <FilePlus className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition" />
                  <p className="font-semibold text-gray-900">Create RFP</p>
                  <p className="text-sm text-gray-600 mt-1">New opportunity</p>
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
                              {v["NDA Upload Date"] && (
                                <p className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span className="font-medium">Applied:</span>
                                  {safeFormatDistance(v["NDA Upload Date"])}
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
                      {v["NDA Document"]?.[0] && (
                        <button
                          onClick={() =>
                            setShowNdaPreview(v["NDA Document"]![0].url)
                          }
                          className="px-5 py-2.5 bg-blue-100 text-blue-700 font-semibold rounded-xl hover:bg-blue-200 transition flex items-center gap-2 border border-blue-200"
                        >
                          <Eye className="w-4 h-4" /> View NDA
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
                      RFP & Vendor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
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
                      <tr key={s.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {s.rfpName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {s.vendorName}
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
                          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            {safeFormatPrice(s.basePrice, s.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {safeFormatTimeline(s.timeline)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={getStatusBadge(s.status)}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {s.rating ? (
                            getRatingStars(s.rating)
                          ) : (
                            <div className="flex gap-1">
                              {[
                                "1-Star",
                                "2-Star",
                                "3-Star",
                                "4-Star",
                                "5-Star",
                              ].map((r) => (
                                <button
                                  key={r}
                                  onClick={() => handleRating(s.id, r)}
                                  className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                                    s.rating === r
                                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-sm"
                                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {r[0]}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            {s.proposalUrl && (
                              <a
                                href={s.proposalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                              >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                  Download
                                </span>
                              </a>
                            )}
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "approve",
                                  })
                                }
                                className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Approve
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "shortlist",
                                  })
                                }
                                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                              >
                                <ClipboardList className="w-3 h-3" />
                                <span className="hidden sm:inline">
                                  Shortlist
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  setShowSubmissionModal({
                                    show: true,
                                    submission: s,
                                    action: "decline",
                                  })
                                }
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

        {/* RFPs Tab */}
        {activeTab === "rfps" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRfps.map((rfp) => (
                <div
                  key={rfp.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-lg transition group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {rfp["RFP Name"]}
                      </h3>
                      {rfp["RFP ID"] && (
                        <p className="text-sm text-gray-500 mt-1">
                          ID: {rfp["RFP ID"]}
                        </p>
                      )}
                    </div>
                    <span className={getStatusBadge(rfp.Status)}>
                      {rfp.Status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {rfp.Objective}
                  </p>

                  <div className="space-y-3 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Deadline:</span>
                      <span>{safeFormatDate(rfp["Submission Deadline"])}</span>
                    </div>
                    {rfp["Budget Guidance"] && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Budget:</span>
                        <span>{rfp["Budget Guidance"]}</span>
                      </div>
                    )}
                    {rfp.Owner && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">Owner:</span>
                        <span>{rfp.Owner}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200/50">
                    <div className="text-xs text-gray-500">
                      Created {safeFormatDistance(rfp["Created Date"])}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={rfp.Status}
                        onChange={(e) =>
                          handleRfpStatusChange(rfp.id, e.target.value)
                        }
                        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Draft">Draft</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredRfps.length === 0 && (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-2">
                  No RFPs found
                </p>
                <p className="text-gray-400 mb-6">
                  Get started by creating your first RFP
                </p>
                <button
                  onClick={() => setShowRfpModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-blue-200"
                >
                  <Plus className="w-5 h-5" /> Create Your First RFP
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NDA Preview Modal */}
      {showNdaPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                NDA Document Preview
              </h3>
              <button
                onClick={() => setShowNdaPreview(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <iframe
                src={showNdaPreview}
                className="w-full h-96 border-2 border-gray-200 rounded-xl"
                title="NDA Preview"
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <a
                href={showNdaPreview}
                download
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:shadow-lg transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                onClick={() => setShowNdaPreview(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Close
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
                  {showSubmissionModal.submission.vendorName}
                </strong>{" "}
                for{" "}
                <strong className="text-gray-900">
                  {showSubmissionModal.submission.rfpName}
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

      {/* Create RFP Modal */}
      {showRfpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                Create New RFP
              </h3>
              <button
                onClick={() => setShowRfpModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateRfp} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFP Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={rfpForm.rfpName}
                    onChange={(e) =>
                      setRfpForm({ ...rfpForm, rfpName: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter RFP name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objective *
                  </label>
                  <textarea
                    required
                    value={rfpForm.objective}
                    onChange={(e) =>
                      setRfpForm({ ...rfpForm, objective: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Describe the RFP objective and goals"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope & Description
                  </label>
                  <textarea
                    value={rfpForm.description}
                    onChange={(e) =>
                      setRfpForm({ ...rfpForm, description: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Detailed scope, requirements, and deliverables"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Deadline *
                    </label>
                    <input
                      type="date"
                      required
                      value={rfpForm.submissionDeadline}
                      onChange={(e) =>
                        setRfpForm({
                          ...rfpForm,
                          submissionDeadline: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Guidance
                    </label>
                    <input
                      type="text"
                      value={rfpForm.budget}
                      onChange={(e) =>
                        setRfpForm({ ...rfpForm, budget: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="e.g., $50,000 - $100,000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFP Owner
                    </label>
                    <input
                      type="text"
                      value={rfpForm.contactPerson}
                      onChange={(e) =>
                        setRfpForm({
                          ...rfpForm,
                          contactPerson: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="RFP owner name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner Email
                    </label>
                    <input
                      type="email"
                      value={rfpForm.contactEmail}
                      onChange={(e) =>
                        setRfpForm({ ...rfpForm, contactEmail: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="owner@company.com"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRfpModal(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4" /> Create RFP
                </button>
              </div>
            </form>
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
