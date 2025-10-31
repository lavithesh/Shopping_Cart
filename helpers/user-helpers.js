var connectdb = require("../config/connection");
var collection = require('../config/collection');
const bcrypt = require('bcryptjs');
const { response } = require("express");
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const Razorpay=require('razorpay');
const crypto = require('crypto');
const { connect } = require("http2");

var razorpayInstance = new Razorpay({
    key_id: 'rzp_test_tMxLVHtDhuJATA',
    key_secret: 'QIalfYsziCg53NGe1gTG748s',
  });

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10);
            connectdb.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                console.log(data);
                resolve(data.insertedId);
            }).catch((err) => {
                reject(err);
            });
        });
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {};
            let user = await connectdb.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((result) => {
                    if (result) {
                        console.log("login success");
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    } else {
                        console.log("login failed");
                        resolve({ status: false });
                    }
                }).catch((err) => {
                    reject(err);
                });
            } else {
                console.log("login failed");
                resolve({ status: false });
            }
        });
    },
    addToCart: (proId, userId) => {
        let ProObj = {
            item: new ObjectId(proId),
            quantity: 1
        };
        return new Promise(async (resolve, reject) => {
            let userCart = await connectdb.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item.toString() === proId);
                console.log(proExist);
                if (proExist !== -1) {
                    connectdb.get().collection(collection.CART_COLLECTION).updateOne(
                        { user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                } else {
                    connectdb.get().collection(collection.CART_COLLECTION)
                        .updateOne(
                            { user: new ObjectId(userId) },
                            {
                                $push: {
                                    products: ProObj
                                }
                            }
                        )
                        .then((response) => {
                            resolve(response);
                        }).catch((err) => {
                            reject(err);
                        });
                }
            } else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [ProObj]
                };
                connectdb.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cartItems = await connectdb.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: new ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    {
                        $unwind: '$productDetails'
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            productDetails: {
                                _id: '$productDetails._id',
                                Name: '$productDetails.Name',
                                Category: '$productDetails.Category',
                                Price: '$productDetails.Price',
                                Description:'$productDetails.Description',
                            }
                        }
                    }
                ]).toArray();
                console.log(cartItems);
                resolve(cartItems);
            } catch (err) {
                reject(err);
            }
        });
    },

   

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await connectdb.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (cart) {
                count = cart.products.length;
            }
            resolve(count);
        });
    },
    changeProductQuantity: ({ cartId, proId, count }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const cart = await connectdb.get().collection(collection.CART_COLLECTION).findOne(
                    { _id: new ObjectId(cartId), 'products.item': new ObjectId(proId) }
                );
    
                const product = cart.products.find(product => product.item.toString() === proId);
                const newQuantity = product.quantity + count;
    
                if (newQuantity <= 0) {
                    // Remove the product from the cart
                    await connectdb.get().collection(collection.CART_COLLECTION).updateOne(
                        { _id: new ObjectId(cartId) },
                        {
                            $pull: { products: { item: new ObjectId(proId) } }
                        }
                    );
                    resolve({ removed: true });
                } else {
                    // Update the quantity
                    await connectdb.get().collection(collection.CART_COLLECTION).updateOne(
                        { _id: new ObjectId(cartId), 'products.item': new ObjectId(proId) },
                        {
                            $set: { 'products.$.quantity': newQuantity }
                        }
                    );
                    resolve({ updated: true });
                }
            } catch (err) {
                reject(err);
            }
        });
    },
    removeFromCart: (cartId, proId) => {
        return new Promise(async (resolve, reject) => {
            try {
                await connectdb.get().collection(collection.CART_COLLECTION).updateOne(
                    { _id: new ObjectId(cartId) },
                    {
                        $pull: { products: { item: new ObjectId(proId) } }
                    }
                );
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    },


    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let total = await connectdb.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: new ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'products.item',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    {
                        $unwind: '$productDetails'
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: { $multiply: [{ $toInt: '$products.quantity' },{ $toInt: '$productDetails.Price'} ] } }
                        }
                    }
                ]).toArray();
    
                if (total.length > 0) {
                    resolve(total[0].totalAmount);
                } else {
                    resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    },
    placeOrder: (orderData, products, totalPrice) => {
        return new Promise((resolve, reject) => {
          const orderObj = {
            deliveryDetails: {
              address: orderData.address,
              pincode: orderData.pincode,
              mobile: orderData.mobile,
            },
            userId:new ObjectId(orderData.userId),
            paymentMethod: orderData['payment-method'],
            products: products,
            totalAmount: totalPrice,
            status: orderData['payment-method'] === 'COD' ? 'Placed' : 'Pending',
            date: new Date(),
          };
          connectdb.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj)
          .then((response) => {
            connectdb.get().collection(collection.CART_COLLECTION).deleteOne({user:new ObjectId(orderData.userId)})
            resolve(response.insertedId);
          }).catch((err) => {
            reject(err);
          });
      });
    },
  
    getCartProductList:(userId)=>{
         return new Promise(async (resolve,reject)=>{
            let cart=await connectdb.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            console.log(cart);
            resolve(cart.products)
         })
    },
    getUserOrders:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            console.log(userId);
            let orders=await connectdb.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
            console.log(orders)
            resolve(orders)
        })

    },
    getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Querying the ORDER_COLLECTION instead of the CART_COLLECTION
            let orderItems = await connectdb.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new ObjectId(orderId) }  // Match the order by its ID
                },
                {
                    $unwind: '$products'  // Unwind the products array to get individual product details
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {  // Lookup to fetch product details from the PRODUCT_COLLECTION
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: '$productDetails'  // Unwind the productDetails array to get the product details object
                },
                {
                    $project: {  // Select fields to return
                        item: 1,
                        quantity: 1,
                        productDetails: {
                            _id: '$productDetails._id',
                            Name: '$productDetails.Name',
                            Category: '$productDetails.Category',
                            Price: '$productDetails.Price',
                            Description: '$productDetails.Description',
                        }
                    }
                }
            ]).toArray();

            console.log(orderItems);
            resolve(orderItems);
        } catch (err) {
            console.error("Error fetching order products:", err);
            reject(err);
        }

    });
},
generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
        const options = {
            amount: totalPrice * 100, // Amount in paise
            currency: "INR",
            receipt: ""+orderId.toString(),
        };

        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                console.error('Error creating Razorpay order:', err);
                reject(err);
            } else {
                resolve(order);
            }
        });
    });
},

