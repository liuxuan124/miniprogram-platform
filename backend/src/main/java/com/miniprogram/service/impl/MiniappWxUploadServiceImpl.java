package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
import com.miniprogram.service.WxPushTargetService;
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
    private final WxPushTargetService wxPushTargetService;
    private final ObjectMapper objectMapper;

    @Value("${miniapp.project-root:}")
    private String configuredProjectRoot;

    @Value("${miniapp.node-command:node}")
    private String nodeCommand;

    @Override
    public PushPreviewResultVO pushPreview(Long releaseId, PushPreviewDTO dto) {
        long start = System.currentTimeMillis();
        Capability capability = probeCapability();
        if (!capability.available) {
            throw new BusinessException(ErrorCode.MINIAPP_PUBLISH_FAILED,
                    "服务器不具备本地上传条件：" + capability.reason
                            + "。请改用 CI 推送（仓库 Actions: push-miniprogram-preview），或在服务器放置私钥文件后于发布中心选择推送目标。");
        }

        MiniappRelease release = miniappReleaseService.getReleaseDetail(releaseId);
        if (dto != null && Boolean.FALSE.equals(dto.getConfirmCodeChange())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请确认本次包含 miniapp 代码变更后再推送");
        }

        Long targetId = dto != null ? dto.getTargetId() : null;
        String overrideAppId = dto != null ? dto.getAppId() : null;
        WxPushTargetService.ResolvedTarget resolved = wxPushTargetService.resolveForPush(targetId, overrideAppId);
        String appId = resolved.appId();
        String uploadKey = resolved.uploadKey();

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
            upsertConfig("wx_last_pushed_appid", appId, "wx", "最近推送体验版 AppID");
            if (resolved.targetId() != null) {
                upsertConfig("wx_last_pushed_target_id", String.valueOf(resolved.targetId()), "wx", "最近推送目标 ID");
            }

            long duration = System.currentTimeMillis() - start;
            versionOperationLogService.logOperation(
                    releaseId, version, "wx_push_preview",
                    versionDesc + " -> " + appId + " (" + resolved.name() + ")", true, null, duration
            );

            return PushPreviewResultVO.builder()
                    .version(version)
                    .versionDesc(versionDesc)
                    .releaseId(releaseId)
                    .releaseSemver(release.getSemver())
                    .uploadedAt(uploadedAt)
                    .manageUrl("https://mp.weixin.qq.com/")
                    .message("体验版已上传到「" + resolved.name() + "」(AppID " + appId
                            + ")。请前往微信公众平台查看体验版二维码并提交审核。日常改页面内容不必再推代码。")
                    .appId(appId)
                    .targetName(resolved.name())
                    .credentialSource(resolved.source())
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
        Capability capability = probeCapability();
        String version = systemConfigService.getConfigValue("wx_last_pushed_version");
        String versionDesc = systemConfigService.getConfigValue("wx_version_desc");
        String pushedAt = systemConfigService.getConfigValue("wx_last_pushed_at");
        String appId = systemConfigService.getConfigValue("wx_last_pushed_appid");
        if (!StringUtils.hasText(version)) {
            return PushPreviewResultVO.builder()
                    .message("尚未推送过体验版")
                    .manageUrl("https://mp.weixin.qq.com/")
                    .uploadAvailable(capability.available)
                    .preferCi(true)
                    .capabilityReason(capability.reason)
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
                .message("最近一次体验版推送版本：" + version
                        + (StringUtils.hasText(appId) ? " → " + appId : ""))
                .uploadAvailable(capability.available)
                .preferCi(true)
                .capabilityReason(capability.reason)
                .appId(appId)
                .build();
    }

    private record Capability(boolean available, String reason) {}

    private Capability probeCapability() {
        try {
            wxPushTargetService.resolveForPush(null, null);
        } catch (BusinessException e) {
            return new Capability(false, e.getMessage() != null ? e.getMessage() : "未配置推送凭证");
        } catch (Exception e) {
            return new Capability(false, e.getMessage());
        }
        try {
            Path projectRoot = resolveProjectRootQuiet();
            if (projectRoot == null) {
                return new Capability(false, "未找到 miniapp 工程目录 / 上传脚本");
            }
            Path miniappPath = projectRoot.resolve("miniapp");
            Path scriptPath = projectRoot.resolve("scripts").resolve("push-miniprogram-preview.js");
            if (!Files.isDirectory(miniappPath) || !Files.isRegularFile(scriptPath)) {
                return new Capability(false, "未找到 miniapp 目录或 scripts/push-miniprogram-preview.js");
            }
            return new Capability(true, "本地上传可用（仍建议密钥放服务器文件或 CI）");
        } catch (Exception e) {
            return new Capability(false, e.getMessage());
        }
    }

    private Path resolveProjectRootQuiet() {
        try {
            return resolveProjectRoot();
        } catch (Exception e) {
            return null;
        }
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

    private Map<String, Object> parseScriptResult(String output) {
        try {
            Matcher matcher = JSON_LINE_PATTERN.matcher(output);
            if (matcher.find()) {
                int start = matcher.start();
                String json = output.substring(start).trim();
                int end = json.lastIndexOf('}');
                if (end > 0) {
                    json = json.substring(0, end + 1);
                }
                return objectMapper.readValue(json, new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.warn("解析上传脚本输出失败: {}", e.getMessage());
        }
        return Map.of("ok", false, "message", "上传脚本无有效输出", "detail", output);
    }

    private void upsertConfig(String key, String value, String group, String description) {
        SystemConfig existing = systemConfigService.getOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key)
                .last("LIMIT 1"));
        if (existing != null) {
            existing.setConfigValue(value);
            systemConfigService.updateById(existing);
        } else {
            SystemConfig config = new SystemConfig();
            config.setConfigKey(key);
            config.setConfigValue(value);
            config.setConfigGroup(group);
            config.setDescription(description);
            systemConfigService.save(config);
        }
    }
}
