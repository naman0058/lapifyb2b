var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
const e = require('express');
const { update } = require('./function');


router.get('/label-name',(req,res)=>{
  const { startDate, endDate, monthNames } = getCurrentYearDates();
// console.log("Financial Year Start Date:", startDate);
// console.log("Financial Year End Date:", endDate);
// console.log("Month Names with Prospective Year:", monthNames);
res.json(monthNames)
})


function getCurrentYearDates() {
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

  // Generate an array of month names and years from the start date to the end date
  const monthNames = [];
  let currentDate = new Date(startDate); // Start from the startDate
  while (currentDate <= endDate) {
      const monthName = currentDate.toLocaleDateString('en-us', { month: 'short', year: 'numeric' });
      monthNames.push(monthName);
      currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month
  }

  return { startDate: formatDate(startDate), endDate: formatDate(endDate), monthNames };
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}







/* GET users listing. */


router.get('/login', function(req, res) {
  res.render('login',{msg:''})
});


router.get('/logout',(req,res)=>{
  req.session.adminid = null;
  res.redirect('/admin/login');
})

router.post('/login',(req,res)=>{
  let body = req.body;
  console.log("body",body)
 
pool.query(`select * from admin where email ='${body.email}' and password = '${body.password}'`,(err,result)=>{
  
   if(err) throw err;
   else if(result[0]) {
    console.log('id',result[0].id)
       req.session.adminid = result[0].id
       res.redirect('/admin/dashboard')
      }
   else res.render(`login`,{msg : 'Enter Wrong Creaditionals'})
})
 
})



// router.get('/dashboard',verify.adminAuthenticationToken,(req,res)=>{
//   res.render(`dashboard`)

// })







router.get('/dashboard', verify.adminAuthenticationToken, (req, res) => {
  var getCurrentWeekDates = verify.getCurrentWeekDates();
  var getCurrentMonthDates = verify.getCurrentMonthDates();

  var pendingorder = `select count(id) as counter from orders where status = 'pending';`
  var ongoingorder = `select count(id) as counter from orders where status = 'ongoing';`
  var weeklyorder = `select count(id) as counter from orders where created_at between '${getCurrentWeekDates.startDate}' and '${getCurrentWeekDates.endDate}';`
  var monthlyorder = `select count(id) as counter from orders where created_at between '${getCurrentMonthDates.startDate}' and '${getCurrentMonthDates.endDate}';`
  var weeklypayment = `select count(id) as counter from payment_response where created_at between '${getCurrentWeekDates.startDate}' and '${getCurrentWeekDates.endDate}';`
  var monthlypayment = `select count(id) as counter from payment_response where created_at between '${getCurrentMonthDates.startDate}' and '${getCurrentMonthDates.endDate}';`
  var verifieduser = `select count(id) as counter from users where status = 'verified';`
  var unverifieduser = `select count(id) as counter from users where status = 'unverified';`
  var laptop = `select count(id) as counter from product where category = 'laptop';`
  var mobile = `select count(id) as counter from product where category = 'mobile';`
  var apple = `select count(id) as counter from product where category = 'apple';`
  var accessories = `select count(id) as counter from product where category = 'accessories';`
  var new_parts = `select count(id) as counter from product where category = 'new_parts';`
  var refurbished_parts = `select count(id) as counter from product where category = 'refurbished_parts';`

  
  pool.query(pendingorder+ongoingorder+weeklyorder+monthlyorder+weeklypayment+monthlypayment+verifieduser+unverifieduser+laptop+mobile+apple+accessories+new_parts+refurbished_parts, (err, result) => {
      if (err) throw err;
      else res.render(`dashboard`,{result})
      // else res.json(result);
  });
});



router.get('/dashboard/add/customer',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`add_customer`,{msg:''})
})


router.get('/dashboard/add/cash',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`add_cash`,{msg:''})
})


console.log(verify.getCurrentYearDates())

