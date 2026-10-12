import { supabase } from './supabase';
import { seedDirections, seedEvents, seedWorkshops } from './seed';
import type { Direction, EventItem, Workshop } from './types';

// Public reads. Everything is filtered to published rows here and again by RLS.
// The workshop list leaves out body_md so the archive stays light as it grows.
const WORKSHOP_LIST_COLUMNS =
  'id,slug,title,summary,held_on,speaker,tags,pdf_url,notebook_url,video_url,published';

let cache: Record<string, Promise<unknown>> = {};

export function invalidate(): void {
  cache = {};
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache[key]) {
    cache[key] = load().catch((error) => {
      delete cache[key];
      throw error;
    });
  }
  return cache[key] as Promise<T>;
}

async function selectPublished<T>(
  table: string,
  orderBy: string,
  ascending: boolean,
  columns = '*',
): Promise<T[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq('published', true)
    .order(orderBy, { ascending });
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

export const listDirections = (): Promise<Direction[]> =>
  cached('directions', async () =>
    supabase
      ? selectPublished<Direction>('directions', 'sort_order', true)
      : seedDirections.filter((d) => d.published),
  );

export const listEvents = (): Promise<EventItem[]> =>
  cached('events', async () =>
    supabase
      ? selectPublished<EventItem>('events', 'starts_at', true)
      : seedEvents.filter((e) => e.published),
  );

export const listWorkshops = (): Promise<Workshop[]> =>
  cached('workshops', async () =>
    supabase
      ? selectPublished<Workshop>('workshops', 'held_on', false, WORKSHOP_LIST_COLUMNS)
      : seedWorkshops.filter((w) => w.published),
  );

export async function getWorkshop(slug: string): Promise<Workshop | null> {
  if (!supabase) return seedWorkshops.find((w) => w.slug === slug && w.published) ?? null;
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) throw error;
  return (data as Workshop | null) ?? null;
}

/** Events that have not finished yet (a 3 hour grace period after the start). */
export const isUpcoming = (e: EventItem, now = Date.now()): boolean =>
  new Date(e.ends_at ?? e.starts_at).getTime() + (e.ends_at ? 0 : 3 * 3_600_000) >= now;
