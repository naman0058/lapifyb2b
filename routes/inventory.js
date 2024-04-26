var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
var user = require('./function');
const upload = require('./multer');
var folder = 'inventory'
var isimage = ['brand','type']
var databasetable = 'users'
var isimage = ['accessories','refurbished_parts','new_parts']
var laptopfilter = ['laptop']
var mobilefilter = ['mobile']
var applefilter = ['apple']







  router.get('/manage/:type', (req, res) => {


    let filtertable = '';
    let filterfolder = '';

    if (isimage.includes(req.params.type)) {
        filtertable = 'parts_and_accessories_filters';
        filterfolder = 'parts-and-accessories'
    }
    if (laptopfilter.includes(req.params.type)) {
        filtertable = 'laptop_filters';
        filterfolder = 'laptop'
    }
    if (mobilefilter.includes(req.params.type)) {
        filtertable = 'mobile_filters';
        filterfolder = 'mobile'
    }
    if (applefilter.includes(req.params.type)) {
        filtertable = 'apple_filters';
        filterfolder = 'apple'
    }


    const { skuno, modelno, subcategory, from_date, to_date , brand } = req.query;




  
    let query = `SELECT p.*, f1.name as subcategoryname, f2.name as brandname
                 FROM product p
                 LEFT JOIN ${filtertable} f1 ON f1.id = p.subcategory
                 LEFT JOIN ${filtertable} f2 ON f2.id = p.brand
                 WHERE 1`;

    


    if (req.params.type) query += ` AND category = '${req.params.type}'`;
    if (skuno) query += ` AND skuno = '${skuno}'`;
    if (modelno) query += ` AND modelno = '${modelno}'`;
    if (subcategory) query += ` AND subcategory = '${subcategory}'`;
    if (brand) query += ` AND brand = '${brand}'`;
    if (from_date && !to_date) query += ` AND created_at = '${from_date}'`;
    if (from_date && to_date) query += ` AND created_at BETWEEN '${from_date}' AND '${to_date}'`;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
     res.render(`${folder}/accessories`,{result:results,value:req.query,pagename:req.params.type,filterfolder})
    // res.json(results)

    });
  });
  


  router.get('/apple', (req, res) => {
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
  
    //  res.render(`${folder}/stock`,{result:results,value:req.query})
    res.json(results)

    });
  });


module.exports = router;