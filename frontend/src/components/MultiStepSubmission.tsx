// src/components/MultiStepSubmission.tsx - WITH AIRTABLE DRAFT
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Eye,
  Edit,
  Clock,
  AlertCircle,
} from "lucide-react";

interface SubmissionData {
  id?: string;
  status?: "draft" | "submitted" | "pending" | "approved" | "rejected";
  lastSaved?: string;
  submissionDate?: string;

  // Step 1: Company Information
  companyName: string;
  website: string;
  contactPerson: string;
  email: string;
  phone: string;
  companyDescription: string;

  // Step 2: Solution Fit
  clientWorkflowDescription: string;
  requestCaptureDescription: string;
  internalWorkflowDescription: string;
  reportingCapabilities: string;
  dataArchitecture: string;
  step2Questions: string;

  // Step 3: Technical Capabilities
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

  // Step 4: Implementation & Pricing
  implementationTimeline: string;
  projectStartDate: string;
  implementationPhases: string;
  upfrontCost: string;
  monthlyCost: string;
  pricingDocument: File | null;
  pricingDocumentUrl?: string;
  step4Questions: string;

  // Step 5: References & Fit
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
}

export default function MultiStepSubmission() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isEditing, setIsEditing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState<SubmissionData>({
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
  });

  // Get vendor data from localStorage
  const vendor: Vendor = JSON.parse(localStorage.getItem("vendor") || "{}");

  const steps = [
    { number: 1, title: "Company Info", icon: Building },
    { number: 2, title: "Solution Fit", icon: Workflow },
    { number: 3, title: "Technical Capabilities", icon: Cpu },
    { number: 4, title: "Implementation & Pricing", icon: Calendar },
    { number: 5, title: "References & Fit", icon: Users },
  ];

  // Replace your current useEffect with this optimized version
  useEffect(() => {
    if (currentStep > 1 && hasUnsavedChanges) {
      const autoSave = setTimeout(() => {
        // Only auto-save if we have meaningful data
        const hasData = Object.values(formData).some((value) => {
          if (typeof value === "string") return value.trim().length > 0;
          if (typeof value === "object" && value !== null) {
            return Object.values(value).some((subValue) =>
              typeof subValue === "string"
                ? subValue.trim().length > 0
                : subValue
            );
          }
          return false;
        });

        if (hasData) {
          saveDraft();
        }
      }, 2000); // Increased to 2 seconds to reduce API calls

      return () => clearTimeout(autoSave);
    }
  }, [formData, currentStep, hasUnsavedChanges]);

  // Load draft or existing submission on component mount
  useEffect(() => {
    const loadData = async () => {
      if (submissionId) {
        // Editing existing submission
        await loadExistingSubmission();
      } else {
        // Check for draft
        await loadDraft();
      }
    };

    loadData();
  }, [submissionId]);

  const loadExistingSubmission = async () => {
    setIsEditing(true);
    try {
      const response = await fetch(`/api/vendor/submissions/${submissionId}`, {
        headers: {
          "X-Vendor-Data": JSON.stringify(vendor),
        },
      });

      if (response.ok) {
        const existingData = await response.json();
        setFormData(existingData);
      }
    } catch (error) {
      console.error("Failed to load submission:", error);
    }
  };

  const loadDraft = async () => {
    try {
      const vendorData = localStorage.getItem("vendor");
      if (!vendorData) {
        console.log("❌ No vendor data found");
        return;
      }

      const vendor = JSON.parse(vendorData);
      console.log("👤 Loading draft for vendor:", vendor.id);

      console.log("🌐 Making API call to /api/load-draft...");
      const response = await fetch("/api/load-draft", {
        headers: {
          "X-Vendor-Data": JSON.stringify({ id: vendor.id }),
        },
      });

      console.log("📡 Load API Response status:", response.status);
      console.log("📡 Load API Response ok:", response.ok);

      const result = await response.json();
      console.log("✅ Load draft API response:", result);

      if (result.success && result.draft) {
        console.log("🎉 Draft found! Data:", result.draft);
        setFormData(result.draft);
        setLastSaved(new Date(result.lastSaved).toLocaleString());
        setHasUnsavedChanges(false);
        console.log("🚀 Draft loaded successfully into form state");
      } else {
        console.log(
          "❌ No draft found. Success:",
          result.success,
          "Draft exists:",
          !!result.draft
        );
      }
    } catch (error) {
      console.error("💥 Failed to load draft:", error);
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleIntegrationScoreChange = useCallback(
    (integration: string, score: string) => {
      setFormData((prev) => ({
        ...prev,
        integrationScores: {
          ...prev.integrationScores,
          [integration]: score,
        },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  /// Save draft to Airtable - FIXED VERSION
  const saveDraft = async () => {
    setSaveStatus("saving");

    try {
      const vendorData = localStorage.getItem("vendor");
      if (!vendorData) {
        console.error("No vendor data found for draft saving");
        setSaveStatus("error");
        return;
      }

      const vendor = JSON.parse(vendorData);
      console.log("Saving draft for vendor:", vendor.id);

      const draftData = {
        ...formData,
        lastSaved: new Date().toISOString(),
        status: "draft" as const,
      };

      console.log("Draft data being saved:", draftData);

      const response = await fetch("/api/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vendor-Data": JSON.stringify({ id: vendor.id }),
        },
        body: JSON.stringify(draftData),
      });

      const result = await response.json();
      console.log("Save draft API response:", result);

      if (result.success) {
        setSaveStatus("saved");
        setLastSaved(new Date().toLocaleString());
        setHasUnsavedChanges(false);
        console.log("Draft saved successfully with ID:", result.draftId);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error(result.error || "Failed to save draft");
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissionData = {
        ...formData,
        status: "submitted",
        submissionDate: new Date().toISOString(),
      };

      const url =
        isEditing && submissionId
          ? `/api/update-submission/${submissionId}`
          : "/api/submit-proposal";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vendor-Data": JSON.stringify(vendor),
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (result.success) {
        // Delete draft after successful submission
        await fetch("/api/delete-draft", {
          method: "DELETE",
          headers: {
            "X-Vendor-Data": JSON.stringify(vendor),
          },
        });

        navigate("/submissions", {
          state: {
            message: isEditing
              ? "Submission updated successfully!"
              : "Detailed submission completed successfully!",
            submissionId: result.submissionId,
          },
        });
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (hasUnsavedChanges) {
      saveDraft(); // Save before moving to next step
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (hasUnsavedChanges) {
      saveDraft(); // Save before moving to previous step
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const requiredFields = [
      formData.companyName,
      formData.contactPerson,
      formData.email,
      formData.companyDescription,
      formData.clientWorkflowDescription,
      formData.requestCaptureDescription,
      formData.internalWorkflowDescription,
      formData.reportingCapabilities,
      formData.dataArchitecture,
      formData.securityMeasures,
      formData.implementationTimeline,
      formData.projectStartDate,
      formData.implementationPhases,
      formData.solutionFit,
      formData.infoAccurate,
      formData.contactConsent,
    ];

    const filledFields = requiredFields.filter((field) => {
      if (typeof field === "string") return field.trim() !== "";
      if (typeof field === "boolean") return field;
      return false;
    }).length;

    return Math.round((filledFields / requiredFields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  // [Keep all your existing renderStep functions - they remain exactly the same]
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Company Information
          </h3>
          <p className="text-gray-600">
            Tell us about your company and primary contact.
          </p>
        </div>
        {isEditing && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Edit className="w-4 h-4 mr-1" />
            Editing Mode
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleInputChange("companyName", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Person Name *
          </label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => handleInputChange("contactPerson", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Short Company Description (500 characters max) *
        </label>
        <textarea
          value={formData.companyDescription}
          onChange={(e) =>
            handleInputChange("companyDescription", e.target.value)
          }
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <div className="text-sm text-gray-500 mt-1">
          {formData.companyDescription.length}/500 characters
        </div>
      </div>
    </div>
  );

  // Step 2: Solution Fit & Use Cases
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

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe how a current customer is using your{" "}
            <strong>client-facing workflow</strong> to receive and book flight
            requests (max 500 words) *
          </label>
          <textarea
            value={formData.clientWorkflowDescription}
            onChange={(e) =>
              handleInputChange("clientWorkflowDescription", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the client-facing workflow including request capture, booking process, and user experience..."
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
            placeholder="Explain your request capture mechanism, routing logic, and automation..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe how a current customer is using your{" "}
            <strong>internal workflow</strong> to manage multiple flight
            requests, source aircraft, and communicate with operators (max 500
            words) *
          </label>
          <textarea
            value={formData.internalWorkflowDescription}
            onChange={(e) =>
              handleInputChange("internalWorkflowDescription", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe internal processes for flight management, operator communication, and workflow coordination..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What reporting capabilities exist for tracking client requests,
            conversions, operator pricing, client feedback on a tail or operator
            basis? *
          </label>
          <textarea
            value={formData.reportingCapabilities}
            onChange={(e) =>
              handleInputChange("reportingCapabilities", e.target.value)
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detail your analytics, reporting features, and data visualization capabilities..."
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
            placeholder="Explain your data architecture, integration patterns, API strategies, and data flow..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Any questions or clarification requests regarding this section?
          </label>
          <textarea
            value={formData.step2Questions}
            onChange={(e) =>
              handleInputChange("step2Questions", e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter any questions you have about solution requirements..."
          />
        </div>
      </div>
    </div>
  );
  // Step 3: Technical Capabilities & Compliance
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

      {/* Integration Capabilities Matrix */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Integration Capabilities
        </h4>
        <p className="text-sm text-gray-600 mb-6">
          For each item below, select one of three options:
        </p>

        <div className="space-y-4">
          {[
            { key: "zendesk", label: "Zendesk" },
            { key: "oracleSql", label: "Oracle SQL" },
            { key: "quickbooks", label: "QuickBooks" },
            { key: "slack", label: "Slack" },
            { key: "brex", label: "Brex" },
            { key: "avinode", label: "Avinode" },
          ].map((integration) => (
            <div
              key={integration.key}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <span className="font-medium text-gray-900">
                {integration.label}
              </span>
              <div className="flex gap-4">
                {[
                  {
                    value: "can-integrate",
                    label: "✅ Can integrate and have done previously",
                    color: "text-green-600",
                  },
                  {
                    value: "can-integrate-not-done",
                    label: "⚙️ Can integrate but have not done previously",
                    color: "text-yellow-600",
                  },
                  {
                    value: "cannot-integrate",
                    label: "❌ Cannot integrate",
                    color: "text-red-600",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={integration.key}
                      value={option.value}
                      checked={
                        formData.integrationScores[
                          integration.key as keyof typeof formData.integrationScores
                        ] === option.value
                      }
                      onChange={(e) =>
                        handleIntegrationScoreChange(
                          integration.key,
                          e.target.value
                        )
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${option.color}`}>
                      {option.label.split(" ")[0]}
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
            placeholder="Detail your security protocols, encryption, access controls, and compliance frameworks..."
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
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
            placeholder="Enter any questions about technical requirements or compliance..."
          />
        </div>
      </div>
    </div>
  );
  // Step 4: Implementation & Pricing
  const renderStep4 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Implementation & Pricing
        </h3>
        <p className="text-gray-600">
          Outline your implementation approach and cost structure.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What is your typical implementation timeline (weeks)? *
          </label>
          <input
            type="text"
            value={formData.implementationTimeline}
            onChange={(e) =>
              handleInputChange("implementationTimeline", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 12-16 weeks"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            When would you be able to start this project? *
          </label>
          <input
            type="date"
            value={formData.projectStartDate}
            onChange={(e) =>
              handleInputChange("projectStartDate", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Implementation Phases (short description) *
        </label>
        <textarea
          value={formData.implementationPhases}
          onChange={(e) =>
            handleInputChange("implementationPhases", e.target.value)
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe the key phases of your implementation process: discovery, configuration, testing, deployment, training..."
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Please outline your costs for upfront or Implementation/Training
            Cost ($)
          </label>
          <input
            type="number"
            value={formData.upfrontCost}
            onChange={(e) => handleInputChange("upfrontCost", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Please outline your monthly License/Maintenance/Support costs ($)
          </label>
          <input
            type="number"
            value={formData.monthlyCost}
            onChange={(e) => handleInputChange("monthlyCost", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload an optional detailed pricing document
        </label>
        <input
          type="file"
          onChange={(e) =>
            handleInputChange("pricingDocument", e.target.files?.[0] || null)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          accept=".pdf,.doc,.docx,.xlsx,.xls"
        />
        <p className="text-sm text-gray-500 mt-1">
          PDF, Word, or Excel documents accepted. Maximum 10MB.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Any questions or clarification requests regarding this section?
        </label>
        <textarea
          value={formData.step4Questions}
          onChange={(e) => handleInputChange("step4Questions", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter any questions about implementation timelines, pricing, or deliverables..."
        />
      </div>
    </div>
  );
  // Step 5: References & Fit
  const renderStep5 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          References & Fit
        </h3>
        <p className="text-gray-600">
          Provide references and explain why your solution is the right fit.
        </p>
      </div>

      <div className="space-y-6">
        {/* Reference 1 */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">
            Reference #1
          </h4>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.reference1.name}
                onChange={(e) =>
                  handleInputChange("reference1", {
                    ...formData.reference1,
                    name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Reference contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.reference1.company}
                onChange={(e) =>
                  handleInputChange("reference1", {
                    ...formData.reference1,
                    company: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.reference1.email}
                onChange={(e) =>
                  handleInputChange("reference1", {
                    ...formData.reference1,
                    email: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@company.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you think this is a good reference?
            </label>
            <textarea
              value={formData.reference1.reason}
              onChange={(e) =>
                handleInputChange("reference1", {
                  ...formData.reference1,
                  reason: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why this reference is relevant to our aviation workflow needs..."
            />
          </div>
        </div>

        {/* Reference 2 */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">
            Reference #2
          </h4>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.reference2.name}
                onChange={(e) =>
                  handleInputChange("reference2", {
                    ...formData.reference2,
                    name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Reference contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.reference2.company}
                onChange={(e) =>
                  handleInputChange("reference2", {
                    ...formData.reference2,
                    company: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.reference2.email}
                onChange={(e) =>
                  handleInputChange("reference2", {
                    ...formData.reference2,
                    email: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@company.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you think this is a good reference?
            </label>
            <textarea
              value={formData.reference2.reason}
              onChange={(e) =>
                handleInputChange("reference2", {
                  ...formData.reference2,
                  reason: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why this reference is relevant to our aviation workflow needs..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why do you believe your solution is a good fit for this project? *
          </label>
          <textarea
            value={formData.solutionFit}
            onChange={(e) => handleInputChange("solutionFit", e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Explain how your solution addresses our specific aviation workflow challenges, integration needs, and business objectives..."
            required
          />
        </div>

        {/* Final Checkboxes */}
        <div className="space-y-4 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.infoAccurate}
              onChange={(e) =>
                handleInputChange("infoAccurate", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-1 flex-shrink-0"
              required
            />
            <span className="text-sm text-gray-700">
              <strong>
                I confirm the information provided is accurate and complete *
              </strong>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.contactConsent}
              onChange={(e) =>
                handleInputChange("contactConsent", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-1 flex-shrink-0"
              required
            />
            <span className="text-sm text-gray-700">
              <strong>
                I consent to being contacted regarding this submission *
              </strong>
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing
                  ? "Edit Submission"
                  : "Private Aviation RFP Submission"}
              </h1>
              <p className="text-gray-600 mt-2">
                Complete all 5 steps to submit your proposal
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {lastSaved && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Last saved: {lastSaved}
                  </div>
                )}
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {completionPercentage}% Complete
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Status Alert */}
        {saveStatus === "saved" && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Draft saved successfully to cloud storage
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle className="h-4 w-4 mr-2" />
            Failed to save draft. Please try again.
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2
                      ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "border-blue-600 bg-white text-blue-600"
                          : "border-gray-300 bg-white text-gray-400"
                      }
                    `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`
                      ml-2 text-sm font-medium hidden sm:block
                      ${
                        isCurrent
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-500"
                      }
                    `}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                      flex-1 h-1 mx-4
                      ${isCompleted ? "bg-green-500" : "bg-gray-300"}
                    `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={saveDraft}
              disabled={saveStatus === "saving"}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved!"
                : "Save Draft"}
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.infoAccurate ||
                  !formData.contactConsent
                }
                className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Submitting..."
                  : isEditing
                  ? "Update Submission"
                  : "Submit Proposal"}
                <CheckCircle className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Step {currentStep} of {steps.length}
          {hasUnsavedChanges && (
            <span className="ml-2 text-orange-600">• Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
