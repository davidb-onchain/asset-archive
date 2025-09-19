"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Loader2 } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useIsStrapiConfigured } from "@/lib/strapi.client"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { StrapiProduct } from "@/lib/strapi"
import { getProducts } from "@/lib/strapi"

export function FeaturedProducts({ initialProducts }: { initialProducts: StrapiProduct[] }) {
  const products: any[] = initialProducts || []
  const { addItem } = useCart()
  const [addingProducts, setAddingProducts] = useState<Set<string>>(new Set())

  // Hydration-safe config check
  const isStrapiConfigured = useIsStrapiConfigured()

  // Client-fetched products fallback when SSR provided none
  const [clientProducts, setClientProducts] = useState<StrapiProduct[]>(products)

  useEffect(() => {
    if (isStrapiConfigured && clientProducts.length === 0) {
      ;(async () => {
        try {
          const data = await getProducts(6)
          setClientProducts(data)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Client-side featured products fetch failed:", err)
        }
      })()
    }
  }, [isStrapiConfigured, clientProducts.length])

  const handleAddToCart = async (product: any, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isStrapiConfigured) {
      alert("This is a demo. Connect your CMS to enable real cart functionality!")
      return
    }

    const price = product.price ?? 0
    const image = product.images?.[0]?.url || "/placeholder.svg"

    setAddingProducts((prev) => new Set(prev).add(String(product.id)))

    try {
      await addItem({
        id: String(product.id),
        name: product.title,
        price,
        image,
        handle: product.slug,
      })
    } finally {
      setAddingProducts((prev) => {
        const next = new Set(prev)
        next.delete(String(product.id))
        return next
      })
    }
  }

  const productsToShow = isStrapiConfigured ? clientProducts : []

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-black">Featured Products</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsToShow.length === 0 ? (
            // Skeleton loading state
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="overflow-hidden border border-gray-200 h-full flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            productsToShow.map((product: any) => {
              const price = product.price ?? 0
              const compareAtPrice = product.compareAtPrice ?? null
              const hasDiscount = compareAtPrice != null && compareAtPrice > price
              const image = product.images?.[0]?.url || product.image || "/placeholder.svg"

              return (
                <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 h-full flex flex-col relative">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="relative overflow-hidden">
                      <Link href={`/${product.slug ? `product/${product.slug}` : "#"}`}>
                        <img
                          src={image}
                          alt={product.title}
                          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        />
                      </Link>

                      {hasDiscount && (
                        <Badge className="absolute top-4 left-4 bg-black text-white">Sale</Badge>
                      )}
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-lg font-semibold mb-2 text-black">{product.title}</h3>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-black font-bold">${price.toFixed(2)}</span>
                          {hasDiscount && (
                            <span className="text-gray-500 line-through">${(compareAtPrice as number).toFixed(2)}</span>
                          )}
                        </div>

                        <Button
                          type="button"
                          className="bg-black text-white hover:bg-black/90"
                          onClick={(e) => handleAddToCart(product, e)}
                          disabled={addingProducts.has(String(product.id))}
                        >
                          {addingProducts.has(String(product.id)) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
