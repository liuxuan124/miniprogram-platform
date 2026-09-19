package com.miniprogram.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置
 * 配置静态资源映射（上传文件访问）
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + (uploadDir.endsWith("/") ? uploadDir : uploadDir + "/");
        // 映射上传文件目录为静态资源
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
        // 兼容历史相对路径 avatar/...（客户端误请求 /avatar/**）
        registry.addResourceHandler("/avatar/**")
                .addResourceLocations(location + "avatar/");
    }
}
