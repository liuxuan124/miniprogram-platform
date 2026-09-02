-- 已有物流单号但状态仍为 paid 的历史订单，同步为 shipped
UPDATE mp_order
SET status = 'shipped',
    shipped_at = COALESCE(shipped_at, updated_at, NOW())
WHERE status = 'paid'
  AND logistics_no IS NOT NULL
  AND TRIM(logistics_no) <> '';
