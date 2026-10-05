package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.*;
import com.miniprogram.service.MemberOpsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/member-ops")
@RequiredArgsConstructor
@Tag(name = "后台-用户会员运营台")
public class AdminMemberOpsController {

    private final MemberOpsService memberOpsService;

    @GetMapping("/overview")
    @Operation(summary = "会员概览聚合")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> overview() {
        return R.ok(memberOpsService.overview());
    }

    @GetMapping("/segments")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<Map<String, Object>>> segments() {
        return R.ok(memberOpsService.listSegments());
    }

    @PostMapping("/segments")
    @PreAuthorize("hasAuthority('member:list')")
    public R<UserSegment> createSegment(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.createSegment(body));
    }

    @PutMapping("/segments/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<UserSegment> updateSegment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.updateSegment(id, body));
    }

    @DeleteMapping("/segments/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> deleteSegment(@PathVariable Long id) {
        memberOpsService.deleteSegment(id);
        return R.ok();
    }

    @GetMapping("/segments/{id}/members")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> segmentMembers(@PathVariable Long id) {
        return R.ok(memberOpsService.segmentMembers(id));
    }

    @PostMapping("/segments/{id}/reach")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> reach(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.reachSegment(id, body));
    }

    @PostMapping("/users/gift")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> gift(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.gift(body));
    }

    @PostMapping("/users/merge")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> merge(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.merge(body));
    }

    @GetMapping("/users/duplicates")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<Map<String, Object>>> duplicates() {
        return R.ok(memberOpsService.listDuplicates());
    }

    @GetMapping("/users/{id}/tags")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<MemberTag>> userTags(@PathVariable Long id) {
        return R.ok(memberOpsService.getUserTags(id));
    }

    @PutMapping("/users/{id}/tags")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> putTags(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> tagIds = (List<Number>) body.get("tagIds");
        memberOpsService.putUserTags(id, tagIds);
        return R.ok();
    }

    @PostMapping("/users/{id}/tags")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> appendTags(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> tagIds = (List<Number>) body.get("tagIds");
        memberOpsService.addUserTags(id, tagIds);
        return R.ok();
    }

    @PostMapping("/users/reach")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Map<String, Object>> reachUsers(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.reachUsers(body));
    }

    @PutMapping("/users/{id}/note")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> putNote(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object note = body.get("note");
        memberOpsService.putUserNote(id, note == null ? "" : String.valueOf(note));
        return R.ok();
    }

    /**
     * V120：软删除用户账号。
     *
     * <p>权限用 {@code member:update}（V2 已入库，绑给 biz_ops + super_admin），
     * <b>刻意不用 member:list</b> —— 同模块的只读角色（service_staff）只拿到
     * member:list/member:detail，让它能看不能删。
     *
     * <p>reason 走 query 而非 body：与 ban 接口保持同一形态，前端 params 传最直接。
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('member:update')")
    public R<Map<String, Object>> deleteUser(@PathVariable Long id,
                                            @RequestParam(required = false) String reason) {
        return R.ok(memberOpsService.deleteUser(id, reason));
    }

    @GetMapping("/support/tickets")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('user:list')")
    public R<List<Map<String, Object>>> tickets(@RequestParam(required = false) String status) {
        return R.ok(memberOpsService.listTickets(status));
    }

    /** 完整往来消息。此前只有 lastText/lastReply 两个摘要字段，运营看不到上下文就敢回复。 */
    @GetMapping("/support/tickets/{id}/messages")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('user:list')")
    public R<List<Map<String, Object>>> ticketMessages(@PathVariable Long id) {
        return R.ok(memberOpsService.listTicketMessages(id));
    }

    @PostMapping("/support/tickets/{id}/reply")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('user:list')")
    public R<Void> replyTicket(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        memberOpsService.replyTicket(id, body.get("content") == null ? null : String.valueOf(body.get("content")));
        return R.ok();
    }

    @PutMapping("/support/tickets/{id}/status")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('user:list')")
    public R<Void> ticketStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        memberOpsService.updateTicketStatus(id, String.valueOf(body.getOrDefault("status", "open")));
        return R.ok();
    }

    @GetMapping("/feedback")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<Map<String, Object>>> feedback() {
        return R.ok(memberOpsService.listFeedback());
    }

    @PostMapping("/feedback/{id}/reply")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> replyFeedback(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        memberOpsService.replyFeedback(id, body.get("content") == null ? null : String.valueOf(body.get("content")));
        return R.ok();
    }

    /**
     * 社区动态（内容）管理。
     *
     * <p>V111 起「内容运营 › 动态管理」并入「社区管理 › 内容管理」，
     * 社区内容管理台成为动态的唯一管理入口，因此读写权限同时接受
     * 会员运营（member:list）与内容运营（content:list / content:update）两侧角色，
     * 避免 content_ops 在合并后丢失动态管理能力。
     */
    @GetMapping("/community/posts")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('content:list')")
    public R<List<CommunityPost>> posts(@RequestParam(required = false) String communityId) {
        return R.ok(memberOpsService.listPosts(communityId));
    }

    @PostMapping("/community/posts")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('content:update')")
    public R<CommunityPost> createPost(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.createPost(body));
    }

    @PutMapping("/community/posts/{id}")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('content:update')")
    public R<CommunityPost> updatePost(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.updatePost(id, body));
    }

    @GetMapping("/community/checkins")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<CommunityCheckin>> checkins(@RequestParam(required = false) String communityId) {
        return R.ok(memberOpsService.listCheckins(communityId));
    }

    @PostMapping("/community/checkins")
    @PreAuthorize("hasAuthority('member:list')")
    public R<CommunityCheckin> createCheckin(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.createCheckin(body));
    }

    @PutMapping("/community/checkins/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<CommunityCheckin> updateCheckin(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.updateCheckin(id, body));
    }

    @DeleteMapping("/community/checkins/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> deleteCheckin(@PathVariable Long id) {
        memberOpsService.deleteCheckin(id);
        return R.ok();
    }

    @GetMapping("/reader-groups")
    @PreAuthorize("hasAuthority('member:list')")
    public R<List<ReaderGroup>> readerGroups() {
        return R.ok(memberOpsService.listReaderGroups());
    }

    @PostMapping("/reader-groups")
    @PreAuthorize("hasAuthority('member:list')")
    public R<ReaderGroup> createReaderGroup(@RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.createReaderGroup(body));
    }

    @PutMapping("/reader-groups/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<ReaderGroup> updateReaderGroup(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(memberOpsService.updateReaderGroup(id, body));
    }

    @DeleteMapping("/reader-groups/{id}")
    @PreAuthorize("hasAuthority('member:list')")
    public R<Void> deleteReaderGroup(@PathVariable Long id) {
        memberOpsService.deleteReaderGroup(id);
        return R.ok();
    }
}
