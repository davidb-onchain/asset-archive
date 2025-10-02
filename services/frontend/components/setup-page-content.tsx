"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { checkStrapiConnection, isStrapiConfigured, getEffectiveBaseUrl, getEffectiveApiToken } from "@/lib/strapi"

export function SetupPageContent() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)
  const router = useRouter()

  // Check configuration status on mount and test actual connection
  useEffect(() => {
    const checkConfig = async () => {
      const configured = isStrapiConfigured()
      setIsConfigured(configured)
      
      if (configured) {
        setUrl(getEffectiveBaseUrl() || "")
        const currentToken = getEffectiveApiToken()
        setToken(currentToken || "")
        
        // Test the actual connection to Strapi
        try {
          const result = await checkStrapiConnection()
          setIsConnected(result.ok)
          // Don't show error on initial page load, only update the state
        } catch (err) {
          setIsConnected(false)
        }
      } else {
        setUrl("")
        setToken("")
        setIsConnected(false)
      }
    }

    checkConfig()

    const handleStorageChange = () => checkConfig()
    window.addEventListener("storage", handleStorageChange)
    
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleConnect = async () => {
    if (!url.trim()) return

    setIsConnecting(true)
    setConnectionError(null)
    setConnectionSuccess(false)

    try {
      // Set the overrides first, then test connection
      localStorage.setItem("STRAPI_URL_OVERRIDE", url)
      if (token) {
        localStorage.setItem("STRAPI_TOKEN_OVERRIDE", token)
      }
      
      const result = await checkStrapiConnection()
      const success = result.ok
      
      if (success) {
        setIsConnected(true)
        setConnectionSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 800)
      } else {
        setIsConnected(false)
        setConnectionError(result.message || "Failed to connect. Please check your URL and token.")
      }
    } catch (error) {
      setIsConnected(false)
      setConnectionError(error instanceof Error ? error.message : "Connection failed")
      localStorage.removeItem("STRAPI_URL_OVERRIDE")
      localStorage.removeItem("STRAPI_TOKEN_OVERRIDE")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          <CardTitle className="text-xl">Strapi Connection</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        {isConfigured && isConnected && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Connected to Strapi</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                URL: {getEffectiveBaseUrl()}
              </p>
            </div>
        )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Connect your Strapi CMS to display real content instead of demo data.
              </p>
            </div>

        {connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{connectionError}</span>
            </div>
          </div>
        )}

        {connectionSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">Connection successful! Redirecting...</p>
          </div>
        )}

        {/* Single Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
              Strapi URL {!isConfigured && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:1337"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token (Optional)
                </label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Your Strapi API token"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for public content only
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={!url.trim() || isConnecting}
                className="bg-black text-white hover:bg-black/90 w-full"
              >
            {isConnecting ? "Testing..." : isConfigured ? "Update Connection" : "Connect"}
              </Button>
            </div>

        {/* Help Text */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <strong>Need help?</strong>{" "}
                <a 
                  href="https://docs.strapi.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  View Strapi docs <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              </p>
            </div>
      </CardContent>
    </Card>
  )
} 