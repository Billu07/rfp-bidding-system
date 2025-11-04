// frontend/src/components/RegisterVendor.tsx
import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { API_BASE } from "../config/api";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Building,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
} from "lucide-react";

// === Zod Schema ===
const schema = z.object({
  vendorName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactTitle: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  country: z.string().optional(),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "500+"])
    .optional()
    .or(z.literal("")),
  services: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Must include uppercase, lowercase, and number"
    ),
});

type FormData = z.infer<typeof schema>;

const steps = [
  { id: "company", label: "Company Info", icon: Building },
  { id: "nda", label: "NDA Upload", icon: Shield },
  { id: "account", label: "Account Setup", icon: Lock },
];

// === Main Component ===
export default function RegisterVendor() {
  const [step, setStep] = useState(0);
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [ndaError, setNdaError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
    trigger,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  // === Navigation & Validation ===
  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (step === 0) {
      fieldsToValidate = [
        "vendorName",
        "contactPerson",
        "email",
        "phone",
        "website",
        "country",
        "companySize",
        "services",
      ];
    } else if (step === 2) {
      fieldsToValidate = ["password"];
    }

    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }

    if (step === 1) {
      if (!ndaFile) {
        setNdaError("Please upload your signed NDA");
        return;
      }
      setNdaError("");
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  // === File Validation ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setNdaFile(null);
      setNdaError("No file selected");
      return;
    }

    if (file.type !== "application/pdf") {
      setNdaError("Only PDF files are allowed");
      setNdaFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setNdaError("File too large (max 10MB)");
      setNdaFile(null);
      return;
    }

    setNdaFile(file);
    setNdaError("");
  };

  const removeFile = () => {
    setNdaFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // === Form Submit ===
  const onSubmit = async (data: FormData) => {
    if (!ndaFile) {
      setNdaError("NDA file is required");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    formData.append("ndaFile", ndaFile);

    try {
      const res = await axios.post(`${API_BASE}/api/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (res.data.success) {
        setShowSuccessModal(true);
        // Reset form on success
        setStep(0);
        setNdaFile(null);
        reset();
      } else {
        setSubmitMessage({
          type: "error",
          text: res.data.message || "Registration failed. Please try again.",
        });
      }
    } catch (err: any) {
      setSubmitMessage({
        type: "error",
        text:
          err.response?.data?.error || "Submission failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // === UI Helpers ===
  const isFieldValid = (name: keyof FormData) =>
    touchedFields[name] && !errors[name];
  const isFieldInvalid = (name: keyof FormData) =>
    touchedFields[name] && errors[name];

  const getStepProgress = () => ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Vendor Registration
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our exclusive network of pre-qualified vendors in three simple
            steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 sm:mb-12">
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
                  <div className="hidden sm:block mt-2">
                    <p className="text-xs text-gray-500 text-center">
                      Step {i + 1} of {steps.length}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700 ease-out"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8">
            {/* Step 1: Company Info */}
            {step === 0 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Company Name *
                    </label>
                    <input
                      {...register("vendorName")}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        isFieldValid("vendorName")
                          ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                          : isFieldInvalid("vendorName")
                          ? "border-red-500 ring-2 ring-red-100 bg-red-50"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                      placeholder="Acme Solutions Inc."
                    />
                    {errors.vendorName && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.vendorName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Contact Person *
                    </label>
                    <input
                      {...register("contactPerson")}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        isFieldValid("contactPerson")
                          ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                          : isFieldInvalid("contactPerson")
                          ? "border-red-500 ring-2 ring-red-100 bg-red-50"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                      placeholder="Jane Doe"
                    />
                    {errors.contactPerson && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.contactPerson.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Job Title
                  </label>
                  <input
                    {...register("contactTitle")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="Procurement Manager"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      isFieldValid("email")
                        ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                        : isFieldInvalid("email")
                        ? "border-red-500 ring-2 ring-red-100 bg-red-50"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                    placeholder="jane@acme.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Phone Number
                    </label>
                    <input
                      {...register("phone")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Website
                    </label>
                    <input
                      {...register("website")}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        isFieldInvalid("website")
                          ? "border-red-500 ring-2 ring-red-100 bg-red-50"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                      placeholder="https://acme.com"
                    />
                    {errors.website && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.website.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Country
                    </label>
                    <input
                      {...register("country")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      placeholder="United States"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Company Size
                    </label>
                    <select
                      {...register("companySize")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">Select company size...</option>
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-500">201-500 Employees</option>
                      <option value="500+">500+ Employees</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Services & Expertise
                  </label>
                  <textarea
                    {...register("services")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                    placeholder="Describe your core services, expertise, and industries you serve..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: NDA Upload */}
            {step === 1 && (
              <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center">
                  <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Non-Disclosure Agreement
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Download our standard NDA template, have it signed by an
                    authorized representative, and upload the executed document
                    below. This ensures the confidentiality of all RFP
                    materials.
                  </p>
                  <a
                    href="/nda-template.pdf"
                    download
                    className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download NDA Template
                  </a>
                </div>

                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-900 text-center">
                    Upload Signed NDA (PDF) *
                  </label>

                  <div
                    className={`border-3 border-dashed rounded-2xl p-8 text-center transition-all ${
                      ndaFile
                        ? "border-green-300 bg-green-50"
                        : ndaError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 hover:border-blue-400 bg-gray-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!ndaFile ? (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            Drop your signed NDA here
                          </p>
                          <p className="text-gray-500 mb-4">
                            PDF format only • Maximum 10MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Choose File
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            File Ready for Upload
                          </p>
                          <p className="text-gray-600 flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4" />
                            {ndaFile.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Remove File
                        </button>
                      </div>
                    )}
                  </div>

                  {ndaError && (
                    <p className="text-red-600 flex items-center justify-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {ndaError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Account Setup */}
            {step === 2 && (
              <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Create Your Account
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Set up your password to access the vendor portal
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        isFieldValid("password")
                          ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                          : isFieldInvalid("password")
                          ? "border-red-500 ring-2 ring-red-100 bg-red-50"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password.message}
                    </p>
                  )}

                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-gray-700">
                      Password Requirements:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            watch("password")?.length >= 8
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        At least 8 characters
                      </li>
                      <li className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            /[A-Z]/.test(watch("password") || "")
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        One uppercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            /[a-z]/.test(watch("password") || "")
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        One lowercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            /\d/.test(watch("password") || "")
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        One number
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
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
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Error Message Display */}
        {submitMessage && submitMessage.type === "error" && (
          <div className="mt-8 p-6 rounded-2xl border-2 text-center font-semibold animate-fadeIn bg-red-50 text-red-800 border-red-200">
            <div className="flex items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <p className="text-lg">{submitMessage.text}</p>
            </div>
          </div>
        )}

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform animate-scaleIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Registration Submitted!
                </h3>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Thank You for Registering!
                </h4>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Your vendor registration has been submitted successfully and
                  is now pending admin approval. You will receive an email
                  notification once your account has been reviewed and
                  activated.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                  <h5 className="font-semibold text-blue-900 mb-2">
                    What happens next?
                  </h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Admin reviews your registration (1-2 business days)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      You'll receive approval email with login instructions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Access active RFPs and submit proposals
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <Link
                to="/"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-center"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
