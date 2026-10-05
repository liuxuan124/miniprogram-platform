<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">用户</h1>
        <div class="sub">{{ tabSub }}</div>
      </div>
      <div class="actions">
        <button v-if="tab === 'list'" type="button" class="btn" :loading="exporting" @click="doExport">导出</button>
        <button v-if="tab === 'roles'" type="button" class="btn primary" @click="openRoleForm()">
          <MiniIcon name="plus" :size="15" />新建角色
        </button>
        <button v-if="tab === 'segs'" type="button" class="btn primary" @click="openSegForm()">
          <MiniIcon name="plus" :size="15" />新建分群
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button type="button" :class="{ on: tab === 'list' }" @click="tab = 'list'">用户列表</button>
      <button type="button" :class="{ on: tab === 'roles' }" @click="tab = 'roles'; loadRoles()">角色标签</button>
      <button type="button" :class="{ on: tab === 'segs' }" @click="tab = 'segs'; loadSegs()">分群与触达</button>
    </div>

    <!-- 用户列表 -->
    <template v-if="tab === 'list'">
      <!-- V119 重复账号排查模式：按钮与提示条合一，激活态高亮并可退出 -->
      <div v-if="dupMode" class="hint dup-on">
        <MiniIcon name="merge" :size="16" />
        <span>当前正展示待合并的重复用户（共 {{ dupGroupCount }} 组 / {{ total }} 个账号，已清空角色、来源、会员与搜索条件）</span>
        <button type="button" class="btn sm" @click="exitDupMode">退出重复模式</button>      </div>
      <div v-else-if="dupHint" class="hint warn">
        <MiniIcon name="merge" :size="16" />
        <span>{{ dupHint }}</span>
        <button type="button" class="btn sm primary" @click="enterDupMode">查看重复</button>
      </div>

      <!-- V121 紧凑指标栏：单行，替代原来 4 张大卡（3 个还是断点值，纯占 120px 空白）。
           stats 拿不到时整条隐藏，而不是摆一排破折号。 -->
      <div v-if="!statsEmpty" class="mbar">
        <div v-for="s in statsTiles" :key="s.label" class="mbar-item">
          <span class="mbar-l">{{ s.label }}</span>
          <b class="mbar-v">{{ s.value }}</b>
          <span v-if="s.delta" class="mbar-d" :class="s.deltaUp ? 'up' : 'down'">{{ s.delta }}</span>
        </div>
      </div>
      <div v-else-if="statsError" class="faint">概览统计暂不可用，不影响下方列表操作</div>

      <!-- V121 筛选压成一行：搜索 + 会员状态 + 账号来源 + 角色。
           来源/角色的 0 计数项收进「更多」，不再常驻占位（原来 3 行把表格推下半屏）。 -->
      <div class="filters">
        <label class="search">
          <MiniIcon name="search" :size="15" />
          <input
            v-model="keyword"
            type="search"
            placeholder="昵称、手机后四位或标签"
            :disabled="dupMode"
            @keyup.enter="fetchUsers"
          />
        </label>
        <button
          v-for="c in payChips"
          :key="c.k"
          type="button"
          class="chip"
          :class="{ on: payFilter === c.k }"
          :disabled="dupMode"
          @click="payFilter = c.k; fetchUsers()"
        >{{ c.l }}</button>

        <span class="fdiv" />

        <!-- V116 账号来源：把「真实注册用户」和「后台配置/联调账号」分开，避免统计被污染 -->
        <span class="faint" style="font-size:12px">来源</span>
        <button
          type="button"
          class="chip"
          :class="{ on: !accountFilter }"
          :disabled="dupMode"
          @click="setAccountFilter('')"
        >全部</button>
        <button
          v-for="a in accountChips"
          :key="a.k"
          type="button"
          class="chip"
          :class="{ on: accountFilter === a.k }"
          :disabled="dupMode"
          :title="dupMode ? '重复排查模式下不可筛选，退出后可用' : a.tip"
          @click="setAccountFilter(a.k)"
        >
          {{ a.l }}
          <span v-if="a.n !== undefined" class="faint" style="margin-left: 3px">{{ a.n }}</span>
        </button>
        <button
          v-if="zeroAccountChips.length"
          type="button"
          class="link"
          style="font-size:12px"
          @click="moreFilters = !moreFilters"
        >{{ moreFilters ? '收起' : '更多来源' }}（{{ zeroAccountChips.length }}）</button>
        <template v-if="moreFilters">
          <button
            v-for="a in zeroAccountChips"
            :key="a.k"
            type="button"
            class="chip zero"
            :class="{ on: accountFilter === a.k }"
            :disabled="dupMode"
            :title="a.tip"
            @click="setAccountFilter(a.k)"
          >{{ a.l }} <span class="faint">{{ a.n }}</span></button>
        </template>

        <!-- V114 角色筛选：作者/主理人/编辑等，点一下就把人筛出来，不用再单独建分群 -->
        <template v-if="roles.length">
          <span class="fdiv" />
          <span class="faint" style="font-size:12px">角色</span>
          <button
            type="button"
            class="chip"
            :class="{ on: !roleFilterId }"
            :disabled="dupMode"
            @click="setRoleFilter(null)"
          >全部</button>
          <button
            v-for="r in visibleRoleChips"
            :key="r.id"
            type="button"
            class="chip"
            :class="{ on: roleFilterId === r.id }"
            :disabled="dupMode"
            :title="dupMode ? '重复排查模式下不可筛选，退出后可用' : (r.description || r.name)"
            @click="setRoleFilter(r.id)"
          >
            <span class="pdot" :style="{ background: r.color || '#c08e6e', width: '8px', height: '8px' }" />
            {{ r.name }}
            <span class="faint" style="margin-left: 3px">{{ r.userCount }}</span>
          </button>
          <button
            v-if="hiddenRoleChips.length"
            type="button"
            class="link"
            style="font-size:12px"
            @click="moreFilters = !moreFilters"
          >{{ moreFilters ? '收起' : '更多角色' }}（{{ hiddenRoleChips.length }}）</button>
          <template v-if="moreFilters">
            <button
              v-for="r in hiddenRoleChips"
              :key="r.id"
              type="button"
              class="chip zero"
              :class="{ on: roleFilterId === r.id }"
              :disabled="dupMode"
              :title="r.description || r.name"
              @click="setRoleFilter(r.id)"
            >
              <span class="pdot" :style="{ background: r.color || '#c08e6e', width: '8px', height: '8px' }" />
              {{ r.name }} <span class="faint">{{ r.userCount }}</span>
            </button>
          </template>
        </template>
      </div>

      <div v-if="listError" class="empty-box">{{ listError }} <button type="button" class="btn sm" @click="fetchUsers">重试</button></div>
      <div v-else class="group">
        <div class="chead">
          <input type="checkbox" :checked="allSelected" @change="toggleAll" aria-label="全选" />
          <span style="flex:1;padding-left:0">用户</span>
          <span class="c-pay">账号来源</span>
          <span class="c-pay">付费会员</span>
          <span class="c-lv">角色身份</span>
          <span class="c-num sortable" :class="{ sorted: sortBy === 'points' }" @click="toggleSort('points')">
            积分<i class="sarrow" :class="arrowCls('points')" />
          </span>
          <span class="c-num sortable" :class="{ sorted: sortBy === 'spend' }" @click="toggleSort('spend')">
            累计消费<i class="sarrow" :class="arrowCls('spend')" />
          </span>
          <span class="c-num sortable" :class="{ sorted: sortBy === 'orders' }" @click="toggleSort('orders')">
            订单<i class="sarrow" :class="arrowCls('orders')" />
          </span>
          <span class="ctime sortable" :class="{ sorted: sortBy === 'lastVisit' }" @click="toggleSort('lastVisit')">
            最近访问<i class="sarrow" :class="arrowCls('lastVisit')" />
          </span>
          <span class="ctime sortable" :class="{ sorted: sortBy === 'created' }" @click="toggleSort('created')">
            注册<i class="sarrow" :class="arrowCls('created')" />
          </span>
          <span class="c-act">操作</span>
        </div>
        <div v-if="!users.length" class="muted" style="padding:28px;text-align:center">
          <template v-if="dupMode">未发现重复账号（没有两个账号共用同一手机号）</template>
          <template v-else>没有符合条件的用户</template>
        </div>
        <div v-for="u in users" :key="u.id" class="crow" :class="{ sel: selectedIds.includes(u.id) }">
          <input type="checkbox" :checked="selectedIds.includes(u.id)" @change="toggleSel(u.id)" />
          <button type="button" class="ucell" @click="openDetail(u)">
            <span class="uav" :style="{ width: '36px', height: '36px', background: toneOf(u.id) }">
              {{ (u.nickname || '?').charAt(0) }}
            </span>
            <span style="min-width:0">
              <b>
                {{ u.nickname || '未命名用户' }}
                <span v-if="u.openid" class="faint oidtail" :title="'OpenID：' + u.openid">
                  ····{{ u.openid.slice(-4) }}
                </span>
              </b>
              <span class="faint">
                <span
                  v-if="u.phone"
                  class="phone"
                  :title="revealedPhones.has(u.id) ? '点击复制完整手机号' : '点击显示完整手机号'"
                  @click.stop="togglePhone(u.id)"
                >{{ revealedPhones.has(u.id) ? u.phone : maskPhone(u.phone) }}</span>
                <template v-if="u.sourceLabel && u.sourceLabel !== '未知'">
                  <template v-if="u.phone"> · </template>{{ u.sourceLabel }}
                </template>
                <template v-if="!u.phone && (!u.sourceLabel || u.sourceLabel === '未知')">未绑手机号</template>
              </span>
            </span>
          </button>
          <div class="c-pay">
            <span class="tag" :class="accountTagClass(u.accountType)">{{ u.accountTypeLabel || '未知' }}</span>
          </div>
          <div class="c-pay">
            <span class="tag" :class="u.planName ? 't-live' : 't-draft'">
              {{ u.planName || '非会员' }}
              <span v-if="u.expireAt" class="faint">· {{ shortDate(u.expireAt) }}</span>
            </span>
          </div>
          <div class="c-lv">
            <span v-for="r in u.roleTagNames" :key="r" class="tag t-acc" style="margin-right: 4px">{{ r }}</span>
            <span v-if="!u.roleTagNames.length && u.creatorRole" class="tag t-draft">{{ creatorRoleLabel(u.creatorRole) }}</span>
            <span v-if="!u.roleTagNames.length && !u.creatorRole" class="faint">—</span>
          </div>
          <div class="c-num">{{ u.points ?? 0 }}</div>
          <div class="c-num">{{ money(u.spend ?? u.totalSpend) }}</div>
          <div class="c-num">{{ u.orders ?? 0 }}</div>
          <div class="ctime faint" :title="fullTime(u.lastVisit)">{{ relTime(u.lastVisit) }}</div>
          <div class="ctime faint" :title="fullTime(u.createdAt || u.joined)">{{ relTime(u.createdAt || u.joined) }}</div>
          <div class="c-act">
            <button type="button" class="link" @click="openDetail(u)">详情</button>
            <button
              type="button"
              class="link"
              :disabled="!!dupMode"
              :title="dupMode ? '重复排查模式下不可操作，退出后可用' : '赠送会员'"
              @click="giftOne(u)"
            >赠送</button>
            <button
              type="button"
              class="link"
              :disabled="!!dupMode"
              title="打角色标签"
              @click="tagOne(u)"
            >标签</button>
            <button type="button" class="link" title="更多操作" @click="toggleRowMenu(u.id)">更多</button>
            <div v-if="rowMenuId === u.id" class="rowmenu" @click.stop>
              <button type="button" class="link" @click="openDetail(u); rowMenuId = null">用户画像</button>
              <button
                type="button"
                class="link"
                @click="rowBan(u); rowMenuId = null"
              >{{ bannedIds.has(u.id) ? '解除封禁' : '封禁账号' }}</button>
              <button
                v-if="(u.duplicateCount ?? 1) >= 2"
                type="button"
                class="link"
                @click="openMergeFor(u); rowMenuId = null"
              >合并重复账号…</button>
              <button
                v-if="canDeleteUser"
                type="button"
                class="link danger"
                @click="doDelete(u); rowMenuId = null"
              >删除账号</button>
            </div>
          </div>
        </div>
      </div>

      <!-- V121 分页：以前固定 current:1/size:50，数据涨上去就只能靠搜索框找人 -->
      <div class="pager">
        <span class="faint">
          <template v-if="dupMode">重复模式：{{ total }} 个账号命中（同手机号 ≥2）</template>
          <template v-else>共 {{ total }} 人</template>
        </span>
        <el-pagination
          v-if="!dupMode && total > size"
          v-model:current-page="current"
          v-model:page-size="size"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="sizes, prev, pager, next"
          background
          @current-change="fetchUsers"
          @size-change="onSizeChange"
        />
      </div>

      <!-- V121 批量操作栏移到表格下方：原来在表格上方且 sticky top:72px，
           在表格中段勾选时用户视线在下方，往回滚才看得到，表现为「勾了没反应」。
           勾选后自动滚入视口，操作闭环才算成立。 -->
      <div v-if="selectedIds.length" class="bulk" ref="bulkBar">
        <b>已选择 {{ selectedIds.length }} 人</b>
        <button type="button" class="btn sm" @click="bulkTagOpen = true">
          <MiniIcon name="tag" :size="14" />批量打标签
        </button>
        <button type="button" class="btn sm" @click="giftOpen = true">
          <MiniIcon name="gift" :size="14" />批量赠送会员
        </button>
        <button type="button" class="btn sm" @click="openBulkReach">
          <MiniIcon name="send" :size="14" />批量发订阅消息
        </button>
        <button type="button" class="btn sm" @click="doBulkExport">
          <MiniIcon name="receipt" :size="14" />批量导出
        </button>
        <button type="button" class="link" style="margin-left:auto" @click="selectedIds = []">取消选择</button>
      </div>
    </template>

    <!-- 角色标签（V114：is_role=1 的标签，可自由增删改） -->
    <template v-else-if="tab === 'roles'">
      <div v-if="roleError" class="empty-box">
        {{ roleError }}
        <button type="button" class="btn sm" @click="loadRoles">重试</button>
      </div>
      <div v-else-if="!roles.length" class="empty-box">
        暂无角色标签。点右上角「新建角色」创建（例如：主理人 / 星球主理人 / 编辑 / 特约作者 / 运营）。
      </div>
      <div v-else class="group">
        <div class="chead">
          <span style="width:40px;padding:0">色</span>
          <span style="width:140px;padding:0">角色名</span>
          <span style="width:120px;padding:0">代码</span>
          <span style="flex:1;padding:0">说明</span>
          <span style="width:70px">人数</span>
          <span style="width:120px">操作</span>
        </div>
        <div v-for="r in roles" :key="r.id" class="crow">
          <span class="pdot" :style="{ background: r.color || 'var(--acc)', width: '20px', height: '20px' }" />
          <b style="width:140px;font-weight:500">{{ r.name }}</b>
          <code class="faint" style="width:120px">{{ r.roleCode || '—' }}</code>
          <span class="faint" style="flex:1">{{ r.description || '—' }}</span>
          <span style="width:70px">
            <button type="button" class="link" @click="setRoleFilter(r.id)">{{ r.userCount }} 人</button>
          </span>
          <span style="width:120px;display:flex;gap:6px">
            <button type="button" class="link" @click="openRoleForm(r)">编辑</button>
            <button type="button" class="link" style="color:var(--r)" @click="removeRole(r)">删</button>
          </span>
        </div>
      </div>
    </template>

    <!-- 分群 -->
    <template v-else-if="tab === 'segs'">
      <div v-if="segError" class="empty-box">{{ segError }}</div>
      <div v-else-if="!segs.length" class="empty-box">暂无分群（后端就绪后会显示预设分群）</div>
      <div v-else class="seg-grid">
        <article v-for="s in segs" :key="s.id" class="card segcard">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div>
              <h2 class="h2">{{ s.name }}</h2>
              <div class="faint" style="margin-top:4px;display:flex;align-items:center;gap:4px">
                <MiniIcon name="filter" :size="12" /> {{ s.ruleDesc || s.ruleCode || '—' }}
              </div>
            </div>
            <span class="todo-n">{{ s.memberCount ?? '—' }}</span>
          </div>
          <div class="avs">
            <span v-for="(a, i) in (s.avatars || []).slice(0, 6)" :key="i" class="uav" :style="{ width: '28px', height: '28px', background: a.tone || 'var(--ns)' }">
              {{ (a.name || '?').charAt(0) }}
            </span>
            <span v-if="!(s.avatars || []).length" class="faint">当前没有人符合 / 人数待加载</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn sm" @click="viewSeg(s)">查看名单</button>
            <button type="button" class="btn sm primary" :disabled="!(s.memberCount)" @click="doReach(s)">
              <MiniIcon name="send" :size="14" />{{ reachLabel(s.reachAction) }}
            </button>
            <button type="button" class="btn sm danger" @click="removeSeg(s)">删除</button>
          </div>
        </article>
      </div>
    </template>

    <!-- 详情抽屉 -->
    <div v-if="drawer" class="scrim right" @click.self="drawer = null">
      <aside class="drawer" role="dialog" aria-modal="true">
        <div style="display:flex;gap:12px;align-items:center">
          <span class="uav" :style="{ width: '52px', height: '52px', background: toneOf(drawer.id) }">
            {{ (drawer.nickname || '?').charAt(0) }}
          </span>
          <div style="flex:1;min-width:0">
            <div style="font-size:18px;font-weight:600">{{ drawer.nickname }}</div>
            <div class="faint">{{ drawer.phone || '—' }} · 最近访问 {{ shortDate(drawer.lastVisit) }}</div>
          </div>
          <button type="button" class="iconbtn" @click="drawer = null"><MiniIcon name="x" :size="16" /></button>
        </div>

        <section class="dsec">
          <div class="dhead"><b>账号来源</b>
            <span class="tag" :class="accountTagClass(drawer.accountType)">
              {{ drawer.accountTypeLabel || '未知' }}
            </span>
          </div>
          <div class="faint">
            <template v-if="drawer.accountType === 'test'">本地联调账号，不应计入真实用户统计</template>
            <template v-else-if="drawer.accountType === 'system'">后台创建的官方/服务账号</template>
            <template v-else-if="drawer.accountType === 'real'">用户本人微信授权登录</template>
            <template v-else>历史数据未标记</template>
          </div>
        </section>

        <section class="dsec">
          <div class="dhead"><b>付费会员</b>
            <span class="tag" :class="drawer.planName ? 't-live' : 't-draft'">{{ drawer.planName || '非会员' }}</span>
          </div>
          <div class="faint">{{ drawer.expireAt ? '到期 ' + drawer.expireAt : '还不是会员' }}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn sm" @click="selectedIds = [drawer.id]; giftOpen = true">
              <MiniIcon name="gift" :size="14" />赠送会员
            </button>
          </div>
        </section>

        <section class="dsec">
          <div class="dhead"><b>成长等级</b><span class="lv">{{ drawer.levelName || '—' }}</span></div>
          <div class="faint">{{ drawer.points ?? 0 }} 积分 · 等级只做展示，不影响阅读权限</div>
        </section>

        <section class="dsec">
          <div class="dhead"><b>运营备注</b></div>
          <textarea v-model="noteDraft" class="input" rows="2" placeholder="仅后台可见" />
          <button type="button" class="btn sm primary" :disabled="noteSaving" @click="saveNote">保存备注</button>
        </section>

        <section class="dsec">
          <div class="dhead"><b>角色身份</b></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <label v-for="r in roles" :key="r.id" class="perk">
              <input type="checkbox" :value="r.id" v-model="drawerTagIds" />
              <span>{{ r.name }}</span>
            </label>
            <span v-if="!roles.length" class="faint">请先在「角色标签」里创建角色</span>
          </div>
          <button type="button" class="btn sm" :disabled="tagSaving" @click="saveDrawerRoles">保存角色</button>
        </section>

        <!-- V120：账号安全（封禁 / 解封 / 删除 / 合并） -->
        <section class="dsec">
          <div class="dhead">
            <b>账号安全</b>
            <span class="tag" :class="drawerBanned ? 't-draft' : 't-live'">
              {{ drawerBanned ? '已封禁' : '正常' }}
            </span>
          </div>
          <div class="faint" style="margin-bottom: 8px">
            封禁会立即让该用户下线（吊销其已签发的登录凭证），重新登录也会被拦截。
          </div>
          <div v-if="!drawerBanned" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
            <input
              v-model="banReason"
              class="input"
              style="flex: 1; min-width: 160px"
              placeholder="封禁原因（选填，默认「违规」）"
            />
            <button type="button" class="btn sm danger" :disabled="banBusy" @click="doBan">
              {{ banBusy ? '处理中…' : '封禁账号' }}
            </button>
          </div>
          <button v-else type="button" class="btn sm primary" :disabled="banBusy" @click="doUnban">
            {{ banBusy ? '处理中…' : '解除封禁' }}
          </button>
          <div v-if="drawer.bannedReason" class="faint" style="margin-top: 6px">
            封禁原因：{{ drawer.bannedReason }}
          </div>
        </section>

        <!-- V120：重复账号合并。列表已带 duplicateCount，≥2 才需要合并入口 -->
        <section v-if="(drawer.duplicateCount ?? 1) >= 2" class="dsec">
          <div class="dhead"><b>重复账号</b></div>
          <div class="faint" style="margin-bottom: 8px">
            该手机号下有 {{ drawer.duplicateCount }} 个账号。合并会把从账号的积分、角色标签、
            会员到期合并到主账号，然后软删从账号。
          </div>
          <button type="button" class="btn sm" @click="openMergeFor(drawer)">合并重复账号…</button>
        </section>

        <!-- V120：删除账号。高危，单独放最后并要求二次确认 -->
        <section class="dsec">
          <div class="dhead"><b>删除账号</b></div>
          <div class="faint" style="margin-bottom: 8px">
            <template v-if="canDeleteUser">
              软删除（mp_user.deleted=1），用户立即无法登录。付费会员 / 后台配置 / 联调测试账号会被服务端拒绝。
            </template>
            <template v-else>
              当前角色无「更新会员（member:update）」权限，删除入口已隐藏。需要删除请联系超级管理员。
            </template>
          </div>
          <button
            v-if="canDeleteUser"
            type="button"
            class="btn sm danger"
            :disabled="deletingId === drawer.id"
            @click="doDelete(drawer)"
          >
            {{ deletingId === drawer.id ? '删除中…' : '删除该账号' }}
          </button>
        </section>
      </aside>
    </div>

    <!-- 赠送 -->
    <div v-if="giftOpen" class="scrim" @click.self="giftOpen = false">
      <div class="card" style="width:420px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">赠送会员</h2>
        <div class="field"><label>付费档</label>
          <select v-model="giftForm.planId" class="input">
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="field"><label>天数</label>
          <input v-model.number="giftForm.days" type="number" class="input" min="1" />
        </div>
        <div class="field"><label>原因（必填）</label>
          <input v-model="giftForm.reason" class="input" placeholder="如：高活跃体验" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="giftOpen = false">取消</button>
          <button type="button" class="btn primary" :disabled="giftSaving" @click="doGift">确认赠送</button>
        </div>
      </div>
    </div>

    <!-- V120：合并重复账号 -->
    <div v-if="mergeOpen" class="scrim" @click.self="mergeOpen = false">
      <div class="card" style="width:460px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">合并重复账号</h2>
        <div class="faint">
          选择要<b>保留的主账号</b>，其余勾中的账号会被合并进去（积分 / 角色标签 / 会员到期累加到主账号，
          从账号软删）。此操作不可撤销。
        </div>
        <div v-if="mergeGroup.length" style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto">
          <label v-for="u in mergeGroup" :key="u.id" class="perk">
            <input
              type="radio"
              name="mergeKeep"
              :checked="mergeKeepId === u.id"
              @change="mergeKeepId = u.id"
            />
            <span>
              <b>保留这个</b> · {{ u.nickname || '未命名' }} · {{ u.points ?? 0 }} 积分
              <span v-if="u.id === (drawer?.id)" class="faint">（当前查看）</span>
            </span>
            <input
              type="checkbox"
              :checked="mergeSelected.includes(u.id)"
              :disabled="mergeKeepId === u.id"
              style="margin-left:auto"
              @change="toggleMergeSel(u.id)"
            />
            <span class="faint">并入</span>
          </label>
        </div>
        <div v-else class="faint">未找到同手机号的其他账号，可能已被合并。</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="mergeOpen = false">取消</button>
          <button type="button" class="btn primary" :disabled="mergeBusy || !mergeKeepId || !mergeSelected.length" @click="doMerge">
            {{ mergeBusy ? '合并中…' : `合并 ${mergeSelected.length} 个账号` }}
          </button>
        </div>
      </div>
    </div>

    <!-- 批量打角色标签 -->
    <div v-if="bulkTagOpen" class="scrim" @click.self="bulkTagOpen = false">
      <div class="card" style="width:400px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">批量打角色标签</h2>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label v-for="r in roles" :key="r.id" class="perk">
            <input type="checkbox" :value="r.id" v-model="bulkTagIds" />
            <span>{{ r.name }}</span>
          </label>
          <span v-if="!roles.length" class="faint">请先在「角色标签」里创建角色</span>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="bulkTagOpen = false">取消</button>
          <button type="button" class="btn primary" @click="doBulkTag">应用</button>
        </div>
      </div>
    </div>

    <!-- 角色表单 -->
    <div v-if="roleFormOpen" class="scrim" @click.self="roleFormOpen = false">
      <div class="card" style="width:420px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">{{ editingRoleId ? '编辑角色' : '新建角色' }}</h2>
        <div class="field"><label>角色名</label>
          <input v-model="roleForm.name" class="input" placeholder="如：特邀讲师" />
        </div>
        <div class="field"><label>角色代码（创建后不可改）</label>
          <input v-model="roleForm.roleCode" class="input" :disabled="!!editingRoleId" placeholder="英文小写，如 lecturer" />
        </div>
        <div class="field"><label>说明</label>
          <input v-model="roleForm.description" class="input" />
        </div>
        <div class="field"><label>颜色</label>
          <input v-model="roleForm.color" type="color" class="input" style="height:40px;padding:4px" />
        </div>
        <div class="field"><label>排序（越小越靠前）</label>
          <input v-model.number="roleForm.sortOrder" type="number" class="input" min="0" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="roleFormOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveRole">保存</button>
        </div>
      </div>
    </div>

    <!-- 分群表单 -->
    <div v-if="segFormOpen" class="scrim" @click.self="segFormOpen = false">
      <div class="card" style="width:420px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">新建分群</h2>
        <div class="field"><label>名称</label><input v-model="segForm.name" class="input" /></div>
        <div class="field"><label>规则说明</label><input v-model="segForm.ruleDesc" class="input" /></div>
        <div class="field"><label>规则码</label>
          <select v-model="segForm.ruleCode" class="input">
            <option value="expire_7d">7天内到期</option>
            <option value="high_active_non_member">高活跃非会员</option>
            <option value="expired">已过期</option>
            <option value="sleep_30d">沉睡会员</option>
            <option value="default_nickname">未完善资料</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div class="field"><label>触达动作</label>
          <select v-model="segForm.reachAction" class="input">
            <option value="remind">续费提醒</option>
            <option value="gift">赠送体验</option>
            <option value="coupon">发券</option>
            <option value="content">内容推荐</option>
            <option value="profile">完善资料</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="segFormOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveSeg">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getUserList, getUserDetail, getUserStats, exportUsers } from '@/api/user'
