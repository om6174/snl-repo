import express, { urlencoded } from 'express';
import trainerRoutes from './src/components/trainer';
import userRoutes from './src/components/user';

require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON requests
app.use(express.json());
app.use(urlencoded())
// Use the trainer routes under the '/api/trainers' path
app.use('/api/trainer', trainerRoutes);
app.use('/api/user', userRoutes);

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
