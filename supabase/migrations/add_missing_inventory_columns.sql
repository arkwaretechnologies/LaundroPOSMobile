-- Add missing columns to inventory_items table
-- The application code uses unit_of_measure and unit_price, but the schema has unit and unit_cost

-- Add unit_of_measure column (if unit exists, we'll keep both for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory_items' 
    AND column_name = 'unit_of_measure'
  ) THEN
    ALTER TABLE public.inventory_items 
    ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'pcs';
    
    -- Copy data from 'unit' column if it exists
    UPDATE public.inventory_items 
    SET unit_of_measure = COALESCE(unit, 'pcs')
    WHERE unit_of_measure IS NULL;
  END IF;
END $$;

-- Add unit_price column (if unit_cost exists, we'll keep both for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory_items' 
    AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.inventory_items 
    ADD COLUMN unit_price NUMERIC(10, 2) DEFAULT 0;
    
    -- Copy data from 'unit_cost' column if it exists
    UPDATE public.inventory_items 
    SET unit_price = COALESCE(unit_cost, 0)
    WHERE unit_price IS NULL;
  END IF;
END $$;

-- Create index on unit_of_measure if needed (optional, for filtering)
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit_of_measure 
ON public.inventory_items(unit_of_measure) 
WHERE unit_of_measure IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.inventory_items.unit_of_measure IS 'Unit of measure for the inventory item (e.g., pcs, kg, liters, boxes)';
COMMENT ON COLUMN public.inventory_items.unit_price IS 'Selling price per unit of the inventory item';

