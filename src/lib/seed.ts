import type { Direction, EventItem, Workshop } from './types';

// Demo content shown only when Supabase env vars are not configured.
// Dates are relative to today so the demo always looks current.
const DAY = 86_400_000;

const at = (offsetDays: number, hour: number, minute = 0): string => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const ymd = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

export const seedDirections: Direction[] = [
  {
    id: 'd1',
    slug: 'ml-foundations',
    title: 'Machine learning foundations',
    summary:
      'Linear models, TIDE descent and neural networks, implemented by hand before reaching for a framework.',
    level: 'Beginner friendly',
    sort_order: 1,
    published: true,
  },
  {
    id: 'd2',
    slug: 'language-models',
    title: 'Language models and agents',
    summary:
      'Tokenizers, fine-tuning, retrieval and tool use. We build small assistants and study where they fail.',
    level: 'Some Python required',
    sort_order: 2,
    published: true,
  },
  {
    id: 'd3',
    slug: 'computer-vision',
    title: 'Computer vision',
    summary:
      'From convolutions to vision transformers, with datasets small enough to train on a laptop.',
    level: 'Some Python required',
    sort_order: 3,
    published: true,
  },
  {
    id: 'd4',
    slug: 'research-reading',
    title: 'Research reading group',
    summary:
      'One paper per session, one volunteer to present it, and everyone arrives with a question.',
    level: 'Open to everyone',
    sort_order: 4,
    published: true,
  },
];

export const seedEvents: EventItem[] = [
  {
    id: 'e1',
    title: 'Open night: bring a project, find a team',
    summary:
      'Pitch an idea in sixty seconds, then split into groups. New members are very welcome.',
    starts_at: at(6, 18, 30),
    ends_at: at(6, 20, 30),
    location: 'Room 204, Engineering Building',
    registration_url: 'https://example.com/register',
    tags: ['community', 'beginner'],
    published: true,
  },
  {
    id: 'e2',
    title: 'Workshop: evaluating language models',
    summary:
      'Build a small test set, measure a model against it and learn why one benchmark is never enough.',
    starts_at: at(13, 18, 0),
    ends_at: at(13, 20, 0),
    location: 'Lab 3 and online',
    registration_url: 'https://example.com/register',
    tags: ['llm', 'workshop'],
    published: true,
  },
  {
    id: 'e3',
    title: 'Reading group: attention, revisited',
    summary: 'We read the original transformer paper together and trace each equation to code.',
    starts_at: at(27, 17, 0),
    ends_at: null,
    location: 'Library, study room B',
    registration_url: null,
    tags: ['research'],
    published: true,
  },
];

const bodyScratch = `## What we built

A two-layer neural network in plain NumPy, trained on a small image dataset, with every TIDE derived and checked by hand.

## Why do it without a framework

Frameworks hide the part that matters most when something breaks. Writing backpropagation once makes every later error message easier to read.

### The training loop

\`\`\`python
for step in range(steps):
    logits = forward(x, params)
    loss = cross_entropy(logits, y)
    grads = backward(loss, params)
    for name in params:
        params[name] -= lr * grads[name]
\`\`\`

## Take-home exercises

1. Add momentum and compare the loss curves.
2. Replace the activation function and describe what changes.
3. Break the learning rate on purpose and explain what you see.
`;

const bodyFinetune = `## What we covered

How a small language model is adapted to a narrow task with a few hundred examples, and how to tell whether it worked.

## Checklist before you train

- Write down the behavior you want in one sentence.
- Hold out examples the model never sees.
- Decide in advance what a good result looks like.

> A model that scores well on data it has already seen has told you nothing yet.

## Materials

Slides and the notebook are linked above. Bring your own dataset to the next session and we will look at it together.
`;

const bodyPapers = `## A repeatable way to read a paper

1. Read the abstract and the figures first.
2. Write the claim in one sentence.
3. Find the experiment that would prove the claim wrong.
4. Only then read the method.

## Questions worth asking every time

| Question | Why it matters |
| --- | --- |
| What is the baseline? | A result means little without a fair comparison. |
| What was left out? | Failures are often in the appendix. |
| Could I reproduce it? | If not, what is missing? |
`;

const bodyVision = `## Session notes

We trained a small vision transformer on a toy dataset and compared it with a plain convolutional network of the same size.

## What to take away

Patch size matters more than most tutorials suggest. We tried three values and plotted accuracy against training time.
`;

export const seedWorkshops: Workshop[] = [
  {
    id: 'w1',
    slug: 'neural-network-from-scratch',
    title: 'A neural network from scratch',
    summary: 'Backpropagation in plain NumPy, derived and tested by hand.',
    body_md: bodyScratch,
    held_on: ymd(-8),
    speaker: 'Maya Chen',
    tags: ['fundamentals', 'beginner'],
    pdf_url: 'https://arxiv.org/pdf/1706.03762',
    notebook_url: 'https://github.com/karpathy/nn-zero-to-hero',
    video_url: null,
    published: true,
  },
  {
    id: 'w2',
    slug: 'fine-tuning-small-language-models',
    title: 'Fine-tuning a small language model',
    summary: 'Adapt a model to a narrow task with a few hundred examples, and measure the result.',
    body_md: bodyFinetune,
    held_on: ymd(-22),
    speaker: 'Daniel Okafor',
    tags: ['llm', 'workshop'],
    pdf_url: 'https://arxiv.org/pdf/1706.03762',
    notebook_url: 'https://github.com/karpathy/nn-zero-to-hero',
    video_url: null,
    published: true,
  },
  {
    id: 'w3',
    slug: 'reading-a-research-paper',
    title: 'Reading a research paper in an hour',
    summary: 'A repeatable method for finding the claim, the evidence and the gaps.',
    body_md: bodyPapers,
    held_on: ymd(-36),
    speaker: 'Lena Fischer',
    tags: ['research', 'beginner'],
    pdf_url: null,
    notebook_url: null,
    video_url: null,
    published: true,
  },
  {
    id: 'w4',
    slug: 'vision-transformers-on-a-laptop',
    title: 'Vision transformers on a laptop',
    summary: 'Train a tiny vision transformer and compare it with a convolutional baseline.',
    body_md: bodyVision,
    held_on: ymd(-50),
    speaker: 'Maya Chen',
    tags: ['vision', 'workshop'],
    pdf_url: null,
    notebook_url: 'https://github.com/karpathy/nn-zero-to-hero',
    video_url: null,
    published: true,
  },
];