router.get('/dashboard/report',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`report`,{msg:''})
})


router.get('/dashboard/payout/report',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`payout_report`,{msg:''})
})


router.post('/dashboard/customer/add', async (req, res) => {


  try {
      const { unique_id } = req.body;

      // Check if seo_name already exists
      const existingRecord = await queryAsync('SELECT id FROM users WHERE unique_id = ?', [unique_id]);

      if (existingRecord.length > 0) {
          return res.json({ msg: 'exists' });
      }

      // Insert new record
      const insertResult = await queryAsync('INSERT INTO users SET ?', req.body);

      if (insertResult.affectedRows > 0) {
          res.json({ msg: 'success' });
      } else {
          res.json({ msg: 'error' });
      }
  } catch (error) {
      console.error('Error in customer/add:', error);
      res.status(500).json({ msg: 'error' });
  }
});



router.post('/cash/add',verify.adminAuthenticationToken, async (req, res) => {


  try {
     console.log(req.body)
      // Insert new record
      const insertResult = await queryAsync('INSERT INTO cash SET ?', req.body);

      if (insertResult.affectedRows > 0) {
          res.json({ msg: 'success' });
      } else {
          res.json({ msg: 'error' });
      }
  } catch (error) {
      console.error('Error in cash/add:', error);
      res.status(500).json({ msg: 'error' });
  }
});


router.get('/dashboard/customer/list',verify.adminAuthenticationToken, async (req, res) => {
  
  try {
    let query = `SELECT * FROM users`;
    const result = await queryAsync(query);
    res.render(`list`, { result });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Internal Server Error');
  }
 });



 router.get('/dashboard/cash/list',verify.adminAuthenticationToken, async (req, res) => {
  try {
    let query = `SELECT * FROM cash`;
    const result = await queryAsync(query);
    res.render(`cashlist`, { result });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Internal Server Error');
  }
 });


 router.get('/dashboard/update/data',verify.adminAuthenticationToken,(req,res)=>{
  let id = req.query.id;
  pool.query(`select * from users where id = ${id}`,(err,result)=>{
    if(err) throw err;
    else res.render(`updatedata`,{result})
  })
  
})



router.get('/dashboard/cash/update/data',verify.adminAuthenticationToken,(req,res)=>{
  let id = req.query.id;
  pool.query(`select * from cash where id = ${id}`,(err,result)=>{
    if(err) throw err;
    else res.render(`cash_updatedata`,{result})
  })
  
})



router.post('/dashboard/upload/data',verify.adminAuthenticationToken, (req, res) => {
  console.log('req.body', req.body);
  pool.query('UPDATE users SET ? WHERE id = ?', [req.body, req.body.id], (err, result) => {
      if (err) {
          console.error('Error updating data:', err);
          return res.status(500).json({ msg: 'error' });
      }
      res.json({ msg: 'success' });
  });
});



router.post('/cash/upload/data',verify.adminAuthenticationToken, (req, res) => {
  console.log('req.body', req.body);
  pool.query('UPDATE cash SET ? WHERE id = ?', [req.body, req.body.id], (err, result) => {
      if (err) {
          console.error('Error updating data:', err);
          return res.status(500).json({ msg: 'error' });
      }
      res.json({ msg: 'success' });
  });
});


router.get('/dashboard/delete/data',verify.adminAuthenticationToken,(req,res)=>{
  let id = req.query.id;
  pool.query(`delete from users where id = ${id}`,(err,result)=>{
    if(err) throw err;
    // else res.redirect('/admin/dashboard/customer/list')
    else{
        pool.query(`delete from short_report where unique_id = '${id}'`,(err,result)=>{
    if(err) throw err;
    else {
      pool.query(`delete from detail_report where unique_id = '${id}'`,(err,result)=>{
        if(err) throw err;
        // else res.json({msg:'success'})
        else{
          pool.query(`delete from cash where id = ${id}`,(err,result)=>{
            if(err) throw err;
            // else res.redirect('/admin/dashboard/cash/list')
    else res.redirect('/admin/dashboard/customer/list')

          })
        }
      })
    }
  })
    }
  })
  
})


