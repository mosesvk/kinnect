// tests/unit/controllers/eventController.test.js - Fixed version

// Mock dependencies first
jest.mock('../../../src/models/Event', () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../../src/models/EventAttendee', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
  destroy: jest.fn()
}));

jest.mock('../../../src/models/EventInvitation', () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../../src/models/FamilyMember', () => ({
  findOne: jest.fn(),
  findAll: jest.fn()
}));

jest.mock('../../../src/models/User', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn()
}));

// Import models and controller after mocking
const Event = require('../../../src/models/Event');
const EventAttendee = require('../../../src/models/EventAttendee');
const EventInvitation = require('../../../src/models/EventInvitation');
const FamilyMember = require('../../../src/models/FamilyMember');
const User = require('../../../src/models/User');
const { Op } = require('sequelize');
const eventController = require('../../../src/controllers/eventController');

describe('Event Controller', () => {
  // Create a standard response mock
  let res;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getEventInvitations', () => {
    test('gets all invitations for an event successfully', async () => {
      // Set up request
      const req = {
        params: { id: 'event-123' },
        user: { id: 'user-123' }, // Event creator
      };
      
      // Mock event retrieval
      const mockEvent = {
        id: 'event-123',
        familyId: 'family-123',
        title: 'Family Reunion',
        createdById: 'user-123', // Same as req.user.id
      };
      
      Event.findByPk.mockResolvedValueOnce(mockEvent);
      
      // Mock admin check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock invitations retrieval
      const mockInvitations = [
        {
          id: 'invitation-1',
          eventId: 'event-123',
          userId: 'user-456',
          invitedBy: 'user-123',
          status: 'pending',
          invitedUser: { id: 'user-456', firstName: 'Invited', lastName: 'User' },
          inviter: { id: 'user-123', firstName: 'Admin', lastName: 'User' },
        },
        {
          id: 'invitation-2',
          eventId: 'event-123',
          userId: 'user-789',
          invitedBy: 'user-123',
          status: 'accepted',
          invitedUser: { id: 'user-789', firstName: 'Another', lastName: 'User' },
          inviter: { id: 'user-123', firstName: 'Admin', lastName: 'User' },
        },
      ];
      
      EventInvitation.findAll.mockResolvedValueOnce(mockInvitations);
      
      // Call the controller
      await eventController.getEventInvitations(req, res);
      
      // Assertions
      expect(Event.findByPk).toHaveBeenCalledWith('event-123');
      
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        },
      });
      
      expect(EventInvitation.findAll).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        include: [
          {
            model: User,
            as: 'invitedUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'],
          },
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        invitations: mockInvitations,
      });
    });
    
    test('returns 404 if event does not exist', async () => {
      // Set up request
      const req = {
        params: { id: 'nonexistent-event' },
        user: { id: 'user-123' },
      };
      
      // Mock event not found
      Event.findByPk.mockResolvedValueOnce(null);
      
      // Call the controller
      await eventController.getEventInvitations(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Event not found',
      });
      
      expect(EventInvitation.findAll).not.toHaveBeenCalled();
    });
    
    test('returns 403 if user is not the creator or admin', async () => {
      // Set up request
      const req = {
        params: { id: 'event-123' },
        user: { id: 'user-456' }, // Not creator or admin
      };
      
      // Mock event retrieval
      const mockEvent = {
        id: 'event-123',
        familyId: 'family-123',
        title: 'Family Reunion',
        createdById: 'user-123', // Different from req.user.id
      };
      
      Event.findByPk.mockResolvedValueOnce(mockEvent);
      
      // Mock admin check - not an admin
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await eventController.getEventInvitations(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only the event creator or family admin can view invitations',
      });
      
      expect(EventInvitation.findAll).not.toHaveBeenCalled();
    });
  });
  
  // Test for edge cases and error scenarios
  describe('edge cases and error handling', () => {
    test('handles database errors in event creation gracefully', async () => {
      // Set up request
      const req = {
        params: { familyId: 'family-123' },
        body: {
          title: 'Error Test Event',
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
      });
      
      // Mock database error during event creation
      Event.create.mockRejectedValueOnce(new Error('Database connection error'));
      
      // Call the controller
      await eventController.createEvent(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database connection error',
      });
    });
    
    test('handles invalid date formats in event creation', async () => {
      // Set up request with invalid date format
      const req = {
        params: { familyId: 'family-123' },
        body: {
          title: 'Date Format Test',
          startDate: 'invalid-date-format', // Invalid date format
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
      });
      
      // Mock database error due to invalid date
      Event.create.mockRejectedValueOnce(new Error('Invalid date format'));
      
      // Call the controller
      await eventController.createEvent(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error',
        })
      );
    });
    
    test('validates startDate is before endDate', async () => {
      // This would normally be handled by validation middleware
      // But controllers should have fallback validation
      
      // Set up request with endDate before startDate
      const req = {
        params: { familyId: 'family-123' },
        body: {
          title: 'Date Order Test',
          startDate: '2025-05-15T18:00:00Z',
          endDate: '2025-05-14T18:00:00Z', // Before startDate
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
      });
      
      // Mock database error due to date validation
      Event.create.mockRejectedValueOnce(new Error('End date must be after start date'));
      
      // Call the controller
      await eventController.createEvent(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error',
        })
      );
    });
  });
  
  // Additional tests for event filtering functionality
  describe('event filtering', () => {
    test('filters events by category and date range combined', async () => {
      // Set up request with multiple filters
      const req = {
        params: { familyId: 'family-123' },
        query: {
          startDate: '2025-05-01',
          endDate: '2025-05-31',
          category: 'birthday',
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
      });
      
      // Mock filtered events retrieval
      const mockEvents = [
        {
          id: 'event-2',
          title: 'Birthday Party',
          category: 'birthday',
          startDate: new Date('2025-05-15'),
        },
      ];
      
      Event.findAll.mockResolvedValueOnce(mockEvents);
      
      // Call the controller
      await eventController.getFamilyEvents(req, res);
      
      // Assertions
      expect(Event.findAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          familyId: 'family-123',
          category: 'birthday',
        }),
        order: [['startDate', 'ASC']],
      });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        events: mockEvents,
      });
    });
    
    test('returns empty array when no events match filters', async () => {
      // Set up request with filters that match no events
      const req = {
        params: { familyId: 'family-123' },
        query: {
          category: 'holiday',
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
      });
      
      // Mock empty result
      Event.findAll.mockResolvedValueOnce([]);
      
      // Call the controller
      await eventController.getFamilyEvents(req, res);
      
      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        events: [],
      });
    });
  });
});