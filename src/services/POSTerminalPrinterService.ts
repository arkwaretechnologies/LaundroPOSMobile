import { NativeModules, Platform } from 'react-native'
import { supabase } from '../../lib/supabase'

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
    address?: string
    phone?: string
  }
}

interface Store {
  id: string
  name: string
  address?: string
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
      if (!POSTerminalPrinter) {
        console.log('❌ POSTerminalPrinter module not found')
        return false
      }

      // Check printer status first (must be PRINTER_NORMAL = 0)
      const status = await this.getPrinterStatus()
      console.log(`📊 Printer status before test print: ${status}`)
      
      if (status !== 0) {
        console.error(`❌ Printer status is not NORMAL (${status}). Status must be 0 (PRINTER_NORMAL) to print.`)
        return false
      }

      // Build test print content using proper API methods
      // Step 1: Print header with formatting
      await POSTerminalPrinter.printSpecFormatText(
        'PRINTER TEST',
        'ST',  // typeface
        32,    // fontsize (large)
        1      // alignment: 1 = center
      )

      // Step 2: Print separator line
      await POSTerminalPrinter.printText('================================\n')

      // Step 3: Print test information
      await POSTerminalPrinter.printText('POS Terminal Printer\n')
      await POSTerminalPrinter.printText('Connection: OK\n')
      await POSTerminalPrinter.printText('Status: NORMAL\n')
      await POSTerminalPrinter.printText(`Time: ${new Date().toLocaleString()}\n`)

      // Step 4: Print separator
      await POSTerminalPrinter.printText('================================\n')

      // Step 5: Feed some blank lines before execution
      await POSTerminalPrinter.printerFeedLines(2)

      // Step 6: Check status again before executing print
      const finalStatus = await this.getPrinterStatus()
      if (finalStatus !== 0) {
        console.error(`❌ Printer status changed to ${finalStatus} - cannot execute print`)
        return false
      }

      // Step 7: Execute printing (feed 3 lines after print for easy tearing)
      // According to API: printerPerformPrint must be called to actually print
      // feedlines parameter: number of paper feed lines after printing
      console.log('🖨️ Executing print with printerPerformPrint(3)...')
      const printSuccess = await POSTerminalPrinter.printerPerformPrint(3)
      
