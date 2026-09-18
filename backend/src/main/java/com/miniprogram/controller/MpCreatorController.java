package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.entity.CreatorApplication;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.CreatorApplicationMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "小程序-创作者申请")
@RestController
@RequestMapping("/api/v1/mp/creator")
@RequiredArgsConstructor
public class MpCreatorController {

    private final CreatorApplicationMapper creatorApplicationMapper;
    private final ContentService contentService;
    private final UserMapper userMapper;

    @GetMapping("/me")
    @Operation(summary = "我的创作者申请状态")
    public R<Map<String, Object>> me() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> vo = new HashMap<>();
        if (userId == null) {
            vo.put("status", "none");
            vo.put("approved", false);
            vo.put("canPublish", false);
            return R.ok(vo);
        }

        User user = userMapper.selectById(userId);
        boolean roleOk = user != null && StringUtils.hasText(user.getCreatorRole())
                && !"none".equalsIgnoreCase(user.getCreatorRole())
                && !"user".equalsIgnoreCase(user.getCreatorRole());

        CreatorApplication latest = creatorApplicationMapper.selectOne(
                new LambdaQueryWrapper<CreatorApplication>()
                        .eq(CreatorApplication::getUserId, userId)
                        .orderByDesc(CreatorApplication::getCreatedAt)
                        .last("LIMIT 1")
        );

        String status = "none";
        if (roleOk) {
            status = "approved";
        } else if (latest != null && StringUtils.hasText(latest.getStatus())) {
            status = latest.getStatus().toLowerCase();
        }

        boolean approved = roleOk || "approved".equals(status) || "passed".equals(status);
        vo.put("status", status);
        vo.put("approved", approved);
        vo.put("canPublish", approved);
        if (latest != null) {
            vo.put("rejectReason", latest.getRejectReason());
            vo.put("name", latest.getName());
            vo.put("intro", latest.getIntro());
        }
        return R.ok(vo);
    }

    @PostMapping("/apply")
    @Operation(summary = "提交创作者申请")
    public R<Map<String, Object>> apply(@RequestBody Map<String, Object> body) {
        String name = body != null && body.get("name") != null ? String.valueOf(body.get("name")).trim() : "";
        String contact = body != null && body.get("contact") != null ? String.valueOf(body.get("contact")).trim() : "";
        String intro = body != null && body.get("intro") != null ? String.valueOf(body.get("intro")).trim() : "";

        if (!StringUtils.hasText(name) || !StringUtils.hasText(contact)) {
            throw new BusinessException(400001, "请填写昵称与联系方式");
        }
        if (name.length() > 64) {
            throw new BusinessException(400001, "昵称过长");
        }
        if (contact.length() > 128) {
            throw new BusinessException(400001, "联系方式过长");
        }
        if (intro.length() > 1000) {
            intro = intro.substring(0, 1000);
        }

        CreatorApplication row = new CreatorApplication();
        row.setUserId(SecurityUtils.getCurrentUserId());
        row.setName(name);
        row.setContact(contact);
        row.setIntro(intro);
        row.setStatus("pending");
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        creatorApplicationMapper.insert(row);

        Map<String, Object> vo = new HashMap<>();
        vo.put("id", row.getId());
        vo.put("status", row.getStatus());
        return R.ok(vo);
    }

    @PostMapping("/contents")
    @Operation(summary = "创作者投稿（进入人工审核）")
    public R<Map<String, Object>> submitContent(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(401001, "请先登录");
        }
        String title = body != null && body.get("title") != null ? String.valueOf(body.get("title")).trim() : "";
        String content = body != null && body.get("content") != null ? String.valueOf(body.get("content")).trim() : "";
        String contentType = body != null && body.get("contentType") != null
                ? String.valueOf(body.get("contentType")).trim() : "note";
        if (!StringUtils.hasText(title) && !StringUtils.hasText(content)) {
            throw new BusinessException(400001, "请填写标题或正文");
        }
        if (!StringUtils.hasText(title)) {
            title = content.length() > 40 ? content.substring(0, 40) : content;
        }
        if (!List.of("article", "note", "moment").contains(contentType)) {
            contentType = "note";
        }

        List<String> images = new ArrayList<>();
        if (body != null && body.get("images") instanceof List<?> raw) {
            for (Object o : raw) {
                if (o == null) continue;
                String u = String.valueOf(o).trim();
                if (StringUtils.hasText(u) && (u.startsWith("http") || u.startsWith("/uploads/"))) {
                    images.add(u);
                }
            }
        }

        boolean syncPlanet = body != null && Boolean.TRUE.equals(body.get("syncPlanet"));
        boolean memberOnly = body != null && Boolean.TRUE.equals(body.get("memberOnly"));

        ContentDTO dto = new ContentDTO();
        dto.setTitle(title);
        dto.setContent(content);
        dto.setContentType(contentType);
        dto.setImages(images);
        dto.setAuditStatus("pending");
        dto.setAuthorRole("creator");
        dto.setSource("ugc");
        dto.setVisibility(memberOnly ? "member_only" : "public");
        dto.setPlanetExclusive(syncPlanet ? 1 : 0);
        if (body != null && body.get("tags") instanceof List<?> tags) {
            List<String> tagList = new ArrayList<>();
            for (Object t : tags) {
                if (t != null && StringUtils.hasText(String.valueOf(t))) {
                    tagList.add(String.valueOf(t).trim());
                }
            }
            dto.setTags(tagList);
        }

        ContentDetailDTO created = contentService.createContent(dto);
        Map<String, Object> vo = new HashMap<>();
        vo.put("id", created.getId());
        vo.put("auditStatus", created.getAuditStatus());
        vo.put("status", created.getStatus());
        return R.ok(vo);
    }
}
