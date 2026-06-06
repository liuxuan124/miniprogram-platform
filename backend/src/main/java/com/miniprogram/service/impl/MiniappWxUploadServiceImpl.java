package com.miniprogram.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.miniapp.PushPreviewDTO;
import com.miniprogram.dto.miniapp.PushPreviewResultVO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.MiniappWxUploadService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.VersionOperationLogService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappWxUploadServiceImpl implements MiniappWxUploadService {

    private static final Pattern JSON_LINE_PATTERN = Pattern.compile("\\{\\s*\"ok\"\\s*:");

    private final MiniappReleaseService miniappReleaseService;
    private final SystemConfigService systemConfigService;
    private final VersionOperationLogService versionOperationLogService;
    private final ObjectMapper objectMapper;

    @Value("${miniapp.project-root:}")
    private String configuredProjectRoot;

    @Value("${miniapp.node-command:node}")
    private String nodeCommand;

    @Value("${wx.miniapp.appid:}")
    private String defaultAppId;

    @Override
    public PushPreviewResultVO pushPreview(Long releaseId, PushPreviewDTO dto) {
        long start = System.currentTimeMillis();
        MiniappRelease release = miniappReleaseService.getReleaseDetail(releaseId);
        if (dto != null && Boolean.FALSE.equals(dto.getConfirmCodeChange())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请确认本次包含 miniapp 代码变更后再推送");
        }

        String appId = resolveAppId();
        String uploadKey = systemConfigService.getConfigValue("wx_upload_key");
        if (!StringUtils.hasText(uploadKey)) {
            throw new BusinessException(ErrorCode.WX_UPLOAD_KEY_MISSING);
        }

        Path projectRoot = resolveProjectRoot();
        Path miniappPath = projectRoot.resolve("miniapp");
        Path scriptPath = projectRoot.resolve("scripts").resolve("push-miniprogram-preview.js");
        if (!Files.isDirectory(miniappPath)) {
            throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED, "未找到 miniapp 目录: " + miniappPath);
        }
        if (!Files.isRegularFile(scriptPath)) {
            throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED, "未找到上传脚本: " + scriptPath);
        }

        String version = release.getSemver();
        String versionDesc = dto != null && StringUtils.hasText(dto.getVersionDesc())
                ? dto.getVersionDesc()
                : StringUtils.hasText(release.getReleaseNotes())
                ? release.getReleaseNotes()
                : "后台一键推送体验版 " + version;

        List<String> command = new ArrayList<>();
        command.add(nodeCommand);
        command.add(scriptPath.toString());
        command.add("--project");
        command.add(miniappPath.toString());
        command.add("--appid");
        command.add(appId);
        command.add("--version");
        command.add(version);
        command.add("--desc");
        command.add(versionDesc);

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.directory(projectRoot.toFile());
        processBuilder.redirectErrorStream(true);
        processBuilder.environment().put("WX_UPLOAD_KEY", uploadKey);

        String output;
        try {
            Process process = processBuilder.start();
            output = readProcessOutput(process);
            int exitCode = process.waitFor();
            Map<String, Object> result = parseScriptResult(output);
            if (exitCode != 0 || !Boolean.TRUE.equals(result.get("ok"))) {
                String message = String.valueOf(result.getOrDefault("message", "上传失败"));
                String detail = String.valueOf(result.getOrDefault("detail", ""));
                long duration = System.currentTimeMillis() - start;
                versionOperationLogService.logOperation(
                        releaseId, version, "wx_push_preview", versionDesc, false, message + detail, duration
                );
                throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED, message);
            }

            LocalDateTime uploadedAt = LocalDateTime.now();
            upsertConfig("wx_version", version, "wx", "小程序上传版本号");
            upsertConfig("wx_version_desc", versionDesc, "wx", "小程序上传版本描述");
            upsertConfig("wx_last_pushed_version", version, "wx", "最近推送体验版版本号");
            upsertConfig("wx_last_pushed_at", uploadedAt.toString(), "wx", "最近推送体验版时间");

            long duration = System.currentTimeMillis() - start;
            versionOperationLogService.logOperation(
                    releaseId, version, "wx_push_preview", versionDesc, true, null, duration
            );

            return PushPreviewResultVO.builder()
                    .version(version)
                    .versionDesc(versionDesc)
                    .releaseId(releaseId)
                    .releaseSemver(release.getSemver())
                    .uploadedAt(uploadedAt)
                    .manageUrl("https://mp.weixin.qq.com/")
                    .message("体验版上传成功，请前往微信公众平台查看体验版二维码并提交审核。")
                    .build();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            long duration = System.currentTimeMillis() - start;
            versionOperationLogService.logOperation(
                    releaseId, release.getSemver(), "wx_push_preview", versionDesc, false, ex.getMessage(), duration
            );
            log.error("推送微信小程序体验版失败", ex);
            throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED, "推送失败: " + ex.getMessage());
        }
    }

    @Override
    public PushPreviewResultVO getLastPushStatus() {
        String version = systemConfigService.getConfigValue("wx_last_pushed_version");
        String versionDesc = systemConfigService.getConfigValue("wx_version_desc");
        String pushedAt = systemConfigService.getConfigValue("wx_last_pushed_at");
        if (!StringUtils.hasText(version)) {
            return PushPreviewResultVO.builder()
                    .message("尚未推送过体验版")
                    .manageUrl("https://mp.weixin.qq.com/")
                    .build();
        }

        LocalDateTime uploadedAt = null;
        if (StringUtils.hasText(pushedAt)) {
            try {
                uploadedAt = LocalDateTime.parse(pushedAt);
            } catch (Exception ignored) {
                // ignore parse errors
            }
        }

        return PushPreviewResultVO.builder()
                .version(version)
                .versionDesc(versionDesc)
                .uploadedAt(uploadedAt)
                .manageUrl("https://mp.weixin.qq.com/")
                .message("最近一次体验版推送版本：" + version)
                .build();
    }

    private String resolveAppId() {
        String appId = systemConfigService.getConfigValue("wx_appid");
        if (!StringUtils.hasText(appId)) {
            appId = systemConfigService.getConfigValue("appId");
        }
        if (!StringUtils.hasText(appId)) {
            appId = defaultAppId;
        }
        if (!StringUtils.hasText(appId) || "your-appid".equals(appId) || "your-appid-here".equals(appId)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请先在系统设置中配置微信小程序 AppID");
        }
        return appId;
    }

    private Path resolveProjectRoot() {
        if (StringUtils.hasText(configuredProjectRoot)) {
            return Paths.get(configuredProjectRoot).toAbsolutePath().normalize();
        }
        Path cwd = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (Files.isDirectory(cwd.resolve("miniapp"))) {
            return cwd;
        }
        Path parent = cwd.getParent();
        if (parent != null && Files.isDirectory(parent.resolve("miniapp"))) {
            return parent;
        }
        throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED, "无法定位项目根目录，请配置 miniapp.project-root");
    }

    private String readProcessOutput(Process process) throws Exception {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
            }
        }
        return builder.toString();
    }

    private Map<String, Object> parseScriptResult(String output) throws Exception {
        if (!StringUtils.hasText(output)) {
            return Map.of("ok", false, "message", "上传脚本无输出");
        }

        String[] lines = output.split("\\R");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            Matcher matcher = JSON_LINE_PATTERN.matcher(line);
            if (matcher.find()) {
                return objectMapper.readValue(line, new TypeReference<Map<String, Object>>() {});
            }
        }

        return Map.of("ok", false, "message", output.trim());
    }

    private void upsertConfig(String key, String value, String group, String description) {
        SystemConfig config = systemConfigService.getOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key));
        if (config == null) {
            config = new SystemConfig();
            config.setConfigKey(key);
            config.setConfigGroup(group);
            config.setDescription(description);
        }
        config.setConfigValue(value);
        systemConfigService.saveOrUpdate(config);
    }
}
