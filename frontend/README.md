# Frontend Template: Shopify to Strapi Conversion Guide

## Overview

This document outlines the complete conversion process for migrating the ecommerce frontend template from Shopify integration to Strapi CMS. The template is currently built around Shopify's GraphQL API and cart system but needs to be adapted to work with a Strapi backend.

## Current State Analysis

### Template Architecture
- **Framework**: Next.js 14.2.16 with App Router
- **UI Components**: Comprehensive component library with 50+ reusable components
- **State Management**: React Context for cart management
- **Data Fetching**: Custom hooks with Shopify GraphQL API
- **Loading States**: Sophisticated async handling with skeleton UI and granular loading indicators
- **Demo Mode**: Hardcoded placeholder products when Shopify is not configured

### Shopify Dependencies
The template currently relies on Shopify for:
- Product catalog and inventory
- Shopping cart functionality
- Checkout process
- Price management and discounts
- Product variants and availability

## Conversion Scope

### Phase 1: Data Layer Replacement (2-3 days)

#### 1.1 API Client Development
- **Replace**: `lib/shopify.ts` → `lib/strapi.ts`
- **Action**: Create new Strapi API client using REST/GraphQL
- **Changes**: 
  - Remove Shopify GraphQL queries
  - Implement Strapi API endpoints
  - Handle authentication with Strapi JWT/API keys
  - Transform Strapi responses to match existing interfaces

#### 1.2 Type System Updates
- **Replace**: Shopify interfaces → Strapi interfaces
- **Key Changes**:
  - `ShopifyProduct` → `StrapiProduct`
  - `ShopifyCollection` → `StrapiCategory`
  - `ShopifyCart` → Custom cart implementation
- **Data Mapping**:
  - `handle` → `slug`
  - `variants.edges[0].node` → Direct product fields
  - `images.edges` → `images` array
  - `priceRange.minVariantPrice.amount` → `price`

#### 1.3 Environment Configuration
- **Replace**: `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` → `NEXT_PUBLIC_STRAPI_URL`
- **Add**: `STRAPI_API_TOKEN` for authenticated requests
- **Update**: Configuration detection logic in components

### Phase 2: Cart System Overhaul (3-4 days)

#### 2.1 Cart Architecture Decision
**Options**:
- **Local Storage Cart**: Simple, guest-friendly, no authentication required
- **Database Cart**: Persistent, requires user accounts
- **Session Cart**: Server-side sessions, moderate persistence
- **Hybrid**: Local for guests, database for authenticated users

**Recommendation**: Local Storage Cart (simplest migration path)

#### 2.2 Cart Context Refactoring
- **File**: `contexts/cart-context.tsx`
- **Changes**:
  - Remove Shopify cart ID management
  - Implement local storage persistence
  - Replace Shopify cart operations with local state management
  - Remove checkout URL dependency (requires separate payment integration)

#### 2.3 Cart Operations
- **Add Item**: Store product data locally
- **Update Quantity**: Modify local cart state
- **Remove Item**: Filter from local storage
- **Clear Cart**: Reset local state
- **Persistence**: Sync with localStorage on every change

#### 2.4 Cart Naming Cleanup (Recommended)
To avoid confusion and ensure long-term maintainability, rename remaining Shopify-specific identifiers in the cart layer:

- Goals
  - Remove Shopify-specific names from cart logic
  - Keep temporary backward compatibility to avoid breaking UI
  - Use concise, neutral names suitable for local/Strapi-backed carts

- Renaming Map
  - **State**: `shopifyCartId` → `cartId`
  - **API**: `clearShopifyCart()` → `clearCart()`
  - **Text**: Replace "Shopify cart" in comments/logs with "cart" or "local cart"
  - **Storage** (optional): `local_cart_v1` → `cart_v1` (read old key, write new key during a short transition)

- Files to Update
  - `apps/frontend/contexts/cart-context.tsx`
    - Rename `shopifyCartId` → `cartId`
    - Add `clearCart()` and keep `clearShopifyCart()` as a deprecated alias temporarily
    - Neutralize comments/error messages
    - Optionally support storage key migration (read old, write new)
  - Components using the cart API (search usages)
    - `apps/frontend/components/cart-drawer.tsx`
    - Others found via grep (rename `clearShopifyCart` → `clearCart`)
  - `README.md`
    - Document rename and brief deprecation window

- Backward Compatibility
  - Keep `clearShopifyCart()` as a thin alias for one release cycle with a deprecation JSDoc
  - If external references to `shopifyCartId` exist, expose `cartId` and optionally a deprecated getter for `shopifyCartId`

