import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = 'https://missydours.com';
const DEFAULT_OG_IMAGE = '/images/og/Missys-OG.PNG';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function SEO({
  title,
  description,
  canonicalPath,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  jsonLd,
}: SEOProps) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);

    document.head.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = SITE_URL + canonicalPath;
    document.head.appendChild(canonical);

    if (robots) {
      upsertMeta('name', 'robots', robots);
    } else {
      document.head.querySelectorAll('meta[name="robots"]').forEach(el => el.remove());
    }

    upsertMeta('property', 'og:title', ogTitle || title);
    upsertMeta('property', 'og:description', ogDescription || description);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:url', SITE_URL + canonicalPath);
    upsertMeta('property', 'og:image', ogImage || DEFAULT_OG_IMAGE);

    upsertMeta('name', 'twitter:title', ogTitle || title);
    upsertMeta('name', 'twitter:description', ogDescription || description);
    upsertMeta('name', 'twitter:image', ogImage || DEFAULT_OG_IMAGE);

    document.head.querySelectorAll('script[data-dynamic-jsonld]').forEach(el => el.remove());
    if (jsonLdString) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-dynamic-jsonld', 'true');
      script.textContent = jsonLdString;
      document.head.appendChild(script);
    }
  }, [title, description, canonicalPath, robots, ogTitle, ogDescription, ogImage, ogType, jsonLdString]);

  return null;
}
