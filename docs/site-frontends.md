## Technical Specification: Frontend for the Digital Marketplace

### Overview
A Next.js frontend for a digital marketplace powered by Medusa (commerce) and Strapi (CMS). The UI is fully responsive, mobile‑first, and styled with Tailwind for a clean modern look. It supports clear navigation, dynamic categories, product discovery with pagination, product detail with carousel, subscription tier badges, and gated downloads. Admin dashboard links are shown to authorized users only; profile pages expose account and quota details.

### Stack & Key Libraries
- Framework: Next.js (App Router, RSC), TypeScript
- Styling: Tailwind CSS, Tailwind Typography, Tailwind Forms, dark mode via media strategy
- Components: Radix UI primitives + Headless UI as needed
- State/Data: Next.js Server Actions/Fetch with caching for lists; TanStack Query for client interactivity
- Images: Next.js Image component with responsive sizes; blur placeholders
- Icons: Heroicons/Lucide
- Charts (optional for dashboards): Tremor/Chart.js
- Analytics: Plausible or GA4
- A11y: ESLint a11y rules, aria‑labels, focus rings, keyboard navigation

### Navigation & IA
- Global top nav (mobile collapsible):
  - Home
  - Categories (dropdown; dynamic)
  - Complete Projects (quick link)
  - Pricing
  - Dashboard (admins only; hidden otherwise)
  - Profile (authenticated users); Sign in/Sign up (guests)
- Footer: links to About, Blog, Docs, Terms, Privacy, Contact

### Routes
- `/` Home: recent products (20–30 items per page; default 24), pagination
- `/categories` Categories overview (optional): grid of all categories
- `/category/[slug]` Category listing: filtered products, pagination
- `/product/[slug]` Product detail: carousel, description, tags, category hierarchy, download CTA (tier‑gated)
- `/pricing` Pricing tiers and benefits; upgrade CTA
- `/dashboard` Admin/ops shortcuts or metrics (role‑gated; can deep‑link to Medusa/Strapi admin)
- `/profile` User account: subscription tier, quota usage, download history, billing portal link
- Auth routes as applicable: `/signin`, `/signup`, `/forgot-password`
- Error/utility: `/404`, `/500`; route‑level `loading` skeletons

### Pages & Core UX Requirements
- Home
  - Shows most recent products sorted by `created_at desc`
  - Page size: 24 (configurable 20–30); numbered pagination with next/prev
  - Skeletons on initial load and pagination transitions
- Category menu
  - Dynamically fetches all categories from Medusa (or Strapi if taxonomy lives there)
  - Always includes a dedicated "Complete Projects" category link
- Category pages
  - Filter by category slug; paginated results
  - Optional secondary filters (price, tier) behind feature flag
- Product cards
  - Thumbnail, title, short description
  - Badge for subscription tier: silver, gold, platinum, premium
  - Hover/focus states, accessible semantics
- Product detail & download
  - Image carousel (keyboard accessible), full description, tags, category hierarchy breadcrumbs
  - Download button enabled only if user's subscription tier >= product tier; otherwise disabled with tooltip explaining required tier
  - If eligible, clicking Download requests a signed URL (short‑lived) and triggers file download

### Subscription Tier Gating
- Tiers ordered: silver < gold < platinum < premium
- User tier resolved from profile (Medusa customer metadata or Strapi user profile)
- Product tier provided in product metadata (Medusa product/variant tag or attribute)
- Gate logic: enable CTA if `userTierRank >= productTierRank`; else disabled with tooltip and link to `/pricing`

### Data Sources & API Contracts
- Products & Categories: Medusa Store API
  - List products: `GET /store/products?limit={n}&offset={o}&order=created_at:desc&category_id={id|slug}`
  - Product detail: `GET /store/products/{id|handle}` (include images, tags, categories)
  - Categories: `GET /store/product-categories` (ensure a "complete-projects" category exists)
- Entitlements & Downloads
  - Entitlement check: performed server‑side in the download action using user tier + product tier
  - Generate signed URL: backend endpoint (Medusa custom route or edge function) `POST /store/downloads` with `{ product_id }` returns `{ url, expires_at }`
