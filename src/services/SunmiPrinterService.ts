import { NativeModules, Platform } from 'react-native'

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

type SunmiModule = {
  initPrinter: (success: () => void, fail: (message: string) => void) => void
  printText: (
    content: string,
    size: number,
    isBold: boolean,
    isUnderLine: boolean,
    success: () => void,
    fail: (message: string) => void
  ) => void
  printLine: (line: number, success: () => void, fail: (message: string) => void) => void
  cutPaper?: (success: () => void, fail: (message: string) => void) => void
}

const DEFAULT_FONT_SIZE = 24

class SunmiPrinterService {
  private static instance: SunmiPrinterService
  private isConnected: boolean = false
  private isInitialized: boolean = false

  static getInstance(): SunmiPrinterService {
    if (!SunmiPrinterService.instance) {
      SunmiPrinterService.instance = new SunmiPrinterService()
    }
    return SunmiPrinterService.instance
  }

  async initializePrinter(): Promise<boolean> {
    try {
      console.log('🔍 Sunmi: Checking if device supports Sunmi printer...')
      
      if (!this.canUseSunmiPrinter()) {
        console.log('⚠️ Sunmi: Device does not support Sunmi printer')
        return false
      }

      const module = this.getModule()
      if (!module) {
        console.log('❌ Sunmi: SunMiPrinterModule not found in NativeModules')
        console.log('📋 Available modules:', Object.keys(NativeModules).join(', '))
        return false
      }
      
      console.log('✅ Sunmi: SunMiPrinterModule found!')

      await this.callSunmiMethod('initPrinter')
      this.isInitialized = true
      this.isConnected = true
      console.log('✅ Sunmi printer initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Sunmi printer:', error)
      this.isConnected = false
      this.isInitialized = false
      return false
    }
  }

  async testPrint(): Promise<boolean> {
    try {
      if (!this.ensureReady()) {
        return false
      }

      console.log('🧪 Testing Sunmi printer...')
      await this.printDivider()
      await this.printLine('PRINTER TEST', { size: 28, bold: true })
      await this.printLine('Sunmi Printer OK', { size: 24 })
      await this.printLine('Connection Successful', { size: 24 })
      await this.feedLines(2)
      await this.printLine('Test completed successfully!', { size: 20 })
      await this.printDivider()

      console.log('✅ Test print successful via Sunmi printer')
      return true
    } catch (error) {
      console.error('❌ Sunmi test print failed:', error)
      return false
    }
  }

  async printOrderClaimStub(order: Order): Promise<boolean> {
    try {
      if (!this.ensureReady()) {
        return false
      }

      console.log('🖨️ Printing claim stub via Sunmi printer...')
      const lines = this.generateClaimStubLines(order)
      for (const line of lines) {
        if (line.type === 'text') {
          await this.printLine(line.value, { bold: line.bold, size: line.size })
        } else if (line.type === 'divider') {
          await this.printDivider()
        } else if (line.type === 'space') {
          await this.feedLines(line.count ?? 1)
        }
      }

      if (await this.callSunmiMethod('cutPaper')) {
        console.log('✂️ Paper cut')
      }

      console.log('✅ Claim stub printed successfully via Sunmi printer')
      return true
    } catch (error) {
      console.error('❌ Sunmi claim stub print failed:', error)
      return false
    }
  }

  getIsConnected(): boolean {
    return this.isConnected
  }

  canUseSunmiPrinter(): boolean {
    if (Platform.OS !== 'android') {
      return false
    }

    const module = this.getModule()
    if (module) {
      return true
    }

    const model = Platform.constants?.Model?.toLowerCase() || ''
    const brand = Platform.constants?.Brand?.toLowerCase() || ''
    const manufacturer = Platform.constants?.Manufacturer?.toLowerCase() || ''

    return [model, brand, manufacturer].some(value => value.includes('sunmi') || value.includes('q1'))
  }

  private ensureReady(): boolean {
    if (!this.isConnected || !this.isInitialized) {
      console.log('❌ Sunmi printer not connected or initialized')
      return false
    }
    return true
  }

  private getModule(): SunmiModule | null {
    return (NativeModules as { SunMiPrinterModule?: SunmiModule }).SunMiPrinterModule || null
  }

  private async printLine(
    text: string,
    options: { bold?: boolean; underline?: boolean; size?: number } = {}
  ): Promise<void> {
    const module = this.getModule()
    if (!module) {
      throw new Error('Sunmi printer module not available')
    }

    await this.callSunmiMethod('printText', [
      text,
      options.size ?? DEFAULT_FONT_SIZE,
      options.bold ?? false,
      options.underline ?? false
    ])
    await this.feedLines(1)
  }