router.get('/dashboard/cash/delete/data',verify.adminAuthenticationToken,(req,res)=>{
  let id = req.query.id;
  pool.query(`delete from cash where id = ${id}`,(err,result)=>{
    if(err) throw err;
    else res.redirect('/admin/dashboard/cash/list')
  })
  
})



router.get('/dashboard/customer/account/link',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`link`,{msg:''})
})


router.get('/dashboard/promotion',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`laptop/filters/promotion`,{msg:''})
})




router.post('/dashboard/promotion', async (req, res) => {

  let body = req.body;  

  console.log(body)
  
const { default: pLimit } = await import('p-limit');
const limit = pLimit(100); 

  pool.query(`SELECT * FROM users`, async (err, result) => {
    if (err) throw err;

    const tasks = result.map(user => 
      limit(() => verify.sendPromotionalMail(user, req.body.subject, req.body.message))
    );

    await Promise.all(tasks);
    res.redirect(`/admin/dashboard/promotion?message=${encodeURIComponent('Promotional Mail Sent Successfully.')}`);
  });
});



router.get('/dashboard/users/show', async (req, res) => {
  try {
    let query = `SELECT * FROM users`;
    const result = await queryAsync(query);
    res.json(result);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Internal Server Error');
  }
 });



 router.post('/dashboard/account/link',verify.adminAuthenticationToken, async (req, res) => {


  try {
      const { main_account_holder , second_account_holder } = req.body;

      // Check if seo_name already exists
      const existingRecord = await queryAsync('SELECT id FROM linked_account WHERE main_account_holder = ? and second_account_holder = ?', [main_account_holder , second_account_holder]);

      if (existingRecord.length > 0) {
          return res.json({ msg: 'exists' });
      }

      // Insert new record
      const insertResult = await queryAsync('INSERT INTO linked_account SET ?', req.body);

      if (insertResult.affectedRows > 0) {
          res.json({ msg: 'success' });
      } else {
          res.json({ msg: 'error' });
      }
  } catch (error) {
      console.error('Error in Linked Account/add:', error);
      res.status(500).json({ msg: 'error' });
  }
});



router.get('/dashboard/linked/account',verify.adminAuthenticationToken, async (req, res) => {
  console.log(req.query)
  try {
    let query = `SELECT * FROM linked_account WHERE main_account_holder = '${req.query.unique_id}' OR second_account_holder = '${req.query.unique_id}'`;
    const result = await queryAsync(query);
    console.log(result)
    res.render(`account-link-list`, { result , urlid : req.query.unique_id });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).send('Internal Server Error');
  }
 });




 router.get('/dashboard/link/account/delete/data',verify.adminAuthenticationToken,(req,res)=>{
  let id = req.query.id;
  pool.query(`delete from linked_account where id = ${id}`,(err,result)=>{
    if(err) throw err;
    else res.redirect(`/admin/dashboard/linked/account?unique_id=${req.query.urlid}`)
  })
  
})


router.get('/dashboard/add/csv',verify.adminAuthenticationToken,(req,res)=>{
  res.render(`add_csv`,{msg:''})
})



