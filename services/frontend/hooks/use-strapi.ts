"use client"

import { useEffect, useState } from "react"
import { getProducts, getProductBySlug, getCategories, type StrapiProduct, type StrapiCategory, isStrapiConfigured as isStrapiConfiguredFn } from "@/lib/strapi"

export function useProducts() {
  const [products, setProducts] = useState<StrapiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      // In demo mode, data fetching functions handle everything
      // In dev mode, only skip if not configured
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
      const configured = isStrapiConfiguredFn()
      
      if (!isDemoMode && !configured) {
        setProducts([])
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const data = await getProducts(20)
        setProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch products")
        // eslint-disable-next-line no-console
        console.error("Error fetching products:", err)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { products, loading, error }
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<StrapiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      if (!slug) return
      
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
      const configured = isStrapiConfiguredFn()
      
      if (!isDemoMode && !configured) {
        setProduct(null)
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const data = await getProductBySlug(slug)
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch product")
        // eslint-disable-next-line no-console
        console.error("Error fetching product:", err)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug])

  return { product, loading, error }
}

export function useCategories() {
  const [categories, setCategories] = useState<StrapiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
      const configured = isStrapiConfiguredFn()
      
      if (!isDemoMode && !configured) {
        setCategories([])
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const data = await getCategories(12)
        setCategories(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch categories")
        // eslint-disable-next-line no-console
        console.error("Error fetching categories:", err)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { categories, loading, error }
} 