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
    res.status(400);
    throw new Error(error.message);
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
    res.status(400);
    throw new Error(error.message);
  }
};

module.exports = { sendMessage, allMessages };