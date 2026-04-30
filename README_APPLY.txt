Apply these files:

1. Run this SQL in Supabase SQL Editor:
   supabase/sales_features_patch.sql

2. Replace project files:
   app/api/admin/product/route.ts
   app/store/[slug]/page.tsx
   app/store/[slug]/store-view.tsx

3. Push:
   git add .
   git commit -m "Fix admin upload and public store page"
   git push origin main

4. Test:
   /admin/[slug]
   /store/[slug]
