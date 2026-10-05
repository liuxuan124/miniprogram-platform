package com.miniprogram.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * 全局异常处理器
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<R<Void>> handleBusinessException(BusinessException e, HttpServletRequest request) {
        log.warn("业务异常 [{}] {}: {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        int httpStatus = resolveHttpStatus(e.getCode());
        return ResponseEntity.status(httpStatus).body(R.fail(e.getCode(), e.getMessage()));
    }

    /**
     * 根据业务错误码解析 HTTP 状态码
     *
     * <p><b>背景</b>：本项目错误码存在两套编码风格混用，且旧实现对「前缀直译风格」的码
     * 全部算错——用 {@code (code/100)%100} 取「类型」位时，404001 算出 40 落进 default，
     * 于是所有文件类错误都以 HTTP 200 返回。小程序 {@code wx.downloadFile} 只看状态码，
     * 无法识别失败，把 JSON 错误体当 PDF 下载，页面只能显示无意义的「下载失败」。
     *
     * <p><b>做法</b>：不猜编码规则，改为<b>显式白名单</b> + 保留原有分段规则兜底。
     * 白名单只收录经审计语义无歧义的码，未收录的码行为与改动前完全一致，零回归。
     *
     * <p><b>为什么不用「前 3 位即状态码」的通用规则</b>：文件等模块用 404001/403001，
     * 但同为 6 位的 400401（内容不存在，应 404）、500401（商品不存在，应 404）、
     * 500201（状态错误，应 422）的前缀是「模块号」而非状态码。通用规则会把它们
     * 全部映射错（404→400、422→500），故只做白名单。
     */
    private int resolveHttpStatus(int code) {
        if (code == ErrorCode.PAGE_VERSION_CONFLICT.getCode()) {
            return 409;
        }
        Integer explicit = EXPLICIT_STATUS.get(code);
        if (explicit != null) {
            return explicit;
        }
        // 5000~5999：4 位历史码，统一按业务规则错误处理
        if (code >= 5000 && code < 6000) {
            return 422;
        }
        // 6 位分段风格：模块(2) + 类型(2) + 序号(2)，类型位为第 3~4 字符（400201 → 02 → 422）
        String s = String.valueOf(code);
        if (s.length() == 6 || s.length() == 7) {
            Integer mapped = TYPE_STATUS.get(Integer.parseInt(s.substring(2, 4)));
            if (mapped != null) {
                return mapped;
            }
        }
        // 5 位（10001~99999）：沿用原判定
        int type = (code / 100) % 100;
        int module = code / 10000;
        if (module == 10 && type == 1) {
            return 400;
        }
        return switch (type) {
            case 4 -> 404;   // 不存在
            case 2 -> 422;   // 状态错误/业务规则
            case 5 -> 409;   // 冲突/重复
            case 1 -> 401;   // 认证错误
            default -> 200;  // 其他业务错误用200，通过code区分
        };
    }

    /**
     * 显式状态码白名单（键=业务码，值=HTTP 状态码）。
     * 仅收录「前缀直译规则会算错、且语义经审计确认」的码；未收录的保持原有行为。
     */
    private static final Map<Integer, Integer> EXPLICIT_STATUS = Map.ofEntries(
            // 文件模块：404001「文件不存在/未发布」、404401
            Map.entry(404001, 404),
            Map.entry(404401, 404),
            // 403001「暂无下载权限」、403002「链接已过期/无效」、403004「次数超上限」
            Map.entry(403001, 403),
            Map.entry(403002, 403),
            Map.entry(403003, 403),
            Map.entry(403004, 403),
            // 认证：401001「请先登录」
            Map.entry(401001, 401),
            // 参数错误：400001
            Map.entry(400001, 400),
            // 服务端异常：500001「无法生成试读文件/生成失败」、500002
            Map.entry(500001, 500),
            Map.entry(500002, 500)
    );

    /** 分段风格：类型位 → HTTP 状态 */
    private static final Map<Integer, Integer> TYPE_STATUS = Map.of(
            1, 401,
            2, 422,
            3, 400,
            4, 404,
            5, 409
    );

    /**
     * 参数校验异常 - @Valid/@Validated
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("参数校验失败: {}", message);
        return R.badRequest(message);
    }

    /**
     * 参数绑定异常
     */
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleBindException(BindException e) {
        String message = e.getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("参数绑定失败: {}", message);
        return R.badRequest(message);
    }

    /**
     * 约束违反异常
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleConstraintViolationException(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining("; "));
        log.warn("约束违反: {}", message);
        return R.badRequest(message);
    }

    /**
     * 路径/参数类型不匹配（如 local_1 无法转为 Long）
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException e) {
        log.warn("参数类型错误: {} = {}", e.getName(), e.getValue());
        return R.badRequest("参数格式错误: " + e.getName());
    }

    /**
     * 缺少请求参数
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleMissingServletRequestParameterException(MissingServletRequestParameterException e) {
        log.warn("缺少请求参数: {}", e.getParameterName());
        return R.badRequest("缺少请求参数: " + e.getParameterName());
    }

    @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleMultipartException(Exception e) {
        log.warn("文件上传解析失败: {}", e.getMessage());
        return R.badRequest("未接收到上传文件，请选择 PDF/Word/TXT 后重试");
    }

    /**
     * 请求体解析失败（空body、格式错误等）
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public R<Void> handleHttpMessageNotReadableException(HttpMessageNotReadableException e) {
        log.warn("请求体解析失败: {}", e.getMessage());
        return R.badRequest("请求体格式错误或缺少必填字段");
    }

    /**
     * 请求方法不支持
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public R<Void> handleHttpRequestMethodNotSupportedException(HttpRequestMethodNotSupportedException e) {
        log.warn("请求方法不支持: {}", e.getMethod());
        return R.fail(405, "不支持的请求方法: " + e.getMethod());
    }

    /**
     * 404 未找到（旧式 DispatcherServlet）
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public R<Void> handleNoHandlerFoundException(NoHandlerFoundException e) {
        log.warn("接口不存在: {} {}", e.getHttpMethod(), e.getRequestURL());
        return R.notFound("接口不存在");
    }

    /**
     * 404 未找到（Spring 6 / Boot 3 默认：无资源映射）
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public R<Void> handleNoResourceFoundException(
            org.springframework.web.servlet.resource.NoResourceFoundException e) {
        log.warn("接口不存在: {} {}", e.getHttpMethod(), e.getResourcePath());
        return R.notFound("接口不存在");
    }

    /**
     * 认证失败
     */
    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public R<Void> handleBadCredentialsException(BadCredentialsException e) {
        log.warn("认证失败: {}", e.getMessage());
        return R.unauthorized("用户名或密码错误");
    }

    /**
     * 权限不足
     */
    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public R<Void> handleAccessDeniedException(AccessDeniedException e) {
        log.warn("权限不足: {}", e.getMessage());
        return R.forbidden("权限不足，无法访问");
    }

    /**
     * 数据库访问异常（缺列/约束等）
     */
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public R<Void> handleDataAccessException(org.springframework.dao.DataAccessException e, HttpServletRequest request) {
        log.error("数据库异常 [{}] {}", request.getMethod(), request.getRequestURI(), e);
        String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
        if (msg != null && msg.toLowerCase().contains("unknown column")) {
            String hint = msg.length() > 200 ? msg.substring(0, 200) + "…" : msg;
            return R.fail("数据库结构未升级，请在服务器执行 deploy/scripts/migrate.sh（或补跑缺失的 V*.sql）后重启后端。详情：" + hint);
        }
        return R.fail("数据保存失败，请稍后重试");
    }

    /**
     * 兜底异常处理
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public R<Void> handleException(Exception e, HttpServletRequest request) {
        log.error("系统异常 [{}] {}", request.getMethod(), request.getRequestURI(), e);
        String detail = e.getMessage();
        if (detail != null && (detail.contains("mp_agent_knowledge") || detail.contains("Unknown table")
                || detail.contains("doesn't exist"))) {
            return R.fail("知识库表不存在或未迁移，请执行 V25 数据库脚本后重试");
        }
        return R.fail("系统内部错误，请稍后重试");
    }
}
