package com.miniprogram.aspect;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.OperationLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;

/**
 * 操作日志 AOP 切面
 * 拦截 @OperationLog 注解的方法，自动记录操作日志
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OperationLogAspect {

    private final OperationLogService operationLogService;
    private final ObjectMapper objectMapper;

    @Around("@annotation(com.miniprogram.annotation.OperationLog)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();

        // 获取注解
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        com.miniprogram.annotation.OperationLog annotation = method.getAnnotation(com.miniprogram.annotation.OperationLog.class);

        // 构建日志实体
        com.miniprogram.entity.OperationLog operationLog = new com.miniprogram.entity.OperationLog();
        operationLog.setOperation(annotation.value());
        operationLog.setMethod(joinPoint.getTarget().getClass().getName() + "." + method.getName());

        // 记录请求参数
        try {
            Object[] args = joinPoint.getArgs();
            if (args != null && args.length > 0) {
                // 限制参数长度，避免过大
                String params = objectMapper.writeValueAsString(args);
                if (params.length() > 2000) {
                    params = params.substring(0, 2000) + "...(truncated)";
                }
                operationLog.setParams(params);
            }
        } catch (Exception e) {
            log.warn("记录操作日志参数失败: {}", e.getMessage());
        }

        // 获取当前用户信息
        fillUserInfo(operationLog);

        // 获取请求IP
        fillRequestInfo(operationLog);

        // 执行方法
        Object result;
        try {
            result = joinPoint.proceed();
            operationLog.setStatus(1); // 成功
        } catch (Throwable e) {
            operationLog.setStatus(0); // 失败
            String errorMsg = e.getMessage();
            if (StringUtils.hasText(errorMsg) && errorMsg.length() > 1000) {
                errorMsg = errorMsg.substring(0, 1000) + "...(truncated)";
            }
            operationLog.setErrorMsg(errorMsg);
            throw e;
        } finally {
            // 计算执行时长
            operationLog.setDuration(System.currentTimeMillis() - startTime);

            // 异步保存日志（不阻塞主流程）
            try {
                operationLogService.saveLog(operationLog);
            } catch (Exception e) {
                log.error("保存操作日志失败: {}", e.getMessage(), e);
            }
        }

        return result;
    }

    /**
     * 填充当前用户信息
     */
    private void fillUserInfo(com.miniprogram.entity.OperationLog operationLog) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                Object principal = authentication.getPrincipal();
                if (principal instanceof Long userId) {
                    operationLog.setUserId(userId);
                }
                if (StringUtils.hasText(authentication.getName())) {
                    operationLog.setUsername(authentication.getName());
                }
            }
        } catch (Exception e) {
            log.warn("获取当前用户信息失败: {}", e.getMessage());
        }
    }

    /**
     * 填充请求信息（IP等）
     */
    private void fillRequestInfo(com.miniprogram.entity.OperationLog operationLog) {
        try {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                operationLog.setIp(getClientIp(request));
            }
        } catch (Exception e) {
            log.warn("获取请求信息失败: {}", e.getMessage());
        }
    }

    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (!StringUtils.hasText(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (!StringUtils.hasText(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (!StringUtils.hasText(ip) || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多个代理时取第一个
        if (StringUtils.hasText(ip) && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
