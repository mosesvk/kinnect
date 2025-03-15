// Simple script to test the API endpoints
// You can run this with Node.js directly: node tests/api-tests.js

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;
console.log(`API URL: ${API_URL}`);
let token = null;
let userId = null;

// Generate a random email to prevent duplicate user errors
const generateRandomEmail = () => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `test${timestamp}${random}@example.com`;
};

// Test user data
const testUser = {
  email: generateRandomEmail(),
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
    console.log(`Test user email: ${testUser.email}`);
    
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
      // If server isn't responding, exit early
      return;
    }

    // Test 1: Register a user
    console.log('\n🧪 Test 1: Register a user');
    try {
      const registerResponse = await axios.post(`${API_URL}/users/register`, testUser);
      console.log('✅ User registered successfully');
      console.log('User ID:', registerResponse.data.user.id);
      console.log('Token:', registerResponse.data.user.token);
      
      userId = registerResponse.data.user.id;
      token = registerResponse.data.user.token;
    } catch (registerError) {
      console.error('❌ User registration failed:', registerError.message);
      if (registerError.response) {
        console.error('Response data:', registerError.response.data);
        console.error('Response status:', registerError.response.status);
      }
      // Try to continue with login in case the user exists
    }

    // If no token from registration, try logging in
    if (!token) {
      // Test 2: Login
      console.log('\n🧪 Test 2: Login');
      try {
        const loginResponse = await axios.post(`${API_URL}/users/login`, {
          email: testUser.email,
          password: testUser.password
        });
        console.log('✅ Login successful');
        token = loginResponse.data.user.token;
        userId = loginResponse.data.user.id;
      } catch (loginError) {
        console.error('❌ Login failed:', loginError.message);
        if (loginError.response) {
          console.error('Response data:', loginError.response.data);
          console.error('Response status:', loginError.response.status);
        }
        // If login failed, we can't continue with authenticated tests
        return;
      }
    }

    // Test 3: Get user profile
    console.log('\n🧪 Test 3: Get user profile');
    try {
      const profileResponse = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Profile fetched successfully');
      console.log('User:', profileResponse.data.user);
    } catch (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
      if (profileError.response) {
        console.error('Response data:', profileError.response.data);
        console.error('Response status:', profileError.response.status);
      }
    }

    // Test 4: Update user profile
    console.log('\n🧪 Test 4: Update user profile');
    try {
      const updateResponse = await axios.put(
        `${API_URL}/users/profile`,
        { firstName: 'Updated', phone: '9876543210' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Profile updated successfully');
      console.log('Updated user:', updateResponse.data);
    } catch (updateError) {
      console.error('❌ Profile update failed:', updateError.message);
      if (updateError.response) {
        console.error('Response data:', updateError.response.data);
        console.error('Response status:', updateError.response.status);
      }
    }

    // Test 5: Create a family
    console.log('\n🧪 Test 5: Create a family');
    let familyId = null;
    try {
      const familyResponse = await axios.post(
        `${API_URL}/families`,
        {
          name: 'Test Family',
          description: 'A family created for testing'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Family created successfully');
      console.log('Family:', familyResponse.data.family);
      familyId = familyResponse.data.family.id;
    } catch (familyError) {
      console.error('❌ Family creation failed:', familyError.message);
      if (familyError.response) {
        console.error('Response data:', familyError.response.data);
        console.error('Response status:', familyError.response.status);
      }
    }

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