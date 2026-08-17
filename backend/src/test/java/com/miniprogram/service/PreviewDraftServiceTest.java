package com.miniprogram.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.PreviewDraftCreateDTO;
import com.miniprogram.dto.PreviewDraftCreateVO;
import com.miniprogram.dto.PreviewDraftVO;
import com.miniprogram.service.impl.PreviewDraftServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PreviewDraftServiceTest {

    private final Map<String, String> store = new ConcurrentHashMap<>();
    private PreviewDraftService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        store.clear();
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.get(anyString())).thenAnswer(inv -> store.get(inv.getArgument(0)));
        doAnswer(inv -> {
            store.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(ops).set(anyString(), anyString(), any(Duration.class));
        when(redis.delete(anyString())).thenAnswer(inv -> store.remove(inv.getArgument(0)) != null);
        service = new PreviewDraftServiceImpl(redis, new ObjectMapper());
    }

    @Test
    void createGetThenDeleteClears() {
        PreviewDraftCreateDTO dto = new PreviewDraftCreateDTO();
        dto.setDsl(Map.of("page", Map.of("name", "测试页"), "components", java.util.List.of()));
        dto.setPageTitle("测试页");

        PreviewDraftCreateVO created = service.create(dto);
        assertNotNull(created.getToken());
        assertTrue(created.getPreviewPath().contains(created.getToken()));

        PreviewDraftVO loaded = service.getByToken(created.getToken());
        assertEquals("测试页", loaded.getPageTitle());
        assertNotNull(loaded.getDsl());

        service.delete(created.getToken());
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.getByToken(created.getToken()));
        assertEquals(404, ex.getCode());
    }
}
