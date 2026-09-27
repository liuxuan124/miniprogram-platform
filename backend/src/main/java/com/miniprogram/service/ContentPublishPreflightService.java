package com.miniprogram.service;

import com.miniprogram.dto.mini.ContentPreflightVO;

import java.util.List;

public interface ContentPublishPreflightService {

    ContentPreflightVO runPreflight(List<String> changeIds);

    void assertCanPublish(List<String> changeIds);
}
