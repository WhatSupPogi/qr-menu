FINAL SAVE FIX

1. Run this SQL in Supabase SQL Editor:
   supabase/product_sales_columns_fix.sql

2. Replace:
   app/api/admin/product/route.ts
   app/store/[slug]/page.tsx

3. Push:
   git add .
   git commit -m "Fix product save upload and public menu"
   git push origin main

4. Test:
   /admin/[slug] add item
   /store/[slug] view item
