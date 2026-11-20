# Bloom Connect

Single-manager office management dashboard. The site opens directly to the dashboard and has no login, registration, employee accounts, or employee portal.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Without Supabase credentials the employee dashboard uses local browser storage as a preview; it is not a shared or production data store.

## Supabase setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the project settings.
3. Keep the service-role key server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to client code.
4. Restart the dev server. The employee dashboard record will be initialized in Supabase on first load, and subsequent employee edits sync to the database. Other record types are supported by the server API for additional modules.

Uploads use the private `office-uploads` Storage bucket. The upload API accepts JPG, PNG, WebP, and PDF files up to 10 MB; generated signed links expire after one hour.

Bloom Food AI uses the server route `/api/food-ai`. Configure a provider key, endpoint, and model in `.env.local`; the key is never sent to the browser. The suggested OpenAI-compatible endpoint is only a default and can be changed to a compatible provider.

## No-login deployment security

There is deliberately no in-app authentication. Anyone who can reach the deployed site may see its data, so do not deploy it as a public website. Use private hosting, a VPN/network gateway, or equivalent deployment access control. In production the API routes also require `OFFICE_ALLOWED_IPS` to be configured. Set it to the office's public egress IP address(es), and configure the trusted reverse proxy to overwrite forwarded client-IP headers. The allowlist is a defense-in-depth check, not a replacement for private hosting.

Never commit `.env.local`, Supabase service-role credentials, or AI provider credentials. Keep backups and restrict access to the hosting and Supabase project.

## Current implementation notes

- Employee records: create, deactivate/reactivate, search, manually update weekly lunch participation; syncs through the server API to Supabase when configured.
- Lunch, food recommendations, fund, events, and reports have dashboard workflows and presentation data. Persisted CRUD for these modules should use the existing `office_records` API and approved record kinds.
- Employee edits use local browser storage only until Supabase is configured.
- The restaurant list and office metrics shown before real data is configured are sample data; verify restaurant availability, pricing, and ratings before making decisions.
- Supabase Storage uploads and Bloom Food AI become active only after their server environment values and schema are configured.

## Checks

```powershell
npm run lint
npm run build
```