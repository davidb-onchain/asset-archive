"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Star } from "lucide-react"
import { getStoreName } from "@/lib/store-name"
import { useProducts } from "@/hooks/use-strapi"
import { isStrapiConfigured as isStrapiConfiguredFn } from "@/lib/strapi"
import { useMemo, useState, useEffect } from "react"
import Link from "next/link"

export function Hero() {
  // Get dynamic store name for the hero title
  const storeName = getStoreName()
  const { products, loading } = useProducts()

  // Check if Strapi is configured (align with rest of app)
  const [isStrapiConfigured, setIsStrapiConfigured] = useState(false)
  
  useEffect(() => {
    setIsStrapiConfigured(isStrapiConfiguredFn())
  }, [])

  // Only consider products when backend is configured
  const featuredProduct = useMemo(() => {
    if (!isStrapiConfigured) return null
    if (products.length === 0) return null
    const randomIndex = Math.floor(Math.random() * products.length)
    return products[randomIndex]
  }, [products, isStrapiConfigured])

  // Get product details (Strapi shape)
  const productDetails = useMemo(() => {
    if (!featuredProduct) return null

    const image = featuredProduct.images?.[0]
    const price = featuredProduct.price ?? 0
    const compareAtPrice = featuredProduct.compareAtPrice ?? null
    const hasDiscount = compareAtPrice != null && compareAtPrice > price

    return {
      title: featuredProduct.title,
      price,
      compareAtPrice,
      hasDiscount,
      image: image?.url || "/placeholder.svg?height=400&width=400",
      imageAlt: image?.alternativeText || featuredProduct.title,
      slug: featuredProduct.slug,
      available: featuredProduct.availableForSale ?? true,
    }
  }, [featuredProduct])

  // Hydration-safe loading: only show skeleton when configured and actively loading
  const showSkeleton = isStrapiConfigured && loading
  const isLoaded = Boolean(productDetails)

  return (
    <section className="relative bg-white overflow-hidden py-16">
      {/* Simplified container to match other components */}
      <div className="container mx-auto px-4">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left content - show spinner by default, content only when loaded */}
            <div className="space-y-8">
              {isLoaded ? (
                <>
                  <Badge variant="outline" className="border-black text-black bg-transparent px-4 py-2 w-fit">
                    <Star className="w-4 h-4 mr-2 fill-black" />
                    New Collection
                  </Badge>

                  <div>
                    <h1 className="text-5xl md:text-7xl font-bold text-black mb-6 leading-tight">
                      {storeName === "Shopify Template" ? (
                        <>
                          Shop the
                          <span className="block">Future</span>
                        </>
                      ) : (
                        <>
                          Welcome to
                          <span className="block">{storeName}</span>
                        </>
                      )}
                    </h1>

                    <p className="text-xl text-black/70 mb-8 max-w-lg leading-relaxed">
                      Discover amazing assets that blend style, innovation, and quality.
                    </p>
                  </div>

                  {/* Functional buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/products">
                      <Button size="lg" className="bg-black text-white hover:bg-black/90 text-lg px-8 py-6 border-0">
                        Shop Now
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                    <Link href="/products">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-black text-black hover:bg-black hover:text-white text-lg px-8 py-6 bg-transparent"
                      >
                        Explore Collections
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              )}
            </div>

            {/* Right content - show placeholder or real product */}
            <div className="relative">
              {showSkeleton ? (
                // Simplified loading state
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="w-full h-80 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ) : productDetails ? (
                // Real product showcase
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <Link href={`/product/${productDetails.slug}`}>
                    <img
                      src={productDetails.image || "/placeholder.svg"}
                      alt={productDetails.imageAlt}
                      className="w-full h-80 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity duration-300"
                    />
                  </Link>

                  {/* Product info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/product/${productDetails.slug}`}>
                        <h3 className="font-semibold text-lg text-black hover:text-gray-600 transition-colors cursor-pointer line-clamp-1">
                          {productDetails.title}
                        </h3>
                      </Link>
                      {productDetails.hasDiscount && <Badge className="bg-black text-white text-xs">Sale</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-black text-black" />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">(4.9)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xl text-black">${productDetails.price.toFixed(2)}</span>
                        {productDetails.hasDiscount && productDetails.compareAtPrice != null && (
                          <span className="text-sm text-gray-500 line-through">
                            ${productDetails.compareAtPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Skeleton state when no CMS is configured
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="w-full h-80 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
