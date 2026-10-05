package com.miniprogram.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

/**
 * 异步任务线程池（公众号导入等长任务）
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("importExecutor")
    public ThreadPoolTaskExecutor importExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(1);
        ex.setMaxPoolSize(1);
        ex.setQueueCapacity(5);
        ex.setThreadNamePrefix("import-");
        ex.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        ex.initialize();
        return ex;
    }

    /**
     * 通知推送线程池。
     * <p>企微 / 服务号推送都是外部 HTTP，耗时不可控且不该阻塞主流程。
     * <p>⚠️ 不指定 executor 时 {@code @Async} 会退回 {@code SimpleAsyncTaskExecutor} ——
     * 它<b>每次调用新建一个线程且无上限</b>，通知风暴（批量发货 + 群发）会直接打爆内存。
     * <p>拒绝策略用 {@code CallerRunsPolicy}：队列满时由调用线程执行，宁可慢也不丢通知，
     * 也不像 {@code AbortPolicy} 那样静默抛异常让通知消失。
     */
    @Bean("noticeExecutor")
    public ThreadPoolTaskExecutor noticeExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(4);
        // 队列 200 足够吸收短时突发；配合 CallerRunsPolicy 兜底
        ex.setQueueCapacity(200);
        ex.setKeepAliveSeconds(60);
        ex.setThreadNamePrefix("notice-");
        ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        ex.initialize();
        return ex;
    }
}
