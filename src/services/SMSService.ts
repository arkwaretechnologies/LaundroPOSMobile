import SendSMS from 'react-native-sms'

type SMSCallbackError = unknown

interface OrderItem {
  service_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface SendOrderCompletionSMSParams {
  phoneNumber: string
  customerFirstName: string
  orderNumber: string
  storeName: string
  orderItems: OrderItem[]
}

/**
 * SMS Service - Handles sending SMS notifications
 * 
 * This service wraps the react-native-sms library to provide
 * a clean interface for sending SMS messages, particularly
 * for order completion notifications.
 */
class SMSService {
  /**
   * Sends an SMS notification when an order is marked as complete
   * 
   * @param params - Object containing phone number, customer first name, order number, store name, and order items
   * @returns Promise that resolves when SMS is sent/cancelled, rejects on error
   */
  async sendOrderCompletionSMS(params: SendOrderCompletionSMSParams): Promise<void> {
    const { phoneNumber, customerFirstName, orderNumber, storeName, orderItems } = params

    // Format order items list
    let itemsList = ''
    if (orderItems && orderItems.length > 0) {
      const itemsText = orderItems
        .map(item => `${item.quantity}x ${item.service_name}`)
        .join(', ')
      itemsList = `\n\nItems: ${itemsText}`
    }

    // Format the message according to specification
    const message = `Good day ${customerFirstName}, your laundry #${orderNumber} is ready for pickup.${itemsList}\n\nThank you! - ${storeName}`

    return new Promise((resolve, reject) => {
      SendSMS.send(
        {
          body: message,
          recipients: [phoneNumber],
          successTypes: ['sent', 'queued'] as any,
          allowAndroidSendWithoutReadPermission: true,
        },
        (completed, cancelled, error: SMSCallbackError) => {
          if (error) {
            console.error('❌ SMS sending error:', error)
            const errorMessage =
              typeof error === 'string'
                ? error
                : error && typeof error === 'object' && 'message' in (error as any)
                  ? String((error as any).message)
                  : (() => {
                      try {
                        return JSON.stringify(error)
                      } catch {
                        return String(error)
                      }
                    })()
            reject(new Error(errorMessage || 'Failed to send SMS'))
            return
          }

          if (cancelled) {
            console.log('⚠️ SMS sending was cancelled by user')
            resolve()
            return
          }

          if (completed) {
            console.log('✅ SMS sent successfully')
            resolve()
            return
          }

          // Default: resolve if no error
          resolve()
        }
      )
    })
  }
}

// Export singleton instance
export default new SMSService()