import { getMembershipPlanList, type MembershipPlan } from '@/api/membershipPlan'
import { get, post } from '@/api/request'
import {
  listSegments,
  createSegment,
  deleteSegment,
  reachSegment,
  giftMembership,
  listDuplicateUsers,
  mergeUsers,
  reachUsers,
  listSegmentMembers,
  putUserNote,
  deleteUser,
  type MemberSegment,
} from '@/api/memberOps'
import { banUser, unbanUser, getUserBanStatus } from '@/api/moderation'
import { usePermissionStore } from '@/stores/permission'
import {
  listRoleTags,
  createRoleTag,
  updateRoleTag,
  deleteRoleTag,
  assignRoleTag,
  unassignRoleTag,
  getUserRoleTags,
  type RoleTag,
} from '@/api/roleTag'

const TONES = ['#F3D9A4', '#FCEBDD', '#E6EEFA', '#E3F3EA', '#EFE6DA', '#F3DDE6']

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const exporting = ref(false)
const tab = ref<'list' | 'segs' | 'roles'>('list')
const keyword = ref('')
const payFilter = ref('all')
/** V114：角色筛选。null=全部；数字=只看挂了该角色标签的人 */
const roleFilterId = ref<number | null>(null)
/** V116：账号来源筛选。''=全部；real/system/test */
const accountFilter = ref('')
/** V116：各来源的人数（用于 chips 上的计数） */
const accountCounts = ref<Record<string, number>>({})
const users = ref<any[]>([])
const total = ref(0)
const listError = ref('')
const selectedIds = ref<number[]>([])
const stats = ref<any>({})
const statsError = ref(false)

