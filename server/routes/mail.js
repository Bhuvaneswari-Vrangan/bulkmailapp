const express = require("express");
const mongoose = require("mongoose");
const Email = require("../models/Email");
const { sendOne } = require("../utils/mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_RECIPIENTS = 200;
const CONCURRENCY = 5;

// Accepts an array or a string separated by commas, semicolons, spaces or new lines
function parseRecipients(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(/[\s,;]+/);
  return [...new Set(list.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
}

// POST /api/mail/send
router.post("/send", async (req, res, next) => {
  try {
    const subject = String(req.body.subject || "").trim();
    const body = String(req.body.body || "").trim();
    const recipients = parseRecipients(req.body.recipients);

    const errors = [];
    if (!subject) errors.push("Subject is required");
    if (!body) errors.push("Email body is required");
    if (recipients.length === 0) errors.push("At least one recipient is required");
    if (recipients.length > MAX_RECIPIENTS) errors.push(`Maximum ${MAX_RECIPIENTS} recipients per batch`);
    const invalid = recipients.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) errors.push(`Invalid email address(es): ${invalid.join(", ")}`);
    if (errors.length) return res.status(400).json({ message: errors.join(". "), errors });

    const record = await Email.create({
      subject,
      body,
      recipients: recipients.map((email) => ({ email })),
    });
    console.log(`[mail] Batch ${record._id} started: ${recipients.length} recipient(s)`);

    // Send with limited concurrency; each recipient gets an individual message
    let cursor = 0;
    let previewUrl = "";
    const worker = async () => {
      while (cursor < record.recipients.length) {
        const r = record.recipients[cursor++];
        try {
          const { preview } = await sendOne({ to: r.email, subject, body });
          r.status = "sent";
          if (preview && !previewUrl) previewUrl = preview;
        } catch (err) {
          r.status = "failed";
          r.error = err.message;
          console.error(`[mail] Failed to send to ${r.email}: ${err.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));

    record.sentCount = record.recipients.filter((r) => r.status === "sent").length;
    record.failedCount = record.recipients.length - record.sentCount;
    record.status = record.failedCount === 0 ? "sent" : record.sentCount === 0 ? "failed" : "partial";
    record.previewUrl = previewUrl;
    await record.save();

    console.log(`[mail] Batch ${record._id} finished: ${record.sentCount} sent, ${record.failedCount} failed`);
    const code = record.status === "failed" ? 502 : 200;
    res.status(code).json({
      message:
        record.status === "sent"
          ? `Email sent to all ${record.sentCount} recipient(s)`
          : record.status === "partial"
          ? `Sent to ${record.sentCount}, failed for ${record.failedCount} recipient(s)`
          : "Failed to send email to any recipient",
      email: record,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/mail/history?page=1&limit=10
router.get("/history", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const [items, total] = await Promise.all([
      Email.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Email.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
});

// GET /api/mail/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
    const email = await Email.findById(req.params.id).lean();
    if (!email) return res.status(404).json({ message: "Email record not found" });
    res.json(email);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mail/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
    const removed = await Email.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Email record not found" });
    res.json({ message: "Record deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
