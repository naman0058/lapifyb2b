var express = require('express');
var router = express.Router();
var pool = require('./pool');
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);
var verify = require('./verify');
const upload = require('./multer');
var folder = 'laptop/filters'
var isimage = ['brand','type', 'generation','banner','apk']
var databasetable = 'laptop_filters'


router.get('/:name', verify.adminAuthenticationToken, (req, res) => {
    const paramName = req.params.name;
    const response = { name: paramName };
    
    if (isimage.includes(paramName)) {
        response.isimage = true;
    }

    // res.json(response);
    res.render(`${folder}/add`,{response,msg:req.query.message})
});




router.post('/:name/insert',verify.adminAuthenticationToken, upload.single('image'), async (req, res) => {
    const { body, params, file } = req;
    const { name } = params;

    try {
        body.created_at = verify.getCurrentDate();
        body.status = true;
        body.updated_at = verify.getCurrentDate();
        if (isimage.includes(name)) {
            body.image = file.filename;
        }

        await queryAsync(`INSERT INTO ${databasetable} SET ?`, body);
        res.redirect(`/admin/dashboard/laptop/${encodeURIComponent(name)}?message=${encodeURIComponent('Saved Successfully')}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/:name/list',verify.adminAuthenticationToken, (req, res) => {
    const { name } = req.params;
    const isImage = isimage.includes(name);

    pool.query(`SELECT * FROM ${databasetable} WHERE filters = '${name}' and status = true order by id desc`, (err, result) => {
        if (err) {
            throw err;
        } else {
            // res.json({ result, isImage });
            res.render(`${folder}/list`,{result,isImage,name})
        }
    });
});




router.get('/:name/delete',verify.adminAuthenticationToken, async (req, res) => {
    const { id } = req.query;
    const { name } = req.params;
    const update = verify.getCurrentDate()

    try {
        await queryAsync(`UPDATE ${databasetable} SET status = false , updated_at = ? WHERE id = ?`, [update,id]);
        res.redirect(`/admin/dashboard/laptop/${encodeURIComponent(name)}/list`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});




router.get('/:name/update', verify.adminAuthenticationToken, async (req, res) => {
    const { name } = req.params;
    const { id } = req.query;

    try {
        const result = await queryAsync(`SELECT * FROM ${databasetable} WHERE id = ?`, [id]);
        const response = { name };
        if (isimage.includes(name)) {
            response.isimage = true;
        }
        res.render(`${folder}/update`, { response, msg: req.query.message, result });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});




router.post('/:name/update', verify.adminAuthenticationToken, upload.single('image'), async (req, res) => {
    const { body, params, file } = req;
    const { name } = params;

    try {
        body.updated_at = verify.getCurrentDate();
        
        if (file && file.filename) {
            body.image = file.filename;
        }

        await queryAsync(`UPDATE ${databasetable} SET ? WHERE id = ?`, [body, body.id]);
        res.redirect(`/admin/dashboard/laptop/${encodeURIComponent(name)}/update?id=${encodeURIComponent(body.id)}&message=${encodeURIComponent('Updated Successfully')}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/getData/:filter',(req,res)=>{
    pool.query(`select * from ${databasetable} where filters = '${req.params.filter}' order by name`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})



router.get('/contact/form',verify.adminAuthenticationToken,(req,res)=>{
    pool.query(`select * from contact_us order by id desc`,(err,result)=>{
        if(err) throw err;
        else res.render(`${folder}/contactlist`,{result})
        // else res.json(result)

    })
  })



  

module.exports = router;