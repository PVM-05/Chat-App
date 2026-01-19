const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    chatName: {
        type: String,
        trim: true
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    groupAdmin: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
},
{ timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema)