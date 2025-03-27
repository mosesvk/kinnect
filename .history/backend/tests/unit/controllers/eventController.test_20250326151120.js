// tests/unit/controllers/eventController.test.js

// Mock dependencies first
jest.mock('../../../src/models/Event', () => ({
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  }));
  
  jest.mock('../../../src/models/EventAttendee', () => ({
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  }));
  
  jest.mock('../../../src/models/EventInvitation', () => ({
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  }));
  
  jest.mock('../../../src/models/FamilyMember', () => ({
    findOne: jest.fn(),
    findAll: jest.fn(),
  }));
  
  jest.mock('../../../src/models/User', () => ({
    findByPk: jest.fn(),
    findOne: jest.fn(),
  }));
  
  jest.mock('../../../src/config/db', () => ({
    sequelize: {
      transaction: jest.fn(() => ({
        commit: jest.fn().mockResolvedValue(null),
        rollback: jest.fn().mockResolvedValue(null),
      })),
    },
  }));
  
  // Import controller and dependencies
  const Event = require('../../../src/models/Event');
  const EventAttendee = require('../../../src/models/EventAttendee');
  const EventInvitation = require('../../../src/models/EventInvitation');
  const FamilyMember = require('../../../src/models/FamilyMember');
  const User = require('../../../src/models/User');
  const { sequelize } = require('../../../src/config/db');
  const eventController = require('../../../src/controllers/eventController');
  const { Op } = require('sequelize');
  
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
    
    describe('createEvent', () => {
      test('creates an event successfully', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          body: {
            title: 'Family Reunion',
            description: 'Annual gathering',
            startDate: '2025-05-15T18:00:00Z',
            endDate: '2025-05-15T21:00:00Z',
            location: { name: 'City Park', address: '123 Park St' },
            category: 'social',
          recurring: undefined,
          reminders: undefined,
          createdById: 'user-123',
        });
        
        expect(EventAttendee.create).toHaveBeenCalledWith({
          eventId: 'event-123',
          userId: 'user-123',
          status: 'attending',
        });
        
        expect(FamilyMember.findAll).toHaveBeenCalledWith({
          where: { familyId: 'family-123' },
        });
        
        expect(EventAttendee.bulkCreate).toHaveBeenCalledWith(expect.arrayContaining([
          { eventId: 'event-123', userId: 'user-123', status: 'attending' },
          { eventId: 'event-123', userId: 'user-456', status: 'pending' },
        ]));
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          event: mockEvent,
        });
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          body: {
            title: 'Family Reunion',
          },
          user: { id: 'user-456' }, // Not a family member
        };
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.createEvent(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to update attendance for other users',
        });
      });
    });
    
    describe('getEventAttendees', () => {
      test('gets attendees for an event successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock attendees retrieval
        const mockAttendees = [
          {
            userId: 'user-123',
            status: 'attending',
            user: { firstName: 'Test', lastName: 'User' },
          },
          {
            userId: 'user-456',
            status: 'maybe',
            user: { firstName: 'Another', lastName: 'User' },
          },
        ];
        
        EventAttendee.findAll.mockResolvedValueOnce(mockAttendees);
        
        // Call the controller
        await eventController.getEventAttendees(req, res);
        
        // Assertions
        expect(Event.findByPk).toHaveBeenCalledWith('event-123');
        
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(EventAttendee.findAll).toHaveBeenCalledWith({
          where: { eventId: 'event-123' },
          include: ['user'],
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          attendees: mockAttendees,
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
        await eventController.getEventAttendees(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
        });
        
        expect(EventAttendee.findAll).not.toHaveBeenCalled();
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-456' }, // Not a member
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.getEventAttendees(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view attendees for this event',
        });
        
        expect(EventAttendee.findAll).not.toHaveBeenCalled();
      });
    });
    
    describe('sendEventInvitation', () => {
      test('sends invitation to a user successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            userId: 'user-456',
            message: 'Please join our family event!',
          },
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
        
        // Mock family admin check - is creator
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        });
        
        // Mock user to invite
        const userToInvite = {
          id: 'user-456',
          firstName: 'Invited',
          lastName: 'User',
          email: 'invited@example.com',
        };
        
        User.findByPk.mockResolvedValueOnce(userToInvite);
        
        // Mock user is not already a family member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Mock no existing invitation
        EventInvitation.findOne.mockResolvedValueOnce(null);
        
        // Mock invitation creation
        const newInvitation = {
          id: 'invitation-123',
          eventId: 'event-123',
          userId: 'user-456',
          invitedBy: 'user-123',
          message: 'Please join our family event!',
          status: 'pending',
        };
        
        EventInvitation.create.mockResolvedValueOnce(newInvitation);
        
        // Call the controller
        await eventController.sendEventInvitation(req, res);
        
        // Assertions
        expect(Event.findByPk).toHaveBeenCalledWith('event-123');
        
        expect(User.findByPk).toHaveBeenCalledWith('user-456');
        
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-456',
          },
        });
        
        expect(EventInvitation.findOne).toHaveBeenCalledWith({
          where: {
            eventId: 'event-123',
            userId: 'user-456',
          },
        });
        
        expect(EventInvitation.create).toHaveBeenCalledWith({
          eventId: 'event-123',
          userId: 'user-456',
          invitedBy: 'user-123',
          message: 'Please join our family event!',
          status: 'pending',
        });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          invitation: newInvitation,
        });
      });
      
      test('returns 404 if user to invite does not exist', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            userId: 'nonexistent-user',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          createdById: 'user-123',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock admin check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        });
        
        // Mock user not found
        User.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.sendEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'User not found',
        });
        
        expect(EventInvitation.create).not.toHaveBeenCalled();
      });
      
      test('returns 400 if user is already a family member', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            userId: 'user-456',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          createdById: 'user-123',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock admin check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        });
        
        // Mock user exists
        User.findByPk.mockResolvedValueOnce({ id: 'user-456' });
        
        // Mock user is already a family member
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
        });
        
        // Call the controller
        await eventController.sendEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'User is already a member of this family - no invitation needed',
        });
        
        expect(EventInvitation.create).not.toHaveBeenCalled();
      });
      
      test('returns 400 if invitation already exists', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            userId: 'user-456',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          createdById: 'user-123',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock admin check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        });
        
        // Mock user exists
        User.findByPk.mockResolvedValueOnce({ id: 'user-456' });
        
        // Mock user is not a family member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Mock invitation already exists
        EventInvitation.findOne.mockResolvedValueOnce({
          id: 'invitation-123',
          eventId: 'event-123',
          userId: 'user-456',
        });
        
        // Call the controller
        await eventController.sendEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'User has already been invited to this event',
        });
        
        expect(EventInvitation.create).not.toHaveBeenCalled();
      });
    });
    
    describe('updateEventInvitation', () => {
      test('accepts invitation and adds user as attendee', async () => {
        // Set up request to accept invitation
        const req = {
          params: {
            id: 'event-123',
            invitationId: 'invitation-123',
          },
          body: {
            status: 'accepted',
          },
          user: { id: 'user-456' }, // Invited user
        };
        
        // Mock invitation retrieval
        const mockInvitation = {
          id: 'invitation-123',
          eventId: 'event-123',
          userId: 'user-456', // Same as req.user.id
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
          invitedUser: {
            id: 'user-456',
            firstName: 'Invited',
            lastName: 'User',
          },
        };
        
        EventInvitation.findOne.mockResolvedValueOnce(mockInvitation);
        
        // Call the controller
        await eventController.updateEventInvitation(req, res);
        
        // Assertions
        expect(mockInvitation.status).toBe('accepted');
        expect(mockInvitation.save).toHaveBeenCalled();
        
        expect(EventAttendee.create).toHaveBeenCalledWith({
          eventId: 'event-123',
          userId: 'user-456',
          status: 'attending',
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          invitation: mockInvitation,
        });
      });
      
      test('declines invitation without adding attendee', async () => {
        // Set up request to decline invitation
        const req = {
          params: {
            id: 'event-123',
            invitationId: 'invitation-123',
          },
          body: {
            status: 'declined',
          },
          user: { id: 'user-456' }, // Invited user
        };
        
        // Mock invitation retrieval
        const mockInvitation = {
          id: 'invitation-123',
          eventId: 'event-123',
          userId: 'user-456', // Same as req.user.id
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
          invitedUser: {
            id: 'user-456',
            firstName: 'Invited',
            lastName: 'User',
          },
        };
        
        EventInvitation.findOne.mockResolvedValueOnce(mockInvitation);
        
        // Call the controller
        await eventController.updateEventInvitation(req, res);
        
        // Assertions
        expect(mockInvitation.status).toBe('declined');
        expect(mockInvitation.save).toHaveBeenCalled();
        
        expect(EventAttendee.create).not.toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          invitation: mockInvitation,
        });
      });
      
      test('returns 400 if status is invalid', async () => {
        // Set up request with invalid status
        const req = {
          params: {
            id: 'event-123',
            invitationId: 'invitation-123',
          },
          body: {
            status: 'invalid-status',
          },
          user: { id: 'user-456' },
        };
        
        // Call the controller
        await eventController.updateEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Status must be either accepted or declined',
        });
        
        expect(EventInvitation.findOne).not.toHaveBeenCalled();
      });
      
      test('returns 404 if invitation does not exist', async () => {
        // Set up request
        const req = {
          params: {
            id: 'event-123',
            invitationId: 'nonexistent-invitation',
          },
          body: {
            status: 'accepted',
          },
          user: { id: 'user-456' },
        };
        
        // Mock invitation not found
        EventInvitation.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.updateEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invitation not found',
        });
        
        expect(EventAttendee.create).not.toHaveBeenCalled();
      });
      
      test('returns 403 if user is not the invitee', async () => {
        // Set up request
        const req = {
          params: {
            id: 'event-123',
            invitationId: 'invitation-123',
          },
          body: {
            status: 'accepted',
          },
          user: { id: 'user-789' }, // Different user
        };
        
        // Mock invitation for different user
        const mockInvitation = {
          id: 'invitation-123',
          eventId: 'event-123',
          userId: 'user-456', // Different from req.user.id
          status: 'pending',
          invitedUser: {
            id: 'user-456',
            firstName: 'Invited',
            lastName: 'User',
          },
        };
        
        EventInvitation.findOne.mockResolvedValueOnce(mockInvitation);
        
        // Call the controller
        await eventController.updateEventInvitation(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to update this invitation',
        });
        
        expect(EventAttendee.create).not.toHaveBeenCalled();
      });
    });
  });enCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to create events for this family',
        });
        
        expect(Event.create).not.toHaveBeenCalled();
      });
      
      test('creates an event with recurring settings', async () => {
        // Set up request with recurring settings
        const req = {
          params: { familyId: 'family-123' },
          body: {
            title: 'Weekly Dinner',
            startDate: '2025-05-01T18:00:00Z',
            recurring: {
              frequency: 'weekly',
              dayOfWeek: 4, // Thursday
              endDate: '2025-12-31',
            },
          },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock event creation
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Weekly Dinner',
          startDate: new Date('2025-05-01T18:00:00Z'),
          recurring: {
            frequency: 'weekly',
            dayOfWeek: 4,
            endDate: '2025-12-31',
          },
          createdById: 'user-123',
        };
        
        Event.create.mockResolvedValueOnce(mockEvent);
        
        // Mock family members retrieval
        FamilyMember.findAll.mockResolvedValueOnce([
          { familyId: 'family-123', userId: 'user-123' },
        ]);
        
        // Call the controller
        await eventController.createEvent(req, res);
        
        // Assertions
        expect(Event.create).toHaveBeenCalledWith({
          familyId: 'family-123',
          title: 'Weekly Dinner',
          description: undefined,
          startDate: expect.any(Date),
          endDate: undefined,
          location: undefined,
          category: undefined,
          recurring: {
            frequency: 'weekly',
            dayOfWeek: 4,
            endDate: '2025-12-31',
          },
          reminders: undefined,
          createdById: 'user-123',
        });
        
        expect(res.status).toHaveBeenCalledWith(201);
      });
    });
    
    describe('getFamilyEvents', () => {
      test('gets events for a family successfully', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          query: {},
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock events retrieval
        const mockEvents = [
          {
            id: 'event-1',
            title: 'Family Reunion',
            startDate: new Date('2025-05-15'),
          },
          {
            id: 'event-2',
            title: 'Birthday Party',
            startDate: new Date('2025-06-10'),
          },
        ];
        
        Event.findAll.mockResolvedValueOnce(mockEvents);
        
        // Call the controller
        await eventController.getFamilyEvents(req, res);
        
        // Assertions
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(Event.findAll).toHaveBeenCalledWith({
          where: { familyId: 'family-123' },
          order: [['startDate', 'ASC']],
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          events: mockEvents,
        });
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          query: {},
          user: { id: 'user-456' }, // Not a member
        };
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.getFamilyEvents(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view events for this family',
        });
        
        expect(Event.findAll).not.toHaveBeenCalled();
      });
      
      test('filters events by date range', async () => {
        // Set up request with date filters
        const req = {
          params: { familyId: 'family-123' },
          query: {
            startDate: '2025-05-01',
            endDate: '2025-05-31',
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
            id: 'event-1',
            title: 'Family Reunion',
            startDate: new Date('2025-05-15'),
          },
        ];
        
        Event.findAll.mockResolvedValueOnce(mockEvents);
        
        // Call the controller
        await eventController.getFamilyEvents(req, res);
        
        // Assertions
        expect(Event.findAll).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            startDate: {
              [Op.between]: [
                expect.any(Date), // 2025-05-01
                expect.any(Date), // 2025-05-31
              ],
            },
          },
          order: [['startDate', 'ASC']],
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 1,
          events: mockEvents,
        });
      });
      
      test('filters events by category', async () => {
        // Set up request with category filter
        const req = {
          params: { familyId: 'family-123' },
          query: {
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
            startDate: new Date('2025-06-10'),
          },
        ];
        
        Event.findAll.mockResolvedValueOnce(mockEvents);
        
        // Call the controller
        await eventController.getFamilyEvents(req, res);
        
        // Assertions
        expect(Event.findAll).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            category: 'birthday',
          },
          order: [['startDate', 'ASC']],
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 1,
          events: mockEvents,
        });
      });
    });
    
    describe('getEventById', () => {
      test('gets an event by ID successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval with attendees
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          startDate: new Date('2025-05-15'),
          attendees: [
            {
              userId: 'user-123',
              status: 'attending',
              user: { firstName: 'Test', lastName: 'User' },
            },
            {
              userId: 'user-456',
              status: 'pending',
              user: { firstName: 'Another', lastName: 'User' },
            },
          ],
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Call the controller
        await eventController.getEventById(req, res);
        
        // Assertions
        expect(Event.findByPk).toHaveBeenCalledWith('event-123', {
          include: [
            {
              model: EventAttendee,
              as: 'attendees',
              include: ['user'],
            },
          ],
        });
        
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          event: mockEvent,
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
        await eventController.getEventById(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
        });
        
        expect(FamilyMember.findOne).not.toHaveBeenCalled();
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-456' }, // Not a member
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.getEventById(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view this event',
        });
      });
    });
    
    describe('updateEvent', () => {
      test('updates an event successfully when user is creator', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            title: 'Updated Event Name',
            description: 'Updated description',
            startDate: '2025-06-15T18:00:00Z',
          },
          user: { id: 'user-123' }, // Event creator
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          description: 'Original description',
          startDate: new Date('2025-05-15T18:00:00Z'),
          createdById: 'user-123', // Same as req.user.id
          save: jest.fn().mockResolvedValue(true),
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - just for validation
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Call the controller
        await eventController.updateEvent(req, res);
        
        // Assertions
        expect(mockEvent.title).toBe('Updated Event Name');
        expect(mockEvent.description).toBe('Updated description');
        expect(mockEvent.startDate).toEqual(expect.any(Date)); // Should be updated to June 15
        expect(mockEvent.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          event: mockEvent,
        });
      });
      
      test('updates an event successfully when user is family admin', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            title: 'Admin Updated Event',
          },
          user: { id: 'user-456' }, // Not the creator, but a family admin
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Different from req.user.id
          save: jest.fn().mockResolvedValue(true),
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - is an admin
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
          role: 'admin', // Admin can update events
        });
        
        // Call the controller
        await eventController.updateEvent(req, res);
        
        // Assertions
        expect(mockEvent.title).toBe('Admin Updated Event');
        expect(mockEvent.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          event: mockEvent,
        });
      });
      
      test('returns 404 if event does not exist', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-event' },
          body: {
            title: 'Updated Event',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event not found
        Event.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await eventController.updateEvent(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
        });
      });
      
      test('returns 403 if user is not creator or admin', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            title: 'Unauthorized Update',
          },
          user: { id: 'user-456' }, // Not creator
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Different from req.user.id
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not an admin
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
          role: 'member', // Regular member cannot update others' events
        });
        
        // Call the controller
        await eventController.updateEvent(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to update this event',
        });
      });
    });
    
    describe('deleteEvent', () => {
      test('deletes an event successfully when user is creator', async () => {
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
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - just for validation
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock successful attendees deletion
        EventAttendee.destroy.mockResolvedValueOnce(3); // Deleted 3 attendees
        
        // Call the controller
        await eventController.deleteEvent(req, res);
        
        // Assertions
        expect(EventAttendee.destroy).toHaveBeenCalledWith({
          where: { eventId: 'event-123' },
        });
        
        expect(mockEvent.destroy).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Event deleted successfully',
        });
      });
      
      test('deletes an event successfully when user is family admin', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-456' }, // Not the creator, but a family admin
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Different from req.user.id
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - is an admin
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
          role: 'admin', // Admin can delete events
        });
        
        // Mock successful attendees deletion
        EventAttendee.destroy.mockResolvedValueOnce(3);
        
        // Call the controller
        await eventController.deleteEvent(req, res);
        
        // Assertions
        expect(mockEvent.destroy).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Event deleted successfully',
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
        await eventController.deleteEvent(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
        });
        
        expect(EventAttendee.destroy).not.toHaveBeenCalled();
      });
      
      test('returns 403 if user is not creator or admin', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          user: { id: 'user-456' }, // Not creator
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Different from req.user.id
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not an admin
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
          role: 'member', // Regular member cannot delete others' events
        });
        
        // Call the controller
        await eventController.deleteEvent(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to delete this event',
        });
        
        expect(EventAttendee.destroy).not.toHaveBeenCalled();
      });
    });
    
    describe('manageAttendance', () => {
      test('updates user\'s own attendance status successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            status: 'attending',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock existing attendance record
        const existingAttendance = {
          eventId: 'event-123',
          userId: 'user-123',
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
        };
        
        EventAttendee.findOne.mockResolvedValueOnce(existingAttendance);
        
        // Call the controller
        await eventController.manageAttendance(req, res);
        
        // Assertions
        expect(existingAttendance.status).toBe('attending');
        expect(existingAttendance.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          attendance: existingAttendance,
        });
      });
      
      test('creates new attendance record if none exists', async () => {
        // Set up request
        const req = {
          params: { id: 'event-123' },
          body: {
            status: 'maybe',
          },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock no existing attendance record
        EventAttendee.findOne.mockResolvedValueOnce(null);
        
        // Mock attendance creation
        const newAttendance = {
          eventId: 'event-123',
          userId: 'user-123',
          status: 'maybe',
        };
        
        EventAttendee.create.mockResolvedValueOnce(newAttendance);
        
        // Call the controller
        await eventController.manageAttendance(req, res);
        
        // Assertions
        expect(EventAttendee.create).toHaveBeenCalledWith({
          eventId: 'event-123',
          userId: 'user-123',
          status: 'maybe',
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          attendance: newAttendance,
        });
      });
      
      test('returns 400 if status is invalid', async () => {
        // Set up request with invalid status
        const req = {
          params: { id: 'event-123' },
          body: {
            status: 'invalid-status', // Not a valid status
          },
          user: { id: 'user-123' },
        };
        
        // Call the controller
        await eventController.manageAttendance(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid status. Must be attending, maybe, or declined',
        });
        
        expect(Event.findByPk).not.toHaveBeenCalled();
      });
      
      test('allows admin to update another user\'s attendance', async () => {
        // Set up request to update another user's attendance
        const req = {
          params: { id: 'event-123' },
          body: {
            status: 'attending',
            userId: 'user-456', // Another user
          },
          user: { id: 'user-123' }, // Admin/creator
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Same as req.user.id (is creator)
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin', // Is admin
        });
        
        // Mock target user membership check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-456',
        });
        
        // Mock existing attendance record for target user
        const targetAttendance = {
          eventId: 'event-123',
          userId: 'user-456',
          status: 'pending',
          save: jest.fn().mockResolvedValue(true),
        };
        
        EventAttendee.findOne.mockResolvedValueOnce(targetAttendance);
        
        // Call the controller
        await eventController.manageAttendance(req, res);
        
        // Assertions
        expect(targetAttendance.status).toBe('attending');
        expect(targetAttendance.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          attendance: targetAttendance,
        });
      });
      
      test('returns 403 if user tries to update another user\'s attendance without permission', async () => {
        // Set up request to update another user's attendance
        const req = {
          params: { id: 'event-123' },
          body: {
            status: 'attending',
            userId: 'user-456', // Another user
          },
          user: { id: 'user-789' }, // Not admin or creator
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          createdById: 'user-123', // Different from req.user.id
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not admin or creator
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-789',
          role: 'member', // Not admin
        });
        
        // Call the controller
        await eventController.manageAttendance(req, res);
        
        // Assertions
        expect(res.status).toHaveBe'social',
          },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'member',
        });
        
        // Mock event creation
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
          title: 'Family Reunion',
          description: 'Annual gathering',
          startDate: new Date('2025-05-15T18:00:00Z'),
          endDate: new Date('2025-05-15T21:00:00Z'),
          location: { name: 'City Park', address: '123 Park St' },
          category: 'social',
          createdById: 'user-123',
        };
        
        Event.create.mockResolvedValueOnce(mockEvent);
        
        // Mock family members retrieval
        const familyMembers = [
          { familyId: 'family-123', userId: 'user-123' },
          { familyId: 'family-123', userId: 'user-456' },
        ];
        
        FamilyMember.findAll.mockResolvedValueOnce(familyMembers);
        
        // Call the controller
        await eventController.createEvent(req, res);
        
        // Assertions
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(Event.create).toHaveBeenCalledWith({
          familyId: 'family-123',
          title: 'Family Reunion',
          description: 'Annual gathering',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          location: { name: 'City Park', address: '123 Park St' },
          category: