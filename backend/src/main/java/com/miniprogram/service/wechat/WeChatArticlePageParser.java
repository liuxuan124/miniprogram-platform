package com.miniprogram.service.wechat;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.wechat.ParsedWeChatArticle;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 抓取并解析微信公众号公开文章页（Mobile UA）
 */
@Slf4j
@Component
public class WeChatArticlePageParser {

    private static final String USER_AGENT =
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                    + "(KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50";

    private static final Pattern WECHAT_ARTICLE_URL = Pattern.compile(
            "(https?://mp\\.weixin\\.qq\\.com/s/[\\w\\-]+(?:\\?[^\\s#]*)?)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern JS_CONTENT_START = Pattern.compile(
            "<div[^>]+id=[\"']js_content[\"'][^>]*>",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern MSG_TITLE = Pattern.compile(
            "var\\s+msg_title\\s*=\\s*[\"'](.*?)[\"']\\s*;",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private static final Pattern CT_TIME = Pattern.compile(
            "var\\s+ct\\s*=\\s*[\"']?(\\d{10})[\"']?\\s*;",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    public String normalizeUrl(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "文章链接不能为空");
        }
        Matcher matcher = WECHAT_ARTICLE_URL.matcher(raw.trim());
        if (!matcher.find()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "无效的公众号文章链接: " + raw.trim());
        }
        String url = matcher.group(1);
        int hash = url.indexOf('#');
        return hash >= 0 ? url.substring(0, hash) : url;
    }

    public String extractSlug(String url) {
        try {
            String path = URI.create(url).getPath();
            if (!StringUtils.hasText(path)) {
                return String.valueOf(Math.abs(url.hashCode()));
            }
            String[] parts = path.split("/");
            for (int i = parts.length - 1; i >= 0; i--) {
                if (StringUtils.hasText(parts[i])) {
                    return parts[i].trim();
                }
            }
        } catch (Exception e) {
            log.debug("解析链接 slug 失败: {}", e.getMessage());
        }
        return String.valueOf(Math.abs(url.hashCode()));
    }

    public ParsedWeChatArticle fetchAndParse(String rawUrl) {
        String url = normalizeUrl(rawUrl);
        log.info("抓取公众号文章: {}", url);

        HttpResponse response = HttpRequest.get(url)
                .timeout(30_000)
                .setFollowRedirects(true)
                .setMaxRedirectCount(8)
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml")
                .header("Accept-Language", "zh-CN,zh;q=0.9")
                .header("Referer", "https://mp.weixin.qq.com/")
                .execute();

        if (!response.isOk()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID,
                    "无法访问文章链接，HTTP " + response.getStatus()
                            + (StringUtils.hasText(response.header("Location"))
                            ? " → " + response.header("Location") : ""));
        }

        String html = response.body();
        if (!StringUtils.hasText(html)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "文章页面为空");
        }
        if (html.contains("环境异常") || html.contains("secitptpage") || html.contains("验证码")) {
            throw new BusinessException(ErrorCode.PARAM_INVALID,
                    "微信返回验证页，请稍后重试或在微信内打开链接");
        }

        String title = firstNonBlank(
                extractMeta(html, "og:title"),
                extractVar(MSG_TITLE, html),
                extractTagText(html, "activity-name"));
        if (!StringUtils.hasText(title)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "未能解析文章标题");
        }
        title = decodeHtml(title).replaceAll("\\s+", " ").trim();

        String contentHtml = extractJsContent(html);
        if (!StringUtils.hasText(contentHtml)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "未能解析文章正文");
        }

        String author = decodeHtml(firstNonBlank(
                extractMeta(html, "og:article:author"),
                extractVar(Pattern.compile("var\\s+nickname\\s*=\\s*[\"'](.*?)[\"']\\s*;", Pattern.CASE_INSENSITIVE | Pattern.DOTALL), html),
                "墨太白"));

        String cover = decodeHtml(extractMeta(html, "og:image"));
        LocalDateTime publishedAt = parsePublishTime(extractVar(CT_TIME, html));

        return ParsedWeChatArticle.builder()
                .sourceUrl(url)
                .slug(extractSlug(url))
                .title(title)
                .author(author)
                .coverImageUrl(cover)
                .contentHtml(contentHtml.trim())
                .publishedAt(publishedAt)
                .build();
    }

    private String extractJsContent(String html) {
        Matcher start = JS_CONTENT_START.matcher(html);
        if (!start.find()) {
            return "";
        }
        int contentStart = start.end();
        String lower = html.toLowerCase();
        int pos = contentStart;
        int depth = 1;
        while (pos < html.length() && depth > 0) {
            int nextOpen = lower.indexOf("<div", pos);
            int nextClose = lower.indexOf("</div>", pos);
            if (nextClose == -1) {
                break;
            }
            if (nextOpen != -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 4;
            } else {
                depth--;
                if (depth == 0) {
                    return html.substring(contentStart, nextClose);
                }
                pos = nextClose + 6;
            }
        }
        return "";
    }

    private String extractMeta(String html, String property) {
        Pattern forward = Pattern.compile(
                "<meta[^>]+property=[\"']" + Pattern.quote(property) + "[\"'][^>]+content=[\"']([^\"']+)[\"']",
                Pattern.CASE_INSENSITIVE);
        Pattern backward = Pattern.compile(
                "<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']" + Pattern.quote(property) + "[\"']",
                Pattern.CASE_INSENSITIVE);
        Matcher m1 = forward.matcher(html);
        if (m1.find()) {
            return m1.group(1);
        }
        Matcher m2 = backward.matcher(html);
        if (m2.find()) {
            return m2.group(1);
        }
        return "";
    }

    private String extractVar(Pattern pattern, String html) {
        Matcher matcher = pattern.matcher(html);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String extractTagText(String html, String id) {
        Pattern pattern = Pattern.compile(
                "<[^>]+id=[\"']" + Pattern.quote(id) + "[\"'][^>]*>(.*?)</[^>]+>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher matcher = pattern.matcher(html);
        if (!matcher.find()) {
            return "";
        }
        return HTML_TAG.matcher(matcher.group(1)).replaceAll("").trim();
    }

    private LocalDateTime parsePublishTime(String epochSeconds) {
        if (!StringUtils.hasText(epochSeconds)) {
            return null;
        }
        try {
            long sec = Long.parseLong(epochSeconds.trim());
            if (sec <= 0) {
                return null;
            }
            return LocalDateTime.ofInstant(Instant.ofEpochSecond(sec), ZoneId.systemDefault());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private String decodeHtml(String input) {
        if (!StringUtils.hasText(input)) {
            return "";
        }
        return input
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&nbsp;", " ");
    }
}
