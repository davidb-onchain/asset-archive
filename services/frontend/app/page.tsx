import { Hero } from "@/components/hero"
import { FeaturedProducts } from "@/components/featured-products"
import { Newsletter } from "@/components/newsletter"
import { Footer } from "@/components/footer"
import { getProducts } from "@/lib/strapi"

export default async function Home() {
  // getProducts now handles errors gracefully and returns empty array if Strapi is unavailable
  const featured = await getProducts(6)

  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturedProducts initialProducts={featured} />
      <Newsletter />
      <Footer />
    </main>
  )
}
