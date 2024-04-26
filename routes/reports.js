var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
var user = require('./function');
const upload = require('./multer');
var folder = 'reports'
var isimage = ['brand','type']
var databasetable = 'users'



router.get('/transaction', (req, res) => {
    const { username, usernumber, txnid, from_date, to_date, uniqueid } = req.query;
  
    let query = `SELECT pr.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
                 FROM payment_response pr
                 JOIN users u ON pr.userid = u.id
                 WHERE 1`;
  
    if (username) query += ` AND u.name = '${username}'`;
    if (usernumber) query += ` AND u.number = '${usernumber}'`;
    if (uniqueid) query += ` AND u.unique_id = '${uniqueid}'`;
    if (txnid) query += ` AND pr.txnid = '${txnid}'`;
    if (from_date && !to_date) query += ` AND DATE(pr.created_at) = '${from_date}'`;
    if (from_date && to_date) query += ` AND pr.created_at BETWEEN '${from_date}' AND '${to_date}'`;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
     res.render(`${folder}/transaction`,{result:results,value:req.query})

    });
  });




  router.get('/orders', (req, res) => {
    const { username, usernumber, status, from_date, to_date, uniqueid , orderid } = req.query;
  
    let query = `SELECT pr.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
                 FROM orders pr
                 JOIN users u ON pr.userid = u.id
                 WHERE 1`;
  
    if (username) query += ` AND u.name = '${username}'`;
    if (usernumber) query += ` AND u.number = '${usernumber}'`;
    if (uniqueid) query += ` AND u.unique_id = '${uniqueid}'`;
    if (status) query += ` AND pr.status = '${status}'`;
    if (orderid) query += ` AND pr.orderid = '${orderid}'`;
    if (from_date && !to_date) query += ` AND DATE(pr.created_at) = '${from_date}'`;
    if (from_date && to_date) query += ` AND pr.created_at BETWEEN '${from_date}' AND '${to_date}'`;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
     res.render(`${folder}/orders`,{result:results,value:req.query})

    });
  });



  router.get('/users', (req, res) => {
    const { username, usernumber, status, from_date, to_date, uniqueid , isproduct } = req.query;
  
    let query = `SELECT * from users WHERE 1`;
  
    if (username) query += ` AND name = '${username}'`;
    if (usernumber) query += ` AND number = '${usernumber}'`;
    if (uniqueid) query += ` AND unique_id = '${uniqueid}'`;
    if (status) query += ` AND status = '${status}'`;
    if (isproduct) query += ` AND isproduct = '${isproduct}'`;
    if (from_date && !to_date) query += ` AND created_at = '${from_date}'`;
    if (from_date && to_date) query += ` AND created_at BETWEEN '${from_date}' AND '${to_date}'`;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
     res.render(`${folder}/users`,{result:results,value:req.query})

    });
  });
  


  router.get('/stock', (req, res) => {
    const { sku, category, model,  from_date, to_date} = req.query;
  
    let query = `SELECT pr.*, p.skuno as sku, p.modelno as model
                 FROM stock pr
                 JOIN product p ON pr.productid = p.id
                 WHERE 1`;
  
    if (sku) query += ` AND p.skuno = '${sku}'`;
    if (model) query += ` AND p.modelno = '${model}'`;
    if (category) query += ` AND pr.category = '${category}'`;
    if (from_date && !to_date) query += ` AND DATE(pr.created_at) = '${from_date}'`;
    if (from_date && to_date) query += ` AND pr.created_at BETWEEN '${from_date}' AND '${to_date}'`;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
     res.render(`${folder}/stock`,{result:results,value:req.query})
    // res.json(results)

    });
  });


module.exports = router;