  private async feedLines(count: number): Promise<void> {
    await this.callSunmiMethod('printLine', [count])
  }

  private async printDivider(): Promise<void> {
    await this.printLine('--------------------------------')
  }

  private async callSunmiMethod(
    method: keyof SunmiModule,
    params: any[] = []
  ): Promise<boolean> {
    const module = this.getModule()
    if (!module || typeof module[method] !== 'function') {
      return false
    }

    return new Promise((resolve, reject) => {
      try {
        const timeout = setTimeout(() => resolve(true), 50)
        const success = () => {
          clearTimeout(timeout)
          resolve(true)
        }
        const failure = (message: string) => {
          clearTimeout(timeout)
          console.error(`Sunmi ${String(method)} failed:`, message)
          reject(new Error(message || `${String(method)} failed`))
        }

        ;(module[method] as any)(...params, success, failure)
      } catch (error) {
        reject(error)
      }
    })
  }

  private generateClaimStubLines(order: Order) {
    const orderNumber = order.orderNumber || `ORD-${order.orderId.substring(0, 8).toUpperCase()}`
    const date = new Date(order.orderDate)
    const dateStr = this.formatDate(date)
    const timeStr = this.formatTime(date)

    const lines: Array<
      | { type: 'text'; value: string; bold?: boolean; size?: number }
      | { type: 'divider' }
      | { type: 'space'; count?: number }
    > = []

    lines.push({ type: 'space', count: 1 })

    console.log('📋 SunmiPrinterService - Generating claim stub with store info:', {
      name: order.storeInfo?.name,
      address: order.storeInfo?.address,
      phone: order.storeInfo?.phone,
      email: order.storeInfo?.email
    })

    // Store details (centered)
    if (order.storeInfo?.name) {
      const storeName = order.storeInfo.name.toUpperCase()
      lines.push({ type: 'text', value: storeName, bold: true, size: 28 })
    }
    
    // Store address (centered)
    if (order.storeInfo?.address) {
      lines.push({ type: 'text', value: order.storeInfo.address })
    }
    
    // Contact No. (centered)
    if (order.storeInfo?.phone && order.storeInfo.phone.trim()) {
      const contactLine = `Contact No.: ${order.storeInfo.phone.trim()}`
      lines.push({ type: 'text', value: contactLine })
      console.log('✅ SunmiPrinterService - Added phone:', contactLine)
    } else {
      console.log('⚠️ SunmiPrinterService - No phone number:', order.storeInfo?.phone)
    }
    
    // Email Address (centered) - label on one line, email on next line
    if (order.storeInfo?.email && order.storeInfo.email.trim()) {
      const emailLabel = 'Email Address:'
      const emailValue = order.storeInfo.email.trim()
      lines.push({ type: 'text', value: emailLabel })
      lines.push({ type: 'text', value: emailValue })
      console.log('✅ SunmiPrinterService - Added email:', emailLabel, emailValue)
    } else {
      console.log('⚠️ SunmiPrinterService - No email:', order.storeInfo?.email)
    }

    lines.push({ type: 'divider' })
    lines.push({ type: 'text', value: 'CLAIM STUB', bold: true, size: 26 })
    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'text', value: `Order #: ${orderNumber}`, bold: true })
    lines.push({ type: 'text', value: `Date: ${dateStr}` })
    lines.push({ type: 'text', value: `Time: ${timeStr}` })
    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'divider' })
    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'text', value: 'Customer:', bold: true })
    lines.push({ type: 'text', value: order.customerName })
    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'text', value: 'Services:', bold: true })

    order.items.forEach(item => {
      const line = `${item.quantity}x ${item.name.substring(0, 18)}`
      const price = `₱${item.price.toFixed(2)}`
      const spaces = Math.max(1, 32 - line.length - price.length)
      const itemLine = line + ' '.repeat(spaces) + price
      lines.push({ type: 'text', value: itemLine })
    })

    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'divider' })
    lines.push({ type: 'text', value: `TOTAL: ₱${order.totalAmount.toFixed(2)}`, bold: true, size: 26 })
    lines.push({ type: 'space', count: 1 })
    lines.push({ type: 'text', value: 'Thank you for your business!' })
    lines.push({ type: 'text', value: 'Please keep this stub for pickup.' })
    lines.push({ type: 'space', count: 2 })

    return lines
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

export default SunmiPrinterService

