import type { MetadataRoute } from 'next';

const BASE = 'https://codecanvas3d.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/demo',
    '/que-es-sonora',
    '/spotify-wrapped-permanente',
    '/adn-musical',
    '/tools',
    '/tools/oyente',
    '/tools/jugador',
    '/tools/costo-por-hora',
    '/changelog',
    '/register',
    '/login',
    '/privacy',
    '/terms',
  ];
  return routes.map((r) => ({
    url: `${BASE}${r}`,
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : r.startsWith('/tools') || r === '/que-es-sonora' ? 0.8 : 0.6,
  }));
}
