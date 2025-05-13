const fs = require('fs');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const NUM_USERS = 1000;

async function generateUsers() {
  const users = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const email = `user${i}@example.com`;
    const password = `password${i}`;
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, { email, password });
      console.log(`Registered user ${i}: ${email}`);
      users.push({ email, password });
    } catch (error) {
      console.error(`Failed to register user ${i}: ${error.message}`);
    }
  }

  fs.writeFileSync('scripts/users.json', JSON.stringify(users, null, 2));
  console.log('Users generated and saved to users.json');
}

generateUsers();