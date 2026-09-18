package com.miniprogram.service;

import java.util.List;
import java.util.Map;

/**
 * 星球首页卡片 / KPI 真统计
 */
public interface PlanetStatsService {

    /** 有效付费会员（levelId 有值且未过期；expire 为空视为终身） */
    long countActiveMembers();

    /** 今日发布的星球专属内容条数 */
    long countTodayPlanetPosts();

    /** 全部已发布星球专属内容 */
    long countPlanetPosts();

    /**
     * 首页三条：热议 / 精华 / 提问（不足用最新补齐）
     * 每项含 tag、text
     */
    List<Map<String, Object>> pickHomeTopicItems();

    /**
     * 本周热门话题 TopN（按标签聚合本周互动热度，对比上周涨跌）
     * 每项含 name / width / pct / down；无数据返回空列表
     *
     * @param planetId        当前星球 communities.id
     * @param defaultPlanetId 配置 primary（历史无 planet_id 的内容归入此池）
     * @param limit           最多条数，建议 4
     */
    List<Map<String, Object>> pickWeeklyHotTopics(String planetId, String defaultPlanetId, int limit);

    /** 千分位 */
    String formatCount(long n);

    String applyTemplate(String template, long n, String fallback);
}