- Content & SEO copy: Strapi GraphQL/REST for editorial blocks (optional on Home/Pricing)
- Auth: Keycloak/Auth.js session; route middleware protects `/dashboard` and `/profile`

### Caching & Performance
- Use RSC for listing pages with `revalidate` (ISR) 60–300s; stale‑while‑revalidate
- Client transitions use TanStack Query with request dedupe and cache keys per route params
- Image optimization with responsive sizes and modern formats (AVIF/WebP)
- Targets: LCP < 2.5s, CLS < 0.1, TBT < 200ms on mid‑tier mobile; p95 product list API < 300ms

### Accessibility
- Keyboard focus management for menus, dropdowns, carousel
- ARIA for tooltips, badges, pagination, breadcrumbs
- High‑contrast themes; text sizes >= 14px; color contrast meets WCAG AA

### SEO
- Semantic HTML with landmarks; per‑page meta via Next.js metadata API
- Open Graph/Twitter cards, canonical tags
- Breadcrumb structured data on product detail; Product schema if appropriate

### Error Handling & Skeletons
- Route‑level `loading` components show skeleton cards/lists
- Friendly error boundaries with retry actions
- Tooltips for quotas and gating: clarify required tier and remaining quota

### UI Components (selected)
- Layout: `Navbar`, `Footer`, `MobileNavDrawer`
- Navigation: `CategoryDropdown`, `Breadcrumbs`
- Discovery: `ProductCard`, `TierBadge`, `Pagination`, `Filters` (optional)
- Detail: `ImageCarousel`, `DownloadCTA`, `TagList`
- Feedback: `SkeletonCard`, `SkeletonGrid`, `Tooltip`, `Toast`
- Account: `TierBadgeLarge`, `QuotaMeter`, `DownloadsTable`

### Styling & Theming
- Tailwind config with design tokens (colors, spacing, radii, shadows, typography)
- Dark mode (class strategy) with persisted preference
- Component‑level variants using Tailwind + class‑variance‑authority (optional)

### Security & Privacy
- Hide admin links unless user has role `admin`
- All downloads must resolve server‑side to enforce entitlements; never expose permanent file URLs
- CSRF protection on any POST actions; HTTP‑only cookies for sessions

### Telemetry
- Page views, search/filter interactions, downloads (non‑PII), errors
- SLO dashboards for API latency and frontend Core Web Vitals

### Testing
- Unit: React Testing Library + Jest/Vitest
- E2E: Playwright for critical flows (list → detail → gated download; sign‑in; pagination)
- Accessibility: axe tests in CI; Storybook a11y add‑on

---

## Execution Plan

### Phase 1: Scaffolding
- Initialize Next.js (App Router) with TypeScript, Tailwind, ESLint/Prettier
- Base layout, Navbar/Footer, dark mode, design tokens
- Integrate Auth provider and session context; role gates for Dashboard

### Phase 2: Data & Navigation
- Categories dropdown wired to Medusa/Strapi; ensure "Complete Projects" link present
- Product listing (Home, Category) with SSR/ISR and pagination
- Skeletons for lists, error boundaries, basic analytics

### Phase 3: Product Detail & Gated Download
- Product detail page with carousel, breadcrumbs, tags, description
- Tier badges on cards and detail; tooltip for gating
- Server action for download: entitlement check + signed URL retrieval + download flow

### Phase 4: Account & Pricing
- Profile page with tier, quota meter, downloads history, billing portal link
- Pricing page with plans and upgrade CTA

### Phase 5: Polish & QA
- Accessibility pass, SEO metadata, performance tuning, loading states
- E2E tests and bug fixes; content QA; i18n groundwork

---

## Deliverables
- Source code (Next.js + Tailwind) with modular components and clear folder structure
- Page implementations: Home, Categories, Category, Product Detail, Pricing, Dashboard gate, Profile, Auth
- Reusable components: Navbar, CategoryDropdown, ProductCard, TierBadge, Pagination, Skeletons, Tooltip, Carousel, DownloadCTA, QuotaMeter
- Data adapters for Medusa (products/categories) and Strapi (editorial)
- Download server action and backend integration for signed URLs
- Testing suite (unit + E2E), Storybook with documented components
- CI configuration for lint/test/build; performance and a11y reports
