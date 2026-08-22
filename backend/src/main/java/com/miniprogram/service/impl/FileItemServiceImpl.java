package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.file.*;
import com.miniprogram.entity.FileGroup;
import com.miniprogram.entity.FileItem;
import com.miniprogram.mapper.FileGroupMapper;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.service.FileItemService;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.dto.system.UploadResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileItemServiceImpl extends BaseServiceImpl<FileItemMapper, FileItem> implements FileItemService {

    private static final String PROTECTED_SUB_DIR = "protected/files";

    private final FileGroupMapper fileGroupMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final FileUploadService fileUploadService;

    @Override
    public PageResult<FileItemVO> listFiles(Long groupId, String keyword, String status, Long current, Long size) {
        LambdaQueryWrapper<FileItem> wrapper = new LambdaQueryWrapper<>();
        if (groupId != null && groupId == -1L) {
            wrapper.and(w -> w.isNull(FileItem::getGroupId).or().eq(FileItem::getGroupId, 0L));
        } else if (groupId != null) {
            wrapper.eq(FileItem::getGroupId, groupId);
        }
        wrapper.like(StringUtils.hasText(keyword), FileItem::getName, keyword);
        wrapper.eq(StringUtils.hasText(status), FileItem::getStatus, status);
        wrapper.orderByDesc(FileItem::getCreateTime);

        Page<FileItem> page = this.page(new Page<>(current, size), wrapper);
        Map<Long, String> groupNames = loadGroupNameMap();
        Map<Long, String> levelNames = loadLevelNameMap();

        PageResult<FileItemVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream()
                .map(item -> toVO(item, groupNames, levelNames))
                .toList());
        return result;
    }

    @Override
    public FileItemVO getFile(Long id) {
        FileItem item = requireItem(id);
        return toVO(item, loadGroupNameMap(), loadLevelNameMap());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileItemVO createFile(FileItemDTO dto) {
        FileItem item = fromDTO(new FileItem(), dto);
        this.save(item);
        return toVO(item, loadGroupNameMap(), loadLevelNameMap());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileItemVO updateFile(Long id, FileItemDTO dto) {
        FileItem item = requireItem(id);
        fromDTO(item, dto);
        this.updateById(item);
        return toVO(item, loadGroupNameMap(), loadLevelNameMap());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteFile(Long id) {
        requireItem(id);
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileItemVO uploadAndCreate(MultipartFile file, FileItemDTO dto) {
        UploadResultVO upload = fileUploadService.upload(file, PROTECTED_SUB_DIR);
        String storageKey = extractStorageKey(upload.getUrl());
        if (!StringUtils.hasText(dto.getName())) {
            dto.setName(StringUtils.hasText(upload.getOriginalFileName()) ? upload.getOriginalFileName() : upload.getFileName());
        }
        dto.setStorageKey(storageKey);
        if (dto.getSize() == null || dto.getSize() <= 0) {
            dto.setSize(upload.getFileSize());
        }
        if (!StringUtils.hasText(dto.getMimeType())) {
            dto.setMimeType(upload.getContentType());
        }
        if (!StringUtils.hasText(dto.getFileType())) {
            dto.setFileType(detectFileType(dto.getName(), dto.getMimeType()));
        }
        return createFile(dto);
    }

    @Override
    public List<FileGroupVO> listGroups() {
        List<FileGroup> groups = fileGroupMapper.selectList(new LambdaQueryWrapper<FileGroup>()
                .orderByAsc(FileGroup::getSortOrder)
                .orderByDesc(FileGroup::getCreateTime));
        return groups.stream().map(group -> {
            FileGroupVO vo = new FileGroupVO();
            vo.setId(group.getId());
            vo.setName(group.getName());
            vo.setSortOrder(group.getSortOrder());
            long count = this.count(new LambdaQueryWrapper<FileItem>().eq(FileItem::getGroupId, group.getId()));
            vo.setCount(count);
            return vo;
        }).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileGroupVO createGroup(FileGroupDTO dto) {
        FileGroup group = new FileGroup();
        group.setName(dto.getName());
        group.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        fileGroupMapper.insert(group);
        FileGroupVO vo = new FileGroupVO();
        vo.setId(group.getId());
        vo.setName(group.getName());
        vo.setSortOrder(group.getSortOrder());
        vo.setCount(0L);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileGroupVO updateGroup(Long id, FileGroupDTO dto) {
        FileGroup group = fileGroupMapper.selectById(id);
        if (group == null) {
            throw new BusinessException(404001, "分组不存在");
        }
        if (StringUtils.hasText(dto.getName())) {
            group.setName(dto.getName());
        }
        if (dto.getSortOrder() != null) {
            group.setSortOrder(dto.getSortOrder());
        }
        fileGroupMapper.updateById(group);
        FileGroupVO vo = new FileGroupVO();
        vo.setId(group.getId());
        vo.setName(group.getName());
        vo.setSortOrder(group.getSortOrder());
        vo.setCount(this.count(new LambdaQueryWrapper<FileItem>().eq(FileItem::getGroupId, group.getId())));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteGroup(Long id) {
        FileGroup group = fileGroupMapper.selectById(id);
        if (group == null) {
            throw new BusinessException(404001, "分组不存在");
        }
        long bound = this.count(new LambdaQueryWrapper<FileItem>().eq(FileItem::getGroupId, id));
        if (bound > 0) {
            throw new BusinessException(400001, "分组下仍有文件，请先移动或删除");
        }
        fileGroupMapper.deleteById(id);
    }

    private FileItem requireItem(Long id) {
        FileItem item = this.getById(id);
        if (item == null) {
            throw new BusinessException(404001, "文件不存在");
        }
        return item;
    }

    private FileItem fromDTO(FileItem item, FileItemDTO dto) {
        item.setName(dto.getName());
        item.setSummary(dto.getSummary());
        item.setGroupId(dto.getGroupId());
        item.setStorageKey(normalizeStorageKey(dto.getStorageKey()));
        item.setMimeType(dto.getMimeType());
        item.setFileType(StringUtils.hasText(dto.getFileType()) ? dto.getFileType() : detectFileType(dto.getName(), dto.getMimeType()));
        item.setSize(dto.getSize() != null ? dto.getSize() : 0L);
        item.setStatus(StringUtils.hasText(dto.getStatus()) ? dto.getStatus() : "draft");
        item.setQualityTier(StringUtils.hasText(dto.getQualityTier()) ? dto.getQualityTier() : "normal");
        item.setReadMode(StringUtils.hasText(dto.getReadMode()) ? dto.getReadMode() : "free");
        item.setPreviewPercent(dto.getPreviewPercent() != null ? clampPercent(dto.getPreviewPercent()) : 30);
        item.setMinReadLevelId(dto.getMinReadLevelId());
        item.setAllowDownload(dto.getAllowDownload() != null ? dto.getAllowDownload() : 1);
        item.setDownloadAudience(StringUtils.hasText(dto.getDownloadAudience()) ? dto.getDownloadAudience() : "all");
        item.setMinDownloadLevelId(dto.getMinDownloadLevelId());
        return item;
    }

    private FileItemVO toVO(FileItem item, Map<Long, String> groupNames, Map<Long, String> levelNames) {
        FileItemVO vo = new FileItemVO();
        BeanUtils.copyProperties(item, vo);
        if (item.getGroupId() != null) {
            vo.setGroupName(groupNames.get(item.getGroupId()));
        }
        if (item.getMinReadLevelId() != null) {
            vo.setMinReadLevelName(levelNames.get(item.getMinReadLevelId()));
        }
        if (item.getMinDownloadLevelId() != null) {
            vo.setMinDownloadLevelName(levelNames.get(item.getMinDownloadLevelId()));
        }
        return vo;
    }

    private Map<Long, String> loadGroupNameMap() {
        return fileGroupMapper.selectList(null).stream()
                .collect(Collectors.toMap(FileGroup::getId, FileGroup::getName, (a, b) -> a));
    }

    private Map<Long, String> loadLevelNameMap() {
        return memberLevelMapper.selectList(null).stream()
                .sorted(Comparator.comparingInt(l -> l.getMinPoints() != null ? l.getMinPoints() : 0))
                .collect(Collectors.toMap(l -> l.getId(), l -> l.getName(), (a, b) -> a));
    }

    static String extractStorageKey(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        int idx = url.indexOf("/uploads/");
        if (idx >= 0) {
            return url.substring(idx + "/uploads/".length());
        }
        return url.replaceFirst("^/+", "");
    }

    static String normalizeStorageKey(String storageKey) {
        if (!StringUtils.hasText(storageKey)) {
            return storageKey;
        }
        String key = storageKey.trim();
        if (key.contains("/uploads/")) {
            return extractStorageKey(key);
        }
        return key.replaceFirst("^/+", "");
    }

    static int clampPercent(int value) {
        return Math.max(0, Math.min(100, value));
    }

    static String detectFileType(String name, String mimeType) {
        String ext = "";
        if (StringUtils.hasText(name) && name.contains(".")) {
            ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        }
        return switch (ext) {
            case "pdf" -> "pdf";
            case "doc", "docx" -> "doc";
            case "xls", "xlsx", "csv" -> "xls";
            case "ppt", "pptx" -> "ppt";
            case "zip", "rar" -> "zip";
            case "txt", "md", "markdown" -> "txt";
            default -> {
                if (StringUtils.hasText(mimeType)) {
                    if (mimeType.contains("pdf")) yield "pdf";
                    if (mimeType.contains("word")) yield "doc";
                    if (mimeType.contains("sheet") || mimeType.contains("excel")) yield "xls";
                    if (mimeType.contains("presentation")) yield "ppt";
                    if (mimeType.contains("zip")) yield "zip";
                    if (mimeType.startsWith("text/")) yield "txt";
                }
                yield "other";
            }
        };
    }
}