- Implementation Steps
  1. Update `cart-context.tsx` (names, alias, comments)
  2. Update all usages (grep `clearShopifyCart`, `shopifyCartId`)
  3. Optional storage key migration (read old, write new)
  4. Type-check/build to catch stragglers
  5. Update `README`

- Rollback Safety
  - Alias method prevents breakage during rollout
  - Storage key fallback avoids user cart loss

- Timeline
  - ~0.5 day: code changes + compile fix + smoke test
  - Next minor release: remove deprecated alias

#### 2.5 Hydration Error Fix (Critical)
During Phase 2 implementation, a hydration error may occur due to localStorage access during server-side rendering. This manifests as skeleton UI getting stuck until page refresh.

**Root Cause**: The cart context attempts to read from `localStorage` immediately during initial render, creating a mismatch between server-rendered HTML (empty cart) and client hydration (cart with data from localStorage).

**Error Message**: 
```
Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

**Fix Applied**: Implement hydration-safe localStorage access pattern in `contexts/cart-context.tsx`:

1. **Add hydration state tracking**:
   ```typescript
   const [isHydrated, setIsHydrated] = useState(false)
   ```

2. **Delay localStorage operations until after hydration**:
   ```typescript
   useEffect(() => {
     setIsHydrated(true)
     // Only access localStorage after hydration is complete
     const savedCart = localStorage.getItem(STORAGE_KEY)
     // ... rest of cart loading logic
   }, [])
   ```

3. **Prevent storage writes during SSR**:
   ```typescript
   useEffect(() => {
     if (!isHydrated) return // Don't persist during SSR/initial hydration
     localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }))
   }, [state.items, isHydrated])
   ```

**Additional Component Fixes**: Update components that show loading states based on backend configuration:
- Gate skeleton UI by configuration status (e.g., `showSkeleton = isStrapiConfigured && loading`)
- Ensure components fall back to placeholders when backend is not configured
- This prevents skeleton UI from getting stuck when no backend is available

**Files Modified**:
- `contexts/cart-context.tsx` - Hydration-safe localStorage access
- `components/hero.tsx` - Configuration-gated loading states
- Any other components showing persistent skeleton states

### Phase 3: Component Updates (2-3 days)

#### 3.1 Data Fetching Hooks
- **File**: `hooks/use-shopify.ts` → `hooks/use-strapi.ts`
- **Functions**:
  - `useProducts()` → Fetch from `/api/products`
  - `useProduct(slug)` → Fetch from `/api/products?filters[slug][$eq]=${slug}`
  - `useCollections()` → `useCategories()` from `/api/categories`

**⚠️ Critical**: Preserve existing async patterns and loading states during migration:
- Maintain `loading`, `error`, and `data` return structure from hooks
- Keep granular loading states for individual operations (add to cart, etc.)
- Preserve skeleton UI components and loading animations
- Ensure error handling patterns remain consistent

#### 3.2 Product Display Components
**Files to Update**:
- `components/featured-products.tsx`
- `components/products-page-client.tsx`
- `components/product-page-client.tsx`
- `components/categories.tsx`

**Key Changes**:
- Replace Shopify data structure parsing
- Update image handling (multiple images support)
- Modify price calculations (direct access vs nested variants)
- Update availability checks
- **Preserve all existing loading states and skeleton UI implementations**

#### 3.3 Developer Onboarding System
The template includes a sophisticated developer onboarding system via the `SetupTooltip` component that appears in the bottom-right corner when the system is not configured. This should be adapted for Strapi integration.

**Files to Update**:
- `components/setup-tooltip.tsx` - Main onboarding popup
- `components/setup-wizard.tsx` - Full-screen setup wizard (optional)
- All page components that conditionally show the tooltip

**Current Shopify Onboarding Flow**:
1. **Welcome Screen**: "Connect your Shopify store" vs "Create new store"
2. **Store Input**: Accepts various Shopify URL formats with smart parsing
3. **Instructions**: Step-by-step environment variable setup
4. **Validation**: Parses and validates Shopify domains

**Proposed Strapi Onboarding Flow**:
1. **Welcome Screen**: "Connect to Strapi CMS" vs "Set up local Strapi"
2. **CMS Configuration**: Input for Strapi URL and optional API token
3. **Connection Test**: Validate Strapi accessibility and API endpoints
4. **Instructions**: Environment variable setup with copy-to-clipboard
5. **Verification**: Test connection to `/api/products` endpoint

### Phase 4: Advanced Features (3-5 days)

#### 4.1 Search and Filtering
- **Current**: Basic search UI only
- **Implement**: 
  - Strapi search API integration
  - Category filtering via relations
  - Tag-based filtering using JSON field
  - Price range filtering
  - Publisher filtering

#### 4.2 Pagination
- **Current**: UI components exist
- **Implement**: 
  - Strapi pagination parameters
  - Page size management
  - Total count handling

#### 4.3 Enhanced Features
- **Categories**: Utilize hierarchical category system
- **Publishers**: Add publisher-based filtering
- **Tags**: Implement tag-based product discovery
- **Rich Content**: Handle richtext descriptions properly

### Phase 5: Payment Integration (Optional)

#### 5.1 Checkout Process
Since Strapi doesn't provide built-in checkout:
- **Options**: Stripe, PayPal, Square integration
- **Implementation**: Custom checkout flow
- **Order Management**: Store orders in Strapi or external system

## Preserving Async & Loading State Architecture

### Critical: Maintain Existing UX Patterns
The template features an **excellent async handling system** that must be preserved during the Strapi migration to maintain the professional user experience.

#### Current Loading State Implementation
**Multi-Level Loading System**:
1. **Hook-Level Loading**: `useProducts()`, `useProduct()`, `useCollections()` return `{ data, loading, error }`
2. **Component-Level Loading**: Full-page spinners, section loading states, skeleton UI
3. **Action-Level Loading**: Individual button loading states (add to cart, quantity updates)
4. **Global Loading**: Cart operations with overlay loading states

#### Loading UI Components to Preserve
- **Skeleton Component** (`components/ui/skeleton.tsx`) - Reusable skeleton with `animate-pulse`
- **Custom Skeletons** - Component-specific skeleton implementations (Hero, product cards)
- **Spinner Loading** - `animate-spin` with Lucide's `Loader2` component
- **Error States** - User-friendly error messages with retry options

#### Implementation Requirements for Strapi Migration
```typescript
// Maintain this exact pattern in new Strapi hooks
export function useStrapiProducts() {
  const [products, setProducts] = useState<StrapiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ... async logic

  return { products, loading, error } // Same interface as Shopify hooks
}
```

**Loading State Preservation Checklist**:
- ✅ Hook return signatures remain identical (`{ data, loading, error }`)
- ✅ Component loading patterns unchanged (spinners, skeletons, error states)
- ✅ Granular loading states for user actions maintained
- ✅ Error handling and retry mechanisms preserved
- ✅ Loading animations and transitions kept consistent

## Technical Implementation Details

### Data Structure Mapping

#### Product Data Transformation
```
Shopify Structure → Strapi Structure
├── id → id (string conversion)
├── title → title
├── description → description (richtext to text)
├── handle → slug
├── images.edges[0].node.url → images[0].url
├── variants.edges[0].node.price.amount → price
├── compareAtPriceRange.minVariantPrice.amount → compareAtPrice
└── variants.edges[0].node.availableForSale → availableForSale
```

#### Category Data Transformation
```
Shopify Collections → Strapi Categories
├── id → id
├── title → name
├── handle → slug
├── description → description
└── image → (not directly supported, would need media relation)
```

### API Endpoints Required

#### Products
- `GET /api/products` - List products with pagination
- `GET /api/products?filters[slug][$eq]={slug}` - Single product by slug
- `GET /api/products?filters[categories][slug][$eq]={category}` - Products by category
- `GET /api/products?filters[publisher][slug][$eq]={publisher}` - Products by publisher

#### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories?populate=parent,children` - Categories with hierarchy

