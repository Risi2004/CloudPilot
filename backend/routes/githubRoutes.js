const express = require('express');
const router = express.Router();

// Redirect to GitHub Authorization page
router.get('/login', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = 'repo,user';
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  res.redirect(url);
});

// GitHub OAuth Callback Route
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('OAuth token exchange error:', data.error_description || data.error);
      return res.status(400).send(`OAuth token exchange error: ${data.error_description || data.error}`);
    }

    const accessToken = data.access_token;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Redirect back to frontend page
    res.redirect(`${frontendUrl}/repositories?github_token=${accessToken}`);
  } catch (error) {
    console.error('GitHub OAuth Callback Error:', error);
    res.status(500).send('Internal Server Error during token exchange');
  }
});

module.exports = router;
