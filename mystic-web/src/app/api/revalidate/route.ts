import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');

  if (!process.env.REVALIDATION_SECRET || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      path?: string;
      slug?: string;
      locale?: string;
      translationGroup?: string;
    };
    const { path, slug, locale, translationGroup } = body;

    // translationGroup: invalidate all slugs that share this group across both locales
    if (translationGroup) {
      revalidatePath('/blog');
      revalidatePath('/en/blog');
      revalidatePath('/');
      revalidatePath('/en');
      return NextResponse.json({ revalidated: true, translationGroup });
    }

    if (slug) {
      revalidatePath(`/blog/${slug}`);
      revalidatePath(`/en/blog/${slug}`);
      revalidatePath('/blog');
      revalidatePath('/en/blog');
      revalidatePath('/');
      revalidatePath('/en');
      return NextResponse.json({ revalidated: true, slug, locale: locale ?? 'all' });
    }

    if (path) {
      revalidatePath(path);
      if (locale === 'tr' && !path.startsWith('/en')) {
        revalidatePath(`/en${path}`);
      } else if (locale === 'en' && path.startsWith('/en')) {
        revalidatePath(path.replace(/^\/en/, '') || '/');
      }
      return NextResponse.json({ revalidated: true, path });
    }

    revalidatePath('/blog');
    revalidatePath('/en/blog');
    revalidatePath('/');
    revalidatePath('/en');
    return NextResponse.json({ revalidated: true, all: true });
  } catch {
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
