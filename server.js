// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ["https://proposal-form-frontend.vercel.app"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],  
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/proposals', require('./routes/Proposals'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
