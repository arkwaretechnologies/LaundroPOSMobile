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
import POSTerminalPrinterService from '../services/POSTerminalPrinterService'

interface AvailablePrinter {
  id: string
  name: string
  type: 'sunmi' | 'pos-terminal' | 'built-in' | 'simple'
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
        
        // Try to use the native module if available - check multiple ways
        let POSTerminalPrinter = null
        
        // Method 1: Direct check
        if (NativeModules.POSTerminalPrinter) {
          POSTerminalPrinter = NativeModules.POSTerminalPrinter
          console.log('✅ POSTerminalPrinter module found (direct check)')
        }
        
        // Method 2: Check all modules for case variations
        if (!POSTerminalPrinter) {
          const moduleKeys = Object.keys(NativeModules)
          const posModuleKey = moduleKeys.find(key => 
            key.toLowerCase() === 'posterminalprinter' || 
            key === 'POSTerminalPrinter' ||
            key.includes('POS') && key.includes('Printer')
          )
          if (posModuleKey) {
            POSTerminalPrinter = NativeModules[posModuleKey]
            console.log(`✅ POSTerminalPrinter module found (via key: ${posModuleKey})`)
          }
        }
        
        // Method 3: Verify module by checking for common methods
        if (POSTerminalPrinter) {
          const hasMethods = typeof POSTerminalPrinter.connectPrinterService === 'function' ||
                            typeof POSTerminalPrinter.initializePrinter === 'function' ||
                            typeof POSTerminalPrinter.printText === 'function' ||
                            typeof POSTerminalPrinter.isPrinterConnected === 'function'
          
          if (!hasMethods) {
            console.log('⚠️ POSTerminalPrinter module found but missing expected methods')
            // Still consider it valid if it's an object (module exists)
            if (typeof POSTerminalPrinter === 'object' && POSTerminalPrinter !== null) {
              console.log('✅ Module object exists, treating as valid')
            } else {
              POSTerminalPrinter = null
            }
          }
        }
        
