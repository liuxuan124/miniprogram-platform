package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序用户查询 DTO
 */
@Data
@Schema(description = "小程序用户查询参数")
public class MiniProgramUserQueryDTO extends PageDTO {

    @Schema(description = "关键词（昵称模糊搜索）")
    private String keyword;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "来源渠道")
    private String source;

    /**
     * V116 账号来源筛选：real=真实注册 / system=后台配置 / test=联调测试。
     * 不传=全部。前端「账号来源」chips 直接对应这个参数。
     */
    @Schema(description = "账号来源：real真实注册 / system后台配置 / test联调测试")
    private String accountType;

    /**
     * V119 付费会员状态筛选：paid=有有效平台订购 / none=无有效平台订购。不传=全部。
     * <p>前端「付费会员」chips 一直在传这个参数，但此前 DTO 没有对应字段，
     * Spring 直接丢弃 → 筛选点了没反应。这里补上，真源是 mp_member_subscription。
     */
    @Schema(description = "付费会员状态：paid付费会员 / none非会员")
    private String payStatus;

    /**
     * V119 角色标签筛选：只看挂了该角色标签（mp_user_member_tag.tag_id）的人。
     * <p>此前前端是在拿到当前页 50 条之后本地过滤，选中一个人数为 0 的角色时
     * 表格会空掉但底栏 total 仍是全量数。改由服务端过滤，口径才对得上。
     */
    @Schema(description = "角色标签 id（mp_user_member_tag.tag_id），只看挂了该角色的人")
    private Long roleTagId;

    /**
     * V119 只看待合并的重复账号：手机号在 mp_user 内出现 ≥2 次（phone 非空）。
     * <p>与其它筛选条件是「与」关系，因此前端进入该模式时必须先清空互斥筛选。
     */
    @Schema(description = "只看重复账号（同手机号≥2 个），true=只看重复")
    private Boolean duplicateOnly;
}
