import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { useStore } from '../context/StoreContext'

const VIEWED_ORDERS_KEY_PREFIX = '@viewed_orders_'

interface NotificationBadges {
  ordersBadge: number
  settingsBadge: number
  refreshBadges: () => Promise<void>
  markOrdersAsViewed: (orderIds: string[]) => Promise<void>
}

/**
 * Hook to manage notification badges for bottom navigation
 * Tracks new orders that haven't been viewed yet
 */
export const useNotificationBadges = (): NotificationBadges => {
  const { currentStore } = useStore()
  const [ordersBadge, setOrdersBadge] = useState(0)
  const [settingsBadge, setSettingsBadge] = useState(0)

  /**
   * Get viewed order IDs from storage (per store)
   */
  const getViewedOrders = useCallback(async (storeId?: string): Promise<Set<string>> => {
    if (!storeId) return new Set<string>()
    
    try {
      const key = `${VIEWED_ORDERS_KEY_PREFIX}${storeId}`
      const viewedJson = await AsyncStorage.getItem(key)
      if (viewedJson) {
        const viewedArray = JSON.parse(viewedJson) as string[]
        return new Set(viewedArray)
      }
      return new Set<string>()
    } catch (error) {
      console.error('Error getting viewed orders:', error)
      return new Set<string>()
    }
  }, [])

  /**
   * Mark orders as viewed (per store)
   */
  const markOrdersAsViewed = useCallback(async (orderIds: string[], storeId?: string) => {
    if (!storeId) return
    
    try {
      const key = `${VIEWED_ORDERS_KEY_PREFIX}${storeId}`
      const viewedSet = await getViewedOrders(storeId)
      orderIds.forEach(id => viewedSet.add(id))
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(viewedSet)))
    } catch (error) {
      console.error('Error marking orders as viewed:', error)
    }
  }, [getViewedOrders])

  /**
   * Calculate badge counts for new/unread orders
   */
  const calculateBadges = useCallback(async () => {
    if (!currentStore) {
      setOrdersBadge(0)
      setSettingsBadge(0)
      return
    }

    try {
      // Get viewed orders for this store
      const viewedOrders = await getViewedOrders(currentStore.id)

      // Fetch orders that need attention (new orders, ready orders, unpaid orders)
      // Consider orders as "new" if they are:
      // 1. Created today and not viewed
      // 2. Status is "ready" (ready for pickup) and not viewed
      // 3. Have unpaid balance and not viewed

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      // Get orders that need attention (active orders, ready orders, or orders created today)
      // Fetch active orders and ready orders (ready orders can be from any date)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_status, payment_status, order_date, balance')
        .eq('store_id', currentStore.id)
        .or(`order_status.eq.ready,order_status.eq.pending,order_status.eq.in_progress`)
        .order('order_date', { ascending: false })
        .limit(100) // Limit to recent orders for performance

      if (ordersError) {
        console.error('Error fetching orders for badges:', ordersError)
        setOrdersBadge(0)
        return
      }

      if (!orders || orders.length === 0) {
        setOrdersBadge(0)
        return
      }

      // Filter for new/unread orders
      const newOrders = orders.filter(order => {
        // If already viewed, don't count
        if (viewedOrders.has(order.id)) {
          return false
        }

        // Count orders that need attention:
        // 1. Ready for pickup
        // 2. Created today (new orders)
        // 3. Has unpaid balance

        const orderDate = new Date(order.order_date)
        const isToday = orderDate >= today && orderDate <= endOfDay
        const isReady = order.order_status === 'ready'
        const hasUnpaidBalance = order.balance > 0

        return isReady || isToday || hasUnpaidBalance
      })

      setOrdersBadge(newOrders.length)

      // Settings badge: currently 0 (can be extended for settings notifications)
      setSettingsBadge(0)

      console.log(`📊 Badge counts - Orders: ${newOrders.length}, Settings: 0`)
    } catch (error) {
      console.error('Error calculating badges:', error)
      setOrdersBadge(0)
      setSettingsBadge(0)
    }
  }, [currentStore, getViewedOrders])

  /**
   * Refresh badges manually
   */
  const refreshBadges = useCallback(async () => {
    await calculateBadges()
  }, [calculateBadges])

  /**
   * Load badges when store changes
   */
  useEffect(() => {
    if (currentStore) {
      // Calculate badges when store is set
      calculateBadges()
      
      // Refresh badges every 30 seconds to check for new orders
      const interval = setInterval(() => {
        calculateBadges()
      }, 30000)

      return () => clearInterval(interval)
    } else {
      setOrdersBadge(0)
      setSettingsBadge(0)
    }
  }, [currentStore, calculateBadges])

  return {
    ordersBadge,
    settingsBadge,
    refreshBadges,
    markOrdersAsViewed: async (orderIds: string[]) => {
      if (currentStore) {
        await markOrdersAsViewed(orderIds, currentStore.id)
        // Refresh badges after marking as viewed
        await calculateBadges()
      }
    },
  }
}


