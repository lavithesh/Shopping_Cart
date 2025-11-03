// config/connection.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const state = {
  db: null,
};

/**
 * Connect to MongoDB Atlas using the native MongoDB driver.
 * @param {Function} done - callback function to signal connection status
 */
module.exports.connect = async (done) => {
  const url = process.env.MONGODB_URI; // Your Atlas or local Mongo URI
  const dbName = "ShoppingCart"; // Your database name

  if (!url) {
    console.error("❌ MONGODB_URI not found in .env file");
    return done(new Error("Missing MongoDB URI"));
  }

  try {
    const client = await MongoClient.connect(url);
    state.db = client.db(dbName);
    console.log("✅ MongoDB Connected Successfully (Native Driver)");
    done();
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    done(err);
  }
};

/**
 * Get the connected database instance.
 * @returns {import('mongodb').Db} The connected MongoDB database
 */
module.exports.get = function () {
  if (!state.db) {
    console.error("❌ Database not connected. Call connect() first.");
  }
  return state.db;
};
