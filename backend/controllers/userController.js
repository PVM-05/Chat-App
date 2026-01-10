
const userModel = require("../models/userModel"); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        //Kiểm tra dữ liệu rỗng TRƯỚC (để đỡ tốn công gọi Database)
        if (!username || !email || !password) return res.status(400).json("Vui lòng điền đủ thông tin!");

        //Kiểm tra user tồn tại
        let user = await userModel.findOne({ email });
        
        if (user) return res.status(400).json("Email này đã được sử dụng!");
        
        //Kiểm tra định dạng email
        if(!validator.isEmail(email)) return res.status(400).json("Chưa đúng định dạng email");
        // 1 chữ cái thường 1 hoa 1 kí tự đặc biệt 1 số đủ 8 kí tự
        if(!validator.isStrongPassword(password)) return res.status(400).json("Mật khẩu chưa đủ mạnh");

        //Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //Tạo user mới
        user = new userModel({ username, email, password: hashedPassword });
        await user.save();

        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, username, email, token });
        
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

const loginUser = async (req, res) => {
    const {email, password} = req.body;
    try {
        if (!email || !password) return res.status(400).json("Vui lòng nhập email và mật khẩu");

        let user = await userModel.findOne({ email }).select("+password");;

        if(!user) return res.status(400).json("Sai email hoặc mật khẩu");

        const isValidPassword = await bcrypt.compare(password, user.password);
        if(!isValidPassword) return res.status(400).json("Sai email hoặc mật khẩu");

        const token = createToken(user._id);
        res.status(200).json({ _id: user._id, username: user.username, email, token });
    } catch(error) {
        console.log(error);
        res.status(500).json(error);
    };
};

const findUser = async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await userModel.findById(userId);
        res.status(200).json(user);
        if (!user) {
            return res.status(404).json("Không tìm thấy người dùng!");
        }
    }
    catch(error) {
        console.log(error);
        res.status(500).json(error);
    }
}


module.exports = { registerUser, loginUser, findUser };