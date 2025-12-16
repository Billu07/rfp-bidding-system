require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Configuration ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
  requestTimeout: 30000,
}).base(process.env.AIRTABLE_BASE_ID);

// ---------- Middleware ----------
app.use(
  cors({
    origin: [
      "https://rfp-frontend-seven.vercel.app",
      "https://ibrfp.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Vendor-Data",
      "X-Requested-With",
    ],
  })
);

app.options("*", cors());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- File upload ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ---------- Helper: Upload to Cloudinary ----------
const uploadToCloudinary = (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    const { Readable } = require("stream");

    // FIX: Trim whitespace after removing the file extension
    const cleanPublicId = fileName.replace(/\.[^/.]+$/, "").trim();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "rfp-nda-documents",
        public_id: cleanPublicId,
        format: "pdf",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

// ---------- Middleware: Verify Vendor ----------
const verifyVendor = (req, res, next) => {
  const vendorData = req.headers["x-vendor-data"];
  if (!vendorData) {
    return res.status(401).json({ error: "Vendor not authenticated" });
  }
  try {
    const parsed = JSON.parse(vendorData);
    if (!parsed.id) throw new Error("No ID");
    req.vendor = parsed;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session data" });
  }
};

// ==========================================
// VENDOR ROUTES
// ==========================================

// ---------- 1. Register ----------
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

    if (!vendorName || !email || !password || !ndaFile) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await base("Vendors")
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Account with this email already exists.",
      });
    }

    const cloudResult = await uploadToCloudinary(
      ndaFile.buffer,
      ndaFile.originalname
    );

    const passwordHash = await bcrypt.hash(password, 10);

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
      "NDA Cloudinary URL": cloudResult.secure_url,
      "NDA Cloudinary Public ID": cloudResult.public_id,
      "NDA View URL": cloudResult.secure_url,
      Status: "Pending Approval",
    });

    res.json({
      success: true,
      message: "Registration submitted.",
      vendorId: createdRecord.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const records = await base("Vendors")
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const vendor = records[0];
    const fields = vendor.fields;

    if (fields["Status"] !== "Approved") {
      return res.status(403).json({
        error: `Account status is ${fields["Status"]}. Please wait for approval.`,
      });
    }

    const match = await bcrypt.compare(password, fields["Password Hash"]);
    if (!match) {
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
        website: fields["Website"],
        phone: fields["Phone"],
        services: fields["Services"],
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- DRAFT ROUTES (UPDATED) ----------
app.post("/api/save-draft", verifyVendor, async (req, res) => {
  try {
    const draftData = req.body;
    const vendorId = req.vendor.id;

    const records = await base("Drafts").select().all();
    const existingDraft = records.find((record) => {
      const vendorField = record.fields["Vendor"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        return vendorField[0] === vendorId;
      }
      return false;
    });

    if (existingDraft) {
      await base("Drafts").update(existingDraft.id, {
        "Draft Data": JSON.stringify(draftData),
        "Last Saved": new Date().toISOString(),
        Status: "draft",
      });
      res.json({ success: true, draftId: existingDraft.id });
    } else {
      const newRecord = await base("Drafts").create({
        Vendor: [vendorId],
        "Draft Data": JSON.stringify(draftData),
        "Last Saved": new Date().toISOString(),
        Status: "draft",
      });
      res.json({ success: true, draftId: newRecord.id });
    }
  } catch (error) {
    console.error("Save draft error:", error);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

app.get("/api/load-draft", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // 1. FETCH FRESH VENDOR PROFILE FROM AIRTABLE (Force Source of Truth)
    // This ensures we get the latest Company Info, not just what's in LocalStorage
    const vendorRecord = await base("Vendors").find(vendorId);
    if (!vendorRecord) throw new Error("Vendor not found");

    const vFields = vendorRecord.fields;
    const vendorProfile = {
      companyName: vFields["Vendor Name"],
      contactPerson: vFields["Contact Person"],
      email: vFields["Email"],
      phone: vFields["Phone"],
      website: vFields["Website"],
      companyDescription: vFields["Services"], // Default description to services
    };

    // 2. Fetch Draft
    const records = await base("Drafts").select().all();
    const draftRecord = records.find((record) => {
      const vendorField = record.fields["Vendor"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        return vendorField[0] === vendorId;
      }
      return false;
    });

    if (!draftRecord) {
      // Return profile even if no draft exists
      return res.json({ success: true, draft: null, vendorProfile });
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(draftRecord.fields["Draft Data"] || "{}");
      if (typeof parsedData === "string") parsedData = JSON.parse(parsedData);
    } catch (e) {
      console.error("JSON Parse error for draft");
    }

    res.json({
      success: true,
      draft: parsedData,
      vendorProfile, // Send fresh profile data
      lastSaved: draftRecord.fields["Last Saved"],
    });
  } catch (error) {
    console.error("Load draft error:", error);
    res.status(500).json({ error: "Failed to load draft" });
  }
});

app.delete("/api/delete-draft", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const records = await base("Drafts").select().all();
    const vendorDrafts = records.filter((record) => {
      const vendorField = record.fields["Vendor"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        return vendorField[0] === vendorId;
      }
      return false;
    });

    if (vendorDrafts.length > 0) {
      const deletePromises = vendorDrafts.map((r) =>
        base("Drafts").destroy(r.id)
      );
      await Promise.all(deletePromises);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

// ---------- 6. Submit Proposal ----------
app.post(
  "/api/submit-proposal",
  verifyVendor,
  upload.single("pricingDocument"),
  async (req, res) => {
    try {
      const vendorId = req.vendor.id;
      const body = req.body;
      const pricingFile = req.file;

      const vendorRecord = await base("Vendors").find(vendorId);
      if (!vendorRecord) throw new Error("Vendor not found");

      const vFields = vendorRecord.fields;

      const parseField = (val) => {
        if (typeof val === "object" && val !== null) {
          return JSON.stringify(val);
        }
        try {
          return typeof val === "string" &&
            (val.startsWith("{") || val.startsWith("["))
            ? val
            : String(val || "");
        } catch (e) {
          return "";
        }
      };

      let pricingDocUrl = "";
      if (pricingFile) {
        try {
          const cloudResult = await uploadToCloudinary(
            pricingFile.buffer,
            pricingFile.originalname
          );
          pricingDocUrl = cloudResult.secure_url;
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
        }
      }

      // FIX 3: Robust number parsing
      // This strips non-numeric chars (like '$' or 'k') before parsing.
      // If body.upfrontCost is "1000", it works. If it's "1k", it becomes 1.
      // If it's undefined, it becomes 0.
      const cleanUpfrontCost = body.upfrontCost
        ? parseFloat(String(body.upfrontCost).replace(/[^0-9.]/g, "")) || 0
        : 0;

      const submissionData = {
        "Vendor ID": [vendorId],
        "Company Name": vFields["Vendor Name"],
        "Contact Person": vFields["Contact Person"],
        Email: vFields["Email"],
        Phone: vFields["Phone"],
        Website: vFields["Website"],
        "Company Description": body.companyDescription || vFields["Services"],

        "Client Workflow Description": body.clientWorkflowDescription,
        "Request Capture Description": body.requestCaptureDescription,
        "Internal Workflow Description": body.internalWorkflowDescription,
        "Reporting Capabilities": body.reportingCapabilities,
        "Data Architecture": body.dataArchitecture,
        "Step 2 Questions": body.step2Questions,

        "Integration Scores": parseField(body.integrationScores),
        "Security Measures": body.securityMeasures,
        "PCI Compliant": body.pciCompliant === "true",
        "PII Compliant": body.piiCompliant === "true",
        "Step 3 Questions": body.step3Questions,

        "Implementation Timeline": body.implementationTimeline,
        "Project Start Date": body.projectStartDate,
        "Implementation Phases": body.implementationPhases,

        "Upfront Cost": cleanUpfrontCost, // Uses the cleaned value
        "Monthly Cost": body.monthlyCost,
        "Step 4 Questions": body.step4Questions,
        "Pricing Document URL": pricingDocUrl,

        "Reference 1": parseField(body.reference1),
        "Reference 2": parseField(body.reference2),
        "Solution Fit": body.solutionFit,
        "Info Accurate": body.infoAccurate === "true",
        "Contact Consent": body.contactConsent === "true",

        "Review Status": "Pending",
        "Submission Date": new Date().toISOString(),
        "RFP Type": "Private Aviation Workflow Modernization",
      };

      const created = await base("Submissions").create(submissionData);

      res.json({
        success: true,
        message: "Submission successful",
        submissionId: created.id,
      });
    } catch (error) {
      console.error("Submission error:", error);
      res
        .status(500)
        .json({ error: "Submission failed", details: error.message });
    }
  }
);

app.post("/api/update-submission/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const body = req.body;
    const record = await base("Submissions").find(submissionId);
    const linkedVendors = record.fields["Vendor ID"] || [];

    if (!linkedVendors.includes(req.vendor.id)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to edit this submission" });
    }

    const safeStringify = (val) =>
      typeof val === "object" ? JSON.stringify(val) : String(val || "");

    // FIX 4: Robust number parsing for update
    const cleanUpfrontCost = body.upfrontCost
      ? parseFloat(String(body.upfrontCost).replace(/[^0-9.]/g, "")) || 0
      : 0;

    const updateData = {
      "Client Workflow Description": body.clientWorkflowDescription,
      "Request Capture Description": body.requestCaptureDescription,
      "Internal Workflow Description": body.internalWorkflowDescription,
      "Reporting Capabilities": body.reportingCapabilities,
      "Data Architecture": body.dataArchitecture,
      "Step 2 Questions": body.step2Questions,

      "Integration Scores": safeStringify(body.integrationScores),
      "Security Measures": body.securityMeasures,
      "PCI Compliant": !!body.pciCompliant,
      "PII Compliant": !!body.piiCompliant,
      "Step 3 Questions": body.step3Questions,

      "Implementation Timeline": body.implementationTimeline,
      "Project Start Date": body.projectStartDate,
      "Implementation Phases": body.implementationPhases,

      "Upfront Cost": cleanUpfrontCost, // Uses cleaned value
      "Monthly Cost": body.monthlyCost,
      "Step 4 Questions": body.step4Questions,

      "Reference 1": safeStringify(body.reference1),
      "Reference 2": safeStringify(body.reference2),
      "Solution Fit": body.solutionFit,
      "Info Accurate": !!body.infoAccurate,
      "Contact Consent": !!body.contactConsent,

      "Review Status": "Pending",
      "Last Modified": new Date().toISOString(),
    };

    await base("Submissions").update(submissionId, updateData);

    res.json({
      success: true,
      message: "Submission updated",
      submissionId: submissionId,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Update failed" });
  }
});

app.get("/api/vendor/submissions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const records = await base("Submissions")
      .select({
        sort: [{ field: "Submission Date", direction: "desc" }],
      })
      .all();

    const vendorSubmissions = records.filter((record) => {
      const vField = record.fields["Vendor ID"];
      return Array.isArray(vField) && vField.includes(vendorId);
    });

    const submissions = vendorSubmissions.map((r) => ({
      id: r.id,
      rfpName: r.fields["RFP Type"] || "Private Aviation RFP",
      status: r.fields["Review Status"] || "Pending",
      submittedAt: r.fields["Submission Date"],
      companyName: r.fields["Company Name"],
      implementationTimeline: r.fields["Implementation Timeline"],
      upfrontCost: r.fields["Upfront Cost"]
        ? parseFloat(r.fields["Upfront Cost"])
        : 0,
      monthlyCost: r.fields["Monthly Cost"],
    }));

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

app.get("/api/vendor/submissions/:id", verifyVendor, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const record = await base("Submissions").find(submissionId);

    const linkedVendors = record.fields["Vendor ID"] || [];
    if (!linkedVendors.includes(req.vendor.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const fields = record.fields;

    // FIX 1: Initialize these with empty objects so they are never 'undefined'
    // If they remain undefined, JSON.stringify removes them, breaking the frontend checkboxes.
    let integrationScores = {};
    let ref1 = {};
    let ref2 = {};

    try {
      if (fields["Integration Scores"]) {
        const raw = fields["Integration Scores"];
        integrationScores = typeof raw === "object" ? raw : JSON.parse(raw);
      }
    } catch (e) {
      console.log("Error parsing integration scores", e);
    }

    try {
      if (fields["Reference 1"]) {
        const raw = fields["Reference 1"];
        ref1 = typeof raw === "object" ? raw : JSON.parse(raw);
      }
    } catch (e) {}

    try {
      if (fields["Reference 2"]) {
        const raw = fields["Reference 2"];
        ref2 = typeof raw === "object" ? raw : JSON.parse(raw);
      }
    } catch (e) {}

    const submission = {
      companyName: fields["Company Name"],
      contactPerson: fields["Contact Person"],
      email: fields["Email"],
      phone: fields["Phone"],
      website: fields["Website"],

      companyDescription: fields["Company Description"],
      clientWorkflowDescription: fields["Client Workflow Description"],
      requestCaptureDescription: fields["Request Capture Description"],
      internalWorkflowDescription: fields["Internal Workflow Description"],
      reportingCapabilities: fields["Reporting Capabilities"],
      dataArchitecture: fields["Data Architecture"],
      step2Questions: fields["Step 2 Questions"],

      // Now guaranteed to be an object (empty or populated)
      integrationScores: integrationScores,
      securityMeasures: fields["Security Measures"],
      pciCompliant: fields["PCI Compliant"],
      piiCompliant: fields["PII Compliant"],
      step3Questions: fields["Step 3 Questions"],

      implementationTimeline: fields["Implementation Timeline"],
      projectStartDate: fields["Project Start Date"],
      implementationPhases: fields["Implementation Phases"],

      // FIX 2: Ensure we return a value, even if 0 or null, converted to string for consistency
      upfrontCost:
        fields["Upfront Cost"] !== undefined
          ? String(fields["Upfront Cost"])
          : "",
      monthlyCost: fields["Monthly Cost"],
      step4Questions: fields["Step 4 Questions"],

      reference1: ref1,
      reference2: ref2,
      solutionFit: fields["Solution Fit"],
      infoAccurate: fields["Info Accurate"],
      contactConsent: fields["Contact Consent"],
    };

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Load submission error:", error);
    res.status(500).json({ error: "Failed to load submission" });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
  res.json({ success: true, admin: { email } });
});

app.get("/api/admin/pending-vendors", async (req, res) => {
  try {
    const records = await base("Vendors")
      .select({ filterByFormula: `{Status} = "Pending Approval"` })
      .all();
    res.json({ vendors: records.map((r) => ({ id: r.id, ...r.fields })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// ---------- UPDATED ROUTE: /api/admin/vendor-action ----------
app.post("/api/admin/vendor-action", async (req, res) => {
  const { vendorId, action } = req.body;
  const N8N_URL =
    process.env.N8N_WEBHOOK_URL ||
    "https://jettocabo.app.n8n.cloud/webhook/webhook/vendor-action";

  try {
    const newStatus = action === "approve" ? "Approved" : "Declined";

    const updatedRecord = await base("Vendors").update(vendorId, {
      Status: newStatus,
      "Approval Date": new Date().toISOString().split("T")[0],
      "Approved By":
        action === "approve" ? process.env.ADMIN_EMAIL || "Admin" : null,
    });

    try {
      await axios.post(N8N_URL, {
        vendorId: vendorId,
        vendorName: updatedRecord.fields["Vendor Name"],
        email: updatedRecord.fields["Email"],
        status: newStatus,
        action: action,
        adminNote: "Processed via Admin Dashboard",
        timestamp: new Date().toISOString(),
      });
      console.log(
        `n8n webhook triggered for ${updatedRecord.fields["Vendor Name"]} (${newStatus})`
      );
    } catch (webhookError) {
      console.error("Failed to trigger n8n webhook:", webhookError.message);
    }

    res.json({ success: true, message: `Vendor ${newStatus.toLowerCase()}` });
  } catch (error) {
    console.error("Vendor action error:", error);
    res.status(500).json({ error: "Action failed" });
  }
});

app.get("/api/admin/submissions", async (req, res) => {
  try {
    const records = await base("Submissions")
      .select({ sort: [{ field: "Submission Date", direction: "desc" }] })
      .all();
    const submissions = records.map((record) => {
      const f = record.fields;
      let integrationScores = {};
      try {
        integrationScores = JSON.parse(f["Integration Scores"] || "{}");
        if (typeof integrationScores === "string")
          integrationScores = JSON.parse(integrationScores);
      } catch (e) {}

      return {
        id: record.id,
        rfpName: f["RFP Type"] || "Private Aviation RFP",
        companyName: f["Company Name"],
        contactPerson: f["Contact Person"],
        email: f["Email"],
        status: f["Review Status"] || "Pending",
        submittedAt: f["Submission Date"],
        adminNotes: f["Internal Notes"],
        companyDescription: f["Company Description"],
        clientWorkflowDescription: f["Client Workflow Description"],
        internalWorkflowDescription: f["Internal Workflow Description"],
        reportingCapabilities: f["Reporting Capabilities"],
        dataArchitecture: f["Data Architecture"],
        requestCaptureDescription: f["Request Capture Description"],
        integrationScores: integrationScores,
        securityMeasures: f["Security Measures"],
        pciCompliant: f["PCI Compliant"],
        piiCompliant: f["PII Compliant"],
        implementationTimeline: f["Implementation Timeline"],
        projectStartDate: f["Project Start Date"],
        implementationPhases: f["Implementation Phases"],
        upfrontCost: f["Upfront Cost"] ? parseFloat(f["Upfront Cost"]) : 0,
        monthlyCost: f["Monthly Cost"],
        pricingDocUrl: f["Pricing Document URL"],
        reference1: f["Reference 1"] ? JSON.parse(f["Reference 1"]) : {},
        reference2: f["Reference 2"] ? JSON.parse(f["Reference 2"]) : {},
        solutionFit: f["Solution Fit"],
      };
    });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

app.get("/api/admin/questions", async (req, res) => {
  try {
    const submissions = await base("Submissions").select().all();
    const questions = [];

    const vendors = await base("Vendors").select().all();
    const vendorMap = {};
    vendors.forEach((v) => {
      vendorMap[v.id] = {
        name: v.fields["Vendor Name"],
        email: v.fields["Email"],
      };
    });

    submissions.forEach((sub) => {
      const f = sub.fields;
      const company = f["Company Name"];

      const vendorIdArr = f["Vendor ID"];
      const vendorId =
        Array.isArray(vendorIdArr) && vendorIdArr.length > 0
          ? vendorIdArr[0]
          : null;
      const vendor = vendorMap[vendorId] || {
        name: "Unknown Vendor",
        email: "",
      };

      const pushQ = (step, q, a, lastUpdated) => {
        if (q) {
          questions.push({
            id: sub.id + step,
            submissionId: sub.id,
            vendor: vendor,
            companyName: company,
            step,
            question: q,
            answer: a,
            askedAt: f["Submission Date"],
            answeredAt: a ? lastUpdated : null,
          });
        }
      };

      pushQ(
        "Solution Fit",
        f["Step 2 Questions"],
        f["Step 2 Answers"],
        f["Questions Last Updated"]
      );
      pushQ(
        "Technical",
        f["Step 3 Questions"],
        f["Step 3 Answers"],
        f["Questions Last Updated"]
      );
      pushQ(
        "Implementation",
        f["Step 4 Questions"],
        f["Step 4 Answers"],
        f["Questions Last Updated"]
      );
    });

    res.json({ success: true, questions });
  } catch (error) {
    console.error("Questions error:", error);
    res.status(500).json({ error: "Failed to load questions" });
  }
});

app.post("/api/admin/answer-question", async (req, res) => {
  try {
    const { submissionId, step, answer } = req.body;
    let fieldToUpdate = "";
    if (step === "Solution Fit") fieldToUpdate = "Step 2 Answers";
    else if (step === "Technical") fieldToUpdate = "Step 3 Answers";
    else if (step === "Implementation") fieldToUpdate = "Step 4 Answers";
    else return res.status(400).json({ error: "Invalid step" });

    await base("Submissions").update(submissionId, {
      [fieldToUpdate]: answer,
      "Questions Last Updated": new Date().toISOString(),
      "Vendor Viewed Answers": false,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

app.post("/api/admin/submission-action", async (req, res) => {
  const { submissionId, action, notes } = req.body;
  try {
    let status = "Pending";
    if (action === "approve") status = "Approved";
    if (action === "shortlist") status = "Shortlisted";
    if (action === "decline") status = "Rejected";

    await base("Submissions").update(submissionId, {
      "Review Status": status,
      "Internal Notes": notes,
    });
    res.json({ success: true, message: "Action successful" });
  } catch (e) {
    res.status(500).json({ error: "Action failed" });
  }
});

app.get("/api/vendor/questions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const records = await base("Submissions").select().all();
    const vendorSubmissions = records.filter((r) => {
      const vField = r.fields["Vendor ID"];
      return Array.isArray(vField) && vField.includes(vendorId);
    });

    const questions = [];
    vendorSubmissions.forEach((sub) => {
      const f = sub.fields;
      const pushQ = (step, q, a, updated) => {
        if (q) {
          questions.push({
            id: sub.id + step,
            companyName: f["Company Name"],
            step,
            question: q,
            answer: a,
            answeredAt: a ? updated : null,
          });
        }
      };

      pushQ(
        "Solution Fit",
        f["Step 2 Questions"],
        f["Step 2 Answers"],
        f["Questions Last Updated"]
      );
      pushQ(
        "Technical",
        f["Step 3 Questions"],
        f["Step 3 Answers"],
        f["Questions Last Updated"]
      );
      pushQ(
        "Implementation",
        f["Step 4 Questions"],
        f["Step 4 Answers"],
        f["Questions Last Updated"]
      );
    });

    res.json({ success: true, questions });
  } catch (error) {
    console.error("Vendor questions error:", error);
    res.status(500).json({ error: "Failed to load questions" });
  }
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
