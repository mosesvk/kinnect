const express = require('express');
const { connectPG } = require('./config/db.js');
const { initializeDatabase } = require('./models/index.js');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes.js');
const familyRoutes = require('./routes/familyRoutes.js');
const eventRoutes = require('./routes/eventRoutes.js');
const cors = require('cors');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT;

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

// Connect to databases
connectDB(); // MongoDB
connectPG().then(() => {
  initializeDatabase(); // Initialize PostgreSQL models
});

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});