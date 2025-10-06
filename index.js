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
const stripeRoute = require('./routes/Stripe.js');
const SubscriptionPlan = require('./models/SubscriptionPlan.js');
const Subscription = require('./models/Subscription.js');
const nodemailer = require('nodemailer');
const Contact = require('./models/Contact.js');
const superAdminController = require('./controllers/superAdminController');

const dbConnect = require('./utils/dbConnect.js');
require('./utils/cronJob.js');

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

const sendEmail = async (req, res) => {
  const { name, company, email, description } = req.body; // extract from form

  const contact = await Contact.create({ name, company, email, description, status: "Open" });
  await contact.save();

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.MAIL_USER,
    subject: `New Contact Request from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #2563EB;">New Contact Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Description:</strong> ${description}</p>
        <hr />
        <p style="font-size: 12px; color: #666;">This email was generated from the Contact Us form on your website.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send email." });
  }
};

app.post('/admin/webhook', express.raw({ type: 'application/json' }), superAdminController.handleWebhook);


app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: ["https://rfp2grants.ai"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/getSubscriptionPlansData', getSubscriptionPlansData);
app.post('/contact', sendEmail);

// Register routes before starting server
app.use('/proposals', proposalRoute);

app.use('/auth', authRoute);

app.use('/rfp', rfpDiscovery);

app.use('/profile', profileRoute);

app.use('/dashboard', dashboardRoute);

app.use('/admin', superAdminRoute);

app.use('/support', supportRoute);

app.use('/image', imageRoute);

app.use('/stripe', stripeRoute);

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