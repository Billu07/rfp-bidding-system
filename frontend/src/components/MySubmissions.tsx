import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  FileText,
  Calendar,
  Clock,
  Search,
  Loader2,
  ArrowLeft,
  Edit,
  Briefcase,
  CheckCircle,
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
  monthlyCost?: string; // Updated to string based on recent backend fixes
  canEdit?: boolean;
}

// Helpers
const safeFormatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "Unknown";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
};

const safeFormatPrice = (price: any): string => {
  if (price === undefined || price === null || price === "") return "—";
  if (typeof price === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }
  return price.toString();
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Under Review": "bg-blue-50 text-blue-700 border-blue-200",
    Shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
    Approved: "bg-green-50 text-green-700 border-green-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status === "Under Review" ? "In Review" : status}
    </span>
  );
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
        const data = res.data.submissions || [];
        const enriched = data.map((sub: Submission) => ({
          ...sub,
          // Allow edit if Pending/Under Review
          canEdit: sub.status === "Pending" || sub.status === "Under Review",
        }));
        setSubmissions(enriched);
      })
      .catch((err) => console.error("Error fetching submissions:", err))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filteredAndSorted = useMemo(() => {
    let filtered = submissions;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.companyName.toLowerCase().includes(q) ||
          s.rfpName.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      }
      if (sortBy === "cost") {
        return (b.upfrontCost || 0) - (a.upfrontCost || 0);
      }
      return 0;
    });
  }, [submissions, searchQuery, filterStatus, sortBy]);

  // Handler for Editing
  const handleEdit = (id: string) => {
    // This route matches the MultiStepSubmission route in App.tsx
    // Usually: <Route path="/submissions/:submissionId" element={<MultiStepSubmission />} />
    navigate(`/submissions/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                My Submissions
              </h1>
              <p className="text-xs text-gray-500">
                {submissions.length} total
              </p>
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={() => navigate("/submit-proposal")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <FileText className="w-4 h-4" /> New Submission
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Submitted</p>
              <p className="text-2xl font-bold text-gray-900">
                {submissions.length}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">In Review</p>
              <p className="text-2xl font-bold text-yellow-600">
                {
                  submissions.filter(
                    (s) => s.status === "Pending" || s.status === "Under Review"
                  ).length
                }
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {submissions.filter((s) => s.status === "Approved").length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search RFP..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">In Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Newest</option>
              <option value="cost">Highest Cost</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">
                  Project / RFP
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600">
                  Submitted
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600">
                  Financials
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{s.rfpName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.implementationTimeline || "Timeline not set"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {safeFormatDate(s.submittedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="font-medium text-gray-900">
                            {safeFormatPrice(s.upfrontCost)}
                          </span>{" "}
                          upfront
                        </div>
                        <div
                          className="flex items-center gap-1 text-xs text-gray-500"
                          title={s.monthlyCost}
                        >
                          <span className="font-medium text-gray-700 truncate max-w-[100px]">
                            {s.monthlyCost || "—"}
                          </span>{" "}
                          /mo
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(s.id)}
                          disabled={!s.canEdit}
                          className={`p-2 rounded-lg transition ${
                            s.canEdit
                              ? "text-blue-600 hover:bg-blue-50"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                          title={s.canEdit ? "Edit Submission" : "Locked"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Optional: Add a View Only mode if needed */}
                        {/* <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4"/></button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
