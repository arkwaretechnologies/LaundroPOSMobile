import { Platform } from 'react-native'
import mobileSms from 'react-native-mobile-sms'

interface SendSMSOptions {
  phoneNumber: string
  customerName: string
  orderNumber: string
  storeName: string
}

/**
 * Sends an SMS notification to a customer when their order is ready
 * @param options - SMS sending options containing customer and order information
 * @returns Promise that resolves to true if SMS was sent successfully, false otherwise
 */
export const sendOrderReadySMS = async (options: SendSMSOptions): Promise<boolean> => {
  const { phoneNumber, customerName, orderNumber, storeName } = options

  // Only works on Android
  if (Platform.OS !== 'android') {
    console.log('SMS sending is only supported on Android')
    return false
  }

  // Validate phone number
  if (!phoneNumber || phoneNumber.trim() === '') {
    console.log('No phone number provided, skipping SMS')
    return false
  }

  // Format the message
  const message = `Hi ${customerName}, your order #${orderNumber} is ready for pickup at ${storeName}. Thank you!`

  try {
    console.log(`📱 Sending SMS to ${phoneNumber}...`)
    console.log(`📝 Message: ${message}`)

    await mobileSms.sendDirectSms(phoneNumber, message)

    console.log('✅ SMS sent successfully')
    return true
  } catch (error: any) {
    console.error('❌ Error sending SMS:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return false
  }
}

export default {
  sendOrderReadySMS,
}

