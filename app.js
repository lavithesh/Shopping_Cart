require('dotenv').config(); // ✅ Load environment variables first
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./config/connection');

// Routes
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');

const app = express();

/* -------------------- VIEW ENGINE SETUP -------------------- */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine(
  'hbs',
  hbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, '/views/layout/'),
    partialsDir: path.join(__dirname, '/views/partials/'),

    // ✅ Add all helpers (eq, inc, formatDate, disableIfOne)
    helpers: {
      disableIfOne: function (quantity) {
        return quantity <= 1 ? 'disabled' : '';
      },
      eq: function (a, b) {
        return a === b;
      },
      inc: function (value) {
        return parseInt(value) + 1;
      },
      formatDate: function (date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      },
    },
  })
);

/* -------------------- MIDDLEWARE -------------------- */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());

/* ✅ STATIC FILES — FIXES IMAGE PATH ISSUES */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/stylesheets', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/javascripts', express.static(path.join(__dirname, 'public/javascripts')));

/* -------------------- SESSION CONFIG -------------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }, // 10 minutes
  })
);

/* -------------------- BODY PARSER -------------------- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* -------------------- DATABASE CONNECTION -------------------- */
db.connect((err) => {
  if (!err) console.log('✅ MongoDB Connected Successfully');
  else console.error('❌ MongoDB Connection Error:', err);
});

/* -------------------- ROUTES -------------------- */
app.use('/', userRouter);
app.use('/admin', adminRouter);

/* -------------------- ERROR HANDLERS -------------------- */
// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// General error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
