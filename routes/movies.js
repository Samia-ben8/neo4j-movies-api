import express from 'express';
import { runQuery } from '../services/neo4j.js';
import { mapNeo4jToMovie } from '../utils/mappers.js';

const router = express.Router();

/**
 * GET /api/movies?page=&limit=
 * Catalogue des films (paginé)
 */
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const skip = (page - 1) * limit;

  try {
    const dataQuery = `
      MATCH (m:Movie)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      SKIP toInteger($skip)
      LIMIT toInteger($limit)
    `;

    const countQuery = `
      MATCH (m:Movie)
      RETURN count(m) AS total
    `;

    const [records, countResult] = await Promise.all([
      runQuery(dataQuery, { skip, limit }),
      runQuery(countQuery)
    ]);

    res.json({
      page,
      limit,
      total: countResult[0].get('total').toNumber(),
      movies: records.map(mapNeo4jToMovie)
    });
  } catch (error) {
    console.error('Erreur GET /api/movies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/movies/search?q=&page=&limit=
 */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const skip = (page - 1) * limit;

  if (!q || q.trim() === '') {
    return res.json({ page, limit, total: 0, movies: [] });
  }

  try {
    const dataQuery = `
      MATCH (m:Movie)
      WHERE
        toLower(m.title) CONTAINS toLower($query)
        OR EXISTS {
          MATCH (p)-[:ACTED_IN]->(m)
          WHERE toLower(p.name) CONTAINS toLower($query)
        }
        OR EXISTS {
          MATCH (p)-[:DIRECTED]->(m)
          WHERE toLower(p.name) CONTAINS toLower($query)
        }

      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)

      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      SKIP toInteger($skip)
      LIMIT toInteger($limit)

    `;

    const countQuery = `
      MATCH (m:Movie)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      WHERE
        toLower(m.title) CONTAINS toLower($query)
        OR toLower(d.name) CONTAINS toLower($query)
        OR toLower(a.name) CONTAINS toLower($query)
      RETURN count(DISTINCT m) AS total
    `;

    const [records, countResult] = await Promise.all([
      runQuery(dataQuery, { query: q, skip, limit }),
      runQuery(countQuery, { query: q })
    ]);

    res.json({
      page,
      limit,
      total: countResult[0].get('total').toNumber(),
      movies: records.map(mapNeo4jToMovie)
    });
  } catch (error) {
    console.error('Erreur GET /api/movies/search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/movies/trending
 */
router.get('/trending', async (req, res) => {
  try {
    const query = `
      MATCH (m:Movie)<-[:RATED]-(u:User)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      ORDER BY avgRating DESC
      LIMIT 10
    `;

    const records = await runQuery(query);

    res.json({
      page: null,
      limit: 10,
      total: records.length,
      movies: records.map(mapNeo4jToMovie)
    });
  } catch (error) {
    console.error('Erreur GET /api/movies/trending:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/movies/genre/:genreId?page=&limit=
 */
router.get('/genre/:genreId', async (req, res) => {
  const { genreId } = req.params;
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const skip = (page - 1) * limit;

  try {
    const dataQuery = `
      MATCH (m:Movie)-[:IN_GENRE]->(g:Genre)
      WHERE toLower(g.name) = toLower($genre)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      SKIP toInteger($skip)
      LIMIT toInteger($limit)
    `;

    const countQuery = `
      MATCH (m:Movie)-[:IN_GENRE]->(g:Genre)
      WHERE toLower(g.name) = toLower($genre)
      RETURN count(m) AS total
    `;

    const [records, countResult] = await Promise.all([
      runQuery(dataQuery, { genre: genreId, skip, limit }),
      runQuery(countQuery, { genre: genreId })
    ]);

    res.json({
      page,
      limit,
      total: countResult[0].get('total').toNumber(),
      movies: records.map(mapNeo4jToMovie)
    });
  } catch (error) {
    console.error('Erreur GET /api/movies/genre/:genreId', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/movies/:id
 * (détail – pas de pagination)
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      MATCH (m:Movie {movieId: $movieId})
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      LIMIT 1
    `;

    const records = await runQuery(query, { movieId: id });

    if (records.length === 0) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json(mapNeo4jToMovie(records[0]));
  } catch (error) {
    console.error('Erreur GET /api/movies/:id:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
