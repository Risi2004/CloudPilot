const mongoose = require('mongoose');
const { getDecryptedAccessToken } = require('./services/githubService');
const User = require('./models/User');

const mongoUri = "mongodb+srv://risikesanjegatheesan_db_user:risikesan@cluster0.r60eeji.mongodb.net/?appName=Cluster0";

async function main() {
  await mongoose.connect(mongoUri);
  const user = await User.findOne({ email: "risikesanjegatheesan@gmail.com" }).select('+github.accessToken');
  if (!user) {
    console.log("User not found!");
  } else {
    console.log("User email:", user.email);
    console.log("GitHub Username:", user.github?.username);
    const token = getDecryptedAccessToken(user);
    console.log("Decrypted Token:", token ? (token.substring(0, 10) + "...") : "none");
    
    if (token) {
      console.log("Testing GitHub API call with this token...");
      const start = Date.now();
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        }
      });
      console.log("GitHub API Status:", response.status);
      console.log("GitHub Response Time (ms):", Date.now() - start);
      if (response.ok) {
        const body = await response.json();
        console.log("GitHub User login:", body.login);
      } else {
        const body = await response.text();
        console.log("GitHub Error body:", body);
      }
    }
  }
  await mongoose.disconnect();
}

main().catch(console.error);