router.get('/customer/dashboard', verify.adminAuthenticationToken, (req, res) => {
  var getCurrentWeekDates = verify.getCurrentWeekDates();
  var getCurrentMonthDates = verify.getCurrentMonthDates();
  var getLastMonthDates = verify.getLastMonthDates();
  var getCurrentYearDates = verify.getCurrentYearDates();
  var weeklyreport = `select COALESCE(sum(actual_pl), 0) as weekly_actual_pl from short_report where unique_id = '${req.query.unique_id}' and str_to_date(date, '%d-%m-%Y') between '${getCurrentWeekDates.startDate}' and '${getCurrentWeekDates.endDate}';`;
  var monthlyreport = `select COALESCE(sum(actual_pl), 0) as monthly_actual_pl from short_report where unique_id = '${req.query.unique_id}' and str_to_date(date, '%d-%m-%Y') between '${getCurrentMonthDates.startDate}' and '${getCurrentMonthDates.endDate}';`;
  var lastmonthreport = `select COALESCE(sum(actual_pl), 0) as last_month_actual_pl from short_report where unique_id = '${req.query.unique_id}' and str_to_date(date, '%d-%m-%Y') between '${getLastMonthDates.startDate}' and '${getLastMonthDates.endDate}';`;
  var yearlyreport = `select COALESCE(sum(actual_pl), 0) as yearly_actual_pl from short_report where unique_id = '${req.query.unique_id}' and str_to_date(date, '%d-%m-%Y') between '${getCurrentYearDates.startDate}' and '${getCurrentYearDates.endDate}';`;
  var lasttrade = `select * from short_report where unique_id = '${req.query.unique_id}' and str_to_date(date, '%d-%m-%Y') between '${getCurrentYearDates.startDate}' and '${getCurrentYearDates.endDate}' order by str_to_date(date, '%d-%m-%Y') desc;`
  var cashtrade = `select * from cash where unique_id = '${req.query.unique_id}' and date between '${getCurrentYearDates.startDate}' and '${getCurrentYearDates.endDate}' order by date desc;`
  var userdetails = `select * from users where unique_id = '${req.query.unique_id}';`
  pool.query(weeklyreport + monthlyreport + lastmonthreport + yearlyreport+lasttrade+cashtrade+userdetails, (err, result) => {
      if (err) throw err;
      else res.render(`customerdashboard`,{result,unique_id:req.query.unique_id})
      // else res.json(result);
  });
});



  router.get('/bar-graph', verify.adminAuthenticationToken,(req, res) => {
    var query = `SELECT
    IFNULL(SUM(CAST(actual_pl AS DECIMAL)), 0) AS total_actual_pl
  FROM
    (
      SELECT '04' AS month UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL
      SELECT '07' UNION ALL SELECT '08' UNION ALL SELECT '09' UNION ALL
      SELECT '10' UNION ALL SELECT '11' UNION ALL SELECT '12' UNION ALL
      SELECT '01' UNION ALL SELECT '02' UNION ALL SELECT '03'
    ) AS months
  LEFT JOIN
    short_report AS sr ON SUBSTRING(sr.date, 4, 2) = months.month
                        AND STR_TO_DATE(sr.date, '%d-%m-%Y') BETWEEN
                            DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 YEAR), '%Y-04-01')
                            AND DATE_FORMAT(CURDATE(), '%Y-03-31')
                        AND unique_id = '${req.query.unique_id}'
  GROUP BY
    months.month
  ORDER BY
    months.month;`;
    pool.query(query, (err, result) => {
        if (err) {
            throw err;
        } else {
            const totalActualPl = result.map(item => item.total_actual_pl);
            const reorderedArray = totalActualPl.slice(3).concat(totalActualPl.slice(0, 3));
            res.json(reorderedArray);
        }
    });
  });



