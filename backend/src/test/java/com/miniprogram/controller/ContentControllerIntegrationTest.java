package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.service.ContentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 内容管理接口契约测试。
 */
class ContentControllerIntegrationTest {

    private MockMvc mockMvc;
    private ContentService contentService;

    @BeforeEach
    void setUp() {
        contentService = mock(ContentService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ContentController(contentService)).build();
    }

    @Test
    @DisplayName("内容列表接口 - 返回分页数据")
    void should_returnPageData_when_listContents() throws Exception {
        PageResult<ContentDetailDTO> pageResult = new PageResult<>(Collections.emptyList(), 0L, 1L, 10L);
        when(contentService.listContents(any(ContentQueryDTO.class))).thenReturn(pageResult);

        mockMvc.perform(get("/api/v1/admin/contents")
                        .param("current", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(0));
    }
}
