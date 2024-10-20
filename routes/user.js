var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
var userHelpers=require('../helpers/user-helpers');
const session = require('express-session');
const verifylogin=((req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
})
/* GET home page. */
router.get('/', async function (req, res, next) {
let user=req.session.user
console.log(user);
let cartCount=null;
if(req.session.user){
 cartCount=await userHelpers.getCartCount(req.session.user._id)
}
  productHelpers.getAllProducts().then((products)=>{
    
    res.render('index',{products,user,cartCount});
  });
   })

   router.get('/login',(req,res)=>{
    if(req.session.userLoggedIn){
      res.redirect('/')
    }else{
    res.render('user/login',{"loginErr":req.session.userErr})
    req.session.userErr=false
    }
   })

   
   router.get('/signup',(req,res)=>{
    res.render('user/signup')
   })


   router.post('/sign',  (req,res)=>{
    console.log(req.body)
  userHelpers.doSignup (req.body).then((response)=>{
   
    req.session.userLoggedIn=true
    req.session.user=response
    res.redirect('/')
  })
  })


   router.post('/login',(req,res)=>{
    userHelpers.doLogin(req.body).then((response)=>{
      console.log(req.body)
      if(response.status){
        req.session.userLoggedIn=true
        req.session.user=response.user
        res.redirect('/')
      }else{
        req.session.userErr=true
        res.redirect('/login')
      }
    })

    
   })
   
   
   router.get('/logout',(req,res)=>{
    req.session.destroy()
    res.redirect('/')
   
   })

   router.get('/cart',verifylogin,async(req,res)=>{
    let products=await userHelpers.getCartProducts(req.session.user._id)
    let total = await userHelpers.getTotalAmount(req.session.user._id);
  
 
    console.log(products);
    res.render('user/cart',{products,user:req.session.user,total})
   }
  )
  router.get('/add-to-cart/:id',(req,res)=>{
    console.log('api call')
    
    userHelpers.addToCart(req.params.id,req.session.user._id).then((response)=>{
      res.json({status:true})
    })
  })

  router.post('/change-product-quantity', async (req, res) => {
    const { cartId, proId, count } = req.body;

    try {
        await userHelpers.changeProductQuantity({ cartId, proId, count }).then(()=>{
        
        })
        res.json({ success: true });
    } catch (error) {
        console.error('Error changing product quantity:', error);
        res.json({ success: false, message: 'Error updating quantity' });
    }

}),
router.post('/remove-from-cart', async (req, res) => {
  const { cartId, proId } = req.body;

  try {
      // Remove the item from the cart using the helper function
      await userHelpers.removeFromCart(cartId, proId);
      res.json({ success: true });
  } catch (error) {
      console.error('Error removing item from cart:', error);
      res.json({ success: false, message: 'Error removing item' });
  }
});
// GET Checkout Page
router.get('/place-order', verifylogin, async (req, res) => {
  try {
    const total = await userHelpers.getTotalAmount(req.session.user._id);
    res.render('user/place-order', { total, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load checkout page' });
  }
});

// POST Place Order
router.post('/place-order', async (req, res) => {
  try {
    const products = await userHelpers.getCartProductList(req.body.userId);
    const totalPrice = await userHelpers.getTotalAmount(req.body.userId);
    const orderId = await userHelpers.placeOrder(req.body, products, totalPrice);

    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true });
    } else {
      const razorpayOrder = await userHelpers.generateRazorpay(orderId, totalPrice);
      // Return the MongoDB orderId along with the Razorpay order
      res.json({ razorpayOrder, orderId:orderId.toString() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});


// GET Order Success Page
router.get('/order-success', verifylogin, async (req, res) => {
  try {
    
    res.render('user/order-success', { user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load order success page' });
  }
});
router.get('/orders',async(req,res)=>{
  const orders = await userHelpers.getUserOrders(req.session.user._id);
  res.render('user/orders', { user: req.session.user, orders })
})

router.get('/view-order-products/:id',async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user._id,products})
})

// POST Verify Payment
router.post('/verify-payment', async (req, res) => {
  try {
    const paymentDetails = {
      payment_id: req.body.razorpay_payment_id,
      order_id: req.body.razorpay_order_id, // Razorpay order_id
      signature: req.body.razorpay_signature,
    };

    console.log('Payment Details:', paymentDetails);

    await userHelpers.verifyPayment(paymentDetails);

    // Assuming you are passing the MongoDB orderId in the AJAX response
    const mongoOrderId = req.body.mongo_order_id; // This should be the actual MongoDB ObjectId
    console.log('MongoDB Order ID:', mongoOrderId);

    await userHelpers.changePaymentStatus(mongoOrderId);

    res.json({ status: true });
  } catch (err) {
    console.error('Payment verification failed:', err);
    res.status(500).json({ status: false, error: 'Payment verification failed' });
  }
});






  
module.exports = router;
