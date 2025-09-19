"use client"

import { Shirt, Watch, Headphones, Gamepad2, Camera, Coffee, Package, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCategories } from "@/hooks/use-strapi"

const defaultIcons = [Shirt, Watch, Headphones, Gamepad2, Camera, Coffee, Package, Star]



export function Categories() {
  const { categories, loading, error } = useCategories()

  // Check if Strapi is configured
  const isStrapiConfigured = !!process.env.NEXT_PUBLIC_STRAPI_URL

  // Show loading only for configured stores
  if (loading && isStrapiConfigured) {
    return (
      <section id="categories-section" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      </section>
    )
  }

  // Determine which categories to show
  const categoriesToShow = isStrapiConfigured && categories.length > 0 ? categories.slice(0, 8) : []

  return (
    <section id="categories-section" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">Shop by Category</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isStrapiConfigured && categories.length > 0
              ? "Explore our curated categories from your store"
              : "Sample categories - connect your CMS to see real categories"}
          </p>
          {!isStrapiConfigured && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mt-2">
              Demo Mode
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {categoriesToShow.length === 0 ? (
            // Skeleton loading state
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))
          ) : (
            categoriesToShow.map((category: any, index: number) => {
              const isRealCategory = isStrapiConfigured && categories.length > 0

              let IconComponent
              let categoryData

              if (isRealCategory) {
                IconComponent = defaultIcons[index % defaultIcons.length]
                categoryData = {
                  id: String(category.id),
                  title: category.name,
                  slug: category.slug,
                }
              } else {
                IconComponent = category.icon
                categoryData = {
                  id: category.id,
                  title: category.title,
                  slug: category.slug,
                }
              }

              return (
                <a
                  key={categoryData.id}
                  href={isRealCategory ? `/products?collection=${categoryData.slug}` : "#"}
                  className="group cursor-pointer"
                  onClick={
                    !isRealCategory
                      ? (e) => {
                          e.preventDefault()
                          alert("This is a demo. Connect your CMS to browse real categories!")
                        }
                      : undefined
                  }
                >
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center hover:border-black transition-all duration-300 relative">
                    {!isStrapiConfigured && (
                      <Badge variant="secondary" className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs">
                        Demo
                      </Badge>
                    )}

                    <IconComponent className="w-12 h-12 mx-auto mb-4 text-black group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="font-semibold text-lg text-black">{categoryData.title}</h3>
                  </div>
                </a>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
