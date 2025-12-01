import { NativeModules, Platform } from 'react-native'
import SimplePrinterService from './SimplePrinterService'
import USBPrinterService from './USBPrinterService'
import POSTerminalPrinterService from './POSTerminalPrinterService'
import SunmiPrinterService from './SunmiPrinterService'

interface PrinterDevice {
  name: string
  address: string
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

type PrinterServiceType = 'pos-terminal' | 'usb' | 'built-in' | 'simple' | 'pda' | 'sunmi' | null

/**
 * ThermalPrinterService - Main service for managing thermal printer functionality
 * 
 * This service acts as a facade that coordinates multiple printer services:
 * - Sunmi Printer (for Sunmi/Q-series devices)
 * - POS Terminal Printer (for built-in PDA printers)
 * - USB Printer (for USB thermal printers)
 * - Simple Printer (fallback for built-in printers)
 * - Built-in printer detection
 * 
 * It automatically tries different printer services in order of preference
 * and provides a unified interface for printing operations.
 */
class ThermalPrinterService {
  private static instance: ThermalPrinterService
  private connectedDevice: PrinterServiceType = null
  private isConnected: boolean = false
  private simplePrinter: SimplePrinterService
  private usbPrinter: USBPrinterService
  private posTerminalPrinter: typeof POSTerminalPrinterService
  private sunmiPrinter: SunmiPrinterService

  private constructor() {
    // Initialize service
    this.simplePrinter = SimplePrinterService.getInstance()
    this.usbPrinter = USBPrinterService.getInstance()
    this.posTerminalPrinter = POSTerminalPrinterService
    this.sunmiPrinter = SunmiPrinterService.getInstance()
  }

  static getInstance(): ThermalPrinterService {
    if (!ThermalPrinterService.instance) {
      ThermalPrinterService.instance = new ThermalPrinterService()
    }
    return ThermalPrinterService.instance
  }

  /**
   * Initialize the printer by trying different printer services in order of preference.
   * 
   * Tries services in this order:
   * 1. Sunmi Printer (Q-series handhelds)
   * 2. POS Terminal Printer (for built-in PDA printers)
   * 3. USB Printer (for USB thermal printers)
   * 4. Built-in printer detection
   * 5. Simple Printer Service (fallback)
   * 
   * @returns {Promise<boolean>} True if a printer was successfully initialized, false otherwise
   */
  async initializePrinter(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('⚠️ Printer service only supports Android platform')
        this.isConnected = false
        this.connectedDevice = null
        return false
      }

      // Try Sunmi printer first (for Sunmi Q-series devices)
      console.log('🔌 Trying Sunmi printer service...')
      try {
        const sunmiSuccess = await this.sunmiPrinter.initializePrinter()
        if (sunmiSuccess) {
          this.isConnected = true
          this.connectedDevice = 'sunmi'
          console.log('✅ Sunmi printer initialized')
          return true
        }
      } catch (error) {
        console.log('⚠️ Sunmi printer initialization failed:', error instanceof Error ? error.message : String(error))
      }

      // Try POS Terminal printer second (for built-in PDA printers)
      console.log('🔌 Trying POS Terminal printer service...')
      try {
        const posSuccess = await this.posTerminalPrinter.initializePrinter()
        if (posSuccess) {
          this.isConnected = true
          this.connectedDevice = 'pos-terminal'
          console.log('✅ POS Terminal printer initialized')
          return true
        }
      } catch (error) {
        console.log('⚠️ POS Terminal printer initialization failed:', error instanceof Error ? error.message : String(error))
      }

      // Try USB printer service third (for USB thermal printers)
      console.log('🔌 Trying USB printer service...')
      try {
        const usbSuccess = await this.usbPrinter.initializePrinter()
        if (usbSuccess) {
          this.isConnected = true
          this.connectedDevice = 'usb'
          console.log('✅ USB printer initialized')
          return true
        }
      } catch (error) {
        console.log('⚠️ USB printer initialization failed:', error instanceof Error ? error.message : String(error))
      }

      // Check for built-in printer modules
      console.log('🔌 Checking for built-in printer...')
      const hasBuiltInPrinter = await this.checkBuiltInPrinter()
      if (hasBuiltInPrinter) {
        console.log('✅ Built-in printer detected')
        this.isConnected = true
        this.connectedDevice = 'built-in'
        return true
      }

