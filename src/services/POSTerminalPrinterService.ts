import { NativeModules, Platform } from 'react-native'

interface Order {
  orderId: string
  orderNumber?: string
  orderDate: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  storeInfo?: {
    name: string
  }
}

class POSTerminalPrinterService {
  private isConnected: boolean = false
  private isInitialized: boolean = false

  /**
   * Connect to the IPOS printer service via AIDL
   * This establishes the AIDL connection to the built-in printer service
   * @returns {Promise<boolean>} True if connection successful, false otherwise
   */
  async connectPrinterService(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('❌ POS Terminal printer only works on Android')
        return false
      }

      console.log('🔌 Connecting to IPOS printer service via AIDL...')
      
      const { POSTerminalPrinter } = NativeModules
      if (!POSTerminalPrinter) {
        console.log('❌ POSTerminalPrinter module not found')
        return false
      }

      // Check if already connected
      const alreadyConnected = await POSTerminalPrinter.isPrinterConnected()
      if (alreadyConnected) {
        console.log('✅ Already connected to IPOS printer service')
        this.isConnected = true
        return true
      }

      // Attempt to connect via AIDL (this will also try to start the service)
      const connected = await POSTerminalPrinter.connectPrinterService()
      console.log(`🔍 AIDL connection result: ${connected}`)

