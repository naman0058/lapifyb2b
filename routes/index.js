var express = require("express");
var router = express.Router();
var pool = require("./pool");
var verify = require("./verify");
const fs = require("fs");
const xlsx = require("xlsx");
var upload = require('./multer');
// var fetch = require('node-fetch')
const { Expo } = require('expo-server-sdk')
const request = require('request');


async function sendNotification(customer_id){

  pool.query(`select token from users where unique_id from where unique_id = '${customer_id}'`,(err,result)=>{
    if(err) throw err;
    else{
      const message = {
        to: result[0].token,
        sound: 'default',
        title: `New Trade Updated`,
        body: ``,
        data: { someData: 'goes here' },
      };
      
      
      request.post('https://exp.host/--/api/v2/push/send').form({message})   
              request.post({url:'https://exp.host/--/api/v2/push/send',body: JSON.stringify(message)} , function(err,httpResponse,data){
                  console.log('sending data',message)
                  if(err) throw err;
                  else return data;
               })
      
    }
  })


// fetch('https://exp.host/--/api/v2/push/send', {
//                             method: 'POST',
//                             headers: {
//                               Accept: 'application/json',
//                               'Accept-encoding': 'gzip, deflate',
//                               'Content-Type': 'application/json',
//                             },
//                             body: JSON.stringify(message),
//                           });
}


router.get("/short-report", (req, res) => {
  pool.query(`select * from short_report order by id desc`, (err, result) => {
    if (err) throw err;
    else res.json(result);
  });
});

router.get("/detail-report", (req, res) => {
  pool.query(`select * from detail_report order by date`, (err, result) => {
    if (err) throw err;
    else res.json(result);
  });
});