/* ============ V121：分页 / 排序 / 手机号脱敏 / 行内操作菜单 ============ */
const current = ref(1)
const size = ref(50)
const sortBy = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
/** 点已排序的列 → 换方向；点新列 → 该列降序（运营最先要的是「最大的」） */
function toggleSort(key: string) {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
  current.value = 1
  fetchUsers()
}
function arrowCls(key: string) {
  if (sortBy.value !== key) return 'off'
  return sortDir.value === 'asc' ? 'asc' : 'desc'
}
function onSizeChange() {
  current.value = 1
  fetchUsers()
}
/** V121：已展开明文的手机号。默认脱敏，点一下才显示，运营核对时用 */
const revealedPhones = ref<Set<number>>(new Set())
function togglePhone(id: number) {
  const next = new Set(revealedPhones.value)
  if (next.has(id)) next.delete(id)
  else {
    next.add(id)
    const u = users.value.find((x) => x.id === id)
    if (u?.phone && navigator.clipboard) navigator.clipboard.writeText(u.phone).catch(() => {})
  }
  revealedPhones.value = next
}
/** V121：行内「更多」下拉，同一时刻只开一个 */
const rowMenuId = ref<number | null>(null)
function toggleRowMenu(id: number) {
  rowMenuId.value = rowMenuId.value === id ? null : id
}
/** 封禁状态缓存：行内菜单要显示「封禁」还是「解封」，不能每行都去拉一次接口 */
const bannedIds = ref<Set<number>>(new Set())
/** V121：0 计数的来源/角色收进「更多」，避免「后台配置 0」这类空标签常驻占位 */
const moreFilters = ref(false)
const bulkBar = ref<HTMLElement | null>(null)
const dupHint = ref('')
/** V119：重复账号组数（退出重复模式后仍保留，用于提示条文案） */
const dupGroupCount = ref(0)
/**
 * V119：重复排查模式。URL 的 `dup=1` 是唯一真源 —— 组件状态全部由它派生，
 * 避免「本地 ref 与 route 各记一份」在重复点击时不一致，表现为点了没反应。
 */
