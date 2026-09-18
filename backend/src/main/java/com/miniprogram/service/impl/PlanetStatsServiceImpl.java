package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentComment;
import com.miniprogram.entity.ContentLike;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.ContentCommentMapper;
import com.miniprogram.mapper.ContentLikeMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.PlanetStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanetStatsServiceImpl implements PlanetStatsService {

    /** 赞×3 + 评×5 + 浏览×1 */
    private static final int W_LIKE = 3;
    private static final int W_COMMENT = 5;
    private static final int W_VIEW = 1;

    /** 运营/分段标签，不进「话题」排行 */
    private static final Pattern SYSTEM_TAG = Pattern.compile(
            "置顶|星主|精华|提问|官方|打卡|特约|问答|ask|essence",
            Pattern.CASE_INSENSITIVE);

    private final UserMapper userMapper;
    private final ContentMapper contentMapper;
    private final ContentLikeMapper contentLikeMapper;
    private final ContentCommentMapper contentCommentMapper;
    private final ObjectMapper objectMapper;

    @Override
    public long countActiveMembers() {
        LocalDateTime now = LocalDateTime.now();
        Long n = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .isNotNull(User::getLevelId)
                .and(w -> w.isNull(User::getMemberExpireAt)
                        .or()
                        .gt(User::getMemberExpireAt, now)));
        return n == null ? 0L : n;
    }

    @Override
    public long countTodayPlanetPosts() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Long n = contentMapper.selectCount(planetPublished()
                .and(w -> w.ge(Content::getPublishedAt, start)
                        .or(q -> q.isNull(Content::getPublishedAt).ge(Content::getCreateTime, start))));
        return n == null ? 0L : n;
    }

    @Override
    public long countPlanetPosts() {
        Long n = contentMapper.selectCount(planetPublished());
        return n == null ? 0L : n;
    }

    @Override
    public List<Map<String, Object>> pickHomeTopicItems() {
        List<Map<String, Object>> out = new ArrayList<>();
        Set<Long> used = new LinkedHashSet<>();

        Content hot = first(planetPublished().orderByDesc(Content::getLikeCount).orderByDesc(Content::getId).last("LIMIT 1"));
        addItem(out, used, hot, "热议");

        Content essence = first(planetPublished()
                .eq(Content::getIsEssence, 1)
                .orderByDesc(Content::getPublishedAt)
                .orderByDesc(Content::getId)
                .last("LIMIT 1"));
        if (essence == null || used.contains(essence.getId())) {
            essence = first(planetPublished()
                    .and(w -> w.like(Content::getTags, "精华").or().like(Content::getTags, "essence"))
                    .orderByDesc(Content::getLikeCount)
                    .orderByDesc(Content::getId)
                    .last("LIMIT 1"));
        }
        addItem(out, used, essence, "精华");

        Content ask = first(planetPublished()
                .and(w -> w.like(Content::getTags, "提问")
                        .or().like(Content::getTags, "问答")
                        .or().like(Content::getTags, "ask")
                        .or().like(Content::getTitle, "？"))
                .orderByDesc(Content::getPublishedAt)
                .orderByDesc(Content::getId)
                .last("LIMIT 1"));
        addItem(out, used, ask, "提问");

        if (out.size() < 3) {
            List<Content> latest = contentMapper.selectList(planetPublished()
                    .orderByDesc(Content::getPublishedAt)
                    .orderByDesc(Content::getId)
                    .last("LIMIT 8"));
            String[] tags = {"热议", "精华", "提问"};
            for (Content c : latest) {
                if (out.size() >= 3) break;
                if (c == null || c.getId() == null || used.contains(c.getId())) continue;
                addItem(out, used, c, tags[out.size()]);
            }
        }
        return out;
    }

    @Override
    public List<Map<String, Object>> pickWeeklyHotTopics(String planetId, String defaultPlanetId, int limit) {
        int topN = limit > 0 ? Math.min(limit, 20) : 4;
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime thisWeekStart = monday.atStartOfDay();
        LocalDateTime lastWeekStart = monday.minusWeeks(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        List<Content> contents = contentMapper.selectList(planetPublishedScoped(planetId, defaultPlanetId)
                .isNotNull(Content::getTags)
                .ne(Content::getTags, "")
                .ne(Content::getTags, "[]")
                .select(Content::getId, Content::getTags, Content::getViewCount,
                        Content::getPublishedAt, Content::getCreateTime)
                .last("LIMIT 800"));
        if (contents == null || contents.isEmpty()) {
            return List.of();
        }

        Map<Long, List<String>> contentTags = new HashMap<>();
        Map<Long, Integer> contentViews = new HashMap<>();
        Map<Long, LocalDateTime> contentPublished = new HashMap<>();
        Set<Long> contentIds = new HashSet<>();
        for (Content c : contents) {
            if (c == null || c.getId() == null) continue;
            List<String> tags = topicTags(c.getTags());
            if (tags.isEmpty()) continue;
            contentIds.add(c.getId());
            contentTags.put(c.getId(), tags);
            contentViews.put(c.getId(), c.getViewCount() == null ? 0 : Math.max(0, c.getViewCount()));
            LocalDateTime pub = c.getPublishedAt() != null ? c.getPublishedAt() : c.getCreateTime();
            if (pub != null) contentPublished.put(c.getId(), pub);
        }
        if (contentIds.isEmpty()) {
            return List.of();
        }

        Map<String, Long> thisHeat = new HashMap<>();
        Map<String, Long> lastHeat = new HashMap<>();

        // 赞：按 createTime 落入本周/上周
        List<ContentLike> likes = contentLikeMapper.selectList(new LambdaQueryWrapper<ContentLike>()
                .in(ContentLike::getContentId, contentIds)
                .ge(ContentLike::getCreateTime, lastWeekStart)
                .lt(ContentLike::getCreateTime, now)
                .select(ContentLike::getContentId, ContentLike::getCreateTime));
        if (likes != null) {
            for (ContentLike like : likes) {
                if (like == null || like.getContentId() == null || like.getCreateTime() == null) continue;
                List<String> tags = contentTags.get(like.getContentId());
                if (tags == null || tags.isEmpty()) continue;
                Map<String, Long> bucket = like.getCreateTime().isBefore(thisWeekStart) ? lastHeat : thisHeat;
                addHeat(bucket, tags, W_LIKE);
            }
        }

        // 评
        List<ContentComment> comments = contentCommentMapper.selectList(new LambdaQueryWrapper<ContentComment>()
                .in(ContentComment::getContentId, contentIds)
                .eq(ContentComment::getStatus, 1)
                .ge(ContentComment::getCreateTime, lastWeekStart)
                .lt(ContentComment::getCreateTime, now)
                .select(ContentComment::getContentId, ContentComment::getCreateTime));
        if (comments != null) {
            for (ContentComment comment : comments) {
                if (comment == null || comment.getContentId() == null || comment.getCreateTime() == null) continue;
                List<String> tags = contentTags.get(comment.getContentId());
                if (tags == null || tags.isEmpty()) continue;
                Map<String, Long> bucket = comment.getCreateTime().isBefore(thisWeekStart) ? lastHeat : thisHeat;
                addHeat(bucket, tags, W_COMMENT);
            }
        }

        // 浏览：无独立浏览流水，用「本周/上周新发内容」的 viewCount 近似
        for (Map.Entry<Long, LocalDateTime> e : contentPublished.entrySet()) {
            LocalDateTime pub = e.getValue();
            if (pub == null || pub.isBefore(lastWeekStart) || !pub.isBefore(now)) continue;
            List<String> tags = contentTags.get(e.getKey());
            if (tags == null || tags.isEmpty()) continue;
            long views = contentViews.getOrDefault(e.getKey(), 0);
            if (views <= 0) continue;
            Map<String, Long> bucket = pub.isBefore(thisWeekStart) ? lastHeat : thisHeat;
            addHeat(bucket, tags, views * (long) W_VIEW);
        }

        if (thisHeat.isEmpty()) {
            return List.of();
        }

        List<Map.Entry<String, Long>> ranked = new ArrayList<>(thisHeat.entrySet());
        ranked.sort((a, b) -> {
            int cmp = Long.compare(b.getValue(), a.getValue());
            return cmp != 0 ? cmp : a.getKey().compareTo(b.getKey());
        });
        if (ranked.size() > topN) {
            ranked = ranked.subList(0, topN);
        }

        long maxHeat = ranked.get(0).getValue();
        if (maxHeat <= 0) {
            return List.of();
        }

        List<Map<String, Object>> out = new ArrayList<>(ranked.size());
        for (Map.Entry<String, Long> e : ranked) {
            long heat = e.getValue();
            long prev = lastHeat.getOrDefault(e.getKey(), 0L);
            int width = (int) Math.round(heat * 100.0 / maxHeat);
            width = Math.max(8, Math.min(100, width));
            int changePct;
            if (prev <= 0) {
                changePct = heat > 0 ? 100 : 0;
            } else {
                changePct = (int) Math.round((heat - prev) * 100.0 / prev);
            }
            boolean down = changePct < 0;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", e.getKey());
            row.put("width", width);
            row.put("heat", heat);
            row.put("pct", (down ? "↓ " : "↑ ") + Math.abs(changePct) + "%");
            row.put("down", down);
            out.add(row);
        }
        return out;
    }

    @Override
    public String formatCount(long n) {
        return String.format(Locale.US, "%,d", Math.max(0, n));
    }

    @Override
    public String applyTemplate(String template, long n, String fallback) {
        String tpl = StringUtils.hasText(template) ? template.trim() : fallback;
        if (!StringUtils.hasText(tpl)) {
            tpl = fallback;
        }
        return tpl.replace("{n}", formatCount(n));
    }

    private void addHeat(Map<String, Long> bucket, List<String> tags, long delta) {
        if (delta <= 0 || tags == null) return;
        for (String tag : tags) {
            bucket.merge(tag, delta, Long::sum);
        }
    }

    private List<String> topicTags(String tagsJson) {
        List<String> raw = parseTags(tagsJson);
        if (raw.isEmpty()) return List.of();
        LinkedHashSet<String> out = new LinkedHashSet<>();
        for (String t : raw) {
            if (!StringUtils.hasText(t)) continue;
            String name = t.trim();
            if (name.startsWith("#")) name = name.substring(1).trim();
            if (!StringUtils.hasText(name) || SYSTEM_TAG.matcher(name).find()) continue;
            out.add(name);
        }
        return new ArrayList<>(out);
    }

    private List<String> parseTags(String tagsJson) {
        if (!StringUtils.hasText(tagsJson)) return List.of();
        try {
            List<String> list = objectMapper.readValue(tagsJson, new TypeReference<List<String>>() {});
            return list == null ? List.of() : list;
        } catch (Exception e) {
            // 兼容逗号分隔
            String[] parts = tagsJson.replace("[", "").replace("]", "").replace("\"", "").split("[,，]");
            List<String> out = new ArrayList<>();
            for (String p : parts) {
                if (StringUtils.hasText(p)) out.add(p.trim());
            }
            return out;
        }
    }

    private LambdaQueryWrapper<Content> planetPublished() {
        return new LambdaQueryWrapper<Content>()
                .eq(Content::getStatus, "published")
                .eq(Content::getPlanetExclusive, 1);
    }

    private LambdaQueryWrapper<Content> planetPublishedScoped(String planetId, String defaultPlanetId) {
        LambdaQueryWrapper<Content> w = planetPublished();
        if (!StringUtils.hasText(planetId)) {
            return w;
        }
        String id = planetId.trim();
        String def = StringUtils.hasText(defaultPlanetId) ? defaultPlanetId.trim() : "";
        if (id.equals(def) || !StringUtils.hasText(def)) {
            w.and(q -> q.eq(Content::getPlanetId, id)
                    .or().isNull(Content::getPlanetId)
                    .or().eq(Content::getPlanetId, ""));
        } else {
            w.eq(Content::getPlanetId, id);
        }
        return w;
    }

    private Content first(LambdaQueryWrapper<Content> q) {
        List<Content> list = contentMapper.selectList(q);
        return list == null || list.isEmpty() ? null : list.get(0);
    }

    private void addItem(List<Map<String, Object>> out, Set<Long> used, Content c, String tag) {
        if (c == null || c.getId() == null || used.contains(c.getId())) return;
        String text = displayText(c);
        if (!StringUtils.hasText(text)) return;
        used.add(c.getId());
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tag", tag);
        row.put("text", text);
        row.put("contentId", c.getId());
        out.add(row);
    }

    private String displayText(Content c) {
        if (StringUtils.hasText(c.getTitle())) {
            return trimLen(c.getTitle().trim(), 40);
        }
        if (StringUtils.hasText(c.getSummary())) {
            return trimLen(c.getSummary().replaceAll("\\s+", " ").trim(), 40);
        }
        if (StringUtils.hasText(c.getContent())) {
            String plain = c.getContent().replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
            return trimLen(plain, 40);
        }
        return "";
    }

    private String trimLen(String s, int max) {
        if (s.length() <= max) return s;
        return s.substring(0, max - 1) + "…";
    }
}
