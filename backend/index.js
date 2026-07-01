const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger base64 avatar uploads

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/knowledge', require('./routes/knowledgeRoutes'));
app.use('/api/documentation', require('./routes/documentationRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/revenue', require('./routes/revenueRoutes'));
app.use('/api/repositories', require('./routes/repositoryRoutes'));
app.use('/api/github', require('./routes/githubRoutes'));
app.use('/api/platform-selection', require('./routes/platformSelectionRoutes'));
app.use('/api/architecture', require('./routes/architectureRoutes'));
app.use('/api/deployment', require('./routes/deploymentRoutes'));


// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'CloudPilot API is running successfully!' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
