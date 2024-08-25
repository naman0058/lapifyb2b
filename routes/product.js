var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
const upload = require('./multer');
var folder = 'product'
var isimage = ['accessories','refurbished_parts','new_parts']
var laptopfilter = ['laptop']
var mobilefilter = ['mobile']
var applefilter = ['apple']

var databasetable = 'product'


router.get('/add/:name',verify.adminAuthenticationToken,(req,res)=>{
    if (isimage.includes(req.params.name)) {
        res.render(`${folder}/accessories/add`, { response: req.params.name, msg: req.query.message });
    } else {
        res.render(`${folder}/${req.params.name}/add`, { response: req.params.name, msg: req.query.message });
    }
})


router.post('/:name/insert', async (req, res) => {
    try {
        const body = req.body;
        body['category'] = req.params.name;
        body.created_at = verify.getCurrentDate();
        body.status = true;

        const existingProduct = await queryAsync(`SELECT * FROM ${databasetable} WHERE skuno = '${req.body.skuno}'`);

        if (existingProduct.length > 0) {
            res.json({ msg: 'exists' });
            return;
        }


        

        const insertedProduct = await queryAsync(`INSERT INTO ${databasetable} SET ?`, body);
        console.log(insertedProduct)
        const { insertId } = insertedProduct;

        await queryAsync(`INSERT INTO stock (productid, quantity, price, category, created_at) VALUES ('${insertId}', '${body.quantity}', '${body.price}', '${body.category}', '${body.created_at}')`);

        res.json({ msg: 'success', result: insertedProduct });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ msg: 'error' });
    }
});



