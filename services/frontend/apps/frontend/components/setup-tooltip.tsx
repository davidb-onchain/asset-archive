"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Store, Settings, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { checkStrapiConnection, isStrapiConfigured, getEffectiveBaseUrl, getEffectiveApiToken } from "@/lib/strapi"

export function SetupTooltip() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)

  // Check configuration status on mount and when localStorage changes
  useEffect(() => {
    const checkConfig = () => {
      const configured = isStrapiConfigured()
      setIsConfigured(configured)
      
      if (configured) {
        // Pre-fill current values when managing connection
        setUrl(getEffectiveBaseUrl() || "")
        const currentToken = getEffectiveApiToken()
        setToken(currentToken || "")
      } else {
        // Reset form when not configured
        setUrl("")
        setToken("")
      }
    }

    checkConfig()

    // Listen for storage changes (when user resets or connects)
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
      // Save configuration to localStorage
      localStorage.setItem("STRAPI_URL_OVERRIDE", url.trim())
      
      if (token.trim()) {
        localStorage.setItem("STRAPI_TOKEN_OVERRIDE", token.trim())
      } else {
        localStorage.removeItem("STRAPI_TOKEN_OVERRIDE")
      }

      // Test the connection
      const result = await checkStrapiConnection()
      
      if (!result.ok) {
        throw new Error(result.message || "Failed to connect to Strapi")
      }

      setConnectionSuccess(true)
      
      // Reload the page to apply the new configuration
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Connection failed")
      
      // Clear invalid configuration
      localStorage.removeItem("STRAPI_URL_OVERRIDE")
      localStorage.removeItem("STRAPI_TOKEN_OVERRIDE")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleResetToDemo = () => {
    localStorage.removeItem("STRAPI_URL_OVERRIDE")
    localStorage.removeItem("STRAPI_TOKEN_OVERRIDE")
    window.location.reload()
  }

  // In demo mode (not configured), do not render the floating button at all
  if (!isConfigured) {
    return null
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsOpen(true)} 
          className="bg-black text-white hover:bg-black/90 shadow-lg" 
          size="lg"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage CMS
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-2xl border-2 border-black">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              <CardTitle className="text-lg">
                {isConfigured ? "Strapi Connection" : "Connect to Strapi"}
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isConfigured ? (
            // Connected state
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">Connected to Strapi</p>
                <p className="text-xs text-green-700 mt-1">
                  URL: {getEffectiveBaseUrl()}
                </p>
                <p className="text-xs text-green-700">
                  Token: {getEffectiveApiToken() ? "Configured" : "Not set"}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-gray-300"
                  onClick={() => {
                    setIsConfigured(false)
                    setUrl(getEffectiveBaseUrl() || "")
                    setToken(getEffectiveApiToken() || "")
                  }}
                >
                  Edit Connection
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={handleResetToDemo}
                >
                  Reset to Demo Mode
                </Button>
              </div>
            </>
          ) : (
            // Connection form
            <>
              <p className="text-sm text-gray-600">
                Connect your Strapi CMS to see real products instead of demo data.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Strapi URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:1337"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    API Token (optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter API token for protected content"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {connectionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-800">{connectionError}</p>
                </div>
              )}

              {connectionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">Connection successful! Reloading...</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300"
                  onClick={() => setIsOpen(false)}
                  disabled={isConnecting}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleConnect}
                  disabled={!url.trim() || isConnecting}
                  className="bg-black text-white hover:bg-black/90 flex-1"
                  size="sm"
                >
                  {isConnecting ? "Testing..." : "Connect"}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 