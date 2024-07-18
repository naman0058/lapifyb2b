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
const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);


// Middleware to validate table names
const validateTableName = (req, res, next) => {
    let tablename = '';
    console.log('tablename',req.body.tablename);
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

// router.get('/show', validateTableName, (req, res) => {
//     let { tablename } = req.query;
//     pool.query(`SELECT * FROM ?? ORDER BY id DESC`, [tablename], (err, result) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).json({ msg: 'Database error' });
//         }
//         res.json(result);
//     });
// });



router.get('/show', validateTableName, (req, res) => {
    let { tablename } = req.query;
    let query = `SELECT * FROM ?? ORDER BY id DESC`;
    let queryParams = [tablename];

    if (tablename === 'internal_enquiry') {
        query = `SELECT 
                    t.*, 
                    (SELECT s.name FROM state s WHERE s.id = t.state) AS statename, 
                    (SELECT c.name FROM city c WHERE c.id = t.city) AS cityname 
                 FROM ?? t 
                 ORDER BY t.id DESC`;
        queryParams = [tablename];
    } else if (tablename === 'team_directory') {
        query = `SELECT t.* FROM ?? t ORDER BY t.id DESC`;
        queryParams = [tablename];
    } else if (tablename === 'my_directory' || tablename === 'subadmin_directory') {
        query = `SELECT t.* FROM ?? t ORDER BY t.id DESC`;
        queryParams = [tablename];
    } else if (tablename === 'team_members') {
        query = `SELECT 
                    t.*, 
                    (SELECT s.name FROM state s WHERE s.id = t.state) AS statename, 
                    (SELECT c.name FROM city c WHERE c.id = t.city) AS cityname, 
                    (SELECT d.name FROM department d WHERE d.id = t.departmentid) AS departmentname 
                 FROM ?? t 
                 ORDER BY t.id DESC`;
        queryParams = [tablename];
    }

    else if (tablename === 'sub_admin') {
        query = `SELECT 
                    t.*, 
                    (SELECT s.name FROM state s WHERE s.id = t.state) AS statename, 
                    (SELECT c.name FROM city c WHERE c.id = t.city) AS cityname, 
                    (SELECT c.name FROM community c WHERE c.id = t.community) AS communityname, 
                    (SELECT d.name FROM department d WHERE d.id = t.departmentid) AS departmentname 
                 FROM ?? t 
                 ORDER BY t.id DESC`;
        queryParams = [tablename];
    }


    pool.query(query, queryParams, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        const keysToRemove = ['state', 'city', 'departmentid', 'subadmin_id' , 'Community', 'team_id'];
        const cleanedResult = result.map(row => {
            keysToRemove.forEach(key => {
                delete row[key];
            });
            return row;
        });

        res.json(cleanedResult);

    });
});


