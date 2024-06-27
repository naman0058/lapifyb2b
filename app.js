var createError = require('http-errors');
const http = require('http');
var cookieSession = require('cookie-session')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { createServer } = require("http");


const httpServer = createServer(app);




var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
var api = require('./routes/api');
var laptop = require('./routes/laptop');
var mobile = require('./routes/mobile');
var PartsAndAccessories = require('./routes/parts-and-accessories');
var bulkDeal = require('./routes/bulk-deal');
var users = require('./routes/users');
var reports = require('./routes/reports');
var product = require('./routes/product');
var apple = require('./routes/apple');
var inventory = require('./routes/inventory');
var ivrapi = require('./routes/IVR/api');
var api = require('./routes/api');
var outlet = require('./routes/outlet');
var team = require('./routes/team');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use(cookieSession({
  name: 'session',
  keys: ['lapify_b2b_app'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))


app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/api/v1',api);
app.use('/admin/dashboard/laptop',laptop);
app.use('/admin/dashboard/outlet',outlet);
app.use('/admin/dashboard/team',team);
app.use('/admin/dashboard/mobile',mobile);
app.use('/admin/dashboard/parts-and-accessories',PartsAndAccessories)
app.use('/admin/dashboard/bulk-deal',bulkDeal);
app.use('/admin/dashboard/users',users)
app.use('/admin/dashboard/reports',reports)
app.use('/admin/dashboard/product',product);
app.use('/admin/dashboard/apple',apple);
app.use('/admin/dashboard/inventory',inventory)
app.use('/ivr/api/v1',ivrapi);
app.use('/api/v1',api);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});




module.exports = app;
