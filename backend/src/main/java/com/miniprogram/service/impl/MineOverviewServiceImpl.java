package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.dto.member.MemberInfoVO;
import com.miniprogram.dto.mine.MineOverviewVO;
import com.miniprogram.dto.planet.MainPlanetVO;
import com.miniprogram.entity.ContentComment;
import com.miniprogram.entity.ContentFavorite;
import com.miniprogram.entity.InviteRelation;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.Question;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.ContentCommentMapper;
import com.miniprogram.mapper.ContentFavoriteMapper;
import com.miniprogram.mapper.InviteRelationMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.QuestionMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.MemberPointsService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.MineOverviewService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.util.PublicMediaUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MineOverviewServiceImpl implements MineOverviewService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Value("${file.base-url:https://api.zfculture.site}")
    private String fileBaseUrl;

    private final UserMapper userMapper;
    private final MemberPointsService memberPointsService;
    private final MembershipAccessService membershipAccessService;
    private final ContentFavoriteMapper contentFavoriteMapper;
    private final ContentCommentMapper contentCommentMapper;
    private final QuestionMapper questionMapper;
    private final InviteRelationMapper inviteRelationMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final SystemConfigService systemConfigService;

    @Override
    public MineOverviewVO getOverview(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            MineOverviewVO empty = new MineOverviewVO();
            empty.setUserId(userId);
            empty.setPoints(0);
            empty.setContinuousSignDays(0);
            empty.setJoinDays(0);
            empty.setMemberActive(false);
            empty.setPlatformMemberActive(false);
            empty.setPlanetMemberActive(false);
            empty.setPlatformExpireText("");
            empty.setPlanetExpireText("");
            empty.setFavoriteCount(0);
            empty.setNoteCount(0);
            empty.setFollowCount(0);
            empty.setUnusedCouponCount(0);
            empty.setQuestionCount(0);
            empty.setInviteCount(0);
            empty.setPendingOrderCount(0);
            return empty;
        }

        MemberInfoVO member = memberPointsService.getMemberInfo(userId);
        MineOverviewVO vo = new MineOverviewVO();
        vo.setUserId(userId);
        vo.setNickname(StringUtils.hasText(user.getNickname()) ? user.getNickname() : member.getNickname());
        String rawAvatar = StringUtils.hasText(user.getAvatarUrl()) ? user.getAvatarUrl() : member.getAvatarUrl();
        vo.setAvatarUrl(PublicMediaUrl.normalize(rawAvatar, fileBaseUrl));
        vo.setLevelName(member.getLevelName());
        vo.setPoints(member.getPoints() == null ? 0 : member.getPoints());
        vo.setContinuousSignDays(member.getContinuousSignDays() == null ? 0 : member.getContinuousSignDays());
        vo.setJoinDays(joinDays(user.getCreateTime()));
        vo.setUnusedCouponCount(member.getUnusedCouponCount() == null ? 0 : member.getUnusedCouponCount());
        vo.setFollowCount(0);

        boolean platformActive = membershipAccessService.hasPlatformMembership(user.getId());
        MainPlanetVO mainPlanet = membershipAccessService.resolveMainPlanet(user.getId());
        String planetId = mainPlanet != null && StringUtils.hasText(mainPlanet.getPlanetId())
                ? mainPlanet.getPlanetId().trim()
                : membershipAccessService.resolveDefaultPlanetId();
        boolean planetActive = membershipAccessService.hasPlanetMembership(user.getId(), planetId);

        LocalDateTime platformExpire = membershipAccessService.findActiveExpireAt(user.getId(), "platform", null);
        if (platformExpire == null && platformActive && user.getMemberExpireAt() != null) {
            platformExpire = user.getMemberExpireAt();
        }
        LocalDateTime planetExpire = membershipAccessService.findActiveExpireAt(user.getId(), "planet", planetId);

        vo.setMemberActive(platformActive);
        vo.setPlatformMemberActive(platformActive);
        vo.setPlanetMemberActive(planetActive);
        vo.setPlatformExpireText(platformActive ? formatExpireLabel("平台会员", platformExpire) : "");
        vo.setPlanetExpireText(planetActive ? formatExpireLabel("本星球会员", planetExpire) : "");
        if (platformExpire != null) {
            vo.setMemberExpireAt(platformExpire.toLocalDate().format(DAY));
        } else if (platformActive && user.getMemberExpireAt() != null) {
            vo.setMemberExpireAt(user.getMemberExpireAt().toLocalDate().format(DAY));
        }

        vo.setFavoriteCount(countInt(contentFavoriteMapper.selectCount(new LambdaQueryWrapper<ContentFavorite>()
                .eq(ContentFavorite::getUserId, userId))));
        vo.setNoteCount(countInt(contentCommentMapper.selectCount(new LambdaQueryWrapper<ContentComment>()
                .eq(ContentComment::getUserId, userId))));
        vo.setQuestionCount(countInt(questionMapper.selectCount(new LambdaQueryWrapper<Question>()
                .eq(Question::getUserId, userId))));
        vo.setInviteCount(countInt(inviteRelationMapper.selectCount(new LambdaQueryWrapper<InviteRelation>()
                .eq(InviteRelation::getInviterId, userId))));
        vo.setPendingOrderCount(countInt(orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .eq(Order::getStatus, "pending_payment"))));

        vo.setLearn(resolveLearn(userId));
        String planetTitle = planetTitle();
        if (mainPlanet != null && mainPlanet.getCommunity() != null
                && StringUtils.hasText(mainPlanet.getCommunity().getTitle())) {
            planetTitle = mainPlanet.getCommunity().getTitle();
        }
        vo.setPlanet(resolvePlanet(planetActive, planetExpire, planetTitle));
        return vo;
    }

    private static int countInt(Long n) {
        if (n == null || n <= 0) return 0;
        return n > Integer.MAX_VALUE ? Integer.MAX_VALUE : n.intValue();
    }

    private static int joinDays(LocalDateTime created) {
        if (created == null) return 0;
        long days = ChronoUnit.DAYS.between(created.toLocalDate(), LocalDate.now());
        return (int) Math.max(days, 0);
    }

    private MineOverviewVO.LearnItem resolveLearn(Long userId) {
        try {
            List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                    .eq(Order::getUserId, userId)
                    .in(Order::getStatus, "paid", "completed", "shipped")
                    .orderByDesc(Order::getId)
                    .last("LIMIT 8"));
            for (Order order : orders) {
                List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                        .eq(OrderItem::getOrderId, order.getId()));
                for (OrderItem item : items) {
                    if (item.getProductId() == null) continue;
                    Product product = productMapper.selectById(item.getProductId());
                    if (product == null) continue;
                    String type = ProductTypes.normalizeOne(product.getProductType());
                    if (ProductTypes.COLUMN.equals(type)
                            || ProductTypes.DIGITAL.equals(type)
                            || ProductTypes.EBOOK.equals(type)
                            || "course".equals(type)) {
                        MineOverviewVO.LearnItem learn = new MineOverviewVO.LearnItem();
                        learn.setProductId(product.getId());
                        learn.setTitle(StringUtils.hasText(item.getProductName()) ? item.getProductName() : product.getName());
                        learn.setCover(StringUtils.hasText(item.getProductImage()) ? item.getProductImage() : product.getMainImage());
                        return learn;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("resolve learn item failed: {}", e.getMessage());
        }
        return null;
    }

    private MineOverviewVO.PlanetItem resolvePlanet(boolean active, LocalDateTime expireAt, String title) {
        MineOverviewVO.PlanetItem planet = new MineOverviewVO.PlanetItem();
        planet.setActive(active);
        planet.setTitle(StringUtils.hasText(title) ? title : "暖阁星球");
        if (active && expireAt != null) {
            long remain = ChronoUnit.DAYS.between(LocalDate.now(), expireAt.toLocalDate());
            planet.setRemainDays((int) Math.max(remain, 0));
        }
        return planet;
    }

    private static String formatExpireLabel(String label, LocalDateTime expireAt) {
        if (expireAt == null) {
            return label + "有效（终身）";
        }
        return label + "至 " + expireAt.toLocalDate().format(DAY);
    }

    private String planetTitle() {
        try {
            String raw = systemConfigService.getConfigValue("planet_config");
            if (!StringUtils.hasText(raw) || !raw.trim().startsWith("{")) {
                return "暖阁星球";
            }
            com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(raw);
            String title = node.path("title").asText("");
            if (!StringUtils.hasText(title)) title = node.path("name").asText("");
            return StringUtils.hasText(title) ? title : "暖阁星球";
        } catch (Exception e) {
            return "暖阁星球";
        }
    }
}
