import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  NativeModules,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ThermalPrinterService from '../services/ThermalPrinterService'

interface AvailablePrinter {
  id: string
  name: string
  type: 'sunmi' | 'pos-terminal' | 'usb' | 'built-in' | 'simple'
  status: 'available' | 'unavailable' | 'testing'
  module?: any
}

export default function PrinterConfigScreen() {
  const [printerService] = useState(ThermalPrinterService.getInstance())
  const [availablePrinters, setAvailablePrinters] = useState<AvailablePrinter[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    scanForPrinters()
  }, [])

  const scanForPrinters = async () => {
    setScanning(true)
    const foundPrinters: AvailablePrinter[] = []

    try {
      console.log('🔍 Scanning for available printers...')
      
      // Debug: Log all available NativeModules
      if (Platform.OS === 'android') {
        console.log('📋 All available NativeModules:', Object.keys(NativeModules))
      }

      // 1. Check for POS Terminal Printer (IPOS SDK) - Check this FIRST
      // Use SDK detection method to find the printer service directly
      try {
        console.log('🔍 Detecting IPOS Printer using SDK...')
        
        // Try to use the native module if available
        let POSTerminalPrinter = null
        if (NativeModules.POSTerminalPrinter) {
          POSTerminalPrinter = NativeModules.POSTerminalPrinter
          console.log('✅ POSTerminalPrinter module found')
        }
        
        // Use SDK detection method
        if (POSTerminalPrinter && typeof POSTerminalPrinter.detectIPOSPrinter === 'function') {
          try {
            const detectionResult = await POSTerminalPrinter.detectIPOSPrinter()
            console.log('📊 IPOS Printer Detection Result:', detectionResult)
            
            if (detectionResult && detectionResult.found) {
              const isConnected = detectionResult.isConnected || false
              const serviceAvailable = detectionResult.serviceAvailable || false
              
              foundPrinters.push({
                id: 'pos-terminal',
                name: 'IPOS Printer (GZPDA03)',
                type: 'pos-terminal',
                status: (isConnected || serviceAvailable) ? 'available' : 'unavailable',
                module: POSTerminalPrinter
              })
              console.log('✅ IPOS Printer detected via SDK', {
                package: detectionResult.packageName,
                available: serviceAvailable,
                connected: isConnected
              })
            } else {
              console.log('⚠️ IPOS printer service not found on device')
            }
          } catch (detectError) {
            console.log('⚠️ SDK detection failed, trying fallback:', detectError)
            // Fallback: add printer if module exists
            if (POSTerminalPrinter) {
              foundPrinters.push({
                id: 'pos-terminal',
                name: 'IPOS Printer (GZPDA03)',
                type: 'pos-terminal',
                status: 'unavailable',
                module: POSTerminalPrinter
              })
              console.log('✅ IPOS Printer added (module exists, service check failed)')
            }
          }
        } else {
          // Module not available - check if we should still show it
          console.log('⚠️ POSTerminalPrinter module not available')
          console.log('📋 This might require rebuilding the app')
          
          // Still try to detect using Android intents (if on Android)
          if (Platform.OS === 'android') {
            console.log('🔍 Attempting to detect IPOS service via Android system...')
            // Note: We can't directly check Android services from JS,
            // but we can add a placeholder that will work after rebuild
            foundPrinters.push({
              id: 'pos-terminal',
              name: 'IPOS Printer (GZPDA03) - Rebuild Required',
              type: 'pos-terminal',
              status: 'unavailable',
              module: null
            })
            console.log('⚠️ Added IPOS printer placeholder - rebuild app to enable')
          }
        }
      } catch (error) {
        console.error('❌ IPOS Printer detection failed:', error)
      }

      // 2. Check for Sunmi Printer
      try {
        const { SunMiPrinterModule } = NativeModules
        if (SunMiPrinterModule) {
          console.log('✅ Sunmi module found')
          
          // Check if it's actually a Sunmi device
          const isSunmiDevice = Platform.OS === 'android' && (
            NativeModules.Build?.MANUFACTURER?.toLowerCase().includes('sunmi') ||
            NativeModules.Build?.MODEL?.toLowerCase().includes('sunmi') ||
            NativeModules.Build?.BRAND?.toLowerCase().includes('sunmi')
          )
          
          if (isSunmiDevice) {
            foundPrinters.push({
              id: 'sunmi',
              name: 'Sunmi Built-in Printer',
              type: 'sunmi',
              status: 'available',
              module: SunMiPrinterModule
            })
            console.log('✅ Sunmi printer available')
          } else {
            console.log('⚠️ Sunmi module exists but not a Sunmi device')
          }
        } else {
          console.log('❌ Sunmi module not found')
        }
      } catch (error) {
        console.log('⚠️ Sunmi check failed:', error)
      }

      // 3. Check for USB Printer
      try {
        const { USBPrinter } = NativeModules
        if (USBPrinter) {
          foundPrinters.push({
            id: 'usb',
            name: 'USB Thermal Printer',
            type: 'usb',
            status: 'available',
            module: USBPrinter
          })
          console.log('✅ USB printer available')
        }
      } catch (error) {
        console.log('⚠️ USB check failed:', error)
      }

      // 4. Check for other printer modules
      const printerModuleNames = [
        'PrinterModule',
        'ThermalPrinter',
        'ESCPOSPrinter',
      ]

      printerModuleNames.forEach(moduleName => {
        if (NativeModules[moduleName]) {
          foundPrinters.push({
            id: moduleName.toLowerCase(),
            name: moduleName,
            type: 'built-in',
            status: 'available',
            module: NativeModules[moduleName]
          })
          console.log(`✅ ${moduleName} available`)
        }
      })

      // 5. Always add SimplePrinter as fallback (only if no other printers found)
      if (foundPrinters.length === 0) {
        foundPrinters.push({
          id: 'simple',
          name: 'Simple Printer (Fallback)',
          type: 'simple',
          status: 'available'
        })
        console.log('⚠️ No printers found, adding fallback printer')
      }

      console.log(`✅ Found ${foundPrinters.length} printers:`, foundPrinters.map(p => p.name))
      setAvailablePrinters(foundPrinters)

      // Auto-select the first available printer (prefer IPOS if available)
      if (foundPrinters.length > 0) {
        // Prefer IPOS printer if available
        const iposPrinter = foundPrinters.find(p => p.id === 'pos-terminal')
        if (iposPrinter) {
          setSelectedPrinter('pos-terminal')
          console.log('✅ Auto-selected IPOS Printer')
        } else {
          setSelectedPrinter(foundPrinters[0].id)
          console.log(`✅ Auto-selected first printer: ${foundPrinters[0].id}`)
        }
      }
    } catch (error) {
      console.error('❌ Error scanning for printers:', error)
      Alert.alert('Error', 'Failed to scan for printers')
    } finally {
      setScanning(false)
    }
  }

  const selectPrinter = (printerId: string) => {
    setSelectedPrinter(printerId)
    console.log(`✅ Selected printer: ${printerId}`)
  }

  const testSelectedPrinter = async () => {
    if (!selectedPrinter) {
      Alert.alert('Error', 'Please select a printer first')
      return
    }

    setLoading(true)
    try {
      // If POS Terminal printer is selected, test it directly
      if (selectedPrinter === 'pos-terminal') {
        const { POSTerminalPrinter } = NativeModules
        if (!POSTerminalPrinter) {
          Alert.alert('Error', 'POSTerminalPrinter module not found')
          setLoading(false)
          return
        }

        // Check connection
        const isConnected = await POSTerminalPrinter.isPrinterConnected()
        if (!isConnected) {
          Alert.alert('Error', 'Printer service not connected. Please ensure the IPOS printer service is running on your device.')
          setLoading(false)
          return
        }

        // Get printer status
        const status = await POSTerminalPrinter.getPrinterStatus()
        console.log('📊 Printer status:', status)
        
        // Initialize printer
        await POSTerminalPrinter.initializePrinter()
        
        // Print test text
        const testText = [
          '\n',
          '================================\n',
          '    PRINTER TEST - IPOS SDK\n',
          '================================\n',
          '\n',
          'Device: GZPDA03 POSPDA01\n',
          'SDK: IPOS Printer Service\n',
          'Status: ' + (status === 0 ? 'NORMAL' : 'OTHER') + '\n',
          '\n',
          'This is a test print to verify\n',
          'that the IPOS printer SDK is\n',
          'working correctly.\n',
          '\n',
          'Date: ' + new Date().toLocaleString() + '\n',
          '\n',
          '================================\n',
          '\n\n'
        ].join('')

        await POSTerminalPrinter.printText(testText)
        
        // Perform print with feed lines
        await POSTerminalPrinter.printerPerformPrint(3)
        
        Alert.alert('Success', 'IPOS printer test print successful!')
      } else {
        // Use the general printer service for other printer types
        await printerService.initializePrinter()
        const success = await printerService.testPrint()
        if (success) {
          Alert.alert('Success', `Test print successful using ${selectedPrinter}!`)
        } else {
          Alert.alert('Error', 'Test print failed. Check console logs for details.')
        }
      }
    } catch (error: any) {
      console.error('Test print error:', error)
      Alert.alert('Error', error?.message || 'Test print failed')
    } finally {
      setLoading(false)
    }
  }

  const printSampleOrder = async () => {
    if (!selectedPrinter) {
      Alert.alert('Error', 'Please select a printer first')
      return
    }

    setLoading(true)
    try {
      // Re-initialize with the current setup
      await printerService.initializePrinter()
      
      const sampleOrder = {
        orderId: 'TEST-001',
        customerName: 'John Doe',
        orderDate: new Date().toISOString(),
        totalAmount: 25.50,
        items: [
          { name: 'Wash & Fold', quantity: 2, price: 12.00 },
          { name: 'Dry Cleaning', quantity: 1, price: 1.50 }
        ]
      }

      const success = await printerService.printOrderClaimStub(sampleOrder)
      if (success) {
        Alert.alert('Success', 'Sample order printed!')
      } else {
        Alert.alert('Error', 'Print failed. Check console logs for details.')
      }
    } catch (error) {
      console.error('Print error:', error)
      Alert.alert('Error', 'Print failed')
    } finally {
      setLoading(false)
    }
  }

  const getPrinterIcon = (type: string) => {
    switch (type) {
      case 'sunmi':
        return 'hardware-chip'
      case 'pos-terminal':
        return 'terminal'
      case 'usb':
        return 'usb'
      case 'built-in':
        return 'print'
      default:
        return 'print-outline'
    }
  }

  const getPrinterColor = (type: string) => {
    switch (type) {
      case 'sunmi':
        return '#10b981'
      case 'pos-terminal':
        return '#3b82f6'
      case 'usb':
        return '#f59e0b'
      case 'built-in':
        return '#8b5cf6'
      default:
        return '#6b7280'
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Printer Configuration</Text>
        <Text style={styles.subtitle}>Select your thermal printer</Text>
      </View>

      {/* Scan Status */}
      {scanning ? (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.scanningText}>Scanning for printers...</Text>
        </View>
      ) : (
        <>
          {/* Debug Info (Development only) */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Debug Information</Text>
              <TouchableOpacity 
                style={[styles.button, styles.debugButton]}
                onPress={async () => {
                  console.log('📋 All NativeModules:', Object.keys(NativeModules))
                  const posModule = NativeModules.POSTerminalPrinter
                  console.log('📋 POSTerminalPrinter module:', posModule)
                  if (posModule) {
                    console.log('📋 POSTerminalPrinter methods:', Object.keys(posModule))
                    
                    // Try SDK detection
                    if (typeof posModule.detectIPOSPrinter === 'function') {
                      try {
                        const result = await posModule.detectIPOSPrinter()
                        Alert.alert(
                          'IPOS Printer Detection',
                          `Found: ${result.found}\n` +
                          `Service Available: ${result.serviceAvailable}\n` +
                          `Package: ${result.packageName || 'N/A'}\n` +
                          `Connected: ${result.isConnected}\n\n` +
                          `Check console for details`
                        )
                      } catch (e) {
                        Alert.alert('Detection Error', String(e))
                      }
                    }
                  } else {
                    Alert.alert(
                      'Debug Info',
                      `Total modules: ${Object.keys(NativeModules).length}\n` +
                      `POSTerminalPrinter: Not Found\n` +
                      `\n⚠️ Rebuild the app to register the module\n` +
                      `Check console for details`
                    )
                  }
                }}
              >
                <Ionicons name="bug" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Show Debug Info & Detect IPOS</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Available Printers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Available Printers ({availablePrinters.length})
              </Text>
              <TouchableOpacity 
                style={styles.rescanButton}
                onPress={scanForPrinters}
                disabled={loading}
              >
                <Ionicons name="refresh" size={20} color="#3b82f6" />
                <Text style={styles.rescanText}>Rescan</Text>
              </TouchableOpacity>
            </View>
            
            {availablePrinters.length === 0 ? (
              <View style={styles.noPrintersContainer}>
                <Ionicons name="print-outline" size={48} color="#d1d5db" />
                <Text style={styles.noPrintersText}>No printers found</Text>
                <Text style={styles.noPrintersSubtext}>
                  Make sure your device has a built-in printer
                </Text>
              </View>
            ) : (
              availablePrinters.map((printer) => (
                <TouchableOpacity
                  key={printer.id}
                  style={[
                    styles.printerItem,
                    selectedPrinter === printer.id && styles.printerItemSelected
                  ]}
                  onPress={() => selectPrinter(printer.id)}
                >
                  <View style={styles.printerLeft}>
                    <View style={[
                      styles.printerIcon,
                      { backgroundColor: `${getPrinterColor(printer.type)}20` }
                    ]}>
                      <Ionicons 
                        name={getPrinterIcon(printer.type) as any} 
                        size={24} 
                        color={getPrinterColor(printer.type)} 
                      />
                    </View>
                    <View style={styles.printerInfo}>
                      <Text style={styles.printerName}>{printer.name}</Text>
                      <Text style={styles.printerType}>Type: {printer.type}</Text>
                    </View>
                  </View>
                  {selectedPrinter === printer.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Test Functions */}
          {selectedPrinter && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Functions</Text>
              <Text style={styles.sectionSubtitle}>
                Test your selected printer to ensure it's working
              </Text>
              
              {/* Printer Status for IPOS */}
              {selectedPrinter === 'pos-terminal' && (
                <View style={styles.statusContainer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.statusButton]}
                    onPress={async () => {
                      try {
                        const { POSTerminalPrinter } = NativeModules
                        if (POSTerminalPrinter) {
                          const isConnected = await POSTerminalPrinter.isPrinterConnected()
                          const status = await POSTerminalPrinter.getPrinterStatus()
                          
                          const statusText = {
                            0: 'NORMAL - Ready to print',
                            1: 'BUSY - Printer is busy',
                            2: 'PAPER_OUT - No paper',
                            3: 'ERROR - Printer error'
                          }[status] || `Unknown status: ${status}`
                          
                          Alert.alert(
                            'Printer Status',
                            `Connected: ${isConnected ? 'Yes' : 'No'}\nStatus: ${statusText}`,
                            [{ text: 'OK' }]
                          )
                        }
                      } catch (error: any) {
                        Alert.alert('Error', error?.message || 'Failed to get printer status')
                      }
                    }}
                    disabled={loading}
                  >
                    <Ionicons name="information-circle" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Check Printer Status</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.button, styles.testButton]}
                onPress={testSelectedPrinter}
                disabled={loading}
              >
                <Ionicons name="print-outline" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Test Print</Text>
              </TouchableOpacity>
              
              {selectedPrinter === 'pos-terminal' && (
                <TouchableOpacity 
                  style={[styles.button, styles.qrButton]}
                  onPress={async () => {
                    setLoading(true)
                    try {
                      const { POSTerminalPrinter } = NativeModules
                      if (POSTerminalPrinter) {
                        await POSTerminalPrinter.initializePrinter()
                        await POSTerminalPrinter.printQRCode(
                          'https://laundropos.app/test',
                          10, // module size
                          1   // error correction level (M)
                        )
                        await POSTerminalPrinter.printerPerformPrint(3)
                        Alert.alert('Success', 'QR code test print successful!')
                      }
                    } catch (error: any) {
                      Alert.alert('Error', error?.message || 'QR code print failed')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                >
                  <Ionicons name="qr-code" size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Test QR Code Print</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.button, styles.sampleButton]}
                onPress={printSampleOrder}
                disabled={loading}
              >
                <Ionicons name="receipt" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Print Sample Order</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Printer Info */}
          {selectedPrinter && (
            <View style={styles.infoSection}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  The printer will be used automatically for all printing operations in the app.
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scanningContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rescanText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  noPrintersContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noPrintersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  noPrintersSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  printerItemSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  printerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  printerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  printerType: {
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusButton: {
    backgroundColor: '#3b82f6',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#10b981',
    marginBottom: 12,
  },
  qrButton: {
    backgroundColor: '#f59e0b',
    marginBottom: 12,
  },
  sampleButton: {
    backgroundColor: '#8b5cf6',
  },
  debugButton: {
    backgroundColor: '#6b7280',
    marginBottom: 0,
  },
  infoSection: {
    margin: 16,
    marginTop: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
})







