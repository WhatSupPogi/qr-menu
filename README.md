# QR Menu SaaS Business Refactor

## Setup

1. Copy `.env.example` to `.env.local`
2. Add your real Supabase values
3. Run `supabase/schema.sql` in the Supabase SQL Editor
4. Install packages

```bash
npm install
```

5. Start the app

```bash
npm run dev
```

## Main routes

- Home: `/`
- Master admin login: `/master/login`
- Master admin dashboard: `/master`
- Public store page: `/store/[slug]`
- Store admin page: `/admin/[slug]`

## Notes

- All UI text is English.
- Public store search uses client-side filtering only.
- Product images are uploaded only after the product row is created.
- Old images are removed when an image is replaced.
- Product images are removed when a product is deleted.
- Product storage uses per-store folders with unique file names.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Public store pages use cache tags and revalidation.
