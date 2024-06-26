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


router.post('/user/login', async (req, res) => {
    const { number, password } = req.body;

    try {
        // Use parameterized queries to prevent SQL injection
        const query = 'SELECT * FROM users WHERE number = ? AND password = ?';
        const result = await queryAsync(query, [number, password]);

        if (result.length > 0) {
            pool.query(`update users set token = '${req.body.token}' where unique_id = '${result[0].unique_id}'`,(err,data)=>{
                if(err) throw err;
                else{
                    res.json(result);

                }

            })
        } else {
            res.json({ msg: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error while logging in:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});




router.get('/user/dashboard', verify.userAuthenticationToken, async (req, res) => {
    try {
        const getCurrentWeekDates = verify.getCurrentWeekDates();
        const getCurrentMonthDates = verify.getCurrentMonthDates();
        const getLastMonthDates = verify.getLastMonthDates();
        const getCurrentYearDates = verify.getCurrentYearDates();
        const getLastFinancialYearDates = verify.getLastFinancialYearDates()

        const weeklyreport = `SELECT COALESCE(SUM(actual_pl), 0) AS weekly_actual_pl FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ?;`;
        const monthlyreport = `SELECT COALESCE(SUM(actual_pl), 0) AS monthly_actual_pl FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ?;`;
        const lastmonthreport = `SELECT COALESCE(SUM(actual_pl), 0) AS last_month_actual_pl FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ?;`;
        const yearlyreport = `SELECT COALESCE(SUM(actual_pl), 0) AS yearly_actual_pl FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ?;`;
        const lastyearlyreport = `SELECT COALESCE(SUM(actual_pl), 0) AS last_yearly_actual_pl FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ?;`;
        const lasttrade = `SELECT * FROM short_report WHERE unique_id = ? ORDER BY str_to_date(date, '%d-%m-%Y') DESC LIMIT 5;`;

        const queryParams = [
            req.data,
            getCurrentWeekDates.startDate, getCurrentWeekDates.endDate,
            req.data,
            getCurrentMonthDates.startDate, getCurrentMonthDates.endDate,
            req.data,
            getLastMonthDates.startDate, getLastMonthDates.endDate,
            req.data,
            getCurrentYearDates.startDate, getCurrentYearDates.endDate,
            req.data,
            getLastFinancialYearDates.startDate, getLastFinancialYearDates.endDate,
            req.data
        ];

        const sqlQuery = weeklyreport + monthlyreport + lastmonthreport + yearlyreport + lastyearlyreport + lasttrade;
        const result = await queryAsync(sqlQuery, queryParams);


        
        res.json(result);
    } catch (error) {
        console.error('Error while fetching user dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/user/latests-trade', verify.userAuthenticationToken, async (req, res) => {
    var getCurrentYearDates = verify.getCurrentYearDates();

    try {
        const query = `
            SELECT *, 
                (SELECT SUM(actual_pl) FROM short_report WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN '${getCurrentYearDates.startDate}' AND '${getCurrentYearDates.endDate}') AS total_sum 
            FROM short_report 
            WHERE unique_id = ? AND str_to_date(date, '%d-%m-%Y') BETWEEN '${getCurrentYearDates.startDate}' AND '${getCurrentYearDates.endDate}' 
            ORDER BY str_to_date(date, '%d-%m-%Y') DESC`;
        
        const result = await queryAsync(query, [req.data, req.data]);

        res.json(result);
    } catch (error) {
        console.error('Error while fetching user latest trades:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});





router.get('/user/trade/details', verify.userAuthenticationToken, async (req, res) => {
    try {
        const query = 'SELECT * FROM detail_report WHERE date = ? AND unique_id = ?';
        const result = await queryAsync(query, [req.query.date, req.data]);

        res.json(result);
    } catch (error) {
        console.error('Error while fetching user trade details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

  
  
  
  
// router.post('/user/report/search', verify.userAuthenticationToken, async (req, res) => {
//     try {
//         const query = `SELECT * FROM short_report WHERE str_to_date(date, '%d-%m-%Y') BETWEEN ? AND ? AND unique_id = ? ORDER BY date`;
//         const queryParams = [req.body.from_date, req.body.to_date, req.data];
        
//         const result = await queryAsync(query, queryParams);
        
//         res.json(result);
//     } catch (error) {
//         console.error('Error while searching user report:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });



    router.get('/user/last/trade',verify.userAuthenticationToken,(req,res)=>{
        
    pool.query(`select date,actual_pl from short_report where unique_id = '${req.data}' order by str_to_date(date, '%d-%m-%Y') desc limit 1`,(err,result)=>{
        if(err) throw err;
        else if(result[0]){
            let last_date = result[0].date;
            let last_pl = result[0].actual_pl;
            pool.query(`select * from detail_report where date = '${last_date}'`,(err,result)=>{
                if(err) throw err;
                else {
                    res.json({result:result,last_date:last_date,last_pl:last_pl})
                }
            })
        }
        else {
        res.json(result)
        }
    })
    })




    router.get('/user/linked/account',verify.userAuthenticationToken, async (req, res) => {
        console.log(req.query)
        try {
          let query = `SELECT l.* ,(select u.name from users u where u.unique_id = l.second_account_holder) as linked_account FROM linked_account l WHERE main_account_holder = '${req.data}'`;
          const result = await queryAsync(query);
          res.json(result)
        } catch (error) {
          console.error('Error executing query:', error);
          res.status(500).send('Internal Server Error');
        }
       });


       router.get('/user/profile',verify.userAuthenticationToken, async (req, res) => {
        console.log(req.query)
        try {
          let query = `SELECT * FROM users WHERE unique_id = '${req.data}'`;
          const result = await queryAsync(query);
          res.json(result)
        } catch (error) {
          console.error('Error executing query:', error);
          res.status(500).send('Internal Server Error');
        }
       });


    //    router.post('/contactus', async (req, res) => {


    //     try {
    //         const { unique_id } = req.body;
      
      
    //         // Insert new record
    //         const insertResult = await queryAsync('INSERT INTO contact SET ?', req.body);
      
    //         if (insertResult.affectedRows > 0) {
    //             res.json({ msg: 'success' });
    //         } else {
    //             res.json({ msg: 'error' });
    //         }
    //     } catch (error) {
    //         console.error('Error in customer/add:', error);
    //         res.status(500).json({ msg: 'error' });
    //     }
    //   });





    //   router.post('/change-password', (req, res) => {
    //     console.log('req.body', req.body);
    //     pool.query(`select * from users where unique_id = '${req.body.unique_id}'`,(err,result)=>{
    //         if(err) throw err;
    //         else {
    //             if(result[0].password == req.body.old_password){
    //                 pool.query(`UPDATE users SET password = '${req.body.password}' WHERE id = '${req.body.unique_id}'`,(err, result) => {
    //                     if (err) {
    //                         console.error('Error updating data:', err);
    //                         return res.status(500).json({ msg: 'error' });
    //                     }
    //                     res.json({ msg: 'success' });
    //                 });
    //             }
    //             else{
    //                 res.json({msg:'Invalid Credentials'})
    //             }
    //         }
    //     })
  
    //   });

    router.post('/change-password', async (req, res) => {
        try {
            const { unique_id, old_password, password } = req.body;
    
            // Validate inputs
            if (!unique_id || !old_password || !password) {
                return res.status(400).json({ msg: 'Missing required fields' });
            }
    
            // Check if old password matches
            const user = await queryAsync(`SELECT * FROM users WHERE unique_id = '${unique_id}'`);
            if (!user[0]) {
                return res.status(404).json({ msg: 'User not found' });
            }
            if (user[0].password !== old_password) {
                return res.status(401).json({ msg: 'Invalid old password' });
            }
    
            // Update password
            await queryAsync(`UPDATE users SET password = '${password}' WHERE unique_id = '${unique_id}'`);
            
            res.json({ msg: 'Password updated successfully' });
        } catch (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ msg: 'Internal server error' });
        }
    });
    


    router.get('/bar-graph', verify.userAuthenticationToken, (req, res) => {
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
                                AND unique_id = '${req.data}'
        GROUP BY
            months.month
        ORDER BY
            months.month;`;
    
        // Define an array of colors corresponding to each month
        const colors = ['#0093D8', '#6CAEDF', '#084B77', '#FF5733', '#F45B69', '#FFA372',
                        '#95D5B2', '#FFCE32', '#D3E0F5', '#B71C1C', '#FAD02E', '#DAF7A6'];
    
        pool.query(query, (err, result) => {
            if (err) {
                throw err;
            } else {
                const totalActualPl = result.map(item => item.total_actual_pl);
                const reorderedArray = totalActualPl.slice(3).concat(totalActualPl.slice(0, 3));
    
                // Transform reorderedArray into the desired format
                const output = reorderedArray.map((value, index) => ({
                    x: index + 1,
                    y: parseInt(value),
                    color: colors[index],
                    label: getMonthLabel(index) // Get month label using a helper function
                }));
    
                res.json(output);
            }
        });
    });
    
    // Helper function to get month label
    function getMonthLabel(index) {
        const months = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC','JAN','FEB','MAR'];
        return months[index];
    }
    


    function decodeEncodedTextFindLength(encodedText) {
        const parts = encodedText.split('').filter(part => part.trim() !== ''); // Split the text based on the separator and remove empty parts
        console.log('parts', parts.length);
        return parts.length; // Return the length of parts
    }
    
    // parts.length = 28 then decodeEncodedText() run perfect
    // Decoding function in Node.js
    function decodeEncodedText(encodedText) {
        const parts = encodedText.split('').filter(part => part.trim() !== ''); // Split the text based on the separator and remove empty parts

        if(parts.length == '5'){
        console.log('parts',parts)

            // parts[11] = parts[11].replace('b', '').replace('\x1E', '')
            // parts[10] = parts[10].replace('a', '')
            
            // merged_data = parts[10] + ' ' + parts[11]


            // const authors = parts[5].replace('c', '').replace('\x1E', '');
            // const unknow19 = parts[19].replace('a', '').replace('\x1E', '');

            // console.log('see',authors)
        
            // let finalContent = null;
        
            // if (authors.trim() !== '') {
            //     console.log('authors has value:', authors);
            //     finalContent = authors;
            // } else {
            //     console.log('authors is empty');

            //     finalContent = unknow19;
            // }
        

                    const metadata = {
                       
                        Title: parts[1].replace('a', '').replace('\x1E', '') || "",
                        Editor: parts[2].replace('b', '').replace('\x1E', '') || "",
                        Location: parts[3].replace('a', '').replace('\x1E', '') || "",
                         Publisher: parts[4].replace('b', '').replace('\x1E', '') || "",
                        //  Year: parts[5].replace('c', '').replace('\x1E', '') || "",

                        // Title: parts[3].replace('a', '').replace('\x1E', '') || "",
                        // Editor: parts[4].replace('b', '').replace('\x1E', '') || "",
                        // Authors: finalContent,
                        // Location: parts[6].replace('a', '').replace('\x1E', '') || "",
                        // Publisher: parts[7].replace('b', '').replace('\x1E', '') || "",
                        // Year: parts[8].replace('c', '').replace('\x1E', '') || "",
                        // Description: parts[9].replace('a', '').replace('\x1E', '') || "",
                        // Call: merged_data,
            
                        // Subjects: parts[12].replace('a', '').replace('\x1E', '') || "",
                        // Unknow13: parts[13].replace('a', '').replace('\x1E', '') || "",
                        // Unknow14: parts[14].replace('a', '').replace('\x1E', '') || "",
                        // Notes: parts[15].replace('a', '').replace('\x1E', '') || "",
                        // Price: parts[16].replace('a', '').replace('\x1E', '') || "",
                        // Content: parts[17].replace('a', '').replace('\x1E', '') || "",
                        // Unknow18: parts[18].replace('a', '').replace('\x1E', '') || "",
                        // Unknow19: parts[19].replace('a', '').replace('\x1E', '') || "",
                        // Unknow20: parts[20].replace('a', '').replace('\x1E', '') || "",
                        // Unknow21: parts[21].replace('a', '').replace('\x1E', '') || "",
                        // Unknow22: parts[22].replace('a', '').replace('\x1E', '') || "",
                        // Unknow23: parts[23].replace('a', '').replace('\x1E', '') || "",
                        // Unknow24: parts[24].replace('a', '').replace('\x1E', '') || "",
                        // Unknow25: parts[25].replace('a', '').replace('\x1E', '') || "",
                        // Unknow26: parts[26].replace('a', '').replace('\x1E', '') || "",
                        // Unknow27: parts[27].replace('g', '').replace('\x1E', '') || "",
                       
                        // Unknow32: parts[32].replace('a', '').replace('\x1E', '') || "",
            
            
                    };
            
                    pool.query(`INSERT INTO formatting_data SET ?`, metadata, (err, result) => {
                        if (err) {
                            console.error('Error inserting data:', err);
                        } else {
                            // console.log('Data inserted successfully');
                        }
                    });
            
        }
        else{
        // console.log('Length Exceed')
        }


        
        // return metadata;
    }
    
    // const encodedText = "01905     2 00229   4501000002000398008004100340010000500000020000500005082002000172100000700333245010800010250000500198260003800118300001600156490000500323500002500298505009000208650000600192700000500328904000500203964001700381  a  a1 aDictionary of the anonymous & pseudonymous literature of Great BritainbcHalkett, Samuel & Laing, John  aEdinburghbWilliam Patersonc1888  a4 v., 25cm.  aRRb014.2 H173l  a   a1 a  aIncluding the works of foreigners written in, or translated into the English language  aPrice not available.  a  a  ad                                          abcdefgBS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        @||@|";
    // const decodedMetadata = decodeEncodedText(encodedText);
    // console.log(decodedMetadata);
    
    
  
    router.get('/fine-length', async (req, res) => {
        try {
            const result = await queryAsync(`SELECT LS_AREA_7 FROM MARC_NDX_TBL`);
            for (let i = 0; i < result.length; i++) {
                const encodedText = result[i].LS_AREA_7;
                const decodedMetadata = decodeEncodedText(encodedText);
                // console.log('done')
            }

            res.json({ msg:'done' }); // Send the count as JSON response
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).send("Internal Server Error");
        }
    });
    


    async function insertFormattedData(data) {
        try {
            await queryAsync(`INSERT INTO formatting_data SET ?`, data);
            console.log('Data inserted successfully');
        } catch (error) {
            console.error("Error inserting data:", error);
            throw error; // Propagate error to the caller
        }
    }


    // const result = await queryAsync(`SELECT LS_AREA_7 FROM MARC_NDX_TBL LIMIT 1000 OFFSET 1000`);

    



    router.get('/fine-count', async (req, res) => {
        try {
            const result = await queryAsync(`SELECT LS_AREA_7 FROM MARC_NDX_TBL`);
            
            // Initialize an object to store count for each length
            const lengthCount = {};
            let totalCount = 0; // Variable to store the total count of lengths encountered
    
            for (let i = 0; i < result.length; i++) {
                const encodedText = result[i].LS_AREA_7;
                const decodedMetadata = decodeEncodedTextFindLength1(encodedText);
    
                // Increment count for the corresponding length
                if (lengthCount[decodedMetadata]) {
                    lengthCount[decodedMetadata]++;
                } else {
                    lengthCount[decodedMetadata] = 1;
                }
    
                totalCount++; // Increment the total count
            }
    
            // Send the length count and total count as JSON response
            res.json({ lengthCount, totalCount });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).send("Internal Server Error");
        }
    });
    
    
    function decodeEncodedTextFindLength1(encodedText) {
        const parts = encodedText.split('').filter(part => part.trim() !== ''); // Split the text based on the separator and remove empty parts
        return parts.length; // Return the length of parts
    }




    router.get('/fine-count1', async (req, res) => {
        try {
            const result = await queryAsync(`SELECT LS_AREA_7 FROM MARC_NDX_TBL LIMIT 100 OFFSET 43900`);
            
            // Initialize an object to store count for each length
            const lengthCount = {};
            let totalCount = 0; // Variable to store the total count of lengths encountered
        
            for (let i = 0; i < result.length; i++) {
                const encodedText = result[i].LS_AREA_7;
                const decodedMetadata = decodeEncodedTextFindLength3(encodedText);
        
                // Increment count for the corresponding length
                if (lengthCount[decodedMetadata]) {
                    lengthCount[decodedMetadata]++;
                } else {
                    lengthCount[decodedMetadata] = 1;
                }
        
                totalCount++; // Increment the total count
            }
    
            // Loop through lengthCount object and create tables dynamically
            for (const length in lengthCount) {
                if (Object.hasOwnProperty.call(lengthCount, length)) {
                    // Check if length is greater than 195, if so, skip creating table and inserting data
                    if (parseInt(length) > 195) {
                        continue; // Skip to next iteration
                    }
                    
                    const tableName = `partslength${length}`;
                    const columns = Array.from({ length: parseInt(length) }, (_, index) => `r${index + 1}`);
                    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, ${columns.map(column => `${column} TEXT`).join(', ')})`;
                    
                    // Create table
                    await queryAsync(createTableQuery);
    
                    // Insert data into table
                    // Assuming result is an array of objects with LS_AREA_7 property
                    const values = result
                        .filter(item => decodeEncodedTextFindLength3(item.LS_AREA_7) === parseInt(length))
                        .map(item => {
                            const parts = item.LS_AREA_7.split('').filter(part => part.trim() !== '');
                            return parts.map((part, index) => `'${sanitizeString(part)}'`).join(', ');
                            // return parts.map((part, index) => `'${part}'`).join(', ');
                        });
    
                    if (values.length > 0) {
                        const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join('), (')})`;
                        await queryAsync(insertQuery);
                    }
                }
            }
        
            // Send the length count and total count as JSON response
            res.json({ lengthCount, totalCount });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).send("Internal Server Error");
        }
    });

    
    
    

    function decodeEncodedTextFindLength3(encodedText) {
        const parts = encodedText.split('').filter(part => part.trim() !== ''); // Split the text based on the separator and remove empty parts
        return parts.length; // Return the length of parts
    }
    


    // const sanitizeString = (str) => {
    //     // Escape single quotes in the string
    //     return str.replace(/'/g, "''");
    // };

    const sanitizeString = (str) => {
        // Replace all occurrences of '\x1E' with an empty string, escape single quotes, and remove first letter if it's a lowercase letter from 'a' to 'z'
        let sanitizedStr = str.replace(/'/g, "''").replace(/\x1E/g, '').replace(/\x1D/g, '');
    
        // Remove the first letter if it is within the range of 'a' to 'z'
        if (/^[a-z]/i.test(sanitizedStr)) {
            sanitizedStr = sanitizedStr.substring(1);
        }
    
        // Remove invalid characters or sequences from the string
        // sanitizedStr = sanitizedStr.replace(/[^ -~]/g, '');

        // Replace array brackets with string representations
    sanitizedStr = sanitizedStr.replace(/\[([^\]]+)\]/g, '');
    
        return sanitizedStr;
    };
    
    



    router.get('/profile',verify.userAuthenticationToken,async(req,res)=>{
        let result = await user.userlist(false,req.data)
        res.json(result)
    })
    
    




router.get('/get-filter',async(req,res)=>{
    try {
        const { tabledata, filter } = req.query;
        const result = await user.getFilter(tabledata, filter);
        res.json(result);
      } catch (error) {
        console.error('Error fetching filtered data:', error);
        res.status(500).json({ error: 'An error occurred while fetching the filtered data' });
      }
})





// router.get('/get-product', (req, res) => {
//     let { category, model, brand, status = true, generation } = req.query;
//     category = category.toLowerCase().replace(/ /g, "_");
//     console.log(category);

//     let query = `
//         SELECT p.*, (SELECT s.url FROM screenshots s WHERE s.productid = p.id ORDER BY id LIMIT 1) AS image,
//         l.generation
//         FROM product p
//         LEFT JOIN laptop_qcreport l ON l.productid = p.id
//         WHERE 1=1
//     `;
  
//     if (brand) query += ` AND p.brand = '${brand}'`;
//     if (model) query += ` AND p.modelno = '${model}'`;
//     if (category) {
//         // Handling multiple categories for 'Parts & Accessories'
//         if (category === 'Parts ') {
//             query += ` AND (p.category = 'accessories' OR p.category = 'new_parts' OR p.category = 'refurbished_parts')`;
//         } else {
//             query += ` AND p.category = '${category}'`;
//         }
//     }
//     if (status) query += ` AND p.status = ${status}`;
//     if (generation) query += ` AND l.generation = '${generation}'`;

//     pool.query(query, (err, results) => {
//         if (err) {
//             console.error('Error executing query:', err);
//             res.status(500).send('Internal Server Error');
//             return;
//         }
//         res.json({ result: results, value: req.query });
//     });
// });



router.get('/get-product', (req, res) => {
    let { category, model, brand, status = true, generation, userid } = req.query;
    category = category.toLowerCase().replace(/ /g, "_");
    console.log(category);

    let query = `
        SELECT p.*, 
            (SELECT s.url FROM screenshots s WHERE s.productid = p.id ORDER BY id LIMIT 1) AS image,
            l.generation,
            (SELECT quantity FROM cart c WHERE c.productid = p.id AND c.userid = '${userid}') AS cart_count
        FROM product p
        LEFT JOIN laptop_qcreport l ON l.productid = p.id
        WHERE 1=1
    `;

    if (brand) query += ` AND p.brand = '${brand}'`;
    if (model) query += ` AND p.modelno = '${model}'`;
    if (category) {
        // Handling multiple categories for 'Parts & Accessories'
        if (category === 'parts_') {
            query += ` AND (p.category = 'accessories' OR p.category = 'new_parts' OR p.category = 'refurbished_parts')`;
        } else {
            query += ` AND p.category = '${category}'`;
        }
    }
    if (status) query += ` AND p.status = ${status}`;
    if (generation) query += ` AND l.generation = '${generation}'`;

    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json({ result: results, value: req.query });
    });
});








router.get('/product_description', (req, res) => {
    let filtertable = '';

  
    const tableName = `${req.query.category}_qcreport`;



    if (isimage.includes(req.query.category)) {
        filtertable = 'parts_and_accessories_filters';
    }
    if (laptopfilter.includes(req.query.category)) {
        filtertable = 'laptop_filters';
    }
    if (mobilefilter.includes(req.query.category)) {
        filtertable = 'mobile_filters';
    }
    if (applefilter.includes(req.query.category)) {
        filtertable = 'apple_filters';
    }


    if (isimage.includes(req.query.category)) {

        console.log('run this side')

    var query = `
    SELECT d.*, 
    GROUP_CONCAT(s.url) AS productimages, 
    f1.name AS subcategoryname, 
    f2.name AS brandname
    FROM ${databasetable} d
    LEFT JOIN screenshots s ON d.id = s.productid
    LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
    LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
    WHERE  d.id = '${req.query.id}' and d.status = true
    GROUP BY d.id
    ORDER BY d.id DESC
`;
    }



    if(laptopfilter.includes(req.query.category)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*,   -- Select all columns from laptop_qcreport
        f3.name AS type_name,
        f4.name AS generation_name,
        f5.name AS processor_name,
        f6.name AS ram_name
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid
        LEFT JOIN ${filtertable} f3 ON lqr.type = f3.id
        LEFT JOIN ${filtertable} f4 ON lqr.generation = f4.id
        LEFT JOIN ${filtertable} f5 ON lqr.processor = f5.id
        LEFT JOIN ${filtertable} f6 ON lqr.ram = f6.id
        WHERE  d.id = '${req.query.id}' and d.status = true
        GROUP BY 
        d.id, f1.name, f2.name, f3.name, lqr._id
    ORDER BY 
        d.id DESC;
    `;
    }


    if(mobilefilter.includes(req.query.category)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*  -- Select all columns from laptop_qcreport
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid  -- Join laptop_qcreport table
        WHERE  d.id = '${req.query.id}' and d.status = true
        GROUP BY 
        d.id, f1.name, f2.name, lqr._id
    ORDER BY 
        d.id DESC;
    `;
    
    }



    if(applefilter.includes(req.query.category)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*,   -- Select all columns from laptop_qcreport
        f3.name AS pocessor_name
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid
        LEFT JOIN ${filtertable} f3 ON lqr.processor = f3.id
        WHERE  d.id = '${req.query.id}' and d.status = true
        GROUP BY 
    d.id, f1.name, f2.name, f3.name, lqr._id
ORDER BY 
    d.id DESC;
    `;
    }



    
    pool.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).json({ msg: 'error' });
        } else {
            if (isimage.includes(req.query.category)) {
                res.json({response: req.query.category, result })
                // res.json(result)

            }
            else {
                res.json({response: req.query.category, result })

                //  res.render(`${folder}/${req.query.category}/list`, { response: req.query.category, msg: req.query.message, result });
                // res.json(result)
            }
        }
    });
});



router.get('/get-subcategory',(req,res)=>{

    if (isimage.includes(req.query.category)) {
        filtertable = 'parts_and_accessories_filters';
    }
    if (laptopfilter.includes(req.query.category)) {
        filtertable = 'laptop_filters';
    }
    if (mobilefilter.includes(req.query.category)) {
        filtertable = 'mobile_filters';
    }
    if (applefilter.includes(req.query.category)) {
        filtertable = 'apple_filters';
    }
    console.log('category',req.query.category)
    console.log('filters',req.query.filters)


    pool.query(`select * from ${filtertable} where filters = '${req.query.filters}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})


module.exports = router