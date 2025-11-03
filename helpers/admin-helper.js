require("dotenv").config();
const connectdb = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");

module.exports = {
  /* -------------------- ADMIN LOGIN -------------------- */
  AdminDoLogin: async (adminData) => {
    try {
      const db = connectdb.get();
      const admin = await db
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });

      if (!admin) {
        console.warn("⚠️ Admin not found for email:", adminData.Email);
        return { status: false };
      }

      const isMatch = await bcrypt.compare(adminData.Password, admin.Password);
      if (isMatch) {
        console.log("✅ Admin login successful:", admin.Email);
        return { status: true, admin };
      } else {
        console.warn("❌ Invalid password for admin:", adminData.Email);
        return { status: false };
      }
    } catch (err) {
      console.error("❌ Error during admin login:", err);
      throw err;
    }
  },

  /* -------------------- ADMIN SIGNUP -------------------- */
  adminDoSignup: async (adminData) => {
    try {
      const db = connectdb.get();

      // Check for existing admin
      const existingAdmin = await db
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });

      if (existingAdmin) {
        console.warn("⚠️ Admin already exists:", adminData.Email);
        return { alreadyExists: true };
      }

      // Hash password
      adminData.Password = await bcrypt.hash(adminData.Password, 10);

      // Insert admin
      const result = await db
        .collection(collection.ADMIN_COLLECTION)
        .insertOne(adminData);

      console.log("✅ New admin registered:", result.insertedId);
      return result.insertedId;
    } catch (err) {
      console.error("❌ Error during admin signup:", err);
      throw err;
    }
  },

  /* -------------------- GET ALL ORDERS (With User Details) -------------------- */
  getAllOrders: async () => {
    try {
      const db = connectdb.get();
      const orders = await db
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $lookup: {
              from: collection.USER_COLLECTION, // join user collection
              localField: "userId",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $unwind: {
              path: "$userDetails",
              preserveNullAndEmptyArrays: true, // in case user is deleted
            },
          },
          {
            $project: {
              _id: 1,
              totalAmount: 1,
              paymentMethod: 1,
              status: 1,
              date: 1,
              userId: 1,
              "userDetails.Name": 1,
              "userDetails.Email": 1,
            },
          },
        ])
        .sort({ date: -1 }) // latest first
        .toArray();

      console.log(`📦 ${orders.length} orders fetched with user info`);
      return orders;
    } catch (err) {
      console.error("❌ Error fetching all orders:", err);
      throw err;
    }
  },

  /* -------------------- GET ALL USERS -------------------- */
  getAllUsers: async () => {
    try {
      const db = connectdb.get();
      const users = await db
        .collection(collection.USER_COLLECTION)
        .find()
        .sort({ Name: 1 }) // Alphabetical order
        .toArray();

      console.log(`👥 ${users.length} users fetched successfully`);
      return users;
    } catch (err) {
      console.error("❌ Error fetching users:", err);
      throw err;
    }
  },
};
