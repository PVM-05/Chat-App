const userModel = require("../models/userModel"); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Tạo token
const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

//REGISTER 
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 1. Kiểm tra nhập liệu
        if (!username || !email || !password) {
            return res.status(400).json("Vui lòng điền đủ thông tin!");
        }
        
        // 2. Validate dữ liệu
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json("Username phải từ 3-30 ký tự");
        }
        
        // const usernameRegex = /^[a-zA-Z0-9_]+$/;
        // if (!usernameRegex.test(username)) {
        //     return res.status(400).json("Username chỉ được chứa chữ, số và gạch dưới");
        // }
        
        if(!validator.isEmail(email)) {
            return res.status(400).json("Email không hợp lệ");
        }
        
        if(!validator.isStrongPassword(password)) {
            return res.status(400).json("Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt");
        }
        
        //Kiểm tra user tồn tại
        let user = await userModel.findOne({ email });
        if (user) return res.status(400).json("Email này đã được sử dụng");

        //Tạo user mới
        user = new userModel({ username, email, password });

        //Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        //Lưu vào DB
        await user.save();

        //Tạo token và phản hồi
        const token = createToken(user._id);
        res.status(200).json({ 
            _id: user._id, 
            username, 
            email, 
            token 
        });

    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
}

//LOGIN 
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

//Tìm
const findUser = async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await userModel.findById(userId).select("-password"); 
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

//Search
const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;

        //min 2 ký tự
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Nhập ít nhất 2 ký tự để tìm kiếm" });
        }

        const keyword = query.trim();

    
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKeyword, "i");

        // Tìm theo username hoặc email, loại trừ chính mình
        const users = await userModel.find({
            _id: { $ne: req.user._id },           // Không return chính mình
            $or: [
                { username: regex },               // Match username
                { email: regex }                   // Match email
            ]
        })
        .select("-password")                       // Không return password
        .limit(20);                                // Max 20 kết quả

        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Lỗi khi tìm kiếm" });
    }
};

//GET ME
const getMe = async (req, res) => {
    try {
        // req.user được gán từ middleware auth
        const user = await userModel.findById(req.user._id).select("-password");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
};

//UPDATE PROFILE
const updateProfile = async (req, res) => {
    try {
        const { username, email, avatar } = req.body;

        if (!username && !email && !avatar) {
            return res.status(400).json("Không có dữ liệu cập nhật");
        }

        // Kiểm tra email trùng
        if (email) {
            const exists = await userModel.findOne({ email });
            if (exists && exists._id.toString() !== req.user._id.toString()) {
                return res.status(400).json("Email đã được sử dụng");
            }
        }

        if (avatar && avatar.startsWith('data:image')) {
             const sizeInBytes = (avatar.length * 3) / 4;
             if (sizeInBytes > 5 * 1024 * 1024) return res.status(400).json("Ảnh quá lớn");
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
        console.error('Cập nhập profile thất bại:', err);
        res.status(500).json(err);
    }
};




module.exports = { registerUser, loginUser, findUser,searchUsers, getMe, updateProfile,};