const dupMode = computed(() => route.query.dup === '1')
const drawer = ref<any>(null)
const noteDraft = ref('')
const noteSaving = ref(false)
const drawerTagIds = ref<number[]>([])
const tagSaving = ref(false)

/* ============ V120：封禁 / 解封 / 删除账号 / 合并重复账号 ============ */
const permissionStore = usePermissionStore()
/** 删除是高危动作，只给 member:update（service_staff 只有 member:list，看得到按钮就点不动） */
const canDeleteUser = computed(() => permissionStore.hasPerm('member:update'))
/** 封禁走 /ops/moderation，该前缀只需登录，故不做前端拦截 */
const banBusy = ref(false)
const banReason = ref('')
const drawerBanned = ref(false)
const deleteBusy = ref(false)
const deletingId = ref<number | null>(null)
/** V120：合并弹窗。keepId 为主账号，mergeIds 为要并进去的从账号 */
const mergeOpen = ref(false)
const mergeBusy = ref(false)
const mergeKeepId = ref<number | null>(null)
const mergeSelected = ref<number[]>([])
/** V120：同手机号的账号全集（从 /users/duplicates 按 phone 反查） */
const mergeGroup = ref<any[]>([])

const segs = ref<MemberSegment[]>([])
const segError = ref('')
const segFormOpen = ref(false)
const segForm = reactive({ name: '', ruleDesc: '', ruleCode: 'custom', reachAction: 'remind' })

