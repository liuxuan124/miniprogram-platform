package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PurchaseEntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileEntitlementServiceImpl implements FileEntitlementService {

    private static final Set<String> TEXT_TYPES = Set.of("txt", "md", "markdown", "csv");

    private final FileItemMapper fileItemMapper;
    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MembershipAccessService membershipAccessService;
    private final PurchaseEntitlementService purchaseEntitlementService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public FileAccessVO getAccess(Long fileId, Long userId) {
        return getAccess(fileId, userId, null);
    }

    @Override
    public FileAccessVO getAccess(Long fileId, Long userId, String planetId) {
        FileItem item = fileItemMapper.selectById(fileId);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        return buildAccessVO(item, userId, planetId);
    }

    @Override
    public FileAccessVO buildAccessVO(FileItem item, Long userId) {
        return buildAccessVO(item, userId, null);
    }

    @Override
    public FileAccessVO buildAccessVO(FileItem item, Long userId, String planetId) {
        FileAccessVO vo = new FileAccessVO();
        vo.setId(item.getId());
        vo.setName(item.getName());
        vo.setSummary(item.getSummary());
        vo.setFileType(item.getFileType());
        vo.setSize(item.getSize());
        vo.setMimeType(item.getMimeType());
        vo.setQualityTier(item.getQualityTier());
        vo.setReadMode(item.getReadMode());
        vo.setPreviewPercent(item.getPreviewPercent());
        vo.setPreviewMode(resolvePreviewMode(item));
        vo.setPreviewValue(resolvePreviewValue(item));
        vo.setPageCount(item.getPageCount());
        vo.setAllowForward(item.getAllowForward() == null || item.getAllowForward() == 1);
        vo.setWatermark(item.getWatermark() != null && item.getWatermark() == 1);
        if (Boolean.TRUE.equals(vo.getWatermark())) {
            vo.setWatermarkText(buildWatermarkText(item, userId));
        }
        vo.setBoundProductId(item.getBoundProductId());
        vo.setPreviewPages(resolveKeepPages(item));

        boolean unlockAll = membershipAccessService.hasBenefit(userId, MemberBenefitCodes.FILE_UNLOCK_ALL);
        boolean canRead = unlockAll || canRead(item, userId, planetId);
        boolean canDownload = canDownload(item, userId, planetId);
        vo.setCanRead(canRead);
        vo.setCanDownload(canDownload);
        vo.setCanPreview(!canRead && canPreview(item, userId, planetId));

        if (vo.getCanPreview()) {
            int percent = resolvePreviewPercent(item);
            vo.setPreviewText(extractPreviewText(item, percent));
            if (isBinaryPreviewable(item)) {
                vo.setPreviewUrl("/api/v1/mp/files/" + item.getId() + "/preview-file");
            }
        }

        if (!canRead && !canDownload) {
            vo.setLockedReason(resolveLockedReason(item, userId));
        } else if (!canDownload) {
            vo.setLockedReason("当前权限仅可预览，下载需升级会员");
        }

        if (item.getMinReadLevelId() != null) {
            MemberLevel level = memberLevelMapper.selectById(item.getMinReadLevelId());
            if (level != null) {
                vo.setMinReadLevelName(level.getName());
            }
        }
        if (item.getMinDownloadLevelId() != null) {
            MemberLevel level = memberLevelMapper.selectById(item.getMinDownloadLevelId());
            if (level != null) {
                vo.setMinDownloadLevelName(level.getName());
            }
        }
        return vo;
    }

    @Override
    public Path resolveFilePath(FileItem item) {
        if (item == null || !StringUtils.hasText(item.getStorageKey())) {
            throw new BusinessException(404001, "文件不存在");
        }
        Path path = Paths.get(uploadDir, item.getStorageKey()).normalize();
        Path root = Paths.get(uploadDir).normalize().toAbsolutePath();
        if (!path.toAbsolutePath().startsWith(root)) {
            throw new BusinessException(400001, "非法文件路径");
        }
        if (!Files.exists(path)) {
            throw new BusinessException(404001, "文件不存在");
        }
        return path;
    }

    @Override
    public boolean canRead(FileItem item, Long userId) {
        return canRead(item, userId, null);
    }

    @Override
    public boolean canRead(FileItem item, Long userId, String planetId) {
        if (item == null) {
            return false;
        }
        if (membershipAccessService.hasBenefit(userId, MemberBenefitCodes.FILE_UNLOCK_ALL)) {
            return true;
        }
        String mode = StringUtils.hasText(item.getReadMode()) ? item.getReadMode() : "free";
        return switch (mode) {
            case "free" -> true;
            case "login" -> userId != null;
            case "member" -> isMember(userId);
            case "planet_member" -> isPlanetMember(userId, planetId);
            case "level" -> meetsMinLevel(userId, item.getMinReadLevelId());
            case "column_buyer" -> isColumnBuyer(userId, item);
            default -> false;
        };
    }

    @Override
    public boolean canDownload(FileItem item, Long userId) {
        return canDownload(item, userId, null);
    }

    @Override
    public boolean canDownload(FileItem item, Long userId, String planetId) {
        if (item == null) {
            return false;
        }
        if (item.getAllowDownload() == null || item.getAllowDownload() == 0) {
            return false;
        }
        if (!canRead(item, userId, planetId)) {
            return false;
        }
        String audience = StringUtils.hasText(item.getDownloadAudience()) ? item.getDownloadAudience() : "all";
        return switch (audience) {
            case "none" -> false;
            case "all" -> true;
            case "member" -> isMember(userId);
            case "level" -> meetsMinLevel(userId, item.getMinDownloadLevelId());
            default -> false;
        };
    }

    @Override
    public String extractPreviewText(FileItem item, int previewPercent) {
        if (!canPreviewByMode(item)) {
            return null;
        }
        if (!isTextPreviewable(item)) {
            return "该资料支持试读权限，但当前格式无法内嵌文本预览，开通后可下载完整文件。";
        }
        try {
            Path path = resolveFilePath(item);
            String content = Files.readString(path, StandardCharsets.UTF_8);
            if (!StringUtils.hasText(content)) {
                return "";
            }
            int percent = Math.max(0, Math.min(100, previewPercent));
            int length = (int) Math.ceil(content.length() * (percent / 100.0));
            length = Math.max(1, Math.min(length, content.length()));
            String preview = content.substring(0, length);
            if (length < content.length()) {
                preview += "\n\n…（预览 " + percent + "%，解锁后可查看完整内容）";
            }
            return preview;
        } catch (IOException e) {
            log.warn("读取预览文本失败 fileId={}: {}", item.getId(), e.getMessage());
            return "暂无法生成文本预览，解锁后可下载查看完整文件。";
        }
    }

    @Override
    public List<ContentAttachmentDTO> enrichAttachments(List<ContentAttachmentDTO> attachments, Long userId) {
        return enrichAttachments(attachments, userId, null);
    }

    @Override
    public List<ContentAttachmentDTO> enrichAttachments(List<ContentAttachmentDTO> attachments, Long userId, String planetId) {
        if (attachments == null || attachments.isEmpty()) {
            return attachments;
        }
        List<ContentAttachmentDTO> result = new ArrayList<>();
        for (ContentAttachmentDTO att : attachments) {
            ContentAttachmentDTO copy = copyAttachment(att);
            if (copy.getFileId() != null) {
                FileItem item = fileItemMapper.selectById(copy.getFileId());
                if (item != null) {
                    FileAccessVO access = buildAccessVO(item, userId, planetId);
                    copy.setName(StringUtils.hasText(copy.getName()) ? copy.getName() : item.getName());
                    copy.setSize(item.getSize());
                    copy.setMimeType(item.getMimeType());
                    copy.setFileType(item.getFileType());
                    copy.setQualityTier(access.getQualityTier());
                    copy.setCanRead(access.getCanRead());
                    copy.setCanDownload(access.getCanDownload());
                    copy.setCanPreview(access.getCanPreview());
                    copy.setPreviewText(access.getPreviewText());
                    copy.setLockedReason(access.getLockedReason());
                    copy.setUrl(null);
                } else {
                    copy.setUrl(null);
                    copy.setCanRead(false);
                    copy.setCanDownload(false);
                    copy.setLockedReason("文件不存在或已下架");
                }
            } else if (StringUtils.hasText(copy.getUrl())) {
                copy.setCanRead(true);
                copy.setCanDownload(true);
                copy.setCanPreview(false);
            }
            result.add(copy);
        }
        return result;
    }

    private ContentAttachmentDTO copyAttachment(ContentAttachmentDTO att) {
        ContentAttachmentDTO copy = new ContentAttachmentDTO();
        copy.setId(att.getId());
        copy.setName(att.getName());
        copy.setUrl(att.getUrl());
        copy.setSize(att.getSize());
        copy.setMimeType(att.getMimeType());
        copy.setFileType(att.getFileType());
        copy.setSortOrder(att.getSortOrder());
        copy.setFileId(att.getFileId());
        return copy;
    }

    @Override
    public boolean canPreview(FileItem item, Long userId) {
        return canPreview(item, userId, null);
    }

    @Override
    public boolean canPreview(FileItem item, Long userId, String planetId) {
        if (item == null) {
            return false;
        }
        if (membershipAccessService.hasBenefit(userId, MemberBenefitCodes.FILE_UNLOCK_ALL)) {
            return false;
        }
        if (canRead(item, userId, planetId)) {
            return false;
        }
        return canPreviewByMode(item);
    }

    private boolean canPreviewByMode(FileItem item) {
        String mode = resolvePreviewMode(item);
        if ("none".equals(mode)) {
            return false;
        }
        if ("free".equals(item.getReadMode())) {
            return false;
        }
        return true;
    }

    private String resolvePreviewMode(FileItem item) {
        if (item != null && org.springframework.util.StringUtils.hasText(item.getPreviewMode())) {
            return item.getPreviewMode();
        }
        Integer percent = item != null ? item.getPreviewPercent() : null;
        if (percent == null || percent <= 0) return "none";
        if (percent >= 100) return "full";
        return "percent";
    }

    private int resolvePreviewValue(FileItem item) {
        if (item != null && item.getPreviewValue() != null) {
            return item.getPreviewValue();
        }
        if (item != null && item.getPreviewPercent() != null) {
            return item.getPreviewPercent();
        }
        return 20;
    }

    private int resolvePreviewPercent(FileItem item) {
        String mode = resolvePreviewMode(item);
        int value = resolvePreviewValue(item);
        return switch (mode) {
            case "full" -> 100;
            case "first_page" -> {
                int pages = item.getPageCount() != null && item.getPageCount() > 0 ? item.getPageCount() : 10;
                yield Math.max(1, 100 / pages);
            }
            case "pages" -> {
                int pages = item.getPageCount() != null && item.getPageCount() > 0 ? item.getPageCount() : 10;
                yield Math.min(100, Math.max(1, value * 100 / pages));
            }
            case "percent" -> Math.max(0, Math.min(100, value));
            default -> 0;
        };
    }

    @Override
    public int resolveKeepPages(FileItem item) {
        String mode = resolvePreviewMode(item);
        int value = resolvePreviewValue(item);
        int total = item != null && item.getPageCount() != null && item.getPageCount() > 0 ? item.getPageCount() : 10;
        return switch (mode) {
            case "none" -> 0;
            case "first_page" -> 1;
            case "pages" -> Math.max(1, value);
            case "full" -> total;
            case "percent" -> Math.max(1, (int) Math.ceil(total * (Math.min(100, Math.max(0, value)) / 100.0)));
            default -> 1;
        };
    }

    private boolean isColumnBuyer(Long userId, FileItem item) {
        if (userId == null) {
            return false;
        }
        if (item.getBoundProductId() != null) {
            return purchaseEntitlementService.hasProduct(userId, item.getBoundProductId());
        }
        return purchaseEntitlementService.hasAnyColumnLikeProduct(userId);
    }

    private boolean isMember(Long userId) {
        return membershipAccessService.hasPlatformMembership(userId);
    }

    /**
     * {@code planet_member} 资料门禁策略 B（更安全）：
     * <ul>
     *   <li>上下文有明确 {@code planetId} → {@code hasPlanetMembership(userId, planetId)}</li>
     *   <li>无明确星球 → false（不回退「默认星球」、不接受「任一星球有效」）</li>
     * </ul>
     * 成长权益码 {@code planet_exclusive} 仅作展示兼容，不单独放行付费资料。
     */
    private boolean isPlanetMember(Long userId, String planetId) {
        if (userId == null || !StringUtils.hasText(planetId)) {
            return false;
        }
        return membershipAccessService.hasPlanetMembership(userId, planetId.trim());
    }

    private String buildWatermarkText(FileItem item, Long userId) {
        if (item.getWatermark() == null || item.getWatermark() != 1) {
            return "";
        }
        String nick = "读者";
        String last4 = "****";
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null) {
                if (StringUtils.hasText(user.getNickname())) {
                    nick = user.getNickname().trim();
                }
                String phone = user.getPhone();
                if (StringUtils.hasText(phone) && phone.length() >= 4) {
                    last4 = phone.substring(phone.length() - 4);
                }
            }
        }
        if (nick.length() > 12) {
            nick = nick.substring(0, 12);
        }
        return nick + " " + last4;
    }

    private boolean isBinaryPreviewable(FileItem item) {
        if (item == null || !StringUtils.hasText(item.getFileType())) {
            return false;
        }
        String type = item.getFileType().toLowerCase(Locale.ROOT);
        return "pdf".equals(type) || "doc".equals(type) || "docx".equals(type);
    }

    private boolean isTextPreviewable(FileItem item) {
        if (item == null) {
            return false;
        }
        String type = item.getFileType() != null ? item.getFileType().toLowerCase(Locale.ROOT) : "";
        if (TEXT_TYPES.contains(type)) {
            return true;
        }
        String mime = item.getMimeType() != null ? item.getMimeType().toLowerCase(Locale.ROOT) : "";
        return mime.startsWith("text/") || mime.contains("markdown") || mime.contains("csv");
    }

    private boolean meetsMinLevel(Long userId, Long minLevelId) {
        if (minLevelId == null) {
            return true;
        }
        if (userId == null) {
            return false;
        }
        MemberLevel required = memberLevelMapper.selectById(minLevelId);
        if (required == null || required.getMinPoints() == null) {
            return true;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }
        int points = user.getPoints() != null ? user.getPoints() : 0;
        return points >= required.getMinPoints();
    }

    private String resolveLockedReason(FileItem item, Long userId) {
        String mode = StringUtils.hasText(item.getReadMode()) ? item.getReadMode() : "free";
        return switch (mode) {
            case "login" -> userId == null ? "登录后可查看完整内容" : "暂无阅读权限";
            case "member" -> userId == null ? "登录并升级会员后可查看" : "升级会员后可查看完整内容";
            case "planet_member" -> userId == null ? "登录并加入星球后可查看" : "加入星球后可查看完整内容";
            case "column_buyer" -> userId == null ? "登录并购买专栏后可查看" : "购买对应专栏后可查看完整内容";
            case "level" -> {
                MemberLevel level = item.getMinReadLevelId() != null
                        ? memberLevelMapper.selectById(item.getMinReadLevelId()) : null;
                String levelName = level != null ? level.getName() : "指定等级";
                yield userId == null
                        ? "登录并达到「" + levelName + "」后可查看"
                        : "达到「" + levelName + "」后可查看完整内容";
            }
            default -> "暂无访问权限";
        };
    }
}
