# Frontend - Digital Ecommerce Application

A modern, responsive Next.js frontend for digital ecommerce built with TypeScript and Tailwind CSS. Currently implements core product catalog and shopping cart functionality with Shopify integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## 📋 Current Status

**Completion: ~25-30%** of a full-featured ecommerce platform

This is essentially a **product catalog with cart functionality** - suitable for showcasing products but not for actual transactions without significant additional development.

## ✅ Implemented Features

### Core Product Management
- **Product Catalog**: Display of products with images, titles, descriptions, pricing
- **Product Grid**: Responsive grid layout with product cards
- **Product Detail Pages**: Individual product pages with image galleries, descriptions, pricing
- **Product Variants**: Support for product variants with different prices
- **Product Images**: Image carousel/gallery functionality
- **Pricing Display**: Regular prices, sale prices, discount badges
- **Stock Status**: Available/out-of-stock indicators

### Navigation & Discovery
- **Category System**: Dynamic categories with filtering
- **Search Functionality**: Search bar in navigation (UI only, no backend)
- **Product Filtering**: Basic filtering by category
- **Product Sorting**: Sort by featured, price, name
- **Pagination**: Numbered pagination for product listings
- **Breadcrumb Navigation**: Product detail breadcrumbs

### Shopping Cart
- **Cart Management**: Add/remove items, update quantities
- **Cart Drawer**: Sliding cart sidebar with item management
- **Cart State**: Persistent cart state with React Context
- **Cart Counter**: Item count display in navigation
- **Optimistic Updates**: Immediate UI updates while API calls process
- **Shopify Integration**: Full cart API integration with Shopify

### UI/UX Components
- **Responsive Design**: Mobile-first, fully responsive layout
- **Modern UI**: Clean, professional design with Tailwind CSS
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: Error boundaries and user-friendly error messages
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Dark Mode Support**: Theme switching capability (via next-themes)

### Demo/Development Features
- **Placeholder Content**: Demo products and categories when no backend is connected
- **Setup Wizard**: Guided setup for connecting to Shopify
- **Configuration Detection**: Automatic detection of backend connectivity

## ❌ Missing Critical Features

### Authentication & User Management
- ❌ User Registration/Login
- ❌ User Profiles
- ❌ Session Management
- ❌ Password Reset
- ❌ Social Login

### Checkout & Payment
- ❌ Checkout Process
- ❌ Payment Integration
- ❌ Billing Information
- ❌ Shipping Options
- ❌ Order Summary
- ❌ Payment Methods

### Order Management
- ❌ Order History
- ❌ Order Status
- ❌ Order Confirmation
- ❌ Invoice Generation
- ❌ Order Cancellation

### Advanced Product Features
- ❌ Product Reviews
- ❌ Product Recommendations
- ❌ Wishlist/Favorites
- ❌ Product Comparison
- ❌ Recently Viewed
- ❌ Advanced Filtering

### Customer Features
- ❌ Customer Support
- ❌ Email Notifications
- ❌ Newsletter Management (backend)
- ❌ Account Dashboard
- ❌ Address Book

### Business Features
- ❌ Inventory Management
- ❌ Promotions/Coupons
- ❌ Tax Calculation
- ❌ Shipping Calculator
- ❌ Multi-currency
- ❌ Analytics

### Content Management
- ❌ CMS Integration
- ❌ SEO Optimization
- ❌ Blog/Content
- ❌ Static Pages

## 🛠 Tech Stack

### Core Framework
- **Next.js 14.2.16** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type safety

### Styling & UI
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful & consistent icons
- **Framer Motion** - Animation library
- **next-themes** - Theme switching

### State Management
- **React Context** - Cart state management
- **React Hook Form** - Form state management

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### Additional Libraries
- **class-variance-authority** - Component variants
- **clsx & tailwind-merge** - Conditional classes
- **zod** - Schema validation
- **date-fns** - Date utilities
- **recharts** - Chart components
- **sonner** - Toast notifications

## 📁 Project Structure

