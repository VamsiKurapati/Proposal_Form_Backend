const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

const proposalRoute = require('./routes/Proposals.js');
const authRoute = require("./routes/Auth.js");
const rfpDiscovery = require('./routes/mlPipeline.js');
const profileRoute = require('./routes/Profile.js');
const dashboardRoute = require('./routes/Dashboard.js');
const superAdminRoute = require('./routes/SuperAdmin.js');
const supportRoute = require('./routes/SupportTicket.js');
const imageRoute = require('./routes/Image.js');
const SubscriptionPlan = require('./models/SubscriptionPlan.js');
const Subscription = require('./models/Subscription.js');

const getSubscriptionPlansData = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find();


    // Find the most popular plan by counting subscriptions per plan_id
    const planCounts = await Subscription.aggregate([
      { $group: { _id: "$plan_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);


    let mostPopularPlanName = null;


    if (planCounts.length > 0) {
      mostPopularPlanName = planCounts[0]._id;
    }


    // Send response with all plans and most popular plan
    res.json({
      plans: subscriptionPlans,
      mostPopularPlan: mostPopularPlanName
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching subscription plans data",
      error: err.message
    });
  }
};

const dbConnect = require('./utils/dbConnect.js');
require('./utils/cronJob.js');

app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: ["https://proposal-form-frontend.vercel.app"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/getSubscriptionPlansData', getSubscriptionPlansData);

app.use('/api/proposals', proposalRoute);

app.use('/api/auth', authRoute);

app.use('/api/rfp', rfpDiscovery);

app.use('/api/profile', profileRoute);

app.use('/api/dashboard', dashboardRoute);

app.use('/api/admin', superAdminRoute);

app.use('/api/support', supportRoute);

app.use('/api/image', imageRoute);

app.get('/', (req, res) => {
  res.send('Welcome to the Proposal API');
});

// Connect to MongoDB and Start the server
async function startServer() {
  try {
    await dbConnect();
    app.listen(process.env.PORT, () => {
      console.log(`server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error(`Error Connecting To DB: ${error.message}`);
  }
}

startServer();