var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const secretkey = 'ashdgjgssfdgSFGF'
const fs = require('fs');
const xlsx = require('xlsx');

var pool = require('./pool');


const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);





async function getlist(status, id) {
  try {
      let result;
      if (status == false) {
          result = await queryAsync(`SELECT * FROM users WHERE id = '${id}'`);
      } else {
          result = await queryAsync(`SELECT * FROM users WHERE status = '${status}'`);
      }
      return result;
  } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
  }
}



async function profile(id) {
  try {
       let result = await queryAsync(`SELECT * FROM users WHERE id = '${id}'`);
      return result;
  } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
  }
}


async function update(id, data) {
  try {
    let result = await queryAsync(`UPDATE users SET ? WHERE id = '${id}'`, data);
    return result;
  } catch (error) {
    console.error('Error while updating user:', error);
    throw new Error('Internal server error');
  }
}




async function getOrder(value) {
    try {
        let result;
        if (value == 'pending' || value == 'ongoing' || value == 'completed') {
            result = await queryAsync(`SELECT o.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid 
                                       FROM orders o 
                                       JOIN users u ON u.id = o.userid 
                                       WHERE o.status = ? 
                                       ORDER BY o.id DESC 
                                       LIMIT 1000`, [value]);
        } else {
            result = await queryAsync(`SELECT o.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid 
                                       FROM orders o 
                                       JOIN users u ON u.id = o.userid 
                                       WHERE o.userid = ? 
                                       ORDER BY o.id DESC`, [value]);
        }
        return result;
    } catch (error) {
        console.error('Error while fetching user:', error);
        throw new Error('Internal server error');
    }
}





async function getTransaction(value) {
    try {
      let result;
      if (value === 'all') {
        result = await queryAsync(`
          SELECT t.*, u.name AS username, u.number AS usernumber, u.unique_id AS uniqueid
          FROM transaction t
          JOIN users u ON t.userid = u.id
          ORDER BY t.id DESC
          LIMIT 1000
        `);
      } else {
        result = await queryAsync(`
          SELECT t.*, u.name AS username, u.number AS usernumber, u.unique_id AS uniqueid
          FROM transaction t
          JOIN users u ON t.userid = u.id
          WHERE t.userid = '${value}'
          ORDER BY t.id DESC
        `);
      }
      return result;
    } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
    }
  }
  


  async function getLogs(value) {
    try {
      let result;
      if (value == 'all') {
        result = await queryAsync(`SELECT t.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
                                    FROM logs t
                                    JOIN users u ON u.id = t.userid
                                    ORDER BY t.id DESC
                                    LIMIT 1000`);
      } else {
        result = await queryAsync(`SELECT t.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
                                    FROM logs t
                                    JOIN users u ON u.id = t.userid
                                    WHERE t.userid = '${value}'
                                    ORDER BY t.id DESC`);
      }
      return result;
    } catch (error) {
      console.error('Error while fetching logs:', error);
      throw new Error('Internal server error');
    }
  }
  



  async function getTransactionDetails(value, id) {
    try {
      let result;
      console.log('value', value);
      if (value === 'credit') {
        result = await queryAsync(`
          SELECT 
            p.*, 
            u.name AS username, 
            u.number AS usernumber, 
            u.unique_id AS uniqueid 
          FROM 
            payment_response p 
            INNER JOIN users u ON p.userid = u.id 
          WHERE 
            p.id = '${id}'
        `);
      } else {
        result = await queryAsync(`
          SELECT 
            b.*, 
            u.name AS username, 
            u.number AS usernumber, 
            u.unique_id AS uniqueid, 
            p.name AS productname, 
            o.status AS orderstatus 
          FROM 
            booking b 
            INNER JOIN users u ON b.userid = u.id 
            LEFT JOIN product p ON b.productid = p.id 
            LEFT JOIN orders o ON b.orderid = o.orderid 
          WHERE 
            b.orderid = '${id}'
        `);
      }
      return result;
    } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
    }
  }
  



async function updateOrders(id, data) {
    try {
        console.log('orderid',id)
        console.log('data',data)
      let result = await queryAsync(`UPDATE orders SET ? WHERE orderid = '${id}'`, data);
      let result1 = await queryAsync(`UPDATE booking SET status = '${data.status}' WHERE orderid = '${id}'`);
      return result;
    } catch (error) {
      console.error('Error while updating user:', error);
      throw new Error('Internal server error');
    }
  }



async function getFilter(filtertable,filters){
  try {
     let result = await queryAsync(`select * from ${filtertable} where filters = '${filters}' and status = true order by name`);
     return result;
  } catch (error) {
    console.error('Error while updating user:', error);
    throw new Error('Internal server error');
  }
}  



async function fetch_name(data) {

  try {
    if(data.category == 'mobile'){
      let ramname = await getDatas('mobile_filters',data.ram)
      return  data.modelno + ' | ' + ramname + ' | ' +  data.storage 
  }
  
  if(data.category == 'laptop'){
      let processorname = await getDatas('laptop_filters',data.processor)
      let generationname = await getDatas('laptop_filters',data.generation)
      let ramname = await getDatas('laptop_filters',data.ram)
  
  
  
      return  data.modelno + ' | ' + processorname + ' | ' + generationname + ' | ' + ramname + ' | ' + data.storage 
  }
  
  
  if(data.category == 'apple'){
      let processorname = await getDatas('apple_filters',data.processor)
      let subcategoryrname = await getDatas('apple_filters',data.subcategory)
  
    
  
  
  
      return  data.modelno + ' | ' + subcategoryrname + ' | ' + processorname  
  }
  
  
  
  if(data.category == 'accessories' || data.category == 'new_parts' || data.category == 'refurbished_parts'){
      let brandname = await getDatas('parts_and_accessories_filters',data.brand)
     
      return  data.modelno + ' | ' + brandname + ' | ' + data.category.toUpperCase() 
  }
  
  
  } catch (error) {
    console.error('Error while fetching')
    throw new Error('Internal Server Error')
  }
  
}


// userlist()

module.exports= {
  getlist,
  profile,
  update,
  getOrder,
  getTransaction,
  getTransactionDetails,
  getLogs,
  updateOrders,
  getFilter,
  fetch_name
}