package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentCommentDTO;
import com.miniprogram.dto.ContentInteractStateDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentComment;
import com.miniprogram.entity.ContentFavorite;
import com.miniprogram.entity.ContentLike;
import com.miniprogram.mapper.ContentCommentMapper;
import com.miniprogram.mapper.ContentFavoriteMapper;
import com.miniprogram.mapper.ContentLikeMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.service.ContentInteractService;
import com.miniprogram.service.WxMiniappTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentInteractServiceImpl implements ContentInteractService {

    private final ContentMapper contentMapper;
    private final ContentLikeMapper likeMapper;
    private final ContentFavoriteMapper favoriteMapper;
    private final ContentCommentMapper commentMapper;
    private final WxMiniappTokenService wxMiniappTokenService;
    private final RestTemplate restTemplate;

    @Override
    public ContentInteractStateDTO getState(Long contentId, Long userId) {
        Content content = requirePublished(contentId);
        ContentInteractStateDTO dto = baseState(content);
        if (userId != null && userId > 0) {
            dto.setLiked(likeMapper.selectCount(new LambdaQueryWrapper<ContentLike>()
                    .eq(ContentLike::getContentId, contentId)
                    .eq(ContentLike::getUserId, userId)) > 0);
            dto.setFavorited(favoriteMapper.selectCount(new LambdaQueryWrapper<ContentFavorite>()
                    .eq(ContentFavorite::getContentId, contentId)
                    .eq(ContentFavorite::getUserId, userId)) > 0);
        } else {
            dto.setLiked(false);
            dto.setFavorited(false);
        }
        dto.setCommentCount(commentCount(contentId));
        return dto;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentInteractStateDTO toggleLike(Long contentId, Long userId) {
        requirePublished(contentId);
        ContentLike existing = likeMapper.selectOne(new LambdaQueryWrapper<ContentLike>()
                .eq(ContentLike::getContentId, contentId)
                .eq(ContentLike::getUserId, userId)
                .last("LIMIT 1"));
        if (existing != null) {
            likeMapper.deleteById(existing.getId());
            contentMapper.adjustLikeCount(contentId, -1);
        } else {
            ContentLike row = new ContentLike();
            row.setContentId(contentId);
            row.setUserId(userId);
            row.setCreateTime(LocalDateTime.now());
            likeMapper.insert(row);
            contentMapper.adjustLikeCount(contentId, 1);
        }
        return getState(contentId, userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentInteractStateDTO toggleFavorite(Long contentId, Long userId) {
        requirePublished(contentId);
        ContentFavorite existing = favoriteMapper.selectOne(new LambdaQueryWrapper<ContentFavorite>()
                .eq(ContentFavorite::getContentId, contentId)
                .eq(ContentFavorite::getUserId, userId)
                .last("LIMIT 1"));
        if (existing != null) {
            favoriteMapper.deleteById(existing.getId());
            contentMapper.adjustFavoriteCount(contentId, -1);
        } else {
            ContentFavorite row = new ContentFavorite();
            row.setContentId(contentId);
            row.setUserId(userId);
            row.setCreateTime(LocalDateTime.now());
            favoriteMapper.insert(row);
            contentMapper.adjustFavoriteCount(contentId, 1);
        }
        return getState(contentId, userId);
    }

    @Override
    public List<ContentCommentDTO> listComments(Long contentId) {
        requirePublished(contentId);
        return commentMapper.selectList(new LambdaQueryWrapper<ContentComment>()
                        .eq(ContentComment::getContentId, contentId)
                        .eq(ContentComment::getStatus, 1)
                        .orderByDesc(ContentComment::getCreateTime)
                        .last("LIMIT 100"))
                .stream()
                .map(this::toCommentDTO)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentCommentDTO addComment(Long contentId, Long userId, String nickname, String avatar, String contentText) {
        requirePublished(contentId);
        if (!StringUtils.hasText(contentText) || contentText.trim().length() > 500) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "评论内容不能为空且不超过500字");
        }
        String text = contentText.trim();
        assertMsgSecOk(text);

        ContentComment row = new ContentComment();
        row.setContentId(contentId);
        row.setUserId(userId);
        row.setNickname(StringUtils.hasText(nickname) ? nickname.trim() : "微信用户");
        row.setAvatar(avatar);
        row.setContent(text);
        // 默认隐藏，后台审核通过后再展示
        row.setStatus(0);
        row.setCreateTime(LocalDateTime.now());
        row.setUpdateTime(LocalDateTime.now());
        row.setDeleted(0);
        commentMapper.insert(row);
        return toCommentDTO(row);
    }

    @Override
    public PageResult<ContentCommentDTO> adminListComments(Long contentId, Integer status, long current, long size) {
        LambdaQueryWrapper<ContentComment> q = new LambdaQueryWrapper<ContentComment>()
                .eq(contentId != null, ContentComment::getContentId, contentId)
                .eq(status != null, ContentComment::getStatus, status)
                .orderByDesc(ContentComment::getCreateTime);
        Page<ContentComment> page = commentMapper.selectPage(new Page<>(current, size), q);
        List<ContentCommentDTO> records = page.getRecords().stream().map(this::toCommentDTO).toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adminUpdateCommentStatus(Long commentId, Integer status) {
        if (status == null || (status != 0 && status != 1)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "状态仅支持 0/1");
        }
        ContentComment row = commentMapper.selectById(commentId);
        if (row == null) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "评论不存在");
        }
        row.setStatus(status);
        row.setUpdateTime(LocalDateTime.now());
        commentMapper.updateById(row);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adminDeleteComment(Long commentId) {
        ContentComment row = commentMapper.selectById(commentId);
        if (row == null) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "评论不存在");
        }
        commentMapper.deleteById(commentId);
    }

    @SuppressWarnings("unchecked")
    private void assertMsgSecOk(String content) {
        try {
            String token = wxMiniappTokenService.getAccessToken();
            String url = "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + token;
            Map<String, Object> body = new HashMap<>();
            body.put("content", content);
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, body, Map.class);
            Map<?, ?> json = resp.getBody();
            if (json == null) return;
            Object err = json.get("errcode");
            int code = err == null ? 0 : Integer.parseInt(String.valueOf(err));
            if (code == 87014) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "评论含有违规内容");
            }
            if (code != 0) {
                log.warn("msgSecCheck 返回 errcode={}，评论仍将待审", code);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("msgSecCheck 调用失败，评论将待审: {}", e.getMessage());
        }
    }

    private Content requirePublished(Long contentId) {
        Content content = contentMapper.selectById(contentId);
        if (content == null || !"published".equals(content.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        return content;
    }

    private ContentInteractStateDTO baseState(Content content) {
        ContentInteractStateDTO dto = new ContentInteractStateDTO();
        dto.setLikeCount(content.getLikeCount() == null ? 0 : content.getLikeCount());
        dto.setFavoriteCount(content.getFavoriteCount() == null ? 0 : content.getFavoriteCount());
        return dto;
    }

    private long commentCount(Long contentId) {
        return commentMapper.selectCount(new LambdaQueryWrapper<ContentComment>()
                .eq(ContentComment::getContentId, contentId)
                .eq(ContentComment::getStatus, 1));
    }

    private ContentCommentDTO toCommentDTO(ContentComment row) {
        ContentCommentDTO dto = new ContentCommentDTO();
        BeanUtils.copyProperties(row, dto);
        return dto;
    }
}
