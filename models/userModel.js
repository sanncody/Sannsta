const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

const userSchema = mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    profileImage: String,
    bio: String,
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'post'
        }
    ],
    stories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'story'
        }
    ],
    savedPosts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post"
        }
    ],
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
});

userSchema.plugin(plm);

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;