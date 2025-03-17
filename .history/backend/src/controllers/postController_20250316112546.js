// src/controllers/postController.js
const { Op } = require('sequelize');
const Post = require('../models/Post');
const PostFamily = require('../models/PostFamily');
const PostEvent = require('../models/PostEvent');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Event = require('../models/Event');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const { sequelize } = require('../config/db');

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
      eventIds 
    } = req.body;

    // Validate that user has access to the specified families
    if (familyIds && familyIds.length > 0) {
      const userFamilyMemberships = await FamilyMember.findAll({
        where: {
          userId: req.user.id,
          familyId: familyIds
        },
        transaction
      });

      if (userFamilyMemberships.length !== familyIds.length) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You do not have access to one or more of the specified families'
        });
      }
    }

    // Validate that user has access to the specified events
    if (eventIds && eventIds.length > 0) {
      const events = await Event.findAll({
        where: {
          id: eventIds
        },
        transaction
      });

      // Check if user has access to families of these events
      for (const event of events) {
        const membership = await FamilyMember.findOne({
          where: {
            userId: req.user.id,
            familyId: event.familyId
          },
          transaction
        });

        if (!membership) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'You do not have access to one or more of the specified events'
          });
        }
      }
    }

    // Create post
    const post = await Post.create({
      content,
      mediaUrls: mediaUrls || [],
      type: type || 'regular',
      privacy: privacy || 'family',
      tags: tags || [],
      location: location || null,
      createdById: req.user.id
    }, { transaction });

    // Associate post with families
    if (familyIds && familyIds.length > 0) {
      const familyAssociations = familyIds.map(familyId => ({
        postId: post.id,
        familyId
      }));

      await PostFamily.bulkCreate(familyAssociations, { transaction });
    }

    // Associate post with events
    if (eventIds && eventIds.length > 0) {
      const eventAssociations = eventIds.map(eventId => ({
        postId: post.id,
        eventId
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
          as: 'families'
        },
        {
          model: Event,
          through: { attributes: [] },
          as: 'events'
        }
      ]
    });

    res.status(201).json({
      success: true,
      post: postWithAssociations
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
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
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view posts for this family'
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
          as: 'families',
          required: true
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
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
      posts
    });
  } catch (error) {
    console.error('Get family posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
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
        message: 'Event not found'
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view posts for this event'
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
          as: 'events',
          required: true
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      posts
    });
  } catch (error) {
    console.error('Get event posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }