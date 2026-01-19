const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Lấy token từ header (Bearer <token>)
      token = req.headers.authorization.split(" ")[1];

      // Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Tìm user và gán vào req.user (bỏ qua password)
      req.user = await User.findById(decoded._id).select("-password");

      next(); // Cho phép đi tiếp
    } catch (error) {
      return res.status(401).json("Lỗi xác minh Token");
    }
  }

  if (!token) {
    return res.status(401).json("Không tìm thấy token");
  }
};

module.exports = { protect };