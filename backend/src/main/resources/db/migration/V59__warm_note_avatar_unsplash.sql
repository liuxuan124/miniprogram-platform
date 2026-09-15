-- 书桌笔记等暖阁种子：picsum 易 302 导致小程序头像/图裂，改为 Unsplash 直链
UPDATE mp_content
SET
  author_avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=90&h=90&fit=crop&q=80',
  cover_image = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=780&h=940&fit=crop&q=80',
  images = JSON_ARRAY(
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497366811353-687086791d93?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524754202115-8abdf7d6d8e8?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=780&h=940&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507473885761-d6fe1b8d0b4d?w=780&h=940&fit=crop&q=80'
  )
WHERE external_source = 'warm_seed'
  AND external_id = 'warm-note-desk'
  AND deleted = 0;

UPDATE mp_content
SET author_avatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=90&h=90&fit=crop&q=80'
WHERE external_source = 'warm_seed'
  AND external_id IN ('warm-home-feature', 'warm-article-daily', 'warm-moment-sep')
  AND deleted = 0
  AND (author_avatar IS NULL OR author_avatar LIKE '%picsum.photos%');

UPDATE mp_product
SET main_image = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=340&fit=crop&q=80'
WHERE deleted = 0
  AND name LIKE '一个人的内容生意%'
  AND (main_image IS NULL OR main_image LIKE '%picsum.photos%');
