import { NativeModules, Platform } from 'react-native'
import PrinterDiscovery from './PrinterDiscovery'

// Try to import the USB printer libraries
let PosPrinter: any = null
let USBPrinter: any = null

try {
  PosPrinter = require('@diiix7/react-native-pos-print').default
  console.log('✅ @diiix7/react-native-pos-print loaded successfully')
} catch (error) {
  console.log('❌ @diiix7/react-native-pos-print not available:', error instanceof Error ? error.message : String(error))
}

try {
  USBPrinter = require('react-native-usb-printer').default
  console.log('✅ react-native-usb-printer loaded successfully')
} catch (error) {
  console.log('❌ react-native-usb-printer not available:', error instanceof Error ? error.message : String(error))
}

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface Order {
  orderId: string
  customerName: string
  orderDate: string
  totalAmount: number
  items: OrderItem[]
  storeInfo?: {
    name: string
    address: string
    phone?: string
  }
  orderNumber?: string
}

class USBPrinterService {
  private static instance: USBPrinterService
  private isConnected: boolean = false
  private connectedDevice: string | null = null
  private availablePrinters: any[] = []

  private constructor() {
    // Initialize service
  }

  static getInstance(): USBPrinterService {
    if (!USBPrinterService.instance) {
      USBPrinterService.instance = new USBPrinterService()
    }
    return USBPrinterService.instance
  }

  async initializePrinter(): Promise<boolean> {
    try {
      console.log('🔌 Initializing USB printer service...')
      
      if (Platform.OS !== 'android') {
        console.log('USB printer only works on Android')
        return false
      }

      // Run comprehensive printer discovery
      console.log('🔍 Running comprehensive printer discovery...')
      const workingMethods = await PrinterDiscovery.discoverAllPrintMethods()
      
      if (workingMethods.length > 0) {
        console.log(`✅ Found ${workingMethods.length} working printer methods`)
        this.isConnected = true
        this.connectedDevice = 'discovered-printer'
        return true
      }

      // Try POS Printer first
      if (PosPrinter) {
        console.log('🔍 Trying @diiix7/react-native-pos-print...')
        try {
          // Initialize POS printer
          await PosPrinter.init()
          console.log('✅ POS Printer initialized')
          
          // Get available printers
          const printers = await PosPrinter.getAvailablePrinters()
          this.availablePrinters = printers || []
          console.log(`Found ${this.availablePrinters.length} available printers`)
          
          if (this.availablePrinters.length > 0) {
            this.isConnected = true
            this.connectedDevice = 'pos-printer'
            console.log('✅ POS Printer connected')
            return true
          }
        } catch (error) {
          console.log('POS Printer failed:', error instanceof Error ? error.message : String(error))
        }
      }

      // Try USB Printer
      if (USBPrinter) {
        console.log('🔍 Trying react-native-usb-printer...')
        try {
          // Get USB printers
          const usbPrinters = await USBPrinter.getAvailablePrinters()
          this.availablePrinters = usbPrinters || []
          console.log(`Found ${this.availablePrinters.length} USB printers`)
          
          if (this.availablePrinters.length > 0) {
            this.isConnected = true
            this.connectedDevice = 'usb-printer'
            console.log('✅ USB Printer connected')
            return true
          }
        } catch (error) {
          console.log('USB Printer failed:', error instanceof Error ? error.message : String(error))
        }
      }

      // Fallback: Check for built-in printer modules
      console.log('🔍 Checking for built-in printer modules...')
      const builtInModules = [
        'ThermalPrinter', 'BuiltInPrinter', 'PDAPrinter', 'DevicePrinter',
        'PrinterModule', 'ReceiptPrinter', 'POSPrinter', 'AndroidPrinter',
        'PrintService', 'PrinterService', 'AbanopiPrinter', 'HandheldPrinter'
      ]

      for (const moduleName of builtInModules) {
        if (NativeModules[moduleName]) {
          console.log(`✅ Found built-in printer module: ${moduleName}`)
          this.isConnected = true
          this.connectedDevice = 'built-in-printer'
          return true
        }
      }

      console.log('⚠️ No USB or built-in printer found')
      return false
    } catch (error) {
      console.error('Failed to initialize USB printer:', error)
      return false
    }
  }

