// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

const proposalRoute = require('./routes/Proposals.js');
const authRoute = require("./routes/Auth.js");
const rfpDiscovery = require('./routes/rfpDiscoveryMLModel.js');
const dbConnect = require('./utils/dbConnect.js');

app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: ["https://proposal-form-frontend.vercel.app"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],  
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Connect to MongoDB and Start the server
async function startServer() {
  try{
    await dbConnect();
    app.listen(process.env.PORT, () => {
        console.log(`server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error(`Error Connecting To DB: ${error.message}`);
  }
}

startServer();

app.use('/api/proposals', proposalRoute);

app.use('/api/auth', authRoute);

app.use('/api/rfp', rfpDiscovery);

app.get('/', (req, res) => {
  res.send('Welcome to the Proposal API');
});
