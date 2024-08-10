var express = require("express");
var router = express.Router();
var pool = require("./pool");
var verify = require("./verify");
const fs = require("fs");
const xlsx = require("xlsx");
var upload = require('./multer');
var user = require('./function');
var isimage = ['accessories','refurbished_parts','new_parts' ,'parts ']
var laptopfilter = ['laptop']
var mobilefilter = ['mobile']
var applefilter = ['apple']

var databasetable = 'product'


const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);

const crypto = require('crypto');

 function hmac_sha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

const Razorpay = require("razorpay");
var instance = new Razorpay({
    key_id: 'rzp_test_c9ZSQoNdAZavNr',
    key_secret: 'M3PlBQetVxVHN6SX3PkqtooV',
  });


  function generatereceipt() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let receipt = 'order_rcptid_';
    for (let i = 0; i < 12; i++) {
      receipt += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return receipt;
}


  router.get('/generate-order',async(req,res)=>{
    let result =  await user.getOrderDetails(req.query.orderid);
    let payable_amount = result[0].remaining_payment;
  
  
   
  var options = {
    amount: payable_amount*100,  // amount in the smallest currency unit
    // amount: 100,  // amount in the smallest currency unit
    currency: "INR",
    receipt: generatereceipt()
  };
  instance.orders.create(options, function(err, order) {
    console.log(order);
    res.json(order)
  });
   })
  




   router.post('/razorpay-response', async (req, res) => {
    let body = req.body;
  
    if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
      const data = req.session.generateOrderId + '|' + body.razorpay_payment_id;
      let generated_signature = hmac_sha256(data, 'M3PlBQetVxVHN6SX3PkqtooV');
  
      if (generated_signature == body.razorpay_signature) {
        body.orderid = req.query.orderid;
        body.type = req.query.type;
        body.amount = req.session.payable_amount;
        body.generateOrderId = req.session.generateOrderId;
        body.userid = req.session.userid;
        body.created_at = verify.getCurrentDate();
  
        pool.query(`INSERT INTO payment_response SET ?`, body, (err, result) => {
          if (err) throw err;
          else {
            pool.query(`UPDATE orders SET advance_payment = advance_payment + ${body.amount}, remaining_payment = remaining_payment - ${body.amount}, status = 'ongoing' WHERE orderid = '${body.orderid}'`, async (err, result) => {
              if (err) throw err;
              else {
                let userSubject = `Payment Confirmation for Your Recent Transaction`;
                let userMessage = `
                  <p>Dear ${req.session.username},</p>
                  
                  <p>Thank you for your recent payment. We are pleased to inform you that your payment of ${req.session.payable_amount} has been successfully processed.</p>
                  
                  <p><strong>Transaction Details:</strong></p>
                  <p>- <strong>Transaction ID:</strong> ${body.razorpay_payment_id}</p>
                  <p>- <strong>Order ID:</strong> ${req.query.orderid}</p>
                  <p>- <strong>Amount:</strong> ${req.session.payable_amount}</p>
                  <p>- <strong>Date:</strong> ${verify.getCurrentDate()}</p>
                  
                  <p>If you have any questions or need further assistance, please do not hesitate to contact us.</p>
                  
                  <p>Thank you for choosing WordCreation.</p>
                  
                  <p>Best regards,</p>
                  <p>The WordCreation Team</p>
                  <p>support@wordcreation.ind</p>
                  <p>https://wordcreation.in</p>
                `;
  
                let adminSubject = `Payment Received Confirmation`;
                let adminMessage = `
                  <p>Dear Admin,</p>
                  
                  <p>We have successfully received a payment from ${req.session.username} for ${req.session.payable_amount}. Please find the details of the transaction below:</p>
                  
                  <p><strong>Transaction Details:</strong></p>
                  <p>- <strong>User Name:</strong> ${req.session.username}</p>
                  <p>- <strong>Transaction ID:</strong> ${body.razorpay_payment_id}</p>
                  <p>- <strong>Order ID:</strong> ${req.query.orderid}</p>
                  <p>- <strong>Amount:</strong> ${req.session.payable_amount}</p>
                  <p>- <strong>Date:</strong> ${verify.getCurrentDate()}</p>
                  
                  <p>Please update your records accordingly and let us know if any further action is required.</p>
                  
                  <p>Thank you for your attention to this matter.</p>
                  
                   <p>Best regards,</p>
                  <p>The WordCreation Team</p>
                  <p>support@wordcreation.ind</p>
                  <p>https://wordcreation.in</p>
                `;
  
                // await verify.sendUserMail(req.session.useremail, userSubject, userMessage);
                // await verify.sendUserMail('contact@wordcreation.in', adminSubject, adminMessage);
  
                res.json({msg:'success'})
              }
            });
          }
        });
      } else {
        res.json({ msg: 'Unauthorized Payment' });
      }
    } else {
      res.json({ msg: 'Error Occurred' });
    }
  });







  module.exports = router;