const passport = require('passport');
const localStrategy = require('passport-local');
const express = require('express');

const router = express.Router();

const userModel = require('../models/userModel');
const upload = require('../config/multer');


passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res) {
  res.render('index', { footer: false });
});

router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});

router.get('/feed', isLoggedIn, function (req, res) {
  res.render('feed', { footer: true });
});

router.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('profile', { user, footer: true });
});

router.get('/search', isLoggedIn, function (req, res) {
  res.render('search', { footer: true });
});

router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('edit', { user, footer: true });
});

router.get('/upload', isLoggedIn, function (req, res) {
  res.render('upload', { footer: true });
});

router.post('/register', function (req, res) {
  const { name, username, email, profileImage, password } = req.body;

  const userData = new userModel({
    name,
    username,
    email,
  });

  userModel.register(userData, password).then(function (registeredUser) {
    passport.authenticate('local')(req, res, function () {
      res.redirect('/profile');
    });
  })
});

router.post('/login', passport.authenticate('local', {
  successRedirect: "/profile",
  failureRedirect: "/"
}), function (req, res) {});

router.post('/edit', upload.single('profilePic'), async function (req, res) {
  const { username, name, bio } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: req.session.passport.user }, 
    { username, name, bio },
    { new: true }
  );
  console.log(req.file.filename);
  if (req.file) {
    user.profileImage = req.file.filename;
  }
  await user.save();
  
  res.redirect('/profile');
});

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) return next(err);

    res.redirect('/login');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
};

module.exports = router;