require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// SAFE - don't crash if env is undefined during build
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bulkmail";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: "ok", env: !!process.env.MONGO_URI }));

module.exports = app;

if (require.main === module) {
  mongoose.connect(MONGO_URI).then(() => {
    app.listen(process.env.PORT || 5000, () => console.log("Local server"));
  });
}