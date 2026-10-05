package com.miniprogram.service;

import com.miniprogram.dto.system.UploadResultVO;

/**
 * 外链媒体转存：把第三方源站的图片/视频下载到自有存储。
 * 存在原因：商品图若直接外链，源站防盗链（Referer 校验）会让小程序端挂图 403。
 */
public interface RemoteMediaTransferService {

    /**
     * 下载远程媒体并转存到自有存储。
     *
     * @param remoteUrl 源地址（http/https）
     * @param subDir    存放子目录，如 product-media
     * @return 转存后的上传结果
     */
    UploadResultVO transfer(String remoteUrl, String subDir);
}
