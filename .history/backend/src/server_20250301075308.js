const express = require('express');
const { connectDB } = require('./config/database.js');
const { syncDatabase } = require('./models/index.js');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes.js');
const familyRoutes = require('./routes/familyRoutes.js');
const eventRoutes = require('./routes/eventRoutes.js');
const cors = require('cors');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/users', userRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/events', eventRoutes);

// Connect to database and sync models
const start = async () => {
  try {
    await connectDB();
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();