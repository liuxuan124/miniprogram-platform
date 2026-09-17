package com.miniprogram.service.pageai;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class RequestMappingMpEndpointIndex implements MpEndpointIndex {

    private final List<RequestMappingHandlerMapping> mappings;

    public RequestMappingMpEndpointIndex(List<RequestMappingHandlerMapping> mappings) {
        this.mappings = mappings;
    }

    @Override
    public Set<String> allPaths() {
        Set<String> paths = new LinkedHashSet<>();
        for (RequestMappingHandlerMapping mapping : mappings) {
            if (mapping == null) {
                continue;
            }
            mapping.getHandlerMethods().forEach((info, method) -> collect(info, paths));
        }
        return paths;
    }

    @Override
    public boolean hasPath(String requiredPath) {
        return MpEndpointPaths.matches(requiredPath, allPaths());
    }

    private static void collect(RequestMappingInfo info, Set<String> paths) {
        if (info == null) {
            return;
        }
        if (info.getPathPatternsCondition() != null) {
            info.getPathPatternsCondition().getPatternValues().forEach(paths::add);
        }
        if (info.getPatternsCondition() != null) {
            info.getPatternsCondition().getPatterns().forEach(paths::add);
        }
        info.getDirectPaths().forEach(paths::add);
        info.getPatternValues().forEach(paths::add);
    }
}
