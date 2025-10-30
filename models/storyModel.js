const mongoose = require("mongoose");

const storySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    story: {
        data: Buffer,
        contentType: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 // 24 hours in seconds
    }
});

const storyModel = mongoose.model('story', storySchema);

module.exports = storyModel;