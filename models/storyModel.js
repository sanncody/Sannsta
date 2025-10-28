const mongoose = require("mongoose");

const storySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    story: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const storyModel = mongoose.model('story', storySchema);

module.exports = storyModel;