router.post('/upload/screenshots', async (req, res) => {
    try {
      const { url, productid } = req.body;
    req.body.created_at = verify.getCurrentDate()
    req.body.updated_at = verify.getCurrentDate()

    console.log('body',req.body)

      // Assuming 'screenshots' is the table name
      const insertQuery = 'INSERT INTO screenshots (url, productid,created_at) VALUES ?';
      // Map the 'url' array to match the structure expected by MySQL
      const screenshotsValues = url.map((screenshot) => [screenshot.url, productid,req.body.created_at]);
      // Execute the insert query with parameterized values
      await queryAsync(insertQuery, [screenshotsValues]);
      console.log('Screenshots inserted successfully into MySQL');
      console.log(productid);
      res.json({ msg: 'success' });
    } catch (error) {
      console.error('Error inserting data into MySQL:', error);
      res.status(500).json({ msg: 'error' });
    }
   });



   router.post('/update/screenshots', async (req, res) => {
    try {
        const { url, id } = req.body;
        const updated_at = verify.getCurrentDate(); // Assuming this function returns the current date/time


        // Prepare the update query
        const updateQuery = 'UPDATE screenshots SET url = ?, updated_at = ? WHERE id = ?';

        // Map the 'url' array to match the structure expected by MySQL
        const screenshotsValues =  [req.body.url[0].url, updated_at, id];

        // Execute the update query with parameterized values
        await queryAsync(updateQuery, screenshotsValues);

        console.log('Screenshots updated successfully into MySQL');
        res.json({ msg: 'success' });
    } catch (error) {
        console.error('Error updating screenshots in MySQL:', error);
        res.status(500).json({ msg: 'error' });
    }
});






   router.get('/:name/list', (req, res) => {
    let filtertable = '';
    const tableName = `${req.params.name}_qcreport`;

    console.log('tbname',tableName)


    if (isimage.includes(req.params.name)) {
        filtertable = 'parts_and_accessories_filters';
    }
    if (laptopfilter.includes(req.params.name)) {
        filtertable = 'laptop_filters';
    }
    if (mobilefilter.includes(req.params.name)) {
        filtertable = 'mobile_filters';
    }
    if (applefilter.includes(req.params.name)) {
        filtertable = 'apple_filters';
    }


    if (isimage.includes(req.params.name)) {

    var query = `
    SELECT d.*, 
    GROUP_CONCAT(s.url) AS productimages, 
    f1.name AS subcategoryname, 
    f2.name AS brandname
    FROM ${databasetable} d
    LEFT JOIN screenshots s ON d.id = s.productid
    LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
    LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
    WHERE d.category = '${req.params.name}' and d.status = true
    GROUP BY d.id
    ORDER BY d.id DESC
`;
    }



    if(laptopfilter.includes(req.params.name)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*,   -- Select all columns from laptop_qcreport
        f3.name AS type_name,
        f4.name AS generation_name,
        f5.name AS processor_name,
        f6.name AS ram_name,
        f7.name AS graphics_card_name,
        f8.name AS screen_size_name,
        f9.name AS physical_condition_name
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid
        LEFT JOIN ${filtertable} f3 ON lqr.type = f3.id
        LEFT JOIN ${filtertable} f4 ON lqr.generation = f4.id
        LEFT JOIN ${filtertable} f5 ON lqr.processor = f5.id
        LEFT JOIN ${filtertable} f6 ON lqr.ram = f6.id
        LEFT JOIN ${filtertable} f7 ON lqr.graphics_card = f7.id
        LEFT JOIN ${filtertable} f8 ON lqr.screen_size = f8.id
        LEFT JOIN ${filtertable} f9 ON lqr.physical_condition = f9.id


        WHERE d.category = '${req.params.name}' and d.status = true
        GROUP BY 
        d.id, f1.name, f2.name, f3.name, lqr._id
    ORDER BY 
        d.id DESC;
    `;
    }


    if(mobilefilter.includes(req.params.name)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*,  -- Select all columns from laptop_qcreport
        f6.name AS ram_name,
        f9.name AS physical_condition_name
        
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid  -- Join laptop_qcreport table
        LEFT JOIN ${filtertable} f6 ON lqr.ram = f6.id
        LEFT JOIN ${filtertable} f9 ON lqr.physical_condition = f9.id

        WHERE d.category = '${req.params.name}' and d.status = true
        GROUP BY 
        d.id, f1.name, f2.name, lqr._id
    ORDER BY 
        d.id DESC;
    `;
    
    }



    if(applefilter.includes(req.params.name)){
        var query = `
        SELECT d.*, 
        GROUP_CONCAT(s.url) AS productimages, 
        f1.name AS subcategoryname, 
        f2.name AS brandname,
        lqr.*,   -- Select all columns from laptop_qcreport
        f3.name AS pocessor_name,
        f9.name AS physical_condition_name
        FROM ${databasetable} d
        LEFT JOIN screenshots s ON d.id = s.productid
        LEFT JOIN ${filtertable} f1 ON d.subcategory = f1.id
        LEFT JOIN ${filtertable} f2 ON d.brand = f2.id
        LEFT JOIN ${tableName} lqr ON d.id = lqr.productid
        LEFT JOIN ${filtertable} f3 ON lqr.processor = f3.id
        LEFT JOIN ${filtertable} f9 ON lqr.physical_condition = f9.id
        WHERE d.category = '${req.params.name}' and d.status = true
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
            if (isimage.includes(req.params.name)) {
                res.render(`${folder}/accessories/list`, { response: req.params.name, msg: req.query.message, result });
                // res.json(result)

            }
            else {
                 res.render(`${folder}/${req.params.name}/list`, { response: req.params.name, msg: req.query.message, result });
                // res.json(result)
            }
        }
    });
});



router.post('/add/:name/qcreport', async (req, res) => {
    try {
        let body = req.body;
        console.log('body data', body);

        const tableName = `${req.params.name}_qcreport`;
        const query = `INSERT INTO ${tableName} SET ?`;

        const result = await queryAsync(query, body);

        res.json({ msg: 'success' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ msg: 'error' });
    }
});




router.get('/:name/delete',verify.adminAuthenticationToken, async (req, res) => {
    const { id } = req.query;
    const { name } = req.params;
    const update = verify.getCurrentDate()

    try {
        await queryAsync(`UPDATE ${databasetable} SET status = false , updated_at = ? WHERE id = ?`, [update,id]);
        res.redirect(`/admin/dashboard/product/${encodeURIComponent(name)}/list`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/:name/update', verify.adminAuthenticationToken, async (req, res) => {
    const { name } = req.params;
    const { id } = req.query;
    const tableName = `${req.params.name}_qcreport`;
    let result = '';


    try {
    if (isimage.includes(req.params.name)) {

         result = await queryAsync(`SELECT * FROM ${databasetable} WHERE id = ?`, [id]);
    }
    else{
        result = await queryAsync(`SELECT * FROM ${databasetable} 
        INNER JOIN ${tableName} ON ${tableName}.productid = ${databasetable}.id 
        WHERE ${databasetable}.id = ?`, [id]);

    }
        const response = { name };
        if (isimage.includes(req.params.name)) {
            res.render(`${folder}/accessories/update`, { response:req.params.name, msg: req.query.message, result });
            // res.json(result)

        }
        else {
             res.render(`${folder}/${req.params.name}/update`, { response:req.params.name, msg: req.query.message, result });
            // res.json(result)
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});





router.post('/fetch-name',async(req,res)=>{
    let body = req.body.newdata;
    console.log(body)
    let result = await verify.fetch_name(body)
    res.json(result)
})



router.post('/:name/update', verify.adminAuthenticationToken, async (req, res) => {
    const { body, params, file } = req;
    const { name } = params;
    const tableName = `${req.params.name}_qcreport`;

    
// Define keys to move from body to qcreport
let keysToMove = ['display','battery','front_camera','back_camera', 'speaker' , 'wifi','bluetooth','network', 'fingerprint','face_id','power_key','volume_key','home_button','body',
'power_on','keyboard','webcam','touchpad','adapter','processor','storage', 'type','generation','ram', 'graphics_card', 'screen_size' , 'physical_condition' , 'charging_jack' , 'folder_type' , 'imei'];

// Remove keys from body and assign them to qcreport
let qcreport = {};
keysToMove.forEach(key => {
  if (key in body) {
    qcreport[key] = body[key];
    delete body[key];
  }
});


// console.log("body:", body);
// console.log("qcreport:", qcreport);



if(body.category == 'mobile'){
    let ramname = await verify.getDatas('mobile_filters',qcreport.ram)
    body.name = body.modelno + ' | ' + ramname + ' | ' +  qcreport.storage 
}

if(body.category == 'laptop'){
    let processorname = await verify.getDatas('laptop_filters',qcreport.processor)
    let generationname = await verify.getDatas('laptop_filters',qcreport.generation)
    let ramname = await verify.getDatas('laptop_filters',qcreport.ram)



    body.name =  body.modelno + ' | ' + processorname + ' | ' + generationname + ' | ' + ramname + ' | ' + qcreport.storage 
}


if(body.category == 'apple'){
    let processorname = await verify.getDatas('apple_filters',qcreport.processor)
    let subcategoryrname = await verify.getDatas('apple_filters',body.subcategory)

  



    body.name =  body.modelno + ' | ' + subcategoryrname + ' | ' + processorname + ' | ' + qcreport.storage  
}



if(body.category == 'accessories' || body.category == 'new_parts' || body.category == 'refurbished_parts'){
    let brandname = await verify.getDatas('parts_and_accessories_filters',body.brand)
   
    body.name =  body.modelno + ' | ' + brandname + ' | ' + body.category.toUpperCase() 
}










    try {
        body.updated_at = verify.getCurrentDate();
                await queryAsync(`UPDATE ${databasetable} SET ? WHERE id = ?`, [body, body.id]);
   
                if (!isimage.includes(req.params.name)) {
        await queryAsync(`UPDATE ${tableName} SET ? WHERE productid = ?`, [qcreport, body.id]);
    }

        res.redirect(`/admin/dashboard/product/${encodeURIComponent(name)}/list`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/:name/images',(req,res)=>{
    pool.query(`select * from screenshots where productid = '${req.query.id}' and status = true || status is null`,(err,result)=>{
        if(err) throw err;
        else {
            res.render(`${folder}/images`, { response: req.params.name, msg: req.query.message, result });

        }
    })
})


router.get('/:name/delete/images',(req,res)=>{
    pool.query(`DELETE FROM screenshots WHERE id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else {
           res.redirect(`/admin/dashboard/product/${req.params.name}/images?id=${req.query.productid}`)

        }
    })
})


router.get('/:name/update/images',(req,res)=>{
     res.render(`${folder}/updateimages`, { response: req.params.name, msg: req.query.message , id:req.query.id , productid:req.query.productid });

})



router.get('/:name/add/images',(req,res)=>{
    res.render(`${folder}/addimages`, { response: req.params.name, msg: req.query.message , id:req.query.id  });

})



module.exports = router;