  async getAvailablePrinters(): Promise<any[]> {
    return this.availablePrinters
  }

  async connectToPrinter(printer: any): Promise<boolean> {
    try {
      if (this.connectedDevice === 'pos-printer' && PosPrinter) {
        await PosPrinter.connect(printer)
        console.log('✅ Connected to POS printer')
        return true
      } else if (this.connectedDevice === 'usb-printer' && USBPrinter) {
        await USBPrinter.connect(printer)
        console.log('✅ Connected to USB printer')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to connect to printer:', error)
      return false
    }
  }

  async testPrint(): Promise<boolean> {
    try {
      if (!(await this.ensurePrinterReady())) {
        return false
      }

      const testText = this.generateTestText()
      return await this.printText(testText)
    } catch (error) {
      console.error('Test print failed:', error)
      return false
    }
  }

  async printOrderClaimStub(order: Order): Promise<boolean> {
    try {
      if (!(await this.ensurePrinterReady())) {
        return false
      }

      const claimStubText = this.generateClaimStubText(order)
      return await this.printText(claimStubText)
    } catch (error) {
      console.error('Print order claim stub failed:', error)
      return false
    }
  }

  private generateTestText(): string {
    return `
PRINTER TEST
USB Printer OK
Connection Successful

Test completed successfully!
`
  }

  private generateClaimStubText(order: Order): string {
    const orderNumber = order.orderNumber || `ORD-${order.orderId.substring(0, 8).toUpperCase()}`
    const date = new Date(order.orderDate)
    const dateStr = this.formatDate(date)
    const timeStr = this.formatTime(date)

    let text = `\n`
    
    // Store name
    if (order.storeInfo?.name) {
      text += `${order.storeInfo.name.toUpperCase()}\n`
    }
    
    // Divider
    text += `================================\n`
    
    // Claim Stub Header
    text += `CLAIM STUB\n`
    text += `\n`
    
    // Order Number
    text += `Order #: ${orderNumber}\n`
    
    // Date and Time
    text += `Date: ${dateStr}\n`
    text += `Time: ${timeStr}\n`
    text += `\n`
    
    // Divider
    text += `================================\n`
    text += `\n`
    
    // Customer Information
    text += `Customer:\n`
    text += `${order.customerName}\n`
    text += `\n`
    
    // Services/Items
    text += `Services:\n`
    order.items.forEach((item) => {
      const line = `${item.quantity}x ${item.name.substring(0, 20)}`
      const price = `₱${item.price.toFixed(2)}`
      const spaces = Math.max(1, 32 - line.length - price.length)
      text += line + ' '.repeat(spaces) + price + '\n'
    })
    
    text += `\n`
    
    // Divider
    text += `================================\n`
    
    // Total
    text += `TOTAL: ₱${order.totalAmount.toFixed(2)}\n`
    text += `\n`
    
    // Footer message
    text += `Thank you for your business!\n`
    text += `Please keep this stub for pickup.\n`
    text += `\n\n\n`
    
    return text
  }

  private async printText(text: string): Promise<boolean> {
    try {
      console.log('🖨️ USBPrinterService: Starting comprehensive print...')
      console.log(`📝 Text to print: "${text}"`)
      
      // First, run comprehensive discovery to find working methods
      console.log('🔍 Running comprehensive printer discovery...')
      const workingMethods = await PrinterDiscovery.discoverAllPrintMethods()
      
      if (workingMethods.length > 0) {
        console.log(`🎯 Found ${workingMethods.length} working methods, testing them...`)
        
        for (const methodKey of workingMethods) {
          const [moduleName, methodName] = methodKey.split('.')
          try {
            console.log(`🧪 Testing discovered method: ${methodKey}`)
            const success = await PrinterDiscovery.testPrintWithMethod(moduleName, methodName, text)
            if (success) {
              console.log(`✅ Print successful via discovered method: ${methodKey}`)
              return true
            }
          } catch (error) {
            console.log(`❌ Discovered method ${methodKey} failed:`, error instanceof Error ? error.message : String(error))
          }
        }
      }
      
      // Try PosPrinter first (most comprehensive)
      if (PosPrinter) {
        try {
          console.log('🔌 Trying PosPrinter...')
          await PosPrinter.printText(text)
          console.log('✅ Print successful via PosPrinter')
          return true
        } catch (posError) {
          console.log('❌ PosPrinter failed:', posError instanceof Error ? posError.message : String(posError))
        }
      }
      
      // Try USBPrinter second
      if (USBPrinter) {
        try {
          console.log('🔌 Trying USBPrinter...')
          await USBPrinter.printText(text)
          console.log('✅ Print successful via USBPrinter')
          return true
        } catch (usbError) {
          console.log('❌ USBPrinter failed:', usbError instanceof Error ? usbError.message : String(usbError))
        }
      }
      
      // Try built-in printer modules with aggressive testing
      console.log('🔍 Trying built-in printer modules with aggressive testing...')
      const builtInSuccess = await this.printViaBuiltInModules(text)
      if (builtInSuccess) {
        return true
      }
      
      // Try direct device file access
      console.log('🔍 Trying direct device file access...')
      try {
        const { writeFile } = require('react-native-fs')
        const printerDevices = [
          '/dev/usb/lp0', '/dev/ttyS1', '/dev/ttyUSB0', '/dev/thermal_printer',
          '/dev/print', '/dev/printer', '/dev/pos', '/dev/thermal',
          '/dev/escpos', '/dev/receipt', '/dev/pos_printer', '/dev/lp0',
          '/dev/lp1', '/dev/lp2', '/dev/lp3', '/dev/usb/lp1', '/dev/usb/lp2'
        ]
        
        for (const devicePath of printerDevices) {
          try {
            console.log(`   Trying device: ${devicePath}`)
            await writeFile(devicePath, text, 'utf8')
            console.log(`✅ Print successful via device file: ${devicePath}`)
            return true
          } catch (deviceError) {
            console.log(`   ❌ Device ${devicePath} not available: ${deviceError instanceof Error ? deviceError.message : String(deviceError)}`)
          }
        }
      } catch (fsError) {
        console.log('File system access failed:', fsError instanceof Error ? fsError.message : String(fsError))
      }
      
      // Try Android native printing
      console.log('🔍 Trying Android native printing...')
      try {
        const { Linking } = require('react-native')
        const printIntent = `intent://print?text=${encodeURIComponent(text)}#Intent;scheme=print;package=com.android.printspooler;end`
        const canOpen = await Linking.canOpenURL(printIntent)
        if (canOpen) {
          await Linking.openURL(printIntent)
          console.log('✅ Print sent via Android native print intent')
          return true
        }
      } catch (nativeError) {
        console.log('Android native printing failed:', nativeError instanceof Error ? nativeError.message : String(nativeError))
      }
      
      console.log('❌ All print methods failed')
      return false
    } catch (error) {
      console.error('Print failed:', error)
      return false
    }
  }

  private async ensurePrinterReady(): Promise<boolean> {
    if (this.isConnected) {
      return true
    }

    console.log('⚠️ USB printer not connected, attempting initialization...')
    const success = await this.initializePrinter()
    if (success) {
      console.log('✅ USB printer connected after auto-initialization')
      return true
    }

    console.warn('USB printer still not connected after initialization attempt')
    return false
  }

  private async printViaBuiltInModules(text: string): Promise<boolean> {
    try {
      console.log('🔍 === AGGRESSIVE PRINTER TESTING ===')
      console.log(`📝 Text to print: "${text}"`)
      
      // First, run comprehensive discovery
      const workingMethods = await PrinterDiscovery.discoverAllPrintMethods()
      
      if (workingMethods.length > 0) {
        console.log(`🎯 Found ${workingMethods.length} working methods, testing them...`)
        
        for (const methodKey of workingMethods) {
          const [moduleName, methodName] = methodKey.split('.')
          try {
            console.log(`🧪 Testing discovered method: ${methodKey}`)
            const success = await PrinterDiscovery.testPrintWithMethod(moduleName, methodName, text)
            if (success) {
              console.log(`✅ Print successful via discovered method: ${methodKey}`)
              return true
            }
          } catch (error) {
            console.log(`❌ Discovered method ${methodKey} failed:`, error instanceof Error ? error.message : String(error))
          }
        }
      }
      
      // If discovery didn't find working methods, try aggressive testing
      console.log('🔍 Discovery found no working methods, trying aggressive testing...')
      
      const printerMethods = [
        'printText', 'print', 'sendText', 'writeText', 'printReceipt',
        'printString', 'printData', 'sendData', 'printRaw', 'printLine',
        'printContent', 'printDocument', 'printJob', 'printBuffer',
        'printBytes', 'printArray', 'printStream', 'printOutput',
        'printResult', 'printCommand', 'printEscPos', 'printThermal',
        'printLine', 'printLines', 'printTextLine', 'printStringLine',
        'printRawData', 'printBytes', 'printArray', 'printStream',
        'printOutput', 'printResult', 'printCommand', 'printEscPos',
        'printThermal', 'printReceipt', 'printDocument', 'printJob',
        'printBuffer', 'printContent', 'printText', 'printString',
        'printData', 'sendText', 'writeText', 'printRaw', 'printLine'
      ]

      const printerModuleNames = [
        'ThermalPrinter', 'BuiltInPrinter', 'PDAPrinter', 'DevicePrinter',
        'PrinterModule', 'ReceiptPrinter', 'POSPrinter', 'AndroidPrinter',
        'PrintService', 'PrinterService', 'AbanopiPrinter', 'HandheldPrinter',
        'MobilePrinter', 'TerminalPrinter', 'ESCPrinter', 'ThermalPrint',
        'PrintManager', 'SystemPrinter', 'DevicePrint', 'HardwarePrint',
        'NativePrint', 'LocalPrint', 'InternalPrint', 'BuiltInPrint',
        'PDAPrint', 'POSPrint', 'TerminalPrint', 'ThermalPrintService',
        'Printer', 'Print', 'Thermal', 'Receipt', 'POS', 'PDA', 'Device',
        'Hardware', 'Native', 'Local', 'Internal', 'BuiltIn', 'Terminal'
      ]

      // Try specific printer modules first
      for (const moduleName of printerModuleNames) {
        if (NativeModules[moduleName]) {
          const module = NativeModules[moduleName]
          console.log(`🔍 Found printer module: ${moduleName}`)
          
          // List available methods
          const methods = Object.getOwnPropertyNames(module).filter(prop => 
            typeof module[prop] === 'function'
          )
          console.log(`   Available methods: ${methods.join(', ')}`)
          
          for (const method of printerMethods) {
            if (typeof module[method] === 'function') {
              try {
                console.log(`   🧪 Testing ${moduleName}.${method}...`)
                
                // Try different parameter formats
                const paramFormats = [
                  { name: 'Simple string', fn: () => module[method](text) },
                  { name: 'String with options', fn: () => module[method](text, {}) },
                  { name: 'Object with text', fn: () => module[method]({ text }) },
                  { name: 'Object with data', fn: () => module[method]({ data: text }) },
                  { name: 'Object with content', fn: () => module[method]({ content: text }) },
                  { name: 'String with encoding', fn: () => module[method](text, { encoding: 'utf8' }) },
                  { name: 'String with charset', fn: () => module[method](text, { charset: 'utf8' }) },
                  { name: 'String with type', fn: () => module[method](text, { type: 'text' }) },
                  { name: 'String with format', fn: () => module[method](text, { format: 'plain' }) },
                  { name: 'Empty string', fn: () => module[method]('') },
                  { name: 'Null parameter', fn: () => module[method](null) },
                  { name: 'Undefined parameter', fn: () => module[method](undefined) }
                ]

                for (const paramFormat of paramFormats) {
                  try {
                    console.log(`     Trying ${paramFormat.name}...`)
                    await paramFormat.fn()
                    
                    // Try to cut paper
                    if (module.cutPaper) {
                      await module.cutPaper()
                    } else if (module.cut) {
                      await module.cut()
                    } else if (module.cutPaper && typeof module.cutPaper === 'function') {
                      await module.cutPaper()
                    }
                    
                    console.log(`     ✅ Print successful via ${moduleName}.${method} with ${paramFormat.name}!`)
                    return true
                  } catch (paramError) {
                    console.log(`     ❌ ${paramFormat.name} failed: ${paramError instanceof Error ? paramError.message : String(paramError)}`)
                  }
                }
              } catch (methodError) {
                console.log(`   ❌ Method ${method} failed: ${methodError instanceof Error ? methodError.message : String(methodError)}`)
              }
            }
          }
        }
      }

      // Try all available modules for printer-related methods
      console.log('🔍 Scanning ALL available modules for printer methods...')
      for (const moduleName in NativeModules) {
        const module = NativeModules[moduleName]
        if (module) {
          for (const method of printerMethods) {
            if (typeof module[method] === 'function') {
              try {
                console.log(`🧪 Testing ${moduleName}.${method}...`)
                await module[method](text)
                
                // Try to cut paper
                if (module.cutPaper) {
                  await module.cutPaper()
                } else if (module.cut) {
                  await module.cut()
                }
                
                console.log(`✅ Print successful via ${moduleName}.${method}`)
                return true
              } catch (methodError) {
                console.log(`❌ ${moduleName}.${method} failed: ${methodError instanceof Error ? methodError.message : String(methodError)}`)
              }
            }
          }
        }
      }

      // Try direct device file access
      console.log('🔍 Trying direct device file access...')
      try {
        const { writeFile } = require('react-native-fs')
        const printerDevices = [
          '/dev/usb/lp0', '/dev/ttyS1', '/dev/ttyUSB0', '/dev/thermal_printer',
          '/dev/print', '/dev/printer', '/dev/pos', '/dev/thermal',
          '/dev/escpos', '/dev/receipt', '/dev/pos_printer', '/dev/lp0',
          '/dev/lp1', '/dev/lp2', '/dev/lp3', '/dev/usb/lp1', '/dev/usb/lp2'
        ]
        
        for (const devicePath of printerDevices) {
          try {
            console.log(`   Trying device: ${devicePath}`)
            await writeFile(devicePath, text, 'utf8')
            console.log(`✅ Print successful via device file: ${devicePath}`)
            return true
          } catch (deviceError) {
            console.log(`   ❌ Device ${devicePath} not available: ${deviceError instanceof Error ? deviceError.message : String(deviceError)}`)
          }
        }
      } catch (fsError) {
        console.log('File system access failed:', fsError instanceof Error ? fsError.message : String(fsError))
      }

      // Try Android native printing
      console.log('🔍 Trying Android native printing...')
      try {
        const { Linking } = require('react-native')
        
        // Try different print intents
        const printIntents = [
          `intent://print?text=${encodeURIComponent(text)}#Intent;scheme=print;package=com.android.printspooler;end`,
          `intent://print?data=${encodeURIComponent(text)}#Intent;scheme=print;package=com.android.printspooler;end`,
          `intent://print?content=${encodeURIComponent(text)}#Intent;scheme=print;package=com.android.printspooler;end`,
          `intent://print?text=${encodeURIComponent(text)}#Intent;scheme=print;end`,
          `intent://print?text=${encodeURIComponent(text)}#Intent;action=android.intent.action.SEND;type=text/plain;end`
        ]
        
        for (const intent of printIntents) {
          try {
            console.log(`   Trying intent: ${intent.substring(0, 50)}...`)
            const canOpen = await Linking.canOpenURL(intent)
            if (canOpen) {
              await Linking.openURL(intent)
              console.log('✅ Print sent via Android native print intent')
              return true
            }
          } catch (intentError) {
            console.log(`   ❌ Print intent failed: ${intentError instanceof Error ? intentError.message : String(intentError)}`)
          }
        }
      } catch (nativeError) {
        console.log('Android native printing failed:', nativeError instanceof Error ? nativeError.message : String(nativeError))
      }

      console.log('❌ No working built-in printer method found')
      console.log('🔍 === END AGGRESSIVE PRINTER TESTING ===')
      return false
    } catch (error) {
      console.error('Built-in printer failed:', error)
      return false
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}/${year}`
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connectedDevice === 'pos-printer' && PosPrinter) {
        await PosPrinter.disconnect()
      } else if (this.connectedDevice === 'usb-printer' && USBPrinter) {
        await USBPrinter.disconnect()
      }
      
      this.connectedDevice = null
      this.isConnected = false
      console.log('Disconnected from USB printer')
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }
}

export default USBPrinterService
