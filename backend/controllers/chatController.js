const Chat = require("../models/chatModel");
const User = require("../models/userModel");

//Tạo hoặc lấy đoạn chat 1-1
const accessChat = async (req, res) => {
  const { userId } = req.body; // ID người muốn chat cùng

  if (!userId) return res.sendStatus(400);

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } }, // Bạn
      { users: { $elemMatch: { $eq: userId } } },       // Người khác
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "username avatar email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).send(FullChat);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

//Lấy danh sách tất cả các đoạn chat
const fetchChats = async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "username avatar email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
      return res.status(400).send({ message: "Vui lòng điền tên nhóm và thêm thành viên" });
    }
  
    var users = JSON.parse(req.body.users); //Chuyển chuỗi JSON thành mảng
  
    if (users.length < 2) {
      return res.status(400).send("Nhóm cần ít nhất 2 thành viên (cộng thêm bạn là 3)");
    }
  
    users.push(req.user._id); //Thêm chính người tạo vào nhóm
  
    try {
      const groupChat = await Chat.create({
        chatName: req.body.name,
        users: users,
        isGroupChat: true,
        groupAdmin: req.user._id,
      });
  
      const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
  
      res.status(200).json(fullGroupChat);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

module.exports = { accessChat, fetchChats, createGroupChat };