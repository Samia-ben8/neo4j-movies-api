// utils/mappers.js

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (value.low !== undefined) return value.low;
  return value;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function mapNeo4jToMovie(record) {
  const m = record.get('m').properties;
  const dNode = record.get('d');
  const actorsNodes = record.get('actors');
  const avgRating = record.get('avgRating');

  return {
    id: m.movieId || slugify(m.title),
    title: m.title,
    originalTitle: m.title,

    poster: m.poster
      ? m.poster
      : `https://placehold.co/300x450/1a1a1a/white?text=${encodeURIComponent(m.title)}`,

    backdrop: `https://placehold.co/1920x1080/1a1a1a/white?text=${encodeURIComponent(m.title)}`,

    year: toNumber(m.released),
    duration: toNumber(m.runtime) || 120,

    rating: avgRating ? Number(avgRating.toFixed(1)) : 7.5,

    synopsis: m.plot || m.tagline || 'Synopsis non disponible',

    genres: [],

    director: dNode
      ? {
          id: dNode.identity.toString(),
          name: dNode.properties.name
        }
      : null,

    actors: actorsNodes.map(a => ({
      id: a.identity.toString(),
      name: a.properties.name,
      role: a.properties.role || ''
    })),

    trailerUrl: null,
    budget: toNumber(m.budget),
    revenue: toNumber(m.revenue),

    releaseDate: m.released ? `${toNumber(m.released)}-01-01` : '',
    language: (m.languages && m.languages[0]) || 'en',

    tagline: m.tagline || ''
  };
}
