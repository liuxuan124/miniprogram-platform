package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.EmailSendLog;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.UserEmail;
import com.miniprogram.mapper.EmailSendLogMapper;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.UserEmailMapper;
import com.miniprogram.service.DownloadGrantService;
import com.miniprogram.service.EmailDeliveryService;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.mapper.SystemConfigMapper;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailDeliveryServiceImpl implements EmailDeliveryService {

    private final UserEmailMapper userEmailMapper;
    private final EmailSendLogMapper emailSendLogMapper;
    private final FileItemMapper fileItemMapper;
    private final FileEntitlementService fileEntitlementService;
    private final DownloadGrantService downloadGrantService;
    private final SystemConfigService systemConfigService;
    private final SystemConfigMapper systemConfigMapper;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Override
    public void bindEmail(Long userId, String email) {
        if (userId == null || !StringUtils.hasText(email) || !email.contains("@")) {
            throw new BusinessException(400001, "邮箱格式不正确");
        }
        String normalized = email.trim().toLowerCase();
        UserEmail row = userEmailMapper.selectOne(new LambdaQueryWrapper<UserEmail>()
                .eq(UserEmail::getUserId, userId).last("LIMIT 1"));
        String token = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        if (row == null) {
            row = new UserEmail();
            row.setUserId(userId);
            row.setEmail(normalized);
            row.setVerified(0);
            row.setVerifyTokenHash(sha256(token));
            row.setConsentAt(now);
            row.setCreatedAt(now);
            userEmailMapper.insert(row);
        } else {
            row.setEmail(normalized);
            row.setVerified(0);
            row.setVerifyTokenHash(sha256(token));
            row.setConsentAt(now);
            userEmailMapper.updateById(row);
        }
        sendRaw(normalized, "验证邮箱", "请点击或复制验证 token 完成绑定（24h 有效）：\n" + token);
    }

    @Override
    public void verifyEmail(Long userId, String token) {
        UserEmail row = userEmailMapper.selectOne(new LambdaQueryWrapper<UserEmail>()
                .eq(UserEmail::getUserId, userId).last("LIMIT 1"));
        if (row == null || row.getVerifyTokenHash() == null) {
            throw new BusinessException(404001, "未绑定邮箱");
        }
        if (!row.getVerifyTokenHash().equals(sha256(token))) {
            throw new BusinessException(403001, "验证 token 无效");
        }
        row.setVerified(1);
        row.setVerifiedAt(LocalDateTime.now());
        row.setVerifyTokenHash(null);
        userEmailMapper.updateById(row);
    }

    @Override
    public void sendFileDownloadLink(Long userId, Long fileId) {
        UserEmail row = userEmailMapper.selectOne(new LambdaQueryWrapper<UserEmail>()
                .eq(UserEmail::getUserId, userId).last("LIMIT 1"));
        if (row == null || row.getVerified() == null || row.getVerified() != 1) {
            throw new BusinessException(403001, "请先绑定并验证邮箱");
        }
        assertDailyCap(userId);
        FileItem item = fileItemMapper.selectById(fileId);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在");
        }
        if (!fileEntitlementService.canDownload(item, userId, null)) {
            throw new BusinessException(403001, "暂无下载权限");
        }
        DownloadGrantService.GrantResult grant = downloadGrantService.issueGrant(userId, item, 24 * 60);
        String body = "您申请的资料《" + item.getName() + "》下载链接（24 小时内有效）：\n" + grant.downloadPath();
        try {
            sendRaw(row.getEmail(), "资料下载链接", body);
            EmailSendLog logRow = new EmailSendLog();
            logRow.setUserId(userId);
            logRow.setEmail(row.getEmail());
            logRow.setFileId(fileId);
            logRow.setGrantTokenHash(sha256(grant.token()));
            logRow.setStatus("sent");
            logRow.setCreatedAt(LocalDateTime.now());
            emailSendLogMapper.insert(logRow);
        } catch (Exception e) {
            EmailSendLog logRow = new EmailSendLog();
            logRow.setUserId(userId);
            logRow.setEmail(row.getEmail());
            logRow.setFileId(fileId);
            logRow.setStatus("failed");
            logRow.setErrorMsg(e.getMessage());
            logRow.setCreatedAt(LocalDateTime.now());
            emailSendLogMapper.insert(logRow);
            throw new BusinessException(500001, "邮件发送失败，请稍后重试");
        }
    }

    @Override
    public Map<String, String> getSmtpConfigForAdmin() {
        Map<String, String> m = new HashMap<>();
        m.put("smtp_host", systemConfigService.getConfigValue("smtp_host"));
        m.put("smtp_port", systemConfigService.getConfigValue("smtp_port"));
        m.put("smtp_user", systemConfigService.getConfigValue("smtp_user"));
        m.put("smtp_from", systemConfigService.getConfigValue("smtp_from"));
        m.put("smtp_pass_set", StringUtils.hasText(systemConfigService.getConfigValue("smtp_pass")) ? "yes" : "no");
        return m;
    }

    @Override
    public void saveSmtpConfig(Map<String, String> config) {
        if (config == null) return;
        putIfPresent("smtp_host", config.get("smtp_host"));
        putIfPresent("smtp_port", config.get("smtp_port"));
        putIfPresent("smtp_user", config.get("smtp_user"));
        putIfPresent("smtp_from", config.get("smtp_from"));
        if (StringUtils.hasText(config.get("smtp_pass"))) {
            putIfPresent("smtp_pass", config.get("smtp_pass"));
        }
    }

    private void putIfPresent(String key, String value) {
        if (value == null) return;
        SystemConfig c = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key).last("LIMIT 1"));
        if (c == null) {
            c = new SystemConfig();
            c.setConfigKey(key);
            c.setConfigGroup("mail");
            c.setConfigValue(value);
            c.setCreateTime(LocalDateTime.now());
            c.setUpdateTime(LocalDateTime.now());
            systemConfigMapper.insert(c);
        } else {
            c.setConfigValue(value);
            c.setUpdateTime(LocalDateTime.now());
            systemConfigMapper.updateById(c);
        }
    }

    private void assertDailyCap(Long userId) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Long count = emailSendLogMapper.selectCount(new LambdaQueryWrapper<EmailSendLog>()
                .eq(EmailSendLog::getUserId, userId)
                .ge(EmailSendLog::getCreatedAt, start)
                .eq(EmailSendLog::getStatus, "sent"));
        int cap = 10;
        try {
            cap = Integer.parseInt(systemConfigService.getConfigValue("email_send_daily_cap"));
        } catch (Exception ignored) {
        }
        if (count != null && count >= cap) {
            throw new BusinessException(403004, "今日邮件发送已达上限");
        }
    }

    private void sendRaw(String to, String subject, String text) {
        JavaMailSender sender = resolveMailSender();
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(text);
        String from = systemConfigService.getConfigValue("smtp_from");
        if (StringUtils.hasText(from)) {
            msg.setFrom(from.trim());
        }
        sender.send(msg);
    }

    private JavaMailSender resolveMailSender() {
        if (mailSender != null && StringUtils.hasText(systemConfigService.getConfigValue("smtp_host"))) {
            return mailSender;
        }
        String host = systemConfigService.getConfigValue("smtp_host");
        if (!StringUtils.hasText(host)) {
            log.warn("SMTP 未配置，邮件仅记日志不发信 to={}", "masked");
            throw new BusinessException(500002, "SMTP 未配置，请联系管理员");
        }
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(host.trim());
        String port = systemConfigService.getConfigValue("smtp_port");
        if (StringUtils.hasText(port)) {
            impl.setPort(Integer.parseInt(port.trim()));
        }
        impl.setUsername(systemConfigService.getConfigValue("smtp_user"));
        impl.setPassword(systemConfigService.getConfigValue("smtp_pass"));
        Properties props = impl.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        return impl;
    }

    private static String sha256(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
