import { CMS_API_BASE_URL, CMS_API_TOKEN } from './constants';
import type { BlogPost } from './blog';

interface CmsPostResponse {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: BlogPost['category'];
  publishedAt: string;
  updatedAt?: string;
  readingTime: number;
  locale?: string;
}

async function cmsFetch<T>(path: string): Promise<T | null> {
  if (!CMS_API_BASE_URL) return null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (CMS_API_TOKEN) {
      headers['Authorization'] = `Bearer ${CMS_API_TOKEN}`;
    }

    const res = await fetch(`${CMS_API_BASE_URL}${path}`, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function fetchPostsFromCms(locale?: string): Promise<BlogPost[] | null> {
  const query = locale ? `?locale=${locale}` : '';
  return cmsFetch<CmsPostResponse[]>(`/api/v1/content/blog/posts${query}`);
}

export async function fetchPostBySlugFromCms(slug: string, locale?: string): Promise<BlogPost | null> {
  const query = locale ? `?locale=${locale}` : '';
  return cmsFetch<CmsPostResponse>(`/api/v1/content/blog/posts/${slug}${query}`);
}
