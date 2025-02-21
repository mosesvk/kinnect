const express = require('express')
const connectDB = require('./config/db.js')
const dotenv = require('dotenv')

dotenv.config()

const app = express() 
const PORT = process.env.PORT

app.use(express.json())

app.get('/', (req, res) => {
    res.send('API is sending...')
})

connectDB()

app.listen(PORT, () => {

})


