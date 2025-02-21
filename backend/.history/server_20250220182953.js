const express = require('express')
const dotenv = require('dotenv')

const connectDB = './config/db.js'

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


