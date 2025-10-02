import { ProductsPageClient } from "@/components/products-page-client"
import { getProducts } from "@/lib/strapi"

export default async function ProductsPage() {
  // getProducts now handles errors gracefully and returns empty array if Strapi is unavailable
  const products = await getProducts(24)

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Assets</h1>
      <ProductsPageClient initialProducts={products} />
    </main>
  )
}
