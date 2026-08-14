package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.CouponDTO;
import com.miniprogram.dto.member.CouponQueryDTO;
import com.miniprogram.dto.member.CouponVO;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.entity.Coupon;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.CouponMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserCouponMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.CouponService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CouponMapper couponMapper;
    private final UserCouponMapper userCouponMapper;
    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;

    private enum SelectMode {
        /** 含领取范围字段 */
        FULL,
        /** 不含 claim_*（兼容未跑 V30/V33） */
        NO_CLAIM,
        /** 仅 V8 核心列 */
        CORE
    }

    @Override
    public PageResult<CouponVO> listCoupons(CouponQueryDTO query) {
        int pageNo = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        long pageSize = query.getSize() == null || query.getSize() < 1 ? 20 : query.getSize();
        try {
            return pageCoupons(query, pageNo, pageSize, SelectMode.FULL);
        } catch (DataAccessException ex) {
            if (!isUnknownColumn(ex)) {
                throw ex;
            }
            log.warn("优惠券列表缺列，降级查询: {}", rootMessage(ex));
            try {
                return pageCoupons(query, pageNo, pageSize, SelectMode.NO_CLAIM);
            } catch (DataAccessException ex2) {
                if (!isUnknownColumn(ex2)) {
                    throw ex2;
                }
                log.warn("优惠券列表再次降级到核心列: {}", rootMessage(ex2));
                return pageCoupons(query, pageNo, pageSize, SelectMode.CORE);
            }
        }
    }

    private PageResult<CouponVO> pageCoupons(CouponQueryDTO query, int pageNo, long pageSize, SelectMode mode) {
        LambdaQueryWrapper<Coupon> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(query.getStatus() != null && !query.getStatus().isBlank(), Coupon::getStatus, query.getStatus())
                .orderByDesc(Coupon::getCreateTime);
        applySelectMode(wrapper, mode);
        Page<Coupon> page = couponMapper.selectPage(new Page<>(pageNo, pageSize), wrapper);
        List<CouponVO> records = page.getRecords().stream().map(this::toCouponVO).toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    private void applySelectMode(LambdaQueryWrapper<Coupon> wrapper, SelectMode mode) {
        if (mode == SelectMode.FULL) {
            return;
        }
        if (mode == SelectMode.NO_CLAIM) {
            wrapper.select(
                    Coupon::getId, Coupon::getName, Coupon::getType, Coupon::getValue,
                    Coupon::getMinOrderAmount, Coupon::getScope, Coupon::getScopeIds,
                    Coupon::getStartTime, Coupon::getEndTime, Coupon::getValidDays,
                    Coupon::getTotalCount, Coupon::getUsedCount, Coupon::getPerUserLimit,
                    Coupon::getStatus, Coupon::getDescription,
                    Coupon::getCreateTime, Coupon::getUpdateTime
            );
            return;
        }
        wrapper.select(
                Coupon::getId, Coupon::getName, Coupon::getType, Coupon::getValue,
                Coupon::getMinOrderAmount, Coupon::getStartTime, Coupon::getEndTime,
                Coupon::getTotalCount, Coupon::getUsedCount, Coupon::getPerUserLimit,
                Coupon::getStatus, Coupon::getCreateTime, Coupon::getUpdateTime
        );
    }

    private boolean isUnknownColumn(Throwable ex) {
        String msg = rootMessage(ex).toLowerCase(Locale.ROOT);
        return msg.contains("unknown column") || msg.contains("doesn't exist");
    }

    private String rootMessage(Throwable ex) {
        Throwable cur = ex;
        while (cur.getCause() != null && cur.getCause() != cur) {
            cur = cur.getCause();
        }
        return cur.getMessage() == null ? "" : cur.getMessage();
    }

    @Override
    public CouponVO getCouponDetail(Long id) {
        return toCouponVO(getCoupon(id));
    }

    @Override
    public CouponVO createCoupon(CouponDTO dto) {
        normalizeValidity(dto);
        Coupon coupon = new Coupon();
        applyDto(coupon, dto);
        if (coupon.getStatus() == null) {
            coupon.setStatus("draft");
        }
        if (coupon.getUsedCount() == null) {
            coupon.setUsedCount(0);
        }
        if (coupon.getPerUserLimit() == null) {
            coupon.setPerUserLimit(1);
        }
        if (!StringUtils.hasText(coupon.getScope())) {
            coupon.setScope("all");
        }
        if (!StringUtils.hasText(coupon.getClaimAudience())) {
            coupon.setClaimAudience("all");
        }
        try {
            couponMapper.insert(coupon);
        } catch (DataAccessException ex) {
            if (isUnknownColumn(ex)) {
                throw new BusinessException(500501,
                        "数据库结构未升级（缺少优惠券扩展字段），请重启后端执行迁移 V33 后重试");
            }
            throw ex;
        }
        return toCouponVO(coupon);
    }

    @Override
    public CouponVO updateCoupon(Long id, CouponDTO dto) {
        normalizeValidity(dto);
        Coupon coupon = getCoupon(id);
        applyDto(coupon, dto);
        coupon.setId(id);
        try {
            couponMapper.updateById(coupon);
        } catch (DataAccessException ex) {
            if (isUnknownColumn(ex)) {
                throw new BusinessException(500501,
                        "数据库结构未升级（缺少优惠券扩展字段），请重启后端执行迁移 V33 后重试");
            }
            throw ex;
        }
        return toCouponVO(coupon);
    }

    /** 固定时间段 / 领取后有效天数 二选一规范化 */
    private void normalizeValidity(CouponDTO dto) {
        Integer days = dto.getValidDays();
        if (days != null && days > 0) {
            LocalDateTime start = dto.getStartTime() != null ? dto.getStartTime() : LocalDateTime.now();
            dto.setStartTime(start);
            if (dto.getEndTime() == null) {
                dto.setEndTime(start.plusDays(days));
            }
            return;
        }
        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new BusinessException(400204, "请设置优惠券有效期（固定时间段或领取后有效天数）");
        }
        if (dto.getEndTime().isBefore(dto.getStartTime())) {
            throw new BusinessException(400205, "失效时间不能早于生效时间");
        }
    }

    @Override
    public void deleteCoupon(Long id) {
        couponMapper.deleteById(id);
    }

    @Override
    public void publishCoupon(Long id) {
        Coupon coupon = getCoupon(id);
        coupon.setStatus("published");
        couponMapper.updateById(coupon);
    }

    @Override
    public void disableCoupon(Long id) {
        Coupon coupon = getCoupon(id);
        coupon.setStatus("disabled");
        couponMapper.updateById(coupon);
    }

    @Override
    public PageResult<CouponVO> listAvailableCoupons(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        Long levelId = resolveUserLevelId(userId);
        LambdaQueryWrapper<Coupon> wrapper = new LambdaQueryWrapper<Coupon>()
                .eq(Coupon::getStatus, "published")
                .le(Coupon::getStartTime, now)
                .ge(Coupon::getEndTime, now)
                .orderByAsc(Coupon::getEndTime);
        Page<Coupon> page = couponMapper.selectPage(new Page<>(1, 50), wrapper);
        List<CouponVO> records = page.getRecords().stream()
                .filter(coupon -> !isIssuedOut(coupon))
                .filter(coupon -> canUserClaim(coupon, levelId))
                .map(this::toCouponVO)
                .toList();
        return new PageResult<>(records, (long) records.size(), 1L, 50L);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserCouponVO claimCoupon(Long userId, Long couponId) {
        Coupon coupon = getCoupon(couponId);
        LocalDateTime now = LocalDateTime.now();
        if (!"published".equals(coupon.getStatus())
                || coupon.getStartTime().isAfter(now)
                || coupon.getEndTime().isBefore(now)) {
            throw new BusinessException(400201, "优惠券不可领取");
        }
        if (isIssuedOut(coupon)) {
            throw new BusinessException(400201, "优惠券已领完");
        }
        Long levelId = resolveUserLevelId(userId);
        if (!canUserClaim(coupon, levelId)) {
            throw new BusinessException(400201, "当前会员等级不可领取该优惠券");
        }

        Long claimedCount = userCouponMapper.selectCount(new LambdaQueryWrapper<UserCoupon>()
                .eq(UserCoupon::getUserId, userId)
                .eq(UserCoupon::getCouponId, couponId));
        if (coupon.getPerUserLimit() != null && claimedCount >= coupon.getPerUserLimit()) {
            throw new BusinessException(400201, "已达到领取上限");
        }

        return issueCouponEntity(userId, coupon);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserCouponVO issueCoupon(Long userId, Long couponId) {
        Coupon coupon = getCoupon(couponId);
        if (isIssuedOut(coupon)) {
            throw new BusinessException(400201, "优惠券已领完");
        }
        return issueCouponEntity(userId, coupon);
    }

    @Transactional(rollbackFor = Exception.class)
    protected UserCouponVO issueCouponEntity(Long userId, Coupon coupon) {
        UserCoupon userCoupon = new UserCoupon();
        userCoupon.setUserId(userId);
        userCoupon.setCouponId(coupon.getId());
        userCoupon.setStatus("unused");
        userCouponMapper.insert(userCoupon);

        coupon.setUsedCount(nullToZero(coupon.getUsedCount()) + 1);
        couponMapper.updateById(coupon);
        return toUserCouponVO(userCoupon, coupon);
    }

    @Override
    public PageResult<UserCouponVO> listMyCoupons(Long userId, String status) {
        LambdaQueryWrapper<UserCoupon> wrapper = new LambdaQueryWrapper<UserCoupon>()
                .eq(UserCoupon::getUserId, userId)
                .eq(status != null && !status.isBlank(), UserCoupon::getStatus, status)
                .orderByDesc(UserCoupon::getCreateTime);
        Page<UserCoupon> page = userCouponMapper.selectPage(new Page<>(1, 50), wrapper);
        List<UserCouponVO> records = page.getRecords().stream()
                .map(userCoupon -> toUserCouponVO(userCoupon, couponMapper.selectById(userCoupon.getCouponId())))
                .toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    private void applyDto(Coupon coupon, CouponDTO dto) {
        BeanUtils.copyProperties(dto, coupon, "scopeIds", "claimLevelIds");
        coupon.setScopeIds(joinIds(dto.getScopeIds()));
        String audience = dto.getClaimAudience();
        if (!StringUtils.hasText(audience)) {
            audience = "all";
        }
        audience = audience.trim().toLowerCase();
        if (!List.of("all", "members", "levels").contains(audience)) {
            throw new BusinessException(400202, "领取范围不合法");
        }
        coupon.setClaimAudience(audience);
        if ("levels".equals(audience)) {
            if (dto.getClaimLevelIds() == null || dto.getClaimLevelIds().isEmpty()) {
                throw new BusinessException(400203, "指定等级领取时请选择至少一个会员等级");
            }
            coupon.setClaimLevelIds(joinIds(dto.getClaimLevelIds()));
        } else {
            coupon.setClaimLevelIds(null);
        }
    }

    private boolean canUserClaim(Coupon coupon, Long userLevelId) {
        String audience = coupon.getClaimAudience();
        if (!StringUtils.hasText(audience) || "all".equalsIgnoreCase(audience)) {
            return true;
        }
        if ("members".equalsIgnoreCase(audience)) {
            return userLevelId != null;
        }
        if ("levels".equalsIgnoreCase(audience)) {
            List<Long> ids = parseIds(coupon.getClaimLevelIds());
            return userLevelId != null && ids.contains(userLevelId);
        }
        return true;
    }

    private Long resolveUserLevelId(Long userId) {
        if (userId == null) return null;
        User user = userMapper.selectById(userId);
        if (user == null) return null;
        if (user.getLevelId() != null) return user.getLevelId();
        Integer points = user.getPoints() == null ? 0 : user.getPoints();
        MemberLevel level = memberLevelMapper.selectList(new LambdaQueryWrapper<MemberLevel>()
                        .eq(MemberLevel::getStatus, 1)
                        .le(MemberLevel::getMinPoints, points)
                        .orderByDesc(MemberLevel::getMinPoints)
                        .last("LIMIT 1"))
                .stream().findFirst().orElse(null);
        return level != null ? level.getId() : null;
    }

    public boolean levelHasExclusiveCoupon(Long levelId) {
        if (levelId == null) return false;
        MemberLevel level = memberLevelMapper.selectById(levelId);
        if (level == null) return false;
        return MemberBenefitCodes.has(MemberBenefitCodes.normalize(level.getRights()), MemberBenefitCodes.EXCLUSIVE_COUPON);
    }

    private Coupon getCoupon(Long id) {
        try {
            Coupon coupon = couponMapper.selectById(id);
            if (coupon == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
            }
            return coupon;
        } catch (DataAccessException ex) {
            if (!isUnknownColumn(ex)) {
                throw ex;
            }
            LambdaQueryWrapper<Coupon> wrapper = new LambdaQueryWrapper<Coupon>().eq(Coupon::getId, id);
            applySelectMode(wrapper, SelectMode.NO_CLAIM);
            Coupon coupon = couponMapper.selectOne(wrapper);
            if (coupon == null) {
                wrapper = new LambdaQueryWrapper<Coupon>().eq(Coupon::getId, id);
                applySelectMode(wrapper, SelectMode.CORE);
                coupon = couponMapper.selectOne(wrapper);
            }
            if (coupon == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
            }
            return coupon;
        }
    }

    private boolean isIssuedOut(Coupon coupon) {
        Integer total = coupon.getTotalCount();
        return total != null && total > 0 && nullToZero(coupon.getUsedCount()) >= total;
    }

    private CouponVO toCouponVO(Coupon coupon) {
        CouponVO vo = new CouponVO();
        BeanUtils.copyProperties(coupon, vo, "scopeIds", "claimLevelIds");
        vo.setScopeIds(parseIds(coupon.getScopeIds()));
        vo.setClaimAudience(StringUtils.hasText(coupon.getClaimAudience()) ? coupon.getClaimAudience() : "all");
        vo.setClaimLevelIds(parseIds(coupon.getClaimLevelIds()));
        vo.setCreatedAt(coupon.getCreateTime() != null ? DATE_TIME_FORMATTER.format(coupon.getCreateTime()) : null);
        vo.setUpdatedAt(coupon.getUpdateTime() != null ? DATE_TIME_FORMATTER.format(coupon.getUpdateTime()) : null);
        return vo;
    }

    private UserCouponVO toUserCouponVO(UserCoupon userCoupon, Coupon coupon) {
        UserCouponVO vo = new UserCouponVO();
        vo.setId(userCoupon.getId());
        vo.setCouponId(userCoupon.getCouponId());
        vo.setStatus(userCoupon.getStatus());
        vo.setUsedAt(userCoupon.getUsedAt());
        vo.setOrderId(userCoupon.getOrderId());
        vo.setCreatedAt(userCoupon.getCreateTime() != null ? DATE_TIME_FORMATTER.format(userCoupon.getCreateTime()) : null);
        if (coupon != null) {
            vo.setCouponName(coupon.getName());
            vo.setCouponType(coupon.getType());
            vo.setCouponValue(coupon.getValue());
            vo.setMinOrderAmount(coupon.getMinOrderAmount());
            vo.setStartTime(coupon.getStartTime());
            vo.setEndTime(coupon.getEndTime());
        }
        return vo;
    }

    private String joinIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return null;
        return ids.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private List<Long> parseIds(String raw) {
        List<Long> ids = new ArrayList<>();
        if (!StringUtils.hasText(raw)) return ids;
        for (String s : raw.split(",")) {
            try {
                ids.add(Long.parseLong(s.trim()));
            } catch (NumberFormatException ignored) {
            }
        }
        return ids;
    }

    private int nullToZero(Integer value) {
        return value == null ? 0 : value;
    }
}
