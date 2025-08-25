# KINNECT Backend API

A robust backend API for a family management and memories sharing application. This API provides endpoints for managing families, events, posts, media, and user interactions.

## 🚀 Features

- User authentication and authorization
- Family management
- Event creation and management
- Post creation and sharing
- Media upload and management
- Rate limiting and security features
- Comprehensive API documentation

## 📁 Project Structure

```
kinnect-backend/
├── src/
│   ├── config/         # Configuration files (database, cors, etc.)
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── validations/    # Request validation schemas
│   └── server.js       # Main application file
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
├── uploads/           # Temporary file storage
└── scripts/           # Utility scripts
```

## 🛠️ Technology Stack

- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT for authentication
- AWS S3 for media storage
- Jest for testing
- Supertest for API testing

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- PostgreSQL
- AWS S3 account (for media storage)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kinnect-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   JWT_SECRET=your_jwt_secret
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_bucket_name
   AWS_REGION=your_aws_region
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing

The project includes comprehensive test suites for unit, integration, and end-to-end testing.

### Running Tests

1. Unit Tests:
   ```bash
   npm run test:unit
   ```

2. Integration Tests:
   ```bash
   npm run test:integration
   ```

3. End-to-End Tests:
   ```bash
   npm run test:e2e
   ```

4. All Tests with Coverage:
   ```bash
   npm run test:coverage
   ```

### API Testing

You can test the API endpoints using tools like Postman or curl. Here are some example endpoints:

1. Authentication:
   ```bash
   POST /api/users/register
   POST /api/users/login
   ```

2. Family Management:
   ```bash
   GET /api/families
   POST /api/families
   GET /api/families/:familyId
   ```

3. Events:
   ```bash
   GET /api/events
   POST /api/events
   GET /api/families/:familyId/events
   ```

4. Posts:
   ```bash
   GET /api/posts
   POST /api/posts
   GET /api/families/:familyId/posts
   GET /api/events/:eventId/posts
   ```

5. Media:
   ```bash
   POST /api/media/upload
   GET /api/media/:mediaId
   GET /api/families/:familyId/media
   ```

## 🔒 Security Features

- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation
- JWT authentication
- Secure file uploads

## 📝 API Documentation

The API follows RESTful principles and includes the following main resources:

- Users
- Families
- Events
- Posts
- Media

Each resource has standard CRUD operations and additional specialized endpoints.

## 🚀 Deployment

1. Set environment variables for production
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 