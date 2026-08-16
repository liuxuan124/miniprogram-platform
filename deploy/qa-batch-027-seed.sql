-- BATCH-QA-027: 补退款/表单提交/AI 对话种子（幂等）
USE miniapp;

INSERT INTO mp_refund (id, order_id, refund_no, amount, reason, status, created_at, updated_at)
VALUES (1, 1, 'RF202608160001', 179.00, 'QA 批次联调退款申请', 'pending', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  reason = VALUES(reason),
  status = VALUES(status),
  updated_at = NOW();

INSERT INTO mp_form_data (id, form_id, user_id, data, create_time, update_time, deleted)
VALUES (1, 1, 1, JSON_OBJECT('field_1786608731416', 'QA-BATCH-027 表单提交'), NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE
  data = VALUES(data),
  update_time = NOW();

UPDATE mp_form_template SET submit_count = GREATEST(submit_count, 1) WHERE id = 1;

INSERT INTO mp_ai_conversation (id, user_id, session_id, question, answer, recommended_items, is_transfer_human, created_at, updated_at, deleted)
VALUES (
  1, 1, 'qa-batch-027-session',
  '有没有适合送礼的礼盒？',
  '推荐品牌文创礼盒，当前在售且支持小程序下单。',
  JSON_ARRAY(JSON_OBJECT('type', 'product', 'id', '1', 'title', '品牌文创礼盒', 'reason', 'QA 推荐')),
  0, NOW(), NOW(), 0
)
ON DUPLICATE KEY UPDATE
  question = VALUES(question),
  answer = VALUES(answer),
  updated_at = NOW();