router.post('/update',upload.single('image'), (req, res) => {
    console.log(req.body)
    let { tablename,id, ...data } = req.body;

    if(req.file){
    data['image'] = req.file.filename
    }

    if (!id) {
        return res.status(400).json({ msg: 'ID is required' });
    }


    console.log('table',tablename)
    console.log('id',id)
    console.log('data',data)


    pool.query(`UPDATE ?? SET ? WHERE id = ?`, [tablename,data, id], (err, result) => {
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
    (select c.name from community c where c.id = p.Community) as communityname,
    (select c.name from department c where c.id = p.departmentid) as departmentname

    from ${req.query.tablename} p where p.id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})



router.get('/teamprofile',(req,res)=>{
    pool.query(`select p.*, 
    (select s.name from state s where s.id = p.state) as statename,
    (select c.name from city c where c.id = p.city) as cityname
    from team_members p where p.id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})



router.get('/adminprofile',(req,res)=>{
    pool.query(`select p.*
    from admin p where p.id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})




router.get('/admin/dashboard',(req,res)=>{
    var query = `select * from admin;`
    var query1 = `select count(id) as counter from sub_admin;`
    var query2 = `select count(id) as counter from team_members;`
    var query3 = `select count(id) as counter from department;`
    var query4 = `select count(id) as counter from community;`
    pool.query(query+query1+query2+query3+query4,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})


router.get('/client/dashboard',(req,res)=>{
    var query = `select * from sub_admin where id = '${req.query.id}';`
    var query1 = `select count(id) as counter from team_members where subadmin_id = '${req.query.departmentid}';`
    var query2 = `select count(id) as counter from subadmin_directory where subadmin_id = '${req.query.id}';`
    var query3 = `select count(id) as counter from my_directory where subadmin_id = '${req.query.id}';`
    var query5 = `select count(id) as counter from recordings where departmentid = '${req.query.departmentid}';`
    var query6 = `select count(id) as counter from recordings where status = 'active' and departmentid = '${req.query.departmentid}' ;`
    var query7 = `select count(id) as counter from recordings where status = 'pending' and departmentid = '${req.query.departmentid}';`
    var query8 = `select count(id) as counter from recordings where status = 'hold' and departmentid = '${req.query.departmentid}';`
    var query9 = `select count(id) as counter from recordings where status = 'stuck' and departmentid = '${req.query.departmentid}';`
    var query10 = `select count(id) as counter from recordings where status = 'working' and departmentid = '${req.query.departmentid}';`
    var query11 = `select count(id) as counter from internal_enquiry;`


    pool.query(query+query1+query2+query3+query5+query6+query7+query8+query9+query10+query11,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})


router.get('/team/dashboard',(req,res)=>{
    var query = `select * from team_members where id = '${req.query.id}';`
    var query2 = `select count(id) as counter from team_directory where team_id = '${req.query.id}';`
    var query3 = `select count(id) as counter from my_directory where subadmin_id = '${req.query.subadmin_id}';`
    var query4 = `select count(id) as counter from recordings where departmentid = '${req.query.departmentid}';`
    var query5 = `select count(id) as counter from recordings where departmentid = '${req.query.departmentid}';`
    var query6 = `select count(id) as counter from recordings where status = 'active' and departmentid = '${req.query.departmentid}' ;`
    var query7 = `select count(id) as counter from recordings where status = 'pending' and departmentid = '${req.query.departmentid}';`
    var query8 = `select count(id) as counter from recordings where status = 'hold' and departmentid = '${req.query.departmentid}';`
    var query9 = `select count(id) as counter from recordings where status = 'stuck' and departmentid = '${req.query.departmentid}';`
    var query10 = `select count(id) as counter from recordings where status = 'working' and departmentid = '${req.query.departmentid}';`
    var query11 = `select count(id) as counter from internal_enquiry where subadmin_id = '${req.query.subadmin_id}';`

   

    pool.query(query+query2+query3+query4+query5+query6+query7+query8+query9+query10+query11,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})





router.get('/single-detail',(req,res)=>{
    pool.query(`select * from ${req.query.tablename} where id = '${req.query.id}'`,(err,result)=>{
        if(err) throw err;
        else res.json(result)
    })
})




router.post('/clientupdate',upload.single('image'), (req, res) => {
   
let body = req.body
    if(req.file){
    body['image'] = req.file.filename
    }




    pool.query(`UPDATE sub_admin SET ? WHERE id = ?`, [req.body,req.body.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Database error' });
        }
        res.json({ msg: 'success' });
    });
});




router.post('/teamupdate',upload.single('image'), (req, res) => {
   
    let body = req.body
        if(req.file){
        body['image'] = req.file.filename
        }
    
    
    
    
        pool.query(`UPDATE team_members SET ? WHERE id = ?`, [req.body,req.body.id], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ msg: 'Database error' });
            }
            res.json({ msg: 'success' });
        });
    });



    router.get('/collectDepartmant', (req, res) => {
        const data = {
            CallSid: req.query.CallSid,
            CallFrom: req.query.CallFrom,
            CallTo: req.query.CallTo,
            Direction: req.query.Direction,
            Created: req.query.Created,
            DialCallDuration: req.query.DialCallDuration,
            StartTime: req.query.StartTime,
            EndTime: req.query.EndTime,
            CallType: req.query.CallType,
            DialWhomNumber: req.query.DialWhomNumber,
            flow_id: req.query.flow_id,
            tenant_id: req.query.tenant_id,
            From: req.query.From,
            To: req.query.To,
            CurrentTime: req.query.CurrentTime,
            digits: parseInt(req.query.digits.replace(/"/g, ''), 10)
        };
    
        // Save the data in session
        req.session.callData = data;
    
        // Send a 200 OK status
        // res.json(req.session.callData);
        res.status(200).send('Data saved to session and inserted/updated into MySQL successfully');


    });


    router.get('/checksession',(req,res)=>{
        res.json(req.session.callData)
    })
    
    
    
    router.get('/saveRecording', async (req, res) => {
        // Fetch callData from session
        const callData = req.session.callData || {};


        console.log('Call Data',req.session.callData)

  
    
        // Prepare recordingData from request
        const recordingData = {
            CallSid: req.query.CallSid,
            CallFrom: req.query.CallFrom,
            CallTo: req.query.CallTo,
            Direction: req.query.Direction,
            Created: req.query.Created,
            DialCallDuration: req.query.DialCallDuration,
            RecordingUrl: req.query.RecordingUrl,
            StartTime: req.query.StartTime,
            EndTime: req.query.EndTime,
            CallType: req.query.CallType,
            DialWhomNumber: req.query.DialWhomNumber,
            flow_id: req.query.flow_id,
            tenant_id: req.query.tenant_id,
            From: req.query.From,
            To: req.query.To,
            RecordingAvailableBy: req.query.RecordingAvailableBy,
            CurrentTime: req.query.CurrentTime,
            digits: req.query.digits
        };


        console.log('Recording Data Callsid', recordingData.CallSid)
        console.log('Call Data Callsid', callData.CallSid)


       
    
        // Check if CallSid matches between recordingData and callData
        if (recordingData.CallSid === callData.CallSid) {
            // Update digits in callData
            recordingData.digits = callData.digits;
        }
    
        try {
            // If CallSid matches, update existing record, otherwise insert new record
           
                // Perform insert operation
                await queryAsync(
                    'INSERT INTO recordings (CallSid, CallFrom, CallTo, Direction, Created, DialCallDuration, RecordingUrl, StartTime, EndTime, CallType, DialWhomNumber, flow_id, tenant_id, `From`, `To`, RecordingAvailableBy, CurrentTime, digits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        recordingData.CallSid,
                        recordingData.CallFrom,
                        recordingData.CallTo,
                        recordingData.Direction,
                        recordingData.Created,
                        recordingData.DialCallDuration,
                        recordingData.RecordingUrl,
                        recordingData.StartTime,
                        recordingData.EndTime,
                        recordingData.CallType,
                        recordingData.DialWhomNumber,
                        recordingData.flow_id,
                        recordingData.tenant_id,
                        recordingData.From,
                        recordingData.To,
                        recordingData.RecordingAvailableBy,
                        recordingData.CurrentTime,
                        recordingData.digits
                    ]
                );
            
    
            // Clear the session data after successful operation
            req.session.callData = null;
    
            // Send a 200 OK status
            res.status(200).send('Data saved to session and inserted/updated into MySQL successfully');
        } catch (error) {
            console.error('Error inserting/updating data into MySQL:', error);
            res.status(500).send('Error saving data');
        }
    });
    
    
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