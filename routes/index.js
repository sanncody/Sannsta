const passport = require('passport');
const localStrategy = require('passport-local');
const express = require('express');

const router = express.Router();

const userModel = require('../models/userModel');
const upload = require('../config/multer');

const postModel = require('../models/postModel');
const dateFormatter = require('../utils/dateFormatter');
const storyModel = require('../models/storyModel');


passport.use(new localStrategy(userModel.authenticate()));

// NOTE: We can populate only those fields in which id is saved as "mongoose.Schema.Types.ObjectId"

router.get('/', function (req, res) {
  res.render('index', { footer: false });
});

router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});

router.get('/feed', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  if (!user) res.redirect('/login');

  const posts = await postModel.find().limit(30).populate('user');

  const stories = await storyModel.find().populate("user");

  const uniqueStories = stories.filter((story, index, self) =>
    index === self.findIndex(s => s.user?._id.toString() === story.user?._id.toString())
  );

  res.render('feed', { user, posts, stories: uniqueStories, footer: true, formatDate: dateFormatter.formatRelativeTime });
});

router.get('/story/add', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('uploadStory', { user, footer: true });
});

router.get('/story/:username', async function (req, res) {
  const user = await userModel.findOne({ username: req.params.username }).populate('stories');

  const stories = await storyModel.find().populate("user");

  const uniqueStories = stories.filter((story, index, self) =>
    index === self.findIndex(s => s.user?._id.toString() === story.user?._id.toString())
  );
  res.render('story', { user, stories: uniqueStories, formatDate: dateFormatter.formatRelativeTime, footer: false });
});

router.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  await user.populate('posts');
  await user.populate('savedPosts');

  res.render('profile', { user, footer: true });
});

router.get('/profile/:username', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  if (user.username === req.params.username) {
    res.redirect('/profile');
  }

  let userProfile = await userModel.findOne({ username: req.params.username }).populate("posts");

  res.render('userProfile', { user, userProfile, footer: true });
});

/**
 * 1. Follower
→ The user who follows someone else.
(Example: If I follow Karan, I am the follower.)

So, the follower will have the followee’s ID (Karan's ID) inside their .following array.


2. Followee (or the user being followed)

→ The user who is being followed.
(Example: Karan is the followee because I followed him.)

So, the followee will have the follower’s ID (mine's ID) inside their .followers array.

*/

router.get('/follow/:userId', isLoggedIn, async function (req, res) {
  // Current logged-in user → Follower (the one who follows)
  let follower = await userModel.findOne({ _id: req.session.passport.user });

  // The user being followed → Followee
  let followee = await userModel.findOne({ _id: req.params.userId });

  // If follower already follows the followee, then unfollow
  if (follower.following.indexOf(followee.id) !== -1) {
    // Remove followee from follower's following list
    follower.following.splice(follower.following.indexOf(followee.id), 1);

    // Remove follower from followee's followers list
    followee.followers.splice(followee.followers.indexOf(follower._id), 1);
  } else {
    // Otherwise, start following
    follower.following.push(followee._id);
    followee.followers.push(follower._id);
  }

  await follower.save();
  await followee.save();

  res.redirect('back');
});

router.get('/save/posts', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user }).populate('posts').populate('savedPosts');

  res.render('savedPosts', { user, footer: true });
});

router.get('/post/:postId', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user }).populate('stories');
  const post = await postModel.findById(req.params.postId).populate('user');

  res.render('singlePost', { user, post, formatDate: dateFormatter.formatRelativeTime, footer: true });
});

router.get('/save/:postId', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user }).populate('posts');

  if (user.savedPosts.indexOf(req.params.postId) !== -1) {
    user.savedPosts.splice(user.savedPosts.indexOf(req.params.postId), 1);
  } else {
    user.savedPosts.push(req.params.postId);
  }

  await user.save();

  res.json(user);
});


router.get('/search', isLoggedIn, function (req, res) {
  res.render('search', { footer: true });
});

router.get('/username/:username', async function (req, res) {
  const searchTerm = new RegExp(`^${req.params.username}`, 'i');
  const users = await userModel.find({ username: searchTerm });

  const formattedUsers = users.map(user => {
    let base64Image = '';
    if (user.profileImage && user.profileImage.data) {
      base64Image = user.profileImage.data.toString('base64');
    }

    return {
      ...user._doc,
      profileImage: base64Image
        ? `data:${user.profileImage.contentType};base64,${base64Image}`
        : null,
    };
  });

  res.status(200).json(formattedUsers);
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
  let user = await userModel.findOne({ _id: req.session.passport.user });

  let base64Image = '';
  if (user.profileImage && user.profileImage.data) {
    base64Image = user.profileImage.data.toString('base64');
  }

  res.status(200).json({
    ...user._doc,
    profileImage: base64Image
      ? `data:${user.profileImage.contentType};base64,${base64Image}`
      : null,
  });
});

router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('edit', { user, footer: true });
});

router.get('/upload', isLoggedIn, async function (req, res) {
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
}), function (req, res) { });

router.post('/edit', isLoggedIn, upload.single('profilePic'), async function (req, res) {
  const { username, name, bio } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: req.session.passport.user },
    { username, name, bio },
    { new: true }
  );

  if (req.file) {
    user.profileImage = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };
  }

  await user.save();
  res.redirect('/profile');
});

router.post('/upload', isLoggedIn, upload.single('postImage'), async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  const createdPost = await postModel.create({
    caption: req.body.caption,
    postImage: {
      data: req.file?.buffer,
      contentType: req.file?.mimetype
    },
    user: user._id
  });

  user.posts.push(createdPost._id);
  await user.save();

  res.redirect('/feed');
});

router.post('/story/upload', isLoggedIn, upload.single('story'), async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  const story = await storyModel.create({
    user: user._id,
    story: {
      data: req.file.buffer,
      contentType: req.file.mimetype
    }
  });

  user.stories.push(story._id);

  await user.save();

  res.redirect(`/story/${user.username}`);
});

router.get('/delete/:postId', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.session.passport.user });

  // Find the post first
  const post = await postModel.findById(req.params.postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Allow delete only if the logged-in user owns the post
  if (post.user._id.toString() !== user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  // Delete post from post collection
  await postModel.findByIdAndDelete(req.params.postId);

  // Remove from user's post list
  await userModel.findByIdAndUpdate(user._id, { $pull: { posts: post._id } });

  res.redirect('/feed');

});

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) return next(err);

    res.redirect('/login');
  });
});

router.get('/user/:id', isLoggedIn, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Delete all posts by the user
    await postModel.deleteMany({ user: userId });

    // 2️⃣ Delete all stories by the user
    await storyModel.deleteMany({ user: userId });

    // 3️⃣ Remove this user from other users’ followers/following lists
    await userModel.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );

    await userModel.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );

    // 4️⃣ Finally delete the user itself
    await userModel.findByIdAndDelete(userId);

    res.redirect('/');
  } catch (error) {
    console.error("Error deleting user:", error);
  }
});


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
};

module.exports = router;