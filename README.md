# SeedPicker — Setup Guide

A full-stack NCAA seed picking competition app built with Next.js + Supabase.

---

## What's Included

- Email/password authentication (Supabase Auth)
- Pick submission — 1 team per seed, up to 2 entries per person
- Picks are **private** until the admin locks the tournament
- Live scoreboard with scoring (100 pts/win for 1-seeds, +10 pts per seed up to 250 for 16-seeds)
- Admin panel — lock picks, record wins, edit team names
- Mobile responsive

---

## Step 1 — Create a Supabase Project (free)

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project** — give it a name like `bracketbuster`
3. Choose a region close to you, set a database password, click **Create project**
4. Wait ~2 minutes for it to spin up

---

## Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** → **New query**
2. Open `supabase-schema.sql` from this project
3. Paste the entire contents into the editor
4. Click **Run** — this creates all tables, policies, and seeds the 64 teams

---

## Step 3 — Get Your API Keys

In Supabase, go to **Settings → API**:

- Copy **Project URL** — looks like `https://abcdefgh.supabase.co`
- Copy **anon / public** key — the long `eyJ...` string

You'll also need the **service_role** key (same page, keep this secret):
- This is used server-side only in API routes

---

## Step 4 — Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill it in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_ADMIN_EMAIL=you@youremail.com
```

> **Important:** Set `NEXT_PUBLIC_ADMIN_EMAIL` to the email you'll use to log in as the admin. Whoever logs in with that email gets access to the Admin panel.

---

## Step 5 — Enable Email Auth in Supabase

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled
3. Optionally turn off **Confirm email** under **Authentication → Settings → Email** if you want users to skip email verification (easier for a small group)

---

## Step 6 — Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 7 — Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. In the **Environment Variables** section, add all four variables from your `.env.local`
4. Click **Deploy** — your app will be live at a `*.vercel.app` URL in ~2 minutes

Share that URL with your competitors!

---

## How to Run the Competition

### Before the tournament:
1. Sign up with your admin email at your deployed URL
2. Go to **Admin** → verify the team names look correct (pre-loaded with 2025 bracket)
3. Share the URL with your group — they sign up and submit picks
4. Set the **tournament start time** in the Admin panel

### When the tournament starts:
1. Go to **Admin → Lock & Start Tournament** — this immediately locks all picks and reveals everyone's team selections on the scoreboard

### As games are played:
1. After each game, go to **Admin → Record Wins**
2. Click **+Win** for every team that advances
3. The scoreboard updates automatically — each win adds `(seed × 10 + 90)` points to everyone who picked that team

---

## Scoring Reference

| Seed | Points per Win |
|------|---------------|
| 1    | 100 pts       |
| 2    | 110 pts       |
| 3    | 120 pts       |
| ...  | ...           |
| 16   | 250 pts       |

---

## Customizing the Bracket

The 2025 bracket is pre-loaded in `supabase-schema.sql`. To update teams:
- Either edit the SQL before running it, or
- Use the **Admin → Edit Team Names** panel after setup

---

## Tech Stack

- **Framework:** Next.js 14 (Pages Router)
- **Database + Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Hosting:** Vercel (free tier)
- **Styling:** CSS Modules
- **Fonts:** DM Serif Display + DM Sans (Google Fonts)
