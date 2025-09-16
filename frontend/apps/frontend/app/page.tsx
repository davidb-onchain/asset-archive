import { Hero } from "@/components/hero"
import { FeaturedProducts } from "@/components/featured-products"
import { Newsletter } from "@/components/newsletter"
import { Footer } from "@/components/footer"
import { getProducts } from "@/lib/strapi"

export default async function Home() {
  const hasStrapi = !!process.env.NEXT_PUBLIC_STRAPI_URL
  const featured = hasStrapi ? await getProducts(6) : []

  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturedProducts initialProducts={featured} />
      <Newsletter />
      <Footer />
    </main>
  )
}
