import { h } from '../lib/dom';
import { fmtRelative } from '../lib/format';
import { FormError, authReady, currentUser, isStaffMember } from '../lib/auth';
import {
  CATEGORIES,
  addComment,
  authorName,
  deleteComment,
  deleteThread,
  getThread,
  listComments,
  type Comment,
  type Thread,
} from '../lib/community';
import { isDemo } from '../lib/supabase';
import type { RouteResult } from '../lib/router';
import { fill } from '../components/ui';
import { errorText, field, formError, needsBackend, onSubmit, signInLink } from '../components/forms';
import { notFoundPage } from './notfound';

const canDelete = (authorId: string | null): boolean => {
  const user = currentUser();
  return Boolean(user && (authorId === user.id || isStaffMember()));
};

export async function threadPage(params: Record<string, string>): Promise<RouteResult> {
  if (isDemo) return needsBackend('Community');
  await authReady();

  const host = h('div');
  const page: RouteResult = { title: 'Post', el: h('div', null, host) };

  const renderThread = (thread: Thread): HTMLElement => {
    const commentsHost = h('div');
    const problem = formError();

    const showComments = (): void =>
      fill(commentsHost, () => listComments(thread.id), (comments) => {
        return comments.length
          ? h('ul', { class: 'comment-list', role: 'list' }, comments.map(commentRow))
          : h('p', { class: 'muted' }, 'No replies yet.');
      });

    const commentRow = (comment: Comment): HTMLElement =>
      h(
        'li',
        { class: 'comment' },
        h('p', { class: 'meta' }, h('strong', null, authorName(comment.author)), h('span', null, fmtRelative(comment.created_at))),
        h('p', { class: 'post-text' }, comment.body),
        canDelete(comment.author_id)
          ? h(
              'button',
              {
                class: 'text-button',
                type: 'button',
                onclick: async () => {
                  if (!window.confirm('Delete this reply?')) return;
                  try {
                    await deleteComment(comment.id);
                    showComments();
                  } catch (failure) {
                    problem.textContent = errorText(failure);
                  }
                },
              },
              'Delete',
            )
          : null,
      );

    let replyArea: HTMLElement;
    const user = currentUser();
    if (user) {
      const body = h('textarea', { class: 'input', rows: 4, maxlength: 5000 });
      const error = formError();
      const submit = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Reply');
      const form = h('form', { class: 'form reply', novalidate: true }, field('Your reply', body), error, submit);
      onSubmit(form, submit, 'Sending', error, async () => {
        if (!body.value.trim()) throw new FormError('Write something first.');
        await addComment(thread.id, user.id, body.value.trim());
        body.value = '';
        showComments();
      });
      replyArea = form;
    } else {
      replyArea = h('p', { class: 'reply' }, signInLink('Sign in to reply', 'btn btn--ghost'));
    }

    showComments();
    page.title = thread.title;
    document.title = `${thread.title} | TIDE AI Club`;

    return h(
      'article',
      { class: 'section section--tight' },
      h(
        'div',
        { class: 'wrap wrap--narrow' },
        h('header', { class: 'article-head' }, h('a', { class: 'back-link', href: '#/community' }, 'All posts'), h('h1', null, thread.title)),
        h(
          'p',
          { class: 'meta' },
          h('span', null, CATEGORIES[thread.category] ?? thread.category),
          h('strong', null, authorName(thread.author)),
          h('span', null, fmtRelative(thread.created_at)),
        ),
        h('p', { class: 'post-text post-text--main' }, thread.body),
        canDelete(thread.author_id)
          ? h(
              'button',
              {
                class: 'text-button',
                type: 'button',
                onclick: async () => {
                  if (!window.confirm('Delete this post and all its replies?')) return;
                  try {
                    await deleteThread(thread.id);
                    window.location.hash = '#/community';
                  } catch (failure) {
                    problem.textContent = errorText(failure);
                  }
                },
              },
              'Delete post',
            )
          : null,
        problem,
        h('h2', { class: 'subhead' }, 'Replies'),
        commentsHost,
        replyArea,
      ),
    );
  };

  fill(
    host,
    () => getThread(params.id),
    (thread) => (thread ? renderThread(thread) : notFoundPage('That post does not exist or was deleted.').el),
  );
  return page;
}
