## Technical Specification: Frontend for the Digital Marketplace

### Overview
A Next.js frontend for a digital marketplace powered by Strapi. The UI is fully responsive, mobile‑first, and styled with Tailwind for a clean modern look. It supports clear navigation, dynamic categories, asset discovery with pagination, asset detail with carousel, asset point costs, and gated downloads. Admin dashboard links are shown to authorized users only; profile pages expose account and quota details.

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
  - Get Points
  - Dashboard (admins only; hidden otherwise)
  - Profile (authenticated users); Sign in/Sign up (guests)
- Footer: links to About, Blog, Docs, Terms, Privacy, Contact

### Routes
- `/` Home: recent assets (20–30 items per page; default 24), pagination
- `/categories` Categories overview (optional): grid of all categories
- `/category/[slug]` Category listing: filtered assets, pagination
- `/asset/[slug]` Asset detail: carousel, description, tags, category hierarchy, download CTA (point‑gated)
- `/points` Point packages and benefits; purchase/earn CTA
- `/dashboard` Admin/ops shortcuts or metrics (role‑gated; can deep‑link to Strapi admin)
- `/profile` User account: points balance, monthly usage, download history, billing portal link
- Auth routes as applicable: `/signin`, `/signup`, `/forgot-password`
- Error/utility: `/404`, `/500`; route‑level `loading` skeletons

### Pages & Core UX Requirements
- Home
  - Shows most recent assets sorted by `created_at desc`
  - Page size: 24 (configurable 20–30); numbered pagination with next/prev
  - Skeletons on initial load and pagination transitions
- Category menu
  - Dynamically fetches all categories from Strapi
  - Always includes a dedicated "Complete Projects" category link
- Category pages
  - Filter by category slug; paginated results
  - Optional secondary filters (points, etc.) behind feature flag
- Asset cards
  - Thumbnail, title, short description
  - Display point cost of the asset
  - Hover/focus states, accessible semantics
- Asset detail & download
  - Image carousel (keyboard accessible), full description, tags, category hierarchy breadcrumbs
  - Download button enabled only if user's points balance >= asset point cost; otherwise disabled with tooltip explaining the cost and their current balance.
  - If eligible, clicking Download debits the user's points, requests a signed URL (short‑lived), and triggers file download.

### Point-Based Gating
- Each user has a `pointsBalance` and a `monthlyPointAllowance`.
- Each asset has a `pointCost`.
- Gate logic: enable CTA if `user.pointsBalance >= asset.pointCost`; else disabled with tooltip and link to `/points`.
- On download, `user.pointsBalance` is debited. Points are replenished monthly up to the `monthlyPointAllowance`.

### Caching & Performance
- Use RSC for listing pages with `revalidate` (ISR) 60–300s; stale‑while‑revalidate
- Client transitions use TanStack Query with request dedupe and cache keys per route params
- Image optimization with responsive sizes and modern formats (AVIF/WebP)
- Targets: LCP < 2.5s, CLS < 0.1, TBT < 200ms on mid‑tier mobile; p95 asset list API < 300ms

### Accessibility
- Keyboard focus management for menus, dropdowns, carousel
- ARIA for tooltips, badges, pagination, breadcrumbs
- High‑contrast themes; text sizes >= 14px; color contrast meets WCAG AA

### SEO
- Semantic HTML with landmarks; per‑page meta via Next.js metadata API
- Open Graph/Twitter cards, canonical tags
- Breadcrumb structured data on asset detail; Asset schema if appropriate

### Error Handling & Skeletons
- Route‑level `loading` components show skeleton cards/lists
- Friendly error boundaries with retry actions
- Tooltips for quotas and gating: clarify required points and remaining balance

### UI Components (selected)
- Layout: `Navbar`, `Footer`, `MobileNavDrawer`
- Navigation: `CategoryDropdown`, `Breadcrumbs`
- Discovery: `AssetCard`, `PointCost`, `Pagination`, `Filters` (optional)
- Detail: `ImageCarousel`, `DownloadCTA`, `TagList`
- Feedback: `SkeletonCard`, `SkeletonGrid`, `Tooltip`, `Toast`
- Account: `PointsBalance`, `QuotaMeter`, `DownloadsTable`

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
- Categories dropdown wired to Strapi; ensure "Complete Projects" link present
- Asset listing (Home, Category) with SSR/ISR and pagination
- Skeletons for lists, error boundaries, basic analytics

### Phase 3: Asset Detail & Gated Download
- Asset detail page with carousel, breadcrumbs, tags, description
- Point costs on cards and detail; tooltip for gating
- Server action for download: entitlement check (points balance) + signed URL retrieval + download flow

### Phase 4: Account & Points
- Profile page with points balance, quota meter, downloads history, billing portal link
- Points page with packages and purchase CTA

### Phase 5: Polish & QA
- Accessibility pass, SEO metadata, performance tuning, loading states
- E2E tests and bug fixes; content QA; i18n groundwork

---

## Deliverables
- Source code (Next.js + Tailwind) with modular components and clear folder structure
- Page implementations: Home, Categories, Category, Asset Detail, Points, Dashboard gate, Profile, Auth
- Reusable components: Navbar, CategoryDropdown, AssetCard, PointCost, Pagination, Skeletons, Tooltip, Carousel, DownloadCTA, QuotaMeter
- Data adapters for Strapi (editorial)
- Download server action and backend integration for signed URLs
- Testing suite (unit + E2E), Storybook with documented components
- CI configuration for lint/test/build; performance and a11y reports
