const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { sendMessage, allMessages, markAsSeen } = require("../controllers/messageController");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/read").put(protect, markAsSeen);

module.exports = router;