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






// working but commented due to smooth functionality

// router.get('/razorpay-success', async (req, res) => {
//     let body = req.query;
  
//     if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
//       const data = req.query.orderid + '|' + body.razorpay_payment_id;
//       let generated_signature = hmac_sha256(data, 'uYtSO5ly2TfqM8Cxx0lCgY9t');
  
//       console.log('razorpayresponse',body)
//       console.log('generated_signature',generated_signature)


//       if (generated_signature == body.razorpay_signature) {
//         body.orderid = req.query.orderid
//         body.amount = req.query.amount/100;
//         body.txnid = req.query.orderid;
//         body.userid = req.query.userid;
//         body.type = req.query.type;

//         body.created_at = verify.getCurrentDate();
  
//         pool.query(`select * from payment_response where razorpay_signature = '${body.razorpay_signature}' and razorpay_payment_id = '${body.razorpay_payment_id}' and razorpay_order_id = '${body.razorpay_order_id}'`,(err,result)=>{

//             if(err) throw err;
//             else if(result.length>0){
//            res.json({msg:'success',description:'alreadydone'})
//             }
//             else{

          
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


//                 let userDetails = await verify.profile(userid)

//                 const userMessage = emailTemplates.orderCreation.userMessage(orderid , userDetails[0].name ,orderData.amount ,created_at , address );
//                 const adminMessage = emailTemplates.orderCreation.adminMessage(orderid , userDetails[0].name ,orderData.amount ,created_at , address  );
//                 const adminSubject = emailTemplates.orderCreation.adminSubject.replace('{{Order_Number}}', orderid);
//                 const userSubject = emailTemplates.orderCreation.userSubject.replace('{{Order_Number}}', orderid);



//                 await verify.sendUserMail(userDetails[0].email,userSubject,userMessage)
//                 await verify.sendUserMail('jnaman345@gmail.com',adminSubject,adminMessage)
                                   
        
//  await verify.sendWhatsAppMessage(
//                     '+91' + userDetails[0].number,
//                     'order_processing',
//                     'en_US',
//                     [userDetails[0].name,orderid],
                    
//                 );


//                 res.json({ msg: 'success' });
//             } catch (err) {
//                 console.error(err);
//                 res.status(500).json({ msg: 'An error occurred' });
//             }


//           }
//         });
//     }
//     })
//       } else {
//         res.json({ msg: 'Unauthorized Payment' });
//       }
//     } else {
//       res.json({ msg: 'Error Occurred' });
//     }
//   });


