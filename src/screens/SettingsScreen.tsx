import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStore } from '../context/StoreContext'
import PrinterConfigScreen from './PrinterConfigScreen'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'

interface SettingsScreenProps {
  navigation?: {
    navigate: (screen: string) => void
    goBack: () => void
  }
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { currentStore, availableStores, switchStore } = useStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [showServicesModal, setShowServicesModal] = useState(false)
  const [showStoreSwitchModal, setShowStoreSwitchModal] = useState(false)
  const [userData, setUserData] = useState<{
    firstName: string
    lastName: string
    email: string
    role: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPrinterConfig, setShowPrinterConfig] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('No user found')
        return
      }

      // Get user details from the users table
      const { data: userDetails, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, role')
        .eq('email', user.email)
        .single()

      if (error) {
        console.error('Error fetching user details:', error)
        return
      }

      setUserData({
        firstName: userDetails.first_name || 'User',
        lastName: userDetails.last_name || '',
        email: userDetails.email || user.email,
        role: userDetails.role || 'User'
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const settingsSections = [
    {
      title: 'Store Settings',
      items: [
        { icon: 'swap-horizontal', title: 'Switch Store', subtitle: currentStore?.name || 'Select a store', color: '#3b82f6', action: 'switchStore' },
        { icon: 'storefront', title: 'Store Information', subtitle: 'Business details', color: '#f59e0b' },
        { icon: 'pricetag', title: 'Services & Pricing', subtitle: 'Manage laundry services', color: '#10b981', action: 'services' },
        { icon: 'print', title: 'Printer Configuration', subtitle: 'Setup and select printer', color: '#8b5cf6', action: 'printer' },
        { icon: 'card', title: 'Payment Methods', subtitle: 'Accept payment types', color: '#ef4444', action: 'paymentMethods' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', title: 'Help Center', subtitle: 'FAQs and guides', color: '#3b82f6' },
        { icon: 'chatbubble', title: 'Contact Support', subtitle: 'Get help from our team', color: '#10b981' },
        { icon: 'cloud-download', title: 'Check for Updates', subtitle: `Version ${Constants.expoConfig?.version || '1.1.0'}`, color: '#06b6d4', action: 'checkUpdates' },
        { icon: 'document-text', title: 'Terms & Privacy', subtitle: 'Legal information', color: '#6b7280' },
        { icon: 'information-circle', title: 'About', subtitle: `Version ${Constants.expoConfig?.version || '1.1.0'}`, color: '#f59e0b' },
      ]
    }
  ]

  const handleSettingPress = (item: any) => {
    if (item.action === 'services' && navigation) {
      navigation.navigate('ServicesManagement')
    } else if (item.action === 'paymentMethods' && navigation) {
      navigation.navigate('PaymentMethods')
    } else if (item.action === 'printer') {
      setShowPrinterConfig(true)
    } else if (item.action === 'switchStore') {
      if (availableStores.length <= 1) {
        Alert.alert('Info', 'You only have access to one store.')
        return
      }
      setShowStoreSwitchModal(true)
    } else if (item.action === 'checkUpdates') {
      checkForUpdates()
    }
  }

  const handleStoreSwitch = (storeId: string) => {
    switchStore(storeId)
    setShowStoreSwitchModal(false)
    Alert.alert('Success', 'Store switched successfully')
  }

  const handleSignOut = async () => {
    console.log('Sign out button pressed')
    
    try {
      console.log('Calling supabase.auth.signOut()')
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        Alert.alert('Error', 'Failed to sign out. Please try again.')
      } else {
        console.log('Sign out successful')
        
        // Manually clear AsyncStorage
        try {
          await AsyncStorage.multiRemove([
            'supabase.auth.token',
            'sb-huwqsicrwqhxfinhpxsg-auth-token',
            'supabase.auth.session'
          ])
          console.log('AsyncStorage cleared')
        } catch (e) {
          console.log('AsyncStorage clear error:', e)
        }
      }
    } catch (error) {
      console.error('Sign out error:', error)
      Alert.alert('Error', 'Failed to sign out. Please try again.')
    }
  }

  const checkForUpdates = async () => {
    // Prevent multiple simultaneous checks
    if (checkingUpdate || downloadingUpdate) {
      return
    }

    try {
      setCheckingUpdate(true)

      // Check if in development mode
      if (__DEV__) {
        Alert.alert(
          'Updates Not Available',
          'Updates are only available in production builds. Please build the app using EAS Build to test updates.',
          [{ text: 'OK' }]
        )
        setCheckingUpdate(false)
        return
      }

      // Check for available updates
      // Note: Updates.isEnabled may be false for locally built APKs
      // We'll let the actual check handle errors gracefully
      const update = await Updates.checkForUpdateAsync()

      if (update.isAvailable) {
        // Update available - ask user if they want to download
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Would you like to download it now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setCheckingUpdate(false),
            },
            {
              text: 'Download',
              onPress: async () => {
                try {
                  setCheckingUpdate(false)
                  setDownloadingUpdate(true)

                  // Download the update
                  await Updates.fetchUpdateAsync()

                  setDownloadingUpdate(false)

                  // Ask user to reload
                  Alert.alert(
                    'Update Downloaded',
                    'The update has been downloaded successfully. The app will reload to apply the update.',
                    [
                      {
                        text: 'Reload Now',
                        onPress: () => {
                          Updates.reloadAsync()
                        },
                      },
                      {
                        text: 'Later',
                        style: 'cancel',
                      },
                    ]
                  )
                } catch (error: any) {
                  setDownloadingUpdate(false)
                  console.error('Error downloading update:', error)
                  Alert.alert(
                    'Download Failed',
                    `Failed to download update: ${error.message || 'Unknown error'}. Please try again later.`,
                    [{ text: 'OK' }]
                  )
                }
              },
            },
          ]
        )
      } else {
        setCheckingUpdate(false)
        Alert.alert(
          'Up to Date',
          'You are using the latest version of the app.',
          [{ text: 'OK' }]
        )
      }
    } catch (error: any) {
      setCheckingUpdate(false)
      console.error('Error checking for updates:', error)
      Alert.alert(
        'Update Check Failed',
        `Failed to check for updates: ${error.message || 'Unknown error'}. Please try again later.`,
        [{ text: 'OK' }]
      )
    }
  }

  const renderSettingItem = (item: any) => {
    return (
      <TouchableOpacity 
        key={item.title} 
        style={styles.settingItem}
        onPress={() => handleSettingPress(item)}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <View style={styles.settingRight}>
          {item.type === 'switch' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#d1d5db', true: `${item.color}50` }}
              thumbColor={item.value ? item.color : '#ffffff'}
            />
          ) : item.action === 'checkUpdates' && (checkingUpdate || downloadingUpdate) ? (
            <ActivityIndicator size="small" color={item.color} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="camera" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.userName}>Loading...</Text>
        ) : userData ? (
          <>
            <Text style={styles.userName}>
              {userData.firstName} {userData.lastName}
            </Text>
            <Text style={styles.userRole}>
              {userData.role === 'super_admin' ? 'Super Admin' : 
               userData.role === 'store_owner' ? 'Store Owner' :
               userData.role === 'manager' ? 'Store Manager' :
               userData.role === 'cashier' ? 'Cashier' : 'User'}
            </Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </>
        ) : (
          <Text style={styles.userName}>User</Text>
        )}
      </View>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex}>
                {renderSettingItem(item)}
                {itemIndex < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>LaundroPOS v1.0.0</Text>
        <Text style={styles.versionSubtext}>Powered by ArkWare Technologies</Text>
      </View>

      {/* Printer Configuration Modal */}
      <Modal
        visible={showPrinterConfig}
        animationType="slide"
        onRequestClose={() => setShowPrinterConfig(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPrinterConfig(false)}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <PrinterConfigScreen />
        </View>
      </Modal>

      {/* Switch Store Modal */}
      <Modal
        visible={showStoreSwitchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStoreSwitchModal(false)}
      >
        <View style={styles.storeModalOverlay}>
          <View style={styles.storeModalContent}>
            <View style={styles.storeModalHeader}>
              <Text style={styles.storeModalTitle}>Switch Store</Text>
              <TouchableOpacity
                style={styles.storeModalCloseButton}
                onPress={() => setShowStoreSwitchModal(false)}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.storeModalList}>
              {availableStores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeModalItem,
                    currentStore?.id === store.id && styles.storeModalSelectedItem
                  ]}
                  onPress={() => handleStoreSwitch(store.id)}
                >
                  <View style={styles.storeModalItemLeft}>
                    <View style={[styles.storeModalIcon, { backgroundColor: `${currentStore?.id === store.id ? '#3b82f6' : '#e5e7eb'}20` }]}>
                      <Ionicons 
                        name="storefront" 
                        size={24} 
                        color={currentStore?.id === store.id ? '#3b82f6' : '#6b7280'} 
                      />
                    </View>
                    <View style={styles.storeModalItemContent}>
                      <Text style={[
                        styles.storeModalItemName,
                        currentStore?.id === store.id && styles.storeModalSelectedText
                      ]}>
                        {store.name}
                      </Text>
                      {store.address && (
                        <Text style={[
                          styles.storeModalItemAddress,
                          currentStore?.id === store.id && styles.storeModalSelectedSubtext
                        ]}>
                          {store.address}
                        </Text>
                      )}
                    </View>
                  </View>
                  {currentStore?.id === store.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingRight: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 64,
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 8,
  },
  storeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  storeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  storeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  storeModalCloseButton: {
    padding: 8,
  },
  storeModalList: {
    maxHeight: 400,
  },
  storeModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  storeModalSelectedItem: {
    backgroundColor: '#eff6ff',
  },
  storeModalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeModalItemContent: {
    flex: 1,
  },
  storeModalItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  storeModalItemAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  storeModalSelectedText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  storeModalSelectedSubtext: {
    color: '#60a5fa',
  },
})

export default SettingsScreen
