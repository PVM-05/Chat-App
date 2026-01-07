
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String,
    minlength: 3,
    maxlength: 30,    
    required: true,   
  },
  email: { 
    type: String, 
    minlength: 3,
    maxlength: 200,  
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    minlength: 3,
    maxlength: 1024,  
    required: true 
  
  },
  avatar: {
    type: String,
    default: ""
  },
}, 
{ timestamps: true } 
);

module.exports = mongoose.model('User', UserSchema);