/* ============ V114 角色标签（取代原来的普通标签 tab） ============ */
const roles = ref<RoleTag[]>([])
const roleError = ref('')
const roleFormOpen = ref(false)
const editingRoleId = ref<number | null>(null)
const roleForm = reactive({
  name: '',
  color: '#C08E6E',
  roleCode: '',
  description: '',
  sortOrder: 100,
  status: 1,
})

const plans = ref<MembershipPlan[]>([])
const giftOpen = ref(false)
const giftSaving = ref(false)
const giftForm = reactive({ planId: 0 as number, days: 7, reason: '' })

const bulkTagOpen = ref(false)
const bulkTagIds = ref<number[]>([])

const tabSub = computed(() => {
  if (tab.value === 'segs') return '按条件自动圈人；一键触达走微信订阅消息'
  if (tab.value === 'roles') return '角色身份 = 打了这些标签的人；可自由增删改，端上按角色代码判断能力'
  return '所有注册用户都在这里，付费会员只是其中一种状态'
})

const payChips = [
  { k: 'all', l: '全部' },
  { k: 'paid', l: '付费会员' },
  { k: 'none', l: '非会员' },
]

/**
 * V116 账号来源筛选 chips。
 * 计数只用当前页数据（够运营看量级），不做全量统计 —— 那是 stats 接口的活。
 */
const accountChips = computed(() => [
  {
    k: 'real',
    l: '真实注册',
    n: accountCounts.value.real ?? 0,
    tip: '自己微信授权登录的真实用户（含作者本人）',
  },
  {
    k: 'system',
    l: '后台配置',
    n: accountCounts.value.system ?? 0,
    tip: '后台创建的官方/服务账号，非真人注册',
  },
  {
    k: 'test',
    l: '联调测试',
    n: accountCounts.value.test ?? 0,
    tip: '本地开发造的假 openid，不应计入用户统计',
  },
])

/** V121：计数为 0 的来源 chip 收进「更多来源」，默认不占首行 */
const zeroAccountChips = computed(() => accountChips.value.filter((a) => a.n === 0))
/** V121：角色同理。计数为 0 的角色点了必然空表，没必要常驻。 */
const visibleRoleChips = computed(() => roles.value.filter((r) => (r.userCount ?? 0) > 0).slice(0, 6))
const hiddenRoleChips = computed(() => roles.value.filter((r) => (r.userCount ?? 0) > 0).slice(6))

/** 来源标签配色：真实注册=绿、后台配置=蓝、联调测试=灰、未知=浅灰 */
function accountTagClass(type?: string): string {
  switch (type) {
    case 'real':
      return 't-live'
    case 'system':
      return 't-acc'
    case 'test':
      return 't-draft'
    default:
      return 't-draft'
  }
}

async function setAccountFilter(k: string) {
  accountFilter.value = k
  current.value = 1
  await fetchUsers()
}

const statsTiles = computed(() => {
  const s = stats.value || {}
  const cur = Number(s.activeUsers7d)
  const prev = Number(s.activeUsersPrev7d)
  // 只有两个窗口都有值且基准 >0 才算得出百分比；否则不显示箭头，
  // 免得出现「+Infinity%」这种把运营带沟里的数字。
  const hasDelta = Number.isFinite(cur) && Number.isFinite(prev) && prev > 0
  const pct = hasDelta ? Math.round(((cur - prev) / prev) * 100) : 0
  return [
    { label: '总用户', value: s.totalUsers ?? total.value ?? '—', delta: '', deltaUp: false },
    {
      label: '近 7 日活跃',
      value: s.activeUsers7d ?? '—',
      delta: hasDelta ? `较上周 ${pct >= 0 ? '+' : ''}${pct}%` : '',
      deltaUp: pct >= 0,
    },
    { label: '有订单用户', value: s.usersWithOrders ?? '—', delta: '', deltaUp: false },
    { label: '有效订单', value: s.totalOrders ?? '—', delta: '', deltaUp: false },
  ]
})

/** 统计接口整个失败时（不是「某项为 0」）才提示，避免摆一排破折号占版面 */
const statsEmpty = computed(() => !stats.value || Object.keys(stats.value).length === 0)

const allSelected = computed(() => users.value.length > 0 && users.value.every((u) => selectedIds.value.includes(u.id)))

function toneOf(id: number) {
  return TONES[Number(id) % TONES.length]
}
function money(n: any) {
  const v = Number(n) || 0
  return '¥' + v.toLocaleString('zh-CN')
}
function shortDate(s: any) {
  if (!s) return '—'
  return String(s).replace('T', ' ').slice(5, 10)
}

/** V121 完整时间戳，挂在 title 上。原来只有 07-28，跨年时分不清 2025 还是 2026 */
function fullTime(s: any) {
  if (!s) return '未记录'
  return String(s).replace('T', ' ').slice(0, 19)
}

/**
 * V121 相对时间。列表里 15 个人全是「07-28」这种同宽字符串，扫不出新旧；
 * 「3 小时前 / 12 天前」才能一眼看出谁在活跃、谁沉睡。
 * 超过 30 天回落到 YYYY-MM-DD，再久就只显示年份。
 */
function relTime(s: any) {
  if (!s) return '—'
  const t = new Date(String(s).replace(/-/g, '/')).getTime()
  if (Number.isNaN(t)) return String(s).slice(0, 10)
  const diff = Date.now() - t
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return String(s).replace('T', ' ').slice(0, 10)
}

/** V121 手机号脱敏：11 位显示前 3 后 4，中间 4 位掩码。非 11 位（座机/异常值）整体打码 */
function maskPhone(p: string) {
  const s = String(p || '')
  if (s.length === 11) return s.slice(0, 3) + '****' + s.slice(7)
  return s.length > 2 ? s.slice(0, 1) + '****' + s.slice(-2) : '****'
}
function reachLabel(a?: string) {
  const map: Record<string, string> = {
    remind: '发续费提醒',
    gift: '赠送体验',
    coupon: '发券',
    content: '推内容',
    profile: '提醒完善资料',
  }
  return map[a || ''] || '触达'
}

function unwrapList(res: any) {
  const d = res?.data ?? res
  if (Array.isArray(d)) return { records: d, total: d.length }
  return {
    records: d?.records || d?.list || d?.rows || [],
    total: Number(d?.total ?? d?.totalElements ?? 0),
  }
}

function toggleSel(id: number) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value = [...selectedIds.value, id]
}
function toggleAll(e: Event) {
  const on = (e.target as HTMLInputElement).checked
  selectedIds.value = on ? users.value.map((u) => u.id) : []
}

/**
 * V121：勾选后把批量栏滚进视口。
 * 批量栏在表格下方，表格有 15+ 行时它落在首屏之外 —— 用户勾完看不到任何反馈，
 * 只会以为「勾选坏了」。用 nextTick 等 DOM 出现再滚。
 */
watch(selectedIds, async (ids) => {
  if (!ids.length) return
  await nextTick()
  bulkBar.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})

