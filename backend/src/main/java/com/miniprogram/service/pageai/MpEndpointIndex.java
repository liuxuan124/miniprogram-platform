package com.miniprogram.service.pageai;

import java.util.Set;

/** 仓库里真实注册的小程序/后台接口索引，禁止用臆造路径做接口检查。 */
public interface MpEndpointIndex {

    Set<String> allPaths();

    boolean hasPath(String requiredPath);
}
