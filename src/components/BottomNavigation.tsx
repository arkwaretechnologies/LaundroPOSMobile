import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../context/StoreContext'
import { isFeatureEnabled } from '../utils/featureFlags'

interface TabItem {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  badge?: number
  badgeColor?: string
}

interface BottomNavigationProps {
  activeTab: string
  onTabPress: (tabId: string) => void
  ordersBadge?: number
  settingsBadge?: number
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  ordersBadge = 0,
  settingsBadge = 0
}) => {
  const { currentStore } = useStore()
  const insets = useSafeAreaInsets()
  
  // Debug logging
  console.log('🔍 BottomNavigation - Current Store:', currentStore?.name)
  console.log('🔍 BottomNavigation - Store Features:', currentStore?.features)
  
  const showInventory = isFeatureEnabled(currentStore as any, 'inventory_tracking')
  console.log('🔍 BottomNavigation - Show Inventory Tab:', showInventory)

  const baseTabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'home-outline'
    },
    {
      id: 'pos',
      label: 'POS',
      icon: 'cart-outline'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'list-outline',
      badge: ordersBadge,
      badgeColor: '#ef4444'
    },
  ]

  // Conditionally add inventory tab
  const inventoryTab: TabItem = {
    id: 'inventory',
    label: 'Inventory',
    icon: 'cube-outline'
  }

  const endTabs: TabItem[] = [
    {
      id: 'reports',
      label: 'Reports',
      icon: 'analytics-outline'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-outline',
      badge: settingsBadge,
      badgeColor: '#3b82f6'
    }
  ]

  // Build tabs array conditionally
  const tabs: TabItem[] = showInventory 
    ? [...baseTabs, inventoryTab, ...endTabs]
    : [...baseTabs, ...endTabs]

  const renderBadge = (badge?: number, badgeColor?: string) => {
    if (!badge || badge === 0) return null
    
    return (
      <View style={[styles.badge, { backgroundColor: badgeColor || '#ef4444' }]}>
        <Text style={styles.badgeText}>
          {badge > 99 ? '99+' : badge.toString()}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { bottom: insets.bottom }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={tab.icon}
                size={24}
                color={activeTab === tab.id ? '#3b82f6' : '#6b7280'}
              />
              {renderBadge(tab.badge, tab.badgeColor)}
            </View>
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? '#3b82f6' : '#6b7280' }
            ]}>
              {tab.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})

export default BottomNavigation
