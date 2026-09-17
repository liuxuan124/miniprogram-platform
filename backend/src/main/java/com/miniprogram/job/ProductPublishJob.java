package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductPublishJob {

    private static final String LOCK_KEY = "job:lock:product_publish";

    private final ProductMapper productMapper;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(cron = "0 */1 * * * *")
    public void publishDueProducts() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(2));
        } catch (Exception e) {
            locked = true;
        }
        if (Boolean.FALSE.equals(locked)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        List<Product> due = productMapper.selectList(new LambdaQueryWrapper<Product>()
                .isNotNull(Product::getPublishAt)
                .le(Product::getPublishAt, now)
                .in(Product::getStatus, "draft", "off_sale"));
        for (Product p : due) {
            p.setStatus("on_sale");
            p.setPublishAt(null);
            productMapper.updateById(p);
            log.info("定时上架商品 id={} name={}", p.getId(), p.getName());
        }
    }
}