verifyPayment: (paymentDetails) => {
    return new Promise((resolve, reject) => {
        let hmac = crypto.createHmac('sha256', 'QIalfYsziCg53NGe1gTG748s');
        hmac.update(paymentDetails.order_id + "|" + paymentDetails.payment_id);
        let generatedSignature = hmac.digest('hex');
        
        // Log the generated signature and the received signature
        console.log('Generated Signature:', generatedSignature);
        console.log('Received Signature:', paymentDetails.signature);
        
        if (generatedSignature === paymentDetails.signature) {
            resolve();
        } else {
            console.error('Payment verification failed:', paymentDetails);
            reject('Payment verification failed');
        }
    });
},
changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
        try {
            console.log('OrderId before ObjectId conversion:', orderId);

            // Convert orderId to ObjectId
            let objectId = new ObjectId(orderId);

            connectdb.get().collection(collection.ORDER_COLLECTION)
                .updateOne(
                    { _id: objectId },
                    { $set: { status: 'Placed' } }
                )
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    console.error('Error updating payment status:', err);
                    reject(err);
                });
        } catch (err) {
            console.error('Invalid orderId format:', err);
            reject(err);
        }
    });
},
getAdminOrders:(userId)=>{
    return new Promise(async (resolve,reject)=>{
        console.log(userId);
        let orders=await connectdb.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
        console.log(orders)
        resolve(orders)
    })
},

};