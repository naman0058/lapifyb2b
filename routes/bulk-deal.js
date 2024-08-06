var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
const upload = require('./multer');
var folder = 'bulkDeal'
var isimage = ['accessories','refurbished_parts','new_parts']
var databasetable = 'bulkdeal'


router.get('/', verify.adminAuthenticationToken, (req, res) => {
    
    res.render(`${folder}/add`,{msg:req.query.message})
});





router.post('/insert', verify.adminAuthenticationToken, upload.fields([{ name: 'images', maxCount: 12 }, { name: 'excel' }]), async (req, res) => {
    const { body, files } = req;

    try {
        console.log('images', files['images']);
        console.log('excel', files['excel']);
        console.log('body', body);

        // Uncomment the following code when you're ready to process and insert the data into the database
        
        body.created_at = verify.getCurrentDate();
        body.status = true;
        body.updated_at = verify.getCurrentDate();
        body.images = files['images'].map(file => file.filename).join(',');
        body.excel = files['excel'][0].filename;

        await queryAsync(`INSERT INTO ${databasetable} SET ?`, body);
        res.redirect(`/admin/dashboard/bulk-deal?message=${encodeURIComponent('Saved Successfully')}`);
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});






router.get('/list',verify.adminAuthenticationToken, (req, res) => {

    pool.query(`SELECT d.* ,
        (select c.name from laptop_filters c where c.id = d.category) as categoryname
        FROM ${databasetable} d WHERE d.status = true order by id desc`, (err, result) => {
        if (err) {
            throw err;
        } else {
            // res.json({ result, isImage });
            res.render(`${folder}/list`,{result})
        }
    });
});




const fs = require('fs');
const path = require('path');

router.get('/delete', verify.adminAuthenticationToken, async (req, res) => {
    pool.query(`SELECT * FROM ${databasetable} WHERE id = '${req.query.id}'`, (err, result) => {
        if (err) {
            throw err;
        } else {
            let images = result[0].images.split(',');
            let excel = result[0].excel
            // Delete images from the 'images' folder
            images.forEach(image => {
                let imagePath = path.join('public/images', image);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Error deleting image ${image}: ${err}`);
                    }
                });
            });

            fs.unlink(`public/images/${excel}`, (err) => {
                if (err) {
                    console.error(`Error deleting excel ${excel}: ${err}`);
                }
            });
            // Delete record from the database
            pool.query(`DELETE FROM ${databasetable} WHERE id = '${req.query.id}'`, (err, result) => {
                if (err) {
                    throw err;
                } else {
                    res.redirect('/admin/dashboard/bulk-deal/list');
                }
            });
        }
    });
});











module.exports = router;