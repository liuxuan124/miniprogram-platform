package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.dto.wechat.WeChatUrlImportRequestDTO;
import com.miniprogram.service.WeChatOfficialAccountContentSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 微信公众号管理
 */
@Tag(name = "微信公众号", description = "公众号内容同步")
@RestController
@RequestMapping("/api/v1/admin/wechat/official-account")
@RequiredArgsConstructor
public class WeChatOfficialAccountController {

    private final WeChatOfficialAccountContentSyncService contentSyncService;

    @Operation(summary = "全量同步已发布图文", description = "从公众号拉取全部已发布图文并导入内容库；syncScope 可选 all/newspic/news")
    @PostMapping("/sync-published")
    @PreAuthorize("hasAuthority('content:update')")
    public R<WeChatContentSyncResultVO> syncPublished(@RequestBody(required = false) WeChatContentSyncRequestDTO request) {
        return R.ok(contentSyncService.syncAllPublished(request));
    }

    @Operation(summary = "公众号链接导入", description = "粘贴 mp.weixin.qq.com/s/... 链接批量导入长文，适用于 API 无法拉取的历史文章")
    @PostMapping("/import-urls")
    @PreAuthorize("hasAuthority('content:create') or hasAuthority('content:update')")
    public R<WeChatContentSyncResultVO> importUrls(@RequestBody WeChatUrlImportRequestDTO request) {
        return R.ok(contentSyncService.importFromUrls(request));
    }
}
