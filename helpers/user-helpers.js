require("dotenv").config();
const connectdb = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ✅ Razorpay Setup
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = {
  /* ---------------- SIGNUP ---------------- */
  doSignup: async (userData) => {
    try {
      userData.Password = await bcrypt.hash(userData.Password, 10);
      const result = await connectdb
        .get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData);
      console.log("✅ User registered:", result.insertedId);
      return result.insertedId;
    } catch (err) {
      console.error("❌ Signup Error:", err);
      throw err;
    }
  },

  /* ---------------- LOGIN ---------------- */
  doLogin: async (userData) => {
    try {
      const user = await connectdb
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });

      if (user && (await bcrypt.compare(userData.Password, user.Password))) {
        console.log("✅ Login success:", user.Email);
        return { status: true, user };
      } else {
        console.log("❌ Invalid credentials:", userData.Email);
        return { status: false };
      }
    } catch (err) {
      console.error("❌ Login Error:", err);
      throw err;
    }
  },

  /* ---------------- ADD TO CART ---------------- */
  addToCart: async (proId, userId) => {
    try {
      const productObj = { item: new ObjectId(proId), quantity: 1 };
      const cartCollection = connectdb.get().collection(collection.CART_COLLECTION);
      const userCart = await cartCollection.findOne({ user: new ObjectId(userId) });

      if (userCart) {
        const productIndex = userCart.products.findIndex(
          (p) => p.item.toString() === proId
        );

        if (productIndex !== -1) {
          await cartCollection.updateOne(
            { user: new ObjectId(userId), "products.item": new ObjectId(proId) },
            { $inc: { "products.$.quantity": 1 } }
          );
        } else {
          await cartCollection.updateOne(
            { user: new ObjectId(userId) },
            { $push: { products: productObj } }
          );
        }
      } else {
        await cartCollection.insertOne({
          user: new ObjectId(userId),
          products: [productObj],
        });
      }
      console.log("🛒 Product added to cart:", proId);
      return { status: true };
    } catch (err) {
      console.error("❌ Add to Cart Error:", err);
      throw err;
    }
  },

  /* ---------------- FETCH CART PRODUCTS ---------------- */
  getCartProducts: async (userId) => {
    try {
      const cartItems = await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          { $match: { user: new ObjectId(userId) } },
          { $unwind: "$products" },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "products.item",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              productDetails: {
                _id: "$productDetails._id",
                Name: "$productDetails.Name",
                Category: "$productDetails.Category",
                Price: "$productDetails.Price",
                Description: "$productDetails.Description",
              },
            },
          },
        ])
        .toArray();

      return cartItems || [];
    } catch (err) {
      console.error("❌ Fetch Cart Products Error:", err);
      throw err;
    }
  },

  /* ---------------- CART COUNT ---------------- */
  getCartCount: async (userId) => {
    try {
      const cart = await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });
      return cart ? cart.products.length : 0;
    } catch (err) {
      console.error("❌ Cart Count Error:", err);
      throw err;
    }
  },

  /* ---------------- CHANGE PRODUCT QUANTITY ---------------- */
  changeProductQuantity: async ({ cartId, proId, count }) => {
    try {
      const cartCollection = connectdb.get().collection(collection.CART_COLLECTION);
      const cart = await cartCollection.findOne({
        _id: new ObjectId(cartId),
        "products.item": new ObjectId(proId),
      });

      if (!cart) return { error: "Cart not found" };

      const product = cart.products.find((p) => p.item.toString() === proId);
      const newQuantity = product.quantity + count;

      if (newQuantity <= 0) {
        await cartCollection.updateOne(
          { _id: new ObjectId(cartId) },
          { $pull: { products: { item: new ObjectId(proId) } } }
        );
        return { removed: true };
      } else {
        await cartCollection.updateOne(
          { _id: new ObjectId(cartId), "products.item": new ObjectId(proId) },
          { $set: { "products.$.quantity": newQuantity } }
        );
        return { updated: true };
      }
    } catch (err) {
      console.error("❌ Change Quantity Error:", err);
      throw err;
    }
  },

  /* ---------------- REMOVE FROM CART ---------------- */
  removeFromCart: async (cartId, proId) => {
    try {
      await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: new ObjectId(cartId) },
          { $pull: { products: { item: new ObjectId(proId) } } }
        );
      return { removed: true };
    } catch (err) {
      console.error("❌ Remove from Cart Error:", err);
      throw err;
    }
  },

  /* ---------------- GET TOTAL AMOUNT ---------------- */
  getTotalAmount: async (userId) => {
    try {
      const total = await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          { $match: { user: new ObjectId(userId) } },
          { $unwind: "$products" },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "products.item",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: {
                  $multiply: [
                    { $toInt: "$products.quantity" },
                    { $toInt: "$productDetails.Price" },
                  ],
                },
              },
            },
          },
        ])
        .toArray();

      return total.length > 0 ? total[0].totalAmount : 0;
    } catch (err) {
      console.error("❌ Get Total Amount Error:", err);
      throw err;
    }
  },

  /* ---------------- PLACE ORDER ---------------- */
  placeOrder: async (orderData, products, totalPrice) => {
    try {
      const orderObj = {
        deliveryDetails: {
          address: orderData.address,
          pincode: orderData.pincode,
          mobile: orderData.mobile,
        },
        userId: new ObjectId(orderData.userId),
        paymentMethod: orderData["payment-method"],
        products,
        totalAmount: totalPrice,
        status: orderData["payment-method"] === "COD" ? "Placed" : "Pending",
        date: new Date(),
      };

      const result = await connectdb
        .get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj);

      await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .deleteOne({ user: new ObjectId(orderData.userId) });

      return result.insertedId;
    } catch (err) {
      console.error("❌ Place Order Error:", err);
      throw err;
    }
  },

  /* ---------------- GET CART PRODUCT LIST ---------------- */
  getCartProductList: async (userId) => {
    try {
      if (!userId || userId.length !== 24) return [];
      const cart = await connectdb
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });
      return cart ? cart.products : [];
    } catch (err) {
      console.error("❌ Get Cart Product List Error:", err);
      throw err;
    }
  },

  /* ---------------- GET USER ORDERS ---------------- */
  getUserOrders: async (userId) => {
    try {
      return await connectdb
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: new ObjectId(userId) })
        .toArray();
    } catch (err) {
      console.error("❌ Get User Orders Error:", err);
      throw err;
    }
  },

  /* ---------------- GET ORDER PRODUCTS ---------------- */
  getOrderProducts: async (orderId) => {
    try {
      const orderItems = await connectdb
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          { $match: { _id: new ObjectId(orderId) } },
          { $unwind: "$products" },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "products.item",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $project: {
              item: 1,
              quantity: "$products.quantity",
              productDetails: {
                _id: "$productDetails._id",
                Name: "$productDetails.Name",
                Category: "$productDetails.Category",
                Price: "$productDetails.Price",
                Description: "$productDetails.Description",
              },
            },
          },
        ])
        .toArray();

      return orderItems;
    } catch (err) {
      console.error("❌ Get Order Products Error:", err);
      throw err;
    }
  },

  /* ---------------- RAZORPAY ORDER ---------------- */
  generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
      const options = {
        amount: totalPrice * 100,
        currency: "INR",
        receipt: orderId.toString(),
      };

      razorpayInstance.orders.create(options, (err, order) => {
        if (err) {
          console.error("❌ Razorpay Order Creation Error:", err);
          reject(err);
        } else resolve(order);
      });
    });
  },

  /* ---------------- VERIFY PAYMENT ---------------- */
  verifyPayment: (paymentDetails) => {
    return new Promise((resolve, reject) => {
      try {
        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(paymentDetails.order_id + "|" + paymentDetails.payment_id);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === paymentDetails.signature) resolve();
        else reject("Payment verification failed");
      } catch (err) {
        reject(err);
      }
    });
  },

  /* ---------------- CHANGE PAYMENT STATUS ---------------- */
  changePaymentStatus: async (orderId) => {
    try {
      await connectdb
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { status: "Placed" } }
        );
      console.log("✅ Payment status updated for order:", orderId);
      return;
    } catch (err) {
      console.error("❌ Change Payment Status Error:", err);
      throw err;
    }
  },
};
