import express from 'express';
import { runQuery } from '../services/neo4j.js';
import { mapNeo4jToMovie } from '../utils/mappers.js';

const router = express.Router();

/**
 * GET /api/recommendations/:movieId
 */
router.get('/:movieId', async (req, res) => {
  const { movieId } = req.params;

  try {
    const query = `
      MATCH (m:Movie {movieId: $movieId})<-[:RATED]-(u:User)-[:RATED]->(rec:Movie)
      WHERE rec.movieId <> $movieId
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(rec)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(rec)
      OPTIONAL MATCH (u2:User)-[:RATED]->(rec)
      RETURN
        rec AS m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u2.rating) AS avgRating,
        COUNT(DISTINCT u) AS score
      ORDER BY score DESC
      LIMIT 10
    `;

    const records = await runQuery(query, { movieId });

    res.json({
      page: null,
      limit: 10,
      total: records.length,
      movies: records.map(mapNeo4jToMovie)
    });
  } catch (error) {
    console.error('Erreur GET /api/recommendations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
