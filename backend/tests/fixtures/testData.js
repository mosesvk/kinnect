// tests/fixtures/testData.js
exports.testUsers = [
    {
      id: 'user-123',
      email: 'test1@example.com',
      firstName: 'Test',
      lastName: 'User1',
      passwordHash: 'hashedPassword',
      role: 'user'
    },
    {
      id: 'user-456',
      email: 'test2@example.com',
      firstName: 'Test',
      lastName: 'User2',
      passwordHash: 'hashedPassword',
      role: 'user'
    }
  ];
  
  exports.testFamilies = [
    {
      id: 'family-123',
      name: 'Test Family 1',
      description: 'Family for testing',
      createdBy: 'user-123',
      settings: { privacyLevel: 'private' }
    }
  ];
  
  exports.testFamilyMembers = [
    {
      id: 'member-123',
      familyId: 'family-123',
      userId: 'user-123',
      role: 'admin',
      permissions: ['view', 'edit', 'delete', 'invite']
    }
  ];