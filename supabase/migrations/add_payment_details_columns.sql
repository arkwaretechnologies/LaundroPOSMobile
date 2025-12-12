-- Migration: Add payment details columns (card_number and reference_number) to payments table
-- This migration adds columns to store card numbers for credit/debit card payments
-- and reference numbers for GCash/PayMaya payments

-- Add card_number column for Credit/Debit Card payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) NULL;

-- Add reference_number column for GCash/PayMaya payments (if not already exists)
-- Note: This column may already exist in some schemas, so we use IF NOT EXISTS equivalent
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'reference_number'
    ) THEN
        ALTER TABLE public.payments
        ADD COLUMN reference_number VARCHAR(100) NULL;
    END IF;
END $$;

-- Add payment_method_id column to link to payment_methods table (optional, for better tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_method_id'
    ) THEN
        ALTER TABLE public.payments
        ADD COLUMN payment_method_id UUID NULL
        REFERENCES public.payment_methods(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index on payment_method_id for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id 
ON public.payments(payment_method_id);

-- Add index on reference_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_reference_number 
ON public.payments(reference_number) 
WHERE reference_number IS NOT NULL;

-- Add index on card_number for faster lookups (last 4 digits typically)
CREATE INDEX IF NOT EXISTS idx_payments_card_number 
ON public.payments(card_number) 
WHERE card_number IS NOT NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN public.payments.card_number IS 'Last 4 digits or full card number for credit/debit card payments';
COMMENT ON COLUMN public.payments.reference_number IS 'Reference number for GCash, PayMaya, or other digital payment methods';
COMMENT ON COLUMN public.payments.payment_method_id IS 'Foreign key reference to payment_methods table';

