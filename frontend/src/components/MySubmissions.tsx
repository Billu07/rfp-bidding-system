// frontend/src/components/MySubmissions.tsx - ENHANCED WITH EDIT
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Calendar,
  DollarSign,
  Clock,
  Star,
  Search,
  Loader2,
  X,
  ArrowRight,
  Target,
  Edit,
  Eye,
} from "lucide-react";

interface Submission {
  id: string;
  rfpName: string;
  companyName: string;
  contactPerson: string;
  email: string;
  status: string;
  submittedAt: string;
  rating?: string;
  implementationTimeline?: string;
  upfrontCost?: number;
  monthlyCost?: number;
  canEdit?: boolean; // New field to check if submission can be edited
}

// Safe date formatting functions
const formatDateSafely = (dateStr: string | undefined): string => {
  if (!dateStr) return "Unknown date";
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
};

const formatDistanceSafely = (dateStr: string | undefined): string => {
  if (!dateStr) return "Unknown";
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "Unknown"
      : formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
};

const formatPriceSafely = (price: number | undefined): string => {
  return price === undefined || price === null
    ? "Not specified"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
};

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "cost">("date");
  const navigate = useNavigate();

  useEffect(() => {
    const vendor = localStorage.getItem("vendor");
    if (!vendor) {
      navigate("/login");
      return;
    }

    const headers = { "X-Vendor-Data": vendor };

    axios
      .get(`${API_BASE}/api/vendor/submissions`, { headers })
      .then((res) => {
        console.log("Submissions received:", res.data.submissions);
        const submissionsWithEdit = (res.data.submissions || []).map(
          (sub: Submission) => ({
            ...sub,
            // Allow editing if status is Pending or Under Review (within reasonable timeframe)
            canEdit: sub.status === "Pending" || sub.status === "Under Review",
          })
        );
        setSubmissions(submissionsWithEdit);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching submissions:", err);
        setLoading(false);
      });
  }, [navigate]);

  // Filter, Search, Sort
  const filteredAndSorted = useMemo(() => {
    let filtered = submissions;

    // Search
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.rfpName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    // Sort with safe date handling
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          const dateA = new Date(a.submittedAt).getTime();
          const dateB = new Date(b.submittedAt).getTime();
          const validDateA = isNaN(dateA) ? -Infinity : dateA;
          const validDateB = isNaN(dateB) ? -Infinity : dateB;
          return validDateB - validDateA;
        case "cost":
          const costA = a.upfrontCost || 0;
          const costB = b.upfrontCost || 0;
          return costB - costA;
        default:
          return 0;
      }
    });
  }, [submissions, searchQuery, filterStatus, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Under Review":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Approved":
        return "bg-green-100 text-green-800 border border-green-200";
      case "Shortlisted":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getRatingStars = (rating?: string) => {
    if (!rating) return null;
    const stars = rating.split("-")[0];
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < +stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const handleEditSubmission = (submissionId: string) => {
    navigate(`/submissions/${submissionId}`);
  };

  const handleViewDetails = (submissionId: string) => {
    // Navigate to a read-only view or same edit page but in view mode
    navigate(`/submissions/${submissionId}?mode=view`);
  };

  const handleNewSubmission = () => {
    navigate("/submit-proposal");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    My Aviation RFP Submissions
                  </h1>
                  <p className="text-xs text-gray-500">
                    {submissions.length} total submission
                    {submissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
                <a
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-white transition"
                >
                  Dashboard
                </a>
                <span className="px-4 py-2 text-sm font-bold text-blue-600 bg-white rounded-lg shadow-sm">
                  My Submissions
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNewSubmission}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                <FileText className="w-4 h-4" />
                New Submission
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("vendor");
                  navigate("/login");
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition"
              >
                <X className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-b px-4 py-3">
        <div className="flex gap-2">
          <a
            href="/dashboard"
            className="flex-1 text-center py-2 text-sm font-medium rounded-lg"
          >
            Dashboard
          </a>
          <span className="flex-1 text-center py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg">
            Submissions
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Private Aviation RFP Submissions
          </h2>
          <p className="text-gray-600 mt-2">
            Track your aviation workflow modernization proposals
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600">Total Submissions</p>
            <p className="text-2xl font-bold text-gray-900">
              {submissions.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">
              {submissions.filter((s) => s.status === "Pending").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600">Under Review</p>
            <p className="text-2xl font-bold text-blue-600">
              {submissions.filter((s) => s.status === "Under Review").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600">Editable</p>
            <p className="text-2xl font-bold text-green-600">
              {submissions.filter((s) => s.canEdit).length}
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company, contact, or RFP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
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
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <option value="date">Latest First</option>
              <option value="cost">Highest Cost</option>
            </select>

            <button
              onClick={handleNewSubmission}
              className="sm:hidden flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              <FileText className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">
              {searchQuery || filterStatus !== "all"
                ? "No submissions match your filters"
                : "You haven't submitted any aviation RFP proposals yet"}
            </p>
            {(searchQuery || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters
              </button>
            )}
            {!searchQuery && filterStatus === "all" && (
              <button
                onClick={handleNewSubmission}
                className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Submit Aviation RFP Proposal
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Company & Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Costs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSorted.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-5">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {s.companyName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {s.contactPerson} • {s.email}
                          </p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {s.rfpName || "Private Aviation RFP"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateSafely(s.submittedAt)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceSafely(s.submittedAt)}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {s.implementationTimeline || "Not specified"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 font-medium">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            Upfront: {formatPriceSafely(s.upfrontCost)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            Monthly: {formatPriceSafely(s.monthlyCost)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            s.status
                          )}`}
                        >
                          {s.status === "Under Review" ? "In Review" : s.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {s.rating ? (
                          <div className="flex items-center gap-1">
                            {getRatingStars(s.rating)}
                            <span className="ml-1 text-xs text-gray-600">
                              {s.rating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not rated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(s.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {s.canEdit && (
                            <button
                              onClick={() => handleEditSubmission(s.id)}
                              className="p-2 text-gray-400 hover:text-green-600 transition"
                              title="Edit Submission"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
