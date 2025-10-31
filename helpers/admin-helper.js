var connectdb = require("../config/connection");
var collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { response } = require("express");
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const Razorpay=require('razorpay');
const crypto = require('crypto');
const { connect } = require("http2");
module.exports = {
    AdminDoLogin:(adminData)=>{
        return new Promise(async (resolve, reject) => {
            let response = {};
            let admin = await connectdb.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email });
            if (admin) {
                bcrypt.compare(adminData.Password, admin.Password).then((result) => {
                    if (result) {
                        console.log("login success");
                        response.admin = admin;
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
    adminDoSignup :(adminData)=>{
        return new Promise(async (resolve, reject) => {
            adminData.Password = await bcrypt.hash(adminData.Password, 10);
            connectdb.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {
                console.log(data);
                resolve(data.insertedId);
            }).catch((err) => {
                reject(err);
            });
        });
    },
    getAllOrders:()=>{
    return new Promise(async (resolve, reject) => {
        try {
          let orders = await connectdb.get().collection(collection.ORDER_COLLECTION).find().toArray();
          resolve(orders);
        } catch (err) {
          reject(err);
        }
      });
    },
    getAllUsers:()=>{
        return new Promise(async (resolve, reject) => {
            try {
              let orders = await connectdb.get().collection(collection.USER_COLLECTION).find().toArray();
              resolve(orders);
            } catch (err) {
              reject(err);
            }
          });
        },


}
