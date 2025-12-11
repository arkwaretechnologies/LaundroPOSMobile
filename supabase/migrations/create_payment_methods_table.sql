-- Create payment_methods table
-- This table stores available payment methods that can be used in the POS system

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'cash', 'card', 'gcash', 'paymaya'
  display_name VARCHAR(100) NOT NULL, -- e.g., 'Cash', 'Credit/Debit Card', 'GCash', 'PayMaya'
  description TEXT,
  icon VARCHAR(50), -- Icon identifier for UI (e.g., 'cash-outline', 'card-outline')
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0, -- For ordering payment methods in UI
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE, -- NULL for global payment methods, or specific store_id for store-specific methods
  requires_reference BOOLEAN DEFAULT false, -- Whether this payment method requires a reference number
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional configuration (e.g., API keys, settings)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure name is lowercase and alphanumeric with underscores
  CONSTRAINT payment_methods_name_format CHECK (name ~ '^[a-z0-9_]+$')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_id ON payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort_order ON payment_methods(sort_order);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Insert default payment methods (global - store_id is NULL)
INSERT INTO payment_methods (name, display_name, description, icon, is_active, sort_order, requires_reference) VALUES
  ('cash', 'Cash', 'Cash payment', 'cash-outline', true, 1, false),
  ('card', 'Credit/Debit Card', 'Card payment via POS terminal', 'card-outline', true, 2, false),
  ('gcash', 'GCash', 'GCash mobile wallet payment', 'phone-portrait-outline', true, 3, true),
  ('paymaya', 'PayMaya', 'PayMaya mobile wallet payment', 'wallet-outline', true, 4, true)
ON CONFLICT (name) DO NOTHING;

-- Add RLS (Row Level Security) policies if needed
-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read active payment methods
CREATE POLICY "Allow authenticated users to read active payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Allow store admins to manage payment methods for their stores
CREATE POLICY "Allow store admins to manage payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (
    -- Allow if payment method is global (store_id is NULL)
    store_id IS NULL
    OR
    -- Allow if user is admin of the store
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      JOIN users u ON u.id = usa.user_id
      WHERE usa.store_id = payment_methods.store_id
      AND u.id = auth.uid()
      AND (u.role = 'super_admin' OR u.role = 'admin')
    )
  );

-- Add comment to table
COMMENT ON TABLE payment_methods IS 'Stores available payment methods for the POS system. Can be global (store_id = NULL) or store-specific.';
COMMENT ON COLUMN payment_methods.name IS 'Unique identifier for the payment method (lowercase, alphanumeric with underscores)';
COMMENT ON COLUMN payment_methods.display_name IS 'Human-readable name displayed in the UI';
COMMENT ON COLUMN payment_methods.store_id IS 'NULL for global payment methods available to all stores, or specific store_id for store-specific methods';
COMMENT ON COLUMN payment_methods.requires_reference IS 'Whether this payment method requires a reference number (e.g., transaction ID for digital wallets)';
COMMENT ON COLUMN payment_methods.metadata IS 'Additional configuration stored as JSON (e.g., API endpoints, merchant IDs, etc.)';