```
apps/frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── product/           # Product routes
│   │   └── [id]/         # Dynamic product pages
│   └── products/          # Products listing
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── cart-drawer.tsx   # Shopping cart
│   ├── navbar.tsx        # Navigation
│   ├── hero.tsx          # Hero section
│   └── ...               # Other components
├── contexts/             # React contexts
│   └── cart-context.tsx  # Cart state management
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
│   ├── shopify.ts        # Shopify API integration
│   └── utils.ts          # General utilities
├── public/               # Static assets
└── styles/               # Additional styles
```

## 🧩 Reusable Components

The application is built with a comprehensive set of reusable components following modern React patterns and accessibility standards.

### Core UI Components (`components/ui/`)

#### **Layout & Structure**
- **`Card`** - Flexible container with header, content, and footer sections
- **`Sheet`** - Sliding panel/drawer component (used for mobile menus)
- **`Dialog`** - Modal dialog with backdrop and animations
- **`Accordion`** - Collapsible content sections
- **`Tabs`** - Tabbed interface component
- **`Separator`** - Visual divider/line component

#### **Form Controls**
- **`Button`** - Multi-variant button with sizes (default, outline, ghost, destructive, etc.)
- **`Input`** - Text input with consistent styling and validation states
- **`Textarea`** - Multi-line text input
- **`Select`** - Dropdown selection component
- **`Checkbox`** - Checkbox input with custom styling
- **`Radio Group`** - Radio button group component
- **`Switch`** - Toggle switch component
- **`Slider`** - Range slider input
- **`Form`** - Form wrapper with validation and error handling

#### **Navigation & Interaction**
- **`Navigation Menu`** - Hierarchical navigation with dropdowns
- **`Breadcrumb`** - Navigation breadcrumb trail
- **`Pagination`** - Page navigation component
- **`Command`** - Command palette/search interface
- **`Context Menu`** - Right-click context menu
- **`Dropdown Menu`** - Dropdown menu with sub-menus
- **`Menubar`** - Application menu bar

#### **Data Display**
- **`Table`** - Data table with sorting and styling
- **`Badge`** - Status/label badges with variants
- **`Avatar`** - User avatar component with fallbacks
- **`Skeleton`** - Loading placeholder animations
- **`Progress`** - Progress bar indicator
- **`Chart`** - Chart components using Recharts

#### **Feedback & Status**
- **`Alert`** - Alert messages with variants (info, warning, error)
- **`Toast`** - Temporary notification messages
- **`Tooltip`** - Hover/focus tooltips
- **`Alert Dialog`** - Confirmation dialogs

#### **Media & Layout**
- **`Carousel`** - Image/content carousel with navigation
- **`Aspect Ratio`** - Maintains aspect ratio for media
- **`Scroll Area`** - Custom scrollable areas
- **`Resizable`** - Resizable panel components
- **`Collapsible`** - Collapsible content areas

### Page-Level Components

#### **Ecommerce Specific**
- **`CartDrawer`** - Shopping cart sidebar with item management
- **`ProductCard`** - Product display card with pricing and actions
- **`Categories`** - Category grid with icons and navigation
- **`FeaturedProducts`** - Product showcase section
- **`ProductsPageClient`** - Full products listing with search/filter
- **`ProductPageClient`** - Individual product detail view

#### **Layout Components**
- **`Navbar`** - Main navigation with cart, search, and mobile menu
- **`Hero`** - Landing page hero section with featured product
- **`Footer`** - Site footer with links and information
- **`Newsletter`** - Email subscription component

#### **Setup & Configuration**
- **`SetupTooltip`** - Shopify configuration helper
- **`SetupWizard`** - Multi-step setup process

### Component Architecture

#### **Design Principles**
- **Composition over Inheritance** - Components are designed to be composed together
- **Variant-based Design** - Uses `class-variance-authority` for consistent variants
- **Accessibility First** - Built with ARIA labels and keyboard navigation
- **TypeScript Native** - Full type safety with proper prop interfaces
- **Forwarded Refs** - All components properly forward refs for flexibility

#### **Styling System**
- **Tailwind CSS Classes** - Utility-first styling approach
- **CSS Variables** - Theme-aware color system with light/dark mode
- **Responsive Design** - Mobile-first responsive breakpoints
- **Consistent Spacing** - Standardized padding, margins, and sizing

