
-- Create the activity event type enum
CREATE TYPE "ActivityEventType" AS ENUM (
    'CHECKOUT_ABANDONED',
    'PRODUCT_VIEWED',
    'PRODUCT_COMPARED',
    'CART_UPDATED',
    'CART_VIEWED',
    'PROMO_CODE_ATTEMPTED',
    'SHIPPING_CHECKED',
    'ADDRESS_UPDATED',
    'ORDER_RECOVERED',
    'ORDER_COMPLETED'
);

-- Add the new column as nullable temporarily
ALTER TABLE "ActivityEvent"
ADD COLUMN "eventType" "ActivityEventType";

-- Classify the 16 existing activity records
UPDATE "ActivityEvent"
SET "eventType" = CASE "event"

    WHEN 'Exited at Payment Page'
        THEN 'CHECKOUT_ABANDONED'::"ActivityEventType"

    WHEN 'Applied shipping address'
        THEN 'ADDRESS_UPDATED'::"ActivityEventType"

    WHEN 'Compared 3 brightening serums'
        THEN 'PRODUCT_COMPARED'::"ActivityEventType"

    WHEN 'Paused at Shipping Details'
        THEN 'CHECKOUT_ABANDONED'::"ActivityEventType"

    WHEN 'Updated cart quantity'
        THEN 'CART_UPDATED'::"ActivityEventType"

    WHEN 'Tested promo code field'
        THEN 'PROMO_CODE_ATTEMPTED'::"ActivityEventType"

    WHEN 'Viewed Barrier Repair Cream'
        THEN 'PRODUCT_VIEWED'::"ActivityEventType"

    WHEN 'Abandoned at Shipping Details'
        THEN 'CHECKOUT_ABANDONED'::"ActivityEventType"

    WHEN 'Left Payment Page'
        THEN 'CHECKOUT_ABANDONED'::"ActivityEventType"

    WHEN 'Viewed Cart Drawer'
        THEN 'CART_VIEWED'::"ActivityEventType"

    WHEN 'Order Confirmed (#VG-4920)'
        THEN 'ORDER_RECOVERED'::"ActivityEventType"

    WHEN 'Exited after Cart Review'
        THEN 'CHECKOUT_ABANDONED'::"ActivityEventType"

    WHEN 'Saved Hyderabad address'
        THEN 'ADDRESS_UPDATED'::"ActivityEventType"

    WHEN 'Added Hyaluronic Serum'
        THEN 'CART_UPDATED'::"ActivityEventType"

    WHEN 'Order Confirmed (#VG-4918)'
        THEN 'ORDER_COMPLETED'::"ActivityEventType"

    WHEN 'Direct Checkout Completed'
        THEN 'ORDER_COMPLETED'::"ActivityEventType"

    ELSE NULL
END;

-- Make sure every existing record was classified
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "ActivityEvent"
        WHERE "eventType" IS NULL
    ) THEN
        RAISE EXCEPTION 'Some ActivityEvent records have not been classified';
    END IF;
END $$;

-- Make the column mandatory now that existing records have values
ALTER TABLE "ActivityEvent"
ALTER COLUMN "eventType" SET NOT NULL;

-- Add the index for filtering and sorting activity events
CREATE INDEX "ActivityEvent_eventType_timestamp_idx"
ON "ActivityEvent"("eventType", "timestamp");
