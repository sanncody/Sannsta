const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressSession = require('express-session');
const passport = require('passport');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const userModel = require('./models/userModel');

require('dotenv').config();

require('./config/db');


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// This express-session "allows" passport code to hold the data or save the data
app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: process.env.EXPRESS_SESSION_SECRET
}));
// Initialisation of passport
// Term passport is which helps us to login, register and create protected routes 
app.use(passport.initialize());
app.use(passport.session()); // this middlware actually saves the data in action

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}); 

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;