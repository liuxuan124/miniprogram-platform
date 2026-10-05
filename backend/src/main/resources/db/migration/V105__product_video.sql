-- V105: 商品宣传视频（原 V103，与 V103 内容社区归属同号冲突，改号至此）
-- mp_product.video_url: 详情页首屏宣传视频 URL（可空）；小程序轮播首项渲染 video，可与图片左右滑动切换
ALTER TABLE mp_product
  ADD COLUMN video_url VARCHAR(512) NULL COMMENT '宣传视频 URL（详情页首屏轮播首项）' AFTER main_image;
