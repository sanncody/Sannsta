const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    postImage: {
        data: Buffer,
        contentType: String
    },
    caption: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const postModel = mongoose.model('post', postSchema);

module.exports = postModel;