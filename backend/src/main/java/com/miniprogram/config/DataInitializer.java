package com.miniprogram.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.PageTemplate;
import com.miniprogram.entity.Role;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.PageTemplateMapper;
import com.miniprogram.mapper.RoleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 数据初始化器
 * 应用启动时检查并创建默认超级管理员账号
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminUserMapper adminUserMapper;
    private final RoleMapper roleMapper;
    private final PageTemplateMapper pageTemplateMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initDefaultAdmin();
        initDefaultTemplates();
    }

    /**
     * 初始化默认超级管理员
     */
    private void initDefaultAdmin() {
        // 检查是否已存在admin用户
        LambdaQueryWrapper<AdminUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AdminUser::getUsername, "admin");
        AdminUser existing = adminUserMapper.selectOne(wrapper);

        if (existing == null) {
            // 查找超级管理员角色
            LambdaQueryWrapper<Role> roleWrapper = new LambdaQueryWrapper<>();
            roleWrapper.eq(Role::getCode, "super_admin");
            Role superAdminRole = roleMapper.selectOne(roleWrapper);

            AdminUser admin = new AdminUser();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRealName("超级管理员");
            admin.setRoleId(superAdminRole != null ? superAdminRole.getId() : 1L);
            admin.setStatus(1);

            adminUserMapper.insert(admin);
            log.info("初始化默认超级管理员账号: admin / admin123");
        } else {
            log.info("超级管理员账号已存在，跳过初始化");
        }
    }

    /**
     * 初始化默认页面模板（按名称检查，支持增量添加）
     */
    private void initDefaultTemplates() {
        safeInsert(buildTemplate(
                "电商增长首页模板", "home", 10,
                """
                {"schema_version":"1.0","page":{"id":"tpl_home_growth","name":"首页","type":"home","path":"pages/index/index","background_color":"#f6f8fb"},"components":[{"id":"s1","type":"search","props":{"placeholder":"搜索商品 / 文章 / 活动","scope":"all"}},{"id":"n1","type":"notice_bar","props":{"title":"公告","items":["新品上架","会员领券","活动报名"]}},{"id":"p1","type":"product_list","props":{"title":"推荐商品","columns":2,"limit":6}},{"id":"a1","type":"article_list","props":{"title":"精选内容","limit":3,"columns":1}},{"id":"ai1","type":"ai_entry","props":{"title":"AI导购助手","description":"可推荐商品、文章、活动"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildTemplate(
                "活动裂变专题模板", "activity", 20,
                """
                {"schema_version":"1.0","page":{"id":"tpl_campaign","name":"活动专题","type":"activity","path":"pages/activity/topic","background_color":"#f6f8fb"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"年度品牌开放日","link_url":"/pages/activity-list/activity-list"}]}},{"id":"c1","type":"countdown","props":{"title":"距离活动开始"}},{"id":"al1","type":"activity_list","props":{"title":"进行中活动","limit":4}},{"id":"as1","type":"appointment_service","props":{"title":"预约服务","button_text":"立即预约"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildTemplate(
                "品牌馆展示模板", "member", 30,
                """
                {"schema_version":"1.0","page":{"id":"tpl_brand_hall","name":"品牌馆","type":"custom","path":"pages/brand/index","background_color":"#f6f8fb"},"components":[{"id":"bi1","type":"brand_intro","props":{"title":"RCEP国家馆全球优品库运营中心","subtitle":"湘品甄选-药食同源产业联合体"}},{"id":"ce1","type":"certificate","props":{"title":"资质证书","items":[{"name":"有机认证证书"},{"name":"检测报告"}]}},{"id":"it1","type":"image_text","props":{"title":"产业介绍","layout":"left-image","content":"展示品牌故事与核心卖点"}},{"id":"ct1","type":"contact_info","props":{"title":"联系我们","phone":"400-888-0000"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "服装鞋包首页模板", "home", 40, "clothing", "sales",
                "服装,鞋包,穿搭,时尚", "#e11d48,#ec4899",
                "适用于服装鞋包行业的首页模板，包含商品展示、限时秒杀、优惠券和会员体系",
                """
                {"schema_version":"1.0","page":{"id":"tpl_clothing_home","name":"服装鞋包首页","type":"home","path":"pages/index/index","background_color":"#fdf2f8"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"春夏新品首发","link_url":"/pages/product-list/product-list"}]}},{"id":"cn1","type":"category_nav","props":{"title":"分类导航","columns":4,"categories":[{"name":"女装","icon":"dress"},{"name":"男装","icon":"shirt"},{"name":"鞋靴","icon":"shoe"},{"name":"箱包","icon":"bag"}]}},{"id":"pl1","type":"product_list","props":{"title":"热销爆款","columns":2,"limit":6}},{"id":"fs1","type":"flash_sale","props":{"title":"限时秒杀","limit":4}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满199减20","threshold":19900},{"name":"满399减50","threshold":39900}]}},{"id":"mc1","type":"member_card","props":{"title":"会员专享","benefits":["会员折扣","积分翻倍","包邮权益"]}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "食品饮料首页模板", "home", 50, "food", "sales",
                "食品,饮料,零食,生鲜", "#f97316,#fbbf24",
                "适用于食品饮料行业的首页模板，包含搜索、商品展示、品牌介绍和AI导购",
                """
                {"schema_version":"1.0","page":{"id":"tpl_food_home","name":"食品饮料首页","type":"home","path":"pages/index/index","background_color":"#fff7ed"},"components":[{"id":"s1","type":"search","props":{"placeholder":"搜索美食 / 零食 / 饮料","scope":"all"}},{"id":"n1","type":"notice_bar","props":{"title":"公告","items":["新品上市","限时特惠","会员福利"]}},{"id":"b1","type":"banner","props":{"images":[{"title":"舌尖上的美味","link_url":"/pages/product-list/product-list"}]}},{"id":"cn1","type":"category_nav","props":{"title":"分类导航","columns":4,"categories":[{"name":"零食","icon":"snack"},{"name":"饮料","icon":"drink"},{"name":"生鲜","icon":"fresh"},{"name":"特产","icon":"special"}]}},{"id":"pl1","type":"product_list","props":{"title":"人气推荐","columns":2,"limit":6}},{"id":"bi1","type":"brand_intro","props":{"title":"品牌故事","subtitle":"匠心品质 源自天然"}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满99减15","threshold":9900},{"name":"满199减35","threshold":19900}]}},{"id":"ai1","type":"ai_entry","props":{"title":"AI美食推荐","description":"根据口味偏好推荐商品"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "数码家电首页模板", "home", 60, "digital", "sales",
                "数码,家电,手机,电脑", "#2563eb,#06b6d4",
                "适用于数码家电行业的首页模板，包含商品展示、视频介绍和AI智能推荐",
                """
                {"schema_version":"1.0","page":{"id":"tpl_digital_home","name":"数码家电首页","type":"home","path":"pages/index/index","background_color":"#eff6ff"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"新品首发","link_url":"/pages/product-list/product-list"}]}},{"id":"cn1","type":"category_nav","props":{"title":"分类导航","columns":4,"categories":[{"name":"手机","icon":"phone"},{"name":"电脑","icon":"laptop"},{"name":"家电","icon":"appliance"},{"name":"配件","icon":"accessory"}]}},{"id":"fs1","type":"flash_sale","props":{"title":"限时秒杀","limit":4}},{"id":"pl1","type":"product_list","props":{"title":"爆款推荐","columns":2,"limit":6}},{"id":"vd1","type":"video","props":{"title":"产品测评","url":"","poster":""}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满500减50","threshold":50000},{"name":"满1000减120","threshold":100000}]}},{"id":"mc1","type":"member_card","props":{"title":"会员专享","benefits":["延保服务","以旧换新","上门维修"]}},{"id":"ai1","type":"ai_entry","props":{"title":"AI智能推荐","description":"根据使用场景推荐产品"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "家居日用首页模板", "home", 70, "home", "sales",
                "家居,日用,收纳,生活", "#78716c,#a8a29e",
                "适用于家居日用行业的首页模板，包含商品展示、品牌介绍和预约服务",
                """
                {"schema_version":"1.0","page":{"id":"tpl_home_living","name":"家居日用首页","type":"home","path":"pages/index/index","background_color":"#fafaf9"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"理想生活季","link_url":"/pages/product-list/product-list"}]}},{"id":"cn1","type":"category_nav","props":{"title":"分类导航","columns":4,"categories":[{"name":"收纳","icon":"storage"},{"name":"厨具","icon":"kitchen"},{"name":"家纺","icon":"textile"},{"name":"装饰","icon":"decor"}]}},{"id":"pl1","type":"product_list","props":{"title":"精选好物","columns":2,"limit":6}},{"id":"bi1","type":"brand_intro","props":{"title":"品牌理念","subtitle":"让家更美好"}},{"id":"im1","type":"image","props":{"title":"场景搭配","url":"","link_url":""}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满200减30","threshold":20000},{"name":"满500减80","threshold":50000}]}},{"id":"as1","type":"appointment_service","props":{"title":"预约服务","button_text":"立即预约"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "美妆护肤首页模板", "home", 80, "beauty", "sales",
                "美妆,护肤,彩妆,美容", "#d946ef,#f472b6",
                "适用于美妆护肤行业的首页模板，包含品牌展示、限时秒杀、会员体系和AI推荐",
                """
                {"schema_version":"1.0","page":{"id":"tpl_beauty_home","name":"美妆护肤首页","type":"home","path":"pages/index/index","background_color":"#fdf4ff"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"美肌焕新季","link_url":"/pages/product-list/product-list"}]}},{"id":"bi1","type":"brand_intro","props":{"title":"品牌故事","subtitle":"探索自然之美"}},{"id":"pl1","type":"product_list","props":{"title":"明星单品","columns":2,"limit":6}},{"id":"fs1","type":"flash_sale","props":{"title":"限时秒杀","limit":4}},{"id":"mc1","type":"member_card","props":{"title":"会员专享","benefits":["会员专属价","积分兑换","生日礼遇"]}},{"id":"it1","type":"image_text","props":{"title":"护肤指南","layout":"left-image","content":"科学护肤步骤与产品搭配建议"}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满199减30","threshold":19900},{"name":"满399减70","threshold":39900}]}},{"id":"ai1","type":"ai_entry","props":{"title":"AI肤质测试","description":"智能分析肤质推荐产品"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "教育培训首页模板", "home", 90, "education", "service",
                "教育,培训,课程,学习", "#0d9488,#14b8a6",
                "适用于教育培训行业的首页模板，包含课程导航、视频介绍、预约和表单入口",
                """
                {"schema_version":"1.0","page":{"id":"tpl_education_home","name":"教育培训首页","type":"home","path":"pages/index/index","background_color":"#f0fdfa"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"开学季特惠","link_url":"/pages/course-list/course-list"}]}},{"id":"cn1","type":"category_nav","props":{"title":"课程导航","columns":4,"categories":[{"name":"学科辅导","icon":"tutor"},{"name":"兴趣培养","icon":"interest"},{"name":"职业技能","icon":"career"},{"name":"语言培训","icon":"language"}]}},{"id":"it1","type":"image_text","props":{"title":"教学理念","layout":"left-image","content":"因材施教 激发潜能"}},{"id":"vd1","type":"video","props":{"title":"课堂实录","url":"","poster":""}},{"id":"as1","type":"appointment_service","props":{"title":"预约试听","button_text":"立即预约"}},{"id":"fm1","type":"form_entry","props":{"title":"课程咨询","form_title":"填写信息获取课程方案"}},{"id":"ct1","type":"contact_info","props":{"title":"联系我们","phone":"400-888-6666"}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "运动户外首页模板", "home", 100, "sports", "sales",
                "运动,户外,健身,装备", "#16a34a,#84cc16",
                "适用于运动户外行业的首页模板，包含商品展示、限时秒杀、活动和视频",
                """
                {"schema_version":"1.0","page":{"id":"tpl_sports_home","name":"运动户外首页","type":"home","path":"pages/index/index","background_color":"#f0fdf4"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"热力开练","link_url":"/pages/product-list/product-list"}]}},{"id":"bi1","type":"brand_intro","props":{"title":"品牌精神","subtitle":"突破极限 超越自我"}},{"id":"pl1","type":"product_list","props":{"title":"人气装备","columns":2,"limit":6}},{"id":"fs1","type":"flash_sale","props":{"title":"限时秒杀","limit":4}},{"id":"al1","type":"activity_list","props":{"title":"精彩活动","limit":4}},{"id":"vd1","type":"video","props":{"title":"运动课堂","url":"","poster":""}},{"id":"cp1","type":"coupon","props":{"title":"领券中心","coupons":[{"name":"满299减50","threshold":29900},{"name":"满599减100","threshold":59900}]}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        safeInsert(buildIndustryTemplate(
                "婚庆服务首页模板", "home", 110, "wedding", "service",
                "婚庆,婚礼,婚纱,婚宴", "#f43f5e,#fbbf24",
                "适用于婚庆服务行业的首页模板，包含品牌展示、视频、预约服务和资质证书",
                """
                {"schema_version":"1.0","page":{"id":"tpl_wedding_home","name":"婚庆服务首页","type":"home","path":"pages/index/index","background_color":"#fff1f2"},"components":[{"id":"b1","type":"banner","props":{"images":[{"title":"梦幻婚礼","link_url":"/pages/case-list/case-list"}]}},{"id":"bi1","type":"brand_intro","props":{"title":"品牌故事","subtitle":"见证每一份幸福"}},{"id":"it1","type":"image_text","props":{"title":"婚礼案例","layout":"left-image","content":"真实婚礼案例展示"}},{"id":"vd1","type":"video","props":{"title":"婚礼MV","url":"","poster":""}},{"id":"as1","type":"appointment_service","props":{"title":"预约咨询","button_text":"立即预约"}},{"id":"fm1","type":"form_entry","props":{"title":"婚礼策划","form_title":"填写需求获取定制方案"}},{"id":"ct1","type":"contact_info","props":{"title":"联系我们","phone":"400-520-1314"}},{"id":"ce1","type":"certificate","props":{"title":"资质证书","items":[{"name":"婚庆服务许可证"},{"name":"行业荣誉证书"}]}}],"global_config":{"pull_refresh":false,"reach_bottom_load":false}}
                """));

        log.info("初始化页面模板完成");
    }

    private void safeInsert(PageTemplate template) {
        if (template != null) {
            pageTemplateMapper.insert(template);
        }
    }

    private PageTemplate buildTemplate(String name, String category, int sortOrder, String dslJson) {
        return buildTemplate(name, category, sortOrder, dslJson, null, null, null, null, null);
    }

    private PageTemplate buildTemplate(String name, String category, int sortOrder, String dslJson,
                                       String industryCode, String scene, String tags, String colors, String description) {
        LambdaQueryWrapper<PageTemplate> checkWrapper = new LambdaQueryWrapper<>();
        checkWrapper.eq(PageTemplate::getName, name);
        PageTemplate existing = pageTemplateMapper.selectOne(checkWrapper);
        if (existing != null) {
            log.info("模板已存在，跳过：{}", name);
            return null;
        }

        PageTemplate template = new PageTemplate();
        template.setName(name);
        template.setCategory(category);
        template.setSortOrder(sortOrder);
        template.setDslContent(dslJson);
        template.setIndustryCode(industryCode);
        template.setScene(scene);
        template.setTags(tags);
        template.setColors(colors);
        template.setDescription(description);
        return template;
    }

    private PageTemplate buildIndustryTemplate(String name, String category, int sortOrder,
                                               String industryCode, String scene, String tags, String colors,
                                               String description, String dslJson) {
        return buildTemplate(name, category, sortOrder, dslJson, industryCode, scene, tags, colors, description);
    }
}
