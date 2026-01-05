
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
require('dotenv').config()

app.use(express.json()); // 3. Cho phép server đọc hiểu dữ liệu JSON (cực quan trọng)
app.use(cors());

const port = process.env.port || 3000;
const uri = process.env.ATLAS_URI

app.listen(port, (req, res) => {
  console.log(`Server dang chay tai cong ${port}`);
});

mongoose.connect(uri)
  .then(() => console.log("MongoDB connection established"))
  .catch(err => console.error("MongoDB connection failed:", err.message));
