import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import AdminQuestionsPanel from "./AdminQuestionsPanel";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Shield,
  Users,
  FileText,
  Search,
  CheckCircle,
  Download,
  Loader2,
  LogOut,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  BarChart3,
  X,
  Eye,
  RefreshCw,
  Target,
  MessageSquare,
  Database,
  Lock,
  Briefcase,
  ChevronRight,
  Filter,
  Home,
} from "lucide-react";

interface Submission {
  id: string;
  rfpName: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  website?: string;
  companyDescription?: string;
  status: string;
  submittedAt: string;
  adminNotes?: string;
  clientWorkflowDescription?: string;
  requestCaptureDescription?: string;
  internalWorkflowDescription?: string;
  reportingCapabilities?: string;
  dataArchitecture?: string;
  integrationScores?: Record<string, string>;
  securityMeasures?: string;
  pciCompliant?: boolean;
  piiCompliant?: boolean;
  implementationTimeline?: string;
  projectStartDate?: string;
  implementationPhases?: string;
  upfrontCost?: number | string;
  monthlyCost?: string;
  pricingDocUrl?: string;
  reference1?: { name: string; company: string; email: string; reason: string };
  reference2?: { name: string; company: string; email: string; reason: string };
  solutionFit?: string;
}

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
  "NDA View URL"?: string;
  Status?: string;
  "Last Login"?: string;
}

// --- Helpers ---

const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return "Unknown";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
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