router.get('/commission-graph', verify.adminAuthenticationToken,(req, res) => {
  let percentage = 0.2;

pool.query(`select percentage from users where unique_id = '${req.query.unique_id}'`,(err,result)=>{
  if(err) throw err;
  else{
    if(result[0]){
      percentage = result[0].percentage/100;
    }
    
    var query = `SELECT
    IFNULL(SUM(CAST(actual_pl AS DECIMAL)), 0) AS total_actual_pl
  FROM
    (
      SELECT '04' AS month UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL
      SELECT '07' UNION ALL SELECT '08' UNION ALL SELECT '09' UNION ALL
      SELECT '10' UNION ALL SELECT '11' UNION ALL SELECT '12' UNION ALL
      SELECT '01' UNION ALL SELECT '02' UNION ALL SELECT '03'
    ) AS months
  LEFT JOIN
    short_report AS sr ON SUBSTRING(sr.date, 4, 2) = months.month
                        AND STR_TO_DATE(sr.date, '%d-%m-%Y') BETWEEN
                            DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 YEAR), '%Y-04-01')
                            AND DATE_FORMAT(CURDATE(), '%Y-03-31')
                        AND unique_id = '${req.query.unique_id}'
  GROUP BY
    months.month
  ORDER BY
    months.month;`;
    pool.query(query, (err, result) => {
        if (err) {
            throw err;
        } else {
            const dataWithCommission = result.map(item => {
                const totalActualPl = parseFloat(item.total_actual_pl);
                const commission = totalActualPl * percentage;
                return { total_actual_pl: totalActualPl, commission: commission };
            });
  
            const totalActualPl = dataWithCommission.map(item => item.commission.toFixed(2));
            const reorderedArray = totalActualPl.slice(3).concat(totalActualPl.slice(0, 3));
            res.json(reorderedArray);
            // res.json(totalActualPl);
            // res.json(dataWithCommission);
        }
    });
  }
})

 
});



router.get('/dashboard/bar-graph', verify.adminAuthenticationToken,(req, res) => {
  var query = `SELECT
  IFNULL(SUM(CAST(actual_pl AS DECIMAL)), 0) AS total_actual_pl
FROM
  (
    SELECT '04' AS month UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL
    SELECT '07' UNION ALL SELECT '08' UNION ALL SELECT '09' UNION ALL
    SELECT '10' UNION ALL SELECT '11' UNION ALL SELECT '12' UNION ALL
    SELECT '01' UNION ALL SELECT '02' UNION ALL SELECT '03'
  ) AS months
LEFT JOIN
  short_report AS sr ON SUBSTRING(sr.date, 4, 2) = months.month
                      AND STR_TO_DATE(sr.date, '%d-%m-%Y') BETWEEN
                          DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 YEAR), '%Y-04-01')
                          AND DATE_FORMAT(CURDATE(), '%Y-03-31')
GROUP BY
  months.month
ORDER BY
  months.month;`;
  pool.query(query, (err, result) => {
      if (err) {
          throw err;
      } else {
          const totalActualPl = result.map(item => item.total_actual_pl);
          const reorderedArray = totalActualPl.slice(3).concat(totalActualPl.slice(0, 3));
          res.json(reorderedArray);
          // res.json(totalActualPl);
      }
  });
});


router.get('/dashboard/commission-graph',verify.adminAuthenticationToken, (req, res) => {
  pool.query(`SELECT unique_id, AVG(percentage) AS avg_percentage FROM users GROUP BY unique_id`, (err, userResults) => {
      if (err) {
          throw err;
      } else {
          const commissions = [];
          userResults.forEach(userResult => {
              const userCommissionQuery = `SELECT
                                              IFNULL(SUM(CAST(actual_pl AS DECIMAL)), 0) AS total_actual_pl
                                          FROM
                                              (
                                                  SELECT '04' AS month UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL
                                                  SELECT '07' UNION ALL SELECT '08' UNION ALL SELECT '09' UNION ALL
                                                  SELECT '10' UNION ALL SELECT '11' UNION ALL SELECT '12' UNION ALL
                                                  SELECT '01' UNION ALL SELECT '02' UNION ALL SELECT '03'
                                              ) AS months
                                          LEFT JOIN
                                              short_report AS sr ON SUBSTRING(sr.date, 4, 2) = months.month
                                                                  AND STR_TO_DATE(sr.date, '%d-%m-%Y') BETWEEN
                                                                      DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 YEAR), '%Y-04-01')
                                                                      AND DATE_FORMAT(CURDATE(), '%Y-03-31')
                                                                  AND unique_id = '${userResult.unique_id}'
                                          GROUP BY
                                              months.month
                                          ORDER BY
                                              months.month;`;
              pool.query(userCommissionQuery, (commissionErr, commissionResults) => {
                  if (commissionErr) {
                      throw commissionErr;
                  } else {
                      const userCommissions = commissionResults.map(item => {
                          const totalActualPl = parseFloat(item.total_actual_pl);
                          const commissionPercentage = userResult.avg_percentage / 100;
                          const commission = totalActualPl * commissionPercentage;
                          return { total_actual_pl: totalActualPl, commission: commission };
                      });
                      commissions.push(userCommissions);
                      if (commissions.length === userResults.length) {
                          // Calculate total commissions for each month
                          const totalCommissions = Array(12).fill(0);
                          commissions.forEach(userCommission => {
                              userCommission.forEach((item, index) => {
                                  totalCommissions[index] += item.commission;
                              });
                          });
                          const totalCommissionsFormatted = totalCommissions.map(commission => commission.toFixed(2));
                                      const reorderedArray = totalCommissionsFormatted.slice(3).concat(totalCommissionsFormatted.slice(0, 3));
            res.json(reorderedArray);
                          // res.json(totalCommissionsFormatted);
                      }
                  }
              });
          });
      }
  });
});


