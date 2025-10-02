// Strapi API client and data types

const STRAPI_BASE_URL_ENV = process.env.NEXT_PUBLIC_STRAPI_URL || ""
const STRAPI_API_TOKEN_ENV = process.env.STRAPI_API_TOKEN || ""

// Ensure base URL has no trailing slash
function normalizeBaseUrl(url: string): string {
	if (!url) return ""
	return url.endsWith("/") ? url.slice(0, -1) : url
}

function readOverride(key: string): string {
	try {
		if (typeof window === "undefined") return ""
		const raw = window.localStorage.getItem(key) || ""
		return raw
	} catch {
		return ""
	}
}

function readOverrideBaseUrl(): string {
	return readOverride("STRAPI_URL_OVERRIDE")
}

function readOverrideToken(): string {
	return readOverride("STRAPI_TOKEN_OVERRIDE")
}

export function getEffectiveBaseUrl(): string {
	const override = readOverrideBaseUrl()
	const base = override || STRAPI_BASE_URL_ENV
	return normalizeBaseUrl(base)
}

export function getEffectiveApiToken(): string {
	const override = readOverrideToken()
	return override || STRAPI_API_TOKEN_ENV
}

export function isStrapiConfigured(): boolean {
	const override = readOverrideBaseUrl()
	return Boolean(override || STRAPI_BASE_URL_ENV)
}

// Resolve Strapi media URL (handles relative URLs)
export function resolveMediaUrl(url?: string | null): string {
	if (!url) return ""
	if (url.startsWith("http://") || url.startsWith("https://")) return url
	const base = getEffectiveBaseUrl()
	if (!base) return url
	return `${base}${url.startsWith("/") ? url : `/${url}`}`
}

// ---------- Types reflecting Strapi content types ----------

export interface StrapiImage {
	id: number | string
	url: string
	alternativeText?: string | null
}

export interface StrapiCategory {
	id: number | string
	name: string
	slug: string
	description?: string | null
	parent?: { id: number | string; name: string; slug: string } | null
	children?: Array<{ id: number | string; name: string; slug: string }>
}

export interface StrapiPublisher {
	id: number | string
	name: string
	slug?: string
}

export interface StrapiProduct {
	id: number | string
	title: string
	slug: string
	description?: string | null
	shortDescription?: string | null
	price?: number | null
	compareAtPrice?: number | null
	availableForSale?: boolean | null
	images: StrapiImage[]
	categories?: StrapiCategory[]
	publisher?: StrapiPublisher | null
	metadata?: Record<string, unknown>
}

// ---------- Low-level fetch helper ----------

type StrapiRequestOptions = {
	path: string
	query?: Record<string, string | number | boolean | undefined | null>
	headers?: Record<string, string>
	cache?: RequestCache
}

function toQueryString(params: StrapiRequestOptions["query"]): string {
	if (!params) return ""
	const searchParams = new URLSearchParams()
	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null) return
		searchParams.append(key, String(value))
	})
	const qs = searchParams.toString()
	return qs ? `?${qs}` : ""
}

async function strapiFetch<T>({ path, query, headers, cache = "no-store" }: StrapiRequestOptions): Promise<T> {
	const base = getEffectiveBaseUrl()
	if (!base) {
		throw new Error("Strapi base URL is not configured. Please set NEXT_PUBLIC_STRAPI_URL or use the in-app connector.")
	}

	const url = `${base}${path}${toQueryString(query)}`
	const token = getEffectiveApiToken()
	const res = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...headers,
		},
		cache,
	})

	if (!res.ok) {
		const body = await res.text().catch(() => "")
		throw new Error(`Strapi HTTP error ${res.status}: ${body}`)
	}

	return (await res.json()) as T
}

// ---------- Response mapping helpers ----------

type StrapiListResponse<T> = {
	data: Array<{
		id: number
		attributes: any
	}>
	meta?: any
}

type StrapiSingleResponse<T> = {
	data: { id: number; attributes: any } | null
	meta?: any
}

function mapImages(attrImages: any): StrapiImage[] {
	const filesArray = Array.isArray(attrImages) ? attrImages : attrImages?.data
	if (!filesArray || !Array.isArray(filesArray)) return []
	return filesArray
		.map((file: any) => {
			const id = file?.id
			const attrs = file?.attributes ?? file ?? {}
			const url = resolveMediaUrl(attrs?.url)
			const alternativeText = attrs?.alternativeText ?? null
			if (!url) return null
			return { id, url, alternativeText }
		})
		.filter(Boolean) as StrapiImage[]
}

function mapCategories(attrCategories: any): StrapiCategory[] {
	const itemsArray = Array.isArray(attrCategories) ? attrCategories : attrCategories?.data
	if (!itemsArray || !Array.isArray(itemsArray)) return []
	return itemsArray.map((item: any) => {
		const attrs = item?.attributes ?? item ?? {}
		return {
			id: item?.id ?? attrs?.id ?? String(attrs?.slug ?? ""),
			name: attrs?.name,
			slug: attrs?.slug,
			description: attrs?.description ?? null,
		}
	})
}

