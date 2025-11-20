require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const fs = require("fs");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Cloudinary Configuration ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------- Proxy (if needed) ----------
let airtableOptions = { apiKey: process.env.AIRTABLE_API_KEY };
if (process.env.HTTPS_PROXY) {
  const HttpsProxyAgent = require("https-proxy-agent");
  airtableOptions.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
}

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
  requestTimeout: 30000,
  maxRetries: 3,
}).base(process.env.AIRTABLE_BASE_ID);

// ---------- Middleware ----------
app.use(
  cors({
    origin: [
      "https://rfp-frontend-weld.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- File upload (memory storage for Vercel) ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for NDA
  },
});

// ---------- Utility: Upload to Cloudinary ----------
const uploadToCloudinary = (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    const { Readable } = require("stream");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "rfp-nda-documents",
        public_id: fileName, // ✅ KEEP the file extension (.pdf)
        overwrite: false,
        type: "upload",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const stream = Readable.from(fileBuffer);
    stream.pipe(uploadStream);
  });
};

// ---------- Vendor Registration with Cloudinary ----------
app.post("/api/register", upload.single("ndaFile"), async (req, res) => {
  try {
    const {
      vendorName,
      contactPerson,
      contactTitle,
      email,
      phone,
      website,
      country,
      companySize,
      services,
      password,
    } = req.body;
    const ndaFile = req.file;

    if (!vendorName || !contactPerson || !email || !password || !ndaFile) {
      return res
        .status(400)
        .json({ error: "Missing required fields or NDA file" });
    }

    // Validate file type and size
    if (ndaFile.mimetype !== "application/pdf") {
      return res
        .status(400)
        .json({ error: "Only PDF files are allowed for NDA" });
    }

    if (ndaFile.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "NDA file too large (max 10MB)" });
    }

    // ✅ CHECK FOR EXISTING VENDOR WITH SAME EMAIL
    console.log("🔍 Checking for existing vendor with email:", email);
    const existingVendors = await base("Vendors")
      .select({
        filterByFormula: `{Email} = '${email}'`,
        fields: ["Email", "Status", "Vendor Name"],
      })
      .all();

    if (existingVendors.length > 0) {
      console.log(
        "❌ Duplicate email found:",
        existingVendors.length,
        "existing vendors"
      );

      // Check if any existing vendor is approved or pending
      const approvedVendor = existingVendors.find(
        (v) => v.fields["Status"] === "Approved"
      );
      const pendingVendor = existingVendors.find(
        (v) => v.fields["Status"] === "Pending Approval"
      );

      if (approvedVendor) {
        return res.status(409).json({
          error:
            "An account with this email already exists and is approved. Please use the login page instead.",
          existingStatus: "approved",
        });
      }

      if (pendingVendor) {
        return res.status(409).json({
          error:
            "An account with this email is already pending approval. Please wait for admin approval or contact support.",
          existingStatus: "pending",
        });
      }

      // If all are declined, still prevent registration to avoid duplicates
      return res.status(409).json({
        error:
          "An account with this email already exists. Please contact support for assistance.",
        existingStatus: "exists",
      });
    }

    console.log("✅ No existing vendor found, proceeding with registration");

    // Upload NDA to Cloudinary as RAW file
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadToCloudinary(
        ndaFile.buffer,
        ndaFile.originalname
      );
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload NDA file" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create vendor record with Cloudinary URL
    const createdRecord = await base("Vendors").create({
      "Vendor Name": vendorName,
      "Contact Person": contactPerson,
      "Contact Title": contactTitle || "",
      Email: email,
      Phone: phone || "",
      Website: website || "",
      Country: country || "",
      "Company Size": companySize || "",
      Services: services || "",
      "Password Hash": passwordHash,
      "NDA on File": true,
      "NDA File Name": ndaFile.originalname,
      "NDA Cloudinary URL": cloudinaryResult.secure_url,
      "NDA Cloudinary Public ID": cloudinaryResult.public_id,
      "NDA View URL": cloudinaryResult.secure_url,
      Status: "Pending Approval",
    });

    console.log("✅ New vendor registered successfully:", createdRecord.id);

    res.json({
      success: true,
      message:
        "Registration submitted! Your NDA is under review. You will be notified once approved.",
      vendorId: createdRecord.id,
      status: "pending_approval",
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific Airtable errors
    if (error.error === "UNKNOWN_FIELD_NAME") {
      return res.status(500).json({
        error: "Database configuration error. Please contact support.",
        details: "Field not found in database",
      });
    }

    res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

// ---------- Vendor Login (Check Approval Status) - DEBUG VERSION ----------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Get ALL vendors with ALL fields for debugging
    const allVendors = await base("Vendors")
      .select({
        fields: [
          "Email",
          "Password Hash",
          "Status",
          "Vendor Name",
          "Contact Person",
          "NDA Cloudinary URL",
        ],
      })
      .all();

    console.log("📊 Total vendors in database:", allVendors.length);

    allVendors.forEach((v, index) => {
      console.log(`Vendor ${index}:`, {
        id: v.id,
        email: v.fields["Email"],
        status: v.fields["Status"],
        name: v.fields["Vendor Name"],
      });
    });

    const vendor = allVendors.find((v) => {
      const dbEmail = v.fields["Email"];
      return (
        typeof dbEmail === "string" &&
        dbEmail.trim().toLowerCase() === email.trim().toLowerCase()
      );
    });

    if (!vendor) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const fields = vendor.fields;
    console.log("✅ Vendor found:", {
      id: vendor.id, // Record ID
      email: fields["Email"],
      status: fields["Status"],
      statusType: typeof fields["Status"],
      name: fields["Vendor Name"],
    });

    if (fields["Status"] === "Pending Approval") {
      return res.status(403).json({
        error:
          "Your account is pending admin approval. We will notify you once approved.",
        status: fields["Status"],
      });
    }

    if (fields["Status"] === "Declined") {
      return res.status(403).json({
        error: "Your registration has been declined. Please contact support.",
        status: fields["Status"],
      });
    }

    if (fields["Status"] !== "Approved") {
      return res.status(403).json({
        error: "Account not approved - Status: " + fields["Status"],
        status: fields["Status"],
      });
    }

    if (!fields["Password Hash"]) {
      return res.status(500).json({ error: "Account corrupted" });
    }

    const isValid = await bcrypt.compare(password, fields["Password Hash"]);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await base("Vendors").update(vendor.id, {
      "Last Login": new Date().toISOString().split("T")[0],
    });

    res.json({
      success: true,
      vendor: {
        id: vendor.id,
        name: fields["Vendor Name"],
        email: fields["Email"],
        contact: fields["Contact Person"],
        ndaUrl: fields["NDA Cloudinary URL"],
      },
    });
  } catch (error) {
    console.error("💥 Login error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ---------- Verify Vendor Middleware ----------
const verifyVendor = (req, res, next) => {
  const vendorData = req.headers["x-vendor-data"];
  if (!vendorData) {
    return res.status(401).json({ error: "Vendor not authenticated" });
  }
  try {
    req.vendor = JSON.parse(vendorData);
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
};
// ---------- Save Draft to Airtable ----------
app.post("/api/save-draft", verifyVendor, async (req, res) => {
  try {
    const draftData = req.body;
    const vendorId = req.vendor.id;
    console.log("💾 Backend: Saving draft for vendor:", vendorId);

    // Get all drafts and filter manually for existing drafts
    const allRecords = await base("Drafts")
      .select({
        maxRecords: 10,
      })
      .all();

    // Manual filter for linked records
    const existingDrafts = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor"];

      // Handle linked record array
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log("📊 Backend: Existing drafts found:", existingDrafts.length);

    let record;

    if (existingDrafts.length > 0) {
      // Update the first existing draft (keep only one draft per vendor)
      record = await base("Drafts").update(existingDrafts[0].id, {
        "Draft Data": JSON.stringify(draftData),
        "Last Saved": new Date().toISOString(),
        Status: "draft",
      });
      console.log("✅ Backend: Updated existing draft:", record.id);
    } else {
      // Create new draft
      record = await base("Drafts").create({
        Vendor: [vendorId],
        "Draft Data": JSON.stringify(draftData),
        "Last Saved": new Date().toISOString(),
        Status: "draft",
      });
      console.log("✅ Backend: Created new draft:", record.id);
    }

    res.json({
      success: true,
      draftId: record.id,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("💥 Draft save error:", error);
    res.status(500).json({
      error: "Failed to save draft",
      details: error.message,
    });
  }
});

// ---------- Load Draft from Airtable ----------
app.get("/api/load-draft", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log("🔍 Backend: Loading draft for vendor:", vendorId);

    // Get all drafts and filter manually (Airtable linked record issue)
    const allRecords = await base("Drafts")
      .select({
        maxRecords: 10,
      })
      .all();

    console.log("📊 Backend: Total drafts in table:", allRecords.length);

    // Manual filter for linked records
    const vendorDrafts = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor"];
      console.log(`📝 Checking draft ${record.id}:`, vendorField);

      // Handle linked record array
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log("✅ Backend: Manual filter found drafts:", vendorDrafts.length);

    if (vendorDrafts.length === 0) {
      console.log("❌ Backend: No draft found for vendor:", vendorId);
      return res.json({ success: true, draft: null });
    }

    // Get the most recent draft
    const latestDraft = vendorDrafts[vendorDrafts.length - 1];
    console.log("🎯 Backend: Using latest draft:", latestDraft.id);

    const draftData = JSON.parse(latestDraft.fields["Draft Data"] || "{}");
    console.log("📝 Backend: Parsed draft data keys:", Object.keys(draftData));

    res.json({
      success: true,
      draft: draftData,
      lastSaved: latestDraft.fields["Last Saved"],
    });
  } catch (error) {
    console.error("💥 Backend: Draft load error:", error);
    res.status(500).json({
      error: "Failed to load draft",
      details: error.message,
    });
  }
});

// ---------- Delete Draft ----------
app.delete("/api/delete-draft", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log("🗑️ Backend: Deleting draft for vendor:", vendorId);

    // Get all drafts and filter manually (same issue as load-draft)
    const allRecords = await base("Drafts")
      .select({
        maxRecords: 10,
      })
      .all();

    console.log("📊 Backend: Total drafts in table:", allRecords.length);

    // Manual filter for linked records
    const vendorDrafts = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor"];

      // Handle linked record array
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log(
      "✅ Backend: Found vendor drafts to delete:",
      vendorDrafts.length
    );

    if (vendorDrafts.length === 0) {
      console.log(
        "❌ Backend: No drafts found to delete for vendor:",
        vendorId
      );
      return res.json({ success: true, message: "No drafts to delete" });
    }

    // Delete all drafts for this vendor
    const deletePromises = vendorDrafts.map((draft) =>
      base("Drafts").destroy(draft.id)
    );

    await Promise.all(deletePromises);

    console.log(
      "🎯 Backend: Successfully deleted",
      vendorDrafts.length,
      "drafts"
    );

    res.json({
      success: true,
      message: `Deleted ${vendorDrafts.length} draft(s)`,
    });
  } catch (error) {
    console.error("💥 Draft delete error:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

// Add to backend - Clean up drafts older than 30 days
app.delete("/api/cleanup-old-drafts", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldDrafts = await base("Drafts")
      .select({
        filterByFormula: `DATETIME_DIFF(NOW(), {Last Saved}, 'days') > 30`,
      })
      .all();

    // Delete old drafts
    const deletePromises = oldDrafts.map((draft) =>
      base("Drafts").destroy(draft.id)
    );

    await Promise.all(deletePromises);

    res.json({
      success: true,
      deleted: oldDrafts.length,
      message: `Cleaned up ${oldDrafts.length} old drafts`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

// ---------- Submit Aviation RFP Proposal ----------
app.post("/api/submit-proposal", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // Get vendor data first
    const vendorRecord = await base("Vendors").find(vendorId);
    const vendorFields = vendorRecord.fields;

    const {
      // Keep only submission-specific fields
      clientWorkflowDescription,
      requestCaptureDescription,
      internalWorkflowDescription,
      reportingCapabilities,
      dataArchitecture,
      step2Questions,
      integrationScores,
      securityMeasures,
      pciCompliant,
      piiCompliant,
      step3Questions,
      implementationTimeline,
      projectStartDate,
      implementationPhases,
      upfrontCost,
      monthlyCost,
      step4Questions,
      reference1,
      reference2,
      solutionFit,
      infoAccurate,
      contactConsent,
    } = req.body;

    // Validate required fields (excluding company info since it comes from vendor)
    if (
      !clientWorkflowDescription ||
      !requestCaptureDescription ||
      !internalWorkflowDescription
    ) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    // Verify vendor exists and is approved
    if (vendorFields["Status"] !== "Approved") {
      return res.status(403).json({ error: "Vendor account not approved" });
    }

    // Create submission record with vendor data
    const submissionData = {
      "Vendor ID": [vendorId],
      "Company Name": vendorFields["Vendor Name"] || "",
      Website: vendorFields["Website"] || "",
      "Contact Person": vendorFields["Contact Person"] || "",
      Email: vendorFields["Email"] || "",
      Phone: vendorFields["Phone"] || "",
      "Company Description": vendorFields["Services"] || "",

      // Step 2 Data
      "Client Workflow Description": clientWorkflowDescription,
      "Request Capture Description": requestCaptureDescription,
      "Internal Workflow Description": internalWorkflowDescription,
      "Reporting Capabilities": reportingCapabilities,
      "Data Architecture": dataArchitecture,
      "Step 2 Questions": step2Questions,

      // Step 3 Data
      "Integration Scores": JSON.stringify(integrationScores),
      "Security Measures": securityMeasures,
      "PCI Compliant": pciCompliant,
      "PII Compliant": piiCompliant,
      "Step 3 Questions": step3Questions,

      // Step 4 Data
      "Implementation Timeline": implementationTimeline,
      "Project Start Date": projectStartDate,
      "Implementation Phases": implementationPhases,
      "Upfront Cost": upfrontCost ? parseFloat(upfrontCost) : 0,
      "Monthly Cost": monthlyCost || "",
      "Step 4 Questions": step4Questions,

      // Step 5 Data
      "Reference 1": JSON.stringify(reference1),
      "Reference 2": JSON.stringify(reference2),
      "Solution Fit": solutionFit,
      "Info Accurate": infoAccurate,
      "Contact Consent": contactConsent,

      "Review Status": "Pending",
      "Submission Date": new Date().toISOString(),
      "RFP Type": "Private Aviation Workflow Modernization",
    };

    const createdRecord = await base("Submissions").create(submissionData);

    res.json({
      success: true,
      message: "Aviation RFP submission completed successfully!",
      submissionId: createdRecord.id,
    });
  } catch (error) {
    console.error("Aviation RFP submission error:", error);
    res.status(500).json({
      error: "Submission failed",
      details: error.message,
    });
  }
});

// Add to backend/index.js - Debug endpoint
app.get("/api/debug/vendor-submissions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log("🔍 DEBUG: Checking submissions for vendor:", vendorId);

    // Get all submissions
    const records = await base("Submissions")
      .select({
        fields: [
          "id",
          "Vendor",
          "Company Name",
          "Contact Person",
          "Review Status",
          "Submission Date",
        ],
      })
      .all();

    console.log("📊 Total submissions in database:", records.length);

    // Find submissions for this vendor
    const vendorSubmissions = records.filter((record) => {
      const vendorField = record.fields["Vendor"];
      console.log(`Checking submission ${record.id}:`, vendorField);

      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        console.log(
          `  Linked vendor ID: ${linkedVendorId}, Current vendor ID: ${vendorId}`
        );
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log("✅ Found submissions for vendor:", vendorSubmissions.length);

    res.json({
      vendorId,
      totalSubmissions: records.length,
      vendorSubmissionsCount: vendorSubmissions.length,
      vendorSubmissions: vendorSubmissions.map((s) => ({
        id: s.id,
        companyName: s.fields["Company Name"],
        status: s.fields["Review Status"],
        submittedAt: s.fields["Submission Date"],
        vendorField: s.fields["Vendor"],
      })),
      allSubmissions: records.map((r) => ({
        id: r.id,
        companyName: r.fields["Company Name"],
        vendorField: r.fields["Vendor"],
      })),
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// ---------- Get Vendor's Aviation RFP Submissions ----------
app.get("/api/vendor/submissions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log("🔍 Getting submissions for vendor:", vendorId);

    // Get all submissions and filter manually (more reliable)
    const allRecords = await base("Submissions")
      .select({
        fields: [
          "Vendor ID", // Changed from "Vendor" to "Vendor ID"
          "Company Name",
          "Contact Person",
          "Email",
          "Review Status",
          "Submission Date",
          "Implementation Timeline",
          "Upfront Cost",
          "Monthly Cost",
          "RFP Type",
        ],
        sort: [{ field: "Submission Date", direction: "desc" }],
      })
      .all();

    console.log("📊 Total submissions found:", allRecords.length);

    // Manual filter for vendor submissions
    const vendorSubmissions = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor ID"]; // Changed to "Vendor ID"

      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        console.log(
          `  Submission ${record.id} linked to vendor: ${linkedVendorId}`
        );
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log(
      "✅ Vendor submissions after filter:",
      vendorSubmissions.length
    );

    const submissions = vendorSubmissions.map((record) => {
      const fields = record.fields;
      return {
        id: record.id,
        rfpName: fields["RFP Type"] || "Private Aviation RFP",
        companyName: fields["Company Name"],
        contactPerson: fields["Contact Person"],
        email: fields["Email"],
        status: fields["Review Status"] || "Pending",
        submittedAt: fields["Submission Date"] || record._rawJson.createdTime,
        implementationTimeline: fields["Implementation Timeline"],
        upfrontCost: fields["Upfront Cost"],
        monthlyCost: fields["Monthly Cost"],
      };
    });

    res.json({
      success: true,
      submissions: submissions,
      debug: {
        totalRecords: allRecords.length,
        vendorSubmissions: vendorSubmissions.length,
        vendorId: vendorId,
      },
    });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// ---------- Get Single Submission for Editing ----------
app.get("/api/vendor/submissions/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const vendorId = req.vendor.id;

    console.log(
      "🔍 Getting submission:",
      submissionId,
      "for vendor:",
      vendorId
    );

    // Get the specific submission
    const record = await base("Submissions").find(submissionId);
    const fields = record.fields;

    // ✅ FIX: Use consistent field name - change "Vendor" to "Vendor ID"
    const submissionVendorId = Array.isArray(fields["Vendor ID"])
      ? typeof fields["Vendor ID"][0] === "string"
        ? fields["Vendor ID"][0]
        : fields["Vendor ID"][0]?.id
      : null;

    console.log(
      "📊 Submission vendor ID:",
      submissionVendorId,
      "Current vendor ID:",
      vendorId
    );

    if (submissionVendorId !== vendorId) {
      return res.status(403).json({
        error: "Access denied - submission does not belong to this vendor",
      });
    }

    // Parse JSON fields back to objects with proper error handling
    let integrationScores;
    try {
      integrationScores = fields["Integration Scores"]
        ? JSON.parse(fields["Integration Scores"])
        : {
            zendesk: "",
            oracleSql: "",
            quickbooks: "",
            slack: "",
            brex: "",
            avinode: "",
          };
    } catch (parseError) {
      console.error("Error parsing integration scores:", parseError);
      integrationScores = {
        zendesk: "",
        oracleSql: "",
        quickbooks: "",
        slack: "",
        brex: "",
        avinode: "",
      };
    }

    let reference1, reference2;
    try {
      reference1 = fields["Reference 1"]
        ? JSON.parse(fields["Reference 1"])
        : { name: "", company: "", email: "", reason: "" };
    } catch (error) {
      reference1 = { name: "", company: "", email: "", reason: "" };
    }

    try {
      reference2 = fields["Reference 2"]
        ? JSON.parse(fields["Reference 2"])
        : { name: "", company: "", email: "", reason: "" };
    } catch (error) {
      reference2 = { name: "", company: "", email: "", reason: "" };
    }

    const submissionData = {
      id: record.id,
      companyName: fields["Company Name"] || "",
      website: fields["Website"] || "",
      contactPerson: fields["Contact Person"] || "",
      email: fields["Email"] || "",
      phone: fields["Phone"] || "",
      companyDescription: fields["Company Description"] || "",

      // Step 2 Data
      clientWorkflowDescription: fields["Client Workflow Description"] || "",
      requestCaptureDescription: fields["Request Capture Description"] || "",
      internalWorkflowDescription:
        fields["Internal Workflow Description"] || "",
      reportingCapabilities: fields["Reporting Capabilities"] || "",
      dataArchitecture: fields["Data Architecture"] || "",
      step2Questions: fields["Step 2 Questions"] || "",

      // Step 3 Data
      integrationScores: integrationScores,
      securityMeasures: fields["Security Measures"] || "",
      pciCompliant: Boolean(fields["PCI Compliant"]),
      piiCompliant: Boolean(fields["PII Compliant"]),
      step3Questions: fields["Step 3 Questions"] || "",

      // Step 4 Data
      implementationTimeline: fields["Implementation Timeline"] || "",
      projectStartDate: fields["Project Start Date"] || "",
      implementationPhases: fields["Implementation Phases"] || "",
      upfrontCost: fields["Upfront Cost"]
        ? fields["Upfront Cost"].toString()
        : "",
      monthlyCost: fields["Monthly Cost"]
        ? fields["Monthly Cost"].toString()
        : "",
      step4Questions: fields["Step 4 Questions"] || "",

      // Step 5 Data
      reference1: reference1,
      reference2: reference2,
      solutionFit: fields["Solution Fit"] || "",
      infoAccurate: Boolean(fields["Info Accurate"]),
      contactConsent: Boolean(fields["Contact Consent"]),

      status: fields["Review Status"] || "Pending",
      submittedAt: fields["Submission Date"] || record._rawJson.createdTime,
    };

    console.log("✅ Successfully loaded submission:", submissionId);

    res.json({
      success: true,
      submission: submissionData,
    });
  } catch (error) {
    console.error("💥 Fetch submission error:", error);

    // Handle specific errors with proper JSON responses
    if (error.message?.includes("Could not find record")) {
      return res.status(404).json({
        error: "Submission not found",
        details: "The requested submission does not exist",
      });
    }

    if (error.message?.includes("Authentication")) {
      return res.status(401).json({
        error: "Authentication failed",
        details: "Please log in again",
      });
    }

    res.status(500).json({
      error: "Failed to load submission",
      details: error.message,
    });
  }
});

// Update Vendor Submission
app.post("/api/update-submission/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const vendorId = req.vendor.id;

    const vendorRecord = await base("Vendors").find(vendorId);
    const vendorFields = vendorRecord.fields;

    const {
      clientWorkflowDescription,
      requestCaptureDescription,
      internalWorkflowDescription,
      reportingCapabilities,
      dataArchitecture,
      step2Questions,
      integrationScores,
      securityMeasures,
      pciCompliant,
      piiCompliant,
      step3Questions,
      implementationTimeline,
      projectStartDate,
      implementationPhases,
      upfrontCost,
      monthlyCost,
      step4Questions,
      reference1,
      reference2,
      solutionFit,
      infoAccurate,
      contactConsent,
    } = req.body;

    // Verify the submission exists and belongs to the vendor
    const existingRecord = await base("Submissions").find(submissionId);
    const existingVendorId = Array.isArray(existingRecord.fields["Vendor ID"])
      ? typeof existingRecord.fields["Vendor ID"][0] === "string"
        ? existingRecord.fields["Vendor ID"][0]
        : existingRecord.fields["Vendor ID"][0]?.id
      : null;

    if (existingVendorId !== vendorId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update submission record with vendor data
    const updateData = {
      "Company Name": vendorFields["Vendor Name"] || "",
      Website: vendorFields["Website"] || "",
      "Contact Person": vendorFields["Contact Person"] || "",
      Email: vendorFields["Email"] || "",
      Phone: vendorFields["Phone"] || "",
      "Company Description": vendorFields["Services"] || "",

      // Step 2 Data
      "Client Workflow Description": clientWorkflowDescription,
      "Request Capture Description": requestCaptureDescription,
      "Internal Workflow Description": internalWorkflowDescription,
      "Reporting Capabilities": reportingCapabilities,
      "Data Architecture": dataArchitecture,
      "Step 2 Questions": step2Questions,

      // Step 3 Data
      "Integration Scores": JSON.stringify(integrationScores),
      "Security Measures": securityMeasures,
      "PCI Compliant": pciCompliant,
      "PII Compliant": piiCompliant,
      "Step 3 Questions": step3Questions,

      // Step 4 Data
      "Implementation Timeline": implementationTimeline,
      "Project Start Date": projectStartDate,
      "Implementation Phases": implementationPhases,
      "Upfront Cost": upfrontCost ? parseFloat(upfrontCost) : 0,
      "Monthly Cost": monthlyCost || "",
      "Step 4 Questions": step4Questions,

      // Step 5 Data
      "Reference 1": JSON.stringify(reference1),
      "Reference 2": JSON.stringify(reference2),
      "Solution Fit": solutionFit,
      "Info Accurate": infoAccurate,
      "Contact Consent": contactConsent,

      "Review Status": "Pending", // Reset status since it's been updated
      "Last Updated": new Date().toISOString(),
    };

    await base("Submissions").update(submissionId, updateData);

    res.json({
      success: true,
      message: "Submission updated successfully!",
      submissionId: submissionId,
    });
  } catch (error) {
    console.error("Update submission error:", error);

    if (error.message?.includes("Could not find record")) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.status(500).json({
      error: "Update failed",
      details: error.message,
    });
  }
});
// Add to backend/index.js - Debug endpoint for submission data
app.get("/api/debug/submission/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    console.log("🔍 DEBUG: Checking submission:", submissionId);

    const record = await base("Submissions").find(submissionId);
    console.log("📊 Submission record found:", {
      id: record.id,
      fields: record.fields,
      vendorField: record.fields["Vendor ID"], // Check the actual field name
      companyName: record.fields["Company Name"],
    });

    res.json({
      success: true,
      record: {
        id: record.id,
        fields: record.fields,
      },
    });
  } catch (error) {
    console.error("Debug submission error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// ---------- ADMIN ROUTES ----------
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  res.json({
    success: true,
    admin: { email },
  });
});

// ---------- Admin Pending Vendors ----------
app.get("/api/admin/pending-vendors", async (req, res) => {
  try {
    const records = await base("Vendors")
      .select({
        filterByFormula: `{Status} = "Pending Approval"`,
        fields: [
          "Vendor Name",
          "Email",
          "Contact Person",
          "Company Size",
          "NDA File Name",
          "NDA Cloudinary URL",
          "NDA Cloudinary Public ID",
          "NDA View URL",
          "Status",
        ],
      })
      .all();

    res.json({
      vendors: records.map((r) => ({
        id: r.id,
        ...r.fields,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// ---------- Admin: Clean Up Duplicate Vendors ----------
app.get("/api/admin/duplicate-vendors", async (req, res) => {
  try {
    const allVendors = await base("Vendors")
      .select({
        fields: ["Email", "Status", "Vendor Name", "Created"],
      })
      .all();

    // Group vendors by email
    const emailGroups = {};
    allVendors.forEach((vendor) => {
      const email = vendor.fields["Email"];
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push({
        id: vendor.id,
        email: email,
        status: vendor.fields["Status"],
        name: vendor.fields["Vendor Name"],
        created: vendor.fields["Created"] || vendor._rawJson.createdTime,
      });
    });

    // Find duplicates (emails with more than 1 vendor)
    const duplicates = {};
    Object.keys(emailGroups).forEach((email) => {
      if (emailGroups[email].length > 1) {
        duplicates[email] = emailGroups[email];
      }
    });

    res.json({
      success: true,
      totalVendors: allVendors.length,
      duplicateCount: Object.keys(duplicates).length,
      duplicates: duplicates,
    });
  } catch (error) {
    console.error("Duplicate vendors check error:", error);
    res.status(500).json({ error: "Failed to check duplicates" });
  }
});

// ---------- Get Vendor Questions & Answers ----------
app.get("/api/vendor/questions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    console.log("🔍 Getting questions for vendor:", vendorId);

    // Get ALL submissions and filter manually
    const allRecords = await base("Submissions")
      .select({
        fields: [
          "Vendor ID",
          "Company Name",
          "Submission Date",
          "Step 2 Questions",
          "Step 3 Questions",
          "Step 4 Questions",
          "Step 2 Answers",
          "Step 3 Answers",
          "Step 4 Answers",
          "Questions Last Updated",
          "Vendor Viewed Answers",
        ],
      })
      .all();

    console.log("📊 Total submissions in database:", allRecords.length);

    // CORRECTED: Proper vendor filtering using Vendor ID
    const vendorSubmissions = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor ID"];

      console.log(`Checking submission ${record.id}:`, {
        vendorField: vendorField,
        vendorFieldType: typeof vendorField,
        isArray: Array.isArray(vendorField),
        length: Array.isArray(vendorField) ? vendorField.length : 0,
      });

      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;

        console.log(
          `  Linked vendor: ${linkedVendorId}, Current vendor: ${vendorId}, Match: ${
            linkedVendorId === vendorId
          }`
        );
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log(
      "✅ Vendor submissions after filter:",
      vendorSubmissions.length
    );

    // Transform data into Q&A format
    const questions = [];

    vendorSubmissions.forEach((submission) => {
      const fields = submission.fields;
      const submissionId = submission.id;
      const companyName = fields["Company Name"];
      const submittedAt = fields["Submission Date"];

      console.log(`📝 Processing submission ${submissionId}:`, {
        step2Q: fields["Step 2 Questions"] ? "YES" : "NO",
        step2A: fields["Step 2 Answers"] ? "YES" : "NO",
        step3Q: fields["Step 3 Questions"] ? "YES" : "NO",
        step3A: fields["Step 3 Answers"] ? "YES" : "NO",
        step4Q: fields["Step 4 Questions"] ? "YES" : "NO",
        step4A: fields["Step 4 Answers"] ? "YES" : "NO",
      });

      // Step 2 Questions & Answers
      if (fields["Step 2 Questions"]) {
        questions.push({
          id: `${submissionId}-step2`,
          submissionId,
          companyName,
          submittedAt,
          step: "Solution Fit & Use Cases",
          question: fields["Step 2 Questions"],
          answer: fields["Step 2 Answers"] || null,
          askedAt: submittedAt,
          answeredAt: fields["Step 2 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          hasNewAnswer: Boolean(
            fields["Step 2 Answers"] && !fields["Vendor Viewed Answers"]
          ),
        });
      }

      // Step 3 Questions & Answers
      if (fields["Step 3 Questions"]) {
        questions.push({
          id: `${submissionId}-step3`,
          submissionId,
          companyName,
          submittedAt,
          step: "Technical Capabilities & Compliance",
          question: fields["Step 3 Questions"],
          answer: fields["Step 3 Answers"] || null,
          askedAt: submittedAt,
          answeredAt: fields["Step 3 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          hasNewAnswer: Boolean(
            fields["Step 3 Answers"] && !fields["Vendor Viewed Answers"]
          ),
        });
      }

      // Step 4 Questions & Answers
      if (fields["Step 4 Questions"]) {
        questions.push({
          id: `${submissionId}-step4`,
          submissionId,
          companyName,
          submittedAt,
          step: "Implementation & Pricing",
          question: fields["Step 4 Questions"],
          answer: fields["Step 4 Answers"] || null,
          askedAt: submittedAt,
          answeredAt: fields["Step 4 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          hasNewAnswer: Boolean(
            fields["Step 4 Answers"] && !fields["Vendor Viewed Answers"]
          ),
        });
      }
    });

    // Sort by unanswered first, then date
    questions.sort((a, b) => {
      if (!a.answer && b.answer) return -1;
      if (a.answer && !b.answer) return 1;
      return new Date(b.askedAt) - new Date(a.askedAt);
    });

    const unreadCount = questions.filter((q) => q.hasNewAnswer).length;

    console.log("🎯 Final questions result:", {
      totalQuestions: questions.length,
      unreadCount: unreadCount,
      submissionsChecked: vendorSubmissions.length,
      questionsWithAnswers: questions.filter((q) => q.answer).length,
    });

    res.json({
      success: true,
      questions,
      unreadCount,
    });
  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({ error: "Failed to load questions" });
  }
});
// ---------- Debug Vendor Submissions Field Names ----------
app.get(
  "/api/debug/vendor-submissions-fields",
  verifyVendor,
  async (req, res) => {
    try {
      const vendorId = req.vendor.id;

      console.log("🔍 Debug: Checking submissions for vendor:", vendorId);

      // Get all submissions to see field names
      const allSubmissions = await base("Submissions")
        .select({
          maxRecords: 10,
        })
        .all();

      console.log("📊 Total submissions in database:", allSubmissions.length);

      // Check field names in first submission
      if (allSubmissions.length > 0) {
        const firstSubmission = allSubmissions[0];
        console.log("🔍 First submission ID:", firstSubmission.id);
        console.log(
          "📝 First submission fields:",
          Object.keys(firstSubmission.fields)
        );
        console.log("👤 Vendor field value:", firstSubmission.fields["Vendor"]);
        console.log(
          "👤 Vendor ID field value:",
          firstSubmission.fields["Vendor ID"]
        );
      }

      // Find submissions for this vendor using different field names
      const submissionsWithVendor = allSubmissions.filter((record) => {
        const vendorField = record.fields["Vendor"];
        const vendorIdField = record.fields["Vendor ID"];

        console.log(`Checking submission ${record.id}:`, {
          vendorField,
          vendorIdField,
          vendorFieldType: typeof vendorField,
          vendorIdFieldType: typeof vendorIdField,
        });

        // Check both possible field names
        if (Array.isArray(vendorField) && vendorField.length > 0) {
          const linkedVendorId =
            typeof vendorField[0] === "string"
              ? vendorField[0]
              : vendorField[0]?.id;
          return linkedVendorId === vendorId;
        }

        if (Array.isArray(vendorIdField) && vendorIdField.length > 0) {
          const linkedVendorId =
            typeof vendorIdField[0] === "string"
              ? vendorIdField[0]
              : vendorIdField[0]?.id;
          return linkedVendorId === vendorId;
        }

        return false;
      });

      console.log(
        "✅ Submissions found for vendor:",
        submissionsWithVendor.length
      );

      res.json({
        vendorId,
        totalSubmissions: allSubmissions.length,
        vendorSubmissions: submissionsWithVendor.length,
        fieldNames:
          allSubmissions.length > 0
            ? Object.keys(allSubmissions[0].fields)
            : [],
        sampleSubmission:
          allSubmissions.length > 0
            ? {
                id: allSubmissions[0].id,
                vendorField: allSubmissions[0].fields["Vendor"],
                vendorIdField: allSubmissions[0].fields["Vendor ID"],
                companyName: allSubmissions[0].fields["Company Name"],
              }
            : null,
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ error: "Debug failed" });
    }
  }
);

// ---------- Admin: Get All Questions ----------
app.get("/api/admin/questions", async (req, res) => {
  try {
    const submissions = await base("Submissions")
      .select({
        fields: [
          "Vendor ID",
          "Company Name",
          "Submission Date",
          "Step 2 Questions",
          "Step 3 Questions",
          "Step 4 Questions",
          "Step 2 Answers",
          "Step 3 Answers",
          "Step 4 Answers",
          "Questions Last Updated",
          "Review Status",
          "Vendor Viewed Answers",
        ],
      })
      .all();

    const questions = [];
    const vendorIds = submissions
      .map((s) => s.fields["Vendor ID"]?.[0]) // Changed to "Vendor ID"
      .filter(Boolean);

    let vendorMap = {};
    if (vendorIds.length > 0) {
      const vendors = await base("Vendors")
        .select({
          filterByFormula: `OR(${vendorIds
            .map((id) => `RECORD_ID() = '${id}'`)
            .join(",")})`,
          fields: ["Vendor Name", "Email"],
        })
        .all();

      vendorMap = Object.fromEntries(
        vendors.map((v) => [
          v.id,
          { name: v.fields["Vendor Name"], email: v.fields["Email"] },
        ])
      );
    }

    submissions.forEach((submission) => {
      const fields = submission.fields;
      const submissionId = submission.id;
      const vendorId = fields["Vendor ID"]?.[0]; // Changed to "Vendor ID"
      const vendor = vendorMap[vendorId];

      // Step 2
      if (fields["Step 2 Questions"]) {
        questions.push({
          id: `${submissionId}-step2`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Solution Fit & Use Cases",
          question: fields["Step 2 Questions"],
          answer: fields["Step 2 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 2 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 2 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }

      // Step 3
      if (fields["Step 3 Questions"]) {
        questions.push({
          id: `${submissionId}-step3`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Technical Capabilities & Compliance",
          question: fields["Step 3 Questions"],
          answer: fields["Step 3 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 3 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 3 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }

      // Step 4
      if (fields["Step 4 Questions"]) {
        questions.push({
          id: `${submissionId}-step4`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Implementation & Pricing",
          question: fields["Step 4 Questions"],
          answer: fields["Step 4 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 4 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 4 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }
    });

    // Sort by unanswered first, then date
    questions.sort((a, b) => {
      if (!a.answer && b.answer) return -1;
      if (a.answer && !b.answer) return 1;
      return new Date(b.askedAt) - new Date(a.askedAt);
    });

    const unansweredCount = questions.filter((q) => !q.answer).length;

    res.json({
      success: true,
      questions,
      unansweredCount,
    });
  } catch (error) {
    console.error("Admin get questions error:", error);
    res.status(500).json({ error: "Failed to load questions" });
  }
});

// ---------- Admin: Get All Questions ----------
app.get("/api/admin/questions", async (req, res) => {
  try {
    const submissions = await base("Submissions")
      .select({
        fields: [
          "id",
          "Company Name",
          "Vendor",
          "Submission Date",
          "Step 2 Questions",
          "Step 3 Questions",
          "Step 4 Questions",
          "Step 2 Answers",
          "Step 3 Answers",
          "Step 4 Answers",
          "Questions Last Updated",
          "Review Status",
          "Vendor Viewed Answers",
        ],
      })
      .all();

    const questions = [];
    const vendorIds = submissions
      .map((s) => s.fields.Vendor?.[0])
      .filter(Boolean);

    let vendorMap = {};
    if (vendorIds.length > 0) {
      const vendors = await base("Vendors")
        .select({
          filterByFormula: `OR(${vendorIds
            .map((id) => `RECORD_ID() = '${id}'`)
            .join(",")})`,
          fields: ["Vendor Name", "Email"],
        })
        .all();

      vendorMap = Object.fromEntries(
        vendors.map((v) => [
          v.id,
          { name: v.fields["Vendor Name"], email: v.fields["Email"] },
        ])
      );
    }

    submissions.forEach((submission) => {
      const fields = submission.fields;
      const submissionId = submission.id;
      const vendorId = fields.Vendor?.[0];
      const vendor = vendorMap[vendorId];

      // Step 2
      if (fields["Step 2 Questions"]) {
        questions.push({
          id: `${submissionId}-step2`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Solution Fit & Use Cases",
          question: fields["Step 2 Questions"],
          answer: fields["Step 2 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 2 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 2 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }

      // Step 3
      if (fields["Step 3 Questions"]) {
        questions.push({
          id: `${submissionId}-step3`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Technical Capabilities & Compliance",
          question: fields["Step 3 Questions"],
          answer: fields["Step 3 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 3 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 3 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }

      // Step 4
      if (fields["Step 4 Questions"]) {
        questions.push({
          id: `${submissionId}-step4`,
          submissionId,
          vendor: vendor || { name: "Unknown Vendor", email: "" },
          companyName: fields["Company Name"],
          submittedAt: fields["Submission Date"],
          step: "Implementation & Pricing",
          question: fields["Step 4 Questions"],
          answer: fields["Step 4 Answers"] || null,
          askedAt: fields["Submission Date"],
          answeredAt: fields["Step 4 Answers"]
            ? fields["Questions Last Updated"]
            : null,
          status: fields["Review Status"] || "Pending",
          hasNewAnswer:
            fields["Step 4 Answers"] && !fields["Vendor Viewed Answers"],
        });
      }
    });

    // Sort by unanswered first, then date
    questions.sort((a, b) => {
      if (!a.answer && b.answer) return -1;
      if (a.answer && !b.answer) return 1;
      return new Date(b.askedAt) - new Date(a.askedAt);
    });

    const unansweredCount = questions.filter((q) => !q.answer).length;

    res.json({
      success: true,
      questions,
      unansweredCount,
    });
  } catch (error) {
    console.error("Admin get questions error:", error);
    res.status(500).json({ error: "Failed to load questions" });
  }
});

// ---------- Admin: Answer Question ----------
app.post("/api/admin/answer-question", async (req, res) => {
  try {
    const { submissionId, step, answer } = req.body;

    if (!submissionId || !step || !answer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updateData = {
      "Questions Last Updated": new Date().toISOString(),
      "Vendor Viewed Answers": false, // Reset viewed flag when new answer is added
    };

    // Determine which step field to update
    switch (step) {
      case "Solution Fit & Use Cases":
        updateData["Step 2 Answers"] = answer;
        break;
      case "Technical Capabilities & Compliance":
        updateData["Step 3 Answers"] = answer;
        break;
      case "Implementation & Pricing":
        updateData["Step 4 Answers"] = answer;
        break;
      default:
        return res.status(400).json({ error: "Invalid step" });
    }

    await base("Submissions").update(submissionId, updateData);

    res.json({
      success: true,
      message: "Answer submitted successfully",
    });
  } catch (error) {
    console.error("Answer question error:", error);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// ---------- Vendor: Mark Questions as Read ----------
app.post("/api/vendor/mark-questions-read", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // Get all submissions for this vendor - USING Vendor ID field
    const allRecords = await base("Submissions")
      .select({
        fields: ["Vendor ID", "id"],
      })
      .all();

    // CORRECTED: Proper vendor filtering
    const vendorSubmissions = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor ID"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        const linkedVendorId =
          typeof vendorField[0] === "string"
            ? vendorField[0]
            : vendorField[0]?.id;
        return linkedVendorId === vendorId;
      }
      return false;
    });

    console.log(`📝 Marking ${vendorSubmissions.length} submissions as read`);

    // Update each submission to mark answers as viewed
    const updatePromises = vendorSubmissions.map((submission) =>
      base("Submissions").update(submission.id, {
        "Vendor Viewed Answers": true,
      })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Questions marked as read",
    });
  } catch (error) {
    console.error("Mark questions read error:", error);
    res.status(500).json({ error: "Failed to update read status" });
  }
});

// ---------- Admin Vendor Action ----------
app.post("/api/admin/vendor-action", async (req, res) => {
  const { vendorId, action } = req.body;

  if (!vendorId || !["approve", "decline"].includes(action)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const newStatus = action === "approve" ? "Approved" : "Declined";
    const updateData = {
      Status: newStatus,
      "Approval Date": new Date().toISOString().split("T")[0],
    };

    if (action === "approve") {
      updateData["Approved By"] = process.env.ADMIN_EMAIL;
    }

    await base("Vendors").update(vendorId, updateData);

    // ✅ SIMPLE N8N WEBHOOK CALL
    try {
      const vendorRecord = await base("Vendors").find(vendorId);
      const vendorData = vendorRecord.fields;

      // Just send the data to n8n - let n8n handle everything else
      await axios.post(process.env.N8N_WEBHOOK_URL, {
        vendorId: vendorId,
        vendorName: vendorData["Vendor Name"],
        email: vendorData["Email"],
        contactPerson: vendorData["Contact Person"],
        action: action, // "approve" or "decline"
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ n8n webhook triggered for vendor ${action}`);
    } catch (webhookError) {
      console.error("❌ n8n webhook failed:", webhookError);
      // Don't fail the main request if webhook fails
    }

    res.json({ success: true, message: `Vendor ${newStatus.toLowerCase()}` });
  } catch (error) {
    res.status(500).json({ error: "Action failed" });
  }
});

// ---------- Admin Submission Action ----------
app.post("/api/admin/submission-action", async (req, res) => {
  const { submissionId, action, notes } = req.body;

  if (!submissionId || !["approve", "shortlist", "decline"].includes(action)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    let reviewStatus;
    switch (action) {
      case "approve":
        reviewStatus = "Approved";
        break;
      case "shortlist":
        reviewStatus = "Shortlisted";
        break;
      case "decline":
        reviewStatus = "Rejected";
        break;
    }

    const updateData = {
      "Review Status": reviewStatus,
      "Internal Notes": notes || "",
    };

    await base("Submissions").update(submissionId, updateData);

    res.json({
      success: true,
      message: `Submission ${reviewStatus.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Submission action failed:", error);
    res.status(500).json({ error: "Action failed" });
  }
});

// ---------- Admin Get All Submissions ----------
app.get("/api/admin/submissions", async (req, res) => {
  try {
    const records = await base("Submissions")
      .select({
        fields: [
          "Vendor ID",
          "Company Name",
          "Contact Person",
          "Email",
          "Review Status",
          "Submission Date",
          "Internal Notes",
          "Client Workflow Description",
          "Implementation Timeline",
          "Upfront Cost",
          "Monthly Cost",
          "RFP Type",
        ],
        sort: [{ field: "Submission Date", direction: "desc" }],
      })
      .all();

    // Extract Vendor IDs
    const vendorIds = records
      .map((record) => {
        const vendorField = record.fields["Vendor ID"];
        if (Array.isArray(vendorField) && vendorField.length > 0) {
          if (typeof vendorField[0] === "string") {
            return vendorField[0];
          } else if (vendorField[0] && vendorField[0].id) {
            return vendorField[0].id;
          }
        }
        return null;
      })
      .filter(Boolean);

    let vendorMap = {};
    if (vendorIds.length > 0) {
      try {
        const vendors = await base("Vendors")
          .select({
            filterByFormula: `OR(${vendorIds
              .map((id) => `RECORD_ID() = '${id}'`)
              .join(",")})`,
            fields: ["Vendor Name"],
          })
          .all();

        vendorMap = Object.fromEntries(
          vendors.map((v) => [v.id, v.fields["Vendor Name"]])
        );
      } catch (vendorError) {
        console.error("Error fetching vendors:", vendorError);
      }
    }

    const submissions = records.map((record) => {
      const fields = record.fields;

      let vendorId = null;
      const vendorField = fields["Vendor ID"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        if (typeof vendorField[0] === "string") {
          vendorId = vendorField[0];
        } else if (vendorField[0] && vendorField[0].id) {
          vendorId = vendorField[0].id;
        }
      }

      const vendorName = vendorId
        ? vendorMap[vendorId] || `Vendor-${vendorId.slice(-4)}`
        : "Unknown Vendor";

      return {
        id: record.id,
        rfpName: fields["RFP Type"] || "Private Aviation RFP",
        vendorName: vendorName,
        vendorId: vendorId,
        companyName: fields["Company Name"],
        contactPerson: fields["Contact Person"],
        email: fields["Email"],
        status: fields["Review Status"] || "Pending",
        submittedAt: fields["Submission Date"],
        adminNotes: fields["Internal Notes"],
        implementationTimeline: fields["Implementation Timeline"],
        upfrontCost: fields["Upfront Cost"],
        monthlyCost: fields["Monthly Cost"],
      };
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Failed to load submissions:", error);
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// Add this at the end of your backend/index.js, before app.listen
// Global error handling middleware
app.use((error, req, res, next) => {
  console.error("💥 Global error handler:", error);

  // Ensure JSON response even for unhandled errors
  res.status(500).json({
    error: "Internal server error",
    details:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message,
  });
});

// Handle 404 for API routes - return JSON instead of HTML
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl,
  });
});

// ---------- Start Server ----------
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);

module.exports = app;
