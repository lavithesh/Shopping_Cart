var connectdb = require("../config/connection");
var collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { response } = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { connect } = require("http2");
module.exports = {
  AdminDoLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let admin = await connectdb
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt
          .compare(adminData.Password, admin.Password)
          .then((result) => {
            if (result) {
              console.log("login success");
              response.admin = admin;
              response.status = true;
              resolve(response);
            } else {
              console.log("login failed");
              resolve({ status: false });
            }
          })
          .catch((err) => {
            reject(err);
          });
        },


}