      if (connected) {
        this.isConnected = true
        console.log('✅ Successfully connected to IPOS printer service via AIDL')
        return true
      } else {
        console.log('⚠️ Failed to connect to IPOS printer service')
        console.log('   The service package is installed but may not be running')
        console.log('   Try:')
        console.log('   1. Restart the device')
        console.log('   2. Check if the service app needs to be manually started')
        console.log('   3. Verify device has built-in printer hardware')
        this.isConnected = false
        return false
      }
    } catch (error) {
      console.error('Failed to connect printer service:', error)
      this.isConnected = false
      return false
    }
  }

  async initializePrinter(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('❌ POS Terminal printer only works on Android')
        return false
      }

      console.log('🔌 Initializing POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      if (!POSTerminalPrinter) {
        console.log('❌ POSTerminalPrinter module not found')
        return false
      }

      // First, try to connect if not already connected
      const connected = await POSTerminalPrinter.isPrinterConnected()
      console.log(`🔍 Printer connected: ${connected}`)

      if (!connected) {
        console.log('⚠️ Printer not connected, attempting to connect via AIDL...')
        const connectionResult = await this.connectPrinterService()
        if (!connectionResult) {
          console.log('❌ Failed to connect to printer service')
          return false
        }
      }

      // Initialize the printer
      const initialized = await POSTerminalPrinter.initializePrinter()
      console.log(`🔧 Printer initialized: ${initialized}`)
      
      this.isInitialized = initialized
      this.isConnected = true
      
      if (initialized) {
        console.log('✅ POS Terminal printer ready!')
        return true
      }

      console.log('❌ POS Terminal printer initialization failed')
      return false
    } catch (error) {
      console.error('Failed to initialize POS Terminal printer:', error)
      return false
    }
  }

  async testPrint(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('🧪 Testing POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      const testText = `
PRINTER TEST
POS Terminal OK
Connection Successful

Test completed successfully!
`

      const success = await POSTerminalPrinter.printText(testText)
      if (success) {
        console.log('✅ Test print successful via POS Terminal printer')
        return true
      } else {
        console.log('❌ Test print failed via POS Terminal printer')
        return false
      }
    } catch (error) {
      console.error('Test print failed:', error)
      return false
    }
  }

  async printOrderClaimStub(order: Order): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('🖨️ Printing claim stub via POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      const claimStubText = this.generateClaimStubText(order)

      const success = await POSTerminalPrinter.printReceipt(claimStubText)
      if (success) {
        console.log('✅ Claim stub printed successfully via POS Terminal printer')
        return true
      } else {
        console.log('❌ Claim stub print failed via POS Terminal printer')
        return false
      }
    } catch (error) {
      console.error('Print order claim stub failed:', error)
      return false
    }
  }

  async printText(text: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('🖨️ Printing text via POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printText(text)
      
      if (success) {
        console.log('✅ Text printed successfully via POS Terminal printer')
        return true
      } else {
        console.log('❌ Text print failed via POS Terminal printer')
        return false
      }
    } catch (error) {
      console.error('Print text failed:', error)
      return false
    }
  }

  async cutPaper(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('✂️ Cutting paper via POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.cutPaper()
      
      if (success) {
        console.log('✅ Paper cut successfully via POS Terminal printer')
        return true
      } else {
        console.log('❌ Paper cut failed via POS Terminal printer')
        return false
      }
    } catch (error) {
      console.error('Cut paper failed:', error)
      return false
    }
  }

  async getPrinterStatus(): Promise<number> {
    try {
      const { POSTerminalPrinter } = NativeModules
      if (!POSTerminalPrinter) {
        throw new Error('Module not available')
      }

      const status = await POSTerminalPrinter.getPrinterStatus()
      return status
    } catch (error) {
      console.error('Get printer status failed:', error)
      throw error
    }
  }

  /**
   * Feed paper lines (forced line feed, motor idling, no data sent to printer)
   * @param lines Number of printer feed lines (each line is one pixel)
   */
  async printerFeedLines(lines: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`📄 Feeding paper lines: ${lines}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printerFeedLines(lines)
      
      if (success) {
        console.log('✅ Paper feed successful')
        return true
      } else {
        console.log('❌ Paper feed failed')
        return false
      }
    } catch (error) {
      console.error('Feed paper lines failed:', error)
      return false
    }
  }

  /**
   * Print blank lines (forced line feed, data sent to printer is all 0x00)
   * @param lines Number of blank lines to print (max 100 lines)
   * @param height Height of blank line in pixels
   */
  async printBlankLines(lines: number, height: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      if (lines > 100) {
        console.warn('⚠️ Blank lines limited to 100, using 100')
        lines = 100
      }

      console.log(`📄 Printing blank lines: ${lines}, height: ${height}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printBlankLines(lines, height)
      
      if (success) {
        console.log('✅ Blank lines printed successfully')
        return true
      } else {
        console.log('❌ Blank lines print failed')
        return false
      }
    } catch (error) {
      console.error('Print blank lines failed:', error)
      return false
    }
  }

  /**
   * Print text with specified font type and size (font settings only apply to this print)
   * @param text Text string to print
   * @param typeface Font name (ST - currently only one supported)
   * @param fontsize Font size (16, 24, 32, 48 - invalid size defaults to 24)
   */
  async printSpecifiedTypeText(text: string, typeface: string, fontsize: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`🖨️ Printing text with font: ${typeface}, size: ${fontsize}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printSpecifiedTypeText(text, typeface, fontsize)
      
      if (success) {
        console.log('✅ Text printed successfully with specified font')
        return true
      } else {
        console.log('❌ Text print failed')
        return false
      }
    } catch (error) {
      console.error('Print specified type text failed:', error)
      return false
    }
  }

  /**
   * Print text with specified font type, size, and alignment (font settings only apply to this print)
   * @param text Text string to print
   * @param typeface Font name (ST - currently only one supported)
   * @param fontsize Font size (16, 24, 32, 48 - invalid size defaults to 24)
   * @param alignment Alignment (0=left, 1=center, 2=right)
   */
  async printSpecFormatText(text: string, typeface: string, fontsize: number, alignment: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`🖨️ Printing formatted text: font=${typeface}, size=${fontsize}, align=${alignment}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printSpecFormatText(text, typeface, fontsize, alignment)
      
      if (success) {
        console.log('✅ Formatted text printed successfully')
        return true
      } else {
        console.log('❌ Formatted text print failed')
        return false
      }
    } catch (error) {
      console.error('Print formatted text failed:', error)
      return false
    }
  }

  /**
   * Print a table row with specified column widths and alignment
   * @param colsTextArr Array of text strings for each column
   * @param colsWidthArr Array of column widths
   * @param colsAlign Array of column alignments (0=left, 1=center, 2=right)
   * @param isContinuousPrint Whether to continue printing table (1=continue, 0=don't continue)
   */
  async printColumnsText(colsTextArr: string[], colsWidthArr: number[], colsAlign: number[], isContinuousPrint: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`📊 Printing table row with ${colsTextArr.length} columns`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printColumnsText({
        colsTextArr,
        colsWidthArr,
        colsAlign,
        isContinuousPrint
      })
      
      if (success) {
        console.log('✅ Table row printed successfully')
        return true
      } else {
        console.log('❌ Table row print failed')
        return false
      }
    } catch (error) {
      console.error('Print columns text failed:', error)
      return false
    }
  }

  /**
   * Print 1D barcode
   * @param data Barcode data
   * @param symbology Barcode type (0=UPC-A, 1=UPC-E, 2=JAN13/EAN13, 3=JAN8/EAN8, 4=CODE39, 5=ITF, 6=CODABAR, 7=CODE93, 8=CODE128)
   * @param height Barcode height (1-16, default 6, each unit = 24 pixels)
   * @param width Barcode width (1-16, default 12, each unit = 24 pixels)
   * @param textposition Text position (0=no text, 1=above, 2=below, 3=above and below)
   */
  async printBarCode(data: string, symbology: number, height: number, width: number, textposition: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`📊 Printing barcode: ${data}, type: ${symbology}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printBarCode(data, symbology, height, width, textposition)
      
      if (success) {
        console.log('✅ Barcode printed successfully')
        return true
      } else {
        console.log('❌ Barcode print failed')
        return false
      }
    } catch (error) {
      console.error('Print barcode failed:', error)
      return false
    }
  }

  /**
   * Set printer print depth (affects subsequent prints until initialization)
   * @param depth Depth level (1-10, default 6)
   */
  async setPrinterPrintDepth(depth: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`⚙️ Setting print depth: ${depth}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.setPrinterPrintDepth(depth)
      
      if (success) {
        console.log('✅ Print depth set successfully')
        return true
      } else {
        console.log('❌ Set print depth failed')
        return false
      }
    } catch (error) {
      console.error('Set print depth failed:', error)
      return false
    }
  }

  /**
   * Set printer font type (affects subsequent prints until initialization)
   * @param typeface Font name (ST - currently only one supported)
   */
  async setPrinterPrintFontType(typeface: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`⚙️ Setting font type: ${typeface}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.setPrinterPrintFontType(typeface)
      
      if (success) {
        console.log('✅ Font type set successfully')
        return true
      } else {
        console.log('❌ Set font type failed')
        return false
      }
    } catch (error) {
      console.error('Set font type failed:', error)
      return false
    }
  }

  /**
   * Set printer font size (affects subsequent prints until initialization)
   * @param fontsize Font size (16, 24, 32, 48 - invalid size defaults to 24)
   */
  async setPrinterPrintFontSize(fontsize: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`⚙️ Setting font size: ${fontsize}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.setPrinterPrintFontSize(fontsize)
      
      if (success) {
        console.log('✅ Font size set successfully')
        return true
      } else {
        console.log('❌ Set font size failed')
        return false
      }
    } catch (error) {
      console.error('Set font size failed:', error)
      return false
    }
  }

  /**
   * Set printer alignment (affects subsequent prints until initialization)
   * @param alignment Alignment (0=left, 1=center, 2=right, default center)
   */
  async setPrinterPrintAlignment(alignment: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`⚙️ Setting alignment: ${alignment}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.setPrinterPrintAlignment(alignment)
      
      if (success) {
        console.log('✅ Alignment set successfully')
        return true
      } else {
        console.log('❌ Set alignment failed')
        return false
      }
    } catch (error) {
      console.error('Set alignment failed:', error)
      return false
    }
  }

  /**
   * Print bitmap image
   * @param alignment Alignment (0=left, 1=center, 2=right, default center)
   * @param bitmapSize Bitmap size (1-16, default 10, unit: 24 pixels)
   * @param bitmapBase64 Base64 encoded bitmap image string
   */
  async printBitmap(alignment: number, bitmapSize: number, bitmapBase64: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`🖼️ Printing bitmap, alignment: ${alignment}, size: ${bitmapSize}`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printBitmap(alignment, bitmapSize, bitmapBase64)
      
      if (success) {
        console.log('✅ Bitmap printed successfully')
        return true
      } else {
        console.log('❌ Bitmap print failed')
        return false
      }
    } catch (error) {
      console.error('Print bitmap failed:', error)
      return false
    }
  }

  /**
   * Print raw byte data
   * @param rawData Base64 encoded byte array
   */
  async printRawData(rawData: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('📦 Printing raw byte data')
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printRawData(rawData)
      
      if (success) {
        console.log('✅ Raw data printed successfully')
        return true
      } else {
        console.log('❌ Raw data print failed')
        return false
      }
    } catch (error) {
      console.error('Print raw data failed:', error)
      return false
    }
  }

  /**
   * Send ESC/POS command data
   * @param cmdData Base64 encoded ESC/POS command byte array
   */
  async sendUserCMDData(cmdData: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log('📤 Sending ESC/POS command data')
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.sendUserCMDData(cmdData)
      
      if (success) {
        console.log('✅ ESC/POS command sent successfully')
        return true
      } else {
        console.log('❌ ESC/POS command failed')
        return false
      }
    } catch (error) {
      console.error('Send ESC/POS command failed:', error)
      return false
    }
  }

  /**
   * Detect if IPOS printer service is available on the device
   * This checks for the installed IPOS printer service package and AIDL connection status
   * @returns {Promise<object>} Detection result with found, serviceAvailable, aidlConnected, etc.
   */
  async detectIPOSPrinter(): Promise<{
    found: boolean;
    serviceAvailable: boolean;
    aidlConnected: boolean;
    isConnected: boolean;
    packageName: string | null;
    action: string | null;
  }> {
    try {
      if (Platform.OS !== 'android') {
        console.log('❌ IPOS printer detection only works on Android')
        return {
          found: false,
          serviceAvailable: false,
          aidlConnected: false,
          isConnected: false,
          packageName: null,
          action: null
        }
      }

      console.log('🔍 Detecting IPOS printer service...')
      
      const { POSTerminalPrinter } = NativeModules
      if (!POSTerminalPrinter) {
        console.log('❌ POSTerminalPrinter module not found')
        return {
          found: false,
          serviceAvailable: false,
          aidlConnected: false,
          isConnected: false,
          packageName: null,
          action: null
        }
      }

      if (typeof POSTerminalPrinter.detectIPOSPrinter !== 'function') {
        console.log('❌ detectIPOSPrinter method not available')
        return {
          found: false,
          serviceAvailable: false,
          aidlConnected: false,
          isConnected: false,
          packageName: null,
          action: null
        }
      }

      const result = await POSTerminalPrinter.detectIPOSPrinter()
      console.log('📊 IPOS Printer Detection Result:', result)
      
      if (result.found) {
        console.log('✅ IPOS printer service found!')
        console.log(`   Package: ${result.packageName || 'Unknown'}`)
        console.log(`   Service Available: ${result.serviceAvailable}`)
        console.log(`   AIDL Connected: ${result.aidlConnected}`)
        console.log(`   Is Connected: ${result.isConnected}`)
      } else {
        console.log('⚠️ IPOS printer service not found on device')
        console.log('   Make sure the IPOS printer service app is installed')
        console.log('   Expected package: com.iposprinter.iposprinterservice')
      }

      return result
    } catch (error) {
      console.error('Failed to detect IPOS printer:', error)
      return {
        found: false,
        serviceAvailable: false,
        aidlConnected: false,
        isConnected: false,
        packageName: null,
        action: null
      }
    }
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
}

export default new POSTerminalPrinterService()




