require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const fs = require("fs");
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

    res.json({
      success: true,
      message:
        "Registration submitted! Your NDA is under review. You will be notified once approved.",
      vendorId: createdRecord.id,
      status: "pending_approval",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

// ---------- Vendor Login (Check Approval Status) ----------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

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

    // Check approval status
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
        error: "Account not approved",
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
    console.error("Login error:", error);
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
    const {
      // Step 1: Company Information
      companyName,
      website,
      contactPerson,
      email,
      phone,
      companyDescription,

      // Step 2: Solution Fit
      clientWorkflowDescription,
      requestCaptureDescription,
      internalWorkflowDescription,
      reportingCapabilities,
      dataArchitecture,
      step2Questions,

      // Step 3: Technical Capabilities
      integrationScores,
      securityMeasures,
      pciCompliant,
      piiCompliant,
      step3Questions,

      // Step 4: Implementation & Pricing
      implementationTimeline,
      projectStartDate,
      implementationPhases,
      upfrontCost,
      monthlyCost,
      step4Questions,

      // Step 5: References & Fit
      reference1,
      reference2,
      solutionFit,
      infoAccurate,
      contactConsent,
    } = req.body;

    const vendorId = req.vendor.id;

    // Validate required fields
    if (
      !companyName ||
      !contactPerson ||
      !email ||
      !clientWorkflowDescription
    ) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    // Verify vendor exists and is approved
    let vendorRecord;
    try {
      vendorRecord = await base("Vendors").find(vendorId);
      if (vendorRecord.fields["Status"] !== "Approved") {
        return res.status(403).json({ error: "Vendor account not approved" });
      }
    } catch (vendorError) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Create submission record
    const submissionData = {
      Vendor: [vendorId],
      "Company Name": companyName,
      Website: website,
      "Contact Person": contactPerson,
      Email: email,
      Phone: phone,
      "Company Description": companyDescription,

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
      "Monthly Cost": monthlyCost ? parseFloat(monthlyCost) : 0,
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

// ---------- Get Vendor's Aviation RFP Submissions ----------
app.get("/api/vendor/submissions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // Get all submissions for this vendor
    const records = await base("Submissions")
      .select({
        filterByFormula: `{Vendor} = '${vendorId}'`,
        fields: [
          "Company Name",
          "Contact Person",
          "Email",
          "Review Status",
          "Submission Date",
          "Implementation Timeline",
          "Upfront Cost",
          "Monthly Cost",
        ],
        sort: [{ field: "Submission Date", direction: "desc" }],
      })
      .all();

    const submissions = records.map((record) => {
      const fields = record.fields;
      return {
        id: record.id,
        rfpName: "Private Aviation RFP",
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

    // Get the specific submission
    const record = await base("Submissions").find(submissionId);
    const fields = record.fields;

    // Verify the submission belongs to the vendor
    const submissionVendorId = Array.isArray(fields["Vendor"])
      ? typeof fields["Vendor"][0] === "string"
        ? fields["Vendor"][0]
        : fields["Vendor"][0]?.id
      : null;

    if (submissionVendorId !== vendorId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Parse JSON fields back to objects
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
      integrationScores: fields["Integration Scores"]
        ? JSON.parse(fields["Integration Scores"])
        : {
            zendesk: "",
            oracleSql: "",
            quickbooks: "",
            slack: "",
            brex: "",
            avinode: "",
          },
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
      reference1: fields["Reference 1"]
        ? JSON.parse(fields["Reference 1"])
        : { name: "", company: "", email: "", reason: "" },
      reference2: fields["Reference 2"]
        ? JSON.parse(fields["Reference 2"])
        : { name: "", company: "", email: "", reason: "" },
      solutionFit: fields["Solution Fit"] || "",
      infoAccurate: Boolean(fields["Info Accurate"]),
      contactConsent: Boolean(fields["Contact Consent"]),

      status: fields["Review Status"] || "Pending",
      submittedAt: fields["Submission Date"] || record._rawJson.createdTime,
    };

    res.json({
      success: true,
      submission: submissionData,
    });
  } catch (error) {
    console.error("Fetch submission error:", error);

    if (error.message?.includes("Could not find record")) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.status(500).json({ error: "Failed to load submission" });
  }
});

// ---------- Update Submission ----------
app.post("/api/update-submission/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const vendorId = req.vendor.id;
    const {
      companyName,
      website,
      contactPerson,
      email,
      phone,
      companyDescription,
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
    const existingVendorId = Array.isArray(existingRecord.fields["Vendor"])
      ? typeof existingRecord.fields["Vendor"][0] === "string"
        ? existingRecord.fields["Vendor"][0]
        : existingRecord.fields["Vendor"][0]?.id
      : null;

    if (existingVendorId !== vendorId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update submission record
    const updateData = {
      "Company Name": companyName,
      Website: website,
      "Contact Person": contactPerson,
      Email: email,
      Phone: phone,
      "Company Description": companyDescription,

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
      "Monthly Cost": monthlyCost ? parseFloat(monthlyCost) : 0,
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
          "Vendor",
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
        const vendorField = record.fields["Vendor"];
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
      const vendorField = fields["Vendor"];
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

// ---------- Start Server ----------
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);

module.exports = app;