#### Publishers
- `GET /api/publishers` - List all publishers

## Developer Onboarding System Integration

### Overview
The template includes a sophisticated developer onboarding system that guides users through connecting their backend CMS. This system should be preserved and adapted for Strapi to maintain the excellent developer experience.

### Current System Architecture

#### SetupTooltip Component (`components/setup-tooltip.tsx`)
- **Trigger**: Appears when `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` is not configured
- **Position**: Fixed bottom-right corner popup
- **Features**: Multi-step wizard, URL parsing, clipboard integration
- **Smart Parsing**: Accepts various Shopify URL formats and normalizes them

#### Display Logic
The tooltip appears on all main pages when not configured:
- `app/page.tsx` - Home page
- `app/products/page.tsx` - Products listing
- `app/product/[id]/page.tsx` - Individual product pages

### Strapi Integration Adaptation

#### 1. Configuration Detection
**Current**:
```typescript
const isShopifyConfigured = !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
{!isShopifyConfigured && <SetupTooltip />}
```

**Updated for Strapi**:
```typescript
const isStrapiConfigured = !!process.env.NEXT_PUBLIC_STRAPI_URL
{!isStrapiConfigured && <SetupTooltip />}
```

#### 2. Multi-Environment Support
The onboarding system should support both local development and production Strapi instances:

