// LƯU Ý: Kiểm tra kỹ tên file trong thư mục models là user.js hay userModel.js để sửa dòng dưới
const userModel = require("../models/userModel"); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET || "123456", { expiresIn: "3d" });
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra dữ liệu rỗng TRƯỚC (để đỡ tốn công gọi Database)
        if (!username || !email || !password) return res.status(400).json("Vui lòng điền đủ thông tin!");

        // 2. Kiểm tra user tồn tại
        let user = await userModel.findOne({ email });
        
        if (user) return res.status(400).json("Email này đã được sử dụng!");

        // 3. Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Tạo user mới
        user = new userModel({ username, email, password: hashedPassword });
        await user.save();

        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, username, email, token });
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

module.exports = { registerUser };