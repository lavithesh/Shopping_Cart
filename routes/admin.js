var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
var adminHelpers=require('../helpers/admin-helper');
const session = require('express-session');

const verifylogin=((req,res, next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/adminLogin')
  }
})
const verify=((req,res, next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin#')
  }
})

/* GET users listing. */
router.get('/',async function(req, res, next) {
  await productHelpers.getAllProducts().then((products)=>{
  console.log(products)
  if(req.session.adminLoggedIn){
  res.render('admin/view-products',{products,admin:true});
  }else{
    res.redirect('/admin/adminLogin')
  }
});
 })
 
router.get('/add-products',verify,function(req,res){
  res.render('admin/add-products' )
});



router.post('/add-product',async (req,res)=>{
   console.log(req.body)
productHelpers.addProduct(req.body,async(id)=>{
  let image=req.files.Image
  image.mv('./public/product-images/'+id+'.png',(err,done)=>{
    if(!err){
      res.render("admin/add-products")
    }
  })
})
})



  router.get('/delete-products/:id',verify,(req,res)=>{
    let proId=req.params.id
    console.log(proId)
    productHelpers.deleteProducts(proId).then((response)=>{
      res.redirect('/admin/')
    })

  })
  router.get('/edit-products/:id',verify,async (req,res)=>{
    let product=await productHelpers.getProductDetails(req.params.id)
    console.log(product)
      res.render('admin/edit-products',{product,admin:true})
    })
    router.post('/edit-product/:id',(req,res)=>{
      productHelpers.updateProducts(req.params.id,req.body).then((response)=>{
        res.render('admin/edit-products' ,{admin:true})
        if(req.files.Image){
          let id=req.params.id
          let image=req.files.Image
           image.mv('./public/product-images/'+id+'.png')
        }
      })
     
    }),
    router.get('/adminLogin', (req, res) => {
      if(req.session.adminLoggedIn){
        res.redirect('/admin/')
      }else{
        res.render('admin/adminLogin',{admin:true,"adminLoginErr":req.session.adminErr}); 
        req.session.adminErr=false
      }
       // Render your login view here
  });
  router.post('/adminLogin',(req, res) => {
   
      adminHelpers.AdminDoLogin(req.body).then((response)=>{
        if(response.status){
          req.session.adminLoggedIn=true
          req.session.admin=response.admin
          res.redirect('/admin/')
        }else{
          req.session.adminErr=true
          res.redirect('/adminLogin')
        }
      })
     
    })
    router.get('/adminLogout',(req,res)=>{
      req.session.destroy()
      res.redirect('/admin/')
    })
   
  router.get('/adminSignup',(req,res)=>{
    res.render('admin/adminSignup',{admin:true})
   });

   router.post('/adminSignup', (req,res)=>{
    adminHelpers.adminDoSignup (req.body).then((response)=>{
      req.session.adminLoggedIn=true
      req.session.admin=response
      res.redirect('/admin/', {admin:true})
    })
}),
// Fetch all orders
router.get('/allOrders', verifylogin, async (req, res) => {
  try {
    const orders = await adminHelpers.getAllOrders(); // Assuming this helper function fetches all orders from the database
    console.log(orders)
    const users = await adminHelpers.getAllUsers();
    res.render('admin/userOrders', { orders,users, admin: true });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Error fetching orders');
  }
});
// Fetch all users
router.get('/allUsers', verifylogin, async (req, res) => {
  try {
    const users = await adminHelpers.getAllUsers();
    console.log(users) // Assuming this helper function fetches all users from the database
    res.render('admin/adminUsers', { users, admin: true });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error fetching users');
  }
});


    
module.exports = router;
   