**Local Development Flow**:
1. **Welcome**: "Connect to local Strapi" vs "Set up new Strapi instance"
2. **Local Setup**: Guide to running Strapi locally (Docker/npm)
3. **URL Input**: `http://localhost:1337` (default)
4. **Connection Test**: Verify Strapi is running and accessible

**Production Flow**:
1. **Welcome**: "Connect to Strapi CMS" vs "Deploy new Strapi instance"
2. **URL Input**: Production Strapi URL with validation
3. **API Token**: Optional token input for authenticated endpoints
4. **Connection Test**: Verify production instance accessibility

#### 3. Enhanced Setup Steps

##### Step 1: Welcome & Environment Detection
```typescript
// Detect environment and show appropriate options
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Show different options based on environment
- "Connect to local Strapi (recommended for development)"
- "Connect to production Strapi instance"
- "Set up new Strapi instance"
```

##### Step 2: URL Input & Validation
```typescript
// Enhanced URL validation for Strapi
const validateStrapiUrl = async (url: string) => {
  try {
    const response = await fetch(`${url}/api/products?pagination[limit]=1`)
    return response.ok
  } catch {
    return false
  }
}
```

##### Step 3: Connection Testing
```typescript
// Test multiple endpoints to ensure full compatibility
const testStrapiConnection = async (baseUrl: string, token?: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  
  const tests = [
    { endpoint: '/api/products', name: 'Products API' },
    { endpoint: '/api/categories', name: 'Categories API' },
    { endpoint: '/api/publishers', name: 'Publishers API' }
  ]
  
  // Return detailed test results
}
```

##### Step 4: Environment Configuration
**Environment Variables to Set**:
```bash
# Required
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

# Optional (for authenticated endpoints)
STRAPI_API_TOKEN=your-api-token

# Optional (for specific configurations)
NEXT_PUBLIC_STRAPI_API_VERSION=v1
```

##### Step 5: Verification & Success
- Test API connectivity
- Fetch sample product to verify data structure
- Show success message with next steps
- Provide troubleshooting links if connection fails

#### 4. Smart URL Parsing for Strapi
Create `lib/parse-strapi-url.ts` similar to existing Shopify parser:

```typescript
// Handle various Strapi URL formats
export function parseStrapiUrl(input: string): string | null {
  // Accept formats like:
  // - http://localhost:1337
  // - https://my-strapi.herokuapp.com
  // - https://api.mysite.com
  // - my-strapi-instance (add protocol)
}
```

#### 5. Error Handling & Troubleshooting
**Common Issues & Solutions**:
- **CORS Issues**: Instructions for configuring Strapi CORS settings
- **Connection Refused**: Guide to starting local Strapi instance
- **API Token Issues**: How to generate and configure API tokens
- **Missing Content Types**: Instructions for creating required content types

#### 6. Development vs Production Modes

##### Development Mode Features
- **Auto-detection**: Detect if Strapi is running locally
- **Quick Setup**: One-click local configuration
- **Live Reload**: Re-test connection when Strapi restarts
- **Debug Info**: Show detailed connection information

##### Production Mode Features
- **Security Validation**: Ensure HTTPS for production URLs
- **Performance Testing**: Test API response times
- **Health Checks**: Verify all required endpoints
- **Token Validation**: Test API token permissions

### Implementation Priority

**Phase 3.3 - High Priority** because:
1. **Maintains Professional UX**: Preserves the polished developer experience
2. **Reduces Onboarding Friction**: Makes it easy for developers to get started
3. **Self-Documenting**: The app teaches users how to configure it
4. **Supports Multiple Environments**: Works for both local development and production

### User Experience Flow

#### For New Developers
1. **Clone template** → See demo products with "Demo Mode" badges
2. **Notice setup popup** → Clear call-to-action in bottom-right
3. **Follow guided setup** → Step-by-step Strapi connection
4. **See real data** → Template switches from demo to real products
5. **Continue development** → Full template functionality available

#### For Existing Strapi Users
1. **Input existing URL** → Quick connection to existing instance
2. **Validate connection** → Automatic testing of required endpoints
3. **Ready to use** → Immediate access to all features

### Configuration Changes

#### Environment Variables
```
# Remove
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
SHOPIFY_STOREFRONT_ACCESS_TOKEN

# Add
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token
```

