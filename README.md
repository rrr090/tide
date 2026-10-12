# TIDE AI Club

A static site for a student AI club. Vite, TypeScript and Supabase, with no UI framework.

- Public pages: home, events, workshop archive with filters, workshop articles written in Markdown.
- Organizer panel at `#/admin`: sign in, then create, edit, publish or delete events, workshops and directions.
- Hero: a live TIDE descent demo. Click anywhere to drop a point and watch it roll downhill.
- Runs without a backend on built-in demo content, so you can preview it before connecting Supabase.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed address. Without Supabase credentials the site shows demo content.

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`. Optionally run `supabase/seed.sql` for starter content.
3. Project settings > API: copy the project URL and the anon key.
4. Copy `.env.example` to `.env.local` and paste both values.
5. Authentication > Users > Add user, with an email and password for yourself.
6. Make that account an administrator by running this in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

7. Authentication > Sign In / Providers: turn off "Allow new users to sign up". Organizers are added by hand.
8. Restart `npm run dev`, open `#/admin` and sign in.

### How access works

- Visitors can read only rows where `published = true`.
- Accounts with the `editor` or `admin` role can read drafts and write to every content table.
- Roles live in `public.profiles` and cannot be changed through the API. Only SQL run by you can promote someone.
- Link fields are checked twice: the database accepts only `http(s)://` addresses, and the site refuses to render anything else.
- Markdown is sanitized with DOMPurify before it is shown.

## Deploy

The build uses relative paths and hash routing, so it works on any static host without rewrite rules.

**GitHub Pages**

1. Push to a repository with a `main` branch.
2. Settings > Pages > Source: GitHub Actions.
3. Settings > Secrets and variables > Actions: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Push. The workflow in `.github/workflows/deploy.yml` builds and publishes the site.

**Cloudflare Pages**

1. Create a project from your repository.
2. Build command: `npm run build`. Output directory: `dist`.
3. Add the two environment variables under Settings > Variables.

**Later, on your own server**

Run `npm run build` and serve the `dist` folder with any web server. Nothing else changes, because the data stays in Supabase.

## Customize

| What | Where |
| --- | --- |
| Club name, footer links | `src/config.ts` |
| Hero copy, home page sections | `src/pages/home.ts` |
| Colors and type | CSS variables at the top of `src/styles/main.css` |
| Landscape and starting points of the hero demo | `WELLS` in `src/components/descent.ts` |
| Demo content | `src/lib/seed.ts` |

### Add filters and categories

Workshop filters are built from the `tags` of published workshops, so a new tag in the admin panel becomes a new filter chip automatically. To add a new kind of content, add a table in `supabase/schema.sql` (the policy loop at the bottom covers it), then add one entry to `ENTITIES` in `src/pages/admin.ts` and a query in `src/lib/data.ts`.

### Scaling notes

- Workshop lists load without article bodies. A body is fetched only when a workshop is opened.
- Tag columns have GIN indexes, ready for server-side filtering when the archive grows beyond a few hundred entries.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist` |
| `npm run preview` | Serve the production build locally |
