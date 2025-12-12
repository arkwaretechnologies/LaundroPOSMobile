-- Migration: Add phone and email columns to stores table
-- This migration adds contact information columns to the stores table for display on claim tickets

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stores' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.stores
        ADD COLUMN phone VARCHAR(50) NULL;
    END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stores' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.stores
        ADD COLUMN email VARCHAR(255) NULL;
    END IF;
END $$;

-- Add indexes for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_stores_phone 
ON public.stores(phone) 
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_email 
ON public.stores(email) 
WHERE email IS NOT NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN public.stores.phone IS 'Store contact phone number displayed on claim tickets';
COMMENT ON COLUMN public.stores.email IS 'Store contact email address displayed on claim tickets';

