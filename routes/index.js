const passport = require('passport');
const localStrategy = require('passport-local');
const express = require('express');

const router = express.Router();

const userModel = require('../models/userModel');
const upload = require('../config/multer');
const postModel = require('../models/postModel');
const dateFormatter = require('../utils/dateFormatter');


passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res) {
  res.render('index', { footer: false });
});

router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});

router.get('/feed', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  const posts = await postModel.find().limit(30).populate('user');
  res.render('feed', { user, posts, footer: true, formatDate: dateFormatter.formatRelativeTime });
});

router.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  await user.populate('posts');
  res.render('profile', { user, footer: true });
});

router.get('/search', isLoggedIn, function (req, res) {
  res.render('search', { footer: true });
});

router.get('/username/:username', async function (req, res) {
  const searchTerm = new RegExp(`^${req.params.username}`, 'i');
  const users = await userModel.find({ username: searchTerm });

  res.status(200).json(users);
});

router.get('/like/post/:postId', isLoggedIn, async function (req, res) {
  // We got logged in user
  const user = await userModel.findOne({ _id: req.session.passport.user });

  // Logged in user liking the post
  const post = await postModel.findOne({ _id: req.params.postId });

  // If already liked, remove like and if not liked, then like the post
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }

  await post.save();

  res.redirect('/feed');
});

router.get('/users', isLoggedIn, async function (req, res) {
  const users = await userModel.findOne({ _id: req.session.passport.user });

  res.status(200).json(users);
});

router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('edit', { user, footer: true });
});

router.get('/upload', isLoggedIn, function (req, res) {
  res.render('upload', { footer: true });
});

router.post('/register', function (req, res) {
  const { name, username, email, password } = req.body;

  const userData = new userModel({
    name,
    username,
    email,
  });

  userModel.register(userData, password).then(function (registeredUser) {
    passport.authenticate('local')(req, res, function () {
      res.redirect('/feed');
    });
  })
});

router.post('/login', passport.authenticate('local', {
  successRedirect: "/feed",
  failureRedirect: "/"
}), function (req, res) {});

router.post('/edit', upload.single('profilePic'), async function (req, res) {
  const { username, name, bio } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: req.session.passport.user }, 
    { username, name, bio },
    { new: true }
  );

  if (req.file) {
    user.profileImage = req.file.filename;
  }

  await user.save();
  res.redirect('/profile');
});

router.post('/upload', isLoggedIn, upload.single('postImage'), async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  const createdPost = await postModel.create({
    caption: req.body.caption,
    postImage: req.file?.filename,
    user: user._id
  });

  user.posts.push(createdPost._id);
  await user.save();

  res.redirect('/feed');
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