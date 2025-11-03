// routes/user.js
require("dotenv").config();
var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
const session = require("express-session");

/* -------------------- MIDDLEWARE -------------------- */
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) next();
  else res.redirect("/login");
};

/* -------------------- HOME PAGE -------------------- */
router.get("/", async (req, res) => {
  try {
    const user = req.session.user;
    let cartCount = null;

    if (user && user._id) {
      cartCount = await userHelpers.getCartCount(user._id);
    }

    const products = await productHelpers.getAllProducts();
    res.render("index", { products, user, cartCount });
  } catch (err) {
    console.error("❌ Error loading home page:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* -------------------- LOGIN -------------------- */
router.get("/login", (req, res) => {
  if (req.session.userLoggedIn) return res.redirect("/");
  res.render("user/login", { loginErr: req.session.userErr });
  req.session.userErr = false;
});

/* -------------------- SIGNUP -------------------- */
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

/* -------------------- SIGNUP POST -------------------- */
router.post("/sign", async (req, res) => {
  try {
    const user = await userHelpers.doSignup(req.body);
    req.session.userLoggedIn = true;
    req.session.user = user;
    res.redirect("/");
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).send("Signup Failed");
  }
});

/* -------------------- LOGIN POST -------------------- */
router.post("/login", async (req, res) => {
  try {
    const response = await userHelpers.doLogin(req.body);
    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.userErr = true;
      res.redirect("/login");
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).send("Login Failed");
  }
});

/* -------------------- LOGOUT -------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* -------------------- CART PAGE -------------------- */
router.get("/cart", verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const products = await userHelpers.getCartProducts(userId);
    const total = await userHelpers.getTotalAmount(userId);
    res.render("user/cart", { products, user: req.session.user, total });
  } catch (err) {
    console.error("❌ Error loading cart:", err);
    res.status(500).send("Error loading cart");
  }
});

/* -------------------- ADD TO CART -------------------- */
router.get("/add-to-cart/:id", verifyLogin, async (req, res) => {
  try {
    await userHelpers.addToCart(req.params.id, req.session.user._id);
    res.json({ status: true });
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    res.json({ status: false });
  }
});

/* -------------------- CHANGE PRODUCT QUANTITY -------------------- */
router.post("/change-product-quantity", async (req, res) => {
  try {
    await userHelpers.changeProductQuantity(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error changing product quantity:", error);
    res.json({ success: false, message: "Error updating quantity" });
  }
});

/* -------------------- REMOVE FROM CART -------------------- */
router.post("/remove-from-cart", async (req, res) => {
  try {
    await userHelpers.removeFromCart(req.body.cartId, req.body.proId);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error removing item from cart:", error);
    res.json({ success: false, message: "Error removing item" });
  }
});

/* -------------------- CHECKOUT PAGE -------------------- */
router.get("/place-order", verifyLogin, async (req, res) => {
  try {
    const total = await userHelpers.getTotalAmount(req.session.user._id);
    res.render("user/place-order", {
      total,
      user: req.session.user,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID, // ✅ Pass Razorpay Key to frontend
    });
  } catch (err) {
    console.error("❌ Error loading checkout page:", err);
    res.status(500).json({ error: "Failed to load checkout page" });
  }
});

/* -------------------- PLACE ORDER -------------------- */
router.post("/place-order", async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId || userId.length !== 24) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    const products = await userHelpers.getCartProductList(userId);
    const totalPrice = await userHelpers.getTotalAmount(userId);
    const orderId = await userHelpers.placeOrder(req.body, products, totalPrice);

    if (req.body["payment-method"] === "COD") {
      // ✅ COD → Direct success
      return res.json({ codSuccess: true });
    } else {
      // ✅ Online payment → Generate Razorpay order
      const razorpayOrder = await userHelpers.generateRazorpay(orderId, totalPrice);
      return res.json({
        razorpayOrder,
        orderId: orderId.toString(),
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID, // ✅ Send key to frontend too
      });
    }
  } catch (err) {
    console.error("❌ Order placement failed:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* -------------------- ORDER SUCCESS PAGE -------------------- */
router.get("/order-success", verifyLogin, (req, res) => {
  res.render("user/order-success", { user: req.session.user });
});

/* -------------------- ORDERS PAGE -------------------- */
router.get("/orders", verifyLogin, async (req, res) => {
  try {
    const orders = await userHelpers.getUserOrders(req.session.user._id);
    res.render("user/orders", { user: req.session.user, orders });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).send("Error loading orders");
  }
});

/* -------------------- VIEW ORDER PRODUCTS -------------------- */
router.get("/view-order-products/:id", verifyLogin, async (req, res) => {
  try {
    const products = await userHelpers.getOrderProducts(req.params.id);
    res.render("user/view-order-products", { user: req.session.user, products });
  } catch (err) {
    console.error("❌ Error fetching order products:", err);
    res.status(500).send("Error loading order products");
  }
});

/* -------------------- VERIFY PAYMENT -------------------- */
router.post("/verify-payment", async (req, res) => {
  try {
    const paymentDetails = {
      payment_id: req.body.razorpay_payment_id,
      order_id: req.body.razorpay_order_id,
      signature: req.body.razorpay_signature,
    };

    await userHelpers.verifyPayment(paymentDetails);
    await userHelpers.changePaymentStatus(req.body.mongo_order_id);

    res.json({ status: true });
  } catch (err) {
    console.error("❌ Payment verification failed:", err);
    res.status(500).json({ status: false, error: "Payment verification failed" });
  }
});

module.exports = router;
