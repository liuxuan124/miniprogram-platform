package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.ImCannedReply;
import com.miniprogram.mapper.ImCannedReplyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 客服快捷话术库。内置话术不可删（只能改），避免误删导致必答项缺失。 */
@Service
@RequiredArgsConstructor
public class ImCannedReplyService {

    private final ImCannedReplyMapper mapper;

    public static final String GROUP_WELCOME = "welcome";
    public static final String GROUP_SHIPPING = "shipping";
    public static final String GROUP_AFTER_SALE = "after_sale";
    public static final String GROUP_OTHER = "other";

    public List<Map<String, Object>> list(String group, String keyword) {
        LambdaQueryWrapper<ImCannedReply> w = new LambdaQueryWrapper<ImCannedReply>()
                .eq(ImCannedReply::getEnabled, 1)
                .orderByAsc(ImCannedReply::getSortNo)
                .orderByDesc(ImCannedReply::getId);
        if (StringUtils.hasText(group)) {
            w.eq(ImCannedReply::getGroupCode, group.trim());
        }
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            w.and(x -> x.like(ImCannedReply::getTitle, kw).or().like(ImCannedReply::getContent, kw));
        }
        List<ImCannedReply> rows = mapper.selectList(w);
        List<Map<String, Object>> out = new ArrayList<>();
        for (ImCannedReply r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("groupCode", r.getGroupCode());
            m.put("groupLabel", groupLabel(r.getGroupCode()));
            m.put("title", r.getTitle());
            m.put("content", r.getContent());
            m.put("builtin", r.getBuiltin() != null && r.getBuiltin() == 1);
            m.put("sortNo", r.getSortNo());
            out.add(m);
        }
        return out;
    }

    @Transactional
    public ImCannedReply create(Map<String, Object> body) {
        String title = str(body.get("title"));
        String content = str(body.get("content"));
        if (!StringUtils.hasText(title)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "话术标题必填");
        }
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "话术内容必填");
        }
        ImCannedReply row = new ImCannedReply();
        row.setGroupCode(StringUtils.hasText(str(body.get("groupCode"))) ? str(body.get("groupCode")) : GROUP_OTHER);
        row.setTitle(title.trim());
        row.setContent(content.trim());
        row.setBuiltin(0);
        row.setSortNo(intOr(body.get("sortNo"), 100));
        row.setEnabled(1);
        mapper.insert(row);
        return row;
    }

    @Transactional
    public void update(Long id, Map<String, Object> body) {
        ImCannedReply row = mapper.selectById(id);
        if (row == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "话术不存在");
        }
        if (StringUtils.hasText(str(body.get("title")))) {
            row.setTitle(str(body.get("title")).trim());
        }
        if (StringUtils.hasText(str(body.get("content")))) {
            row.setContent(str(body.get("content")).trim());
        }
        if (StringUtils.hasText(str(body.get("groupCode")))) {
            row.setGroupCode(str(body.get("groupCode")));
        }
        if (body.get("enabled") != null) {
            row.setEnabled(boolOr(body.get("enabled")) ? 1 : 0);
        }
        if (body.get("sortNo") != null) {
            row.setSortNo(intOr(body.get("sortNo"), row.getSortNo()));
        }
        mapper.updateById(row);
    }

    @Transactional
    public void delete(Long id) {
        ImCannedReply row = mapper.selectById(id);
        if (row == null) {
            return;
        }
        if (row.getBuiltin() != null && row.getBuiltin() == 1) {
            // 内置话术不物理删，只停用 —— 停用后客服仍可在「常用语」看到历史
            row.setEnabled(0);
            mapper.updateById(row);
            return;
        }
        mapper.deleteById(id);
    }

    private String groupLabel(String code) {
        if (GROUP_WELCOME.equals(code)) return "欢迎语";
        if (GROUP_SHIPPING.equals(code)) return "发货时效";
        if (GROUP_AFTER_SALE.equals(code)) return "售后政策";
        return "常用语";
    }

    private String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private int intOr(Object v, int fallback) {
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return v == null ? fallback : Integer.parseInt(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private boolean boolOr(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        return v != null && ("1".equals(String.valueOf(v)) || "true".equalsIgnoreCase(String.valueOf(v)));
    }
}
