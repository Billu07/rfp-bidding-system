import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/api";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Building,
  Workflow,
  Cpu,
  Calendar,
  Users,
  Save,
  Edit,
  Clock,
  AlertCircle,
  Mail,
  XCircle,
  Globe,
  Phone,
  User,
  PlayCircle,
} from "lucide-react";

// --- Types ---
interface SubmissionData {
  id?: string;
  // Step 1
  companyName: string;
  website: string;
  contactPerson: string;
  email: string;
  phone: string;
  companyDescription: string;
  // Step 2
  clientWorkflowDescription: string;
  requestCaptureDescription: string;
  internalWorkflowDescription: string;
  reportingCapabilities: string;
  dataArchitecture: string;
  step2Questions: string;
  // Step 3
  integrationScores: {
    zendesk: string;
    oracleSql: string;
    quickbooks: string;
    slack: string;
    brex: string;
    avinode: string;
  };
  securityMeasures: string;
  pciCompliant: boolean;
  piiCompliant: boolean;
  step3Questions: string;
  // Step 4
  implementationTimeline: string;
  projectStartDate: string;
  implementationPhases: string;
  upfrontCost: string;
  monthlyCost: string;
  pricingDocument: File | null;
  step4Questions: string;
  // Step 5
  reference1: { name: string; company: string; email: string; reason: string };
  reference2: { name: string; company: string; email: string; reason: string };
  solutionFit: string;
  infoAccurate: boolean;
  contactConsent: boolean;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  contact: string;
  phone?: string;
  website?: string;
  services?: string;
}

