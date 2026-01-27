const userModel = require("../models/userModel"); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    
    // Kiểm tra nhập
    if (!username || !email || !password) {
        return res.status(400).json("Vui lòng điền đủ thông tin!");
    }
    
    // Kiểm tra tên 2
    if (username.length < 3 || username.length > 30) {
        return res.status(400).json("Username phải từ 3-30 ký tự");
    }
    
    // Kiểm tra tên 2
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json("Username chỉ được chứa chữ, số và gạch dưới");
    }
    
    // Kiểm ra email
    if(!validator.isEmail(email)) {
        return res.status(400).json("Chưa đúng định dạng email");
    }
    
    // Kiểm tra mk
    if(!validator.isStrongPassword(password)) {
        return res.status(400).json("Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt");
    }
    
    // Kiểm tra trùng
    let user = await userModel.findOne({ 
        email: validator.normalizeEmail(email) 
    });
}

const loginUser = async (req, res) => {
    const {email, password} = req.body;
    try {
        if (!email || !password) return res.status(400).json("Vui lòng nhập email và mật khẩu");

        let user = await userModel.findOne({ email }).select("+password");

        if(!user) return res.status(400).json("Sai email hoặc mật khẩu");

        const isValidPassword = await bcrypt.compare(password, user.password);
        if(!isValidPassword) return res.status(400).json("Sai email hoặc mật khẩu");

        const token = createToken(user._id);
        res.status(200).json({ 
            _id: user._id, 
            username: user.username, 
            email, 
            avatar: user.avatar, 
            token 
        });
    } catch(error) {
        console.log(error);
        res.status(500).json(error);
    };
};

const findUser = async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json("Không tìm thấy người dùng!");
        }
        res.status(200).json(user);
    }
    catch(error) {
        console.log(error);
        res.status(500).json(error);
    }
}

const getMe = async (req, res) => {
    try {
        const user = await userModel
            .findById(req.user._id)
            .select("-password");

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
};

const updateProfile = async (req, res) => {
    try {
        const { username, email, avatar } = req.body;

        if (!username && !email && !avatar) {
            return res.status(400).json("Không có dữ liệu cập nhật");
        }

        // kiểm tra email trùng
        if (email) {
            const exists = await userModel.findOne({ email });
            if (exists && exists._id.toString() !== req.user._id.toString()) {
                return res.status(400).json("Email đã được sử dụng");
            }
        }

        if (avatar) {
            // Kiểm tra xem có phải URL hợp lệ không
            if (!validator.isURL(avatar, { protocols: ['http', 'https'], require_protocol: true })) {
                // Hoặc kiểm tra base64 image
                const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;
                if (!base64Regex.test(avatar)) {
                    return res.status(400).json("Avatar không hợp lệ (phải là URL hoặc base64 image)");
                }
            }
            
            if (avatar.startsWith('data:image')) {
                const sizeInBytes = (avatar.length * 3) / 4;
                const maxSize = 5 * 1024 * 1024; 
                if (sizeInBytes > maxSize) {
                    return res.status(400).json("Ảnh quá lớn (tối đa 5MB)");
                }
            }
        }

        const user = await userModel.findById(req.user._id);

        if (username) user.username = username;
        if (email) user.email = email;
        if (avatar) user.avatar = avatar; 

        await user.save();

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar 
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json(err);
    }
};

module.exports = { registerUser, loginUser, findUser, getMe, updateProfile };