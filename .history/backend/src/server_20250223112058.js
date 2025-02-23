const express = require('express')
const connectDB = require('./config/db.js')
const dotenv = require('dotenv')
const userRoutes = require('./routes/userRoutes.js')
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

app.use('/api/users', userRoutes)

connectDB()

app.listen(PORT, () => {
    console.log(`Running on port: ${PORT}`)
})


