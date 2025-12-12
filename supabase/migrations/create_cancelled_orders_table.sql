-- Create cancelled_orders table
-- This table stores detailed information about cancelled orders for auditing and reporting purposes

CREATE TABLE IF NOT EXISTS cancelled_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL, -- Store original order ID (no foreign key since order will be deleted)
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL, -- Store order number for quick reference
  customer_id UUID, -- Store customer ID (no foreign key since order will be deleted)
  
  -- Cancellation details
  cancellation_reason TEXT NOT NULL, -- Reason for cancellation (e.g., 'Customer request', 'Out of stock', 'Error')
  cancelled_by UUID NOT NULL REFERENCES auth.users(id), -- User who cancelled the order
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Order details at time of cancellation (snapshot)
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL, -- 'unpaid', 'partial', 'paid', 'refunded'
  order_status VARCHAR(20) NOT NULL, -- Status at time of cancellation
  
  -- Refund information
  refund_required BOOLEAN DEFAULT false,
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  refund_method VARCHAR(50), -- Payment method used for refund
  refund_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  refund_processed_at TIMESTAMP WITH TIME ZONE,
  refund_processed_by UUID REFERENCES auth.users(id),
  refund_reference_number VARCHAR(100), -- Reference number for refund transaction
  
  -- Additional information
  notes TEXT, -- Additional notes about the cancellation
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data stored as JSON
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one cancellation record per order
  CONSTRAINT cancelled_orders_order_id_unique UNIQUE (order_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_order_id ON cancelled_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_store_id ON cancelled_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_customer_id ON cancelled_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_cancelled_by ON cancelled_orders(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_cancelled_at ON cancelled_orders(cancelled_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_refund_status ON cancelled_orders(refund_status);
CREATE INDEX IF NOT EXISTS idx_cancelled_orders_order_number ON cancelled_orders(order_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cancelled_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cancelled_orders_updated_at
  BEFORE UPDATE ON cancelled_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_cancelled_orders_updated_at();

-- Note: Cancelled orders are created manually via the application
-- The trigger has been removed since orders are deleted after cancellation

-- Add RLS (Row Level Security) policies
ALTER TABLE cancelled_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read cancelled orders for their assigned stores
CREATE POLICY "Allow authenticated users to read cancelled orders"
  ON cancelled_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      WHERE usa.store_id = cancelled_orders.store_id
      AND usa.user_id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to insert cancelled orders for their assigned stores
CREATE POLICY "Allow authenticated users to insert cancelled orders"
  ON cancelled_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      WHERE usa.store_id = cancelled_orders.store_id
      AND usa.user_id = auth.uid()
    )
  );

-- Policy: Allow store admins to update and delete cancelled orders for their stores
CREATE POLICY "Allow store admins to manage cancelled orders"
  ON cancelled_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      JOIN users u ON u.id = usa.user_id
      WHERE usa.store_id = cancelled_orders.store_id
      AND u.id = auth.uid()
      AND (u.role = 'super_admin' OR u.role = 'store_owner' OR u.role = 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      JOIN users u ON u.id = usa.user_id
      WHERE usa.store_id = cancelled_orders.store_id
      AND u.id = auth.uid()
      AND (u.role = 'super_admin' OR u.role = 'store_owner' OR u.role = 'manager')
    )
  );

CREATE POLICY "Allow store admins to delete cancelled orders"
  ON cancelled_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_store_assignments usa
      JOIN users u ON u.id = usa.user_id
      WHERE usa.store_id = cancelled_orders.store_id
      AND u.id = auth.uid()
      AND (u.role = 'super_admin' OR u.role = 'store_owner' OR u.role = 'manager')
    )
  );

-- Add comments to table and columns
COMMENT ON TABLE cancelled_orders IS 'Stores detailed information about cancelled orders for auditing, reporting, and refund processing';
COMMENT ON COLUMN cancelled_orders.order_id IS 'Reference to the original order that was cancelled';
COMMENT ON COLUMN cancelled_orders.cancellation_reason IS 'Reason for cancellation (e.g., Customer request, Out of stock, Error)';
COMMENT ON COLUMN cancelled_orders.cancelled_by IS 'User who cancelled the order';
COMMENT ON COLUMN cancelled_orders.refund_required IS 'Whether a refund is required for this cancelled order';
COMMENT ON COLUMN cancelled_orders.refund_amount IS 'Amount to be refunded (typically equals paid_amount)';
COMMENT ON COLUMN cancelled_orders.refund_status IS 'Status of refund processing: pending, processed, or failed';
COMMENT ON COLUMN cancelled_orders.metadata IS 'Additional data stored as JSON (e.g., cancellation workflow steps, approval information)';