function mapPublisher(attrPublisher: any): StrapiPublisher | null {
	const item = attrPublisher?.data ?? attrPublisher
	if (!item) return null
	const attrs = item?.attributes ?? item ?? {}
	return {
		id: item?.id ?? attrs?.id ?? attrs?.slug ?? "publisher",
		name: attrs?.name,
		slug: attrs?.slug,
	}
}

function mapProduct(node: any): StrapiProduct {
	const a = node?.attributes ?? node ?? {}
	return {
		id: node?.id ?? a?.id ?? String(a?.slug ?? ""),
		title: a?.title ?? "Untitled",
		slug: a?.slug ?? "",
		description: a?.description ?? null,
		shortDescription: a?.shortDescription ?? null,
		price: a?.price != null ? Number(a.price) : null,
		compareAtPrice: a?.compareAtPrice != null ? Number(a.compareAtPrice) : null,
		availableForSale: a?.availableForSale ?? null,
		images: mapImages(a?.images),
		categories: mapCategories(a?.categories),
		publisher: mapPublisher(a?.publisher),
		metadata: a?.metadata ?? undefined,
	}
}

function mapCategory(node: any): StrapiCategory {
	const a = node?.attributes ?? {}
	return {
		id: node.id,
		name: a.name,
		slug: a.slug,
		description: a.description ?? null,
	}
}

// ---------- Public API ----------

/**
 * Fetch products from Strapi
 * - Includes media and relations where useful
 * - Returns empty array if Strapi is unavailable (graceful degradation)
 * - In DEMO_MODE, returns data from local JSON file
 */
export async function getProducts(limit = 20): Promise<StrapiProduct[]> {
	// Check for demo mode
	if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
		const { getDemoProducts } = await import('./strapi.demo')
		return getDemoProducts(limit)
	}

	try {
		// Populate media and relations commonly needed by UI
		const publicationState = getEffectiveApiToken() ? "preview" : "live"
		const query = {
			"pagination[limit]": limit,
			"publicationState": publicationState,
			// Media: request explicit fields
			"populate[images][fields][0]": "url",
			"populate[images][fields][1]": "alternativeText",
			// Relations: request explicit fields
			"populate[categories][fields][0]": "name",
			"populate[categories][fields][1]": "slug",
			"populate[publisher][fields][0]": "name",
			"populate[publisher][fields][1]": "slug",
			"sort[0]": "createdAt:desc",
		}

		const json = await strapiFetch<StrapiListResponse<any>>({ path: "/api/products", query })
		return (json.data || []).map(mapProduct)
	} catch (error) {
		console.warn('Failed to fetch products from Strapi:', error instanceof Error ? error.message : error)
		return [] // Return empty array instead of throwing
	}
}

/**
 * Fetch a single product by slug
 * - Returns null if Strapi is unavailable (graceful degradation)
 * - In DEMO_MODE, returns data from local JSON file
 */
export async function getProductBySlug(slug: string): Promise<StrapiProduct | null> {
	// Check for demo mode
	if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
		const { getDemoProductBySlug } = await import('./strapi.demo')
		return getDemoProductBySlug(slug)
	}

	try {
		const publicationState = getEffectiveApiToken() ? "preview" : "live"
		const query = {
			"filters[slug][$eq]": slug,
			"publicationState": publicationState,
			// Media and relations
			"populate[images][fields][0]": "url",
			"populate[images][fields][1]": "alternativeText",
			"populate[categories][fields][0]": "name",
			"populate[categories][fields][1]": "slug",
			"populate[publisher][fields][0]": "name",
			"populate[publisher][fields][1]": "slug",
			"pagination[limit]": 1,
		}

		const json = await strapiFetch<StrapiListResponse<any>>({ path: "/api/products", query })
		const first = json.data?.[0]
		return first ? mapProduct(first) : null
	} catch (error) {
		console.warn('Failed to fetch product from Strapi:', error instanceof Error ? error.message : error)
		return null // Return null instead of throwing
	}
}

/**
 * Fetch categories (collections equivalent)
 * - Returns empty array if Strapi is unavailable (graceful degradation)
 * - In DEMO_MODE, returns data from local JSON file
 */
export async function getCategories(limit = 10): Promise<StrapiCategory[]> {
	// Check for demo mode
	if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
		const { getDemoCategories } = await import('./strapi.demo')
		return getDemoCategories(limit)
	}

	try {
		const query = {
			"pagination[limit]": limit,
			"sort[0]": "name:asc",
		}
		const json = await strapiFetch<StrapiListResponse<any>>({ path: "/api/categories", query })
		return (json.data || []).map(mapCategory)
	} catch (error) {
		console.warn('Failed to fetch categories from Strapi:', error instanceof Error ? error.message : error)
		return [] // Return empty array instead of throwing
	}
}

/**
 * Health check to verify Strapi connectivity
 */
export async function checkStrapiConnection(): Promise<{ ok: boolean; message?: string }> {
	try {
		await strapiFetch<{ data: any[] }>({ path: "/api/products", query: { "pagination[limit]": 1 }, cache: "no-store" })
		return { ok: true }
	} catch (err) {
		return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
	}
} 