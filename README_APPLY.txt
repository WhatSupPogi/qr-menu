QR Menu monetization + onboarding + payment update

This package includes:
- supabase/monetization_update.sql
- app/api/admin/payment/route.ts
- app/api/master/payment/route.ts

Run SQL first, then add route files.

Important: You still need to add UI buttons/forms to:
- app/admin/[slug]/page.tsx
- app/master/page.tsx
- app/api/admin/product/route.ts
- app/api/master/store/route.ts

This package safely adds the database and payment API foundation without rebuilding your app.
