
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const messageRoute = require('./routes/messageRoute');

const app = express();
require('dotenv').config()

app.use(express.json()); 
app.use(cors());

const port = process.env.PORT || 3000;
const uri = process.env.ATLAS_URI

app.use('/api/users', userRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);

app.get("/", (req, res) => {
  res.send("Trang chu")
})

app.listen(port, () => {
  console.log(`Server dang chay tai cong ${port}`);
});


mongoose.connect(uri)
  .then(() => console.log("Ket noi thanh cong mongodb"))
  .catch(err => console.error("Ket noi mongodb that bai:", err.message));