#### Feature Flags
Update configuration detection throughout the application:
```
# Replace
const isShopifyConfigured = !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN

# With
const isStrapiConfigured = !!process.env.NEXT_PUBLIC_STRAPI_URL
```

## Migration Benefits

### Advantages Over Shopify
- **Cost Control**: No transaction fees or monthly subscriptions
- **Data Ownership**: Full control over product data and customer information
- **Customization**: Complete flexibility in data structure and business logic
- **Integration**: Direct database access for custom features
- **Scalability**: Self-hosted solution with configurable resources

### Enhanced Features Available
- **Rich Content**: Enhanced product descriptions with rich text
- **Hierarchical Categories**: Multi-level category organization
- **Publisher Management**: Organize products by publisher/brand
- **Advanced Metadata**: Custom JSON fields for additional product data
- **Content Workflow**: Draft/publish workflow for content management
- **Multi-language**: Built-in internationalization support

## Challenges and Considerations

### Technical Challenges
- **Cart Persistence**: Implementing cart without built-in ecommerce features
- **Payment Processing**: Requires separate payment provider integration
- **Inventory Management**: No built-in inventory tracking
- **Order Management**: Custom order processing system needed
- **Search Performance**: May require additional search indexing

### Business Considerations
- **Checkout Experience**: Custom implementation vs Shopify's optimized checkout
- **PCI Compliance**: Payment security responsibilities
- **Maintenance**: Self-hosted infrastructure management
- **Feature Parity**: Some Shopify features may require custom development

## Development Timeline

### Estimated Effort: 10-15 days

#### Week 1
- **Days 1-3**: Data layer and API client development
- **Days 4-6**: Cart system implementation
- **Day 7**: Component updates and developer onboarding system adaptation

#### Week 2
- **Days 8-10**: Advanced features (search, filtering, pagination)
- **Days 11-12**: Payment integration (optional)
- **Days 13-15**: Testing, optimization, and deployment

### Resource Requirements
- **1 Full-stack Developer**: Primary development
- **1 Frontend Developer**: UI/UX refinements (optional)
- **DevOps Support**: Deployment and infrastructure (1-2 days)

### Detailed Implementation Tasks

#### Developer Onboarding System (Day 7)
**High Priority Tasks**:
1. **Update SetupTooltip Component** (3-4 hours)
   - Replace Shopify-specific text and branding
   - Update environment variable names and instructions
   - Modify URL parsing logic for Strapi endpoints
   
2. **Create Strapi URL Parser** (1-2 hours)
   - Build `lib/parse-strapi-url.ts` utility
   - Handle various URL formats (localhost, production, with/without protocol)
   - Validate and normalize Strapi URLs
   
3. **Implement Connection Testing** (2-3 hours)
   - Create API connectivity validation
   - Test required endpoints (/api/products, /api/categories, etc.)
   - Handle authentication with API tokens
   
4. **Update Configuration Detection** (1 hour)
   - Replace `isShopifyConfigured` with `isStrapiConfigured`
   - Update all page components that show the tooltip
   - Test demo mode vs connected mode switching
   
5. **Add Environment-Specific Flows** (2-3 hours)
   - Detect local vs production environment
   - Provide different setup instructions for each
   - Add troubleshooting guides for common issues

**Testing & Validation** (1-2 hours):
- Test onboarding flow with local Strapi instance
- Verify environment variable setup instructions
- Test connection validation with various URL formats
- Ensure smooth transition from demo mode to connected mode

## Success Criteria

### Functional Requirements
- ✅ All existing product display functionality preserved
- ✅ Cart operations work seamlessly
- ✅ Search and filtering capabilities maintained
- ✅ Responsive design and accessibility preserved
- ✅ Demo mode functionality for development
- ✅ Developer onboarding system adapted for Strapi
- ✅ Seamless connection to both local and production Strapi instances

### Performance Requirements
- ✅ Page load times comparable to current implementation
- ✅ Image loading optimization maintained
- ✅ Mobile performance preserved

### User Experience Requirements
- ✅ No degradation in user experience
- ✅ Smooth product browsing and cart management
- ✅ Clear error handling and loading states
- ✅ All existing async patterns and loading animations preserved
- ✅ Skeleton UI components and loading indicators maintained

## Conclusion

The conversion from Shopify to Strapi is highly feasible with the current template architecture. The well-structured component system and clear separation of concerns make the migration straightforward. The Strapi schema provides excellent compatibility with existing requirements while offering additional features for future enhancement.

The main effort will be in rebuilding the cart system and integrating with Strapi's API, but the overall architecture and user experience can be preserved while gaining the benefits of a self-hosted, customizable solution.
