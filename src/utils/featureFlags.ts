/**
 * Feature Flags System
 * 
 * This utility helps manage store-specific features.
 * Each store can enable/disable features independently.
 */

export interface StoreFeatures {
  inventory_tracking: boolean
  loyalty_points: boolean
  sms_notifications: boolean
  email_receipts: boolean
  advanced_reporting: boolean
  delivery_tracking: boolean
  multiple_currencies: boolean
  tax_calculation: boolean
}

export interface StoreSettings {
  currency: string
  currency_symbol: string
  tax_rate: number
  loyalty_points_rate: number
  low_stock_threshold: number
}

export interface StoreWithFeatures {
  id: string
  name: string
  address: string
  features: StoreFeatures
  settings: StoreSettings
}

/**
 * Check if a specific feature is enabled for a store
 */
export const isFeatureEnabled = (
  store: StoreWithFeatures | null,
  featureName: keyof StoreFeatures
): boolean => {
  if (!store || !store.features) return false
  return store.features[featureName] === true
}

/**
 * Get a store setting value
 */
export const getStoreSetting = <K extends keyof StoreSettings>(
  store: StoreWithFeatures | null,
  settingName: K
): StoreSettings[K] | null => {
  if (!store || !store.settings) return null
  return store.settings[settingName]
}

/**
 * Check multiple features at once
 */
export const hasAllFeatures = (
  store: StoreWithFeatures | null,
  features: Array<keyof StoreFeatures>
): boolean => {
  return features.every(feature => isFeatureEnabled(store, feature))
}

/**
 * Check if any of the features are enabled
 */
export const hasAnyFeature = (
  store: StoreWithFeatures | null,
  features: Array<keyof StoreFeatures>
): boolean => {
  return features.some(feature => isFeatureEnabled(store, feature))
}

/**
 * Get all enabled features for a store
 */
export const getEnabledFeatures = (
  store: StoreWithFeatures | null
): Array<keyof StoreFeatures> => {
  if (!store || !store.features) return []
  return Object.keys(store.features).filter(
    key => store.features[key as keyof StoreFeatures] === true
  ) as Array<keyof StoreFeatures>
}

/**
 * Default features for new stores
 */
export const DEFAULT_FEATURES: StoreFeatures = {
  inventory_tracking: false,
  loyalty_points: false,
  sms_notifications: false,
  email_receipts: false,
  advanced_reporting: false,
  delivery_tracking: false,
  multiple_currencies: false,
  tax_calculation: false,
}

/**
 * Default settings for new stores
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  currency: 'PHP',
  currency_symbol: '₱',
  tax_rate: 0,
  loyalty_points_rate: 1,
  low_stock_threshold: 10,
}

