/**
 * Payment Method Type Definitions
 * 
 * These types correspond to the payment_methods table in the database.
 */

export interface PaymentMethod {
  id: string
  name: string // e.g., 'cash', 'card', 'gcash', 'paymaya'
  display_name: string // e.g., 'Cash', 'Credit/Debit Card', 'GCash', 'PayMaya'
  description?: string | null
  icon?: string | null // Icon identifier for UI
  is_active: boolean
  sort_order: number
  store_id?: string | null // NULL for global payment methods
  requires_reference: boolean // Whether this payment method requires a reference number
  metadata?: Record<string, any> | null // Additional configuration
  created_at: string
  updated_at: string
  created_by?: string | null
}

/**
 * Payment method name type for type safety
 * This matches the existing hardcoded payment methods in the codebase
 */
export type PaymentMethodName = 'cash' | 'card' | 'gcash' | 'paymaya'

/**
 * Helper type for creating a new payment method (omits auto-generated fields)
 */
export type CreatePaymentMethodInput = Omit<
  PaymentMethod,
  'id' | 'created_at' | 'updated_at'
>

/**
 * Helper type for updating a payment method (all fields optional except id)
 */
export type UpdatePaymentMethodInput = Partial<
  Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at' | 'created_by'>
> & {
  id: string
}

