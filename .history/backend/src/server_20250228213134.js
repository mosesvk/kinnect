const express = require('express')
const dotenv = require('dotenv')
const userRoutes = require('./routes/userRoutes.js')
const familyRoutes = require('./routes/familyRoutes.js')
const eventRoutes = require('./routes/eventRoutes.js')
const { syncModels } = require('./models/sequelize');
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


connectPgDB().then(() => {
    if (process.env.NODE_ENV === 'development') {
      syncModels().then(() => {
        console.log('Database models synchronized');
      });
    }
  });

app.listen(PORT, () => {
    console.log(`Running on port: ${PORT}`)
})


