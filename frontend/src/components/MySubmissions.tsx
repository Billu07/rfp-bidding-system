// frontend/src/components/MySubmissions.tsx
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
  ExternalLink,
  Loader2,
  X,
  ArrowRight,
  Building2,
} from "lucide-react";

interface Submission {
  id: string;
  rfpName: string;
  basePrice: number;
  currency: string;
  timeline: number;
  proposalUrl?: string;
  rating?: string;
  status: string;
  submittedAt: string;
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

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "price" | "rating">("date");
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
        setSubmissions(res.data.submissions || []);
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
      filtered = filtered.filter((s) =>
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
          // Handle invalid dates by putting them at the end
          const validDateA = isNaN(dateA) ? -Infinity : dateA;
          const validDateB = isNaN(dateB) ? -Infinity : dateB;
          return validDateB - validDateA;
        case "price":
          return b.basePrice - a.basePrice;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Under Review":
        return "bg-blue-100 text-blue-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    My Submissions
                  </h1>
                  <p className="text-xs text-gray-500">
                    {submissions.length} total
                  </p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
                <a
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-white transition"
                >
                  Active RFPs
                </a>
                <span className="px-4 py-2 text-sm font-bold text-blue-600 bg-white rounded-lg shadow-sm">
                  My Submissions
                </span>
              </nav>
            </div>
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
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-b px-4 py-3">
        <div className="flex gap-2">
          <a
            href="/dashboard"
            className="flex-1 text-center py-2 text-sm font-medium rounded-lg"
          >
            Active
          </a>
          <span className="flex-1 text-center py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg">
            Submissions
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters & Search */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search submissions..."
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
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <option value="date">Latest First</option>
              <option value="price">Highest Price</option>
              <option value="rating">Best Rating</option>
            </select>
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
                : "You haven't submitted any proposals yet"}
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
              <a
                href="/dashboard"
                className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse Active RFPs
                <ArrowRight className="w-4 h-4" />
              </a>
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
                      RFP
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
                      Proposal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSorted.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-5">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {s.rfpName}
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
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          {s.basePrice.toLocaleString()} {s.currency}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {s.timeline} days
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
                      <td className="px-6 py-5 text-right">
                        {s.proposalUrl ? (
                          <a
                            href={s.proposalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            View
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
