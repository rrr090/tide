import { supabase } from './supabase';

export interface TeamMember {
  name: string;
  role: string;
}

export interface Team {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: string; // building | shipped | recruiting
  tags: string[];
  members: TeamMember[];
  repo_url: string | null;
  demo_url: string | null;
  sort_order: number;
}

const DEMO_TEAMS: Team[] = [
  {
    id: 'demo-riptide',
    title: 'Riptide',
    summary: 'A study assistant that answers questions from your own lecture notes.',
    description:
      'We index slides and notebooks from past workshops and let you ask questions in plain language. Current focus: better retrieval and honest "I do not know" answers.',
    status: 'building',
    tags: ['llm', 'rag', 'python'],
    members: [
      { name: 'Aiko Tanaka', role: 'Team lead' },
      { name: 'Ben Carter', role: 'Backend' },
      { name: 'Mina Sato', role: 'ML' },
      { name: 'Leo Kim', role: 'Frontend' },
    ],
    repo_url: null,
    demo_url: null,
    sort_order: 1,
  },
  {
    id: 'demo-undertow',
    title: 'Undertow',
    summary: 'Computer vision that tells paper from plastic at the campus recycling point.',
    description:
      'A small camera, a fine-tuned image model and a lot of photographed trash. The demo runs on a laptop and was shown at the spring open night.',
    status: 'shipped',
    tags: ['computer vision', 'pytorch'],
    members: [
      { name: 'Haru Mori', role: 'Team lead' },
      { name: 'Sofia Rossi', role: 'Data' },
      { name: 'Jun Park', role: 'Model' },
    ],
    repo_url: null,
    demo_url: null,
    sort_order: 2,
  },
  {
    id: 'demo-lagoon',
    title: 'Lagoon',
    summary: 'Data pipelines and a live dashboard for club attendance and materials.',
    description:
      'We are building the boring but useful plumbing: scheduled jobs, clean tables and charts. Good first project if you want to learn how data gets to a model.',
    status: 'recruiting',
    tags: ['data', 'mlops', 'sql'],
    members: [
      { name: 'Yuki Abe', role: 'Team lead' },
      { name: 'Omar Haddad', role: 'Data engineer' },
    ],
    repo_url: null,
    demo_url: null,
    sort_order: 3,
  },
];

/** Not cached on purpose: the admin panel can change teams at any time. */
export async function listTeams(): Promise<Team[]> {
  if (!supabase) return DEMO_TEAMS;
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Team[]).map((t) => ({
    ...t,
    tags: Array.isArray(t.tags) ? t.tags : [],
    members: Array.isArray(t.members) ? t.members : [],
  }));
}