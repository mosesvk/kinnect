// src/controllers/postController.js
const { Op } = require("sequelize");
const User = require('../models/User')
const Post = require("../models/Post");
const PostFamily = require("../models/PostFamily");
const PostEvent = require("../models/PostEvent");
const Family = require("../models/Family");
const FamilyMember = require("../models/FamilyMember");
const Event = require("../models/Event");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const { sequelize } = require("../config/db");

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      content,
      mediaUrls,
      type,
      privacy,
      tags,
      location,
      familyIds,
      eventIds,
    } = req.body;

    // Validate that user has access to the specified families
    if (familyIds && familyIds.length > 0) {
      const userFamilyMemberships = await FamilyMember.findAll({
        where: {
          userId: req.user.id,
          familyId: familyIds,
        },
        transaction,
      });

      if (userFamilyMemberships.length !== familyIds.length) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to one or more of the specified families",
        });
      }
    }

    // Validate that user has access to the specified events
    if (eventIds && eventIds.length > 0) {
      const events = await Event.findAll({
        where: {
          id: eventIds,
        },
        transaction,
      });

      // Check if user has access to families of these events
      for (const event of events) {
        const membership = await FamilyMember.findOne({
          where: {
            userId: req.user.id,
            familyId: event.familyId,
          },
          transaction,
        });

        if (!membership) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to one or more of the specified events",
          });
        }
      }
    }

    // Create post
    const post = await Post.create(
      {
        content,
        mediaUrls: mediaUrls || [],
        type: type || "regular",
        privacy: privacy || "family",
        tags: tags || [],
        location: location || null,
        createdById: req.user.id,
      },
      { transaction }
    );

    // Associate post with families
    if (familyIds && familyIds.length > 0) {
      const familyAssociations = familyIds.map((familyId) => ({
        postId: post.id,
        familyId,
      }));

      await PostFamily.bulkCreate(familyAssociations, { transaction });
    }

    // Associate post with events
    if (eventIds && eventIds.length > 0) {
      const eventAssociations = eventIds.map((eventId) => ({
        postId: post.id,
        eventId,
      }));

      await PostEvent.bulkCreate(eventAssociations, { transaction });
    }

    await transaction.commit();

    // Return the created post with associations
    const postWithAssociations = await Post.findByPk(post.id, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
        {
          model: Event,
          through: { attributes: [] },
          as: "events",
        },
      ],
    });

    res.status(201).json({
      success: true,
      post: postWithAssociations,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create post error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Private
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    // Get post with associations and comments
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
        {
          model: Event,
          through: { attributes: [] },
          as: "events",
        },
        {
          model: Comment,
          as: "comments",
          where: { parentId: null }, // Only get top-level comments
          required: false,
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "firstName", "lastName", "profileImage"],
            },
            {
              model: Comment,
              as: "replies",
              include: [
                {
                  model: User,
                  as: "author",
                  attributes: ["id", "firstName", "lastName", "profileImage"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user has access to at least one of the families this post belongs to
    const hasAccess = await FamilyMember.findOne({
      where: {
        userId: req.user.id,
        familyId: {
          [Op.in]: post.families.map((family) => family.id),
        },
      },
    });

    if (!hasAccess && post.privacy !== "public") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this post",
      });
    }

    // Get likes count for this post
    const likesCount = await Like.count({
      where: {
        targetType: "post",
        targetId: postId,
      },
    });

    // Check if the user has liked this post
    const userLike = await Like.findOne({
      where: {
        userId: req.user.id,
        targetType: "post",
        targetId: postId,
      },
    });

    // Add counts and user interaction to the response
    const postWithCounts = {
      ...post.toJSON(),
      likesCount,
      userLiked: !!userLike,
      userReaction: userLike ? userLike.reaction : null,
    };

    res.json({
      success: true,
      post: postWithCounts,
    });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const postId = req.params.id;
    const {
      content,
      mediaUrls,
      type,
      privacy,
      tags,
      location,
      familyIds,
      eventIds,
    } = req.body;

    // Get the post
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
        {
          model: Event,
          through: { attributes: [] },
          as: "events",
        },
      ],
      transaction,
    });

    if (!post) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user is the creator of the post
    if (post.createdById !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    // Validate that user has access to the specified families
    if (familyIds && familyIds.length > 0) {
      const userFamilyMemberships = await FamilyMember.findAll({
        where: {
          userId: req.user.id,
          familyId: familyIds,
        },
        transaction,
      });

      if (userFamilyMemberships.length !== familyIds.length) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to one or more of the specified families",
        });
      }
    }

    // Validate that user has access to the specified events
    if (eventIds && eventIds.length > 0) {
      const events = await Event.findAll({
        where: {
          id: eventIds,
        },
        transaction,
      });

      // Check if user has access to families of these events
      for (const event of events) {
        const membership = await FamilyMember.findOne({
          where: {
            userId: req.user.id,
            familyId: event.familyId,
          },
          transaction,
        });

        if (!membership) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message:
              "You do not have access to one or more of the specified events",
          });
        }
      }
    }

    // Update post
    post.content = content || post.content;
    if (mediaUrls) post.mediaUrls = mediaUrls;
    if (type) post.type = type;
    if (privacy) post.privacy = privacy;
    if (tags) post.tags = tags;
    post.location = location || post.location;

    await post.save({ transaction });

    // Update family associations if provided
    if (familyIds) {
      // Remove existing associations
      await PostFamily.destroy({
        where: { postId },
        transaction,
      });

      // Add new associations
      if (familyIds.length > 0) {
        const familyAssociations = familyIds.map((familyId) => ({
          postId,
          familyId,
        }));

        await PostFamily.bulkCreate(familyAssociations, { transaction });
      }
    }

    // Update event associations if provided
    if (eventIds) {
      // Remove existing associations
      await PostEvent.destroy({
        where: { postId },
        transaction,
      });

      // Add new associations
      if (eventIds.length > 0) {
        const eventAssociations = eventIds.map((eventId) => ({
          postId,
          eventId,
        }));

        await PostEvent.bulkCreate(eventAssociations, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated post with all associations
    const updatedPost = await Post.findByPk(postId, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
        {
          model: Event,
          through: { attributes: [] },
          as: "events",
        },
      ],
    });

    res.json({
      success: true,
      post: updatedPost,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const postId = req.params.id;

    // Get the post
    const post = await Post.findByPk(postId, { transaction });

    if (!post) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user is the creator of the post
    if (post.createdById !== req.user.id) {
      // If not the creator, check if user is an admin of any associated family
      const isAdmin = await sequelize.query(
        `
        SELECT fm."userId" 
        FROM "FamilyMembers" fm
        JOIN "PostFamilies" pf ON fm."familyId" = pf."familyId"
        WHERE pf."postId" = :postId 
        AND fm."userId" = :userId 
        AND fm."role" = 'admin'
        LIMIT 1
      `,
        {
          replacements: { postId, userId: req.user.id },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (isAdmin.length === 0) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this post",
        });
      }
    }

    // Delete all related comments
    await Comment.destroy({
      where: { postId },
      transaction,
    });

    // Delete all likes related to this post
    await Like.destroy({
      where: {
        targetType: "post",
        targetId: postId,
      },
      transaction,
    });

    // Delete post family associations
    await PostFamily.destroy({
      where: { postId },
      transaction,
    });

    // Delete post event associations
    await PostEvent.destroy({
      where: { postId },
      transaction,
    });

    // Delete the post
    await post.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Like/react to a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { reaction = "like" } = req.body;

    // Check if post exists and user has access
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check access if post is not public
    if (post.privacy !== "public") {
      const hasAccess = await FamilyMember.findOne({
        where: {
          userId: req.user.id,
          familyId: {
            [Op.in]: post.families.map((family) => family.id),
          },
        },
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to interact with this post",
        });
      }
    }

    // Check if user already liked the post
    const existingLike = await Like.findOne({
      where: {
        userId: req.user.id,
        targetType: "post",
        targetId: postId,
      },
    });

    if (existingLike) {
      // Update reaction if different
      if (existingLike.reaction !== reaction) {
        existingLike.reaction = reaction;
        await existingLike.save();
      } else {
        // If same reaction, remove it (toggle)
        await existingLike.destroy();

        return res.json({
          success: true,
          message: "Reaction removed",
          isLiked: false,
        });
      }
    } else {
      // Create new like
      await Like.create({
        userId: req.user.id,
        targetType: "post",
        targetId: postId,
        reaction,
      });
    }

    // Get updated like count
    const likesCount = await Like.count({
      where: {
        targetType: "post",
        targetId: postId,
      },
    });

    res.json({
      success: true,
      message: existingLike ? "Reaction updated" : "Post liked",
      isLiked: true,
      reaction,
      likesCount,
    });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Comment on a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, mediaUrl, parentId } = req.body;

    // Check if post exists and user has access
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check access if post is not public
    if (post.privacy !== "public") {
      const hasAccess = await FamilyMember.findOne({
        where: {
          userId: req.user.id,
          familyId: {
            [Op.in]: post.families.map((family) => family.id),
          },
        },
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to comment on this post",
        });
      }
    }

    // If parentId is provided, verify it's a comment on the same post
    if (parentId) {
      const parentComment = await Comment.findOne({
        where: {
          id: parentId,
          postId,
        },
      });

      if (!parentComment) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment ID",
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      postId,
      userId: req.user.id,
      content,
      mediaUrl,
      parentId,
    });

    // Get the comment with user info
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      comment: commentWithUser,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const { page = 1, limit = 20 } = req.query;

    // Check if post exists and user has access
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: "families",
        },
      ],
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check access if post is not public
    if (post.privacy !== "public") {
      const hasAccess = await FamilyMember.findOne({
        where: {
          userId: req.user.id,
          familyId: {
            [Op.in]: post.families.map((family) => family.id),
          },
        },
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view comments on this post",
        });
      }
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get top-level comments (no parentId)
    const { count, rows: comments } = await Comment.findAndCountAll({
      where: {
        postId,
        parentId: null,
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
        {
          model: Comment,
          as: "replies",
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "firstName", "lastName", "profileImage"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
// @desc    Get posts for a family
// @route   GET /api/families/:familyId/posts
// @access  Private
exports.getFamilyPosts = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { page = 1, limit = 10, type } = req.query;

    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view posts for this family",
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build query options
    const queryOptions = {
      include: [
        {
          model: Family,
          where: { id: familyId },
          through: { attributes: [] },
          as: "families",
          required: true,
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    // Add type filter if provided
    if (type) {
      queryOptions.where = { type };
    }

    // Get posts
    const { count, rows: posts } = await Post.findAndCountAll(queryOptions);

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      posts,
    });
  } catch (error) {
    console.error("Get family posts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get posts for an event
// @route   GET /api/events/:eventId/posts
// @access  Private
exports.getEventPosts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get event to check family
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view posts for this event",
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get posts for this event
    const { count, rows: posts } = await Post.findAndCountAll({
      include: [
        {
          model: Event,
          where: { id: eventId },
          through: { attributes: [] },
          as: "events",
          required: true,
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "profileImage"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      posts,
    });
  } catch (error) {
    console.error("Get event posts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
