DROP TABLE IF EXISTS mp_planet_homework_submission;
DROP TABLE IF EXISTS mp_planet_homework;
DROP TABLE IF EXISTS mp_planet_checkin_record;
DROP TABLE IF EXISTS mp_planet_checkin_theme;

DELETE FROM mp_system_config WHERE config_key IN (
  'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'email_send_daily_cap',
  'referral_commission_rate', 'invite_unlock_registrations', 'file_download_daily_limit'
);
