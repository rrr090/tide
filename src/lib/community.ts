import { supabase } from './supabase';
import { FormError } from './auth';
import type { Team } from './teams';

export interface Author {
  id: string;
  display_name: string;
}

export interface ThreadSummary {
  id: string;
  category: string;
  title: string;
  comment_count: number;
  last_activity_at: string;
  created_at: string;
  author: Author | null;
}

export interface Thread extends ThreadSummary {
  body: string;
  author_id: string | null;
}

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author: Author | null;
}

export interface TeamMembership {
  user_id: string;
  role: string;
  status: 'pending' | 'active';
  message: string;
  member: Author | null;
}

export interface TeamDetail extends Omit<Team, 'members'> {
  owner_id: string | null;
  members: { name: string; role: string }[];
  team_members: TeamMembership[];
}

export interface TeamInput {
  title: string;
  summary: string;
  description: string;
  status: string;
  tags: string[];
  repo_url: string | null;
  demo_url: string | null;
}

export const CATEGORIES: Record<string, string> = {
  general: 'General',
  help: 'Help',
  'find-a-team': 'Find a team',
  'show-and-tell': 'Show and tell',
};

export const authorName = (author: Author | null): string => author?.display_name ?? 'Deleted member';

const AUTHOR = 'author:member_profiles(id,display_name)';

const db = () => {
  if (!supabase) throw new FormError('The community is not available on this demo site.');
  return supabase;
};

export async function listThreads(): Promise<ThreadSummary[]> {
  const { data, error } = await db()
    .from('threads')
    .select(`id,category,title,comment_count,last_activity_at,created_at,${AUTHOR}`)
    .order('last_activity_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as ThreadSummary[];
}

export async function getThread(id: string): Promise<Thread | null> {
  const { data, error } = await db().from('threads').select(`*,${AUTHOR}`).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Thread | null) ?? null;
}

export async function createThread(authorId: string, category: string, title: string, body: string): Promise<string> {
  const { data, error } = await db()
    .from('threads')
    .insert({ author_id: authorId, category, title, body })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await db().from('threads').delete().eq('id', id);
  if (error) throw error;
}

export async function listComments(threadId: string): Promise<Comment[]> {
  const { data, error } = await db()
    .from('comments')
    .select(`id,body,created_at,author_id,${AUTHOR}`)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(threadId: string, authorId: string, body: string): Promise<void> {
  const { error } = await db().from('comments').insert({ thread_id: threadId, author_id: authorId, body });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await db().from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function getTeam(id: string): Promise<TeamDetail | null> {
  const { data, error } = await db()
    .from('teams')
    .select('*,team_members(user_id,role,status,message,member:member_profiles(id,display_name))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const team = data as unknown as TeamDetail;
  return {
    ...team,
    tags: Array.isArray(team.tags) ? team.tags : [],
    members: Array.isArray(team.members) ? team.members : [],
    team_members: team.team_members ?? [],
  };
}

export async function createTeam(ownerId: string, input: TeamInput): Promise<string> {
  const { data, error } = await db()
    .from('teams')
    .insert({ ...input, owner_id: ownerId })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateTeam(id: string, input: TeamInput): Promise<void> {
  const { error } = await db().from('teams').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await db().from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function requestToJoin(teamId: string, userId: string, message: string): Promise<void> {
  const { error } = await db().from('team_members').insert({ team_id: teamId, user_id: userId, message });
  if (error) throw error;
}

export async function approveMember(teamId: string, userId: string): Promise<void> {
  const { error } = await db().from('team_members').update({ status: 'active' }).eq('team_id', teamId).eq('user_id', userId);
  if (error) throw error;
}

/** Declines a request, removes a member, or lets someone leave. */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await db().from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
  if (error) throw error;
}
