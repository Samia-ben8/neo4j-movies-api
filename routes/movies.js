import express from 'express';
import { runQuery } from '../services/neo4j.js';
import { mapNeo4jToMovie } from '../utils/mappers.js';

const router = express.Router();

/**
 * 1️⃣ GET /api/movies
 * Liste des films
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      MATCH (m:Movie)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      LIMIT 50
    `;

    const records = await runQuery(query);
    const movies = records.map(mapNeo4jToMovie);

    res.json(movies);
  } catch (error) {
    console.error('Erreur GET /api/movies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 2️⃣ GET /api/movies/search?q=
 * Recherche par titre / acteur / réalisateur
 * ⚠️ DOIT ÊTRE AVANT /:id
 */
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.json([]);
  }

  try {
    const query = `
      MATCH (m:Movie)
      OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
      OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
      WHERE
        toLower(m.title) CONTAINS toLower($query)
        OR toLower(d.name) CONTAINS toLower($query)
        OR toLower(a.name) CONTAINS toLower($query)
      OPTIONAL MATCH (u:User)-[:RATED]->(m)
      RETURN
        m,
        d,
        collect(DISTINCT a) AS actors,
        avg(u.rating) AS avgRating
      LIMIT 50
    `;

    const records = await runQuery(query, { query: q });
    const movies = records.map(mapNeo4jToMovie);

    res.json(movies);
  } catch (error) {
    console.error('Erreur GET /api/movies/search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
/**
 * GET /api/movies/trending
 * Films les mieux notés
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
    const movies = records.map(mapNeo4jToMovie);

    res.json(movies);
  } catch (error) {
    console.error('Erreur GET /api/movies/trending:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
/**
 * GET /api/movies/genre/:genreId
 * Films par genre
 */
router.get('/genre/:genreId', async (req, res) => {
  const { genreId } = req.params;

  try {
    const query = `
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
      LIMIT 50
    `;

    const records = await runQuery(query, { genre: genreId });
    const movies = records.map(mapNeo4jToMovie);

    res.json(movies);
  } catch (error) {
    console.error('Erreur GET /api/movies/genre/:genreId', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 3️⃣ GET /api/movies/:id
 * Détail d’un film
 * ⚠️ TOUJOURS EN DERNIER
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

    const movie = mapNeo4jToMovie(records[0]);
    res.json(movie);
  } catch (error) {
    console.error('Erreur GET /api/movies/:id:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
