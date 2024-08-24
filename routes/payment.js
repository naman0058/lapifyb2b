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
const emailTemplates = require('./emailTemplates');


 function hmac_sha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

const Razorpay = require("razorpay");
var instance = new Razorpay({
    key_id: 'rzp_test_htmhBsjoS9btm0',
    key_secret: 'uYtSO5ly2TfqM8Cxx0lCgY9t',
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
    const userid = req.query.userid;
  
    const cartResults = await queryAsync(`
        SELECT c.*, 
               (SELECT p.category FROM product p WHERE p.id = c.productid) AS category,
               (SELECT p.price FROM product p WHERE p.id = c.productid) AS productprice
        FROM cart c
        WHERE c.userid = ? and quantity > 0`, [userid]);

    if (!Array.isArray(cartResults)) {
        throw new Error('Failed to fetch cart results');
    }

    let total_amount = 0;


    cartResults.forEach(item => {
        const amount = item.productprice * item.quantity;
        total_amount += amount;

    })

    let payable_amount = total_amount;
  
  
   
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



   router.get('/wallet-generate-order',async(req,res)=>{
    const amount = req.query.amount;
  
   
  
  
   
  var options = {
    amount: amount*100,  // amount in the smallest currency unit
    // amount: 100,  // amount in the smallest currency unit
    currency: "INR",
    receipt: generatereceipt()
  };
  instance.orders.create(options, function(err, order) {
    console.log(order);
    res.json(order)
  });
   })
  


   router.get('/open-payment',(req,res)=>{
    res.render('openpayment',{order:req.query.order})
   })


   router.get('/wallet-open-payment',(req,res)=>{
    res.render('walletopenpayment',{order:req.query.order})
   })


   router.get('/razorpay-response',(req,res)=>{
    res.json({msg:'cancelled'})
   })


   router.get('/wallet-razorpay-response',(req,res)=>{
    res.json({msg:'cancelled'})
   })




//    router.post('/razorpay-response', async (req, res) => {
//     let body = req.body;
  
//     if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
//       const data = req.query.orderid + '|' + body.razorpay_payment_id;
//       let generated_signature = hmac_sha256(data, 'M3PlBQetVxVHN6SX3PkqtooV');
  
//       console.log('razorpayresponse',body)
//       console.log('generated_signature',generated_signature)


//       if (generated_signature == body.razorpay_signature) {
//         body.orderid = req.query.orderid
//         body.amount = req.query.amount;
//         body.txnid = req.query.orderid;
//         body.userid = req.query.userid;
//         body.created_at = verify.getCurrentDate();
  
//         pool.query(`INSERT INTO payment_response SET ?`, body, async(err, result) => {
//           if (err) throw err;
//           else {
//             try {
//                 const orderid = req.query.orderid
//                 const created_at = verify.getCurrentDate();
//                 const userid = req.query.userid;
//                 const address = req.query.address;
        
//                 // Fetch products from the cart
//                 const cartResults = await queryAsync(`
//                     SELECT c.*, 
//                            (SELECT p.category FROM product p WHERE p.id = c.productid) AS category,
//                            (SELECT p.price FROM product p WHERE p.id = c.productid) AS productprice
//                     FROM cart c
//                     WHERE c.userid = ? and quantity > 0`, [userid]);
        
//                 if (!Array.isArray(cartResults)) {
//                     throw new Error('Failed to fetch cart results');
//                 }
        
//                 let total_amount = 0;
//                 let bookingData = [];
        
//                 // Calculate total amount and prepare booking data
//                 cartResults.forEach(item => {
//                     const amount = item.productprice * item.quantity;
//                     total_amount += amount;
        
//                     bookingData.push({
//                         userid,
//                         orderid,
//                         productid: item.productid,
//                         amount,
//                         created_at,
//                         category: item.category,
//                         quantity: item.quantity,
//                         address,
//                     status: 'pending',
        
//                     });
//                 });
        
//                 // Insert booking data into 'booking' table
//                 await Promise.all(bookingData.map(data => queryAsync(`INSERT INTO booking SET ?`, data)));
        
//                 // Insert order data into 'orders' table
//                 const orderData = {
//                     userid,
//                     orderid,
//                     created_at,
//                     status: 'pending',
//                     amount: total_amount,
//                     address,
//                     updated_at:created_at
        
//                 };
//                 await queryAsync(`INSERT INTO orders SET ?`, orderData);
//                 await queryAsync(`DELETE FROM cart WHERE userid = ? AND quantity > 0`, [userid]);
        
//                 res.json({ msg: 'success' });
//             } catch (err) {
//                 console.error(err);
//                 res.status(500).json({ msg: 'An error occurred' });
//             }


//           }
//         });
//       } else {
//         res.json({ msg: 'Unauthorized Payment' });
//       }
//     } else {
//       res.json({ msg: 'Error Occurred' });
//     }
//   });




router.get('/razorpay-success', async (req, res) => {
    let body = req.query;
  
    if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
      const data = req.query.orderid + '|' + body.razorpay_payment_id;
      let generated_signature = hmac_sha256(data, 'M3PlBQetVxVHN6SX3PkqtooV');
  
      console.log('razorpayresponse',body)
      console.log('generated_signature',generated_signature)


      if (generated_signature == body.razorpay_signature) {
        body.orderid = req.query.orderid
        body.amount = req.query.amount/100;
        body.txnid = req.query.orderid;
        body.userid = req.query.userid;
        body.type = req.query.type;

        body.created_at = verify.getCurrentDate();
  
        pool.query(`select * from payment_response where razorpay_signature = '${body.razorpay_signature}' and razorpay_payment_id = '${body.razorpay_payment_id}' and razorpay_order_id = '${body.razorpay_order_id}'`,(err,result)=>{

            if(err) throw err;
            else if(result.length>0){
           res.json({msg:'success',description:'alreadydone'})
            }
            else{

          
        pool.query(`INSERT INTO payment_response SET ?`, body, async(err, result) => {
          if (err) throw err;
          else {
            try {
                const orderid = req.query.orderid
                const created_at = verify.getCurrentDate();
                const userid = req.query.userid;
                const address = req.query.address;
        
                // Fetch products from the cart
                const cartResults = await queryAsync(`
                    SELECT c.*, 
                           (SELECT p.category FROM product p WHERE p.id = c.productid) AS category,
                           (SELECT p.price FROM product p WHERE p.id = c.productid) AS productprice
                    FROM cart c
                    WHERE c.userid = ? and quantity > 0`, [userid]);
        
                if (!Array.isArray(cartResults)) {
                    throw new Error('Failed to fetch cart results');
                }
        
                let total_amount = 0;
                let bookingData = [];
        
                // Calculate total amount and prepare booking data
                cartResults.forEach(item => {
                    const amount = item.productprice * item.quantity;
                    total_amount += amount;
        
                    bookingData.push({
                        userid,
                        orderid,
                        productid: item.productid,
                        amount,
                        created_at,
                        category: item.category,
                        quantity: item.quantity,
                        address,
                    status: 'pending',
        
                    });
                });
        
                // Insert booking data into 'booking' table
                await Promise.all(bookingData.map(data => queryAsync(`INSERT INTO booking SET ?`, data)));
        
                // Insert order data into 'orders' table
                const orderData = {
                    userid,
                    orderid,
                    created_at,
                    status: 'pending',
                    amount: total_amount,
                    address,
                    updated_at:created_at
        
                };
                await queryAsync(`INSERT INTO orders SET ?`, orderData);
                await queryAsync(`DELETE FROM cart WHERE userid = ? AND quantity > 0`, [userid]);


                let userDetails = await verify.profile(userid)

                const userMessage = emailTemplates.orderCreation.userMessage(orderid , userDetails[0].name ,orderData.amount ,created_at , address );
                const adminMessage = emailTemplates.orderCreation.adminMessage(orderid , userDetails[0].name ,orderData.amount ,created_at , address  );
                const adminSubject = emailTemplates.orderCreation.adminSubject.replace('{{Order_Number}}', orderid);
                const userSubject = emailTemplates.orderCreation.userSubject.replace('{{Order_Number}}', orderid);



                await verify.sendUserMail(userDetails[0].email,userSubject,userMessage)
                await verify.sendUserMail('jnaman345@gmail.com',adminSubject,adminMessage)
                                   
        
                res.json({ msg: 'success' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ msg: 'An error occurred' });
            }


          }
        });
    }
    })
      } else {
        res.json({ msg: 'Unauthorized Payment' });
      }
    } else {
      res.json({ msg: 'Error Occurred' });
    }
  });



  router.get('/wallet-razorpay-success', async (req, res) => {
    let body = req.query;
  
    if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
      const data = req.query.orderid + '|' + body.razorpay_payment_id;
      let generated_signature = hmac_sha256(data, 'M3PlBQetVxVHN6SX3PkqtooV');
  
      console.log('razorpayresponse',body)
      console.log('generated_signature',generated_signature)


      if (generated_signature == body.razorpay_signature) {
        body.orderid = req.query.orderid
        body.amount = req.query.amount/100;
        body.txnid = req.query.orderid;
        body.userid = req.query.userid;
        body.type = req.query.type;

        body.created_at = verify.getCurrentDate();

        pool.query(`select * from payment_response where razorpay_signature = '${body.razorpay_signature}' and razorpay_payment_id = '${body.razorpay_payment_id}' and razorpay_order_id = '${body.razorpay_order_id}'`,(err,result)=>{
            if(err) throw err;
            else if(result.length>0){
                res.json({msg:'success',des:'alreadydone'})
            }
            else{
                pool.query(`INSERT INTO payment_response SET ?`, body, async(err, result) => {
                    if (err) throw err;
                    else {

                     pool.query(`insert into transaction(userid,amount,status,orderid,color,created_at,txnid) values('${body.userid}' , '${body.amount}' , 'credit' , '${body.orderid}' , 'green' , '${body.created_at}' , '${body.razorpay_payment_id}')`,async(err,result)=>{
                        if(err) throw err;
                        else {
                            pool.query(`update users set wallet = wallet+${body.amount} where id = '${body.userid}'`,async(err,result)=>{
                                if(err) throw err;
                               
                                else{
                                    let userDetails = await verify.profile(body.userid)

                                    const userMessage = emailTemplates.paymentConfirmation.userMessage(userDetails[0].name, body.amount, body.razorpay_payment_id,body.orderid);
                                    const adminMessage = emailTemplates.paymentConfirmation.adminMessage(userDetails[0].name, body.amount, body.razorpay_payment_id,body.orderid);


                                    await verify.sendUserMail(userDetails[0].email,emailTemplates.paymentConfirmation.userSubject,userMessage)
                                    await verify.sendUserMail('jnaman345@gmail.com',emailTemplates.paymentConfirmation.adminSubject,adminMessage)
                                   
                                    res.json({msg:'success'})
                                }
                                    
                              })
                        }
                     })   
          
                  
          
          
                    }
                  });
            }
        })
  
       
      } else {
        res.json({ msg: 'Unauthorized Payment' });
      }
    } else {
      res.json({ msg: 'Error Occurred' });
    }
  });






  module.exports = router;