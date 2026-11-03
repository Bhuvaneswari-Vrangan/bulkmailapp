const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const router = express.Router();

const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const okEmail = safeEqual(email.trim().toLowerCase(), (process.env.ADMIN_EMAIL || "").toLowerCase());
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD || "");
  if (!okEmail || !okPass) {
    console.warn(`[auth] Failed login attempt for ${email}`);
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ email: process.env.ADMIN_EMAIL, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
  console.log(`[auth] Admin logged in: ${process.env.ADMIN_EMAIL}`);
  res.json({ token, email: process.env.ADMIN_EMAIL });
});

module.exports = router;
