var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var adminHelpers = require("../helpers/admin-helper");
const path = require("path");

// ✅ Middleware for admin session verification
const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin/adminLogin");
  }
};

// ✅ Admin Dashboard — View All Products
router.get("/", async function (req, res) {
  try {
    const products = await productHelpers.getAllProducts();
    if (req.session.adminLoggedIn) {
      res.render("admin/view-products", { products, admin: true });
    } else {
      res.redirect("/admin/adminLogin");
    }
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ✅ Add Product Page
router.get("/add-products", verifyLogin, (req, res) => {
  res.render("admin/add-products", { admin: true });
});

// ✅ Add Product (POST)
router.post("/add-product", async (req, res) => {
  try {
    console.log(req.body);
    productHelpers.addProduct(req.body, async (id) => {
      if (req.files && req.files.Image) {
        const image = req.files.Image;
        const imagePath = path.join(__dirname, "../public/product-images/", id + ".png");

        image.mv(imagePath, (err) => {
          if (err) {
            console.error("Error saving image:", err);
          } else {
            console.log("✅ Image uploaded:", imagePath);
          }
          res.render("admin/add-products", { admin: true });
        });
      } else {
        console.warn("⚠️ No image uploaded for this product.");
        res.render("admin/add-products", { admin: true });
      }
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Error adding product");
  }
});

// ✅ Delete Product
router.get("/delete-products/:id", verifyLogin, async (req, res) => {
  try {
    await productHelpers.deleteProducts(req.params.id);
    res.redirect("/admin/");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Error deleting product");
  }
});

// ✅ Edit Product Page
router.get("/edit-products/:id", verifyLogin, async (req, res) => {
  try {
    const product = await productHelpers.getProductDetails(req.params.id);
    if (product) {
      res.render("admin/edit-products", { product, admin: true });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Error loading product:", err);
    res.status(500).send("Error loading product");
  }
});

// ✅ Edit Product (POST)
router.post("/edit-product/:id", async (req, res) => {
  try {
    await productHelpers.updateProducts(req.params.id, req.body);

    if (req.files && req.files.Image) {
      const image = req.files.Image;
      const imagePath = path.join(__dirname, "../public/product-images/", req.params.id + ".png");

      image.mv(imagePath, (err) => {
        if (err) console.error("Error updating image:", err);
        else console.log("✅ Product image updated:", imagePath);
      });
    }

    res.redirect("/admin/");
  } catch (err) {
    console.error("Error editing product:", err);
    res.status(500).send("Error editing product");
  }
});

// ✅ Admin Login Page
router.get("/adminLogin", (req, res) => {
  if (req.session.adminLoggedIn) {
    return res.redirect("/admin/");
  }
  res.render("admin/adminLogin", {
    admin: true,
    adminLoginErr: req.session.adminErr,
  });
  req.session.adminErr = false;
});

// ✅ Admin Login (POST)
router.post("/adminLogin", async (req, res) => {
  try {
    const response = await adminHelpers.AdminDoLogin(req.body);
    if (response.status) {
      req.session.adminLoggedIn = true;
      req.session.admin = response.admin;
      res.redirect("/admin/");
    } else {
      req.session.adminErr = true;
      res.redirect("/admin/adminLogin");
    }
  } catch (err) {
    console.error("Admin login failed:", err);
    res.status(500).send("Login Error");
  }
});

// ✅ Admin Logout
router.get("/adminLogout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/adminLogin");
  });
});

// ✅ Admin Signup Page
router.get("/adminSignup", (req, res) => {
  res.render("admin/adminSignup", { admin: true });
});

// ✅ Admin Signup (POST)
router.post("/adminSignup", async (req, res) => {
  try {
    const response = await adminHelpers.adminDoSignup(req.body);
    req.session.adminLoggedIn = true;
    req.session.admin = response;
    res.redirect("/admin/");
  } catch (err) {
    console.error("Admin signup failed:", err);
    res.status(500).send("Signup Failed");
  }
});

// ✅ All Orders
router.get("/allOrders", verifyLogin, async (req, res) => {
  try {
    const orders = await adminHelpers.getAllOrders();
    const users = await adminHelpers.getAllUsers(); // 👈 Add this
    res.render("admin/userOrders", { orders, users, admin: true });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Error fetching orders");
  }
});

// ✅ All Users
router.get("/allUsers", verifyLogin, async (req, res) => {
  try {
    const users = await adminHelpers.getAllUsers();
    res.render("admin/adminUsers", { users, admin: true });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

module.exports = router;
