const express = require('express')
const { connectPgDB } = require('./config/db.js') // PostgreSQL connection
const dotenv = require('dotenv')
const userRoutes = require('./routes/userRoutes.js')
const familyRoutes = require('./routes/familyRoutes.js')
const eventRoutes = require('./routes/eventRoutes.js')
const cors = require('cors')
const helmet = require('helmet') 

dotenv.config()

const app = express() 
const PORT = process.env.PORT

app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use(helmet())

app.get('/', (req, res) => {
    res.send('API is sending...')
})

// app.use('/api/users', userRoutes)
// app.use('/api/families', familyRoutes)
// app.use('/api/events', eventRoutes)

// Connect to MongoDB (keeping this for compatibility)
connectDB()

// Connect to PostgreSQL
connectPgDB()

app.listen(PORT, () => {
    console.log(`Running on port: ${PORT}`)
})