// router.get('/dashboard/commission-graph', (req, res) => {

// pool.query(`select avg(percentage) as avg_percentage from users`,(err,result)=>{
//   if(err) throw err;
//   else {
//     let percentage = result[0].avg_percentage/100;
//     var query = `SELECT
//     IFNULL(SUM(CAST(actual_pl AS DECIMAL)), 0) AS total_actual_pl
//   FROM
//     (
//       SELECT '04' AS month UNION ALL SELECT '05' UNION ALL SELECT '06' UNION ALL
//       SELECT '07' UNION ALL SELECT '08' UNION ALL SELECT '09' UNION ALL
//       SELECT '10' UNION ALL SELECT '11' UNION ALL SELECT '12' UNION ALL
//       SELECT '01' UNION ALL SELECT '02' UNION ALL SELECT '03'
//     ) AS months
//   LEFT JOIN
//     short_report AS sr ON SUBSTRING(sr.date, 4, 2) = months.month
//                         AND STR_TO_DATE(sr.date, '%d-%m-%Y') BETWEEN
//                             DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 YEAR), '%Y-04-01')
//                             AND DATE_FORMAT(CURDATE(), '%Y-03-31')
//   GROUP BY
//     months.month
//   ORDER BY
//     months.month;`;
//     pool.query(query, (err, result) => {
//         if (err) {
//             throw err;
//         } else {
//             const dataWithCommission = result.map(item => {
//                 const totalActualPl = parseFloat(item.total_actual_pl);
//                 const commission = totalActualPl * 0.35;
//                 return { total_actual_pl: totalActualPl, commission: commission };
//             });
  
//             const totalActualPl = dataWithCommission.map(item => item.commission.toFixed(2));
//             const reorderedArray = totalActualPl.slice(3).concat(totalActualPl.slice(0, 3));
//             res.json(reorderedArray);
//             // res.json(totalActualPl);
//             // res.json(dataWithCommission);
//         }
//     });
//   }
// })

 
// });


router.get('/customer/trade/details',verify.adminAuthenticationToken,(req,res)=>{
  var query = `select * from detail_report where date = '${req.query.date}' and unique_id = '${req.query.unique_id}';`
  pool.query(query,(err,result)=>{
    if(err) throw err;
    else res.render('trade_list',{result})
    //  else res.json(result)
  })
})




router.post('/report/search',verify.adminAuthenticationToken,(req,res)=>{
  console.log(req.body)
  var query =`select * from short_report where str_to_date(date, '%d-%m-%Y') between '${req.body.from_date}' and '${req.body.to_date}' and unique_id  = '${req.body.unique_id}' order by date`
  pool.query(query,(err,result)=>{
    if(err) throw err;
    else res.json(result)
  })
})



