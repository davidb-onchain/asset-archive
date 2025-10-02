"use client"

import { useEffect, useState } from "react"
import { isStrapiConfigured as isStrapiConfiguredServer } from "./strapi"

export function useIsStrapiConfigured(): boolean {
  const [configured, setConfigured] = useState<boolean>(() => {
    // On client during hydration, prefer localStorage to avoid flash
    if (typeof window !== "undefined") {
      try {
        const url = window.localStorage.getItem("STRAPI_URL_OVERRIDE") || ""
        return Boolean(url || process.env.NEXT_PUBLIC_STRAPI_URL)
      } catch {
        return Boolean(process.env.NEXT_PUBLIC_STRAPI_URL)
      }
    }
    // On server (or very early), mirror server-side result
    return isStrapiConfiguredServer()
  })

  useEffect(() => {
    try {
      const url = window.localStorage.getItem("STRAPI_URL_OVERRIDE") || ""
      setConfigured(Boolean(url || process.env.NEXT_PUBLIC_STRAPI_URL))
    } catch {
      setConfigured(Boolean(process.env.NEXT_PUBLIC_STRAPI_URL))
    }
  }, [])

  return configured
} 