export default function MultiStepSubmission() {
  const navigate = useNavigate();
  const { submissionId } = useParams();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState<
    "idle" | "loading" | "submitting" | "saving" | "saved" | "error"
  >("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string[] }>({});

  const isInitialLoad = useRef(true);

  const initialFormState: SubmissionData = {
    companyName: "",
    website: "",
    contactPerson: "",
    email: "",
    phone: "",
    companyDescription: "",
    clientWorkflowDescription: "",
    requestCaptureDescription: "",
    internalWorkflowDescription: "",
    reportingCapabilities: "",
    dataArchitecture: "",
    step2Questions: "",
    integrationScores: {
      zendesk: "",
      oracleSql: "",
      quickbooks: "",
      slack: "",
      brex: "",
      avinode: "",
    },
    securityMeasures: "",
    pciCompliant: false,
    piiCompliant: false,
    step3Questions: "",
    implementationTimeline: "",
    projectStartDate: "",
    implementationPhases: "",
    upfrontCost: "",
    monthlyCost: "",
    pricingDocument: null,
    step4Questions: "",
    reference1: { name: "", company: "", email: "", reason: "" },
    reference2: { name: "", company: "", email: "", reason: "" },
    solutionFit: "",
    infoAccurate: false,
    contactConsent: false,
  };

  const [formData, setFormData] = useState<SubmissionData>(initialFormState);

  const steps = [
    { number: 1, title: "Company Info", icon: Building },
    { number: 2, title: "Solution Fit", icon: Workflow },
    { number: 3, title: "Technical Capabilities", icon: Cpu },
    { number: 4, title: "Implementation & Pricing", icon: Calendar },
    { number: 5, title: "References & Fit", icon: Users },
  ];

  const formatUrl = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  // --- Validation (Original Logic) ---
  const validateStep = (step: number): boolean => {
    const errors: string[] = [];
    switch (step) {
      case 1:
        if (!formData.companyDescription.trim())
          errors.push("Company description is required");
        break;
      case 2:
        if (!formData.clientWorkflowDescription.trim())
          errors.push("Client workflow description is required");
        if (!formData.requestCaptureDescription.trim())
          errors.push("Request capture description is required");
        if (!formData.internalWorkflowDescription.trim())
          errors.push("Internal workflow description is required");
        if (!formData.reportingCapabilities.trim())
          errors.push("Reporting capabilities description is required");
        if (!formData.dataArchitecture.trim())
          errors.push("Data architecture description is required");
        break;
      case 3:
        if (!formData.securityMeasures.trim())
          errors.push("Security measures description is required");
        const missingIntegrations = Object.keys(
          formData.integrationScores
        ).filter(
          (key) =>
            !formData.integrationScores[
              key as keyof typeof formData.integrationScores
            ]
        );
        if (missingIntegrations.length > 0)
          errors.push("Please select integration capability for all systems");
        break;
      case 4:
        if (!formData.implementationTimeline.trim())
          errors.push("Implementation timeline is required");
        if (!formData.projectStartDate.trim())
          errors.push("Project start date is required");
        if (!formData.implementationPhases.trim())
          errors.push("Implementation phases description is required");
        break;
      case 5:
        if (!formData.solutionFit.trim())
          errors.push("Solution fit description is required");
        if (!formData.infoAccurate)
          errors.push("You must confirm the information is accurate");
        if (!formData.contactConsent)
          errors.push("You must consent to being contacted");
        break;
    }
    setStepErrors((prev) => ({ ...prev, [step]: errors }));
    return errors.length === 0;
  };

  // --- Data Loading (Robust Merge Strategy) ---
  useEffect(() => {
    const loadData = async () => {
      const vendorStr = localStorage.getItem("vendor");
      if (!vendorStr) {
        navigate("/login");
        return;
      }
      const vendor: Vendor = JSON.parse(vendorStr);

      const baseVendorData = {
        companyName: vendor.name || "",
        contactPerson: vendor.contact || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        website: vendor.website || "",
        companyDescription: vendor.services || "",
      };

      try {
        let mergedData = { ...formData, ...baseVendorData };

        if (submissionId) {
          setIsEditing(true);
          // FIX: Use API_BASE
          const response = await fetch(
            `${API_BASE}/api/vendor/submissions/${submissionId}`,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Vendor-Data": JSON.stringify(vendor),
              },
            }
          );
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.submission) {
              mergedData = { ...mergedData, ...result.submission };
            }
          }
        } else {
          // FIX: Use API_BASE
          const response = await fetch(`${API_BASE}/api/load-draft`, {
            headers: {
              "Content-Type": "application/json",
              "X-Vendor-Data": JSON.stringify({ id: vendor.id }),
            },
          });
          const result = await response.json();
          if (result.success) {
            // FIX: Prioritize Fresh Vendor Profile from Backend
            if (result.vendorProfile) {
              mergedData = { ...mergedData, ...result.vendorProfile };
            }

            if (result.draft) {
              const draft = result.draft;
              // Handle stringified fields
              if (typeof draft.integrationScores === "string")
                try {
                  draft.integrationScores = JSON.parse(draft.integrationScores);
                } catch (e) {}
              if (typeof draft.reference1 === "string")
                try {
                  draft.reference1 = JSON.parse(draft.reference1);
                } catch (e) {}
              if (typeof draft.reference2 === "string")
                try {
                  draft.reference2 = JSON.parse(draft.reference2);
                } catch (e) {}

              mergedData = {
                ...mergedData,
                ...draft,
                // Ensure profile fields are set if draft doesn't override them explicitly
                // (though above merge logic handles priorities)
              };
              setLastSaved(new Date(result.lastSaved).toLocaleString());
            }
          }
        }
        setFormData(mergedData);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setStatus("idle");
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 2000);
      }
    };
    loadData();
  }, [submissionId, navigate]);

  // --- Auto-Save ---
  useEffect(() => {
    if (
      isInitialLoad.current ||
      currentStep <= 1 ||
      !hasUnsavedChanges ||
      status === "submitting" ||
      submissionId
    )
      return;
    const autoSave = setTimeout(() => {
      saveDraft();
    }, 2000);
    return () => clearTimeout(autoSave);
  }, [formData, currentStep, hasUnsavedChanges, status, submissionId]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const handleIntegrationScoreChange = useCallback(
    (integration: string, score: string) => {
      setFormData((prev) => ({
        ...prev,
        integrationScores: { ...prev.integrationScores, [integration]: score },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  const saveDraft = async () => {
    setStatus("saving");
    try {
      const vendorData = localStorage.getItem("vendor");
      if (!vendorData) return;
      const vendor = JSON.parse(vendorData);

      const draftData = {
        ...formData,
        lastSaved: new Date().toISOString(),
        status: "draft",
      };

      // FIX: Use API_BASE
      const response = await fetch(`${API_BASE}/api/save-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vendor-Data": JSON.stringify({ id: vendor.id }),
        },
        body: JSON.stringify(draftData),
      });

      const result = await response.json();
      if (result.success) {
        setStatus("saved");
        setLastSaved(new Date().toLocaleString());
        setHasUnsavedChanges(false);
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      setStatus("error");
    }
  };

  const handleSubmit = async () => {
    const allStepsValid = [1, 2, 3, 4, 5].every((step) => validateStep(step));
    if (!allStepsValid) {
      alert("Please complete all required fields before submitting.");
      return;
    }

    if (
      !window.confirm("Are you sure you want to submit? This cannot be undone.")
    )
      return;

    setStatus("submitting");
    try {
      const vendorData = localStorage.getItem("vendor");
      if (!vendorData) throw new Error("Vendor data not found");
      const vendor = JSON.parse(vendorData);

      // FIX: Use API_BASE
      const url =
        isEditing && submissionId
          ? `${API_BASE}/api/update-submission/${submissionId}`
          : `${API_BASE}/api/submit-proposal`;

      // Use FormData for File Upload
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        const value = (formData as any)[key];
        if (key === "pricingDocument") {
          if (value instanceof File) payload.append("pricingDocument", value);
        } else if (typeof value === "object" && value !== null) {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value));
        }
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "X-Vendor-Data": JSON.stringify(vendor) }, // No Content-Type header for FormData!
        body: payload,
      });

      const result = await response.json();

      if (result.success) {
        if (!isEditing) {
          // FIX: Use API_BASE
          await fetch(`${API_BASE}/api/delete-draft`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Vendor-Data": JSON.stringify(vendor),
            },
          });
        }
        navigate("/submissions", {
          state: { message: "Submission successful!" },
        });
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error: any) {
      alert("Submission failed: " + error.message);
      setStatus("idle");
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (hasUnsavedChanges) saveDraft();
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const prevStep = () => {
    if (hasUnsavedChanges) saveDraft();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // --- Render Helpers (Your Original UI) ---

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Company Information
          </h3>
          <p className="text-gray-600">
            Your company details from registration. Contact support to update
            this information.
          </p>
        </div>
        {isEditing && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Edit className="w-4 h-4 mr-1" /> Editing Mode
          </span>
        )}
      </div>

      {stepErrors[1] && stepErrors[1].length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800 mb-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Please fix the following issues:
            </span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[1].map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-blue-900 mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2" /> Registered Company Information
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Building className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-sm font-medium text-blue-700">
                  Company Name
                </label>
                <p className="text-gray-900 font-medium">
                  {formData.companyName || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-sm font-medium text-blue-700">
                  Contact Person
                </label>
                <p className="text-gray-900 font-medium">
                  {formData.contactPerson || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-sm font-medium text-blue-700">
                  Email Address
                </label>
                <p className="text-gray-900">
                  {formData.email || "Not provided"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-sm font-medium text-blue-700">
                  Phone Number
                </label>
                <p className="text-gray-900">
                  {formData.phone || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <label className="block text-sm font-medium text-blue-700">
                  Website
                </label>
                <a
                  href={formatUrl(formData.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {formData.website || "Not provided"}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-300">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">
                Need to update your company information?
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Contact support to update your registered company details.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Description & Expertise *
        </label>
        <textarea
          value={formData.companyDescription}
          onChange={(e) =>
            handleInputChange("companyDescription", e.target.value)
          }
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe your company's expertise..."
          required
        />
        <div className="text-sm text-gray-500 mt-1">
          {formData.companyDescription.length}/500 characters
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Solution Fit & Use Cases
        </h3>
        <p className="text-gray-600">
          Describe how your solution addresses client-facing and internal
          workflow needs.
        </p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <PlayCircle className="w-6 h-6 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-blue-900">
            Step 1 Guidance Video
          </h4>
        </div>
        <p className="text-blue-700 mb-4">
          Watch this short video to understand how to best complete the Solution
          Fit section:
        </p>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.youtube.com/embed/eqmi-SZuH78"
            title="Step 2 Guidance"
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      {stepErrors[2] && stepErrors[2].length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[2].map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe how a current customer is using your{" "}
            <strong>client-facing workflow</strong> (max 500 words) *
          </label>
          <textarea
            value={formData.clientWorkflowDescription}
            onChange={(e) =>
              handleInputChange("clientWorkflowDescription", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the client-facing workflow..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How does your platform capture and route member or client requests?
            *
          </label>
          <textarea
            value={formData.requestCaptureDescription}
            onChange={(e) =>
              handleInputChange("requestCaptureDescription", e.target.value)
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Explain your request capture mechanism..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe how a current customer is using your{" "}
            <strong>internal workflow</strong> (max 500 words) *
          </label>
          <textarea
            value={formData.internalWorkflowDescription}
            onChange={(e) =>
              handleInputChange("internalWorkflowDescription", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe internal processes..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What reporting capabilities exist? *
          </label>
          <textarea
            value={formData.reportingCapabilities}
            onChange={(e) =>
              handleInputChange("reportingCapabilities", e.target.value)
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detail your analytics..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your approach to data integration and architecture (max 500
            words) *
          </label>
          <textarea
            value={formData.dataArchitecture}
            onChange={(e) =>
              handleInputChange("dataArchitecture", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Explain your data architecture..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Any questions or clarification requests?
          </label>
          <textarea
            value={formData.step2Questions}
            onChange={(e) =>
              handleInputChange("step2Questions", e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter any questions..."
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Technical Capabilities & Compliance
        </h3>
        <p className="text-gray-600">
          Assess your integration capabilities and security compliance.
        </p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <PlayCircle className="w-6 h-6 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-blue-900">
            Step 2 Guidance Video
          </h4>
        </div>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.youtube.com/embed/94iOye1X5mU"
            title="Step 3 Guidance"
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      {stepErrors[3] && stepErrors[3].length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[3].map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Integration Capabilities
        </h4>
        <div className="space-y-4">
          {[
            { k: "zendesk", l: "Zendesk" },
            { k: "oracleSql", l: "Oracle SQL" },
            { k: "quickbooks", l: "QuickBooks" },
            { k: "slack", l: "Slack" },
            { k: "brex", l: "Brex" },
            { k: "avinode", l: "Avinode" },
          ].map((i) => (
            <div
              key={i.k}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-lg border border-gray-200 space-y-3 md:space-y-0"
            >
              <span className="font-medium text-gray-900 md:w-1/4">{i.l}</span>
              <div className="flex gap-4 md:flex-1 md:justify-center">
                {[
                  {
                    v: "can-integrate",
                    l: "✅ Can integrate",
                    c: "text-green-600",
                  },
                  {
                    v: "can-integrate-not-done",
                    l: "⚙️ Can integrate (not done)",
                    c: "text-yellow-600",
                  },
                  {
                    v: "cannot-integrate",
                    l: "❌ Cannot integrate",
                    c: "text-red-600",
                  },
                ].map((opt) => (
                  <label
                    key={opt.v}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name={i.k}
                      value={opt.v}
                      checked={
                        (formData.integrationScores as any)[i.k] === opt.v
                      }
                      onChange={(e) =>
                        handleIntegrationScoreChange(i.k, e.target.value)
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${opt.c} font-medium group-hover:underline`}
                    >
                      {opt.l}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your data security and compliance measures (500 words) *
          </label>
          <textarea
            value={formData.securityMeasures}
            onChange={(e) =>
              handleInputChange("securityMeasures", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div className="flex items-center space-x-8">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.pciCompliant}
              onChange={(e) =>
                handleInputChange("pciCompliant", e.target.checked)
              }
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">
              Confirm compliance with PCI standards
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.piiCompliant}
              onChange={(e) =>
                handleInputChange("piiCompliant", e.target.checked)
              }
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">
              Confirm compliance with PII standards
            </span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Questions / Clarifications
          </label>
          <textarea
            value={formData.step3Questions}
            onChange={(e) =>
              handleInputChange("step3Questions", e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Implementation & Pricing
        </h3>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <PlayCircle className="w-6 h-6 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-blue-900">
            Step 3 Guidance Video
          </h4>
        </div>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.youtube.com/embed/Lp4xbKHTG-o"
            title="Step 4 Guidance"
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      {stepErrors[4] && stepErrors[4].length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[4].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Implementation timeline (weeks) *
          </label>
          <input
            type="text"
            value={formData.implementationTimeline}
            onChange={(e) =>
              handleInputChange("implementationTimeline", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project start date *
          </label>
          <input
            type="date"
            value={formData.projectStartDate}
            onChange={(e) =>
              handleInputChange("projectStartDate", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Implementation Phases *
        </label>
        <textarea
          value={formData.implementationPhases}
          onChange={(e) =>
            handleInputChange("implementationPhases", e.target.value)
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upfront Cost ($)
          </label>
          <input
            type="number"
            value={formData.upfrontCost}
            onChange={(e) => handleInputChange("upfrontCost", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Cost
          </label>
          <textarea
            value={formData.monthlyCost}
            onChange={(e) => handleInputChange("monthlyCost", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload optional pricing document
        </label>
        <input
          type="file"
          onChange={(e) =>
            handleInputChange("pricingDocument", e.target.files?.[0] || null)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          accept=".pdf,.doc,.docx,.xlsx,.xls"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Questions?
        </label>
        <textarea
          value={formData.step4Questions}
          onChange={(e) => handleInputChange("step4Questions", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          References & Fit
        </h3>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <PlayCircle className="w-6 h-6 text-blue-600 mr-2" />
          <h4 className="text-lg font-semibold text-blue-900">
            Step 4 Guidance Video
          </h4>
        </div>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src="https://www.youtube.com/embed/NDUUkzPJoTM"
            title="Step 5 Guidance"
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      {stepErrors[5] && stepErrors[5].length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[5].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {[1, 2].map((num) => {
        const refKey = `reference${num}` as "reference1" | "reference2";
        return (
          <div
            key={num}
            className="bg-gray-50 rounded-xl p-6 border border-gray-200"
          >
            <h4 className="font-semibold text-gray-900 mb-4 text-lg">
              Reference #{num}
            </h4>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                placeholder="Name"
                value={formData[refKey].name}
                onChange={(e) =>
                  handleInputChange(refKey, {
                    ...formData[refKey],
                    name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                placeholder="Company"
                value={formData[refKey].company}
                onChange={(e) =>
                  handleInputChange(refKey, {
                    ...formData[refKey],
                    company: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-lg md:col-span-2"
                value={formData[refKey].email}
                onChange={(e) =>
                  handleInputChange(refKey, {
                    ...formData[refKey],
                    email: e.target.value,
                  })
                }
              />
              <textarea
                placeholder="Reason"
                className="w-full px-3 py-2 border rounded-lg md:col-span-2"
                rows={3}
                value={formData[refKey].reason}
                onChange={(e) =>
                  handleInputChange(refKey, {
                    ...formData[refKey],
                    reason: e.target.value,
                  })
                }
              />
            </div>
          </div>
        );
      })}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Solution Fit *
        </label>
        <textarea
          value={formData.solutionFit}
          onChange={(e) => handleInputChange("solutionFit", e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
      </div>
      <div className="space-y-4 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.infoAccurate}
            onChange={(e) =>
              handleInputChange("infoAccurate", e.target.checked)
            }
            className="w-4 h-4 mt-1"
            required
          />
          <span className="text-sm text-gray-700">
            I confirm the information is accurate *
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.contactConsent}
            onChange={(e) =>
              handleInputChange("contactConsent", e.target.checked)
            }
            className="w-4 h-4 mt-1"
            required
          />
          <span className="text-sm text-gray-700">I consent to contact *</span>
        </label>
      </div>
    </div>
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? "Edit Proposal" : "New Proposal"}
              </h1>
              <p className="text-gray-500 mt-1">
                Private Aviation Workflow Modernization
              </p>
            </div>
            <div className="text-right">
              {lastSaved && (
                <div className="text-xs text-gray-500 mb-1">
                  <Clock className="h-3 w-3 inline mr-1" /> Saved: {lastSaved}
                </div>
              )}
              {/* Status Logic */}
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  status === "saved"
                    ? "text-green-600"
                    : status === "saving"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
              >
                {status === "saved"
                  ? "Saved"
                  : status === "saving"
                  ? "Saving..."
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
          <div className="flex justify-between">
            {steps.map((s) => {
              const isCompleted = currentStep > s.number;
              const isCurrent = currentStep === s.number;
              const hasError = stepErrors[s.number]?.length > 0;

              return (
                <div
                  key={s.number}
                  className="flex flex-col items-center bg-gray-50 px-2"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 relative
                            ${
                              hasError
                                ? "border-red-500 bg-red-50 text-red-600"
                                : isCompleted
                                ? "bg-green-500 border-green-500 text-white"
                                : isCurrent
                                ? "bg-white border-blue-600 text-blue-600 shadow-md"
                                : "bg-white border-gray-300 text-gray-400"
                            }
                            `}
                  >
                    {hasError ? (
                      <XCircle className="w-6 h-6" />
                    ) : isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <s.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium 
                            ${
                              hasError
                                ? "text-red-600"
                                : isCurrent
                                ? "text-blue-700"
                                : "text-gray-500"
                            }
                        `}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 min-h-[400px]">
          {/* Use the specific render functions here as you had them */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-3 rounded-lg border transition-all font-medium
                ${
                  currentStep === 1
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </button>

          <div className="flex gap-4">
            <button
              onClick={saveDraft}
              disabled={status === "saving"}
              className="flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition-all font-medium"
            >
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all font-medium"
              >
                Next Step <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className={`flex items-center px-8 py-3 rounded-lg text-white font-medium shadow-md transition-all
                    ${
                      status === "submitting"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
              >
                {status === "submitting" ? (
                  "Submitting..."
                ) : (
                  <>
                    Submit Proposal <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
