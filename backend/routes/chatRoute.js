const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { accessChat, fetchChats, createGroupChat } = require("../controllers/chatController");

const router = express.Router();

router.route("/").post(protect, accessChat); // Tạo chat mới
router.route("/").get(protect, fetchChats);  // Lấy danh sách chat
router.route("/group").post(protect, createGroupChat);
module.exports = router;