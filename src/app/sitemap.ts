import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: 'https://trimplayground.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: 'https://trimplayground.com/playground', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: 'https://trimplayground.com/calculator', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: 'https://trimplayground.com/pro', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ];
}
