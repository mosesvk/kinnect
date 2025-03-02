// Simple script to test the API endpoints
// You can run this with Node.js directly: node tests/api-tests.js

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 5000}/api`;
console.log(`API URL: ${API_URL}`);
let token = null;
let userId = null;

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1990-01-01',
  phone: '1234567890',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    zipCode: '12345'
  }
};

// Test admin user
const adminUser = {
  email: 'admin@example.com',
  password: 'admin123',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

const runTests = async () => {
  try {
    console.log('Starting API tests...');
    
    // Test the server connection with a simple test endpoint
    console.log('\n🧪 Testing server connection');
    try {
      const testResponse = await axios.post(`${API_URL}/test`, { test: 'data' });
      console.log('✅ Server connection successful:', testResponse.data);
    } catch (testError) {
      console.error('❌ Server connection test failed:', testError.message);
      if (testError.response) {
        console.error('Response data:', testError.response.data);
        console.error('Response status:', testError.response.status);
      }
    }

    // Test 1: Register a user
    console.log('\n🧪 Test 1: Register a user');
    console.log('Sending user data:', testUser);
    try {
        const registerResponse = await axios.post(`${API_URL}/users`, testUser);
        console.log('Response headers:', registerResponse.headers);
        console.log('Response status:', registerResponse.status);
        console.log('✅ User registered successfully');
        console.log('User ID:', registerResponse.data.id);
        console.log('Token:', registerResponse.data.token);
        
        userId = registerResponse.data.id;
        token = registerResponse.data.token;
    } catch (registerError) {
        console.error('❌ User registration failed:', registerError.message);
        if (registerError.response) {
            console.error('Response data:', registerError.response.data);
            console.error('Response status:', registerError.response.status);
        }
    }

    // Test 2: Login
    console.log('\n🧪 Test 2: Login');
    const loginResponse = await axios.post(`${API_URL}/users/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful');
    token = loginResponse.data.token;

    // Test 3: Get user profile
    console.log('\n🧪 Test 3: Get user profile');
    const profileResponse = await axios.get(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile fetched successfully');
    console.log('User:', profileResponse.data.user);

    // Test 4: Update user profile
    console.log('\n🧪 Test 4: Update user profile');
    const updateResponse = await axios.put(
      `${API_URL}/users/profile`,
      { firstName: 'Updated', phone: '9876543210' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Profile updated successfully');
    console.log('Updated user:', updateResponse.data);

    // Manual step for creating an admin user
    console.log('\n⚠️ To test admin features, you need to manually create an admin user in the database');
    console.log('Use this data:', adminUser);
    console.log('Or update a user\'s role to "admin" in the database');

    console.log('\n✅ All tests completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received from server. Request details:', error.request);
    } else {
      console.error('Error setting up request:', error.config);
    }
  }
};

runTests();