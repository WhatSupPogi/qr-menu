QR Menu public page cache + design fix

Replace these files:
1. app/store/[slug]/page.tsx
2. app/store/[slug]/StoreClient.tsx
3. app/api/admin/product/route.ts

What this fixes:
- Public page design looked broken because the previous patch used CSS class names that did not exist in the project.
- Public page now uses Tailwind classes directly, so it does not depend on missing custom CSS.
- Uploaded/edited/deleted products now call revalidatePath('/store/[slug]') so the public store page refreshes after admin changes.
- Image lazy loading is kept.
- Search stays client-side.
- Backend still blocks non-WebP original large images.

After replacing:
npm run build

If successful:
git add .
git commit -m "Fix public menu design and refresh cache after product changes"
git push origin main

Test:
1. Add an item with image in store admin.
2. Open the public store page.
3. Confirm the new item appears.
4. Confirm design is card-based and mobile-friendly.
