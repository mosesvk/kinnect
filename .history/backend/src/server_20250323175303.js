// src/server.js
const express = require("express");
const { connectDB } = require("./config/db");
const { syncDatabase } = require("./models/Index");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

// Import route files
const userRoutes = require("./routes/userRoutes");
const familyRoutes = require("./routes/familyRoutes");
const { familyEventRoutes, eventRoutes } = require("./routes/eventRoutes");
const familyPostRoutes = require("./routes/familyPostRoutes");
const eventPostRoutes = require("./routes/eventPostRoutes");
const postRoutes = require("./routes/postRoutes");
const {mediaRoutes, familyMediaRoutes} = require("./routes/mediaRoutes");

// Import middleware
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const {
  apiLimiter,
  authLimiter,
  mediaLimiter,
} = require("./middleware/rateLimiter");
const corsOptions = require("./config/cors");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with environment-specific options
app.use(cors(corsOptions));

// Configure Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  })
);

// Logging middleware in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve static files from uploads directory in development
if (process.env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
}

// Apply rate limiters
app.use("/api/", apiLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/media/upload", mediaLimiter);

// Welcome route
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the KINNECT API",
    version: "1.0.0",
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/media", mediaRoutes);

// Nested routes with parameters
app.use("/api/families/:familyId/events", familyEventRoutes);
app.use("/api/families/:familyId/posts", familyPostRoutes);
app.use("/api/families/:familyId/media", familyMediaRoutes);
app.use("/api/events/:eventId/posts", eventPostRoutes);

// Add parameter middleware for route parameters
app.param("familyId", (req, res, next, id) => {
  req.params.familyId = id;
  next();
});

app.param("eventId", (req, res, next, id) => {
  req.params.eventId = id;
  next();
});

// Error handling middleware - must be used after all routes
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await syncDatabase();

    const server = app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV} mode on port: ${PORT}`
      );
    });

    return server; // Return the server instance for testing
  } catch (error) {
    console.error("Failed to start server:", error);

    // Only exit the process in non-test environments
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    } else {
      throw error; // Throw instead of exiting in test environment
    }
  }
};

// Only call start() if not in a testing environment or if explicitly required
if (process.env.NODE_ENV !== "test" || process.env.FORCE_START === "true") {
  start();
}

module.exports = app; // Export the app for testing
