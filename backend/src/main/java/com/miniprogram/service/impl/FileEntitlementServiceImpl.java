package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.FileEntitlementService;
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
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileEntitlementServiceImpl implements FileEntitlementService {

    private static final Set<String> TEXT_TYPES = Set.of("txt", "md", "csv");

    private final FileItemMapper fileItemMapper;
    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public FileAccessVO getAccess(Long fileId, Long userId) {
        FileItem item = fileItemMapper.selectById(fileId);
        if (item == null || !"published".equals(item.getStatus())) {
            throw new BusinessException(404001, "文件不存在或未发布");
        }
        return buildAccessVO(item, userId);
    }

    @Override
    public FileAccessVO buildAccessVO(FileItem item, Long userId) {
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

        boolean canRead = canRead(item, userId);
        boolean canDownload = canDownload(item, userId);
        vo.setCanRead(canRead);
        vo.setCanDownload(canDownload);
        vo.setCanPreview(!canRead && canPreview(item));

        if (vo.getCanPreview()) {
            int percent = item.getPreviewPercent() != null ? item.getPreviewPercent() : 30;
            vo.setPreviewText(extractPreviewText(item, percent));
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
        if (item == null) {
            return false;
        }
        String mode = StringUtils.hasText(item.getReadMode()) ? item.getReadMode() : "free";
        return switch (mode) {
            case "free" -> true;
            case "login" -> userId != null;
            case "member" -> isMember(userId);
            case "level" -> meetsMinLevel(userId, item.getMinReadLevelId());
            default -> false;
        };
    }

    @Override
    public boolean canDownload(FileItem item, Long userId) {
        if (item == null) {
            return false;
        }
        if (item.getAllowDownload() == null || item.getAllowDownload() == 0) {
            return false;
        }
        if (!canRead(item, userId)) {
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
        if (!canPreview(item)) {
            return null;
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
        if (attachments == null || attachments.isEmpty()) {
            return attachments;
        }
        List<ContentAttachmentDTO> result = new ArrayList<>();
        for (ContentAttachmentDTO att : attachments) {
            ContentAttachmentDTO copy = copyAttachment(att);
            if (copy.getFileId() != null) {
                FileItem item = fileItemMapper.selectById(copy.getFileId());
                if (item != null) {
                    FileAccessVO access = buildAccessVO(item, userId);
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

    private boolean canPreview(FileItem item) {
        if (item == null) {
            return false;
        }
        if ("free".equals(item.getReadMode())) {
            return false;
        }
        return TEXT_TYPES.contains(StringUtils.hasText(item.getFileType()) ? item.getFileType() : "");
    }

    private boolean isMember(Long userId) {
        if (userId == null) {
            return false;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }
        MemberLevel level = resolveLevel(user.getPoints());
        return level != null && level.getMinPoints() != null && level.getMinPoints() > 0;
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

    private MemberLevel resolveLevel(Integer points) {
        int p = points != null ? points : 0;
        List<MemberLevel> levels = memberLevelMapper.selectList(new LambdaQueryWrapper<MemberLevel>()
                .eq(MemberLevel::getStatus, 1)
                .orderByDesc(MemberLevel::getMinPoints));
        return levels.stream()
                .filter(level -> level.getMinPoints() != null && p >= level.getMinPoints())
                .max(Comparator.comparingInt(MemberLevel::getMinPoints))
                .orElse(null);
    }

    private String resolveLockedReason(FileItem item, Long userId) {
        String mode = StringUtils.hasText(item.getReadMode()) ? item.getReadMode() : "free";
        return switch (mode) {
            case "login" -> userId == null ? "登录后可查看完整内容" : "暂无阅读权限";
            case "member" -> userId == null ? "登录并升级会员后可查看" : "升级会员后可查看完整内容";
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
