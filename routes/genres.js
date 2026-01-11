import express from 'express';
import { runQuery } from '../services/neo4j.js';

const router = express.Router();

/**
 * GET /api/genres
 * Liste des genres
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      MATCH (g:Genre)
      RETURN DISTINCT g.name AS name
      ORDER BY name
    `;

    const records = await runQuery(query);

    const genres = records.map((r, index) => ({
      id: String(index + 1),
      name: r.get('name'),
      slug: r.get('name').toLowerCase().replace(/\s+/g, '-')
    }));

    res.json(genres);
  } catch (error) {
    console.error('Erreur GET /api/genres:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
