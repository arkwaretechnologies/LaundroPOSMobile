-- Migration: Add cancellation columns to payments table
-- This migration adds columns to track cancelled/voided payments

-- Add is_cancelled column
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

-- Add cancelled_at column
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE NULL;

-- Add cancelled_by column (user who cancelled the payment)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cancelled_by UUID NULL
REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add cancellation_reason column
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;

-- Add index on is_cancelled for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_is_cancelled 
ON public.payments(is_cancelled) 
WHERE is_cancelled = TRUE;

-- Add index on cancelled_at for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_cancelled_at 
ON public.payments(cancelled_at) 
WHERE cancelled_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.payments.is_cancelled IS 'Indicates if the payment has been cancelled/voided';
COMMENT ON COLUMN public.payments.cancelled_at IS 'Timestamp when the payment was cancelled';
COMMENT ON COLUMN public.payments.cancelled_by IS 'User ID who cancelled the payment';
COMMENT ON COLUMN public.payments.cancellation_reason IS 'Reason for cancelling the payment';