// router.post('/payout/report/search',verify.adminAuthenticationToken,(req,res)=>{
//   console.log(req.body)
//   var query =`select sum(s.actual_pl) , 
//   (select u.name from users u where u.unique_id = s.unique_id) as username,
//   (select u.percentage from users u where u.unique_id = s.unique_id) as userpercentage
//   from short_report s where str_to_date(s.date, '%d-%m-%Y') between '${req.body.from_date}' and '${req.body.to_date}';`
//   pool.query(query,(err,result)=>{
//     if(err) throw err;
//     else res.json(result)
//   })
// })


router.post('/payout/report/search', verify.adminAuthenticationToken, (req, res) => {
  console.log(req.body);

  // Using placeholders for prepared statements
  var query = `
      SELECT 
          s.unique_id,
          SUM(s.actual_pl) AS total_pl,
          u.name AS username,
          u.percentage AS userpercentage
      FROM 
          short_report s
      JOIN 
          users u ON s.unique_id = u.unique_id
      WHERE 
          STR_TO_DATE(s.date, '%d-%m-%Y') BETWEEN ? AND ?
      GROUP BY 
          s.unique_id, u.name, u.percentage
  `;

  // Values for prepared statement
  var values = [
      req.body.from_date,
      req.body.to_date
  ];

  pool.query(query, values, (err, result) => {
      if (err) {
          throw err; // Handle error appropriately, maybe log it
      } else {
          res.json(result);
      }
  });
});



// router.get('/old-delete-data',(req,res)=>{
//   pool.query(`delete from short_report where unique_id = '${req.query.unique_id}'`,(err,result)=>{
//     if(err) throw err;
//     else {
//       pool.query(`delete from detail_report where unique_id = '${req.query.unique_id}'`,(err,result)=>{
//         if(err) throw err;
//         else res.json({msg:'success'})
//       })
//     }
//   })
// })




router.get('/dashboard/master/category/list',(req,res)=>{
  pool.query(`select * from master_category`,(err,result)=>{
    if(err) throw err;
    else res.render(`masterlist`,{result})
  })
})


// router.post('/dashboard/master/category/update-status',(req,res)=>{
//   let body = req.body;
//   console.log(body)
//   pool.query(`update master_category set status = '${req.body.status}' , delivery_charges = '${req.body.delivery_charges}' where id = '${req.body.id}'`,(err,result)=>{
//     if(err) throw err;
//     else res.json({msg:'succcess'})
//   })
// })


router.post('/dashboard/master/category/update-status', (req, res) => {
  let body = req.body;
  console.log(body);

  // Initialize an array to store the update parts of the query
  let updateFields = [];
  
  // Iterate over the body object to construct dynamic query
  for (const key in body) {
    if (body.hasOwnProperty(key) && key !== 'id') {
      let value = body[key];

      // Ensure the status is saved as a string 'true' or 'false'
      if (key === 'status') {
        value = value === true ? 'true' : 'false';
      }

      // Use parameterized query format to prevent SQL injection
      updateFields.push(`${key} = ?`);
      
      // Update the value in the body to match the desired format
      body[key] = value;
    }
  }

  // If there are no fields to update, return an error response
  if (updateFields.length === 0) {
    return res.status(400).json({ msg: 'No fields to update' });
  }

  // Construct the SQL query
  const sqlQuery = `UPDATE master_category SET ${updateFields.join(', ')} WHERE id = ?`;

  // Construct an array of values to be passed to the query, excluding 'id'
  const values = Object.keys(body)
    .filter(key => key !== 'id')
    .map(key => body[key]);

  // Add the 'id' value as the last parameter
  values.push(body.id);

  // Execute the query with dynamic fields and values
  pool.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ msg: 'Database error', error: err.message });
    } else {
      res.json({ msg: 'success' });
    }
  });
});




module.exports = router;
