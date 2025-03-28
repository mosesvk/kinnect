// tests/unit/models/familyAssociations.test.js - Fixed version

const { sequelize } = require("../../../src/config/db");
const User = require("../../../src/models/User");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const Event = require("../../../src/models/Event");
const Post = require("../../../src/models/Post");
const PostFamily = require("../../../src/models/PostFamily");
const { syncDatabase } = require("../../../src/models/Index");
const bcrypt = require("bcryptjs");

// Ensure proper associations are set up
// This is assuming the Index.js file sets up all associations correctly

describe('Family Model Associations Tests', () => {
  let testData;

  beforeAll(async () => {
    // Connect to database and sync models
    await sequelize.authenticate();
    await syncDatabase(false);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Create test data
    testData = await createTestData();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testData);
  });

  describe('Family and User associations', () => {
    it('should fetch users of a family through FamilyMember', async () => {
      // Find the family with its members and their user info
      const familyWithMembers = await Family.findByPk(testData.family.id, {
        include: [
          {
            model: FamilyMember,
            as: "members",
            include: [
              {
                model: User,
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          },
        ],
      });

      expect(familyWithMembers).toBeTruthy();
      expect(familyWithMembers.members).toHaveLength(2);
      expect(familyWithMembers.members[0].User).toBeTruthy();
      expect(familyWithMembers.members[0].User.id).toBe(testData.users[0].id);
      expect(familyWithMembers.members[1].User.id).toBe(testData.users[1].id);
    });

    // Add more association tests...
  });

  describe('Complete chain of associations', () => {
    it('should fetch the complete chain of associations from user to posts', async () => {
      // Get a user with their families, which have posts
      const user = await User.findByPk(testData.users[0].id, {
        include: [
          {
            model: Family,
            through: {
              attributes: ["role"],
            },
            include: [
              {
                model: Post,
                through: PostFamily,
                as: "posts", // Make sure this alias matches what's in Index.js
              },
            ],
          },
        ],
      });

      expect(user).toBeTruthy();
      expect(user.Families).toHaveLength(1);
      expect(user.Families[0].posts).toHaveLength(1);
      expect(user.Families[0].posts[0].content).toBe("Test post content");
    });

    // Add more tests for complete chain of associations...
  });
});

// Helper function to create test data (continued)
async function createTestData() {
  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user1 = await User.create({
    firstName: "Test",
    lastName: "User1",
    email: `testuser1_${Date.now()}@example.com`,
    passwordHash: hashedPassword,
  });

  const user2 = await User.create({
    firstName: "Test",
    lastName: "User2",
    email: `testuser2_${Date.now()}@example.com`,
    passwordHash: hashedPassword,
  });

  // Create family
  const family = await Family.create({
    name: "Test Family",
    description: "A family for testing associations",
    createdBy: user1.id,
    settings: { privacyLevel: "private" },
  });

  // Create family members
  const member1 = await FamilyMember.create({
    familyId: family.id,
    userId: user1.id,
    role: "admin",
    permissions: ["view", "edit", "delete", "invite"],
  });

  const member2 = await FamilyMember.create({
    familyId: family.id,
    userId: user2.id,
    role: "member",
    permissions: ["view"],
  });

  // Create an event
  const event = await Event.create({
    familyId: family.id,
    title: "Test Event",
    description: "An event for testing associations",
    startDate: new Date(),
    createdById: user1.id,
  });

  // Create a post
  const post = await Post.create({
    content: "Test post content",
    type: "regular",
    privacy: "family",
    createdById: user1.id,
  });

  // Associate post with family
  await PostFamily.create({
    postId: post.id,
    familyId: family.id,
  });

  return {
    users: [user1, user2],
    family,
    members: [member1, member2],
    event,
    post,
  };
}

// Helper function to clean up test data
async function cleanupTestData(testData) {
  if (!testData) return;

  // Delete in reverse order of creation to respect foreign key constraints
  await PostFamily.destroy({
    where: { postId: testData.post.id },
    force: true,
  });
  await Post.destroy({ where: { id: testData.post.id }, force: true });
  await Event.destroy({ where: { id: testData.event.id }, force: true });
  await FamilyMember.destroy({
    where: { familyId: testData.family.id },
    force: true,
  });
  await Family.destroy({ where: { id: testData.family.id }, force: true });
  for (const user of testData.users) {
    await User.destroy({ where: { id: user.id }, force: true });
  }
}