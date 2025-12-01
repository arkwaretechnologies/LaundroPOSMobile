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

      // Check if printer is connected
      const connected = await POSTerminalPrinter.isPrinterConnected()
      console.log(`🔍 Printer connected: ${connected}`)

      if (connected) {
        // Initialize the printer
        const initialized = await POSTerminalPrinter.initializePrinter()
        console.log(`🔧 Printer initialized: ${initialized}`)
        
        this.isInitialized = initialized
        this.isConnected = connected
        
        if (initialized) {
          console.log('✅ POS Terminal printer ready!')
          return true
        }
      }

      console.log('❌ POS Terminal printer not available')
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

  async getPrinterStatus(): Promise<string> {
    try {
      const { POSTerminalPrinter } = NativeModules
      if (!POSTerminalPrinter) {
        return 'Module not available'
      }

      const status = await POSTerminalPrinter.getPrinterStatus()
      return status
    } catch (error) {
      console.error('Get printer status failed:', error)
      return 'Error getting status'
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