        // Use SDK detection method if available
        if (POSTerminalPrinter && typeof POSTerminalPrinter.detectIPOSPrinter === 'function') {
          try {
            const detectionResult = await POSTerminalPrinter.detectIPOSPrinter()
            console.log('📊 IPOS Printer Detection Result:', detectionResult)
            
            if (detectionResult && detectionResult.found) {
              const isConnected = detectionResult.isConnected || false
              const serviceAvailable = detectionResult.serviceAvailable || false
              
              // Try to verify printer status using API (must be PRINTER_NORMAL = 0)
              let printerStatus = -1
              let statusAvailable = false
              try {
                if (typeof POSTerminalPrinter.getPrinterStatus === 'function') {
                  printerStatus = await POSTerminalPrinter.getPrinterStatus()
                  statusAvailable = true
                  console.log(`📊 Printer status: ${printerStatus} (0=PRINTER_NORMAL, 1=BUSY, 2=PAPER_OUT, 3=ERROR)`)
                }
              } catch (statusError) {
                console.log('⚠️ Could not check printer status:', statusError)
              }
              
              foundPrinters.push({
                id: 'pos-terminal',
                name: 'IPOS Printer (GZPDA03)',
                type: 'pos-terminal',
                status: (isConnected || serviceAvailable) && (statusAvailable ? printerStatus === 0 : true) ? 'available' : 'unavailable',
                module: POSTerminalPrinter
              })
              console.log('✅ IPOS Printer detected via SDK', {
                package: detectionResult.packageName,
                available: serviceAvailable,
                connected: isConnected,
                status: statusAvailable ? printerStatus : 'unknown'
              })
            } else {
              console.log('⚠️ IPOS printer service not found on device')
              // Module exists but service not found - still add printer (rebuild worked)
              foundPrinters.push({
                id: 'pos-terminal',
                name: 'IPOS Printer (GZPDA03)',
                type: 'pos-terminal',
                status: 'unavailable',
                module: POSTerminalPrinter
              })
              console.log('✅ IPOS Printer added (module exists, service not found on device)')
            }
          } catch (detectError) {
            console.log('⚠️ SDK detection failed, trying service method:', detectError)
            
            // Fallback: Try using POSTerminalPrinterService.detectIPOSPrinter()
            try {
              const serviceDetection = await POSTerminalPrinterService.detectIPOSPrinter()
              if (serviceDetection && serviceDetection.found) {
                foundPrinters.push({
                  id: 'pos-terminal',
                  name: 'IPOS Printer (GZPDA03)',
                  type: 'pos-terminal',
                  status: (serviceDetection.serviceAvailable || serviceDetection.aidlConnected) ? 'available' : 'unavailable',
                  module: POSTerminalPrinter
                })
                console.log('✅ IPOS Printer detected via service method')
              } else {
                // Module exists but detection failed - still add printer
                foundPrinters.push({
                  id: 'pos-terminal',
                  name: 'IPOS Printer (GZPDA03)',
                  type: 'pos-terminal',
                  status: 'unavailable',
                  module: POSTerminalPrinter
                })
                console.log('✅ IPOS Printer added (module exists, detection check failed)')
              }
            } catch (serviceError) {
              // Final fallback: add printer if module exists
              foundPrinters.push({
                id: 'pos-terminal',
                name: 'IPOS Printer (GZPDA03)',
                type: 'pos-terminal',
                status: 'unavailable',
                module: POSTerminalPrinter
              })
              console.log('✅ IPOS Printer added (module exists, all detection methods failed)')
            }
          }
        } else if (POSTerminalPrinter) {
          // Module exists but detectIPOSPrinter method not available
          // This means rebuild worked, but detection method might not be implemented
          foundPrinters.push({
            id: 'pos-terminal',
            name: 'IPOS Printer (GZPDA03)',
            type: 'pos-terminal',
            status: 'unavailable',
            module: POSTerminalPrinter
          })
          console.log('✅ IPOS Printer added (module exists, detection method not available)')
        } else if (Platform.OS === 'android') {
          // On Android, if module not found but device might have IPOS printer
          // The module might be lazy-loaded or available at runtime when actually used
          console.log('⚠️ POSTerminalPrinter module not found in NativeModules at scan time')
          console.log('📋 Available modules:', Object.keys(NativeModules).join(', '))
          console.log('💡 Module may be available at runtime when printing')
          
          // Always add the printer for Android devices (GZPDA03/POSPDA01)
          // The module will be accessed dynamically when actually printing
          foundPrinters.push({
            id: 'pos-terminal',
            name: 'IPOS Printer (GZPDA03)',
            type: 'pos-terminal',
            status: 'unavailable',
            module: null // Will be accessed dynamically when needed
          })
          console.log('✅ IPOS Printer added (Android device - module will be accessed at runtime)')
        }
      } catch (error) {
        console.error('❌ IPOS Printer detection failed:', error)
        // Even if detection fails, add the printer for Android devices
        // The module might be available at runtime
        if (Platform.OS === 'android') {
          // Check if printer already added
          const alreadyAdded = foundPrinters.some(p => p.id === 'pos-terminal')
          if (!alreadyAdded) {
            foundPrinters.push({
              id: 'pos-terminal',
              name: 'IPOS Printer (GZPDA03)',
              type: 'pos-terminal',
              status: 'unavailable',
              module: null // Will be accessed dynamically when needed
            })
            console.log('✅ IPOS Printer added (fallback after error)')
          }
        }
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

      // 3. Check for other printer modules
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
      // If POS Terminal printer is selected, force use of POSTerminalPrinterService
      // Even if module isn't in NativeModules, try to use it as it may be available at runtime
      if (selectedPrinter === 'pos-terminal') {
        console.log('🔍 Testing IPOS printer using POSTerminalPrinterService...')
        
        try {
          // Always try to use POSTerminalPrinterService directly
          // The module might not be in NativeModules at scan time but available at runtime
          console.log('🔌 Step 1: Connecting to printer service...')
          const connected = await POSTerminalPrinterService.connectPrinterService()
          if (!connected) {
            // If connection fails, the module might not be available
            // But let's still try initialization in case it works
            console.log('⚠️ Connection check failed, but trying initialization anyway...')
          }

          console.log('🔧 Step 2: Initializing printer...')
          const initialized = await POSTerminalPrinterService.initializePrinter()
          if (!initialized) {
            Alert.alert(
              'Initialization Failed',
              'Could not initialize IPOS printer.\n\n' +
              'The POSTerminalPrinter module may not be registered in NativeModules.\n\n' +
              'If you can print from other parts of the app, try:\n' +
              '1. Restart the app completely\n' +
              '2. Check if the native module needs to be rebuilt\n' +
              '3. Verify the IPOS printer service app is installed'
            )
            setLoading(false)
            return
          }

          console.log('🖨️ Step 3: Executing test print...')
          const testSuccess = await POSTerminalPrinterService.testPrint()
          
          if (testSuccess) {
            Alert.alert('Success', 'IPOS printer test print successful!')
          } else {
            Alert.alert('Print Failed', 'Test print execution failed. Check console logs for details.')
          }
        } catch (error: any) {
          console.error('Test print error:', error)
          const errorMessage = error?.message || 'Test print failed'
          
          // Check if it's a module not found error
          if (errorMessage.includes('not found') || errorMessage.includes('Module not available')) {
            Alert.alert(
              'Module Not Found',
              'POSTerminalPrinter module is not accessible.\n\n' +
              'Possible solutions:\n' +
              '1. Rebuild the app to register the native module\n' +
              '2. Restart the app completely\n' +
              '3. Check if the module is properly linked in the native code\n\n' +
              'If you can print from OrdersScreen, the module exists but may need to be accessed differently.'
            )
          } else {
            Alert.alert(
              'Error',
              `${errorMessage}\n\n` +
              'Check console logs for more details.'
            )
          }
        }
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
                    
                    // Use POSTerminalPrinterService.detectIPOSPrinter() method
                    try {
                      const result = await POSTerminalPrinterService.detectIPOSPrinter()
                      Alert.alert(
                        'IPOS Printer Detection',
                        `Found: ${result.found ? '✅ Yes' : '❌ No'}\n` +
                        `Service Available: ${result.serviceAvailable ? '✅ Yes' : '❌ No'}\n` +
                        `AIDL Connected: ${result.aidlConnected ? '✅ Yes' : '❌ No'}\n` +
                        `Package: ${result.packageName || 'N/A'}\n` +
                        `Action: ${result.action || 'N/A'}\n\n` +
                        `${result.found ? 'Service is installed!' : 'Service not found. Please install the IPOS printer service app.'}`
                      )
                    } catch (e) {
                      Alert.alert('Detection Error', String(e))
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
                          let isConnected = await POSTerminalPrinter.isPrinterConnected()
                          if (!isConnected) {
                            // Try to connect via AIDL
                            isConnected = await POSTerminalPrinter.connectPrinterService()
                          }
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







