const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    error: { type: String, default: "" },
  },
  { _id: false }
);

const emailSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    recipients: { type: [recipientSchema], required: true },
    status: {
      type: String,
      enum: ["sending", "sent", "partial", "failed"],
      default: "sending",
    },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    previewUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Email", emailSchema);
