"use client"

import { SetupPageContent } from "@/components/setup-page-content"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()

  // Redirect to homepage if in demo mode
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      router.push("/")
    }
  }, [router])

  // Don't render anything if in demo mode (redirect is in progress)
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-4">CMS Setup</h1>
          <p className="text-gray-600">Configure your Strapi CMS connection to manage content</p>
        </div>
        
        <SetupPageContent />
      </div>
    </div>
  )
} 