var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
var user = require('./function');
const upload = require('./multer');
var folder = 'users'
var isimage = ['brand','type']
var databasetable = 'users'
const emailTemplates = require('./emailTemplates');



router.get('/list/:status', verify.adminAuthenticationToken, async (req, res) => {
    try {
      const result = await user.getlist(req.params.status,false);
      res.render(`${folder}/list`,{result,status:req.params.status});
    } catch (error) {
      console.error('Error in route:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/update',verify.adminAuthenticationToken,async(req,res)=>{
  try {
    const result = await user.profile(req.query.id);
    res.render(`${folder}/update`,{result,id:req.params.id,msg:req.query.message});
  } catch (error) {
      console.error('Error in route:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
})


router.post('/update',verify.adminAuthenticationToken,async(req,res)=>{
  try {
    const result = await user.update(req.body.id,req.body);
    res.redirect(`/admin/dashboard/users/update?id=${req.body.id}&message=${encodeURIComponent('Saved Successfully')}`);

  } catch (error) {
      console.error('Error in route:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
})


router.get('/delete',verify.adminAuthenticationToken, async (req, res) => {
  const { id , status , value } = req.query;
  
  try {
      await queryAsync(`UPDATE ${databasetable} SET status = '${value}' WHERE id = ?`, [id]);
      res.redirect(`/admin/dashboard/users/list/${status}`);
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});


router.get('/permanent-delete',verify.adminAuthenticationToken, async (req, res) => {
  const { id } = req.query;
  
  try {
      await queryAsync(`delete from ${databasetable} WHERE id = ?`, [id]);
      res.redirect(`/admin/dashboard/users/list/delete`);
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
  


router.get('/view/orders', verify.adminAuthenticationToken, async (req, res) => {
  try {
    let result;
    if (req.query.id) {
      result = await user.getOrder(req.query.id);
    } else {
      result = await user.getOrder(req.query.status);
    }
    res.render(`${folder}/orders`, { result });
  } catch (error) {
    console.error('Error in route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/view/transaction', verify.adminAuthenticationToken, async (req, res) => {
  try {
    let result;
    if (req.query.id) {
      result = await user.getTransaction(req.query.id);
    } else {
      result = await user.getTransaction('all');
    }
    res.render(`${folder}/transaction`, { result });
  } catch (error) {
    console.error('Error in route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/view/logs', verify.adminAuthenticationToken, async (req, res) => {
  try {
    let result;
    if (req.query.id) {
      result = await user.getLogs(req.query.id);
    } else {
      result = await user.getLogs('all');
    }
    res.render(`${folder}/logs`, { result });
  } catch (error) {
    console.error('Error in route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/view/transaction/details', verify.adminAuthenticationToken, async (req, res) => {
  try {
    
    const result = await user.getTransactionDetails(req.query.status,req.query.orderid);
    if(req.query.status == 'credit'){
      res.render(`${folder}/transactionDetails`, { result });
    }
    else{
      res.render(`${folder}/bookingDetails`, { result });
    }
  } catch (error) {
    console.error('Error in route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/update/orders',verify.adminAuthenticationToken,async(req,res)=>{
  try {
    let body = req.body
    body.updated_at = verify.getCurrentDate();
    console.log(req.body)

  let orderDetails = await verify.getOrderDetails(req.body.orderid);
  let userDetails = await verify.profile(orderDetails[0].userid)
  
  console.log('orderdetails',orderDetails);
  console.log('userDetails',userDetails);


  if(req.body.status == 'ongoing'){
  const userMessage = emailTemplates.orderShippingNotification.userMessage(orderDetails[0].username, req.body.orderid, req.body.delivery_link );
  await verify.sendUserMail(userDetails[0].email,emailTemplates.orderShippingNotification.userSubject,userMessage)


  }

  else {
    const userMessage = emailTemplates.orderCompletionNotification.userMessage(orderDetails[0].username, req.body.orderid, updated_at);
    await verify.sendUserMail(userDetails[0].email,emailTemplates.orderCompletionNotification.userSubject,userMessage)
    
  }





    const result = await user.updateOrders(req.body.orderid,req.body);
    res.json({msg:'success'})
  } catch (error) {
      console.error('Error in route:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
})


module.exports = router;