package com.miniprogram;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * 微信小程序多场景搭建与运营系统 - 启动类
 */
@SpringBootApplication
@EnableCaching
public class MiniProgramApplication {

    public static void main(String[] args) {
        SpringApplication.run(MiniProgramApplication.class, args);
    }
}