async function fetchUsers() {
  loading.value = true
  listError.value = ''
  rowMenuId.value = null
  try {
    const res: any = await getUserList({
      keyword: keyword.value || undefined,
      current: current.value,
      size: size.value,
      payStatus: payFilter.value === 'all' ? undefined : payFilter.value,
      accountType: accountFilter.value || undefined,
      // V119：角色筛选与重复筛选都已下推到服务端；重复模式下只带 duplicateOnly
      roleTagId: roleFilterId.value ?? undefined,
      duplicateOnly: dupMode.value ? true : undefined,
      // V121：排序也下推到服务端。只在前端排会只排当前页，
      // 一翻页顺序就乱，运营会以为「高消费的人不见了」。
      orderBy: sortBy.value || undefined,
      orderDir: sortDir.value,
    })
    const page = unwrapList(res)
    let rows = page.records.map((r: any) => ({
      id: Number(r.id),
      // 昵称兜底：生产库大量 nickname 为 NULL，还有人把 openid 直接写进昵称字段。
      // 统一显示「未命名用户」，OpenID 缩略后四位另起一行浅色标注。
      nickname: normalizeNickname(r.nickname || r.name),
      openid: r.openid || r.openId || '',
      phone: r.phone || r.mobile || '',
      source: r.source,
      sourceLabel: r.sourceLabel || r.source_label || r.source || r.sourceChannelLabel,
      // V119：付费档名只认 planName。不再回退到 levelName ——
      // 那会把「成长等级」当「付费会员档位」显示（此前 VO 缺 planName 导致的字段代际错位）。
      planName: r.planName || r.plan_name || '',
      levelName: r.levelName || r.level_name || r.growthLevel,
      points: r.points ?? r.memberPoints ?? 0,
      spend: r.spend ?? r.totalSpend ?? r.total_amount ?? 0,
      orders: r.orders ?? r.orderCount ?? 0,
      // V114：creatorRole 是作者角色（无角色标签时的降级展示）
      creatorRole: r.creatorRole || r.creator_role || '',
      // V116：账号来源 real/system/test
      accountType: r.accountType || r.account_type || '',
      accountTypeLabel: r.accountTypeLabel || r.account_type_label || '',
      adminNote: r.adminNote || r.admin_note || '',
      lastVisit: r.lastVisit || r.last_visit || r.lastVisitAt || r.lastLoginAt,
      createdAt: r.createdAt || r.createTime || r.joined,
      expireAt: r.expireAt || r.expire_at || r.memberExpireAt,
      // V119：同手机号账号数（≥2 即重复）
      duplicateCount: Number(r.duplicateCount ?? r.duplicate_count ?? 1),
    }))
    // 顺带统计各来源人数（只统计当前页，仅供 chips 显示量级，不做精确总数）
    const counts: Record<string, number> = {}
    rows.forEach((r: any) => {
      const k = r.accountType || 'unknown'
      counts[k] = (counts[k] || 0) + 1
    })
    accountCounts.value = counts

    // 角色标签名：后端一次返回 { userId: '主理人,编辑' }，前端只做展示。
    // 筛选已在服务端完成，这里绝不能再本地过滤 —— 那会造成「表格空但底栏 total 仍是全量」。
    if (rows.length) {
      const map = await getUserRoleTags(rows.map((r: any) => r.id))
      rows.forEach((r: any) => {
        r.roleTagNames = (map[String(r.id)] || '').split(',').filter(Boolean)
      })
    }

    users.value = rows
    total.value = page.total || rows.length
  } catch (e: any) {
    listError.value = e?.message || '用户列表加载失败'
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/**
 * V121 昵称归一。
 * <p>三类要打成「未命名用户」：
 * ① 空/NULL —— 生产库 15 人里 11 个 nickname 是 NULL
 * ② 「微信用户」这类占位串 —— 后端兜底写死的，不是真人昵称
 * ③ wxid_xxx / wx_xxx —— 有人把 openid 直接存进了昵称字段
 * ④ 长度 ≥ 12 的纯 ASCII 串 —— 同上，且已排除英文名/短 ID 的误伤
 */
function normalizeNickname(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^微信用户$/i.test(s)) return ''
  if (/^wx(id)?_/i.test(s)) return ''
  if (s.length >= 12 && /^[A-Za-z0-9_\-]+$/.test(s)) return ''
  return s
}

/* ============ V121：行内操作 + 批量导出 ============ */

/** 单人赠送：预选该人，避免操作者在弹窗里再找人 */
function giftOne(u: any) {
  selectedIds.value = [u.id]
  giftOpen.value = true
}

/** 单人打标签：预选该人后复用批量弹窗 */
function tagOne(u: any) {
  selectedIds.value = [u.id]
  bulkTagOpen.value = true
}

/**
 * 行内「更多 → 封禁/解封」。
 * <p>列表 VO 不带 banned 字段，所以本行状态以「点过之后才知道」为准：
 * 点封禁 → 调封禁接口并记入 bannedIds；点解封同理。失败不写缓存，
 * 否则会出现「菜单写着解封但实际没封」的错位。
 */
async function rowBan(u: any) {
  const banned = bannedIds.value.has(u.id)
  if (!banned) {
    try {
      await ElMessageBox.confirm(
        `封禁「${u.nickname || '未命名用户'}」？该用户会立即下线且无法重新登录。`,
        '封禁账号',
        { type: 'warning', confirmButtonText: '确认封禁', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  try {
    if (banned) {
      await unbanUser(u.id)
      bannedIds.value = new Set([...bannedIds.value].filter((x) => x !== u.id))
      ElMessage.success('已解除封禁')
    } else {
      await banUser(u.id)
      bannedIds.value = new Set([...bannedIds.value, u.id])
      ElMessage.success('已封禁，该用户已下线')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || (banned ? '解封失败' : '封禁失败'))
  }
}

/**
 * V121 批量导出：只导勾选的人。
 * <p>不用后端 export 接口 —— 它按筛选条件导全量，运营要的是「这 15 个人单独存一份」。
 * 字段与列表一致，手机号同样脱敏：导出的表格大概率会外发，明文留在文件里是二次泄露。
 */
function doBulkExport() {
  const rows = users.value.filter((u) => selectedIds.value.includes(u.id))
  if (!rows.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  const header = ['昵称', '手机号', '账号来源', '付费会员', '角色', '积分', '累计消费', '订单', '最近访问', '注册时间']
  const lines = [header.join(',')]
  rows.forEach((u) => {
    const cell = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    lines.push(
      [
        u.nickname || '未命名用户',
        u.phone ? maskPhone(u.phone) : '',
        u.accountTypeLabel || '未知',
        u.planName || '非会员',
        (u.roleTagNames || []).join('/'),
        u.points ?? 0,
        u.spend ?? u.totalSpend ?? 0,
        u.orders ?? 0,
        fullTime(u.lastVisit),
        fullTime(u.createdAt || u.joined),
      ]
        .map(cell)
        .join(',')
    )
  })
  // BOM：Excel 打开 CSV 不带 BOM 会把中文认成乱码
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `已选用户_${rows.length}人.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${rows.length} 人（手机号已脱敏）`)
}

function creatorRoleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: '主理人',
    host: '星球主理人',
    editor: '编辑',
    contributor: '特约作者',
    operator: '运营',
    user: '用户',
  }
  return map[role] || role
}

/** 切角色筛选 */
async function setRoleFilter(id: number | null) {
  roleFilterId.value = id
  current.value = 1
  await fetchUsers()
}

async function loadStats() {
  try {
    const res: any = await getUserStats()
    stats.value = res?.data ?? res ?? {}
    statsError.value = !stats.value || Object.keys(stats.value).length === 0
  } catch {
    stats.value = {}
    statsError.value = true
  }
}

/**
 * V119：把与「重复账号」互斥的筛选条件全部归位。
 *
 * 抽成纯函数是有意的：进入模式（enterDupMode）、路由 watch、直连 URL（onMounted）
 * 三条路径都要做同一件事，之前是三处各抄一遍，改漏一处就复现「表格空但看不出原因」。
 * 纯函数形态也让 scripts/qa/test-member-dup-mode.js 能直接求值验证。
 */
function resetFiltersFor(state: {
  keyword: string
  payFilter: string
  accountFilter: string
  roleFilterId: number | null
  selectedIds: number[]
}) {
  state.keyword = ''
  state.payFilter = 'all'
  state.accountFilter = ''
  state.roleFilterId = null
  state.selectedIds = []
}

/**
 * 把纯函数作用到组件状态。
 *
 * 传的是 ref 容器本身（不是 ref.value）——纯函数写 `state.keyword = ''` 时，
 * Vue 的 ref 对象通过 setter 写回内部值，模板才会更新。
 * 若传 `keyword.value` 拿到的是字符串副本，改它对组件状态毫无影响。
 */
function resetFilters() {
  resetFiltersFor({
    get keyword() {
      return keyword.value
    },
    set keyword(v: string) {
      keyword.value = v
    },
    get payFilter() {
      return payFilter.value
    },
    set payFilter(v: string) {
      payFilter.value = v
    },
    get accountFilter() {
      return accountFilter.value
    },
    set accountFilter(v: string) {
      accountFilter.value = v
    },
    get roleFilterId() {
      return roleFilterId.value
    },
    set roleFilterId(v: number | null) {
      roleFilterId.value = v
    },
    get selectedIds() {
      return selectedIds.value
    },
    set selectedIds(v: number[]) {
      selectedIds.value = v
    },
  })
}

/** V119：只统计重复账号组数，用于顶部提示条文案。
 * <p>注意：这里<b>不</b>再承担「点击后筛选列表」的职责 —— 那是 enterDupMode 的活。
 * 此前两者是同一个函数，点击只重写一次提示文案，列表纹丝不动，表现为「点了没反应」。
 */
async function loadDups() {
  try {
    const res: any = await listDuplicateUsers()
    const rows = res?.data ?? res
    const n = Array.isArray(rows) ? rows.length : 0
    dupGroupCount.value = n
    dupHint.value = n ? `${n} 组重复账号待合并` : ''
  } catch {
    dupGroupCount.value = 0
    dupHint.value = ''
  }
}

/**
 * V119：进入重复排查模式。
 * <p>关键动作是<b>先把互斥筛选全部归位</b>，再改路由。
 * 顺序不能反：先改路由会让 watch 立刻触发 fetchUsers，拿到的是还没清干净的筛选组合，
 * 结果就是 role=operator && duplicate=true 交集为空 —— 表格照样空。
 */
async function enterDupMode() {
  if (dupMode.value) {
    // 重复点击：URL 已是 dup=1，直接刷新列表并给一次反馈，不再重复 push 相同 query
    await fetchUsers()
    ElMessage.info('已刷新重复账号列表')
    return
  }
  const hadFilters =
    !!roleFilterId.value || !!accountFilter.value || payFilter.value !== 'all' || !!keyword.value
  resetFilters()
  if (!dupGroupCount.value) await loadDups()
  await router.push({ query: { ...route.query, dup: '1' } })
  if (hadFilters) ElMessage.info('已清空角色 / 来源 / 会员 / 搜索条件，避免与重复筛选冲突')
}

/** V119：退出重复模式，恢复全量列表。筛选保持「全部」，不猜测运营退出前的意图。 */
async function exitDupMode() {
  if (!dupMode.value) return
  const next = { ...route.query }
  delete next.dup
  await router.push({ query: next })
}

async function doExport() {
  exporting.value = true
  try {
    const res: any = await exportUsers({ keyword: keyword.value || undefined })
    const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data || res])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function openDetail(u: any) {
  try {
    const res: any = await getUserDetail(u.id)
    const d = res?.data ?? res ?? u
    drawer.value = { ...u, ...d, id: u.id }
    noteDraft.value = d.adminNote || d.admin_note || u.adminNote || ''
    if (!roles.value.length) await loadRoles()
    // 该用户当前挂了哪些角色：用 of-users 反查（返回 '主理人,编辑' 形式的名字串）
    drawerTagIds.value = await loadUserRoleIds(u.id)
  } catch {
    drawer.value = u
    noteDraft.value = u.adminNote || ''
  }
  banReason.value = ''
  await loadBanStatus(u.id)
}

/**
 * V120：拉封禁状态。
 *
 * 走 ban-status 接口而不是直接读 drawer.status —— 后者只在用户列表 VO 里可能带，
 * 且历史上出现过字段代际错位（V119 的 planName/levelName 事件），这里以专用接口为准。
 * 拉失败静默降级成「正常」，不阻塞抽屉打开。
 */
async function loadBanStatus(userId: number) {
  try {
    const res: any = await getUserBanStatus(userId)
    const d = res?.data ?? res ?? {}
    drawerBanned.value = !!d.banned
    // ban-status 的 reason 是给登录页看的整句提示（「账号已被封禁：xxx」），
    // 这里只要原因本身，去掉前缀避免抽屉里出现「封禁原因：账号已被封禁：xxx」。
    if (drawer.value) {
      drawer.value.bannedReason = String(d.reason || '')
        .replace(/^账号已被封禁[:：]\s*/, '')
        .trim()
    }
  } catch {
    drawerBanned.value = false
  }
}

/** V120：封禁。失败时把服务端原因原样抛出（已是中文提示） */
async function doBan() {
  if (!drawer.value) return
  banBusy.value = true
  try {
    await banUser(drawer.value.id, banReason.value.trim() || undefined)
    ElMessage.success('已封禁，该用户已下线')
    banReason.value = ''
    await loadBanStatus(drawer.value.id)
    await fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '封禁失败')
  } finally {
    banBusy.value = false
  }
}

/** V120：解封 */
async function doUnban() {
  if (!drawer.value) return
  banBusy.value = true
  try {
    await unbanUser(drawer.value.id)
    ElMessage.success('已解除封禁')
    await loadBanStatus(drawer.value.id)
    await fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '解封失败')
  } finally {
    banBusy.value = false
  }
}

/**
 * V120：删除账号。
 *
 * 二次确认里写清后果：软删 + 立即下线 + 不可恢复。
 * 删除成功后关闭抽屉并刷新列表 —— 留着抽屉会显示一个已经不存在的账号。
 */
async function doDelete(u: any) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${u.nickname || '未命名'}」？\n\n` +
        `· 会软删除账号（mp_user.deleted=1），并立即吊销其已签发的登录凭证\n` +
        `· 用户将无法再登录，历史订单/内容会保留但与该账号脱钩\n` +
        `· 此操作不可撤销`,
      '删除账号',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }
  deletingId.value = u.id
  try {
    await deleteUser(u.id, '后台手动删除')
    ElMessage.success('已删除该账号')
    if (drawer.value?.id === u.id) drawer.value = null
    selectedIds.value = selectedIds.value.filter((x) => x !== u.id)
    await fetchUsers()
    await loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  } finally {
    deletingId.value = null
  }
}

/**
 * V120：打开合并弹窗。
 *
 * 数据源用 /users/duplicates（按 phone 分组）反查，而不是在前端按 phone 过滤当前页 ——
 * 当前页可能只加载了 50 条，同组另一个账号未必在页内，前端过滤会漏人。
 */
async function openMergeFor(u: any) {
  mergeOpen.value = true
  mergeBusy.value = false
  mergeGroup.value = []
  mergeKeepId.value = u.id
  mergeSelected.value = []
  try {
    const res: any = await listDuplicateUsers()
    const rows = res?.data ?? res ?? []
    const list = Array.isArray(rows) ? rows : []
    const phone = u.phone || ''
    const g = list.find((x: any) => x && x.phone === phone)
    const usersInGroup: any[] = Array.isArray(g?.users) ? g.users : []
    // 补齐当前查看的账号（duplicates 只带 id/nickname/points，缺 phone 与其它字段）
    const merged = usersInGroup.map((x: any) => ({ ...x, phone }))
    if (!merged.some((x) => x.id === u.id)) {
      merged.unshift({ id: u.id, nickname: u.nickname, points: u.points, phone })
    }
    merged.sort((a, b) => Number(a.id) - Number(b.id))
    mergeGroup.value = merged
    if (merged.length < 2) {
      ElMessage.info('该手机号下只有这一个账号，无需合并')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '重复账号加载失败')
    mergeOpen.value = false
  }
}

function toggleMergeSel(id: number) {
  if (mergeSelected.value.includes(id)) {
    mergeSelected.value = mergeSelected.value.filter((x) => x !== id)
  } else {
    mergeSelected.value = [...mergeSelected.value, id]
  }
}

async function doMerge() {
  if (!mergeKeepId.value || !mergeSelected.value.length) return
  const keepId = mergeKeepId.value
  // 主账号不能同时被并入自己
  const ids = mergeSelected.value.filter((x) => x !== keepId)
  if (!ids.length) {
    ElMessage.warning('请至少选择一个要并入的账号')
    return
  }
  const keepName = mergeGroup.value.find((x) => x.id === keepId)?.nickname || `#${keepId}`
  try {
    await ElMessageBox.confirm(
      `将 ${ids.length} 个账号并入「${keepName}」？\n\n` +
        `从账号的积分、角色标签、会员到期会累加到主账号，从账号随后被软删。不可撤销。`,
      '合并重复账号',
      { type: 'warning', confirmButtonText: '确认合并', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  mergeBusy.value = true
  try {
    const res: any = await mergeUsers({ keepUserId: keepId, mergeUserIds: ids })
    const n = Number(res?.data?.merged ?? res?.merged ?? ids.length)
    ElMessage.success(`已合并 ${n} 个账号到「${keepName}」`)
    mergeOpen.value = false
    drawer.value = null
    await fetchUsers()
    await loadDups()
    await loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '合并失败')
  } finally {
    mergeBusy.value = false
  }
}

/** 取某用户已挂的角色标签 id 列表（后端返回名字串，这里按 roleCode/name 匹配回 id） */
async function loadUserRoleIds(userId: number): Promise<number[]> {
  try {
    const res: any = await getUserRoleTags([userId])
    const d = res?.data ?? res ?? {}
    const names = String(d[String(userId)] || '').split(',').filter(Boolean)
    if (!names.length) return []
    return roles.value.filter((r) => names.includes(r.name)).map((r) => r.id)
  } catch {
    return []
  }
}

async function saveNote() {
  if (!drawer.value) return
  noteSaving.value = true
  try {
    await putUserNote(drawer.value.id, noteDraft.value)
    ElMessage.success('备注已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    noteSaving.value = false
  }
}

/**
 * 保存抽屉里的角色勾选。
 * 口径是「全量对齐」：勾上的 assign，没勾的 unassign。
 * 不能用增量（跟旧标签那样只 append），否则取消勾选永远删不掉。
 */
async function saveDrawerRoles() {
  if (!drawer.value) return
  tagSaving.value = true
  const uid = drawer.value.id
  const want = new Set(drawerTagIds.value.map(Number))
  try {
    const current = await loadUserRoleIds(uid)
    // 新增
    for (const tagId of want) {
      if (!current.includes(tagId)) await assignRoleTag(tagId, [uid])
    }
    // 移除
    for (const tagId of current) {
      if (!want.has(tagId)) await unassignRoleTag(tagId, uid)
    }
    ElMessage.success('角色已更新')
    await Promise.all([fetchUsers(), loadRoles()])
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    tagSaving.value = false
  }
}

async function loadPlans() {
  try {
    const res: any = await getMembershipPlanList({ scope: 'platform' })
    plans.value = res?.data || []
    if (plans.value.length && !giftForm.planId) giftForm.planId = plans.value[0].id
  } catch {
    plans.value = []
  }
}

async function doGift() {
  if (!giftForm.reason.trim()) {
    ElMessage.warning('请填写原因')
    return
  }
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  giftSaving.value = true
  try {
    await giftMembership({
      userIds: selectedIds.value,
      planId: Number(giftForm.planId),
      days: Number(giftForm.days) || 7,
      reason: giftForm.reason,
    })
    ElMessage.success('已提交赠送')
    giftOpen.value = false
    selectedIds.value = []
    fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '赠送失败（接口可能尚未上线）')
  } finally {
    giftSaving.value = false
  }
}

async function openBulkReach() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('订阅消息文案', '批量触达', {
      confirmButtonText: '发送',
      inputPlaceholder: '简短提醒文案',
    })
    const content = (value || '').trim()
    if (!content) {
      ElMessage.warning('请填写文案')
      return
    }
    const res: any = await reachUsers(selectedIds.value, content, '运营通知')
    ElMessage.success(`已触达 ${res?.data?.reached ?? res?.reached ?? selectedIds.value.length} 人`)
  } catch {
    /* cancel */
  }
}

