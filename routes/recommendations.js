import express from 'express';
import { runQuery } from '../services/neo4j.js';
import { mapNeo4jToMovie } from '../utils/mappers.js';

const router = express.Router();

/**
 * GET /api/recommendations/:movieId
 * Recommandations collaboratives
 * "Les utilisateurs qui ont aimé ce film ont aussi aimé..."
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

    const movies = records.map(mapNeo4jToMovie);

    res.json(movies);
  } catch (error) {
    console.error('Erreur recommandations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
