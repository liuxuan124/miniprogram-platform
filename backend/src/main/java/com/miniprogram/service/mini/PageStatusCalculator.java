package com.miniprogram.service.mini;

/**
 * 统一页面状态计算（前后端语义一致）。
 * <p>
 * draft=从未发布；pending=已发布且有未上线改动；live=已上线且一致；
 * offline=下架；archived=归档（优先）。
 */
public final class PageStatusCalculator {

    private PageStatusCalculator() {
    }

    /**
     * @param pageStatus     库表 status：0草稿 1已发布 2已下架
     * @param currentVersion 已上线版本号（page.current_version）
     * @param latestVersion  最新草稿/版本号
     * @param archived       true 表示归档
     */
    public static String calculate(Integer pageStatus, Integer currentVersion,
                                   Integer latestVersion, boolean archived) {
        if (archived) {
            return "archived";
        }
        int status = pageStatus != null ? pageStatus : 0;
        int current = currentVersion != null ? currentVersion : 0;
        int latest = latestVersion != null ? latestVersion : 0;

        if (status == 2) {
            return "offline";
        }
        // 从未真正上线过
        if (status != 1 || current <= 0) {
            return "draft";
        }
        if (latest > current) {
            return "pending";
        }
        return "live";
    }

    public static String calculate(Integer pageStatus, Integer currentVersion,
                                   Integer latestVersion, Integer archivedFlag) {
        return calculate(pageStatus, currentVersion, latestVersion,
                archivedFlag != null && archivedFlag == 1);
    }
}
