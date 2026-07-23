const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Startup environment validation ---
// BUG-001 / BUG-002: Fail fast if critical secrets are missing so that the
// fallback strings in tokenCrypto / auth middleware are never silently used.
const REQUIRED_SECRETS = ['JWT_SECRET', 'TOKEN_ENCRYPTION_KEY'];
for (const key of REQUIRED_SECRETS) {
  if (!process.env[key]) {
    const msg = `[CloudPilot] FATAL: Missing required environment variable: ${key}. Set it in backend/.env before starting the server.`;
    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(`[CloudPilot] WARNING: ${msg}`);
    }
  }
}

// Connect to Database
connectDB();

const frontendOrigin =
  process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';

// Middlewares
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
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
  const statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
