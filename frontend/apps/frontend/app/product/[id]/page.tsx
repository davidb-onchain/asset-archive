import { ProductPageClient } from "@/components/product-page-client"
import { SetupTooltip } from "@/components/setup-tooltip"

export default function ProductPage({ params }: { params: { id: string } }) {
  // Server-side check for Strapi configuration
  const isStrapiConfigured = !!process.env.NEXT_PUBLIC_STRAPI_URL

  return (
    <>
      <ProductPageClient productHandle={params.id} />
      {/* Show setup tooltip only when Strapi is not configured */}
      {!isStrapiConfigured && <SetupTooltip />}
    </>
  )
}
