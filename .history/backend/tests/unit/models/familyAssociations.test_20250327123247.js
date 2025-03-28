// tests/unit/models/familyAssociations.test.js
const { sequelize } = require("../../../src/config/db");
const User = require("../../../src/models/User");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const Event = require("../../../src/models/Event");
const Post = require("../../../src/models/Post");
const PostFamily = require("../../../src/models/PostFamily");
const { syncDatabase } = require("../../../src/models/Index");
const bcrypt = require("bcryptjs");

// Helper function to create test data
const createTestData = async () => {
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
};

// Helper function to clean up test data
const cleanupTestData = async (testData) => {
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
};

describe("Family Model Associations Tests", () => {
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
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData);
  });

  describe("Family and User assdociations", () => {
    it("should fetch users of a family through FamilyMember", async () => {
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

    it("should fetch families of a user through FamilyMember", async () => {
      // Find a user with their family memberships
      const userWithFamilies = await User.findByPk(testData.users[0].id, {
        include: [
          {
            model: FamilyMember,
            as: "memberships",
            include: [
              {
                model: Family,
              },
            ],
          },
        ],
      });

      expect(userWithFamilies).toBeTruthy();
      expect(userWithFamilies.memberships).toHaveLength(1);
      expect(userWithFamilies.memberships[0].Family).toBeTruthy();
      expect(userWithFamilies.memberships[0].Family.id).toBe(
        testData.family.id
      );
      expect(userWithFamilies.memberships[0].role).toBe("admin");
    });

    it("should fetch families of a user through many-to-many relation", async () => {
      // Find a user with their families (using many-to-many relationship)
      const userWithFamilies = await User.findByPk(testData.users[0].id, {
        include: [
          {
            model: Family,
            through: {
              attributes: ["role", "permissions"],
            },
          },
        ],
      });

      expect(userWithFamilies).toBeTruthy();
      expect(userWithFamilies.Families).toBeTruthy();
      expect(userWithFamilies.Families).toHaveLength(1);
      expect(userWithFamilies.Families[0].id).toBe(testData.family.id);
      // Check if through attributes are included
      expect(userWithFamilies.Families[0].FamilyMember.role).toBe("admin");
    });
  });

  describe("Family and Event associations", () => {
    it("should fetch events of a family", async () => {
      // Find the family with its events
      const familyWithEvents = await Family.findByPk(testData.family.id, {
        include: [
          {
            model: Event,
          },
        ],
      });

      expect(familyWithEvents).toBeTruthy();
      expect(familyWithEvents.Events).toBeTruthy();
      expect(familyWithEvents.Events).toHaveLength(1);
      expect(familyWithEvents.Events[0].id).toBe(testData.event.id);
      expect(familyWithEvents.Events[0].title).toBe("Test Event");
    });

    it("should fetch the family of an event", async () => {
      // Find an event with its family
      const eventWithFamily = await Event.findByPk(testData.event.id, {
        include: [
          {
            model: Family,
          },
        ],
      });

      expect(eventWithFamily).toBeTruthy();
      expect(eventWithFamily.Family).toBeTruthy();
      expect(eventWithFamily.Family.id).toBe(testData.family.id);
      expect(eventWithFamily.Family.name).toBe("Test Family");
    });
  });

  describe("Family and Post associations", () => {
    it("should fetch posts of a family through PostFamily", async () => {
      // Find the family with its posts - add the 'as' parameter
      const familyWithPosts = await Family.findByPk(testData.family.id, {
        include: [
          {
            model: Post,
            through: { attributes: [] },
            as: "posts", // This was missing - should match the alias in src/models/Index.js
          },
        ],
      });

      expect(familyWithPosts).toBeTruthy();
      expect(familyWithPosts.posts).toHaveLength(1);
      expect(familyWithPosts.posts[0].id).toBe(testData.post.id);
    });

    it("should fetch families of a post through PostFamily", async () => {
      // Find a post with its families - add the 'as' parameter
      const postWithFamilies = await Post.findByPk(testData.post.id, {
        include: [
          {
            model: Family,
            through: { attributes: [] },
            as: "families", // This was missing - should match the alias in src/models/Index.js
          },
        ],
      });

      expect(postWithFamilies).toBeTruthy();
      expect(postWithFamilies.families).toHaveLength(1);
      expect(postWithFamilies.families[0].id).toBe(testData.family.id);
    });

    // For the chain of associations:
    it("should fetch the complete chain of associations from user to posts", async () => {
      // Get a user with their families, which have posts - add the 'as' parameters
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
                through: { attributes: [] },
                as: "posts", // This needs to match the alias
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
  });

  describe("Complete chain of associations", () => {
    it("should fetch the complete chain of associations from user to posts", async () => {
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
              },
            ],
          },
        ],
      });

      expect(user).toBeTruthy();
      expect(user.Families).toHaveLength(1);
      expect(user.Families[0].Posts).toHaveLength(1);
      expect(user.Families[0].Posts[0].content).toBe("Test post content");
    });

    it("should fetch the complete chain of associations from family to users and events", async () => {
      // Get a family with its members and events
      const family = await Family.findByPk(testData.family.id, {
        include: [
          {
            model: User,
            through: {
              attributes: ["role", "permissions"],
            },
          },
          {
            model: Event,
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName"],
              },
            ],
          },
        ],
      });

      expect(family).toBeTruthy();
      expect(family.Users).toHaveLength(2);
      expect(family.Events).toHaveLength(1);
      expect(family.Events[0].creator).toBeTruthy();
      expect(family.Events[0].creator.id).toBe(testData.users[0].id);
    });
  });
});
