const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;

let isConfigured = false;

if (projectId && clientEmail && privateKey) {
  try {
    admin.initializeApp({
      credential: admin.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isConfigured = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
  }
} else {
  console.warn(
    'WARNING: Firebase Admin SDK is NOT fully configured. ' +
    'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your backend .env file to enable Firebase OAuth logins.'
  );
}

const verifyIdToken = async (token) => {
  if (!isConfigured) {
    throw new Error(
      'Firebase Admin SDK is not configured. Please set the required Firebase credentials in your backend environment variables.'
    );
  }
  return getAuth().verifyIdToken(token);
};

module.exports = {
  admin,
  isConfigured,
  verifyIdToken
};
