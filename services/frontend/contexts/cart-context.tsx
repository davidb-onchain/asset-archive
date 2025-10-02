"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react"

/**
 * Favorites Context (formerly Cart Context)
 * 
 * This context manages the user's favorited assets. While the naming conventions
 * (CartItem, useCart, etc.) are retained for backward compatibility, the functionality
 * has been simplified to support favorites rather than shopping cart operations.
 * 
 * Key simplifications:
 * - Quantity is always treated as 1 for favorites (no multiple quantities)
 * - No checkout URL or payment processing
 * - Items are stored locally and persist across sessions
 */

export interface CartItem {
  id: string
  cartLineId?: string
  name: string
  price: number
  image: string
  quantity: number
  handle: string
}

interface CartState {
  cartId: string | null
  items: CartItem[]
  isOpen: boolean
  total: number
  itemCount: number
  checkoutUrl: string | null
  loading: boolean
  error: string | null
}

type CartAction =
  | { type: "SET_ITEMS"; payload: CartItem[] }
  | { type: "ADD_ITEM_OPTIMISTIC"; payload: Omit<CartItem, "cartLineId" | "quantity"> }
  | { type: "REMOVE_ITEM_OPTIMISTIC"; payload: string } // payload is cartLineId
  | { type: "UPDATE_QUANTITY_OPTIMISTIC"; payload: { cartLineId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }

const initialState: CartState = {
  cartId: null,
  items: [],
  isOpen: false,
  total: 0,
  itemCount: 0,
  checkoutUrl: null,
  loading: false,
  error: null,
}

function calculateTotals(items: CartItem[]) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return { total, itemCount }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_ITEMS": {
      const { total, itemCount } = calculateTotals(action.payload)
      return {
        ...state,
        items: action.payload,
        total,
        itemCount,
        loading: false,
        error: null,
      }
    }

    case "ADD_ITEM_OPTIMISTIC": {
      const { id } = action.payload
      const existingItem = state.items.find((item) => item.id === id)

      let newItems: CartItem[]
      if (existingItem) {
        newItems = state.items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        const cartLineId = `line-${Date.now()}-${Math.random().toString(36).slice(2)}`
        newItems = [...state.items, { ...action.payload, quantity: 1, cartLineId }]
      }

      const { total, itemCount } = calculateTotals(newItems)

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      }
    }

    case "REMOVE_ITEM_OPTIMISTIC": {
      const newItems = state.items.filter((item) => item.cartLineId !== action.payload)
      const { total, itemCount } = calculateTotals(newItems)

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      }
    }

    case "UPDATE_QUANTITY_OPTIMISTIC": {
      const { cartLineId, quantity } = action.payload
      const newItems = state.items
        .map((item) => (item.cartLineId === cartLineId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0)

      const { total, itemCount } = calculateTotals(newItems)

      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      }
    }

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
        checkoutUrl: null,
      }

    case "TOGGLE_CART":
      return {
        ...state,
        isOpen: !state.isOpen,
      }

    case "OPEN_CART":
      return {
        ...state,
        isOpen: true,
      }

    case "CLOSE_CART":
      return {
        ...state,
        isOpen: false,
      }

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      }

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      }

    default:
      return state
  }
}

const STORAGE_OLD_KEY = "local_cart_v1" // Legacy key for migration
const STORAGE_KEY = "favorites_v1"

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addItem: (item: Omit<CartItem, "cartLineId" | "quantity">, quantity?: number) => Promise<void>
  removeItem: (cartLineId: string) => Promise<void>
  updateItemQuantity: (cartLineId: string, quantity: number) => Promise<void>
  /** @deprecated use clearCart instead */
  clearShopifyCart: () => Promise<void>
  clearCart: () => Promise<void>
} | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from storage only after hydration (client-side only)
  useEffect(() => {
    setIsHydrated(true)
    try {
      const rawNew = localStorage.getItem(STORAGE_KEY)
      const rawOld = localStorage.getItem(STORAGE_OLD_KEY)
      const raw = rawNew ?? rawOld
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: CartItem[] }
        const items = Array.isArray(parsed.items) ? parsed.items : []
        dispatch({ type: "SET_ITEMS", payload: items })
      } else {
        dispatch({ type: "SET_ITEMS", payload: [] })
      }
    } catch (err) {
      console.error("Failed to load favorites from storage:", err)
      dispatch({ type: "SET_ITEMS", payload: [] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist favorites to storage (write to new key only) - only after hydration
  useEffect(() => {
    if (!isHydrated) return // Don't persist during SSR/initial hydration
    
    try {
      const payload = JSON.stringify({ items: state.items })
      localStorage.setItem(STORAGE_KEY, payload)
    } catch (err) {
      console.error("Failed to persist favorites to storage:", err)
    }
  }, [state.items, isHydrated])

  const addItem = useCallback(async (item: Omit<CartItem, "cartLineId" | "quantity">, quantity = 1) => {
    // For favorites, we ignore the quantity parameter and always add/toggle a single item
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })
    try {
        dispatch({ type: "ADD_ITEM_OPTIMISTIC", payload: item })
    } catch (err) {
      console.error("Failed to add item to favorites:", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to add item" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  const removeItem = useCallback(async (cartLineId: string) => {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })
    try {
      dispatch({ type: "REMOVE_ITEM_OPTIMISTIC", payload: cartLineId })
    } catch (err) {
      console.error("Failed to remove item from favorites:", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to remove item" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  const updateItemQuantity = useCallback(async (cartLineId: string, quantity: number) => {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })
    try {
      dispatch({ type: "UPDATE_QUANTITY_OPTIMISTIC", payload: { cartLineId, quantity } })
    } catch (err) {
      console.error("Failed to update quantity in favorites:", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to update quantity" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  const clearCart = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "SET_ERROR", payload: null })
    try {
      dispatch({ type: "CLEAR_CART" })
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_OLD_KEY)
    } catch (err) {
      console.error("Failed to clear favorites:", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to clear favorites" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  // Deprecated alias for backward compatibility
  const clearShopifyCart = clearCart

  return (
    <CartContext.Provider value={{ state, dispatch, addItem, removeItem, updateItemQuantity, clearShopifyCart, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
