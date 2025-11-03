// config/connection.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const state = { db: null };

module.exports.connect = async (done) => {
  const url = process.env.MONGO_URL; // matches your Render env variable
  const dbName = "ShoppingCart"; // your database name

  if (!url) {
    console.error("❌ MONGO_URL not found in environment variables");
    return done(new Error("Missing MongoDB URI"));
  }

  try {
    // ✅ Clean, modern MongoDB connection (compatible with driver v6+)
    const client = await MongoClient.connect(url, {
      tls: true,
      tlsAllowInvalidCertificates: true,
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
