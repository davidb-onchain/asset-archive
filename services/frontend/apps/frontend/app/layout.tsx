import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { CartProvider } from "@/contexts/cart-context"
import { CartDrawer } from "@/components/cart-drawer"
import { getStoreName } from "@/lib/store-name"

const inter = Inter({ subsets: ["latin"] })

// Generate dynamic metadata based on store name
const storeName = getStoreName()

export const metadata: Metadata = {
  title: `${storeName} - Modern E-commerce Store`,
  description: `Discover amazing products at ${storeName}. Quality, style, and innovation in every purchase.`,
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <Navbar />
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}
