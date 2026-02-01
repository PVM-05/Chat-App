const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {registerUser, loginUser, findUser, searchUsers, getMe, updateProfile} = require("../controllers/userController")

router.post("/register", registerUser)

router.post("/login",  loginUser)

router.get("/find/:userId", findUser)

router.get("/search", protect, searchUsers);

router.get("/me", protect, getMe);

router.put("/profile", protect, updateProfile);

module.exports = router;

