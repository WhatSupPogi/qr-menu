QR Menu public page inline style fix

Replace:
app/store/[slug]/StoreClient.tsx

Why:
The previous public page used Tailwind class names, but the live page is not applying those styles correctly.
This version uses inline React styles, so it will display correctly even if Tailwind/global CSS is not working.

After replacing:
npm run build

Then:
git add .
git commit -m "Fix public menu page with inline styles"
git push origin main

Test:
1. Add an item with image in store admin.
2. Open the public store page.
3. Confirm the new item appears.
4. Confirm design is card-based and mobile-friendly.