async function doBulkTag() {
  if (!bulkTagIds.value.length) {
    ElMessage.warning('请选择角色')
    return
  }
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  try {
    // 每个角色一次请求（后端内部已做去重，不会重复插）
    const results = await Promise.all(
      bulkTagIds.value.map((tagId) => assignRoleTag(tagId, selectedIds.value)),
    )
    const added = results.reduce((sum, r: any) => sum + Number(r?.data ?? r ?? 0), 0)
    ElMessage.success(`已为 ${selectedIds.value.length} 人新增 ${added} 个角色标签`)
    bulkTagOpen.value = false
    selectedIds.value = []
    await Promise.all([fetchUsers(), loadRoles()])
  } catch (e: any) {
    ElMessage.error(e?.message || '打角色标签失败')
  }
}

async function loadSegs() {
  segError.value = ''
  try {
    const res: any = await listSegments()
    const rows = res?.data ?? res
    segs.value = Array.isArray(rows) ? rows : []
  } catch (e: any) {
    segError.value = e?.message || '分群接口暂不可用'
    segs.value = []
  }
}

function openSegForm() {
  Object.assign(segForm, { name: '', ruleDesc: '', ruleCode: 'custom', reachAction: 'remind' })
  segFormOpen.value = true
}

async function saveSeg() {
  try {
    await createSegment({ ...segForm })
    ElMessage.success('已创建')
    segFormOpen.value = false
    loadSegs()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
}

async function removeSeg(s: MemberSegment) {
  try {
    await ElMessageBox.confirm(`删除分群「${s.name}」？`, '确认')
    await deleteSegment(s.id)
    loadSegs()
  } catch {
    /* cancel / err */
  }
}

const segmentFilterId = ref<number | null>(null)
const segmentFilterName = ref('')

async function viewSeg(s: MemberSegment) {
  tab.value = 'list'
  keyword.value = ''
  segmentFilterId.value = s.id
  segmentFilterName.value = s.name
  loading.value = true
  listError.value = ''
  try {
    const res: any = await listSegmentMembers(s.id)
    const data = res?.data ?? res
    users.value = data?.records ?? data?.list ?? []
    total.value = Number(data?.total ?? users.value.length)
  } catch (e: any) {
    listError.value = e?.message || '分群名单加载失败'
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function doReach(s: MemberSegment) {
  try {
    await ElMessageBox.confirm(`对「${s.name}」执行：${reachLabel(s.reachAction)}？`, '确认触达')
    await reachSegment(s.id, { action: s.reachAction })
    ElMessage.success('已提交触达')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '触达失败')
  }
}

async function loadRoles() {
  roleError.value = ''
  try {
    const res: any = await listRoleTags()
    const d = res?.data ?? res
    roles.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    roleError.value = (e?.message || '角色标签加载失败') + '（若提示字段不存在，说明 V114 迁移还没跑）'
    roles.value = []
  }
}

function openRoleForm(r?: RoleTag) {
  editingRoleId.value = r?.id ?? null
  Object.assign(roleForm, {
    name: r?.name || '',
    color: r?.color || '#C08E6E',
    roleCode: r?.roleCode || '',
    description: r?.description || '',
    sortOrder: r?.sortOrder ?? 100,
    status: r?.status ?? 1,
  })
  roleFormOpen.value = true
}

async function saveRole() {
  try {
    const payload = { ...roleForm, roleCode: (roleForm.roleCode || '').trim() }
    if (editingRoleId.value) await updateRoleTag(editingRoleId.value, payload)
    else await createRoleTag(payload)
    ElMessage.success('已保存')
    roleFormOpen.value = false
    loadRoles()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function removeRole(r: RoleTag) {
  try {
    await ElMessageBox.confirm(`删除角色「${r.name}」？该角色会从 ${r.userCount} 位用户身上移除。`, '确认')
    await deleteRoleTag(r.id)
    ElMessage.success('已删除')
    loadRoles()
  } catch {
    /* cancel */
  }
}

/**
 * V119：dup 参数是重复模式的唯一真源，路由一变就重新拉列表。
 * <p>用 watch 而不是只在按钮里调 fetchUsers，是为了同时覆盖三种入口：
 * ①点按钮 ②手改地址栏/刷新 ③浏览器前进后退。
 * <p>immediate 不开：onMounted 已经拉过一次，避免首屏双请求。
 */
watch(dupMode, async (on) => {
  if (on) {
    // 直连 /member/users?dup=1 或刷新进入：确保互斥筛选是干净的
    resetFilters()
  }
  await fetchUsers()
})

onMounted(async () => {
  // V121：点空白处关掉行内「更多」菜单。挂在 document 上用捕获阶段，
  // 菜单自身的 @click.stop 才拦得住，不会出现「点菜单项却先被关掉」。
  document.addEventListener('click', onDocClick, true)
  // 直连 dup=1 时先把互斥筛选归位，再拉列表（否则会拿到空交集）
  if (dupMode.value) resetFilters()
  // 先拉角色，列表里的角色列与筛选 chips 都要用
  await Promise.all([fetchUsers(), loadStats(), loadPlans(), loadRoles(), loadDups()])
  // 从「角色标签」页跳过来时带上 roleTab/roleTagId，直接落到对应视图
  if (route.query.roleTab === '1') {
    tab.value = 'roles'
  } else if (route.query.roleTagId && !dupMode.value) {
    // 重复模式与角色筛选互斥，两者同时出现必为空集
    const rid = Number(route.query.roleTagId)
    const hit = roles.value.find((r) => r.id === rid)
    if (hit) await setRoleFilter(rid)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick, true)
})

function onDocClick(e: MouseEvent) {
  if (rowMenuId.value === null) return
  const el = e.target as HTMLElement
  if (el.closest?.('.c-act')) return
  rowMenuId.value = null
}
</script>