router.get("/detailedreportinsert", async (req, res) => {
  try {
    const data = await verify.readDetailedExcelData();

    const flattenedData = data.flat();

    const promises = flattenedData.map((row) => {
      return new Promise((resolve, reject) => {
        const queryString = `SELECT * FROM detail_report WHERE serise = '${row.serise}' AND unique_id = '${row.unique_id}' AND date = '${row.date}' AND actual_pl = '${row.actual_pl}'`;

        pool.query(queryString, (err, result) => {
          if (err) {
            reject(err);
          } else {
            if (result.length === 0) {
              console.log(result.length);

          
              const insertQuery = `INSERT INTO detail_report (serise, buy, avg_buying_price, sell, avg_sell_rate, net_position, wt_avg_price, be_price, actual_pl, Exc, date, unique_id) VALUES ('${row.serise}', '${row.buy}', '${row.avg_buying_price}', '${row.sell}', '${row.avg_sell_rate}', '${row.net_position}', '${row.wt_avg_price}', '${row.be_price}', '${row.actual_pl}', '${row.Exc}', '${row.date}', '${row.unique_id}')`;

              pool.query(insertQuery, (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            } else {
              // If row already exists, resolve the promise

              resolve();
            }
          }
        });
      });
    });

    // Wait for all promises to resolve

    await Promise.all(promises);

    res.json({ message: "Data inserted successfully" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/shortreportinsert", (req, res) => {
  const excelFilePath = "public/read.xlsx";
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  if (data[1]["Sharekhan Limited"] === "CUSTOMER ID :- ") {
    let customer_id = data[1].__EMPTY;
    pool.query(
      `SELECT * FROM users WHERE unique_id = '${customer_id}'`,
      (err, result) => {
        if (err) throw err;
        else if (result[0]) {
          let title = data[9]["Sharekhan Limited"];
          const filteredData = [];
          for (let i = 11; i < data.length; i++) {
            const currentData = data[i];
            const hasEmptyValues = [
              "Serise",
              "Buy",
              "Avg Buying Rate",
              "Sell",
              "Avg Sell Rate",
              "Net Position",
              "Wt.Avg.Price",
              "BE Price",
              "P&L Actual",
            ].some((key) => currentData[key] === "");
            if (!hasEmptyValues) {
              const newData = {};
              Object.keys(currentData).forEach((key) => {
                switch (key) {
                  case "__EMPTY":
                    newData["Serise"] = currentData[key];
                    break;
                  case "__EMPTY_1":
                    newData["Buy"] = currentData[key];
                    break;
                  case "__EMPTY_2":
                    newData["Avg Buying Rate"] = currentData[key];
                    break;
                  case "__EMPTY_3":
                    newData["Sell"] = currentData[key];
                    break;
                  case "__EMPTY_4":
                    newData["Avg Sell Rate"] = currentData[key];
                    break;
                  case "__EMPTY_5":
                    newData["Net Position"] = currentData[key];
                    break;
                  case "__EMPTY_6":
                    newData["Wt.Avg.Price"] = currentData[key];
                    break;
                  case "__EMPTY_7":
                    newData["BE Price"] = currentData[key];
                    break;
                  case "__EMPTY_8":
                    newData["P&L Actual"] = currentData[key];
                    break;
                  case "Sharekhan Limited":
                    newData["Exc"] = currentData[key];
                    break;
                  default:
                    newData[key] = currentData[key];
                }
              });
              filteredData.push(newData);
            }
          }
          const result = [];
          let currentArray = [];
          for (let i = 0; i < filteredData.length; i++) {
            if (
              filteredData[i].Exc &&
              filteredData[i].Exc.includes("Expiry Date")
            ) {
              currentArray = [filteredData[i]];
              result.push(currentArray);
            } else if (
              filteredData[i]["P&L Actual"] &&
              filteredData[i]["P&L Actual"].includes("Expiry total")
            ) {
              currentArray.push(filteredData[i]);
            }
          }
          let combinedResult = [];
          for (let i = 0; i < result.length; i++) {
            if (result[i][0] && result[i][1]) {
              let combinedItem = {
                unique_id: customer_id,
                title: title,
                date: result[i][0].Exc.split(" : ")[1],
                actual_pl: result[i][1]["P&L Actual"].split(" : ")[1],
              };
              combinedResult.push(combinedItem);
            }
          }
          // Check each combinedResult item for uniqueness before insertion
          let insertionCount = 0;
          combinedResult.forEach((item) => {
            const selectQuery = `SELECT * FROM short_report WHERE unique_id = '${item.unique_id}' AND date = '${item.date}'`;
            pool.query(selectQuery, (err, existingData) => {
              if (err) {
                console.error("Error checking existing data:", err);
                res.json({
                  msg: "Error checking existing data in short_report table",
                });
              } else {
                if (existingData.length === 0) {
                  const insertQuery =
                    "INSERT INTO short_report (unique_id, title, date, actual_pl) VALUES (?, ?, ?, ?)";
                  const values = [
                    item.unique_id,
                    item.title,
                    item.date,
                    item.actual_pl,
                  ];
                  pool.query(insertQuery, values, (err, result) => {
                    if (err) {
                      console.error("Error inserting data:", err);
                      res.json({
                        msg: "Error inserting data into short_report table",
                      });
                    } else {
                      console.log("Data inserted successfully:", result);
                      insertionCount++;
                      if (insertionCount === combinedResult.length) {
                        res.json({
                          msg: "All data inserted successfully into short_report table",
                        });
                      }
                    }
                  });
                } else {
                  console.log(
                    "Data already exists in short_report table:",
                    existingData
                  );
                  insertionCount++;
                  if (insertionCount === combinedResult.length) {
                    res.json({
                      msg: "All data inserted successfully into short_report table",
                    });
                  }
                }
              }
            });
          });
        } else {
          res.json({ msg: "Customer Not Exists in Our Database", customer_id });
        }
      }
    );
  } else {
    res.json({ msg: "format change" });
  }
});



router.get("/read1", async (req, res) => {
  try {
    const result = await verify.readDetailedExcelData();
    res.json(result);
  } catch (error) {
    res.json(error);
  }
});

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

















router.post('/combinedRoute',upload.single('excel_file'), async (req, res) => {
console.log('run')
  try {

    // Call the first route logic

    const detailedReportData = await verify.readDetailedExcelData(req.file.filename);

    console.log('detailedReportData',detailedReportData)

    if(detailedReportData.msg == 'Customer Not Exists in Our Database'){
        res.render('add_csv',{msg:'Customer Not Exists in Our Database'})
    }
    else{
  

        const flattenedDetailedData = detailedReportData.flat();

        await Promise.all(flattenedDetailedData.map(row => insertOrUpdateDetailedData(row)));
    
        // Call the second route logic
    
        const excelFilePath = `public/images/${req.file.filename}`;
    
        const workbook = xlsx.readFile(excelFilePath);
    
        const sheetName = workbook.SheetNames[0];
    
        const worksheet = workbook.Sheets[sheetName];
    
        const data = xlsx.utils.sheet_to_json(worksheet);
    
        if (data[1]["Sharekhan Limited"] === "CUSTOMER ID :- ") {
    
          let customer_id = data[1].__EMPTY;
    
        
           
          const userData = await getUserData(customer_id);
    
          if (userData.length > 0) {
    
            let title = data[9]["Sharekhan Limited"];
    
            const filteredData = getFilteredData(data);
    
            const combinedResult = getCombinedResult(filteredData, customer_id, title);
    
            await insertOrUpdateShortReport(combinedResult);

            // await sendNotification(customer_id)
    
            res.render('add_csv',{msg:'File Uploaded Successfully'})
    
          } else {
    
            res.json({ msg: 'Customer Not Exists in Our Database', customer_id });
    
          }
    
        } else {
    
          res.json({ msg: 'Format change' });
    
        }
    
      } 
    }
  catch (error) {

    res.json({ error: error.message });

  }

});

async function insertOrUpdateDetailedData(row) {

  return new Promise((resolve, reject) => {

    const queryString = `SELECT * FROM detail_report WHERE serise = '${row.serise}' AND unique_id = '${row.unique_id}' AND date = '${row.date}' AND actual_pl = '${row.actual_pl}'`;

    pool.query(queryString, (err, result) => {

      if (err) {

        reject(err);

      } else {

        if (result.length === 0) {

          const insertQuery = `INSERT INTO detail_report (serise, buy, avg_buying_price, sell, avg_sell_rate, net_position, wt_avg_price, be_price, actual_pl, Exc, date, unique_id) VALUES ('${row.serise}', '${row.buy}', '${row.avg_buying_price}', '${row.sell}', '${row.avg_sell_rate}', '${row.net_position}', '${row.wt_avg_price}', '${row.be_price}', '${row.actual_pl}', '${row.Exc}', '${row.date}', '${row.unique_id}')`;

          pool.query(insertQuery, (err, result) => {

            if (err) {
console.log(err);
              reject(err);

            } else {
console.log('done');
              resolve();

            }

          });

        } else {

          resolve();

        }

      }

    });

  });

}

function getFilteredData(data) {

  const filteredData = [];

  for (let i = 11; i < data.length; i++) {

    const currentData = data[i];

    const hasEmptyValues = ["Serise", "Buy", "Avg Buying Rate", "Sell", "Avg Sell Rate", "Net Position", "Wt.Avg.Price", "BE Price", "P&L Actual"]

      .some((key) => currentData[key] === "");

    if (!hasEmptyValues) {

      const newData = {};

      Object.keys(currentData).forEach((key) => {

        switch (key) {

          case "__EMPTY":

            newData["Serise"] = currentData[key];

            break;

          case "__EMPTY_1":

            newData["Buy"] = currentData[key];

            break;

          case "__EMPTY_2":

            newData["Avg Buying Rate"] = currentData[key];

            break;

          case "__EMPTY_3":

            newData["Sell"] = currentData[key];

            break;

          case "__EMPTY_4":

            newData["Avg Sell Rate"] = currentData[key];

            break;

          case "__EMPTY_5":

            newData["Net Position"] = currentData[key];

            break;

          case "__EMPTY_6":

            newData["Wt.Avg.Price"] = currentData[key];

            break;

          case "__EMPTY_7":

            newData["BE Price"] = currentData[key];

            break;

          case "__EMPTY_8":

            newData["P&L Actual"] = currentData[key];

            break;

          case "Sharekhan Limited":

            newData["Exc"] = currentData[key];

            break;

          default:

            newData[key] = currentData[key];

        }

      });

      filteredData.push(newData);

    }

  }

  return filteredData;

}

function getCombinedResult(filteredData, customer_id, title) {

  const result = [];

  let currentArray = [];

  for (let i = 0; i < filteredData.length; i++) {

    if (filteredData[i].Exc && filteredData[i].Exc.includes('Expiry Date')) {

      currentArray = [filteredData[i]];

      result.push(currentArray);

    } else if (filteredData[i]['P&L Actual'] && filteredData[i]['P&L Actual'].includes('Expiry total')) {

      currentArray.push(filteredData[i]);

    }

  }

  let combinedResult = [];

  for (let i = 0; i < result.length; i++) {

    if (result[i][0] && result[i][1]) {

      let combinedItem = {

        'unique_id': customer_id,

        'title': title,

        'date': result[i][0].Exc.split(" : ")[1],

        'actual_pl': result[i][1]['P&L Actual'].split(" : ")[1]

      };

      combinedResult.push(combinedItem);

    }

  }

  return combinedResult;

}

async function insertOrUpdateShortReport(combinedResult) {

  const promises = combinedResult.map(item => {

    return new Promise((resolve, reject) => {

      const selectQuery = `SELECT * FROM short_report WHERE unique_id = '${item.unique_id}' AND date = '${item.date}'`;

      pool.query(selectQuery, (err, existingData) => {

        if (err) {

          reject(err);

        } else {

          if (existingData.length === 0) {

            const insertQuery = 'INSERT INTO short_report (unique_id, title, date, actual_pl) VALUES (?, ?, ?, ?)';

            const values = [item.unique_id, item.title, item.date, item.actual_pl];

            pool.query(insertQuery, values, (err, result) => {

              if (err) {

                reject(err);

              } else {

                resolve();

              }

            });

          } else {

            resolve();

          }

        }

      });

    });

  });

  await Promise.all(promises);

}

async function getUserData(customer_id) {
    console.log('abc',customer_id)

  return new Promise((resolve, reject) => {

    pool.query(`SELECT * FROM users WHERE unique_id = '${customer_id}'`, (err, result) => {

      if (err) {

        reject(err);

      } else {


        resolve(result);

      }

    });

  });

}



// 
// 


module.exports = router;
