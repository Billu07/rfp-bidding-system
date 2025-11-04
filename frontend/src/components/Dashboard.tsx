// frontend/src/components/Dashboard.tsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@headlessui/react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  X,
  Loader2,
  ChevronRight,
  Building2,
  Target,
  Timer,
  Users,
  BarChart3,
  TrendingUp,
  Eye,
  Download,
  LogOut,
  Bell,
  Settings,
  Shield,
} from "lucide-react";
import NavLink from "./NavLink";

// Add this function at the top of Dashboard.tsx
const parseDateSafely = (dateStr: string | undefined): Date | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

interface RFP {
  id: string;
  fields: {
    "RFP Name": string;
    Objective: string;
    "Submission Deadline": string;
    Status: string;
    Scope?: string;
    "Budget Guidance"?: string;
  };
}

interface ProposalFormData {
  basePrice: string;
  currency: string;
  timelineDays: string;
  addOns: string;
  assumptions: string;
  exceptions: string;
}

export default function Dashboard() {
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [selectedRFP, setSelectedRFP] = useState<RFP | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ProposalFormData>({
    basePrice: "",
    currency: "USD",
    timelineDays: "",
    addOns: "",
    assumptions: "",
    exceptions: "",
  });
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "timeline", label: "Timeline", icon: Timer },
    { id: "files", label: "Files", icon: FileText },
    { id: "review", label: "Review", icon: Eye },
  ];

  // Auth check
  useEffect(() => {
    const saved = localStorage.getItem("vendor");
    if (!saved) {
      navigate("/login");
      return;
    }
    setVendor(JSON.parse(saved));
    fetchRFPs();
  }, [navigate]);

  const fetchRFPs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rfps/active`);
      setRfps(res.data.rfps);
    } catch (err) {
      console.error("Failed to load RFPs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vendor");
    navigate("/login");
  };

  const openProposalModal = (rfp: RFP) => {
    setSelectedRFP(rfp);
    setFormData({
      basePrice: "",
      currency: "USD",
      timelineDays: "",
      addOns: "",
      assumptions: "",
      exceptions: "",
    });
    setProposalFile(null);
    setSupportingFiles([]);
    setStep(0);
    setSubmitMessage("");
    setIsOpen(true);
  };

  const nextStep = () => {
    if (step < steps.length - 1) setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isProposal = false
  ) => {
    const files = Array.from(e.target.files || []);
    if (isProposal) {
      setProposalFile(files[0] || null);
    } else {
      setSupportingFiles(files);
    }
  };

  const submitProposal = async () => {
    if (
      !selectedRFP ||
      !proposalFile ||
      !formData.basePrice ||
      !formData.timelineDays
    ) {
      setSubmitMessage("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    const formDataToSend = new FormData();
    formDataToSend.append("rfpId", selectedRFP.id);
    formDataToSend.append("basePrice", formData.basePrice);
    formDataToSend.append("currency", formData.currency);
    formDataToSend.append("timelineDays", formData.timelineDays);
    formDataToSend.append("addOns", formData.addOns);
    formDataToSend.append("assumptions", formData.assumptions);
    formDataToSend.append("exceptions", formData.exceptions);
    formDataToSend.append("proposalFile", proposalFile);
    supportingFiles.forEach((file) =>
      formDataToSend.append("supportingFiles", file)
    );

    try {
      const res = await axios.post(
        `${API_BASE}/api/submit-proposal`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-Vendor-Data": JSON.stringify(vendor),
          },
        }
      );
      setSubmitMessage(res.data.message);
      if (res.data.success) {
        setShowSuccessModal(true);
        setTimeout(() => {
          setIsOpen(false);
          setShowSuccessModal(false);
          fetchRFPs();
        }, 3000);
      }
    } catch (err: any) {
      setSubmitMessage(err.response?.data?.error || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // SAFE FILTERING – NO CRASH
  const filteredRFPs = useMemo(() => {
    if (!Array.isArray(rfps)) return [];

    return rfps.filter((rfp) => {
      const name = String(rfp.fields["RFP Name"] ?? "").toLowerCase();
      const objective = String(rfp.fields.Objective ?? "").toLowerCase();
      const status = rfp.fields.Status;

      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        objective.includes(searchQuery.toLowerCase());

      const matchesFilter = filterStatus === "all" || status === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [rfps, searchQuery, filterStatus]);

  const sortedRFPs = useMemo(() => {
    return [...filteredRFPs]
      .map((rfp) => ({
        ...rfp,
        __parsedDeadline: parseDateSafely(rfp.fields["Submission Deadline"]),
      }))
      .sort((a, b) => {
        const timeA = a.__parsedDeadline?.getTime() ?? Infinity;
        const timeB = b.__parsedDeadline?.getTime() ?? Infinity;
        return timeA - timeB;
      })
      .map(({ __parsedDeadline, ...rfp }) => rfp);
  }, [filteredRFPs]);

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const urgentCount = sortedRFPs.filter((rfp) => {
      const deadline = parseDateSafely(rfp.fields["Submission Deadline"]);
      return (
        deadline &&
        !isPast(deadline) &&
        deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
      );
    }).length;

    const newThisWeek = sortedRFPs.filter((rfp) => {
      // This would need creation date from API
      return true; // Placeholder
    }).length;

    return {
      total: sortedRFPs.length,
      urgent: urgentCount,
      newThisWeek: newThisWeek,
    };
  }, [sortedRFPs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Your Dashboard</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing opportunities for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
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
                  Active RFPs
                </NavLink>
                <NavLink
                  to="/dashboard/submissions"
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  My Submissions
                </NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition">
                <Settings className="w-5 h-5" />
              </button>
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

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3 sticky top-16 z-30">
        <div className="flex gap-2">
          <NavLink
            to="/dashboard"
            className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Active
          </NavLink>
          <NavLink
            to="/dashboard/submissions"
            className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Submissions
          </NavLink>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Active RFPs</h2>
              <p className="text-gray-600 mt-2 max-w-2xl">
                Discover new opportunities and submit competitive proposals to
                grow your business
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>{stats.total} opportunities available</span>
              </div>
              {stats.urgent > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>{stats.urgent} urgent deadlines</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Opportunities
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Urgent Deadlines
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.urgent}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  New This Week
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.newThisWeek}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search RFPs by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* RFP Grid */}
        {sortedRFPs.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium mb-2">
              No RFPs match your filters
            </p>
            <p className="text-gray-400 mb-6">
              Try adjusting your search criteria or check back later for new
              opportunities
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedRFPs.map((rfp) => {
              const rawDeadline = rfp.fields["Submission Deadline"];
              const deadline = parseDateSafely(rawDeadline);
              const isUrgent =
                deadline &&
                !isPast(deadline) &&
                deadline.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
              const isOverdue = deadline && isPast(deadline);
              const daysLeft = deadline
                ? Math.ceil(
                    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <div
                  key={rfp.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200/50 overflow-hidden group hover:transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition mb-2">
                          {rfp.fields["RFP Name"]}
                        </h3>
                        {rfp.fields["Budget Guidance"] && (
                          <p className="text-sm text-green-600 font-semibold mb-2">
                            {rfp.fields["Budget Guidance"]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isUrgent && (
                          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                            Urgent
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                            Overdue
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 font-medium rounded-full text-xs border border-green-200">
                          {rfp.fields.Status}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                      {rfp.fields.Objective}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        {deadline ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Due {format(deadline, "MMM d, yyyy")}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span
                              className={
                                isUrgent
                                  ? "text-orange-600 font-semibold"
                                  : "text-gray-500"
                              }
                            >
                              {daysLeft && daysLeft > 0
                                ? `${daysLeft} days left`
                                : formatDistanceToNow(deadline, {
                                    addSuffix: true,
                                  })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">
                            Invalid Deadline
                          </span>
                        )}
                      </div>

                      {rfp.fields.Scope && (
                        <div className="flex items-start text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2 text-purple-600 mt-0.5" />
                          <span className="line-clamp-2">
                            {rfp.fields.Scope}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openProposalModal(rfp)}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 group-hover:shadow-blue-300/50"
                    >
                      <FileText className="w-4 h-4" />
                      Submit Proposal
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Proposal Modal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-8 animate-scaleIn">
            <div className="flex justify-between items-start mb-6">
              <div>
                <Dialog.Title className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText className="w-7 h-7 text-blue-600" />
                  Submit Proposal
                </Dialog.Title>
                <Dialog.Description className="text-gray-600 mt-2">
                  RFP:{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedRFP?.fields["RFP Name"]}
                  </span>
                </Dialog.Description>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {steps.map((stepItem, i) => {
                  const Icon = stepItem.icon;
                  return (
                    <div
                      key={stepItem.id}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          i < step
                            ? "bg-green-500 text-white shadow-lg shadow-green-200"
                            : i === step
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {i < step ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <p
                        className={`mt-3 text-sm font-semibold text-center ${
                          i <= step ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {stepItem.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            {step === 0 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Base Price *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        name="basePrice"
                        type="number"
                        value={formData.basePrice}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>CAD</option>
                      <option>AUD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Timeline (Days) *
                  </label>
                  <div className="relative">
                    <Timer className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      name="timelineDays"
                      type="number"
                      value={formData.timelineDays}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="90"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Optional Add-ons & Services
                  </label>
                  <textarea
                    name="addOns"
                    value={formData.addOns}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                    placeholder="Premium support: $5,000\nExtended warranty: $3,000\nTraining sessions: $2,500..."
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Proposal File (PDF/ZIP) *
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-2xl p-8 transition ${
                      proposalFile
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 hover:border-blue-400 bg-gray-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.zip"
                      onChange={(e) => handleFileChange(e, true)}
                      className="hidden"
                      id="proposal-file"
                    />
                    <label htmlFor="proposal-file" className="cursor-pointer">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          {proposalFile
                            ? "File Ready"
                            : "Upload Proposal Document"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {proposalFile
                            ? proposalFile.name
                            : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          PDF or ZIP format • Maximum 50MB
                        </p>
                      </div>
                    </label>
                    {proposalFile && (
                      <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-xl flex items-center justify-between">
                        <span className="text-green-800 font-medium flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          {proposalFile.name}
                        </span>
                        <button
                          onClick={() => setProposalFile(null)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Supporting Files (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-blue-400 transition bg-gray-50">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileChange(e, false)}
                      className="w-full file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                    />
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Additional documents, references, or case studies
                    </p>
                  </div>
                  {supportingFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {supportingFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200"
                        >
                          <span className="text-sm text-blue-800 font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {file.name}
                          </span>
                          <button
                            onClick={() =>
                              setSupportingFiles((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Assumptions & Prerequisites
                  </label>
                  <textarea
                    name="assumptions"
                    value={formData.assumptions}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                    placeholder="e.g., Client provides access to staging environment, necessary API documentation available, project kickoff within 2 weeks of approval..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Exceptions & Exclusions
                  </label>
                  <textarea
                    name="exceptions"
                    value={formData.exceptions}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                    placeholder="e.g., Hardware costs not included, third-party license fees excluded, travel expenses billed separately..."
                  />
                </div>

                {/* Review Summary */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Proposal Summary
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Base Price:</p>
                      <p className="font-semibold text-gray-900">
                        {formData.currency} {formData.basePrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Timeline:</p>
                      <p className="font-semibold text-gray-900">
                        {formData.timelineDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Proposal File:</p>
                      <p className="font-semibold text-gray-900">
                        {proposalFile ? proposalFile.name : "Not uploaded"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Supporting Files:</p>
                      <p className="font-semibold text-gray-900">
                        {supportingFiles.length} files
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-200">
              <div>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center gap-3 px-6 py-3 text-gray-700 font-semibold hover:text-gray-900 transition-all hover:bg-gray-100 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Previous
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitProposal}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Proposal
                        <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {submitMessage && (
              <div
                className={`mt-6 p-4 rounded-xl border text-center font-medium transition-all ${
                  submitMessage.includes("successfully")
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {submitMessage.includes("successfully") ? (
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                )}
                <p>{submitMessage}</p>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Proposal Submitted!
                </h3>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Thank You for Your Submission!
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Your proposal for{" "}
                  <strong>{selectedRFP?.fields["RFP Name"]}</strong> has been
                  submitted successfully. You will be notified once the client
                  reviews your submission.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                  <h5 className="font-semibold text-blue-900 mb-2">
                    What happens next?
                  </h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Client reviews all submissions (1-2 weeks)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      You may be contacted for clarification
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Final decision communicated via email
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsOpen(false);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-center"
              >
                View Other RFPs
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
