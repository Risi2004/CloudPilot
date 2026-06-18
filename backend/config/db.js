const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.log('MONGO_URI is not defined in environment variables. Running without a database connection.');
    return;
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Don't kill the process in development if db connection fails, just log it.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