router.get('/razorpay-success', async (req, res) => {
  const body = { ...req.query };

  if (!(body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature)) {
    return res.json({ msg: 'Error Occurred' });
  }

  // Verify signature
  const data = req.query.orderid + '|' + body.razorpay_payment_id;
  const generated_signature = hmac_sha256(data, 'uYtSO5ly2TfqM8Cxx0lCgY9t');

  console.log('razorpayresponse', body);
  console.log('generated_signature', generated_signature);

  if (generated_signature !== body.razorpay_signature) {
    return res.json({ msg: 'Unauthorized Payment' });
  }

  // Prepare fields for DB
  body.orderid = req.query.orderid;
  body.amount = Number(req.query.amount || 0) / 100;
  body.txnid = req.query.orderid;
  body.userid = req.query.userid;
  body.type = req.query.type;
  body.created_at = verify.getCurrentDate();

  // Idempotency check
  pool.query(
    `SELECT 1 FROM payment_response 
     WHERE razorpay_signature = ? 
       AND razorpay_payment_id = ? 
       AND razorpay_order_id = ?`,
    [body.razorpay_signature, body.razorpay_payment_id, body.razorpay_order_id],
    (err, result) => {
      if (err) {
        console.error('payment_response select err:', err);
        return res.status(500).json({ msg: 'Internal error' });
      }

      if (result.length > 0) {
        // Already processed: return immediately
        return res.json({ msg: 'success', description: 'alreadydone' });
      }

      // Insert payment response
      pool.query(`INSERT INTO payment_response SET ?`, body, async (err2) => {
        if (err2) {
          console.error('payment_response insert err:', err2);
          return res.status(500).json({ msg: 'Internal error' });
        }

        try {
          // Build order from cart (do the essential DB work synchronously)
          const orderid = req.query.orderid;
          const created_at = verify.getCurrentDate();
          const userid = req.query.userid;
          const address = req.query.address;

          const cartResults = await queryAsync(
            `SELECT c.*,
                    (SELECT p.category FROM product p WHERE p.id = c.productid) AS category,
                    (SELECT p.price    FROM product p WHERE p.id = c.productid) AS productprice
             FROM cart c
             WHERE c.userid = ? AND c.quantity > 0`,
            [userid]
          );

          if (!Array.isArray(cartResults)) throw new Error('Failed to fetch cart results');

          let total_amount = 0;
          const bookingData = cartResults.map((item) => {
            const amount = Number(item.productprice || 0) * Number(item.quantity || 0);
            total_amount += amount;
            return {
              userid,
              orderid,
              productid: item.productid,
              amount,
              created_at,
              category: item.category,
              quantity: item.quantity,
              address,
              status: 'pending',
            };
          });

          // Insert bookings
          await Promise.all(bookingData.map((row) => queryAsync(`INSERT INTO booking SET ?`, row)));

          // Insert order
          const orderData = {
            userid,
            orderid,
            created_at,
            status: 'pending',
            amount: total_amount,
            address,
            updated_at: created_at,
          };
          await queryAsync(`INSERT INTO orders SET ?`, orderData);

          // Clear cart
          await queryAsync(`DELETE FROM cart WHERE userid = ? AND quantity > 0`, [userid]);

          // ✅ Respond to the client NOW — all critical DB work done
          res.json({ msg: 'success', orderid });

          // 🔔 Fire-and-forget: email + WhatsApp in background
          setImmediate(async () => {
            try {
              const user = await verify.profile(userid);
              if (!user) return;

              const userMessage = emailTemplates.orderCreation.userMessage(
                orderid,
                user[0].name,
                orderData.amount,
                created_at,
                address
              );
              const adminMessage = emailTemplates.orderCreation.adminMessage(
                orderid,
                user[0].name,
                orderData.amount,
                created_at,
                address
              );
              const adminSubject = emailTemplates.orderCreation.adminSubject.replace('{{Order_Number}}', orderid);
              const userSubject = emailTemplates.orderCreation.userSubject.replace('{{Order_Number}}', orderid);

              // Email (no await chaining to keep independence)
              await Promise.allSettled([
                verify.sendUserMail(user[0].email, userSubject, userMessage),
                verify.sendUserMail('jnaman345@gmail.com', adminSubject, adminMessage),
              ]);


console.log('orderid',orderid)
console.log('user name',user.name)
console.log('user detailes',user)



              // WhatsApp (template must exist & params must match)
              await verify.sendWhatsAppMessage(
                '+91' + user[0].number,
                'order_processing', // your approved template
                'en_US',
                [user[0].name, String(orderid)] // ensure template has exactly 2 placeholders
              );
            } catch (bgErr) {
              // Just log; do NOT crash request lifecycle
              console.error('Background notify error:', bgErr?.response?.data || bgErr);
              // Optional: persist bg error in a table for re-tries
              // await queryAsync('INSERT INTO notify_failures SET ?', {...});
            }
          });
        } catch (e) {
          console.error('Order creation error:', e);
          return res.status(500).json({ msg: 'An error occurred' });
        }
      });
    }
  );
});

// running but slow
//   router.get('/wallet-razorpay-success', async (req, res) => {
//     let body = req.query;
//   console.log(req.query);
//     if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
//       const data = req.query.orderid + '|' + body.razorpay_payment_id;
//       let generated_signature = hmac_sha256(data, 'uYtSO5ly2TfqM8Cxx0lCgY9t');
  
//       console.log('razorpayresponse',body)
//       console.log('generated_signature',generated_signature)


//       if (generated_signature == body.razorpay_signature) {
//         body.orderid = req.query.orderid
//         body.amount = req.query.amount/100;
//         body.txnid = req.query.orderid;
//         body.userid = req.query.userid;
//         body.type = req.query.type;

//         body.created_at = verify.getCurrentDate();

//         pool.query(`select * from payment_response where razorpay_signature = '${body.razorpay_signature}' and razorpay_payment_id = '${body.razorpay_payment_id}' and razorpay_order_id = '${body.razorpay_order_id}'`,(err,result)=>{
//             if(err) throw err;
//             else if(result.length>0){
//                 res.json({msg:'success',des:'alreadydone'})
//             }
//             else{
//                 pool.query(`INSERT INTO payment_response SET ?`, body, async(err, result) => {
//                     if (err) throw err;
//                     else {

//                      pool.query(`insert into transaction(userid,amount,status,orderid,color,created_at,txnid) values('${body.userid}' , '${body.amount}' , 'credit' , '${body.orderid}' , 'green' , '${body.created_at}' , '${body.razorpay_payment_id}')`,async(err,result)=>{
//                         if(err) throw err;
//                         else {
//                             pool.query(`update users set wallet = wallet+${body.amount} where id = '${body.userid}'`,async(err,result)=>{
//                                 if(err) throw err;
                               
//                                 else{
//                                     let userDetails = await verify.profile(body.userid)



//                                     const userMessage = emailTemplates.paymentConfirmation.userMessage(userDetails[0].name, body.amount, body.razorpay_payment_id,body.orderid);
//                                     const adminMessage = emailTemplates.paymentConfirmation.adminMessage(userDetails[0].name, body.amount, body.razorpay_payment_id,body.orderid);