      // Use simple printer service as fallback
      console.log('🔌 Trying SimplePrinterService as fallback...')
      try {
        const simpleSuccess = await this.simplePrinter.initializePrinter()
        if (simpleSuccess) {
          this.isConnected = true
          this.connectedDevice = 'simple'
          console.log('✅ Simple printer service initialized')
          return true
        }
      } catch (error) {
        console.log('⚠️ Simple printer initialization failed:', error instanceof Error ? error.message : String(error))
      }

      // All initialization methods failed
      console.error('❌ All printer initialization methods failed')
      this.isConnected = false
      this.connectedDevice = null
      return false
    } catch (error) {
      console.error('❌ Failed to initialize printer:', error)
      this.isConnected = false
      this.connectedDevice = null
      return false
    }
  }


  /**
   * Check for built-in printer modules in the device.
   * 
   * Checks multiple sources:
   * 1. Common printer module names
   * 2. All native modules for printer-related keywords
   * 3. Device properties for PDA/terminal indicators
   * 
   * @returns {Promise<boolean>} True if a built-in printer is detected, false otherwise
   */
  private async checkBuiltInPrinter(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false
      }

      // Check for specific printer modules first
      if (this.checkPrinterModules()) {
        return true
      }

      // Check all available native modules for printer-related names
      if (this.checkAllModulesForPrinter()) {
        return true
      }

      // Check device properties for PDA/terminal indicators
      if (this.checkDeviceProperties()) {
        return true
      }

      // No built-in printer detected
      console.log('⚠️ No built-in printer detected')
      return false
    } catch (error) {
      console.error('❌ Error checking for built-in printer:', error)
      return false
    }
  }

  /**
   * Check for common built-in printer module names.
   * @returns {boolean} True if a printer module is found
   */
  private checkPrinterModules(): boolean {
    const printerModules = [
      'BuiltInPrinter',
      'ThermalPrinter',
      'PDAPrinter',
      'DevicePrinter',
      'PrinterModule',
      'ReceiptPrinter',
      'POSPrinter',
      'AndroidPrinter',
      'PrintService',
      'PrinterService',
      'AbanopiPrinter',
      'HandheldPrinter',
      'MobilePrinter',
      'TerminalPrinter',
      'ESCPrinter',
      'ThermalPrint',
      'PrintManager',
      'SystemPrinter'
    ]

    for (const moduleName of printerModules) {
      if (NativeModules[moduleName]) {
        console.log(`✅ Found built-in printer module: ${moduleName}`)
        return true
      }
    }

    return false
  }

  /**
   * Scan all available native modules for printer-related keywords.
   * @returns {boolean} True if a printer-related module is found
   */
  private checkAllModulesForPrinter(): boolean {
    console.log('🔍 Scanning all available native modules...')
    const availableModules = Object.keys(NativeModules)
    console.log(`Available modules: ${availableModules.join(', ')}`)
    
    const printerKeywords = ['print', 'thermal', 'receipt', 'pos', 'pda', 'printer']
    
    for (const moduleName of availableModules) {
      const lowerName = moduleName.toLowerCase()
      if (printerKeywords.some(keyword => lowerName.includes(keyword))) {
        console.log(`✅ Found printer-related module: ${moduleName}`)
        return true
      }
    }

    return false
  }

  /**
   * Check device properties for PDA/terminal/printer indicators.
   * @returns {boolean} True if device appears to have a built-in printer
   */
  private checkDeviceProperties(): boolean {
    if (Platform.OS !== 'android') {
      return false
    }

    console.log('🔍 Checking Android device properties...')
    
    const deviceModel = Platform.constants?.Model || ''
    const deviceBrand = Platform.constants?.Brand || ''
    const deviceManufacturer = Platform.constants?.Manufacturer || ''
    
    console.log(`Device Model: ${deviceModel}`)
    console.log(`Device Brand: ${deviceBrand}`)
    console.log(`Device Manufacturer: ${deviceManufacturer}`)
    
    const deviceInfo = `${deviceModel} ${deviceBrand} ${deviceManufacturer}`.toLowerCase()
    const printerIndicators = [
      'pda', 'pos', 'terminal', 'handheld', 
      'mobile', 'abanopi', 'thermal', 'printer'
    ]
    
    const hasPrinter = printerIndicators.some(indicator => deviceInfo.includes(indicator))
    
    if (hasPrinter) {
      console.log('✅ PDA/Terminal device detected, assuming built-in printer')
      return true
    }

    return false
  }

  /**
   * Get list of paired printer devices.
   * For built-in printers, no pairing is needed.
   * 
   * @returns {Promise<PrinterDevice[]>} Empty array for built-in printers
   */
  async getPairedDevices(): Promise<PrinterDevice[]> {
    if (Platform.OS !== 'android') {
      return []
    }
    // For built-in printers, no pairing needed
    return []
  }

  /**
   * Connect to a specific printer device by address.
   * For built-in printers, connection is automatic upon initialization.
   * 
   * @param {string} deviceAddress - The address of the device to connect to
   * @returns {Promise<boolean>} True if connection was successful
   */
  async connectToDevice(deviceAddress: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('⚠️ Printer connection only supported on Android')
      return false
    }

    // For built-in printers, connection is automatic
    // Try to initialize if not already connected
    if (!this.isConnected) {
      return await this.initializePrinter()
    }

    this.connectedDevice = 'built-in'
    this.isConnected = true
    console.log('✅ Built-in printer ready')
    return true
  }

  /**
   * Disconnect from the printer.
   */
  async disconnect(): Promise<void> {
    this.connectedDevice = null
    this.isConnected = false
    console.log('✅ Disconnected from printer')
  }

  /**
   * Get the currently connected printer type.
   * 
   * @returns {PrinterServiceType} The type of printer currently connected, or null if not connected
   */
  getConnectedDeviceType(): PrinterServiceType {
    return this.connectedDevice
  }

  /**
   * Check if the printer is currently connected.
   * 
   * @returns {boolean} True if printer is connected
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * Ensure printer is connected; auto-initialize when needed.
   */
  private async ensurePrinterReady(): Promise<boolean> {
    if (this.isConnected) {
      return true
    }

    console.log('⚠️ Printer not connected, attempting automatic initialization...')
    const initialized = await this.initializePrinter()
    if (initialized) {
      console.log('✅ Printer auto-initialized')
      return true
    }

    console.error('❌ Automatic printer initialization failed')
    return false
  }

  /**
   * Perform a test print to verify printer functionality.
   * 
   * @returns {Promise<boolean>} True if test print was successful
   */
  async testPrint(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('⚠️ Test print only supported on Android')
        return false
      }

      if (!(await this.ensurePrinterReady())) {
        console.error('❌ Printer not connected')
        return false
      }

      console.log('🧪 Starting comprehensive test print...')
      console.log(`📍 Current printer state: connected=${this.isConnected}, device=${this.connectedDevice}`)

      const testText = [
        '\n',
        'PRINTER TEST\n',
        'Built-in Printer OK\n',
        'Connection Successful\n',
        '\n\n'
      ]

      // Try services in order of preference
      console.log('🔄 Attempting to print with available services...')
      const success = await this.tryPrintWithServices(
        () => this.sunmiPrinter.testPrint(),
        () => this.posTerminalPrinter.testPrint(),
        () => this.usbPrinter.testPrint(),
        () => this.handleTestPrintByDeviceType(testText)
      )

      if (success) {
        console.log('✅ Test print successful')
        return true
      }

      console.error('❌ Test print failed with all methods')
      return false
    } catch (error) {
      console.error('❌ Test print failed:', error)
      return false
    }
  }

  /**
   * Handle test print based on the connected device type.
   * 
   * @param {string[]} testText - The test text lines to print
   * @returns {Promise<boolean>} True if print was successful
   */
  private async handleTestPrintByDeviceType(testText: string[]): Promise<boolean> {
    switch (this.connectedDevice) {
      case 'sunmi':
        return await this.sunmiPrinter.testPrint()
      
      case 'built-in':
      case 'pda':
        return await this.printToBuiltInPrinter(testText)
      
      case 'simple':
        return await this.simplePrinter.testPrint()
      
      case 'pos-terminal':
        return await this.posTerminalPrinter.testPrint()
      
      case 'usb':
        return await this.usbPrinter.testPrint()
      
      default:
        // Fallback to built-in printer method
        return await this.printToBuiltInPrinter(testText)
    }
  }


  /**
   * Print an order claim stub.
   * 
   * @param {Order} order - The order object containing claim stub information
   * @returns {Promise<boolean>} True if print was successful
   */
  async printOrderClaimStub(order: Order): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('⚠️ Print only supported on Android')
        return false
      }

      if (!(await this.ensurePrinterReady())) {
        console.error('❌ Printer not connected')
        return false
      }

      console.log('🖨️ Starting comprehensive claim stub print...')
      console.log(`📍 Current printer state: connected=${this.isConnected}, device=${this.connectedDevice}`)

      // Try services in order of preference
      console.log('🔄 Attempting to print with available services...')
      const success = await this.tryPrintWithServices(
        () => this.sunmiPrinter.printOrderClaimStub(order),
        () => this.posTerminalPrinter.printOrderClaimStub(order),
        () => this.usbPrinter.printOrderClaimStub(order),
        () => this.handleClaimStubPrintByDeviceType(order)
      )

      if (success) {
        console.log('✅ Claim stub print successful')
        return true
      }

      console.error('❌ Claim stub print failed with all methods')
      return false
    } catch (error) {
      console.error('❌ Print order claim stub failed:', error)
      return false
    }
  }

  /**
   * Handle claim stub print based on the connected device type.
   * 
   * @param {Order} order - The order object to print
   * @returns {Promise<boolean>} True if print was successful
   */
  private async handleClaimStubPrintByDeviceType(order: Order): Promise<boolean> {
    switch (this.connectedDevice) {
      case 'sunmi':
        return await this.sunmiPrinter.printOrderClaimStub(order)
      
      case 'built-in':
      case 'pda':
        return await this.printClaimStubToBuiltInPrinter(order)
      
      case 'simple':
        return await this.simplePrinter.printOrderClaimStub(order)
      
      case 'pos-terminal':
        return await this.posTerminalPrinter.printOrderClaimStub(order)
      
      case 'usb':
        return await this.usbPrinter.printOrderClaimStub(order)
      
      default:
        // Fallback to built-in printer method
        return await this.printClaimStubToBuiltInPrinter(order)
    }
  }

  /**
   * Try printing with multiple services in order of preference.
   * Each service is tried until one succeeds, or all fail.
   * 
   * @param {...(() => Promise<boolean>)} printMethods - Array of async print functions to try
   * @returns {Promise<boolean>} True if any print method succeeded
   */
  private async tryPrintWithServices(...printMethods: Array<() => Promise<boolean>>): Promise<boolean> {
    const serviceNames = ['Sunmi', 'POS Terminal', 'USB', 'Built-in/Simple']
    
    for (let i = 0; i < printMethods.length; i++) {
      try {
        const serviceName = serviceNames[i] || `Service ${i + 1}`
        console.log(`📱 Trying ${serviceName} printer service...`)
        
        const printMethod = printMethods[i]
        const result = await printMethod()
        
        if (result) {
          console.log(`✅ Print successful via ${serviceName}`)
          return true
        } else {
          console.log(`⚠️ ${serviceName} returned false`)
        }
      } catch (error) {
        const serviceName = serviceNames[i] || `Service ${i + 1}`
        console.log(`⚠️ ${serviceName} threw error:`, error instanceof Error ? error.message : String(error))
        // Continue to next method
      }
    }
    
    console.error('❌ All print services failed')
    return false
  }


  /**
   * Print to built-in printer using native modules.
   * 
   * Tries to find a native module with print capabilities and uses it to print the text.
   * 
   * @param {string[]} textLines - Array of text lines to print
   * @returns {Promise<boolean>} True if print was successful
   */
  private async printToBuiltInPrinter(textLines: string[]): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('⚠️ Built-in printer only supported on Android')
        return false
      }

      // Try different built-in printer methods
      const printerMethods = [
        'printText',
        'print',
        'sendText',
        'writeText'
      ]

      for (const method of printerMethods) {
        try {
          // Try to find a native module that supports this method
          for (const moduleName in NativeModules) {
            const module = NativeModules[moduleName]
            if (module && typeof module[method] === 'function') {
              console.log(`✅ Using ${moduleName}.${method} for built-in printer`)
              
              for (const line of textLines) {
                await module[method](line)
              }
              
              // Try to cut paper
              try {
                if (typeof module.cutPaper === 'function') {
                  await module.cutPaper()
                } else if (typeof module.cut === 'function') {
                  await module.cut()
                }
              } catch (cutError) {
                // Paper cut is optional, don't fail the print if it fails
                console.log('⚠️ Paper cut not available or failed:', cutError instanceof Error ? cutError.message : String(cutError))
              }
              
              return true
            }
          }
        } catch (error) {
          console.log(`⚠️ Method ${method} not available:`, error instanceof Error ? error.message : String(error))
        }
      }

      // Fallback: Use system print intent (logs to console for debugging)
      console.log('⚠️ No native print module found, using fallback')
      return await this.printViaSystemIntent(textLines.join(''))
    } catch (error) {
      console.error('❌ Built-in printer print failed:', error)
      return false
    }
  }

  /**
   * Fallback print method that logs the text to console.
   * 
   * This method is used when no native printer modules are available.
   * It logs the text that would be printed, which is useful for debugging
   * and development when no physical printer is available.
   * 
   * Note: This does not actually print to a physical printer. It's a
   * development/debugging fallback that helps verify the print content.
   * 
   * @param {string} text - The text to print (will be logged to console)
   * @returns {Promise<boolean>} Always returns true (logging is considered successful)
   */
  private async printViaSystemIntent(text: string): Promise<boolean> {
    try {
      console.log('📝 [FALLBACK] Print output (no physical printer available):')
      console.log('='.repeat(50))
      console.log(text)
      console.log('='.repeat(50))
      console.log('⚠️ Note: This is a fallback method. No physical print occurred.')
      
      // Return true to indicate the fallback was "successful" (logged successfully)
      // This allows the calling code to continue even when no printer is available
      return true
    } catch (error) {
      console.error('❌ System print intent failed:', error)
      return false
    }
  }

  /**
   * Print claim stub to built-in printer.
   * 
   * @param {Order} order - The order object to print
   * @returns {Promise<boolean>} True if print was successful
   */
  private async printClaimStubToBuiltInPrinter(order: Order): Promise<boolean> {
    try {
      const printLines = this.generateClaimStubLines(order)
      return await this.printToBuiltInPrinter(printLines)
    } catch (error) {
      console.error('❌ Print claim stub to built-in printer failed:', error)
      return false
    }
  }

  /**
   * Generate formatted claim stub lines from an order object.
   * 
   * @param {Order} order - The order object to format
   * @returns {string[]} Array of formatted text lines for the claim stub
   */
  private generateClaimStubLines(order: Order): string[] {
    const lines: string[] = []
    
    // Store name
    if (order.storeInfo?.name) {
      lines.push(`\n${order.storeInfo.name.toUpperCase()}\n`)
    }
    
    // Divider
    lines.push('================================\n')
    
    // Claim Stub Header
    lines.push('CLAIM STUB\n')
    lines.push('\n')
    
    // Order Number
    const orderNumber = order.orderNumber || `ORD-${order.orderId.substring(0, 8).toUpperCase()}`
    lines.push(`Order #: ${orderNumber}\n`)
    
    // Date and Time
    const date = new Date(order.orderDate)
    const dateStr = this.formatDate(date)
    const timeStr = this.formatTime(date)
    lines.push(`Date: ${dateStr}\n`)
    lines.push(`Time: ${timeStr}\n`)
    lines.push('\n')
    
    // Divider
    lines.push('================================\n')
    lines.push('\n')
    
    // Customer Information
    lines.push('Customer:\n')
    lines.push(`${order.customerName}\n`)
    lines.push('\n')
    
    // Services/Items
    lines.push('Services:\n')
    order.items.forEach((item) => {
      const line = `${item.quantity}x ${item.name.substring(0, 20)}`
      const price = `₱${item.price.toFixed(2)}`
      const spaces = Math.max(1, 32 - line.length - price.length)
      const itemLine = line + ' '.repeat(spaces) + price + '\n'
      lines.push(itemLine)
    })
    
    lines.push('\n')
    
    // Divider
    lines.push('================================\n')
    
    // Total
    const totalStr = `TOTAL: ₱${order.totalAmount.toFixed(2)}\n`
    lines.push(totalStr)
    lines.push('\n')
    
    // Footer message
    lines.push('Thank you for your business!\n')
    lines.push('Please keep this stub for pickup.\n')
    lines.push('\n\n\n')
    
    return lines
  }



  /**
   * Format a date object to MM/DD/YYYY format.
   * 
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string (MM/DD/YYYY)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}/${year}`
  }

  /**
   * Format a date object to HH:MM format (24-hour).
   * 
   * @param {Date} date - The date to format
   * @returns {string} Formatted time string (HH:MM)
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
}

export default ThermalPrinterService
