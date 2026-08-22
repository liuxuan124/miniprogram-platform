package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentCommentDTO;
import com.miniprogram.dto.ContentInteractStateDTO;

import java.util.List;

public interface ContentInteractService {
    ContentInteractStateDTO getState(Long contentId, Long userId);

    ContentInteractStateDTO toggleLike(Long contentId, Long userId);

    ContentInteractStateDTO toggleFavorite(Long contentId, Long userId);

    List<ContentCommentDTO> listComments(Long contentId);

    ContentCommentDTO addComment(Long contentId, Long userId, String nickname, String avatar, String content);

    PageResult<ContentCommentDTO> adminListComments(Long contentId, Integer status, long current, long size);

    void adminUpdateCommentStatus(Long commentId, Integer status);

    void adminDeleteComment(Long commentId);
}