const getIntegrationStatusIcon = (status: string) => {
  if (!status) return "❓";
  if (status.includes("can-integrate") && !status.includes("not-done"))
    return "✅";
  if (status.includes("not-done")) return "⚙️";
  if (status.includes("cannot")) return "❌";
  return "❓";
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    "Under Review": "bg-blue-100 text-blue-700 border-blue-200",
    Shortlisted: "bg-purple-100 text-purple-700 border-purple-200",
    Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const defaultStyle = "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || defaultStyle
      }`}
    >
      {status}
    </span>
  );
};

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "vendors" | "submissions" | "questions"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNdaPreview, setShowNdaPreview] = useState<string | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState<{
    show: boolean;
    submission: Submission | null;
    action: string;
  }>({ show: false, submission: null, action: "" });
  const [showSubmissionDetail, setShowSubmissionDetail] =
    useState<Submission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin")) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);
    try {
      const [vRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/pending-vendors`),
        axios.get(`${API_BASE}/api/admin/submissions`),
      ]);
      setVendors(vRes.data.vendors || []);
      setSubmissions(sRes.data.submissions || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setLoadError("Failed to load dashboard data.");
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
      fetchData(true);
    } catch {
      alert("Action failed.");
    }
  };

  const handleSubmissionAction = async (
    submissionId: string,
    action: string
  ) => {
    try {
      await axios.post(`${API_BASE}/api/admin/submission-action`, {
        submissionId,
        action,
        notes: adminNotes,
      });
      setShowSubmissionModal({ show: false, submission: null, action: "" });
      setShowSubmissionDetail(null);
      setAdminNotes("");
      fetchData(true);
    } catch {
      alert("Action failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/");
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchesSearch =
        s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchQuery, filterStatus]);

  if (isLoading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  if (loadError)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-red-500 font-medium mb-4">{loadError}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      {/* RESPONIVE HEADER: Adjusted padding and flex alignment */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-slate-900">
                Admin Control
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Workflow Modernization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/"
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors hidden sm:block"
              title="Go Home"
            >
              <Home className="w-5 h-5" />
            </a>
            <button
              onClick={() => fetchData(true)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-2 sm:px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />{" "}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* RESPONSIVE TABS: Added horizontal scroll and full width on mobile */}
        <div className="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-fit overflow-x-auto no-scrollbar">
          {[
            { id: "dashboard", label: "Overview", icon: BarChart3 },
            {
              id: "vendors",
              label: "Vendors",
              icon: Users,
              count: vendors.length,
            },
            {
              id: "submissions",
              label: "Submissions",
              icon: FileText,
              count: submissions.length,
            },
            { id: "questions", label: "Q&A", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}{" "}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "dashboard" && (
            // RESPONSIVE GRID: 1 column on mobile, 2 on tablet, 4 on desktop
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  label: "Total Submissions",
                  val: submissions.length,
                  icon: FileText,
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  label: "Pending Vendors",
                  val: vendors.length,
                  icon: Users,
                  color: "bg-orange-50 text-orange-600",
                },
                {
                  label: "Pending Review",
                  val: submissions.filter((s) => s.status === "Pending").length,
                  icon: Clock,
                  color: "bg-purple-50 text-purple-600",
                },
                {
                  label: "Approved",
                  val: submissions.filter((s) => s.status === "Approved")
                    .length,
                  icon: CheckCircle,
                  color: "bg-emerald-50 text-emerald-600",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "vendors" && (
            <div className="grid gap-4">
              {vendors.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">
                    No pending vendor applications
                  </p>
                </div>
              ) : (
                vendors.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                  >
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                        {v["Vendor Name"].charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-lg text-slate-900 truncate">
                          {v["Vendor Name"]}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1 truncate">
                            <Users className="w-3 h-3" /> {v["Contact Person"]}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" /> {v.Email}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* RESPONSIVE BUTTONS: Wrap on small screens, full width on mobile */}
                    <div className="flex flex-wrap gap-3 z-10 relative w-full md:w-auto">
                      {(v["NDA View URL"] || v["NDA Cloudinary URL"]) && (
                        <button
                          onClick={() =>
                            setShowNdaPreview(
                              v["NDA View URL"] || v["NDA Cloudinary URL"]!
                            )
                          }
                          className="flex-1 md:flex-none justify-center px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> NDA
                        </button>
                      )}
                      <button
                        onClick={() => handleVendorAction(v.id, "approve")}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVendorAction(v.id, "decline")}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "submissions" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search companies, contacts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    className="py-2.5 bg-transparent outline-none text-sm text-slate-700 font-medium w-full sm:w-auto"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              {/* RESPONSIVE TABLE: Added overflow-x-auto to wrapper */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Company
                      </th>
                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Financials
                      </th>
                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Timeline
                      </th>
                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Status
                      </th>
                      <th className="px-6 py-4 font-semibold text-slate-600 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No submissions found.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => setShowSubmissionDetail(s)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">
                              {s.companyName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {s.contactPerson}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />{" "}
                                <span className="font-medium text-slate-900">
                                  {safeFormatPrice(s.upfrontCost)}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1.5 text-xs text-slate-500"
                                title={s.monthlyCost}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />{" "}
                                <span className="truncate max-w-[100px]">
                                  {s.monthlyCost || "N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {s.implementationTimeline || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-indigo-600 group-hover:text-indigo-800 font-medium inline-flex items-center gap-1 transition-colors">
                              View <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 min-h-[500px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Vendor Q&A</h3>
              </div>
              <AdminQuestionsPanel />
            </div>
          )}
        </div>
      </main>

      {/* --- SUBMISSION MODAL (FULL DETAILS) --- */}
      {showSubmissionDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* RESPONSIVE HEADER IN MODAL */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-start bg-white rounded-t-2xl">
              <div className="flex gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg sm:text-xl shrink-0">
                  {showSubmissionDetail.companyName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 line-clamp-1">
                    {showSubmissionDetail.companyName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />{" "}
                      {showSubmissionDetail.contactPerson}
                    </span>
                    <span className="flex items-center gap-1.5 hidden sm:flex">
                      <Calendar className="w-4 h-4" />{" "}
                      {safeFormatDate(showSubmissionDetail.submittedAt)}
                    </span>
                    <StatusBadge status={showSubmissionDetail.status} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSubmissionDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 sm:space-y-10 bg-slate-50/50">
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Solution Overview
                </h3>
                <div className="grid gap-6">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-2">
                      Company Description
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {showSubmissionDetail.companyDescription || "N/A"}
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-semibold text-indigo-900 mb-3">
                        Client Workflow
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {showSubmissionDetail.clientWorkflowDescription ||
                          "N/A"}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-semibold text-indigo-900 mb-3">
                        Internal Workflow
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {showSubmissionDetail.internalWorkflowDescription ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Technical & Compliance
                </h3>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-sm text-slate-700">
                      Integrations
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5">
                      {showSubmissionDetail.integrationScores &&
                        Object.entries(
                          showSubmissionDetail.integrationScores
                        ).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                          >
                            <span className="text-xl">
                              {getIntegrationStatusIcon(val)}
                            </span>
                            <span className="text-sm font-medium capitalize text-slate-700">
                              {key.replace(/([A-Z])/g, " $1")}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div
                      className={`flex-1 p-4 rounded-xl border flex items-center gap-3 ${
                        showSubmissionDetail.pciCompliant
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : "bg-red-50 border-red-100 text-red-800"
                      }`}
                    >
                      <Lock className="w-5 h-5" />{" "}
                      <div>
                        <p className="font-bold text-sm">PCI Compliance</p>
                        <p className="text-xs opacity-80">
                          {showSubmissionDetail.pciCompliant
                            ? "Verified"
                            : "Missing"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex-1 p-4 rounded-xl border flex items-center gap-3 ${
                        showSubmissionDetail.piiCompliant
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : "bg-red-50 border-red-100 text-red-800"
                      }`}
                    >
                      <Shield className="w-5 h-5" />{" "}
                      <div>
                        <p className="font-bold text-sm">PII Compliance</p>
                        <p className="text-xs opacity-80">
                          {showSubmissionDetail.piiCompliant
                            ? "Verified"
                            : "Missing"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Financials & Timeline
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100/50">
                    <h4 className="text-emerald-900 font-bold mb-4">
                      Cost Structure
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
                        <span className="text-emerald-700 text-sm">
                          Upfront Cost
                        </span>
                        <span className="font-bold text-lg text-emerald-900">
                          {safeFormatPrice(showSubmissionDetail.upfrontCost)}
                        </span>
                      </div>
                      <div className="flex justify-between items-start pt-1">
                        <span className="text-emerald-700 text-sm mt-1">
                          Monthly Cost
                        </span>
                        <span className="font-medium text-emerald-900 text-sm text-right max-w-[200px]">
                          {showSubmissionDetail.monthlyCost || "N/A"}
                        </span>
                      </div>
                      {showSubmissionDetail.pricingDocUrl && (
                        <div className="pt-3 mt-3 border-t border-emerald-200">
                          <a
                            href={showSubmissionDetail.pricingDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition text-xs font-semibold"
                          >
                            <Download className="w-3 h-3" /> Download Pricing
                            Doc
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100/50">
                    <h4 className="text-blue-900 font-bold mb-4">
                      Implementation
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-blue-100">
                        <span className="text-blue-700 text-sm">
                          Estimated Duration
                        </span>
                        <span className="font-bold text-blue-900">
                          {showSubmissionDetail.implementationTimeline || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-blue-700 text-sm">
                          Target Start
                        </span>
                        <span className="font-medium text-blue-900">
                          {safeFormatDate(
                            showSubmissionDetail.projectStartDate
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> References
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    showSubmissionDetail.reference1,
                    showSubmissionDetail.reference2,
                  ].map((ref, idx) =>
                    ref?.name ? (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-slate-100 p-2 rounded-full">
                            <Briefcase className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {ref.company}
                            </h4>
                            <p className="text-xs text-slate-500">{ref.name}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 italic">
                          "{ref.reason}"
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
              </section>
            </div>
            {/* RESPONSIVE FOOTER: Stack buttons on very small screens if needed */}
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex flex-wrap justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowSubmissionDetail(null)}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition w-full sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={() =>
                  setShowSubmissionModal({
                    show: true,
                    submission: showSubmissionDetail,
                    action: "shortlist",
                  })
                }
                className="px-5 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 shadow-md shadow-violet-200 transition w-full sm:w-auto"
              >
                Shortlist
              </button>
              <button
                onClick={() =>
                  setShowSubmissionModal({
                    show: true,
                    submission: showSubmissionDetail,
                    action: "approve",
                  })
                }
                className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition w-full sm:w-auto"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACTION CONFIRMATION MODAL --- */}
      {showSubmissionModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold capitalize text-slate-900 mb-2">
              {showSubmissionModal.action} Submission?
            </h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to {showSubmissionModal.action} the
              submission from{" "}
              <strong>{showSubmissionModal.submission?.companyName}</strong>?
            </p>
            <textarea
              className="w-full border border-slate-300 rounded-xl p-3 mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Add internal notes (optional)..."
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setShowSubmissionModal({
                    show: false,
                    submission: null,
                    action: "",
                  })
                }
                className="px-5 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSubmissionAction(
                    showSubmissionModal.submission!.id,
                    showSubmissionModal.action
                  )
                }
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition capitalize"
              >
                Confirm {showSubmissionModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NDA MODAL --- */}
      {showNdaPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-900">NDA Document Preview</h3>
              <button
                onClick={() => setShowNdaPreview(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(
                showNdaPreview
              )}&embedded=true`}
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
