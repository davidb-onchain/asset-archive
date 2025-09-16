import { parseShopifyDomain } from "./parse-shopify-domain"

export function getStoreName(): string {
  const rawUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  if (!rawUrl) {
    return "Shopify Template"
  }

  try {
    const hostname = new URL(rawUrl).hostname
    const base = hostname.replace(/^www\./, "").split(".")[0]
    const storeName = base
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")

    return storeName || "Store"
  } catch {
    return "Store"
  }
}
