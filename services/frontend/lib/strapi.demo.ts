// Demo mode data provider - reads from local JSON file
import type { StrapiProduct, StrapiCategory, StrapiImage } from "./strapi"
import demoData from "../demo/assets.json"

// Type for the new data schema from extractor tool
interface ExtractorAsset {
	assetId: string
	title: string
	slug: string
	shortDescription?: string
	description?: string
	price?: number
	points?: number
	compareAtPrice?: number
	available?: string | boolean
	rating?: number | null
	thumbnail?: string
	category?: string
	publisher?: {
		name: string
		url?: string
		slug?: string
	}
	productUrl?: string
	sourceFile?: string
	status?: string
	visibility?: string
	createdAt?: string
	updatedAt?: string
	searchQuery?: string
	matchConfidence?: number
}

// Cache for extracted categories
let cachedCategories: StrapiCategory[] | null = null

// Transform extractor asset to StrapiProduct format
function transformDemoProduct(asset: ExtractorAsset): StrapiProduct {
	// Handle thumbnail - create images array from single thumbnail
	const images: StrapiImage[] = asset.thumbnail
		? [
				{
					id: `${asset.assetId}-thumb`,
					url: asset.thumbnail,
					alternativeText: asset.title,
				},
		  ]
		: []

	// Handle category - create categories array from single category string
	const categories = asset.category
		? [
				{
					id: asset.category,
					name: asset.category.charAt(0).toUpperCase() + asset.category.slice(1),
					slug: asset.category,
				},
		  ]
		: []

	// Handle publisher
	const publisher = asset.publisher
		? {
				id: asset.publisher.slug || asset.publisher.name.toLowerCase().replace(/\s+/g, "-"),
				name: asset.publisher.name,
				slug: asset.publisher.slug || asset.publisher.name.toLowerCase().replace(/\s+/g, "-"),
		  }
		: null

	// Handle available field - convert string "N/A" to null
	let availableForSale: boolean | null = null
	if (typeof asset.available === "boolean") {
		availableForSale = asset.available
	} else if (asset.available && asset.available !== "N/A") {
		availableForSale = asset.available === "true" || asset.available === "yes"
	}

	return {
		id: asset.assetId,
		title: asset.title,
		slug: asset.slug,
		description: asset.description || null,
		shortDescription: asset.shortDescription || null,
		price: asset.price ?? null,
		compareAtPrice: asset.compareAtPrice ?? null,
		availableForSale,
		images,
		categories,
		publisher,
		metadata: {
			assetId: asset.assetId,
			points: asset.points,
			productUrl: asset.productUrl,
			sourceFile: asset.sourceFile,
		},
	}
}

// Extract unique categories from assets
function extractCategories(): StrapiCategory[] {
	if (cachedCategories) return cachedCategories

	const assets = demoData.assets as ExtractorAsset[]
	const categoryMap = new Map<string, StrapiCategory>()

	assets.forEach(asset => {
		if (asset.category) {
			const slug = asset.category
			if (!categoryMap.has(slug)) {
				categoryMap.set(slug, {
					id: slug,
					name: asset.category.charAt(0).toUpperCase() + asset.category.slice(1),
					slug: slug,
					description: null,
				})
			}
		}
	})

	cachedCategories = Array.from(categoryMap.values())
	return cachedCategories
}

// Public API functions

export function getDemoProducts(limit = 20): StrapiProduct[] {
	const assets = demoData.assets as ExtractorAsset[]
	return assets.slice(0, limit).map(transformDemoProduct)
}

export function getDemoProductBySlug(slug: string): StrapiProduct | null {
	const assets = demoData.assets as ExtractorAsset[]
	const asset = assets.find(a => a.slug === slug)
	return asset ? transformDemoProduct(asset) : null
}

export function getDemoCategories(limit = 10): StrapiCategory[] {
	const categories = extractCategories()
	return categories.slice(0, limit)
} 