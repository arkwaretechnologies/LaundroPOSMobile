import { NativeModules, Platform } from 'react-native'
import PrinterDebugger from './PrinterDebugger'

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
    email?: string
  }
  orderNumber?: string
}

class SimplePrinterService {
  private static instance: SimplePrinterService
  private isConnected: boolean = false

  private constructor() {
    // Initialize service
  }

  static getInstance(): SimplePrinterService {
    if (!SimplePrinterService.instance) {
      SimplePrinterService.instance = new SimplePrinterService()
    }
    return SimplePrinterService.instance
  }

  async initializePrinter(): Promise<boolean> {
    try {
      // Debug: Show all available modules
      PrinterDebugger.debugAvailableModules()
      
      // Try to find a working printer
      const workingPrinter = await PrinterDebugger.findWorkingPrinter()
      if (workingPrinter) {
        console.log(`✅ Found working printer: ${workingPrinter.module}.${workingPrinter.method}`)
      } else {
        console.log('⚠️ No working printer found, will use fallback methods')
      }

      // For built-in printers, we assume they're always available
      this.isConnected = true
      console.log('Simple printer service initialized')
      return true
    } catch (error) {
      console.error('Failed to initialize printer:', error)
      return false
    }
  }

  async testPrint(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        console.error('Printer not connected')
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
      if (!this.isConnected) {
        console.error('Printer not connected')
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
Built-in Printer OK
Connection Successful

Test completed successfully!
`
  }

  private generateClaimStubText(order: Order): string {
    const orderNumber = order.orderNumber || `ORD-${order.orderId.substring(0, 8).toUpperCase()}`
    const date = new Date(order.orderDate)
    const dateStr = this.formatDate(date)
    const timeStr = this.formatTime(date)

    console.log('📋 SimplePrinterService - Generating claim stub with store info:', {
      name: order.storeInfo?.name,
      address: order.storeInfo?.address,
      phone: order.storeInfo?.phone,
      email: order.storeInfo?.email
    })

    let text = `\n`
    
    // Store details (centered)
    if (order.storeInfo?.name) {
      const storeName = order.storeInfo.name.toUpperCase()
      // Center the store name (assuming 32 character width)
      const padding = Math.max(0, Math.floor((32 - storeName.length) / 2))
      text += ' '.repeat(padding) + storeName + `\n`
    }
    
    // Store address (centered)
    if (order.storeInfo?.address) {
      const address = order.storeInfo.address
      const padding = Math.max(0, Math.floor((32 - address.length) / 2))
      text += ' '.repeat(padding) + address + `\n`
    }
    
    // Contact No. (centered)
    if (order.storeInfo?.phone && order.storeInfo.phone.trim()) {
      const contactLine = `Contact No.: ${order.storeInfo.phone.trim()}`
      const padding = Math.max(0, Math.floor((32 - contactLine.length) / 2))
      text += ' '.repeat(padding) + contactLine + `\n`
      console.log('✅ SimplePrinterService - Added phone:', contactLine)
    } else {
      console.log('⚠️ SimplePrinterService - No phone number:', order.storeInfo?.phone)
    }
    
    // Email Address (centered) - label on one line, email on next line
    if (order.storeInfo?.email && order.storeInfo.email.trim()) {
      const emailLabel = 'Email Address:'
      const emailValue = order.storeInfo.email.trim()
      // Center the label
      const labelPadding = Math.max(0, Math.floor((32 - emailLabel.length) / 2))
      text += ' '.repeat(labelPadding) + emailLabel + `\n`
      // Center the email value on next line
      const emailPadding = Math.max(0, Math.floor((32 - emailValue.length) / 2))
      text += ' '.repeat(emailPadding) + emailValue + `\n`
      console.log('✅ SimplePrinterService - Added email:', emailLabel, emailValue)
    } else {
      console.log('⚠️ SimplePrinterService - No email:', order.storeInfo?.email)
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
      console.log('🖨️ Attempting to print via built-in printer...')
      
      // Try different printing methods for PDA built-in printers
      const printerMethods = [
        'printText',
        'print',
        'sendText',
        'writeText',
        'printReceipt',
        'printString',
        'printData',
        'sendData',
        'printRaw',
        'printLine',
        'printLines',
        'printContent',
        'printDocument',
        'printJob',
        'printBuffer',
        'printBytes',
        'printArray',
        'printStream',
        'printOutput',
        'printResult'
      ]

      // Try common PDA printer module names (expanded list)
      const printerModuleNames = [
        'ThermalPrinter',
        'BuiltInPrinter',
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
        'SystemPrinter',
        'DevicePrint',
        'HardwarePrint',
        'NativePrint',
        'LocalPrint',
        'InternalPrint',
        'BuiltInPrint',
        'PDAPrint',
        'POSPrint',
        'TerminalPrint'
      ]

      // First, log all available native modules
      console.log('🔍 Available native modules:')
      const availableModules = Object.keys(NativeModules)
      availableModules.forEach(module => {
        console.log(`  - ${module}`)
      })

      // First, try specific PDA printer modules
      for (const moduleName of printerModuleNames) {
        if (NativeModules[moduleName]) {
          const module = NativeModules[moduleName]
          console.log(`Found printer module: ${moduleName}`)
          
          for (const method of printerMethods) {
            if (typeof module[method] === 'function') {
              try {
                console.log(`Trying ${moduleName}.${method} for printing`)
                
                // Try different parameter formats
                const paramFormats = [
                  () => module[method](text),
                  () => module[method](text, {}),
                  () => module[method]({ text }),
                  () => module[method]({ data: text }),
                  () => module[method]({ content: text }),
                  () => module[method](text, { encoding: 'utf8' }),
                  () => module[method](text, { charset: 'utf8' })
                ]

                for (const paramFormat of paramFormats) {
                  try {
                    await paramFormat()
                    
                    // Try to cut paper
                    if (module.cutPaper) {
                      await module.cutPaper()
                    } else if (module.cut) {
                      await module.cut()
                    } else if (module.cutPaper && typeof module.cutPaper === 'function') {
                      await module.cutPaper()
                    }
                    
                    console.log(`Print successful via ${moduleName}.${method}`)
                    return true
                  } catch (paramError) {
                    console.log(`Parameter format failed for ${moduleName}.${method}:`, paramError instanceof Error ? paramError.message : String(paramError))
                  }
                }
              } catch (methodError) {
                console.log(`Method ${moduleName}.${method} failed:`, methodError instanceof Error ? methodError.message : String(methodError))
              }
            }
          }
        }
      }

      // Then try all available native modules
      for (const method of printerMethods) {
        try {
          for (const moduleName in NativeModules) {
            const module = NativeModules[moduleName]
            if (module && typeof module[method] === 'function') {
              console.log(`Trying ${moduleName}.${method} for printing`)
              
              try {
                await module[method](text)
                
                // Try to cut paper
                if (module.cutPaper) {
                  await module.cutPaper()
                } else if (module.cut) {
                  await module.cut()
                }
                
                console.log(`Print successful via ${moduleName}.${method}`)
                return true
              } catch (methodError) {
                console.log(`Method ${moduleName}.${method} failed:`, methodError instanceof Error ? methodError.message : String(methodError))
              }
            }
          }
        } catch (error) {
          console.log(`Method ${method} not available:`, error instanceof Error ? error.message : String(error))
        }
      }

      // Try Android system print functionality
      try {
        console.log('🔍 Trying Android system print...')
        
        // Try to use Android's PrintManager
        const { Linking, Alert } = require('react-native')
        
        // Method 1: Try print intent
        const printIntent = `intent://print?text=${encodeURIComponent(text)}#Intent;scheme=print;package=com.android.printspooler;end`
        const canOpen = await Linking.canOpenURL(printIntent)
        if (canOpen) {
          await Linking.openURL(printIntent)
          console.log('✅ Print sent via system print intent')
          return true
        }
        
      } catch (systemError) {
        console.log('Android system print failed:', systemError instanceof Error ? systemError.message : String(systemError))
      }

      // Fallback: Log the text that would be printed
      console.log('=== PRINT OUTPUT (No printer module found) ===')
      console.log(text)
      console.log('=== END PRINT ===')
      console.warn('⚠️ WARNING: No physical printer found. Text was only logged to console, not printed.')
      
      // Return false since we didn't actually print
      return false
    } catch (error) {
      console.error('Print failed:', error)
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
}

export default SimplePrinterService
