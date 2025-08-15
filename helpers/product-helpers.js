const connectdb = require("../config/connection")
var collection=require('../config/collection')
var ObjectId=require('mongodb').ObjectId

module.exports={
    addProduct: (product,callback)=>{
       connectdb.get().collection('product').insertOne(product).then((data)=>{
        console.log(data)
        callback(data.insertedId)
      })
        
    },
    getAllProducts:()=>{
      return new Promise(async (resolve,reject)=>{
        let products=await connectdb.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
        
        resolve(products)
        
      })
    },
    deleteProducts:(prodId)=>{
      return new Promise((resolve,reject)=>{
        connectdb.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id: new ObjectId(prodId)}).then((response)=>{
          resolve (response)
        })
      })
    },
    getProductDetails:(proId)=>{
      return new Promise((resolve,reject)=>{
        connectdb.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new ObjectId(proId)}).then((response)=>{
          resolve(response)
        })
      })
    },
    updateProducts:(proId,prodDetails)=>{
      return new Promise((resolve,reject)=>{
        connectdb.get().collection(collection.PRODUCT_COLLECTION).
        updateOne({_id:new ObjectId(proId)}, {
          $set :{
            Name:prodDetails.Name,
            Category:prodDetails.Category,
            Price:prodDetails.Price,
            Description:prodDetails.Description

          }
                     }).then((response)=>{
          resolve(response)
        })
      })
    }
}
