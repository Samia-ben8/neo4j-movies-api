import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import moviesRoutes from './routes/movies.js';
import recommendationsRoutes from './routes/recommendations.js';
import genresRoutes from './routes/genres.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/movies', moviesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/genres', genresRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
