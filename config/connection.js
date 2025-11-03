// config/connection.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const state = { db: null };

module.exports.connect = async (done) => {
  // 🔹 Use correct environment variable key
  const url = process.env.MONGO_URL; // matches your Render env variable
  const dbName = "ShoppingCart"; // your database name

  if (!url) {
    console.error("❌ MONGO_URL not found in environment variables");
    return done(new Error("Missing MongoDB URI"));
  }

  try {
    // ✅ Proper TLS setup for Render + MongoDB Atlas
    const client = await MongoClient.connect(url, {
      tls: true,
      tlsAllowInvalidCertificates: true, // avoids strict Render TLS issues
      minTLSVersion: "TLSv1.2",
      serverSelectionTimeoutMS: 10000,
    });

    state.db = client.db(dbName);
    console.log("✅ MongoDB Connected Successfully (Render + Atlas)");
    done();
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    done(err);
  }
};

module.exports.get = function () {
  if (!state.db) {
    console.error("❌ Database not connected. Call connect() first.");
  }
  return state.db;
};
