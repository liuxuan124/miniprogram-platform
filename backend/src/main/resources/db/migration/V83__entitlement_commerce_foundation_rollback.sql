-- 回滚 V83（仅用于未上生产或手工补救；Flyway 默认不自动执行）
DROP TABLE IF EXISTS mp_referral_commission;
DROP TABLE IF EXISTS mp_invite_content_unlock;
DROP TABLE IF EXISTS mp_paid_qa_spectator;
DROP TABLE IF EXISTS mp_paid_qa_question;
DROP TABLE IF EXISTS mp_email_send_log;
DROP TABLE IF EXISTS mp_user_email;
DROP TABLE IF EXISTS mp_planet_commerce_config;
DROP TABLE IF EXISTS mp_wechat_sync_checkpoint;
DROP TABLE IF EXISTS mp_file_download_log;
DROP TABLE IF EXISTS mp_download_grant;
DROP TABLE IF EXISTS mp_product_card_code;
DROP TABLE IF EXISTS mp_product_file_rel;
DROP TABLE IF EXISTS mp_fulfillment_log;
DROP TABLE IF EXISTS mp_entitlement_event_log;
DROP TABLE IF EXISTS mp_entitlement_quota;
DROP TABLE IF EXISTS mp_content_access_rule;

ALTER TABLE mp_content
  DROP COLUMN IF EXISTS preview_percent,
  DROP COLUMN IF EXISTS local_override_flags,
  DROP COLUMN IF EXISTS original_url,
  DROP COLUMN IF EXISTS source_tag;

DELETE FROM mp_system_config WHERE config_key IN (
  'smtp_host', 'paid_qa_default_price', 'paid_qa_spectator_price', 'wechat_oa_sync_cron_hours'
);
