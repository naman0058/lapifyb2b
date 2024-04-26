var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const secretkey = 'ashdgjgssfdgSFGF'
const fs = require('fs');
const xlsx = require('xlsx');

var pool = require('./pool');


const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);



// function userAuthenticationToken(req,res,next){
//     // const token = req.headers['authrorization'];
//     const token = undefined
//     if(!token) return res.status(401).json({message : 'Token not provided'})
//     jwt.verify(token,secretkey,(err,data)=>{
//       if(err) res.status(401).json({message:'Invalid Token Recieved'})
//       req.user = data
//       next();
//     })
//   }


// function userAuthenticationToken(req, res, next) {
//   const token = req.headers['authorization'];
//   if (!token) {
//       return res.status(401).json({ message: 'Token not provided' });
//   }
//   jwt.verify(token, secretkey, (err, data) => {
//       if (err) {
//           return res.status(401).json({ message: 'Invalid Token Received' });
//       }
//       req.user = data;
//       next();
//   });
// }



function adminAuthenticationToken(req,res,next){
  if(req.session.adminid) {
    req.categories = true;
     next();
  }
  else {
    res.render('login',{msg:'Wrong Credentials'})
    next()
  }
}


async function userAuthenticationToken(req, res, next) {
    try {
        const result = await queryAsync('SELECT * FROM users WHERE id = ?', [req.query.id]);

        if (result.length > 0) {
            req.data = req.query.id;
            next();
        } else {
            res.status(401).json({ msg: 'Invalid User ID' });
            // If you're continuing the middleware chain after sending a response,
            // you shouldn't call next() after sending the response.
        }
    } catch (error) {
        console.error('Error while verifying user authentication token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}



const readDetailedExcelData = async (filename) => {

  const excelFilePath = `public/images/${filename}`;
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  if (data[1]["Sharekhan Limited"] === "CUSTOMER ID :- ") {
      let customer_id = data[1].__EMPTY;
      return new Promise((resolve, reject) => {
          pool.query(`select * from users where unique_id = '${customer_id}'`, (err, result) => {
              if (err) reject(err);
              else if (result[0]) {
                  let title = data[9]["Sharekhan Limited"];
                  for (let i = 11; i < data.length; i++) {
                      const currentData = data[i];
                      const hasEmptyValues = ["Serise", "Buy", "Avg Buying Rate", "Sell", "Avg Sell Rate", "Net Position", "Wt.Avg.Price", "BE Price", "P&L Actual"]
                          .some((key) => currentData[key] === "");
                      if (!hasEmptyValues) {
                          const newData = {};
                          Object.keys(currentData).forEach((key) => {
                              switch (key) {
                                  case "__EMPTY":
                                      newData["serise"] = currentData[key];
                                      break;
                                  case "__EMPTY_1":
                                      newData["buy"] = currentData[key];
                                      break;
                                  case "__EMPTY_2":
                                      newData["avg_buying_price"] = currentData[key];
                                      break;
                                  case "__EMPTY_3":
                                      newData["sell"] = currentData[key];
                                      break;
                                  case "__EMPTY_4":
                                      newData["avg_sell_rate"] = currentData[key];
                                      break;
                                  case "__EMPTY_5":
                                      newData["net_position"] = currentData[key];
                                      break;
                                  case "__EMPTY_6":
                                      newData["wt_avg_price"] = currentData[key];
                                      break;
                                  case "__EMPTY_7":
                                      newData["be_price"] = currentData[key];
                                      break;
                                  case "__EMPTY_8":
                                      newData["actual_pl"] = currentData[key];
                                      break;
                                  case "Sharekhan Limited":
                                      newData["Exc"] = currentData[key];
                                      newData["date"] = currentData[key];
                                      break;
                                  default:
                                      newData[key] = currentData[key];
                              }
                          });
                          data[i] = newData;
                      }
                  }
                  const filteredData = data.slice(11).filter((item) => Object.values(item).some((value) => value !== ""));
                  let resultArrays = [];
                  let currentArray = [];
                  for (let i = 0; i < filteredData.length; i++) {
                      if (filteredData[i].Exc && filteredData[i].Exc.includes("Expiry Date")) {
                          let date = filteredData[i].Exc;
                          if (currentArray.length > 0) {
                              resultArrays.push(currentArray);
                              currentArray = [];
                          }
                      }
                      currentArray.push(filteredData[i]);
                  }
                  if (currentArray.length > 0) {
                      resultArrays.push(currentArray);
                  }
                  const modifiedResultArrays = resultArrays.map(subArray => {
                      const exc = subArray[0].Exc;
                      return subArray.map(obj => ({...obj, unique_id: customer_id, date: exc.split(" : ")[1]}));
                  });
                  // Remove first and last objects of each array
                  const trimmedResultArrays = modifiedResultArrays.map(subArray => {
                      const length = subArray.length;
                      return subArray.slice(1, length -2);
                  });
                  resolve(trimmedResultArrays);
              } else {
                
                  resolve({ msg: 'Customer Not Exists in Our Database', customer_id });
              }
          });
      });
  } else {
      return { msg: 'format change' };
  }
};



function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = date.getFullYear();
    return yyyy + '-' + mm + '-' + dd ;
  }


  function getCurrentDate() {
    const today = new Date();
    return formatDate(today);
  }
  
  
  function getCurrentWeekDates() {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (7 - today.getDay()));
    return { startDate: formatDate(startOfWeek), endDate: formatDate(endOfWeek) };
  }
  // Function to get the start and end dates of the current month
  
  function getCurrentMonthDates() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: formatDate(startOfMonth), endDate: formatDate(endOfMonth) };
  }
  
  function getLastMonthDates() {
    const today = new Date();
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: formatDate(firstDayOfLastMonth), endDate: formatDate(lastDayOfLastMonth) };
  }

  
  // Function to get the start and end dates of the current year
  
  function getCurrentYearDates() {
  
    //   const today = new Date();
  
    //   const startOfYear = new Date(today.getFullYear(), 3, 1);

    //   const endOfYear = new Date(today.getFullYear(), 2, 31);
  
    //   return { startDate: formatDate(startOfYear), endDate: formatDate(endOfYear) };

    const today = new Date();
   // Check if the current month is April or later
   // If so, the financial year starts from April of the current year
   // Otherwise, it starts from April of the previous year
   const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
   // The financial year ends on March 31st of the following year
   const endYear = today.getMonth() >= 3 ? today.getFullYear() + 1 : today.getFullYear();
   // Set the start date to April 1st of the start year
   const startDate = new Date(startYear, 3, 1);
   // Set the end date to March 31st of the end year
   const endDate = new Date(endYear, 2, 31);
   return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
  
  }


  function getLastFinancialYearDates() {
    const today = new Date();

    // Check if the current month is April or later
    // If so, the financial year started from April of the current year
    // Otherwise, it started from April of the previous year
    const startYear = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 2;

    // The financial year ended on March 31st of the current year
    const endYear = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 1;

    // Set the start date to April 1st of the start year
    const startDate = new Date(startYear, 3, 1);

    // Set the end date to March 31st of the end year
    const endDate = new Date(endYear, 2, 31);

    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}


// console.log('Last Financial Year',getCurrentYearDates())

  

  module.exports = {
    adminAuthenticationToken,
    readDetailedExcelData,
    getCurrentWeekDates,
    getCurrentMonthDates,
    getLastMonthDates,
    getCurrentYearDates,
    userAuthenticationToken,
    getCurrentDate,
    getLastFinancialYearDates
  }


//   wkltwfbwnhnvzmwr