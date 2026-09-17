package com.miniprogram.service.pageai;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 装修器真实组件清单（与 admin {@code ComponentType} / {@code componentRegistry} 对齐）。
 * 缺口检查只对照这里，不假装能搭出未注册组件。
 */
public final class PageBuilderComponentCatalog {

    public record Def(
            String type,
            String label,
            String category,
            String dataNeed,
            String apiPath,
            Set<String> aliases,
            Set<String> propKeys,
            Set<String> styleKeys,
            Set<String> interactions,
            Set<String> unsupported
    ) {
        public String catalogLine() {
            return type + " " + label + " aliases=" + String.join("/", aliases);
        }
    }

    private static final Map<String, Def> BY_TYPE = new LinkedHashMap<>();

    static {
        add("search", "搜索组件", "commerce", "none", null,
                "搜索,search,检索",
                "placeholder,scope", "margin_left,margin_right", "tap,input", "");
        add("notice_bar", "公告栏", "content", "none", null,
                "公告,notice,跑马灯,通知条",
                "text,speed,link_url", "margin_left,margin_right", "tap,marquee", "视频公告");
        add("category_nav", "分类导航", "commerce", "none", null,
                "分类导航,类目,category",
                "items,columns", "margin_left,margin_right", "tap", "3d,悬浮磁贴");
        add("banner", "轮播图", "content", "none", null,
                "轮播,banner,大图,海报,首屏图",
                "images,autoplay,interval,indicator_dots", "margin_left,margin_right,border_radius",
                "swipe,tap,autoplay", "3d,视差,parallax,视频轮播,webgl");
        add("image", "图片", "content", "none", null,
                "单图,图片,海报图",
                "image,aspect_ratio,link_type,link_url", "margin_left,margin_right", "tap", "热区,3d");
        add("nav", "导航栏", "content", "none", null,
                "导航,金刚区,宫格,快捷入口",
                "items,columns", "margin_left,margin_right", "tap", "3d图标");
        add("product_list", "商品列表", "commerce", "product", "/api/v1/mp/products",
                "商品,货架,好物,商城,product,goods,sku",
                "title,layout,columns,limit,show_price,data_source", "margin_left,margin_right",
                "tap,scroll", "3d,ar,试衣,直播带货,沉浸货架");
        add("flash_sale", "限时秒杀", "commerce", "product", "/api/v1/mp/products",
                "秒杀,限时购,flash",
                "title,limit,countdown,end_time", "margin_left,margin_right,border_radius",
                "tap,countdown", "直播秒杀");
        add("article_list", "文章列表", "content", "content", "/api/v1/mp/contents",
                "文章列表,资讯列表",
                "title,layout,limit,data_source", "margin_left,margin_right", "tap", "沉浸阅读器");
        add("article_feed", "文章流", "content", "content", "/api/v1/mp/contents",
                "文章,资讯,内容流,feed,干货",
                "layout,page_size,show_cover,data_source", "margin_left,margin_right,border_radius",
                "tap,scroll", "无限视频流");
        add("note_feed", "笔记瀑布流", "content", "content", "/api/v1/mp/contents",
                "笔记,瀑布流,种草",
                "page_size,show_category_tabs,data_source", "margin_left,margin_right,border_radius",
                "tap,scroll", "双列视频");
        add("moments_feed", "动态时间线", "content", "content", "/api/v1/mp/contents",
                "动态,朋友圈,时间线,moment",
                "page_size,show_author,data_source", "margin_left,margin_right,border_radius",
                "tap,like", "实时弹幕");
        add("hot_news", "今日热门资讯", "content", "content", "/api/v1/mp/contents",
                "热门,头条,新闻,hot",
                "title,layout,limit,data_source", "margin_left,margin_right", "tap", "");
        add("activity_entry", "活动入口", "marketing", "activity", "/api/v1/mp/activities",
                "活动入口,报名入口",
                "title,image,link_url,data_source", "margin_left,margin_right", "tap", "");
        add("activity_list", "活动列表", "marketing", "activity", "/api/v1/mp/activities",
                "活动,报名,场次,activity",
                "title,limit,data_source", "margin_left,margin_right", "tap", "地图找活动");
        add("appointment_service", "预约服务", "marketing", "appointment", "/api/v1/mp/appointment-services",
                "预约,到店,排期,appointment",
                "title,limit,data_source", "margin_left,margin_right", "tap,book", "日历拖拽");
        add("member_card", "会员卡", "marketing", "member", "/api/v1/mp/member/info",
                "会员,会员卡,积分卡",
                "title,button_text", "margin_left,margin_right", "tap", "实体卡翻转");
        add("coupon", "优惠券", "commerce", "coupon", "/api/v1/mp/coupons",
                "优惠券,领券,折扣券,coupon",
                "title,limit,layout,button_text,data_source", "margin_left,margin_right,border_radius",
                "tap,claim", "游戏化抽券");
        add("video", "视频", "content", "none", null,
                "视频,短片,video",
                "title,src,poster,autoplay", "margin_left,margin_right,border_radius",
                "play,tap", "直播,live,弹幕,360");
        add("brand_intro", "品牌介绍", "content", "none", null,
                "品牌介绍,关于我们,品牌故事",
                "title,content,image", "margin_left,margin_right", "tap", "");
        add("image_text", "图文组合", "content", "none", null,
                "图文,左右图文,介绍卡",
                "title,layout,content,image", "margin_left,margin_right", "tap", "");
        add("contact_info", "联系方式", "content", "none", null,
                "联系,电话,地址,客服",
                "phone,wechat,address", "margin_left,margin_right", "tap,call", "地图选点,导航");
        add("certificate", "资质证书", "content", "none", null,
                "资质,证书,牌照",
                "title,items", "margin_left,margin_right", "tap,preview", "");
        add("countdown", "倒计时", "marketing", "none", null,
                "倒计时,开售倒计时",
                "title,end_time", "margin_left,margin_right", "countdown", "");
        add("float_button", "悬浮按钮", "layout", "none", null,
                "悬浮,客服按钮,回到顶部",
                "text,icon,link_url", "", "tap", "拖拽吸附");
        add("rich_text", "富文本", "content", "none", null,
                "富文本,文案,说明,正文",
                "content", "margin_left,margin_right", "", "");
        add("section_title", "分区标题", "content", "none", null,
                "标题,分区,栏目标题",
                "title,subtitle,align,show_more", "", "", "");
        add("divider", "分割线", "layout", "none", null,
                "分割线,分隔",
                "style,color,thickness,margin", "", "", "");
        add("spacer", "间距", "layout", "none", null,
                "间距,留白,空白",
                "height", "", "", "");
        add("form_entry", "表单入口", "marketing", "form", "/api/v1/mp/form-templates/{id}",
                "表单,问卷,留资",
                "title,template_id,button_text", "margin_left,margin_right", "tap,submit", "多步表单");
        add("ai_entry", "AI入口", "content", "ai", "/api/v1/mp/ai/chat",
                "ai,智能客服,对话入口",
                "title,button_text", "margin_left,margin_right", "tap,chat", "语音数字人");
        add("join_group", "加入群聊", "marketing", "none", null,
                "加群,社群,微信群",
                "title,qrcode,button_text", "margin_left,margin_right", "tap", "");
        add("brand_header", "品牌顶栏", "content", "none", null,
                "顶栏,品牌头,店招,logo栏",
                "title,subtitle,logo", "margin_left,margin_right", "tap", "视差,sticky玻璃");
        add("container", "容器/分栏", "layout", "none", null,
                "分栏,容器,两列布局",
                "layout,columns,gap,title", "padding_top,padding_bottom,padding_left,padding_right",
                "", "栅格拖拽");
        add("image_hotspot", "图片热区", "content", "none", null,
                "热区,点选图",
                "image,aspect_ratio,hotspots", "", "tap", "");
        add("section_bg", "通栏背景", "layout", "none", null,
                "通栏,背景带,氛围底",
                "image,overlay,height", "padding_top,padding_bottom", "", "视频背景,粒子");
        add("feature_cards", "卖点卡片组", "content", "none", null,
                "卖点,特点,服务承诺,卡片组",
                "columns,items", "item_gap", "tap", "3d翻转卡");
        add("image_cube", "图片魔方", "layout", "none", null,
                "魔方,宫格图,拼图",
                "layout,gap,items", "", "tap", "");
        add("content_tabs", "选项卡", "content", "none", null,
                "选项卡,tab,分类切换",
                "tabs,active", "", "tap", "滑动吸附");
        add("planet_hero", "星球顶栏", "planet", "planet", "/api/v1/mp/planet/home",
                "星球顶栏,星球头图",
                "title,subtitle", "", "tap", "");
        add("planet_topics", "星球话题预测", "planet", "planet", "/api/v1/mp/planet/home",
                "星球话题,话题预测",
                "title,limit", "", "tap", "");
        add("planet_feed", "星球动态流", "planet", "planet", "/api/v1/mp/planet/feed",
                "星球动态,星球feed",
                "page_size", "", "tap,scroll", "");
    }

    private PageBuilderComponentCatalog() {
    }

    public static Def get(String type) {
        if (type == null) {
            return null;
        }
        return BY_TYPE.get(type.trim().toLowerCase(Locale.ROOT));
    }

    public static List<Def> all() {
        return Collections.unmodifiableList(new ArrayList<>(BY_TYPE.values()));
    }

    public static Set<String> types() {
        return Collections.unmodifiableSet(BY_TYPE.keySet());
    }

    public static String promptSummary() {
        return all().stream().map(Def::catalogLine).collect(Collectors.joining("\n"));
    }

    private static void add(
            String type,
            String label,
            String category,
            String dataNeed,
            String apiPath,
            String aliases,
            String propKeys,
            String styleKeys,
            String interactions,
            String unsupported
    ) {
        BY_TYPE.put(type, new Def(
                type,
                label,
                category,
                dataNeed,
                apiPath,
                csv(aliases + "," + type + "," + label),
                csv(propKeys),
                csv(styleKeys),
                csv(interactions),
                csv(unsupported)
        ));
    }

    private static Set<String> csv(String raw) {
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(raw.split("[,，/]"))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }
}
