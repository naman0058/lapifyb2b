// var express = require("express");
// var router = express.Router();
// var pool = require("./pool");
// var upload = require('../multer');



// router.post('/save',(req,res)=>{
//     let body = req.body;
//     pool.query(`insert into ${body.tablename} set ?`,body,(err,result)=>{
//         if(err) throw err;
//         else res.json({msg:'success'})
//     })
// })


// router.get('/show',(req,res)=>{
//     pool.query(`select * ${req.query.tablename} order by id desc`,(err,result)=>{
//         if(err) throw err;
//         else res.json(result)
//     })
// })


// router.post('/update',(req,res)=>{
//     let body = req.body;
//     pool.query(`update ${body.tablename} set ? where id ?`,[body,body.id],(err,result)=>{
//         if(err) throw err;
//         else res.json({msg:'success'})

//     })
// })


// router.get('/delete',(req,res)=>{
//     pool.query(`delete from ${req.query.tablename} where id = '${req.query.id}'`,(err,result)=>{
//         if(err) throw err;
//         else res.json({msg:'success'})

//     })
// })


// module.exports = router;



const express = require('express');
const router = express.Router();
const pool = require("./pool"); // Assuming you have a db.js file for your database connection
var upload = require('../multer');


// Middleware to validate table names
const validateTableName = (req, res, next) => {
    let tablename = '';
    console.log('tablename',tablename);
    if(req.body.tablename){
        tablename = req.body.tablename
    }
    else{
        tablename = req.query.tablename
    }
    if (!tablename) {
        return res.status(400).json({ msg: 'Table name is required' });
    }
    // Add more validation logic if needed
    next();
};

router.post('/insert', validateTableName, (req, res) => {
    console.log('data comes',req.body)
    let { tablename, ...data } = req.body;
    pool.query(`INSERT INTO ?? SET ?`, [tablename, data], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});



router.post('/clientinsert', upload.single('image'), (req, res) => {
    console.log('data comes',req.body)
    console.log('data comes',req.file)


    let { tablename, ...data } = req.body;
    data['image'] = req.file.filename
    pool.query(`INSERT INTO sub_admin SET ?`, data, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});



router.post('/teaminsert', upload.single('image'), (req, res) => {
   


    let { tablename, ...data } = req.body;
    data['image'] = req.file.filename
    console.log('data comes',req.body)

    pool.query(`INSERT INTO team_members SET ?`, data, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});

router.get('/show', validateTableName, (req, res) => {
    let { tablename } = req.query;
    pool.query(`SELECT * FROM ?? ORDER BY id DESC`, [tablename], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json(result);
    });
});

router.post('/update', validateTableName,upload.single('image'), (req, res) => {
    let { tablename, id, ...data } = req.body;
    console.log(req.body)

    if(req.file){
    data['image'] = req.file.filename
    }

    if (!id) {
        return res.status(400).json({ msg: 'ID is required' });
    }
    pool.query(`UPDATE ?? SET ? WHERE id = ?`, [tablename, data, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});

router.get('/delete', validateTableName, (req, res) => {
    let { tablename, id } = req.query;
    if (!id) {
        return res.status(400).json({ msg: 'ID is required' });
    }
    pool.query(`DELETE FROM ?? WHERE id = ?`, [tablename, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});


router.get('/cities',(req,res)=>{
    pool.query(`select * from city where stateid = '${req.query.stateid}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})



router.get('/profile',(req,res)=>{
    pool.query(`select p.*, 
    (select s.name from state s where s.id = p.state) as statename,
    (select c.name from city c where c.id = p.city) as cityname,
    (select c.name from community c where c.id = p.Community) as communityname
    from ${req.query.tablename} p where p.id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})

module.exports = router;



// ApI Call


{/* <script>
// Fetch data from the API and display it
fetch('http://localhost:3000/api/data')
    .then(response => response.json())
    .then(data => {
        document.getElementById('content').textContent = data.message;
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
</script> */}


// pOST

// <script>
// document.getElementById('dataForm').addEventListener('submit', function(event) {
//     event.preventDefault();
//     const name = document.getElementById('name').value;

//     fetch('http://localhost:3000/api/data', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ name })
//     })
//     .then(response => response.json())
//     .then(data => {
//         document.getElementById('response').textContent = JSON.stringify(data);
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });
// });
// </script>


// const bodyParser = require('body-parser');
// const path = require('path');

// // Initialize Express
// const server = express();
// server.use(bodyParser.json()); 