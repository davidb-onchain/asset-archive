import { ProductsPageClient } from "@/components/products-page-client"
import { getProducts } from "@/lib/strapi"

export default async function ProductsPage() {
  const hasStrapi = !!process.env.NEXT_PUBLIC_STRAPI_URL
  const products = hasStrapi ? await getProducts(24) : []

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      <ProductsPageClient initialProducts={products} />
    </main>
  )
}
