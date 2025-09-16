import { parseShopifyDomain } from "./parse-shopify-domain"

export function getStoreName(): string {
  // 1. Check for an explicit site name override from environment variables
  const siteNameOverride = process.env.NEXT_PUBLIC_SITE_NAME
  if (siteNameOverride) {
    return siteNameOverride
  }

  // 2. Fallback to deriving the name from the Strapi URL
  const rawUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  if (!rawUrl) {
    return "Shopify Template" // Default if no URL is provided
  }

  try {
    const hostname = new URL(rawUrl).hostname

    // 3. Add a special check for IP addresses to avoid names like "127"
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return "Untitled" // Provide a sensible default for local development
    }

    // 4. Original logic for domain names
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
