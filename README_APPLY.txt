QR Menu 1000-store performance patch

Files:
1. supabase/performance_indexes.sql
2. app/store/[slug]/page.tsx
3. app/store/[slug]/StoreClient.tsx
4. app/api/admin/product/route.ts

What this does:
- Public store page uses Next.js server cache with 5-minute revalidation.
- Public products load with minimal DB calls.
- Product search remains client-side.
- Product images use lazy loading and async decoding.
- Backend rejects non-WebP images so original large files are not stored.
- Database indexes are added for 1000-store readiness.

Apply:
1. Run supabase/performance_indexes.sql in Supabase SQL Editor.
2. Replace the files.
3. Run npm run build.
4. Push to GitHub.

Commands:
npm run build
git add .
git commit -m "Improve public page caching and image cost controls"
git push origin main
