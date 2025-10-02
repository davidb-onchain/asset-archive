"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useIsStrapiConfigured } from "@/lib/strapi.client"
import { useCart } from "@/contexts/cart-context"
import { Star, Search, Filter, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import type { StrapiProduct } from "@/lib/strapi"
import { getProducts } from "@/lib/strapi"



export function ProductsPageClient({ initialProducts }: { initialProducts: StrapiProduct[] }) {
  const products: any[] = initialProducts || []
  const { addItem } = useCart()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [addingProducts, setAddingProducts] = useState<Set<string>>(new Set())

  // Hydration-safe config check
  const isStrapiConfigured = useIsStrapiConfigured()

  // Client-fetched products fallback when SSR provided none
  const [clientProducts, setClientProducts] = useState<StrapiProduct[]>(products)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    if (isStrapiConfigured && clientProducts.length === 0) {
      setClientLoading(true)
      setClientError(null)
      ;(async () => {
        try {
          const data = await getProducts(24)
          setClientProducts(data)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Client-side product fetch failed:", err)
          setClientError(err instanceof Error ? err.message : "Failed to fetch products")
        } finally {
          setClientLoading(false)
        }
      })()
    }
  }, [isStrapiConfigured, clientProducts.length])

  // Check for collection filter in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const collectionParam = urlParams.get("collection")
    if (collectionParam) {
      setSelectedCollection(collectionParam)
    }
  }, [])

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

  // Apply search and sorting on the products array
  const filteredProducts = (isStrapiConfigured ? clientProducts : [])
    .filter((product: any) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()),
    )

  const showSkeleton = !isStrapiConfigured || clientLoading || (isStrapiConfigured && !clientLoading && clientProducts.length === 0);


  // Show loading only for configured stores
  if (products.length === 0 && !isStrapiConfigured) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assets...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error only after client fetch attempt
  if (isStrapiConfigured && !clientLoading && clientProducts.length === 0 && clientError) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">Error loading assets:</p>
            <p className="text-red-500 text-sm mb-4 break-words max-w-lg mx-auto">
              {clientError || "No assets found. Please ensure your Strapi configuration is correct."}
            </p>
            <p className="text-gray-600 mb-4">Please ensure your `NEXT_PUBLIC_STRAPI_URL` environment variable is correctly set.</p>
            <Button onClick={() => window.location.reload()} className="bg-black text-white hover:bg-black/90">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4">
        {/* Header with collection filter indicator */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            {selectedCollection ? `Collection: ${selectedCollection}` : "All Assets"}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isStrapiConfigured
              ? "Discover our complete collection of amazing assets"
              : "Sample assets - connect your CMS to see real assets"}
          </p>
          {!isStrapiConfigured && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mt-2">
              Demo Mode
            </Badge>
          )}
          {selectedCollection && (
            <Button
              variant="outline"
              className="mt-4 border-gray-300 bg-transparent"
              onClick={() => {
                setSelectedCollection(null)
                window.history.pushState({}, "", "/products")
              }}
            >
              Clear Filter
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border-gray-300 focus:border-black"
            />
          </div>

          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>

            <Button variant="outline" className="px-6 border-gray-300 bg-transparent">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {showSkeleton ? (
          // Skeleton loading state for demo mode and client fetch
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="overflow-hidden border border-gray-200 h-full flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">No assets found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product: any, index: number) => {
              const price = product.price ?? 0
              const compareAtPrice = product.compareAtPrice ?? null
              const hasDiscount = compareAtPrice != null && compareAtPrice > price
              const image = product.images?.[0]?.url || product.image || "/placeholder.svg"

              return (
                <div key={`${product.id}`} className="h-full">
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 h-full flex flex-col relative">
                    {!isStrapiConfigured && (
                      <Badge
                        variant="secondary"
                        className="absolute top-4 right-4 z-10 bg-yellow-100 text-yellow-800 text-xs"
                      >
                        Demo
                      </Badge>
                    )}

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

                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button
                            type="button"
                            className="bg-white text-black hover:bg-gray-100 border border-gray-200"
                            onClick={(e) => handleAddToCart(product, e)}
                            disabled={addingProducts.has(String(product.id))}
                          >
                            {addingProducts.has(String(product.id)) ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Star className="w-4 h-4 mr-2" />
                            )}
                            Quick Add
                          </Button>
                        </div>
                      </div>

                      <div className="p-6 flex flex-col flex-grow">
                        <Link href={`/${product.slug ? `product/${product.slug}` : "#"}`}>
                          <h3 className="font-semibold text-lg text-black mb-2 group-hover:text-gray-600 transition-colors cursor-pointer line-clamp-2 h-14 leading-7">
                            {product.title}
                          </h3>
                        </Link>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10 leading-5">{product.description}</p>

                        <div className="flex items-center gap-2 mb-4 h-8">
                          <span className="text-2xl font-bold text-black">${price.toFixed(2)}</span>
                          {hasDiscount && compareAtPrice != null && (
                            <>
                              <span className="text-lg text-gray-500 line-through">
                                ${compareAtPrice.toFixed(2)}
                              </span>
                              <Badge variant="secondary" className="bg-gray-100 text-black text-xs">
                                {Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% OFF
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="mt-auto">
                          <Button
                            type="button"
                            className="w-full bg-black text-white hover:bg-black/90"
                            onClick={(e) => handleAddToCart(product, e)}
                            disabled={addingProducts.has(String(product.id))}
                          >
                            {addingProducts.has(String(product.id)) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Favorite"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