#### **Usage Patterns**

```tsx
// Basic component usage
<Button variant="outline" size="lg">
  Click me
</Button>

// Composed card component
<Card>
  <CardHeader>
    <CardTitle>Product Title</CardTitle>
    <CardDescription>Product description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Product details...</p>
  </CardContent>
  <CardFooter>
    <Button>Add to Cart</Button>
  </CardFooter>
</Card>

// Form with validation
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="Enter email" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

#### **Customization**
- All components accept `className` prop for custom styling
- Variants can be extended through the design system
- Components are unstyled at the base level (Radix UI primitives)
- Theme customization through CSS variables and Tailwind config

## 🔄 Migrating from Shopify to Strapi

This template was originally built for Shopify integration, but can be adapted for Strapi-based backends. Here's what needs to be changed:

### Migration Overview

The current Shopify integration touches **5 main areas** that need to be replaced:

1. **Data Layer** (`lib/shopify.ts`) - API calls and data fetching
2. **Type Definitions** - Product, cart, and collection interfaces  
3. **State Management** (`contexts/cart-context.tsx`) - Cart operations
4. **Custom Hooks** (`hooks/use-shopify.ts`) - Data fetching hooks
5. **Configuration Detection** - Environment variable checks

### Required Changes by Component

#### **1. Data Layer Replacement**
**File: `lib/shopify.ts` → `lib/strapi.ts`**

- **Replace GraphQL with REST/GraphQL**: Shopify uses GraphQL, Strapi can use either
- **Update API endpoints**: Change from Shopify Storefront API to Strapi API endpoints
- **Modify authentication**: Replace Shopify access tokens with Strapi JWT/API keys
- **Transform data structures**: Map Strapi responses to match existing interfaces

#### **2. Type System Updates**
**Files: Interface definitions across the app**

- **Product Types**: Map Strapi product content type to `ShopifyProduct` interface
- **Collection Types**: Replace `ShopifyCollection` with Strapi category structure
- **Cart Types**: Replace `ShopifyCart` and `ShopifyCartLine` with custom cart logic
- **Pricing Structure**: Adapt to Strapi's pricing fields vs Shopify's complex price ranges

#### **3. Cart Logic Overhaul**
**File: `contexts/cart-context.tsx`**

- **Session Management**: Replace Shopify cart IDs with user sessions or local storage
- **Cart Operations**: Implement custom add/remove/update logic (no built-in cart in Strapi)
- **Persistence**: Choose between database storage, local storage, or session storage
- **Checkout Integration**: Connect to payment provider (Stripe, PayPal) instead of Shopify checkout

#### **4. Data Fetching Hooks**
**File: `hooks/use-shopify.ts` → `hooks/use-strapi.ts`**

- **API Calls**: Replace Shopify API calls with Strapi REST/GraphQL calls
- **Error Handling**: Adapt to Strapi's error response format
- **Caching Strategy**: Implement appropriate caching for Strapi responses
- **Loading States**: Maintain existing loading/error patterns

#### **5. Configuration Changes**
**Files: Multiple components and pages**

- **Environment Variables**: Replace `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` with Strapi URL
- **Feature Detection**: Update `isShopifyConfigured` checks to `isStrapiConfigured`
- **Setup Components**: Modify `SetupTooltip` and `SetupWizard` for Strapi setup

### Strapi Content Type Requirements

To replace Shopify functionality, you'll need these Strapi content types:

#### **Products**
- `title`, `description`, `handle` (slug)
- `price`, `compareAtPrice`, `availableForSale`
- `images` (media relation)
- `categories` (relation to categories)
- `variants` (if supporting product variants)

#### **Categories** 
- `name`, `slug`, `description`
- `image` (media relation)
- `parent` (self-relation for hierarchy)

#### **Cart Items** (if using database cart)
- `product` (relation), `quantity`, `variant`
- `user` (relation), `session` (for guest carts)

### Implementation Effort Estimate

#### **Phase 1: Core Data Layer** (2-3 days)
- Replace `lib/shopify.ts` with Strapi API client
- Update type definitions to match Strapi schema
- Create basic CRUD operations for products/categories

#### **Phase 2: Cart System** (3-4 days)  
- Rebuild cart context for Strapi backend
- Implement cart persistence strategy
- Add cart operations (add, remove, update, clear)

#### **Phase 3: UI Integration** (2-3 days)
- Update hooks to use new API client
- Modify configuration detection logic
- Update setup/onboarding components

#### **Phase 4: Advanced Features** (3-5 days)
- Implement search and filtering
- Add pagination for large product catalogs  
- Integrate payment processing
- Add user authentication (if required)

### Key Architectural Decisions

#### **Cart Storage Strategy**
- **Database Cart**: Store in Strapi, requires user authentication
- **Session Cart**: Store in session storage, simpler but less persistent  
- **Local Cart**: Store in localStorage, persists across sessions
- **Hybrid**: Local storage for guests, database for authenticated users

#### **API Strategy**
- **REST API**: Simpler, works with existing fetch patterns
- **GraphQL**: More efficient, requires query restructuring
- **Mixed**: REST for mutations, GraphQL for queries

#### **Authentication Integration**
- **Required**: Full user accounts with cart persistence
- **Optional**: Guest checkout with session-based carts
- **None**: Local storage only (current Shopify demo behavior)

### Migration Benefits

#### **Advantages of Strapi over Shopify**
- **Cost Control**: No transaction fees or monthly subscriptions
- **Customization**: Full control over data structure and business logic
- **Integration**: Direct database access and custom API endpoints
- **Flexibility**: Not locked into ecommerce-specific patterns

#### **Trade-offs to Consider**
- **Cart Complexity**: Must implement cart logic vs Shopify's built-in cart
- **Payment Integration**: Need separate payment provider integration
- **Checkout Flow**: Must build complete checkout process
- **Inventory Management**: Need custom inventory tracking system

### Next Steps for Migration

1. **Set up Strapi instance** with required content types
2. **Create API client** to replace Shopify integration  
3. **Rebuild cart system** with chosen persistence strategy
4. **Update type definitions** to match Strapi schema
5. **Modify UI components** to use new data sources
6. **Test thoroughly** with real Strapi data
7. **Add payment processing** for complete ecommerce functionality

The migration is substantial but straightforward - most UI components can remain unchanged while the underlying data layer is replaced with Strapi integration.

## 🔧 Configuration

### Environment Variables

```bash
# Shopify Integration (optional - current)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-access-token

