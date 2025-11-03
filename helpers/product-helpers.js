const connectdb = require("../config/connection");
const collection = require("../config/collection");
const { ObjectId } = require("mongodb");

module.exports = {
  /* ---------------- ADD PRODUCT ---------------- */
  addProduct: async (product, callback) => {
    try {
      const db = connectdb.get();
      const result = await db
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(product);

      console.log("✅ Product added successfully:", result.insertedId);
      if (callback) callback(result.insertedId);
      return result.insertedId;
    } catch (err) {
      console.error("❌ Error adding product:", err);
      if (callback) callback(null);
      throw err;
    }
  },

  /* ---------------- GET ALL PRODUCTS ---------------- */
  getAllProducts: async () => {
    try {
      const db = connectdb.get();
      const products = await db
        .collection(collection.PRODUCT_COLLECTION)
        .find({})
        .sort({ _id: -1 }) // Show latest added first
        .toArray();

      console.log(`📦 Retrieved ${products.length} products`);
      return products;
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      return [];
    }
  },

  /* ---------------- DELETE PRODUCT ---------------- */
  deleteProducts: async (prodId) => {
    try {
      const db = connectdb.get();
      const result = await db
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: new ObjectId(prodId) });

      console.log("🗑️ Product deleted successfully:", prodId);
      return result;
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      throw err;
    }
  },

  /* ---------------- GET PRODUCT DETAILS ---------------- */
  getProductDetails: async (proId) => {
    try {
      const db = connectdb.get();
      const product = await db
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: new ObjectId(proId) });

      if (!product) console.warn("⚠️ No product found with ID:", proId);
      return product;
    } catch (err) {
      console.error("❌ Error fetching product details:", err);
      throw err;
    }
  },

  /* ---------------- UPDATE PRODUCT ---------------- */
  updateProducts: async (proId, prodDetails) => {
    try {
      const db = connectdb.get();
      const result = await db
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: new ObjectId(proId) },
          {
            $set: {
              Name: prodDetails.Name,
              Category: prodDetails.Category,
              Price: prodDetails.Price,
              Description: prodDetails.Description,
            },
          }
        );

      console.log("✅ Product updated successfully:", proId);
      return result;
    } catch (err) {
      console.error("❌ Error updating product:", err);
      throw err;
    }
  },
};
