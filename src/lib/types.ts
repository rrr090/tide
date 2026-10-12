export interface Direction {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string | null;
  sort_order: number;
  published: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  registration_url: string | null;
  tags: string[];
  published: boolean;
}

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** Only loaded on the detail page to keep list queries light. */
  body_md?: string;
  held_on: string;
  speaker: string | null;
  tags: string[];
  pdf_url: string | null;
  notebook_url: string | null;
  video_url: string | null;
  published: boolean;
}
