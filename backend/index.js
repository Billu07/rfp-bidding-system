// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

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
      "https://rfp-frontend-1x9s7p85w-snows-projects-59aa3c4f.vercel.app/", // You'll update this after deployment
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- File upload ----------
// Use memory storage since Vercel has read-only file system
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// ---------- Test Airtable ----------
app.get("/test-airtable", async (req, res) => {
  try {
    const records = await base("RFPs").select({ maxRecords: 1 }).firstPage();
    res.json({ success: true, sample: records[0]?.fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Vendor Registration ----------
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
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    if (ndaFile.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large (max 10MB)" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create vendor record - EXACTLY as before
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
      Status: "Pending Approval",
      "Internal Notes":
        "Demo registration - File validated (Vercel deployment)",
    });

    res.json({
      success: true,
      message:
        "Registration submitted! Awaiting admin approval. (File validated ✓)",
      vendorId: createdRecord.id,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

// ---------- Vendor Login ----------
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
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ---------- Get Active RFPs ----------
app.get("/api/rfps/active", async (req, res) => {
  try {
    const records = await base("RFPs")
      .select({
        filterByFormula: `{Status} = "Active"`,
        fields: ["RFP Name", "Objective", "Submission Deadline", "Status"],
      })
      .all();

    res.json({
      rfps: records.map((r) => ({ id: r.id, fields: r.fields })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch RFPs" });
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

// ---------- Submit Proposal ----------
app.post(
  "/api/submit-proposal",
  verifyVendor,
  upload.fields([
    { name: "proposalFile", maxCount: 1 },
    { name: "supportingFiles", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const {
        rfpId,
        basePrice,
        currency = "USD",
        timelineDays,
        addOns,
        assumptions,
        exceptions,
      } = req.body;
      const vendorId = req.vendor.id;
      const proposalFile = req.files["proposalFile"]?.[0];
      const supportingFiles = req.files["supportingFiles"] || [];

      if (!rfpId || !basePrice || !proposalFile) {
        return res
          .status(400)
          .json({ error: "RFP ID, base price, and proposal file required" });
      }

      // Verify RFP exists
      try {
        await base("RFPs").find(rfpId);
      } catch (rfpError) {
        return res.status(404).json({ error: "RFP not found" });
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

      // Validate proposal file
      if (proposalFile) {
        if (
          !proposalFile.mimetype.includes("pdf") &&
          !proposalFile.mimetype.includes("zip")
        ) {
          return res
            .status(400)
            .json({ error: "Proposal file must be PDF or ZIP" });
        }

        if (proposalFile.size > 50 * 1024 * 1024) {
          return res
            .status(400)
            .json({ error: "Proposal file too large (max 50MB)" });
        }
      }

      // Create submission data without file attachments
      const submissionData = {
        RFP: [rfpId],
        Vendor: [vendorId],
        "Base Price": parseFloat(basePrice),
        Currency: currency,
        "Timeline (Days)": parseInt(timelineDays) || 0,
        "Optional Add-ons": addOns || "",
        Assumptions: assumptions || "",
        Exceptions: exceptions || "",
        "Review Status": "Pending",
      };

      const created = await base("Submissions").create(submissionData);

      res.json({
        success: true,
        message: "Proposal submitted successfully! (Files validated ✓)",
        submissionId: created.id,
      });
    } catch (error) {
      console.error("Proposal submission error:", error);

      res.status(500).json({
        error: "Submission failed",
        details: error.message,
      });
    }
  }
);

// ---------- Get Vendor's Submissions ----------
app.get("/api/vendor/submissions", verifyVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    // Get all submissions and filter manually
    const allRecords = await base("Submissions")
      .select({
        fields: [
          "RFP",
          "Vendor",
          "Base Price",
          "Currency",
          "Timeline (Days)",
          "Proposal File",
          "Internal Rating",
          "Review Status",
          "Submission Date",
        ],
        maxRecords: 100,
      })
      .all();

    // Manual filtering
    const records = allRecords.filter((record) => {
      const vendorField = record.fields["Vendor"];
      if (Array.isArray(vendorField)) {
        return vendorField.some((item) => {
          if (typeof item === "string") {
            return item === vendorId;
          } else if (item && item.id) {
            return item.id === vendorId;
          }
          return false;
        });
      }
      return false;
    });

    // Extract RFP IDs from linked records
    const rfpIds = records
      .map((r) => {
        const rfpField = r.fields["RFP"];
        if (Array.isArray(rfpField) && rfpField.length > 0) {
          if (typeof rfpField[0] === "string") {
            return rfpField[0];
          } else if (rfpField[0] && rfpField[0].id) {
            return rfpField[0].id;
          }
        }
        return null;
      })
      .filter(Boolean);

    let rfpMap = {};
    if (rfpIds.length > 0) {
      try {
        const rfps = await base("RFPs")
          .select({
            filterByFormula: `OR(${rfpIds
              .map((id) => `RECORD_ID() = '${id}'`)
              .join(",")})`,
          })
          .all();

        rfpMap = Object.fromEntries(
          rfps.map((r) => [r.id, r.fields["RFP Name"]])
        );
      } catch (rfpError) {
        console.error("Error fetching RFPs:", rfpError);
      }
    }

    const submissions = records.map((r) => {
      const f = r.fields;

      let rfpId = null;
      const rfpField = f["RFP"];
      if (Array.isArray(rfpField) && rfpField.length > 0) {
        if (typeof rfpField[0] === "string") {
          rfpId = rfpField[0];
        } else if (rfpField[0] && rfpField[0].id) {
          rfpId = rfpField[0].id;
        }
      }

      const rfpName = rfpId
        ? rfpMap[rfpId] || `RFP-${rfpId.slice(-4)}`
        : "Unknown RFP";

      let submittedAt = f["Submission Date"];
      if (!submittedAt) {
        submittedAt = r._rawJson.createdTime || new Date().toISOString();
      }

      return {
        id: r.id,
        rfpName: rfpName,
        basePrice: f["Base Price"],
        currency: f["Currency"] || "USD",
        timeline: f["Timeline (Days)"] || 0,
        proposalUrl: f["Proposal File"]?.[0]?.url,
        rating: f["Internal Rating"],
        status: f["Review Status"] || "Pending",
        submittedAt: submittedAt,
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

app.post("/api/admin/rate-submission", async (req, res) => {
  const { submissionId, rating } = req.body;

  if (
    !submissionId ||
    !["1-Star", "2-Star", "3-Star", "4-Star", "5-Star"].includes(rating)
  ) {
    return res.status(400).json({ error: "Invalid rating" });
  }

  try {
    await base("Submissions").update(submissionId, {
      "Internal Rating": rating,
      "Review Status": "Under Review",
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Rating failed" });
  }
});

// ---------- Admin Submission Management ----------
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

// ---------- Admin Submissions ----------
app.get("/api/admin/submissions", async (req, res) => {
  try {
    const records = await base("Submissions")
      .select({
        fields: [
          "RFP",
          "Vendor",
          "Base Price",
          "Currency",
          "Timeline (Days)",
          "Proposal File",
          "Supporting Files",
          "Internal Rating",
          "Review Status",
          "Submission Date",
          "Internal Notes",
        ],
        view: "All Submissions",
      })
      .all();

    // Extract ALL RFP and Vendor IDs
    const allRfpIds = [];
    const allVendorIds = [];

    records.forEach((record) => {
      const rfpField = record.fields["RFP"];
      const vendorField = record.fields["Vendor"];

      if (Array.isArray(rfpField)) {
        rfpField.forEach((item) => {
          if (typeof item === "string") {
            allRfpIds.push(item);
          } else if (item && item.id) {
            allRfpIds.push(item.id);
          }
        });
      }

      if (Array.isArray(vendorField)) {
        vendorField.forEach((item) => {
          if (typeof item === "string") {
            allVendorIds.push(item);
          } else if (item && item.id) {
            allVendorIds.push(item.id);
          }
        });
      }
    });

    const uniqueRfpIds = [...new Set(allRfpIds)];
    const uniqueVendorIds = [...new Set(allVendorIds)];

    // Fetch related records
    let rfpRecords = [];
    let vendorRecords = [];

    if (uniqueRfpIds.length > 0) {
      try {
        rfpRecords = await base("RFPs")
          .select({
            filterByFormula: `OR(${uniqueRfpIds
              .map((id) => `RECORD_ID() = '${id}'`)
              .join(",")})`,
            fields: ["RFP Name", "RFP ID"],
          })
          .all();
      } catch (rfpError) {
        console.error("Error fetching RFPs:", rfpError);
      }
    }

    if (uniqueVendorIds.length > 0) {
      try {
        vendorRecords = await base("Vendors")
          .select({
            filterByFormula: `OR(${uniqueVendorIds
              .map((id) => `RECORD_ID() = '${id}'`)
              .join(",")})`,
            fields: ["Vendor Name", "Email"],
          })
          .all();
      } catch (vendorError) {
        console.error("Error fetching vendors:", vendorError);
      }
    }

    // Create lookup maps
    const rfpMap = new Map(rfpRecords.map((r) => [r.id, r.fields["RFP Name"]]));
    const vendorMap = new Map(
      vendorRecords.map((v) => [v.id, v.fields["Vendor Name"]])
    );

    // Process submissions
    const submissions = records.map((record) => {
      const fields = record.fields;

      let rfpId = null;
      let vendorId = null;

      const rfpField = fields["RFP"];
      if (Array.isArray(rfpField) && rfpField.length > 0) {
        if (typeof rfpField[0] === "string") {
          rfpId = rfpField[0];
        } else if (rfpField[0] && rfpField[0].id) {
          rfpId = rfpField[0].id;
        }
      }

      const vendorField = fields["Vendor"];
      if (Array.isArray(vendorField) && vendorField.length > 0) {
        if (typeof vendorField[0] === "string") {
          vendorId = vendorField[0];
        } else if (vendorField[0] && vendorField[0].id) {
          vendorId = vendorField[0].id;
        }
      }

      const rfpName = rfpId
        ? rfpMap.get(rfpId) || `RFP-${rfpId.slice(-4)}`
        : "Unknown RFP";
      const vendorName = vendorId
        ? vendorMap.get(vendorId) || `Vendor-${vendorId.slice(-4)}`
        : "Unknown Vendor";

      return {
        id: record.id,
        rfpName: rfpName,
        vendorName: vendorName,
        vendorId: vendorId,
        basePrice: fields["Base Price"],
        currency: fields["Currency"],
        timeline: fields["Timeline (Days)"],
        proposalUrl: fields["Proposal File"]?.[0]?.url,
        supportingFilesCount: fields["Supporting Files"]?.length || 0,
        rating: fields["Internal Rating"],
        status: fields["Review Status"] || "Pending",
        submittedAt: fields["Submission Date"],
        adminNotes: fields["Internal Notes"],
      };
    });

    res.json({ submissions });
  } catch (error) {
    console.error("Failed to load submissions:", error);
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// ---------- Admin RFP Management ----------
app.get("/api/admin/rfps", async (req, res) => {
  try {
    const records = await base("RFPs")
      .select({
        sort: [{ field: "Created Date", direction: "desc" }],
        fields: [
          "RFP ID",
          "RFP Name",
          "Objective",
          "Scope",
          "Timeline",
          "Budget Guidance",
          "Submission Deadline",
          "Status",
          "Owner",
          "Owner Email",
          "Created Date",
          "Last Modified",
        ],
      })
      .all();

    res.json({
      rfps: records.map((r) => ({
        id: r.id,
        ...r.fields,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch RFPs:", error);
    res.status(500).json({ error: "Failed to fetch RFPs" });
  }
});

// ---------- Admin Create RFP ----------
app.post("/api/admin/create-rfp", async (req, res) => {
  try {
    const {
      rfpName,
      objective,
      description,
      submissionDeadline,
      budget,
      requirements,
      evaluationCriteria,
      contactPerson,
      contactEmail,
    } = req.body;

    if (!rfpName || !objective || !submissionDeadline) {
      return res
        .status(400)
        .json({ error: "RFP Name, Objective, and Deadline are required" });
    }

    const deadlineDate = new Date(submissionDeadline);
    if (isNaN(deadlineDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid submission deadline date" });
    }

    const rfpData = {
      "RFP Name": rfpName,
      Objective: objective,
      Scope: description || "",
      "Budget Guidance": budget || "",
      "Submission Deadline": submissionDeadline,
      Status: "Active",
      Owner: contactPerson || "",
      "Owner Email": contactEmail || "",
    };

    if (requirements) rfpData["Requirements"] = requirements;
    if (evaluationCriteria) rfpData["Evaluation Criteria"] = evaluationCriteria;

    const createdRecord = await base("RFPs").create(rfpData);

    res.json({
      success: true,
      message: "RFP created successfully!",
      rfpId: createdRecord.id,
    });
  } catch (error) {
    console.error("RFP creation error:", error);

    if (error.code === "ETIMEDOUT" || error.type === "system") {
      res.status(504).json({
        error: "Airtable API timeout",
        details: "The request to Airtable timed out. Please try again.",
      });
    } else {
      res.status(500).json({
        error: "RFP creation failed",
        details: error.message,
      });
    }
  }
});

app.post("/api/admin/update-rfp-status", async (req, res) => {
  const { rfpId, status } = req.body;

  if (!rfpId || !["Active", "Closed", "Draft", "Archived"].includes(status)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    await base("RFPs").update(rfpId, {
      Status: status,
    });

    res.json({ success: true, message: `RFP status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: "Status update failed" });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);

module.exports = app;
