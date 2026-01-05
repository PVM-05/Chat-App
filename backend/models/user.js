// backend/models/User.js
const mongoose = require('mongoose');

// 1. Định nghĩa Schema (Cái khuôn đúc)
const UserSchema = new mongoose.Schema({
  username: { 
    type: String,
    minlength: 3,
    maxlength: 30,    
    required: true,   // Bắt buộc phải điền
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
    // Lưu ý: Mật khẩu 6 ký tự vẫn là String
  },
  avatar: {
    type: String,
    default: "" // Nếu không có ảnh thì để rỗng
  },
}, 
{ timestamps: true } // Tự động tạo 2 cột: ngày tạo (createdAt) và ngày sửa (updatedAt)
);

// 2. Đóng gói thành Model và xuất ra
module.exports = mongoose.model('User', UserSchema);