      if (printSuccess) {
        console.log('✅ Test print successful via POS Terminal printer')
        return true
      } else {
        console.log('❌ printerPerformPrint returned false - print may have failed')
        return false
      }
    } catch (error) {
      console.error('Test print failed:', error)
      return false
    }
  }

  async printOrderClaimStub(order: Order): Promise<boolean> {
    try {
      // Always initialize printer before printing to ensure clean state
      console.log('🔌 Ensuring printer is initialized before printing...')
      const initialized = await this.initializePrinter()
      if (!initialized) {
        console.log('❌ Failed to initialize printer for claim ticket')
        return false
      }

      console.log('🖨️ Printing claim ticket via POS Terminal printer...')
      
      const { POSTerminalPrinter } = NativeModules
      
      // Verify connection one more time
      const isConnected = await POSTerminalPrinter.isPrinterConnected()
      if (!isConnected) {
        console.log('❌ Printer not connected after initialization')
        return false
      }
      
      // Wait a moment after initialization for printer to be ready
      console.log('⏳ Waiting for printer to be ready after initialization...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check printer status before starting
      let initialStatus = await this.getPrinterStatus()
      console.log(`📊 Initial printer status: ${initialStatus}`)
      
      // Wait for printer to be in normal state
      let statusRetries = 0
      while (initialStatus !== 0 && statusRetries < 5) {
        console.log(`⏳ Waiting for printer to be ready (status: ${initialStatus}, attempt ${statusRetries + 1})...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        initialStatus = await this.getPrinterStatus()
        statusRetries++
      }
      
      if (initialStatus !== 0) {
        console.log(`⚠️ Printer not in normal state after initialization (status: ${initialStatus}), but will attempt to print`)
      } else {
        console.log('✅ Printer is in normal state, ready to buffer content')
      }
      
      // Fetch selected store information
      console.log('🏪 Fetching selected store information...')
      const selectedStore = await this.fetchSelectedStore()
      if (selectedStore) {
        console.log(`✅ Selected store fetched: ${selectedStore.name}`)
        // Merge store info with order data
        order.storeInfo = {
          name: selectedStore.name,
          address: selectedStore.address,
          ...order.storeInfo // Allow order.storeInfo to override if present
        }
      } else {
        console.log('⚠️ Could not fetch selected store, using order.storeInfo if available')
      }
      
      const claimStubText = this.generateClaimStubText(order)

      try {
        // Step 1: Ensure printer is in normal state before buffering text
        let textStatus = await this.getPrinterStatus()
        if (textStatus !== 0) {
          console.log(`⚠️ Printer status before text: ${textStatus}, waiting...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          textStatus = await this.getPrinterStatus()
        }
        
        // Step 1: Print the text part (buffers, doesn't execute yet)
        console.log('📝 Buffering claim ticket text...')
        try {
          const textSuccess = await POSTerminalPrinter.printText(claimStubText)
          if (!textSuccess) {
            console.log('❌ Claim ticket text buffer failed - printText returned false')
            return false
          }
          console.log('✅ Text buffered successfully')
        } catch (textError: any) {
          console.error('❌ Text buffer error:', textError)
          if (textError?.message?.includes('PRINTER_NOT_READY') || textError?.code === 'PRINTER_NOT_READY') {
            console.error('❌ Printer not ready for text printing')
            return false
          }
          throw textError
        }
        await new Promise(resolve => setTimeout(resolve, 200)) // Delay after text

        // Step 2: Add spacing before QR code (buffers)
        console.log('📄 Adding spacing before QR code...')
        await POSTerminalPrinter.printerFeedLines(2)
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

        // Step 3: Center align for QR code
        console.log('🎯 Setting alignment for QR code...')
        await this.setPrinterPrintAlignment(1) // 1 = center
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

        // Step 4: Print QR code with order information (buffers)
        console.log('📱 Buffering QR code...')
        const qrCodeData = this.generateQRCodeData(order)
        
        try {
          // Use slightly smaller QR code size (14) to avoid printing issues
          const qrSuccess = await this.printQRCode(qrCodeData, 14, 1) // modulesize=14, errorCorrectionLevel=M
          if (!qrSuccess) {
            console.log('⚠️ QR code buffer failed, but continuing with text only')
          } else {
            console.log('✅ QR code buffered successfully')
          }
        } catch (qrError) {
          console.error('⚠️ QR code error (continuing anyway):', qrError)
          // Continue even if QR code fails
        }
        await new Promise(resolve => setTimeout(resolve, 200)) // Delay after QR code
        
        // Step 5: Reset alignment to left after QR code
        await this.setPrinterPrintAlignment(0) // 0 = left
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

        // Step 6: Add 5 blank lines after QR code
        console.log('📄 Adding 5 blank lines after QR code...')
        await POSTerminalPrinter.printerFeedLines(5)
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

        // Step 7: Print 2 lines of dashed lines
        console.log('📄 Printing 2 lines of dashed lines...')
        const dashedLine = '--------------------------------\n'
        await POSTerminalPrinter.printText(dashedLine)
        await POSTerminalPrinter.printText(dashedLine)
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

        // Step 8: Add extra spacing after dashed lines for manual tearing (printer has no cutter)
        console.log('📄 Adding extra spacing after dashed lines for manual tear...')
        await POSTerminalPrinter.printerFeedLines(40)
        await new Promise(resolve => setTimeout(resolve, 200)) // Delay after feed lines

        // Step 9: Wait a moment for all operations to complete
        console.log('⏳ Waiting for all buffered operations to complete...')
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

        // Step 10: Check printer status and ensure it's ready (must be PRINTER_NORMAL = 0)
        let status = -1
        let retries = 0
        const maxRetries = 10
        
        while (retries < maxRetries) {
          try {
            status = await this.getPrinterStatus()
            console.log(`📊 Printer status check (attempt ${retries + 1}/${maxRetries}): ${status}`)
            
            if (status === 0) { // PRINTER_NORMAL - ready to print
              console.log('✅ Printer is in NORMAL state, ready for execution')
              break
            } else if (status === 1) { // PRINTER_IS_BUSY
              console.log('⏳ Printer is busy, waiting 1 second...')
              await new Promise(resolve => setTimeout(resolve, 1000))
              retries++
            } else {
              console.warn(`⚠️ Printer status: ${status} (0=Normal, 1=Busy, 2=PaperOut, 3=Error)`)
              if (status === 2) {
                console.error('❌ Printer has no paper!')
                return false
              } else if (status === 3) {
                console.error('❌ Printer has an error!')
                return false
              }
              // For other statuses, wait and retry
              await new Promise(resolve => setTimeout(resolve, 500))
              retries++
            }
          } catch (statusError) {
            console.warn('⚠️ Could not check printer status:', statusError)
            retries++
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        // Only proceed if printer is in normal state
        if (status !== 0) {
          console.error(`❌ Printer not in normal state after ${maxRetries} attempts. Status: ${status}`)
          console.error('❌ Cannot execute print - printer is not ready')
          return false
        }

        // Step 11: Execute all buffered content with extra feed for manual tearing
        console.log('🖨️ Executing all buffered content and feeding paper for manual tear...')
        console.log(`📊 Printer status confirmed: ${status} (PRINTER_NORMAL)`)
        
        // Double-check status right before execution
        const finalStatusCheck = await this.getPrinterStatus()
        console.log(`📊 Final status check before printerPerformPrint: ${finalStatusCheck}`)
        
        if (finalStatusCheck !== 0) {
          console.error(`❌ Printer status is not normal (${finalStatusCheck}) - cannot execute print`)
          return false
        }
        
        // printerPerformPrint executes all buffered content and feeds additional lines
        // Feed 50 more lines to push paper out for easy manual tearing (printer has no cutter)
        console.log('🖨️ Calling printerPerformPrint(50)...')
        let printSuccess = false
        try {
          printSuccess = await POSTerminalPrinter.printerPerformPrint(50)
          console.log(`📊 printerPerformPrint returned: ${printSuccess}`)
        } catch (printError: any) {
          console.error('❌ printerPerformPrint threw error:', printError)
          console.error('Error details:', printError?.message || printError)
          return false
        }
        
        // Wait a moment after execution to ensure print completes
        console.log('⏳ Waiting for print to complete...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check status after execution
        const postPrintStatus = await this.getPrinterStatus()
        console.log(`📊 Printer status after execution: ${postPrintStatus}`)
        
        if (printSuccess) {
          console.log('✅ Claim ticket printed successfully via POS Terminal printer')
          return true
        } else {
          console.log('❌ Claim ticket print execution failed - printerPerformPrint returned false')
          console.log('⚠️ Printer may have clicked but did not print - check printer status and buffer')
          return false
        }
      } catch (error) {
        console.error('❌ Error during claim ticket printing:', error)
        // Try to execute whatever was buffered and feed paper for manual tear
        try {
          await POSTerminalPrinter.printerPerformPrint(50)
        } catch (feedError) {
          console.error('❌ Failed to execute print after error:', feedError)
        }
        return false
      }
    } catch (error) {
      console.error('Print order claim ticket failed:', error)
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
   * Print QR code
   * @param data QR code data string
   * @param modulesize QR code block size (1-16, default 10, unit: 24 pixels)
   * @param errorCorrectionLevel Error correction level (0=L, 1=M, 2=Q, 3=H)
   */
  async printQRCode(data: string, modulesize: number = 10, errorCorrectionLevel: number = 1): Promise<boolean> {
    try {
      if (!this.isConnected || !this.isInitialized) {
        console.log('❌ Printer not connected or initialized')
        return false
      }

      console.log(`📱 Printing QR code: ${data.substring(0, 50)}...`)
      
      const { POSTerminalPrinter } = NativeModules
      const success = await POSTerminalPrinter.printQRCode(data, modulesize, errorCorrectionLevel)
      
      if (success) {
        console.log('✅ QR code printed successfully')
        return true
      } else {
        console.log('❌ QR code print failed')
        return false
      }
    } catch (error) {
      console.error('Print QR code failed:', error)
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

  /**
   * Fetch the currently selected store for the logged-in user
   * Tries to get primary store first, otherwise gets first assigned store
   */
  private async fetchSelectedStore(): Promise<Store | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log('⚠️ No user found when fetching store:', userError?.message)
        return null
      }

      // Get user details
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      if (userDataError || !userData) {
        console.log('⚠️ User data not found when fetching store:', userDataError?.message)
        return null
      }

      // Try to get primary store first
      const { data: primaryAssignment, error: primaryError } = await supabase
        .from('user_store_assignments')
        .select(`
          store_id,
          stores (
            id,
            name,
            address
          )
        `)
        .eq('user_id', userData.id)
        .eq('is_primary', true)
        .single()

      if (!primaryError && primaryAssignment) {
        const store = (primaryAssignment as any).stores
        if (store && store.name) {
          console.log(`✅ Found primary store: ${store.name}`)
          return {
            id: store.id,
            name: store.name,
            address: store.address
          }
        }
      }

      // If no primary store, get first assigned store
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_store_assignments')
        .select(`
          store_id,
          stores (
            id,
            name,
            address
          )
        `)
        .eq('user_id', userData.id)
        .limit(1)

      if (!assignmentsError && assignments && assignments.length > 0) {
        const assignment = assignments[0] as any
        const store = assignment?.stores
        if (store && store.name) {
          console.log(`✅ Found first assigned store: ${store.name}`)
          return {
            id: store.id,
            name: store.name,
            address: store.address
          }
        }
      }

      console.log('⚠️ No store assignments found for user')
      return null
    } catch (error) {
      console.error('❌ Error fetching selected store:', error)
      return null
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
      
      // Store address if available
      if (order.storeInfo.address) {
        text += `${order.storeInfo.address}\n`
      }
      
      text += `\n`
    }
    
    // Divider
    text += `================================\n`
    
    // Claim Ticket Header
    text += `CLAIM TICKET\n`
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

  /**
   * Generate QR code data for the order
   * @param order Order object
   * @returns QR code data string (order number only)
   */
  private generateQRCodeData(order: Order): string {
    // Return only the order number, with fallback if not available
    return order.orderNumber || `ORD-${order.orderId.substring(0, 8).toUpperCase()}`
  }
}

export default new POSTerminalPrinterService()