//                                     await verify.sendUserMail(userDetails[0].email,emailTemplates.paymentConfirmation.userSubject,userMessage)
//                                     await verify.sendUserMail('jnaman345@gmail.com',emailTemplates.paymentConfirmation.adminSubject,adminMessage)
                                   
//                                   const today = new Date().toLocaleDateString('en-US', { 
//   day: 'numeric', 
//   month: 'long', 
//   year: 'numeric' 
// });

// // Send WhatsApp message
// await verify.sendWhatsAppMessage(
//   '+91' + userDetails[0].number,
//   'payment_successful', // your approved template
//   'en_US',
//   [userDetails[0].name, body.amount, today] // exactly 3 placeholders
// );
                 
//                                     res.json({msg:'success'})
//                                 }
                                    
//                               })
//                         }
//                      })   
          
                  
          
          
//                     }
//                   });
//             }
//         })
  
       
//       } else {
//         res.json({ msg: 'Unauthorized Payment' });
//       }
//     } else {
//       res.json({ msg: 'Error Occurred' });
//     }
//   });


router.get('/wallet-razorpay-success', async (req, res) => {
    let body = req.query;
    console.log(req.query);

    if (!(body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature)) {
        return res.json({ msg: 'Error Occurred' });
    }

    const data = req.query.orderid + '|' + body.razorpay_payment_id;
    let generated_signature = hmac_sha256(data, 'uYtSO5ly2TfqM8Cxx0lCgY9t');

    console.log('razorpayresponse', body);
    console.log('generated_signature', generated_signature);

    if (generated_signature !== body.razorpay_signature) {
        return res.json({ msg: 'Unauthorized Payment' });
    }

    body.orderid = req.query.orderid;
    body.amount = req.query.amount / 100;
    body.txnid = req.query.orderid;
    body.userid = req.query.userid;
    body.type = req.query.type;
    body.created_at = verify.getCurrentDate();

    pool.query(
        `SELECT 1 FROM payment_response 
         WHERE razorpay_signature = ? 
           AND razorpay_payment_id = ? 
           AND razorpay_order_id = ?`,
        [body.razorpay_signature, body.razorpay_payment_id, body.razorpay_order_id],
        (err, result) => {
            if (err) {
                console.error('payment_response select err:', err);
                return res.status(500).json({ msg: 'Internal error' });
            }

            if (result.length > 0) {
                return res.json({ msg: 'success', des: 'alreadydone' });
            }

            // Insert into payment_response
            pool.query(`INSERT INTO payment_response SET ?`, body, async (err2) => {
                if (err2) {
                    console.error('payment_response insert err:', err2);
                    return res.status(500).json({ msg: 'Internal error' });
                }

                // Insert into transaction
                pool.query(
                    `INSERT INTO transaction(userid, amount, status, orderid, color, created_at, txnid) 
                     VALUES(?, ?, 'credit', ?, 'green', ?, ?)`,
                    [body.userid, body.amount, body.orderid, body.created_at, body.razorpay_payment_id],
                    (err3) => {
                        if (err3) {
                            console.error('transaction insert err:', err3);
                            return res.status(500).json({ msg: 'Internal error' });
                        }

                        // Update wallet balance
                        pool.query(
                            `UPDATE users SET wallet = wallet + ? WHERE id = ?`,
                            [body.amount, body.userid],
                            (err4) => {
                                if (err4) {
                                    console.error('wallet update err:', err4);
                                    return res.status(500).json({ msg: 'Internal error' });
                                }

                                // ✅ Send response now
                                res.json({ msg: 'success' });

                                // 🔔 Background notifications
                                setImmediate(async () => {
                                    try {
                                        const userDetails = await verify.profile(body.userid);
                                        if (!userDetails || !userDetails[0]) return;

                                        const today = new Date().toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        });

                                        const userMessage = emailTemplates.paymentConfirmation.userMessage(
                                            userDetails[0].name,
                                            body.amount,
                                            body.razorpay_payment_id,
                                            body.orderid
                                        );

                                        const adminMessage = emailTemplates.paymentConfirmation.adminMessage(
                                            userDetails[0].name,
                                            body.amount,
                                            body.razorpay_payment_id,
                                            body.orderid
                                        );

                                        // Send emails in parallel
                                        await Promise.allSettled([
                                            verify.sendUserMail(
                                                userDetails[0].email,
                                                emailTemplates.paymentConfirmation.userSubject,
                                                userMessage
                                            ),
                                            verify.sendUserMail(
                                                'jnaman345@gmail.com',
                                                emailTemplates.paymentConfirmation.adminSubject,
                                                adminMessage
                                            )
                                        ]);

                                        // Send WhatsApp
                                        await verify.sendWhatsAppMessage(
                                            '+91' + userDetails[0].number,
                                            'payment_successful',
                                            'en_US',
                                            [userDetails[0].name, body.amount, today]
                                        );

                                    } catch (bgErr) {
                                        console.error('Background notification error:', bgErr?.response?.data || bgErr);
                                    }
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});






  module.exports = router;