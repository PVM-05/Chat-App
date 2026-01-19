const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

// Gửi tin nhắn
const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "username avatar");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "username avatar email",
    });

    // Cập nhật tin nhắn mới nhất cho đoạn chat
    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Lấy tất cả tin nhắn của 1 đoạn chat
const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username avatar email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const markAsSeen = async (req, res) => {
  const { chatId } = req.body;

  if (!chatId) {
    return res.sendStatus(400);
  }

  try {
    // Tìm tất cả tin nhắn trong chat này mà chưa có mình trong danh sách readBy
    // Và thêm ID của mình vào mảng readBy
    await Message.updateMany(
      { 
        chat: chatId,
        sender: { $ne: req.user._id }  // Chỉ tin nhắn KHÔNG phải của mình
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { sendMessage, allMessages, markAsSeen };