# Strapi Integration (for migration)
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token

# Analytics (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

### Shopify Setup (Current)

1. Create a Shopify store or use existing one
2. Generate a Storefront API access token
3. Add environment variables
4. Restart development server

## 🚧 Technical Debt & Improvements Needed

### Backend Integration
- Currently only has Shopify integration (demo mode)
- No custom backend API
- No database connectivity
- No server-side rendering for dynamic content

### State Management
- Cart state only - needs user state, auth state, etc.
- No global application state management beyond cart

### Performance
- No image optimization beyond Next.js defaults
- No caching strategy for product data
- No CDN integration

### Testing
- No test suite implemented
- No E2E testing
- No component testing

## 🎯 Next Development Priorities

1. **Authentication System** - User registration, login, session management
2. **Checkout Flow** - Multi-step checkout with payment integration
3. **Order Management** - Order history, tracking, confirmations
4. **Product Reviews** - Rating and review system
5. **Advanced Search** - Filters, sorting, search functionality
6. **User Dashboard** - Account management, order history
7. **Content Management** - Static pages, blog, SEO
8. **Testing Suite** - Unit, integration, and E2E tests

## 📝 Development Notes

- Currently in **demo mode** when no Shopify store is configured
- Shows placeholder products and categories for development
- Cart functionality works with Shopify integration
- Mobile-first responsive design
- Accessibility features implemented
- Modern React patterns with hooks and context

## 🤝 Contributing

This is a work-in-progress ecommerce frontend. Major areas needing development:
- User authentication and management
- Payment processing and checkout
- Order management system
- Advanced product features
- Content management integration

---

*Last Updated: December 2024* 