package com.miniprogram.service;

import com.miniprogram.entity.GroupQrcode;

import java.util.List;

public interface GroupQrcodeService {
    /** 取某群当前有效二维码（按 sort_order 取第一个未过期的启用码） */
    GroupQrcode getCurrentQrcode(String groupKey);

    /** 管理端：列某群全部二维码 */
    List<GroupQrcode> listByGroup(String groupKey);

    /** 管理端：新增/更新二维码 */
    GroupQrcode save(GroupQrcode row);

    /** 管理端：删除 */
    void delete(Long id);

    /** 定时轮换：扫描已过期码停用，启用下一个备用码 */
    int rotateExpired();
}