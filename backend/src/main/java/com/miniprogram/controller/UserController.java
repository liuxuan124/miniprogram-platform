package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.MiniProgramUserQueryDTO;
import com.miniprogram.dto.MiniProgramUserVO;
import com.miniprogram.service.MiniProgramUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * 小程序用户管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "管理后台-小程序用户", description = "小程序用户列表和详情查询")
public class UserController {

    private final MiniProgramUserService miniProgramUserService;

    @GetMapping
    @Operation(summary = "小程序用户列表", description = "分页查询小程序用户列表")
    public R<PageResult<MiniProgramUserVO>> list(MiniProgramUserQueryDTO queryDTO) {
        return R.ok(miniProgramUserService.listUsers(queryDTO));
    }

    @GetMapping("/{id}")
    @Operation(summary = "用户详情", description = "获取小程序用户画像")
    public R<MiniProgramUserVO> detail(@PathVariable Long id) {
        return R.ok(miniProgramUserService.getUserProfile(id));
    }

    @GetMapping("/export")
    @Operation(summary = "导出用户", description = "按当前筛选条件导出小程序用户为 CSV")
    public void export(MiniProgramUserQueryDTO queryDTO, HttpServletResponse response) throws IOException {
        // 一次性拉取（导出场景），上限保护
        queryDTO.setCurrent(1L);
        queryDTO.setSize(100000L);
        List<MiniProgramUserVO> users = miniProgramUserService.listUsers(queryDTO).getRecords();

        String fileName = URLEncoder.encode("小程序用户_" + LocalDate.now() + ".csv", StandardCharsets.UTF_8);
        response.setContentType("text/csv;charset=utf-8");
        response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + fileName);

        PrintWriter writer = response.getWriter();
        // UTF-8 BOM，保证 Excel 正确识别中文
        writer.write('\uFEFF');
        writer.println("ID,openid,昵称,手机号,积分,来源渠道,最近访问,注册时间");
        for (MiniProgramUserVO u : users) {
            writer.println(String.join(",",
                    csv(u.getId()), csv(u.getOpenid()), csv(u.getNickname()), csv(u.getPhone()),
                    csv(u.getPoints()), csv(u.getSourceChannel()), csv(u.getLastVisitAt()), csv(u.getCreateTime())));
        }
        writer.flush();
    }

    private String csv(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v);
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
