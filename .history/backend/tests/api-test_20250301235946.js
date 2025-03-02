// Update the register test
console.log('\n🧪 Test 1: Register a user');
console.log('Sending user data:', testUser);
try {
    const registerResponse = await axios.post(`${API_URL}/users`, testUser);
    // Rest of the code...
} catch (registerError) {
    // Error handling...
}