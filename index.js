// 记忆表格 v1.2.1
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v1.2.1 启动');
    
    const V = '1.2.1';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 4;
    const AK = 'gg_api';
    const CWK = 'gg_col_widths';
    const SMK = 'gg_summarized';
    
    let UI = { c: '#9c4c4c', bc: '#ffffff', tc: '#ffffff' };
    
   const C = { 
        enabled: true, // ✨ 新增：总开关
        tableInj: true,
        tablePos: 'system',
        tablePosType: 'system_end',
        tableDepth: 0,
        autoSummary: false,
        autoSummaryFloor: 50,
        log: true, 
        pc: true,
        hideTag: true,
        filterHistory: true,
        cloudSync: true
    };
    
    let API_CONFIG = {
        enableAI: false,
        useIndependentAPI: false,
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
    };
    
    let PROMPTS = {
                tablePrompt: `🔴🔴🔴 强制要求（每次回复必须遵守）🔴🔴🔴

1. 每次回复的最末尾（所有内容和标签之后），必须输出 <Memory> 标签
2. <Memory> 标签必须在最后一行，不能有任何内容在它后面
3. 即使本次没有重要剧情，也必须输出（至少更新时间或状态）

【输出顺序示例】
✅ 正确顺序：
剧情正文...
<其他标签>...</其他标签>
<状态栏>...</状态栏>
<Memory><!-- updateRow(...) --></Memory>  ← 必须在最后！

❌ 错误顺序：
<Memory>...</Memory>
<状态栏>...</状态栏>  ← 错误！Memory 不在最后

❌ 错误示例：忘记输出 Memory 标签

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️⚠️⚠️ 重要说明 ⚠️⚠️⚠️

【总结 vs 详细表格】
1. "记忆总结"是历史数据的文字压缩版本，仅供参考，无法直接操作
2. "详细表格"是当前实际存在的数据，必须基于此操作
3. 表格可能已被清空（总结后删除），此时详细表格为空（0行）
4. ⚠️ 每次写指令前必须查看"=== 📋 当前表格状态 ==="部分：
   - 如果显示"当前有 0 行"→ 这是空表，必须用 insertRow(表索引, {0:"值",...}) 新增第0行
   - 如果显示"当前有 N 行"→ updateRow的行索引只能是 0 到 N-1
   - 绝对不要写 updateRow(0, 5, {...}) 这种超出范围的索引！

【唯一正确格式】
<Memory><!-- insertRow(表格索引, {0: "内容1", 1: "内容2", ...})
updateRow(表格索引, 行索引, {列号: "新内容"})--></Memory>

⚠️ 必须使用 <Memory> 标签（不是GaigaiMemory）！
⚠️ 指令必须用 <!-- --> 包裹！

【表格索引】
0: 主线剧情 (日期, 开始时间, 完结时间, 事件概要, 状态)
1: 支线追踪 (状态, 支线名, 开始时间, 完结时间, 事件追踪, 关键NPC)
2: 角色状态 (角色名, 状态变化, 时间, 原因, 当前位置)
3: 人物档案 (姓名, 年龄, 身份, 地点, 性格, 备注)
4: 人物关系 (角色A, 角色B, 关系描述, 情感态度)
5: 世界设定 (设定名, 类型, 详细说明, 影响范围)
6: 物品追踪 (物品名称, 物品描述, 当前位置, 持有者, 状态, 重要程度, 备注)
7: 约定 (约定时间, 约定内容, 核心角色)

【行索引规则】⭐关键⭐
1. 必须先看"当前表格状态"中的实际行数
2. updateRow 的行索引范围：0 到 (当前行数-1)
3. 如果表格为空（0行）：
   - 只能用 insertRow(表索引, {0:"值",...})  ← 推荐
   - 或者用 updateRow(表索引, 0, {0:"值",...})  ← 会自动创建第0行
4. 如果要添加新行：一律用 insertRow

【时间格式规范】
日期格式: x年x月x日（只写日期，不含具体时刻）
时刻格式: 
- 古代: 辰时(07:30)、午时(12:00)
- 现代: 上午(08:30)、下午(14:00)

【主线剧情记录规则】⭐重点⭐
1. 判断是否跨天：
   - 如果是新的一天 → 必须用 insertRow 新增一行
   - 如果还是当天 → 用 updateRow 更新当前行

2. 必须更新的字段：
   - 列0【日期】：新的一天必须填写新日期
   - 列1【开始时间】：新的一天填写当时的时刻；同一天持续推进则不改
   - 列3【事件概要】：同一天多个事件会自动用分号连接；跨天则写新事件
   - 列4【状态】：进行中/已完成/暂停

3. 时间推进逻辑：
   - 从早上到中午（同一天）→ updateRow 只写新事件到列3，系统会自动追加
   - 从晚上到第二天凌晨（跨天）→ 先 updateRow 完结前一天（填列2和列4），再 insertRow 新增第二天
   - 同一天结束 → updateRow 填写列2【完结时间】和列4【状态:已完成】

【使用示例】

✅ 第一天开始（表格为空，新增第0行）:
<Memory><!-- insertRow(0, {0: "2024年3月15日", 1: "上午(08:30)", 2: "", 3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石", 4: "进行中"})--></Memory>

✅ 同一天推进（只写新事件，系统会自动追加到列3）:
<Memory><!-- updateRow(0, 0, {3: "在迷雾森林遭遇神秘商人艾莉娅，获得线索：宝石在古神殿深处"})--></Memory>

✅ 继续推进（再次追加新事件）:
<Memory><!-- updateRow(0, 0, {3: "在森林露营休息"})--></Memory>

✅ 同一天完结（只需填写完结时间和状态）:
<Memory><!-- updateRow(0, 0, {2: "晚上(22:00)", 4: "暂停"})--></Memory>

✅ 跨天处理（完结前一天 + 新增第二天）:
<Memory><!-- updateRow(0, 0, {2: "深夜(23:50)", 4: "已完成"})
insertRow(0, {0: "2024年3月16日", 1: "凌晨(00:10)", 2: "", 3: "在古神殿继续探索，寻找宝石线索", 4: "进行中"})--></Memory>

✅ 新增支线:
<Memory><!-- insertRow(1, {0: "进行中", 1: "艾莉娅的委托", 2: "2024年3月15日·下午(14:00)", 3: "", 4: "艾莉娅请求帮忙寻找失散的妹妹", 5: "艾莉娅"})--></Memory>

✅ 新增人物档案:
<Memory><!-- insertRow(3, {0: "艾莉娅", 1: "23", 2: "神秘商人", 3: "迷雾森林", 4: "神秘冷静，知识渊博", 5: "有一个失散的妹妹，擅长占卜"})--></Memory>

✅ 新增人物关系:
<Memory><!-- insertRow(4, {0: "{{user}}", 1: "艾莉娅", 2: "委托人与受托者", 3: "中立友好，略带神秘感"})--></Memory>

✅ 新增约定:
<Memory><!-- insertRow(7, {0: "2024年3月18日前", 1: "找到失落宝石交给长老", 2: "长老"})--></Memory>

【各表格记录规则】
- 主线剧情: 按日期记录，事件概要必须含地点，同一天多事件系统会自动用分号连接
- 支线追踪: 仅记录NPC相关情节，状态必须明确（进行中/已完成/已失败）
- 角色状态: 仅记录死亡/囚禁/残废等重大变化
- 人物档案: 仅记录世界书中不存在的新角色
- 人物关系: 仅记录关键转变
- 世界设定: 仅记录世界书中不存在的新设定
- 物品追踪: 仅记录剧情关键物品
- 约定: 记录重要约定，注明时限和相关角色

【强制要求】⚠️必须遵守⚠️
1. 必须使用 <Memory> 标签（不是GaigaiMemory）
2. 指令必须用 <!-- --> 包裹
3. 列索引从0开始: {0: "值", 1: "值"}
4. ⚠️ 每次写指令前必须看"当前表格状态"，确认行数！
5. ⚠️ 表格为空时，只能写 insertRow(表索引, {0:"值",...}) 或 updateRow(表索引, 0, {...})
6. ⚠️ 不要写超出范围的行索引（比如表格只有2行，却写 updateRow(0, 5, {...})）
7. updateRow 更新事件概要时，只写本次新发生的事件，系统会自动追加
8. 全部使用过去式，客观描述
9. 主线事件概要必须包含地点信息

【常见错误❌】
❌ 看到总结说有N条数据，但没看"当前表格状态"，直接写 updateRow(0, N, ...) 
   → 正确做法：看"当前表格状态"，如果显示0行，就用 insertRow 或 updateRow(0, 0, {...})

❌ 表格为空时，写 updateRow(0, 5, {...})
   → 正确做法：insertRow(0, {0:"值",...})

❌ 跨天了但只更新时间不更新日期
   → 正确做法：新的一天必须 insertRow 新增一行，并填写新日期

❌ 忘记填写列0的日期
   → 主线剧情的列0必须填写日期

❌ 事件概要中没有写地点
   → 主线剧情的事件概要必须包含地点

禁止使用表格格式、禁止使用JSON格式、禁止使用其他标签。`,
        tablePromptPos: 'system',
        tablePromptPosType: 'system_end',
        tablePromptDepth: 0,
        summaryPrompt: `请将以下表格数据总结成简洁的文字描述。

【总结要求】
1. 每个表格生成一条总结，分条列出
2. 使用简洁的语言，每条不超过100字
3. 保留关键信息：时间、地点、人物、事件
4. 使用过去式描述

【输出格式示例】
• 主线剧情：2024年3月15日，在村庄接受长老委托前往森林寻找宝石；遇到商人艾莉娅获得线索。
• 人物档案：新认识艾莉娅（23岁），神秘商人，擅长占卜。
• 约定：需在3月18日前找到宝石交给长老。

请只总结下面的表格数据，不要参考之前的对话：`,
        summaryPromptPos: 'system',
        summaryPromptPosType: 'absolute',
        summaryPromptDepth: 1
    };
    
    const MEMORY_TAG_REGEX = /<(Memory|GaigaiMemory|memory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
    
    const T = [
        { n: '主线剧情', c: ['日期', '开始时间', '完结时间', '事件概要', '状态'] },
        { n: '支线追踪', c: ['状态', '支线名', '开始时间', '完结时间', '事件追踪', '关键NPC'] },
        { n: '角色状态', c: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
        { n: '人物档案', c: ['姓名', '年龄', '身份', '地点', '性格', '备注'] },
        { n: '人物关系', c: ['角色A', '角色B', '关系描述', '情感态度'] },
        { n: '世界设定', c: ['设定名', '类型', '详细说明', '影响范围'] },
        { n: '物品追踪', c: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注'] },
        { n: '约定', c: ['约定时间', '约定内容', '核心角色'] },
        { n: '记忆总结', c: ['表格类型', '总结内容'] }
    ];
    
    const DEFAULT_COL_WIDTHS = {
        0: { '日期': 110, '开始时间': 100, '完结时间': 100, '状态': 70 },
        1: { '状态': 70, '支线名': 150, '开始时间': 100, '完结时间': 100, '事件追踪': 250, '关键NPC': 100 },
        2: { '时间': 120 },
        3: { '年龄': 50 },
        4: {},
        5: {},
        6: { '状态': 70, '重要程度': 80 },
        7: { '约定时间': 120 },
        8: { '表格类型': 120 }
    };
    
    let userColWidths = {};
    let summarizedRows = {};
    let pageStack = [];
    let snapshotHistory = {}; // ✅ 存储每条消息的快照
    let lastProcessedMsgIndex = -1; // ✅ 最后处理的消息索引
    let isRegenerating = false; // ✅ 标记是否正在重新生成
    let deletedMsgIndex = -1; // ✅ 记录被删除的消息索引
    let processedMessages = new Set(); // ✅✅ 新增：防止重复处理同一消息
    let beforeGenerateSnapshotKey = null;
    
    // ✅ 自定义弹窗函数
    function customAlert(message, title = '提示') {
        return new Promise((resolve) => {
            const id = 'custom-alert-' + Date.now();
            const $overlay = $('<div>', { 
                id: id,
                css: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10000000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    margin: 0
                }
            });
            
            const $dialog = $('<div>', {
                css: {
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'auto'
                }
            });
            
            const $header = $('<div>', {
                css: {
                    background: UI.c,
                    color: '#fff',
                    padding: '16px 20px',
                    borderRadius: '12px 12px 0 0',
                    fontSize: '16px',
                    fontWeight: '600'
                },
                text: title
            });
            
            const $body = $('<div>', {
                css: {
                    padding: '24px 20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                },
                text: message
            });
            
            const $footer = $('<div>', {
                css: {
                    padding: '12px 20px',
                    borderTop: '1px solid #eee',
                    textAlign: 'right'
                }
            });
            
            const $okBtn = $('<button>', {
                text: '确定',
                css: {
                    background: UI.c,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }
            }).on('click', () => {
                $overlay.remove();
                resolve(true);
            }).hover(
                function() { $(this).css('filter', 'brightness(0.9)'); },
                function() { $(this).css('filter', 'brightness(1)'); }
            );
            
            $footer.append($okBtn);
            $dialog.append($header, $body, $footer);
            $overlay.append($dialog);
            $('body').append($overlay);
            
            $overlay.on('click', (e) => {
                if (e.target === $overlay[0]) {
                    $overlay.remove();
                    resolve(false);
                }
            });
            
            $(document).on('keydown.' + id, (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    $(document).off('keydown.' + id);
                    $overlay.remove();
                    resolve(true);
                }
            });
        });
    }
    
    function customConfirm(message, title = '确认') {
        return new Promise((resolve) => {
            const id = 'custom-confirm-' + Date.now();
            const $overlay = $('<div>', { 
                id: id,
                css: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10000000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    margin: 0
                }
            });
            
            const $dialog = $('<div>', {
                css: {
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'auto'
                }
            });
            
            const $header = $('<div>', {
                css: {
                    background: UI.c,
                    color: '#fff',
                    padding: '16px 20px',
                    borderRadius: '12px 12px 0 0',
                    fontSize: '16px',
                    fontWeight: '600'
                },
                text: title
            });
            
            const $body = $('<div>', {
                css: {
                    padding: '24px 20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                },
                text: message
            });
            
            const $footer = $('<div>', {
                css: {
                    padding: '12px 20px',
                    borderTop: '1px solid #eee',
                    textAlign: 'right',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }
            });
            
            const $cancelBtn = $('<button>', {
                text: '取消',
                css: {
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }
            }).on('click', () => {
                $overlay.remove();
                resolve(false);
            }).hover(
                function() { $(this).css('filter', 'brightness(0.9)'); },
                function() { $(this).css('filter', 'brightness(1)'); }
            );
            
            const $okBtn = $('<button>', {
                text: '确定',
                css: {
                    background: UI.c,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }
            }).on('click', () => {
                $overlay.remove();
                resolve(true);
            }).hover(
                function() { $(this).css('filter', 'brightness(0.9)'); },
                function() { $(this).css('filter', 'brightness(1)'); }
            );
            
            $footer.append($cancelBtn, $okBtn);
            $dialog.append($header, $body, $footer);
            $overlay.append($dialog);
            $('body').append($overlay);
            
            $overlay.on('click', (e) => {
                if (e.target === $overlay[0]) {
                    $overlay.remove();
                    resolve(false);
                }
            });
            
            $(document).on('keydown.' + id, (e) => {
                if (e.key === 'Escape') {
                    $(document).off('keydown.' + id);
                    $overlay.remove();
                    resolve(false);
                } else if (e.key === 'Enter') {
                    $(document).off('keydown.' + id);
                    $overlay.remove();
                    resolve(true);
                }
            });
        });
    }
    
    class S {
        constructor(n, c) { this.n = n; this.c = c; this.r = []; }
        upd(i, d) { 
    // ✅✅ 核心修复：只允许更新已存在的行，或紧接着的下一行
    if (i < 0) {
        console.error(`❌ [UPDATE] 行索引${i}无效（负数）`);
        return;
    }
    
    // ✅ 如果行索引超出范围（跳过了中间行），报错
    if (i > this.r.length) {
        console.error(`❌ [UPDATE] 表格"${this.n}"当前只有${this.r.length}行，无法更新第${i}行！`);
        console.error(`💡 提示：AI可能看到了总结，误以为表格有更多行。实际应该用 insertRow 新增。`);
        return; // ✅ 拒绝执行，不创建空行
    }
    
    // ✅ 如果索引等于长度，说明是追加新行（允许）
    if (i === this.r.length) {
        console.warn(`⚠️ [UPDATE→INSERT] 行${i}不存在，自动转为新增行`);
        this.r.push({});
    }
    
    // 正常更新逻辑
    Object.entries(d).forEach(([k, v]) => {
        // 主线剧情(表0)的事件概要(列3)自动追加
        if (this.n === '主线剧情' && k == '3' && this.r[i][k] && v) {
            const oldContent = this.r[i][k].trim();
            const newContent = v.trim();
            
            if (!oldContent.includes(newContent)) {
                this.r[i][k] = oldContent + '；' + newContent;
                console.log(`📝 [AUTO-APPEND] 事件概要已追加: "${newContent}"`);
            } else {
                console.log(`ℹ️ [SKIP] 内容已存在，跳过追加: "${newContent}"`);
            }
        } 
        // 支线追踪(表1)的事件追踪(列4)也自动追加
        else if (this.n === '支线追踪' && k == '4' && this.r[i][k] && v) {
            const oldContent = this.r[i][k].trim();
            const newContent = v.trim();
            if (!oldContent.includes(newContent)) {
                this.r[i][k] = oldContent + '；' + newContent;
                console.log(`📝 [AUTO-APPEND] 支线追踪已追加: "${newContent}"`);
            }
        } 
        // 其他字段正常替换
        else {
            this.r[i][k] = v; 
        }
    });
}
        ins(d) { this.r.push(d); }
        del(i) { if (i >= 0 && i < this.r.length) this.r.splice(i, 1); }
        delMultiple(indices) {
            const sorted = indices.sort((a, b) => b - a);
            sorted.forEach(i => {
                if (i >= 0 && i < this.r.length) {
                    this.r.splice(i, 1);
                }
            });
        }
        clear() { this.r = []; }
        json() { return { n: this.n, c: this.c, r: this.r }; }
        from(d) { 
            this.r = d.r || [];
        }
        txt() {
            if (this.r.length === 0) return '';
            let t = `【${this.n}】\n`;
            this.r.forEach((rw, i) => {
                t += `  [${i}] `;
                this.c.forEach((cl, ci) => {
                    const v = rw[ci] || '';
                    if (v) t += `${cl}:${v} | `;
                });
                t += '\n';
            });
            return t;
        }
    }
    
    class SM {
        constructor(manager) { this.m = manager; }
        save(summaryData) {
            const sumSheet = this.m.get(8);
            
            if (typeof summaryData === 'string') {
                const lines = summaryData.split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    const match = line.match(/^[•\-\*]\s*(.+?)：(.+)$/);
                    if (match) {
                        const tableType = match[1].trim();
                        const newContent = match[2].trim();
                        
                        let existingRowIndex = -1;
                        for (let i = 0; i < sumSheet.r.length; i++) {
                            if (sumSheet.r[i][0] === tableType) {
                                existingRowIndex = i;
                                break;
                            }
                        }
                        
                        if (existingRowIndex >= 0) {
                            const existingContent = sumSheet.r[existingRowIndex][1] || '';
                            sumSheet.upd(existingRowIndex, { 
                                1: existingContent + '\n\n' + newContent 
                            });
                        } else {
                            sumSheet.ins({ 0: tableType, 1: newContent });
                        }
                    } else if (line.trim()) {
                        let generalRowIndex = -1;
                        for (let i = 0; i < sumSheet.r.length; i++) {
                            if (sumSheet.r[i][0] === '综合') {
                                generalRowIndex = i;
                                break;
                            }
                        }
                        
                        if (generalRowIndex >= 0) {
                            const existingContent = sumSheet.r[generalRowIndex][1] || '';
                            sumSheet.upd(generalRowIndex, { 
                                1: existingContent + '\n\n' + line.trim() 
                            });
                        } else {
                            sumSheet.ins({ 0: '综合', 1: line.trim() });
                        }
                    }
                });
            } else if (Array.isArray(summaryData)) {
                summaryData.forEach(item => {
                    const tableType = item.type || '综合';
                    const newContent = item.content || item;
                    
                    let existingRowIndex = -1;
                    for (let i = 0; i < sumSheet.r.length; i++) {
                        if (sumSheet.r[i][0] === tableType) {
                            existingRowIndex = i;
                            break;
                        }
                    }
                    
                    if (existingRowIndex >= 0) {
                        const existingContent = sumSheet.r[existingRowIndex][1] || '';
                        sumSheet.upd(existingRowIndex, { 
                            1: existingContent + '\n\n' + newContent 
                        });
                    } else {
                        sumSheet.ins({ 0: tableType, 1: newContent });
                    }
                });
            }
            this.m.save();
        }
        load() {
            const sumSheet = this.m.get(8);
            if (sumSheet.r.length === 0) return '';
            return sumSheet.r.map(row => `• ${row[0] || '综合'}：${row[1] || ''}`).filter(t => t).join('\n');
        }
        loadArray() {
            const sumSheet = this.m.get(8);
            return sumSheet.r.map(row => ({ type: row[0] || '综合', content: row[1] || '' }));
        }
        clear() { const sumSheet = this.m.get(8); sumSheet.clear(); this.m.save(); }
        has() { const sumSheet = this.m.get(8); return sumSheet.r.length > 0 && sumSheet.r[0][1]; }
        getTime() { return ''; }
    }    
        class M {
        constructor() { this.s = []; this.id = null; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        // 同步功能
        save() {
    const id = this.gid();
    if (!id) {
        console.warn('⚠️ 无法获取ID，跳过保存');
        return;
    }
    
    const data = { 
        v: V, 
        id: id, 
        ts: Date.now(), 
        d: this.s.map(sh => sh.json()),
        summarized: summarizedRows,
        ui: UI,
        colWidths: userColWidths
    };
    
    // 本地存储（作为备份）
    try { 
        localStorage.setItem(`${SK}_${id}`, JSON.stringify(data)); 
        console.log('💾 本地保存成功');
    } catch (e) {
        console.error('❌ 本地保存失败:', e);
    }
    
    // ✅✅ 增强云同步：使用正确的 chatMetadata（驼峰命名）
if (C.cloudSync) {
    try {
        const ctx = this.ctx();
        if (ctx && ctx.chatMetadata) {
            // 方法1：直接赋值（最可靠）
            ctx.chatMetadata.gaigai = data;
            console.log('☁️ 数据已写入 chatMetadata');
            
            // 方法2：强制保存到文件
            let saved = false;
            
            // 尝试 saveChat
            if (typeof ctx.saveChat === 'function') {
                try {
                    ctx.saveChat();
                    console.log('✅ 云同步成功 (saveChat)');
                    saved = true;
                } catch (e) {
                    console.warn('⚠️ saveChat 失败:', e);
                }
            }
            
            // 如果 saveChat 失败，尝试 saveChatConditional
            if (!saved && typeof ctx.saveChatConditional === 'function') {
                try {
                    ctx.saveChatConditional();
                    console.log('✅ 云同步成功 (saveChatConditional)');
                    saved = true;
                } catch (e) {
                    console.warn('⚠️ saveChatConditional 失败:', e);
                }
            }
            
            // 最后尝试全局方法
            if (!saved && typeof window.saveChatDebounced === 'function') {
                try {
                    window.saveChatDebounced();
                    console.log('✅ 云同步成功 (saveChatDebounced)');
                    saved = true;
                } catch (e) {
                    console.warn('⚠️ saveChatDebounced 失败:', e);
                }
            }
            
            if (!saved) {
                console.warn('⚠️ 所有保存方法均失败，数据已写入内存但未持久化到文件');
            }
            
            // ✅✅ 新增：延迟保存确保写入文件
            setTimeout(() => {
                try {
                    if (typeof ctx.saveChat === 'function') {
                        ctx.saveChat();
                        console.log('🔄 延迟保存已执行');
                    }
                } catch (e) {
                    console.warn('⚠️ 延迟保存失败:', e);
                }
            }, 1000);
            
        } else {
            console.warn('⚠️ chatMetadata 不可用，跳过云同步');
        }
    } catch (e) { 
        console.error('❌ 云同步失败:', e); 
    }
  }
}
        
        load() {
    const id = this.gid();
    if (!id) {
        console.warn('⚠️ 无法获取ID，跳过加载');
        return;
    }
    
    if (this.id !== id) { 
        this.id = id; 
        this.s = []; 
        T.forEach(tb => this.s.push(new S(tb.n, tb.c))); 
        this.sm = new SM(this); 
    }
    
    let cloudData = null;
    let localData = null;
    
    // ✅ 尝试从云端加载
    if (C.cloudSync) {
        try {
            const ctx = this.ctx();
            if (ctx && ctx.chatMetadata && ctx.chatMetadata.gaigai) {
                cloudData = ctx.chatMetadata.gaigai;
                console.log(`☁️ 云端数据存在 (时间: ${new Date(cloudData.ts).toLocaleString()})`);
            } else {
                console.log('ℹ️ 云端无数据');
            }
        } catch (e) { 
            console.warn('⚠️ 云端加载失败:', e); 
        }
    }
    
    // 尝试从本地加载
    try {
        const sv = localStorage.getItem(`${SK}_${id}`);
        if (sv) {
            localData = JSON.parse(sv);
            console.log(`💾 本地数据存在 (时间: ${new Date(localData.ts).toLocaleString()})`);
        }
    } catch (e) {
        console.warn('⚠️ 本地加载失败:', e);
    }
    
    // ✅ 比较时间戳，使用最新的数据
    let finalData = null;
    if (cloudData && localData) {
        if (cloudData.ts > localData.ts) {
            finalData = cloudData;
            console.log('🔄 使用云端数据（更新）');
            // 更新本地缓存
            try {
                localStorage.setItem(`${SK}_${id}`, JSON.stringify(cloudData));
            } catch (e) {}
        } else {
            finalData = localData;
            console.log('🔄 使用本地数据（更新）');
        }
    } else if (cloudData) {
        finalData = cloudData;
        console.log('☁️ 仅云端有数据');
    } else if (localData) {
        finalData = localData;
        console.log('💾 仅本地有数据');
    }
    
    // 应用数据
    if (finalData && finalData.v && finalData.d) {
        finalData.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
        if (finalData.summarized) summarizedRows = finalData.summarized;
        if (finalData.ui) UI = { ...UI, ...finalData.ui };
        if (finalData.colWidths) userColWidths = finalData.colWidths;
        console.log(`✅ 数据加载成功 (版本: ${finalData.v})`);
    } else {
        console.log('ℹ️ 无可用数据，这是新聊天');
    }
}
        gid() {
            try {
                const x = this.ctx();
                if (!x) return 'default';
                
                const chatId = x.chatMetadata?.file_name || x.chatId || 'default_chat';
                
                if (C.pc) {
                    const charName = x.name2 || x.characterId || 'unknown_char';
                    return `${charName}_${chatId}`;
                }
                
                return chatId;
            } catch (e) { 
                return 'default'; 
            }
        }
        
        ctx() { return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null; }
        
        getTableText() {
            const sh = this.s.slice(0, 8).filter(s => s.r.length > 0);
            if (sh.length === 0) return '';
            return sh.map(s => s.txt()).join('\n');
        }
        
pmt() {
    let result = '';
    
    // ✅✅ 总结部分
    if (this.sm.has()) {
        result += '=== 📚 记忆总结（历史压缩数据，仅供参考） ===\n\n';
        result += this.sm.load();
        result += '\n\n=== 总结结束 ===\n\n';
    }
    
    // ✅✅ 详细表格部分
    const sh = this.s.slice(0, 8).filter(s => s.r.length > 0);
    if (sh.length > 0) {
        result += '=== 📊 详细表格（当前实际数据，需要操作此处） ===\n\n';
        sh.forEach(s => result += s.txt() + '\n');
        result += '=== 表格结束 ===\n';
    } else {
        // ✅✅ 如果表格为空但有总结，明确告知
        if (this.sm.has()) {
            result += '=== 📊 详细表格（当前为空） ===\n\n';
            result += '⚠️ 所有表格当前都是空的（已被总结并清空）\n';
            result += '⚠️ 新的记录必须从第 0 行开始：insertRow(表索引, {0: "值",...})\n';
            result += '⚠️ 或者用 updateRow(表索引, 0, {列号: "值"}) 更新第0行\n\n';
            result += '=== 表格结束 ===\n';
        }
    }
    
    // ✅✅ 追加当前行数说明
    result += '\n=== 📋 当前表格状态 ===\n';
    this.s.slice(0, 8).forEach((s, i) => {
        const displayName = i === 1 ? '支线追踪' : s.n;
        result += `表${i} ${displayName}: 当前有 ${s.r.length} 行`;
        if (s.r.length === 0) {
                        result += ` ← ⚠️空表！新增用 insertRow(${i}, {...})，或 updateRow(${i}, 0, {...})`;
        } else {
            result += ` (可用行索引: 0~${s.r.length - 1}，新增用 insertRow)`;
        }
        result += '\n';
    });
    result += '=== 状态结束 ===\n';
    
    return result || '';
}
}  // ✅✅✅ 重要：这里必须添加类的结束大括号！

// ✅✅ 快照管理系统（在类外面）
function saveSnapshot(msgIndex) {
    try {
        const snapshot = {
            data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))), // ✅ 只保存前8个表格，不保存总结表
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: Date.now()
        };
        snapshotHistory[msgIndex] = snapshot;
        
        const totalRecords = snapshot.data.reduce((sum, s) => sum + s.r.length, 0);
        const details = snapshot.data.filter(s => s.r.length > 0).map(s => `${s.n}:${s.r.length}行`).join(', ');
        console.log(`📸 快照${msgIndex}已保存 - 共${totalRecords}条记录 ${details ? `[${details}]` : '[空]'}`);
    } catch (e) {
        console.error('❌ 快照保存失败:', e);
    }
}

function restoreSnapshot(msgIndex) {
    try {
        const snapshot = snapshotHistory[msgIndex];
        if (!snapshot) {
            console.error(`❌ 未找到快照${msgIndex}！`);
            console.log(`📸 现有快照:`, Object.keys(snapshotHistory).map(Number).sort((a,b)=>a-b));
            return false;
        }
        
        // ✅ 只清空前8个表格，保留总结表（索引8）
        m.s.slice(0, 8).forEach(sheet => {
            sheet.r = [];
        });
        
        // ✅ 只恢复前8个表格数据
        snapshot.data.forEach((sd, i) => {
            if (i < 8 && m.s[i]) {
                m.s[i].from(sd);
            }
        });
        
        // 恢复总结标记
        summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
        
        // 保存到存储
        m.save();
        
        const totalRecords = m.s.reduce((sum, s) => sum + s.r.length, 0);
        const details = m.s.filter(s => s.r.length > 0).map(s => `${s.n}:${s.r.length}行`).join(', ');
        console.log(`✅ 快照${msgIndex}已恢复 - 共${totalRecords}条记录 ${details ? `[${details}]` : '[空]'}`);
        return true;
    } catch (e) {
        console.error('❌ 快照恢复失败:', e);
        return false;
    }
}

function cleanOldSnapshots() {
    const allKeys = Object.keys(snapshotHistory);
    
    // ✅ 分别统计before和after快照
    const beforeKeys = allKeys.filter(k => k.startsWith('before_')).sort();
    const afterKeys = allKeys.filter(k => k.startsWith('after_')).sort();
    
    // 保留最近30对快照
    const maxPairs = 30;
    
    if (beforeKeys.length > maxPairs) {
        const toDeleteBefore = beforeKeys.slice(0, beforeKeys.length - maxPairs);
        toDeleteBefore.forEach(key => delete snapshotHistory[key]);
        console.log(`🧹 已清理 ${toDeleteBefore.length} 个旧before快照`);
    }
    
    if (afterKeys.length > maxPairs) {
        const toDeleteAfter = afterKeys.slice(0, afterKeys.length - maxPairs);
        toDeleteAfter.forEach(key => delete snapshotHistory[key]);
        console.log(`🧹 已清理 ${toDeleteAfter.length} 个旧after快照`);
    }
}
    
    const m = new M();
    
    // 列宽管理
    function saveColWidths() {
        try {
            localStorage.setItem(CWK, JSON.stringify(userColWidths));
        } catch (e) {}
    }
    
    function loadColWidths() {
        try {
            const saved = localStorage.getItem(CWK);
            if (saved) {
                userColWidths = JSON.parse(saved);
            }
        } catch (e) {}
    }
    
    function getColWidth(tableIndex, colName) {
        if (userColWidths[tableIndex] && userColWidths[tableIndex][colName]) {
            return userColWidths[tableIndex][colName];
        }
        if (DEFAULT_COL_WIDTHS[tableIndex] && DEFAULT_COL_WIDTHS[tableIndex][colName]) {
            return DEFAULT_COL_WIDTHS[tableIndex][colName];
        }
        return null;
    }
    
    function setColWidth(tableIndex, colName, width) {
        if (!userColWidths[tableIndex]) {
            userColWidths[tableIndex] = {};
        }
        userColWidths[tableIndex][colName] = width;
        saveColWidths();
    }
    
    async function resetColWidths() {
        if (await customConfirm('确定重置所有列宽为默认值？', '重置列宽')) {
            userColWidths = {};
            saveColWidths();
            await customAlert('列宽已重置，请重新打开表格', '成功');
        }
    }
    
    // 已总结行管理
    function saveSummarizedRows() {
        try {
            localStorage.setItem(SMK, JSON.stringify(summarizedRows));
        } catch (e) {}
    }
    
    function loadSummarizedRows() {
        try {
            const saved = localStorage.getItem(SMK);
            if (saved) {
                summarizedRows = JSON.parse(saved);
            }
        } catch (e) {}
    }
    
    function markAsSummarized(tableIndex, rowIndex) {
        if (!summarizedRows[tableIndex]) {
            summarizedRows[tableIndex] = [];
        }
        if (!summarizedRows[tableIndex].includes(rowIndex)) {
            summarizedRows[tableIndex].push(rowIndex);
        }
        saveSummarizedRows();
    }
    
    function isSummarized(tableIndex, rowIndex) {
        return summarizedRows[tableIndex] && summarizedRows[tableIndex].includes(rowIndex);
    }
    
    function clearSummarizedMarks() {
        summarizedRows = {};
        saveSummarizedRows();
    }
    
    function cleanMemoryTags(text) { if (!text) return text; return text.replace(MEMORY_TAG_REGEX, '').trim(); }
    
    function prs(tx) {
        const cs = [];
        const rg = MEMORY_TAG_REGEX;
        let mt;
        while ((mt = rg.exec(tx)) !== null) {
            let cn = mt[2].replace(/<!--/g, '').replace(/-->/g, '').replace(/\s+/g, ' ').trim();
            ['insertRow', 'updateRow', 'deleteRow'].forEach(fn => {
                let si = 0;
                while (true) {
                    const fi = cn.indexOf(fn + '(', si);
                    if (fi === -1) break;
                    let dp = 0, ei = -1;
                    for (let i = fi + fn.length; i < cn.length; i++) {
                        if (cn[i] === '(') dp++;
                        if (cn[i] === ')') { dp--; if (dp === 0) { ei = i; break; } }
                    }
                    if (ei === -1) break;
                    const ag = cn.substring(fi + fn.length + 1, ei);
                    const p = pag(ag, fn);
                    if (p) cs.push({ t: fn.replace('Row', '').toLowerCase(), ...p });
                    si = ei + 1;
                }
            });
        }
        return cs;
    }
    
    function pag(s, f) {
        try {
            const b1 = s.indexOf('{'), b2 = s.lastIndexOf('}');
            if (b1 === -1 || b2 === -1) return null;
            const ns = s.substring(0, b1).split(',').map(x => x.trim()).filter(x => x).map(x => parseInt(x));
            const ob = pob(s.substring(b1, b2 + 1));
            if (f === 'insertRow') return { ti: ns[0], ri: null, d: ob };
            if (f === 'updateRow') return { ti: ns[0], ri: ns[1], d: ob };
            if (f === 'deleteRow') return { ti: ns[0], ri: ns[1], d: null };
        } catch (e) {}
        return null;
    }
    
    function pob(s) {
        const d = {};
        s = s.trim().replace(/^\{|\}$/g, '').trim();
        const r = /(\d+)\s*:\s*"([^"]*)"/g;
        let mt;
        while ((mt = r.exec(s)) !== null) d[mt[1]] = mt[2];
        return d;
    }
    
    function exe(cs) {
    cs.forEach(cm => {
        const sh = m.get(cm.ti);
        if (!sh) return;
        if (cm.t === 'update' && cm.ri !== null) sh.upd(cm.ri, cm.d);
        if (cm.t === 'insert') sh.ins(cm.d);
        if (cm.t === 'delete' && cm.ri !== null) sh.del(cm.ri);
    });
    m.save();
}

 function inj(ev) {
    if (!C.enabled) return;
    
    // ✅✅ 修复顺序：先表格，后提示词（这样提示词会在最后）
    
    // 步骤1：先注入记忆表格数据
    const tableData = m.pmt();
    if (tableData && C.tableInj) {
        const dataPos = getInjectionPosition(C.tablePos, C.tablePosType, C.tableDepth, ev.chat);
        const role = getRoleByPosition(C.tablePos);
        ev.chat.splice(dataPos, 0, { 
            role, 
            content: tableData,
            isGaigaiData: true
        });
        console.log(`📊 表格数据已注入到位置${dataPos}（${C.tablePosType === 'system_end' ? 'system末尾' : '固定位置'}）`);
    }
    
    // 步骤2：再注入填表提示词（会在表格数据之后）
    if (PROMPTS.tablePrompt) {
        const pmtPos = getInjectionPosition(PROMPTS.tablePromptPos, PROMPTS.tablePromptPosType, PROMPTS.tablePromptDepth, ev.chat);
        const role = getRoleByPosition(PROMPTS.tablePromptPos);
        ev.chat.splice(pmtPos, 0, { 
            role, 
            content: PROMPTS.tablePrompt,
            isGaigaiPrompt: true
        });
        console.log(`📝 填表提示词已注入到位置${pmtPos}（${PROMPTS.tablePromptPosType === 'system_end' ? 'system末尾' : '固定位置'}）`);
    }
    
    // ✅✅ 步骤3：清理历史消息中的标签（保持不变）
    if (C.filterHistory) {
        console.log('🔍 开始清理历史标签...');
        
        ev.chat = ev.chat.map((msg, index) => {
            if (msg.isGaigaiPrompt || msg.isGaigaiData || msg.isPhoneMessage) {
                console.log(`⏭️ 跳过注入内容（位置${index}）`);
                return msg;
}

            // 🔥 跳过手机消息（关键字修复）
    if (msg.content && (
        msg.content.includes('📱 手机') || 
        msg.content.includes('╔═══════════') ||
        msg.content.includes('手机微信消息记录')
    )) {
    console.log(`⏭️ [Gaigai] 跳过手机消息（位置${index}），不清理`);
    return msg;
}
            
            if (msg.is_user || msg.role === 'user' || msg.role === 'system') {
                return msg;
            }
            
            if (msg.role === 'assistant' || !msg.is_user) {
                const contentFields = ['content', 'mes', 'message', 'text'];
                let needsClean = false;
                
                for (let field of contentFields) {
                    if (msg[field] && typeof msg[field] === 'string' && MEMORY_TAG_REGEX.test(msg[field])) {
                        needsClean = true;
                        break;
                    }
                }
                
                if (needsClean) {
                    const cleanedMsg = { ...msg };
                    
                    contentFields.forEach(field => {
                        if (cleanedMsg[field] && typeof cleanedMsg[field] === 'string') {
                            const original = cleanedMsg[field];
                            const afterClean = original.replace(MEMORY_TAG_REGEX, '').trim();
                            
                            if (original !== afterClean) {
                                cleanedMsg[field] = afterClean;
                                console.log(`🧹 已清理消息${index}的标签`);
                            }
                        }
                    });
                    
                    return cleanedMsg;
                }
            }
            
            return msg;
        });
        
        console.log('✅ 历史标签清理完成');
    }
    
        console.log('%c✅ 注入完成', 'color: green; font-weight: bold;');
    
    // ✅ 延迟300ms打印，等待手机插件注入
    setTimeout(() => {
        if (C.log) {
            console.log('═════════════════════════════════════════');
            console.log('📤 发送给AI的内容（含手机消息）:');
            ev.chat.forEach((msg, index) => {
                const content = msg.content || msg.mes || msg.message || msg.text || '';
                const hasTag = MEMORY_TAG_REGEX.test(content);
                const isPrompt = msg.isGaigaiPrompt ? '📌提示词' : '';
                const isData = msg.isGaigaiData ? '📊表格' : '';
                const isPhone = content.includes('📱 手机') || content.includes('手机微信消息记录') ? '🔥手机消息' : '';
                const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
                console.log(`[${index}] ${msg.role}${hasTag ? ' 🏷️含标签' : ''}${isPrompt}${isData}${isPhone}: ${preview}`);
            });
            console.log('═════════════════════════════════════════');
        }
    }, 300);
}

function getRoleByPosition(pos) {
    if (pos === 'system') return 'system'; 
    return 'user'; 
}

function getInjectionPosition(pos, posType, depth, chat) {
    const chatLength = chat ? chat.length : 0;
    
    if (posType === 'absolute') {
        switch(pos) {
            case 'system': return 0;  // 最前面
            case 'user': return chatLength;
            case 'assistant': return chatLength;
            default: return 0;
        }
    } else if (posType === 'system_end') {
        // ✅✅ 新增：自动定位到最后一个system消息之后
        if (!chat) return 0;
        let lastSystemIndex = -1;
        for (let i = 0; i < chatLength; i++) {
            if (chat[i] && chat[i].role === 'system') {
                lastSystemIndex = i;
            }
        }
        return lastSystemIndex >= 0 ? lastSystemIndex + 1 : 0;
    } else if (posType === 'chat') {
        switch(pos) {
            case 'system': return depth;
            case 'user': return Math.max(0, chatLength - depth);
            case 'assistant': return Math.max(0, chatLength - depth);
            default: return Math.max(0, chatLength - depth);
        }
    }
    return 0;
}
    
    function hideMemoryTags() {
        if (!C.hideTag) return;
        $('.mes_text').each(function() {
            const $this = $(this);
            let html = $this.html();
            if (!html) return;
            html = html.replace(MEMORY_TAG_REGEX, '<div class="g-hidden-tag" style="display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;">$&</div>');
            $this.html(html);
        });
    }
    
function thm() {
    // 1. 确保默认值
    if (!UI.c) UI.c = '#9c4c4c';
    if (!UI.tc) UI.tc = '#ffffff';

    // 2. 生成样式
    const style = `
        /* ========== 遮罩层 ========== */
        .g-ov { background: rgba(0, 0, 0, 0.35) !important; }
        
        /* ========== 弹窗主体 (强制磨砂玻璃) ========== */
        .g-w { 
            background: rgba(255, 255, 255, 0.45) !important; 
            backdrop-filter: blur(30px) saturate(180%) !important; 
            -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important; 
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
        }

        /* ========== 标题栏 ========== */
        .g-hd { 
            background: ${UI.c} !important; 
            opacity: 0.9; 
            border-bottom: 1px solid rgba(255,255,255,0.2) !important;
        }
        /* 标题文字 */
        .g-hd h3 { color: ${UI.tc} !important; }
        
        /* ========== ✨✨✨ 返回按钮美化 (新增) ✨✨✨ ========== */
        .g-back {
            /* 关键：颜色跟随设置的 UI.tc */
            color: ${UI.tc} !important;
            background: rgba(255, 255, 255, 0.15) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            
            /* 字体和排版 */
            font-size: 12px !important;
            font-weight: 600 !important;
            padding: 4px 12px !important;
            border-radius: 20px !important; /* 胶囊形状 */
            margin-right: 12px !important;
            cursor: pointer !important;
            
            /* 布局 */
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            transition: all 0.2s !important;
        }
        /* 悬停效果 */
        .g-back:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: translateX(-3px); /* 向左动一下 */
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        /* ========== 标签页 ========== */
        .g-t.act { 
            background: ${UI.c} !important; 
            opacity: 0.85;
            color: ${UI.tc} !important;
        }
        
        /* ========== 表头 ========== */
        .g-tbl-wrap thead.g-sticky { background: ${UI.c} !important; }
        .g-tbl-wrap th { 
            background: ${UI.c} !important; 
            color: ${UI.tc} !important; 
            border-color: rgba(255,255,255,0.3) !important; 
        }
        
        /* ========== 滚动条 ========== */
        .g-tbl-wrap::-webkit-scrollbar-thumb {
            background: ${UI.c} !important;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
        }
        .g-ts::-webkit-scrollbar-thumb { background: ${UI.c} !important; border-radius: 4px; }
        .g-p::-webkit-scrollbar-thumb { background: ${UI.c} !important; border-radius: 4px; }
        .g-tbl-wrap::-webkit-scrollbar-thumb:hover,
        .g-ts::-webkit-scrollbar-thumb:hover,
        .g-p::-webkit-scrollbar-thumb:hover { filter: brightness(0.8); }

        /* ========== 按钮统一样式 ========== */
        .g-tl button { 
            background: ${UI.c} !important; 
            color: ${UI.tc} !important; 
            font-weight: 600 !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15) !important;
            margin-right: 4px !important;
        }
        .g-tl button:hover { filter: brightness(1.15) !important; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important; }
        .g-tl button:active { transform: translateY(0); filter: brightness(0.95) !important; }
        
        /* ========== 其他细节 ========== */
        .g-p button { background: ${UI.c} !important; color: ${UI.tc} !important; border-radius: 6px !important;}
        .g-row.g-selected { outline: 2px solid ${UI.c} !important; background-color: rgba(255, 255, 255, 0.4) !important; }
        #g-btn { color: inherit !important; }
        #g-btn:hover { background-color: rgba(255, 255, 255, 0.2) !important; }
        .g-resizer { background: ${UI.c} !important; }
        .g-row.g-summarized { background-color: rgba(0, 0, 0, 0.05) !important; }
        .g-row.g-summarized td { background-color: transparent !important; }
        .g-p h4, .g-p label { color: #333; text-shadow: 0 0 10px rgba(255,255,255,0.8); } 
    `;
    
    $('#gaigai-theme').remove();
    $('<style id="gaigai-theme">').text(style).appendTo('head');
}
    
function pop(ttl, htm, showBack = false) {
        $('#g-pop').remove();
        thm();
        const $o = $('<div>', { id: 'g-pop', class: 'g-ov' });
        const $p = $('<div>', { class: 'g-w' });
        const $h = $('<div>', { class: 'g-hd' });
        
        if (showBack) {
            // ✨ 修改：移除了内联 css，加上了 icon 图标，现在样式全靠 css 控制
            const $back = $('<button>', { 
                class: 'g-back', 
                html: '<i class="fa-solid fa-chevron-left"></i> 返回' // 加个箭头图标
            }).on('click', goBack);
            $h.append($back);
        }
        
        $h.append(`<h3 style="flex:1;">${ttl}</h3>`);
        
        // 关闭按钮也顺便优化一下，让它跟随文字颜色
        const $x = $('<button>', { 
            class: 'g-x', 
            text: '×', 
            css: { 
                background: 'none', 
                border: 'none', 
                color: UI.tc || '#fff', // 让关闭按钮也跟随字体颜色
                cursor: 'pointer', 
                fontSize: '22px', 
                padding: '0', 
                width: '24px', 
                height: '24px' 
            } 
        }).on('click', () => { $o.remove(); pageStack = []; });
        
        $h.append($x);
        const $b = $('<div>', { class: 'g-bd', html: htm });
        $p.append($h, $b);
        $o.append($p);
        $o.on('click', e => { if (e.target === $o[0]) { $o.remove(); pageStack = []; } });
        $(document).on('keydown.g', e => { if (e.key === 'Escape') { $o.remove(); pageStack = []; $(document).off('keydown.g'); } });
        $('body').append($o);
        return $p;
    }
    
    function navTo(title, contentFn) { pageStack.push(contentFn); contentFn(); }
    function goBack() { if (pageStack.length > 1) { pageStack.pop(); const prevFn = pageStack[pageStack.length - 1]; prevFn(); } else { pageStack = []; shw(); } }
    
    function showBigEditor(ti, ri, ci, currentValue) {
        const sh = m.get(ti);
        const colName = sh.c[ci];
        const h = `<div class="g-p"><h4>✏️ 编辑单元格</h4><p style="color:#666; font-size:11px; margin-bottom:10px;">表格：<strong>${sh.n}</strong> | 行：<strong>${ri}</strong> | 列：<strong>${colName}</strong></p><textarea id="big-editor" style="width:100%; height:300px; padding:10px; border:1px solid #ddd; border-radius:4px; font-size:12px; font-family:inherit; resize:vertical; line-height:1.6;">${esc(currentValue)}</textarea><div style="margin-top:12px;"><button id="save-edit" style="padding:6px 12px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存</button><button id="cancel-edit" style="padding:6px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">取消</button></div></div>`;
        $('#g-edit-pop').remove();
        const $o = $('<div>', { id: 'g-edit-pop', class: 'g-ov', css: { 'z-index': '10000000' } });
        const $p = $('<div>', { class: 'g-w', css: { width: '600px', maxWidth: '90vw', height: 'auto' } });
        const $hd = $('<div>', { class: 'g-hd', html: '<h3 style="color:#fff;">✏️ 编辑内容</h3>' });
        const $x = $('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '22px' } }).on('click', () => $o.remove());
        const $bd = $('<div>', { class: 'g-bd', html: h });
        $hd.append($x); $p.append($hd, $bd); $o.append($p); $('body').append($o);
        setTimeout(() => {
            $('#big-editor').focus();
            $('#save-edit').on('click', function() {
                const newValue = $('#big-editor').val();
                const d = {}; d[ci] = newValue;
                sh.upd(ri, d); m.save();
                $(`.g-e[data-r="${ri}"][data-c="${ci}"]`).text(newValue);
                $o.remove();
            });
            $('#cancel-edit').on('click', () => $o.remove());
            $o.on('keydown', e => { if (e.key === 'Escape') $o.remove(); });
        }, 100);
    }
    
    function shw() {
    // ✅✅ 每次打开表格都重新加载最新数据
    m.load();
    pageStack = [shw];
    const ss = m.all();
    const tbs = ss.map((s, i) => { 
        const count = s.r.length;
        const displayName = i === 1 ? '支线剧情' : s.n;
        return `<button class="g-t${i === 0 ? ' act' : ''}" data-i="${i}">${displayName} (${count})</button>`; 
    }).join('');
    const tls = `<input type="text" id="g-src" placeholder="搜索"><button id="g-ad" title="新增行">➕ 新增</button><button id="g-dr" title="删除选中行" style="background:#dc3545;">🗑️ 删除选中</button><button id="g-sm" title="生成总结">📝 总结</button><button id="g-ex" title="导出数据">📥 导出</button><button id="g-reset-width" title="重置列宽" style="background:#ffc107;">📏 重置列宽</button><button id="g-clear-tables" title="清空表格（保留总结）" style="background:#ff69b4;">🗑️ 清表格</button><button id="g-ca" title="全部清空（含总结）" style="background:#dc3545;">🗑️ 全清</button><button id="g-tm" title="主题设置">🎨</button><button id="g-cf" title="配置">⚙️</button>`;
    const tbls = ss.map((s, i) => gtb(s, i)).join('');
    const h = `<div class="g-vw"><div class="g-ts">${tbs}</div><div class="g-tl">${tls}</div><div class="g-tb">${tbls}</div></div>`;
    pop('📚 记忆表格 v' + V, h);
    setTimeout(bnd, 100);
    
    // ✅ 强制修复复选框显示
    setTimeout(() => {
        $('#g-pop .g-row-select, #g-pop .g-select-all').css({
            'display': 'block',
            'visibility': 'visible',
            'opacity': '1',
            'position': 'relative',
            'z-index': '99999',
            'pointer-events': 'auto',
            '-webkit-appearance': 'checkbox',
            'appearance': 'checkbox'
        });
        console.log('✅ 找到', $('#g-pop .g-row-select').length, '个行复选框');
    }, 200);
}
    
    function gtb(s, ti) {
    const v = ti === 0 ? '' : 'display:none;';
    
    let h = `<div class="g-tbc" data-i="${ti}" style="${v}"><div class="g-tbl-wrap"><table>`;
    
    // ✅ 表头
    h += '<thead class="g-sticky"><tr>';
    
    // 行号列固定50px（不可拖拽）
    h += '<th class="g-col-num" style="width:50px; min-width:50px; max-width:50px;">';
    h += '<input type="checkbox" class="g-select-all" data-ti="' + ti + '">';
    h += '</th>';

    // 数据列表头
s.c.forEach((c, ci) => {
    const width = getColWidth(ti, c) || 150;
    
    h += `<th style="width:${width}px;" data-ti="${ti}" data-col="${ci}" data-col-name="${esc(c)}">
        ${esc(c)}
        <div class="g-col-resizer" data-ti="${ti}" data-ci="${ci}" data-col-name="${esc(c)}" title="拖拽调整列宽"></div>
    </th>`;
});
    
    h += '</tr></thead><tbody>';
    
    // ✅ 表格内容
    if (s.r.length === 0) {
        h += `<tr class="g-emp"><td colspan="${s.c.length + 1}">暂无数据</td></tr>`;
    } else {
        s.r.forEach((rw, ri) => {
            const summarizedClass = isSummarized(ti, ri) ? ' g-summarized' : '';
            h += `<tr data-r="${ri}" class="g-row${summarizedClass}">`;
            
            // 行号列
            h += `<td class="g-col-num" style="width:50px; min-width:50px; max-width:50px;">
                <div class="g-n">
                    <input type="checkbox" class="g-row-select" data-r="${ri}">
                    <div>${ri}</div>
                </div>
            </td>`;
            
            // 数据列
s.c.forEach((c, ci) => { 
    const val = rw[ci] || '';
    const width = getColWidth(ti, c) || 150;
    
    h += `<td style="width:${width}px;" data-ti="${ti}" data-col="${ci}">
        <div class="g-e" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(val)}</div>
    </td>`;
});
            h += '</tr>';
        });
    }
    h += '</tbody></table></div></div>';
    return h;
}
    
    let selectedRow = null;
    let selectedTableIndex = null;
    let selectedRows = [];
    function bnd() {
    // 切换标签
    $('.g-t').off('click').on('click', function() { 
        const i = $(this).data('i'); 
        $('.g-t').removeClass('act'); 
        $(this).addClass('act'); 
        $('.g-tbc').hide(); 
        $(`.g-tbc[data-i="${i}"]`).show(); 
        selectedRow = null; 
        selectedRows = [];
        selectedTableIndex = i; 
        $('.g-row').removeClass('g-selected');
        $('.g-row-select').prop('checked', false);
        $('.g-select-all').prop('checked', false);
    });
    
    // ✅✅✅ 核心修复：直接在 #g-pop 上代理事件
    $('#g-pop').off('change', '.g-select-all').on('change', '.g-select-all', function(e) {
        e.stopPropagation();
        const checked = $(this).prop('checked');
        const ti = parseInt($(this).data('ti'));
        $(`.g-tbc[data-i="${ti}"] .g-row-select`).prop('checked', checked);
        updateSelectedRows();
    });
    
    $('#g-pop').off('change', '.g-row-select').on('change', '.g-row-select', function(e) {
        e.stopPropagation();
        updateSelectedRows();
    });
    
   // ✅ 更新选中行数组并同步视觉状态
function updateSelectedRows() {
    selectedRows = [];
    
    // 清除所有行的选中状态
    $('#g-pop .g-tbc:visible .g-row').removeClass('g-selected').css({
        'background-color': '',
        'outline': ''
    });
    
    // 重新标记选中的行
    $('#g-pop .g-tbc:visible .g-row-select:checked').each(function() {
        const rowIndex = parseInt($(this).data('r'));
        selectedRows.push(rowIndex);
        
        // 添加选中的背景色
        $(this).closest('.g-row').addClass('g-selected').css({
            'background-color': 'rgba(156, 76, 76, 0.15)',
            'outline': '2px solid #9c4c4c'
        });
    });
    
    console.log('已选中行:', selectedRows);
}
    
     // ✅✅✅ Excel 式列宽拖拽（终极简化版）
let isResizing = false;
let startX = 0;
let startWidth = 0;
let tableIndex = 0;
let colIndex = 0;
let colName = '';
let $th = null;
let $tds = null;

// 开始拖拽
$('#g-pop').off('mousedown touchstart', '.g-col-resizer').on('mousedown touchstart', '.g-col-resizer', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    tableIndex = parseInt($(this).data('ti'));
    colIndex = parseInt($(this).data('ci'));
    colName = $(this).data('col-name');
    
    const $table = $(this).closest('table');
    $th = $table.find(`th[data-col="${colIndex}"]`);
    $tds = $table.find(`td[data-col="${colIndex}"]`);
    
    // ✅ 记录初始宽度
    startWidth = $th.outerWidth();
    
    startX = e.type === 'touchstart' ? 
        (e.originalEvent.touches[0]?.pageX || e.pageX) : 
        e.pageX;
    
    $('body').css({ 'cursor': 'col-resize', 'user-select': 'none' });
    
    $(this).css({
        'background': 'rgba(156, 76, 76, 0.5)',
        'border-right': '2px solid #9c4c4c'
    });
    
    console.log(`🖱️ 拖拽列${colIndex}(${colName})，初始${startWidth}px`);
});

// 拖拽中
$(document).off('mousemove.resizer touchmove.resizer').on('mousemove.resizer touchmove.resizer', function(e) {
    if (!isResizing || !$th) return;
    e.preventDefault();
    
    const currentX = e.type === 'touchmove' ? 
        (e.originalEvent.touches[0]?.pageX || e.pageX) : 
        e.pageX;
    
    const deltaX = currentX - startX;
    const newWidth = Math.max(20, startWidth + deltaX);  // ✅ 最小20px
    
    // ✅ 直接设置宽度，不用min/max
    $th.css('width', newWidth + 'px');
    $tds.css('width', newWidth + 'px');
});

// 结束拖拽
$(document).off('mouseup.resizer touchend.resizer').on('mouseup.resizer touchend.resizer', function(e) {
    if (!isResizing) return;
    
    const finalX = e.type === 'touchend' ? 
        (e.originalEvent.changedTouches?.[0]?.pageX || e.pageX) : 
        e.pageX;
    
    const deltaX = finalX - startX;
    const newWidth = Math.max(20, startWidth + deltaX);
    
    // 保存
    setColWidth(tableIndex, colName, newWidth);
    
    $('body').css({ 'cursor': '', 'user-select': '' });
    $('.g-col-resizer').css({ 'background': '', 'border-right': '' });
    
    isResizing = false;
    $th = null;
    $tds = null;
    
    console.log(`✅ 列${colIndex}已保存：${newWidth}px`);
});

// 防止选中文字
$(document).off('selectstart.resizer').on('selectstart.resizer', function(e) {
    if (isResizing) {
        e.preventDefault();
        return false;
    }
});
    
    // 双击编辑
    $('#g-pop').off('dblclick', '.g-e').on('dblclick', '.g-e', function(e) { 
        e.preventDefault(); 
        e.stopPropagation(); 
        const ti = parseInt($('.g-t.act').data('i')); 
        const ri = parseInt($(this).data('r')); 
        const ci = parseInt($(this).data('c')); 
        const val = $(this).text(); 
        $(this).blur(); 
        showBigEditor(ti, ri, ci, val); 
    });
    
    // 失焦保存
    $('#g-pop').off('blur', '.g-e').on('blur', '.g-e', function() { 
        const ti = parseInt($('.g-t.act').data('i')); 
        const ri = parseInt($(this).data('r')); 
        const ci = parseInt($(this).data('c')); 
        const v = $(this).text().trim(); 
        const sh = m.get(ti); 
        if (sh) { 
            const d = {}; 
            d[ci] = v; 
            sh.upd(ri, d); 
            m.save(); 
            updateTabCount(ti); 
        } 
    });
    
    // 行点击事件（用于单选）
    $('#g-pop').off('click', '.g-row').on('click', '.g-row', function(e) { 
        // 排除编辑框
        if ($(e.target).hasClass('g-e') || $(e.target).closest('.g-e').length > 0) return;
        // 排除复选框和行号列
        if ($(e.target).is('input[type="checkbox"]') || $(e.target).closest('.g-col-num').length > 0) return;
        
        const $row = $(this); 
        $('.g-row').removeClass('g-selected'); 
        $row.addClass('g-selected'); 
        selectedRow = parseInt($row.data('r')); 
        selectedTableIndex = parseInt($('.g-t.act').data('i')); 
    });
    
    // 删除按钮
    $('#g-dr').off('click').on('click', async function() {
        const ti = selectedTableIndex !== null ? selectedTableIndex : parseInt($('.g-t.act').data('i'));
        const sh = m.get(ti);
        if (!sh) return;
        
        if (selectedRows.length > 0) {
            if (!await customConfirm(`确定删除选中的 ${selectedRows.length} 行？`, '确认删除')) return;
            sh.delMultiple(selectedRows);
            
            if (summarizedRows[ti]) {
                summarizedRows[ti] = summarizedRows[ti].filter(ri => !selectedRows.includes(ri));
                selectedRows.sort((a, b) => a - b).forEach(ri => {
                    summarizedRows[ti] = summarizedRows[ti].map(idx => idx > ri ? idx - 1 : idx);
                });
                saveSummarizedRows();
            }
            
            selectedRows = [];
            $('.g-row-select').prop('checked', false);
            $('.g-select-all').prop('checked', false);
        } else if (selectedRow !== null) {
            if (!await customConfirm(`确定删除第 ${selectedRow} 行？`, '确认删除')) return;
            sh.del(selectedRow);
            
            if (summarizedRows[ti]) {
                const index = summarizedRows[ti].indexOf(selectedRow);
                if (index > -1) summarizedRows[ti].splice(index, 1);
                summarizedRows[ti] = summarizedRows[ti].map(ri => ri > selectedRow ? ri - 1 : ri);
                saveSummarizedRows();
            }
            
            selectedRow = null;
        } else {
            await customAlert('请先选中要删除的行（勾选复选框或点击行）', '提示');
            return;
        }
        
        m.save();
        refreshTable(ti);
        updateTabCount(ti);
    });
    
    // Delete键删除
    $(document).off('keydown.deleteRow').on('keydown.deleteRow', function(e) { 
        if (e.key === 'Delete' && (selectedRow !== null || selectedRows.length > 0) && $('#g-pop').length > 0) { 
            if ($(e.target).hasClass('g-e') || $(e.target).is('input, textarea')) return; 
            $('#g-dr').click();
        } 
    });
    
    // 搜索
    $('#g-src').off('input').on('input', function() { 
        const k = $(this).val().toLowerCase(); 
        $('.g-tbc:visible tbody tr:not(.g-emp)').each(function() { 
            $(this).toggle($(this).text().toLowerCase().includes(k) || k === ''); 
        }); 
    });
    
    // 新增行
    $('#g-ad').off('click').on('click', function() { 
        const ti = parseInt($('.g-t.act').data('i')); 
        const sh = m.get(ti); 
        if (sh) { 
            const nr = {}; 
            sh.c.forEach((_, i) => nr[i] = ''); 
            sh.ins(nr); 
            m.save(); 
            refreshTable(ti); 
            updateTabCount(ti); 
        } 
    });
    
    // 其他按钮保持不变...
    $('#g-sm').off('click').on('click', callAIForSummary);
    $('#g-ex').off('click').on('click', function() { 
        const d = { v: V, t: new Date().toISOString(), s: m.all().map(s => s.json()) }; 
        const j = JSON.stringify(d, null, 2); 
        const b = new Blob([j], { type: 'application/json' }); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement('a'); 
        a.href = u; 
        a.download = `memory_table_${m.gid()}_${Date.now()}.json`; 
        a.click(); 
        URL.revokeObjectURL(u); 
    });
    $('#g-reset-width').off('click').on('click', resetColWidths);
    // ✅✅ 新增：清空表格（保留总结）
$('#g-clear-tables').off('click').on('click', async function() {
    const hasSummary = m.sm.has();
    let confirmMsg = '确定清空所有详细表格吗？\n\n';
    
    if (hasSummary) {
        confirmMsg += '✅ 记忆总结将会保留\n';
        confirmMsg += '🗑️ 前8个表格的详细数据将被清空\n\n';
        confirmMsg += '建议先导出备份。';
    } else {
        confirmMsg += '⚠️ 当前没有总结，此操作将清空所有表格！\n\n建议先导出备份。';
    }
    
    if (!await customConfirm(confirmMsg, '清空表格')) return;
    
    // 只清空前8个表格（保留第9个总结表）
    m.all().slice(0, 8).forEach(s => s.clear());
    clearSummarizedMarks();
    m.save();
    
    await customAlert(hasSummary ? 
        '✅ 表格已清空，总结已保留\n\n下次聊天时AI会看到总结，从第0行开始记录新数据。' : 
        '✅ 所有表格已清空', 
        '完成'
    );
    
    $('#g-pop').remove();
    shw();
});

// ✅✅ 修改：全部清空（含总结）
$('#g-ca').off('click').on('click', async function() { 
    const hasSummary = m.sm.has();
    let confirmMsg = '⚠️⚠️⚠️ 危险操作 ⚠️⚠️⚠️\n\n确定清空所有数据吗？\n\n';
    
    if (hasSummary) {
        confirmMsg += '🗑️ 将删除所有详细表格\n';
        confirmMsg += '🗑️ 将删除记忆总结\n';
        confirmMsg += '🗑️ 将重置所有标记\n\n';
        confirmMsg += '💡 提示：如果想保留总结，请使用"清表格"按钮\n\n';
    } else {
        confirmMsg += '🗑️ 将删除所有表格数据\n\n';
    }
    
    confirmMsg += '此操作不可恢复！强烈建议先导出备份！';
    
    if (!await customConfirm(confirmMsg, '⚠️ 全部清空')) return;
    
    // 清空所有表格（包括总结）
    m.all().forEach(s => s.clear()); 
    clearSummarizedMarks();
    m.save(); 
    
    await customAlert('✅ 所有数据已清空（包括总结）', '完成');
    
    $('#g-pop').remove(); 
    shw(); 
});
    $('#g-tm').off('click').on('click', () => navTo('主题设置', shtm));
    $('#g-cf').off('click').on('click', () => navTo('配置', shcf));
}
    
    function refreshTable(ti) { 
        const sh = m.get(ti); 
        $(`.g-tbc[data-i="${ti}"]`).html($(gtb(sh, ti)).html()); 
        selectedRow = null; 
        selectedRows = [];
        bnd(); 
    }
    
    function updateTabCount(ti) { 
        const sh = m.get(ti); 
        const displayName = ti === 1 ? '支线剧情' : sh.n;
        $(`.g-t[data-i="${ti}"]`).text(`${displayName} (${sh.r.length})`); 
    }
    
    async function callAIForSummary() {
        const tables = m.all().slice(0, 8).filter(s => s.r.length > 0);
        if (tables.length === 0) { 
            await customAlert('没有表格数据，无法生成总结', '提示'); 
            return; 
        }
        
        const btn = $('#g-sm');
        const originalText = btn.text();
        btn.text('生成中...').prop('disabled', true);
        
        const tableText = m.getTableText();
        const fullPrompt = PROMPTS.summaryPrompt + '\n\n' + tableText;
        
        console.log('📝 发送给AI的总结提示词（纯表格数据）：');
        console.log(fullPrompt);
        
        try {
            let result;
            if (API_CONFIG.useIndependentAPI) {
                if (!API_CONFIG.apiKey) {
                    await customAlert('请先在配置中填写独立API密钥', '提示');
                    btn.text(originalText).prop('disabled', false);
                    return;
                }
                result = await callIndependentAPI(fullPrompt);
            } else {
                result = await callTavernAPI(fullPrompt);
            }
            
            btn.text(originalText).prop('disabled', false);
            
            if (result.success) {
                console.log('✅ AI返回的总结：');
                console.log(result.summary);
                showSummaryPreview(result.summary, tables);
            } else {
                await customAlert('生成失败：' + result.error, '错误');
            }
        } catch (e) {
            btn.text(originalText).prop('disabled', false);
            await customAlert('生成出错：' + e.message, '错误');
        }
    }
    
    function showSummaryPreview(summaryText, sourceTables) {
        const h = `
            <div class="g-p">
                <h4>📝 记忆总结预览</h4>
                <p style="color:#666; font-size:11px; margin-bottom:10px;">
                    ✅ 已从 <strong>${sourceTables.length}</strong> 个表格生成总结<br>
                    💡 您可以直接编辑润色内容，满意后点击保存
                </p>
                <textarea id="summary-editor" style="width:100%; height:350px; padding:10px; border:1px solid #ddd; border-radius:4px; font-size:12px; font-family:inherit; resize:vertical; line-height:1.8;">${esc(summaryText)}</textarea>
                <div style="margin-top:12px;">
                    <button id="save-summary" style="padding:8px 16px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; margin-right:8px;">✅ 保存总结</button>
                    <button id="cancel-summary" style="padding:8px 16px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">❌ 取消</button>
                </div>
            </div>
        `;
        
        $('#g-summary-pop').remove();
        const $o = $('<div>', { id: 'g-summary-pop', class: 'g-ov', css: { 'z-index': '10000001' } });
        const $p = $('<div>', { class: 'g-w', css: { width: '700px', maxWidth: '92vw', height: 'auto' } });
        const $hd = $('<div>', { class: 'g-hd' });
        $hd.append('<h3 style="color:#fff; flex:1;">📝 记忆总结</h3>');
        const $x = $('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '22px' } }).on('click', () => $o.remove());
        $hd.append($x);
        
        const $bd = $('<div>', { class: 'g-bd', html: h });
        $p.append($hd, $bd);
        $o.append($p);
        $('body').append($o);
        
        setTimeout(() => {
            $('#summary-editor').focus();
            
            $('#save-summary').on('click', async function() {
                const editedSummary = $('#summary-editor').val();
                
                if (!editedSummary.trim()) {
                    await customAlert('总结内容不能为空', '提示');
                    return;
                }
                
                m.sm.save(editedSummary);
                
                sourceTables.forEach(table => {
                    const ti = m.all().indexOf(table);
                    if (ti !== -1) {
                        for (let ri = 0; ri < table.r.length; ri++) {
                            markAsSummarized(ti, ri);
                        }
                    }
                });
                
                m.save();
                $o.remove();
                
                setTimeout(async () => {
                    if (await customConfirm('总结已保存！\n\n是否清空已总结的原始表格数据？\n\n• 点击"确定"：清空已总结的数据，只保留总结\n• 点击"取消"：保留原始数据（已总结的行会显示为淡绿色背景）', '保存成功')) {
                        clearSummarizedData();
                        await customAlert('已清空已总结的数据', '完成');
                    } else {
                        await customAlert('已保留原始数据（已总结的行显示为淡绿色）', '完成');
                    }
                    
                    if ($('#g-pop').length > 0) {
                        shw();
                    }
                    
                    $('.g-t[data-i="8"]').click();
                }, 100);
            });
            
            $('#cancel-summary').on('click', async () => {
                if (await customConfirm('确定取消？当前总结内容将丢失。', '确认')) {
                    $o.remove();
                }
            });
            
            $o.on('keydown', async e => { 
                if (e.key === 'Escape') {
                    if (await customConfirm('确定取消？当前总结内容将丢失。', '确认')) {
                        $o.remove();
                    }
                }
            });
        }, 100);
    }
    
    function clearSummarizedData() {
        Object.keys(summarizedRows).forEach(ti => {
            const tableIndex = parseInt(ti);
            const sh = m.get(tableIndex);
            if (sh && summarizedRows[ti] && summarizedRows[ti].length > 0) {
                sh.delMultiple(summarizedRows[ti]);
            }
        });
        
        clearSummarizedMarks();
        m.save();
    }
    
    async function callIndependentAPI(prompt) {
        try {
            let response;
            if (API_CONFIG.provider === 'gemini') {
                response = await fetch(`${API_CONFIG.apiUrl}?key=${API_CONFIG.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        contents: [{ parts: [{ text: prompt }] }] 
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    const summary = data.candidates[0].content.parts[0].text;
                    return { success: true, summary };
                }
            } else {
                response = await fetch(API_CONFIG.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_CONFIG.apiKey}`
                    },
                    body: JSON.stringify({
                        model: API_CONFIG.model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: API_CONFIG.temperature,
                        max_tokens: API_CONFIG.maxTokens
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    const summary = data.choices[0].message.content;
                    return { success: true, summary };
                }
            }
            const error = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${error}` };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    async function callTavernAPI(prompt) {
        try {
            const context = m.ctx();
            if (!context) {
                return { success: false, error: '无法访问酒馆上下文' };
            }
            
            if (typeof context.generateQuietPrompt === 'function') {
                const summary = await context.generateQuietPrompt(prompt, false, false);
                if (summary) {
                    return { success: true, summary };
                }
            } else if (typeof context.generateRaw === 'function') {
                const summary = await context.generateRaw(prompt, null, false, false);
                if (summary) {
                    return { success: true, summary };
                }
            } else if (typeof context.generate === 'function') {
                const summary = await context.generate(prompt, { 
                    quietPrompt: prompt,
                    quiet: true,
                    max_tokens: 1000, 
                    temperature: 0.7 
                });
                if (summary) {
                    return { success: true, summary };
                }
            } else {
                return { success: false, error: '酒馆API方法不可用，请使用独立API' };
            }
            
            return { success: false, error: '酒馆API未返回内容' };
        } catch (err) {
            return { success: false, error: `酒馆API调用失败: ${err.message}` };
        }
    }
    
function shtm() {
    // ✨ 修改：去掉了“背景色”选择器，只保留“主题色”和“字体色”
    const h = `
    <div class="g-p">
        <h4>🎨 主题设置</h4>
        
        <label>主题色（按钮、表头背景）：</label>
        <input type="color" id="tc" value="${UI.c}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;">
        <br><br>
        
        <label>字体颜色（按钮、表头文字）：</label>
        <input type="color" id="ttc" value="${UI.tc || '#ffffff'}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;">
        <br><br>
        
        <div style="background:rgba(255,255,255,0.6); padding:10px; border-radius:4px; font-size:10px; margin-bottom:12px; color:#333; border:1px solid rgba(0,0,0,0.1);">
            <strong>💡 提示：</strong><br>
            • 背景已固定为磨砂玻璃效果<br>
            • 如果主题色较浅，请将字体颜色设为深色（如黑色）<br>
            • 如果主题色较深，请将字体颜色设为浅色（如白色）
        </div>
        
        <button id="ts" style="padding:8px 16px; width:100%; margin-bottom:10px;">💾 保存</button>
        <button id="tr" style="padding:8px 16px; width:100%; background:#6c757d;">🔄 恢复默认</button>
    </div>`;
    
    pop('🎨 主题设置', h, true);
    
    setTimeout(() => {
        $('#ts').on('click', async function() { 
            UI.c = $('#tc').val(); 
            // UI.bc 不再需要获取
            UI.tc = $('#ttc').val(); 
            
            try { localStorage.setItem(UK, JSON.stringify(UI)); } catch (e) {} 
            m.save();
            thm(); 
            await customAlert('主题已保存', '成功'); 
        });
        
        $('#tr').on('click', async function() { 
            if (!await customConfirm('确定恢复默认主题？', '确认')) return;
            // 恢复默认：暗红背景，白字
            UI = { c: '#9c4c4c', bc: '#ffffff', tc: '#ffffff' }; 
            try { localStorage.removeItem(UK); } catch (e) {} 
            m.save();
            thm(); 
            await customAlert('已恢复默认主题', '成功'); 
            goBack(); 
        });
    }, 100);
}
    
    function shapi() {
        const h = `<div class="g-p"><h4>🤖 AI 总结配置</h4><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend style="font-size:11px; font-weight:600;">API选择</legend><label><input type="radio" name="api-mode" value="tavern" ${!API_CONFIG.useIndependentAPI ? 'checked' : ''}> 使用酒馆API（默认）</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;">使用酒馆当前连接的API，无需额外配置</p><br><label><input type="radio" name="api-mode" value="independent" ${API_CONFIG.useIndependentAPI ? 'checked' : ''}> 使用独立API</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;">使用下方配置的独立API（与酒馆分离）</p></fieldset><fieldset id="api-config-section" style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px; ${API_CONFIG.useIndependentAPI ? '' : 'opacity:0.5; pointer-events:none;'}"><legend style="font-size:11px; font-weight:600;">独立API配置</legend><label>API提供商：</label><select id="api-provider" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px;"><option value="openai" ${API_CONFIG.provider === 'openai' ? 'selected' : ''}>OpenAI</option><option value="gemini" ${API_CONFIG.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option><option value="openai-compatible" ${API_CONFIG.provider === 'openai-compatible' ? 'selected' : ''}>兼容OpenAI格式</option></select><label>API地址：</label><input type="text" id="api-url" value="${API_CONFIG.apiUrl}" placeholder="https://api.openai.com/v1/chat/completions" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px; margin-bottom:10px;"><label>API密钥：</label><input type="password" id="api-key" value="${API_CONFIG.apiKey}" placeholder="sk-..." style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px; margin-bottom:10px;"><label>模型名称：</label><input type="text" id="api-model" value="${API_CONFIG.model}" placeholder="gpt-3.5-turbo" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px; margin-bottom:10px;"><label>温度：<span id="api-temp-val">${API_CONFIG.temperature}</span></label><input type="range" id="api-temp" min="0" max="2" step="0.1" value="${API_CONFIG.temperature}" style="width:100%; margin-bottom:10px;"><label>最大Token数：</label><input type="number" id="api-tokens" value="${API_CONFIG.maxTokens}" min="100" max="32000" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;"></fieldset><button id="save-api" style="padding:6px 12px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存</button><button id="test-api" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;" ${API_CONFIG.useIndependentAPI ? '' : 'disabled'}>🧪 测试连接</button></div>`;
        pop('🤖 AI总结配置', h, true);
        setTimeout(() => {
            $('input[name="api-mode"]').on('change', function() {
                const isIndependent = $(this).val() === 'independent';
                if (isIndependent) {
                    $('#api-config-section').css({'opacity': '1', 'pointer-events': 'auto'});
                    $('#test-api').prop('disabled', false);
                } else {
                    $('#api-config-section').css({'opacity': '0.5', 'pointer-events': 'none'});
                    $('#test-api').prop('disabled', true);
                }
            });
            $('#api-temp').on('input', function() { $('#api-temp-val').text($(this).val()); });
            $('#api-provider').on('change', function() {
                const provider = $(this).val();
                if (provider === 'openai') {
                    $('#api-url').val('https://api.openai.com/v1/chat/completions');
                    $('#api-model').val('gpt-3.5-turbo');
                } else if (provider === 'gemini') {
                    $('#api-url').val('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent');
                    $('#api-model').val('gemini-pro');
                }
            });
            $('#save-api').on('click', async function() {
                API_CONFIG.useIndependentAPI = $('input[name="api-mode"]:checked').val() === 'independent';
                API_CONFIG.provider = $('#api-provider').val();
                API_CONFIG.apiUrl = $('#api-url').val();
                API_CONFIG.apiKey = $('#api-key').val();
                API_CONFIG.model = $('#api-model').val();
                API_CONFIG.temperature = parseFloat($('#api-temp').val());
                API_CONFIG.maxTokens = parseInt($('#api-tokens').val());
                API_CONFIG.enableAI = true;
                try { localStorage.setItem(AK, JSON.stringify(API_CONFIG)); } catch (e) {}
                await customAlert('API配置已保存', '成功');
            });
            $('#test-api').on('click', async function() {
                const btn = $(this);
                btn.text('测试中...').prop('disabled', true);
                try {
                    const result = await testAPIConnection();
                    if (result.success) {
                        await customAlert('API连接成功！\n\n' + result.message, '成功');
                    } else {
                        await customAlert('API连接失败\n\n' + result.error, '失败');
                    }
                } catch (e) {
                    await customAlert('测试出错：' + e.message, '错误');
                }
                btn.text('🧪 测试连接').prop('disabled', false);
            });
        }, 100);
    }
    
    async function testAPIConnection() {
        const config = {
            provider: $('#api-provider').val(),
            apiUrl: $('#api-url').val(),
            apiKey: $('#api-key').val(),
            model: $('#api-model').val()
        };
        if (!config.apiKey) return { success: false, error: '请输入API密钥' };
        try {
            let response;
            if (config.provider === 'gemini') {
                response = await fetch(`${config.apiUrl}?key=${config.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
                });
            } else {
                response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_tokens: 10
                    })
                });
            }
            if (response.ok) return { success: true, message: 'API连接正常' };
            else {
                const error = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${error}` };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    function shpmt() {
        const h = `<div class="g-p"><h4>📝 提示词管理</h4><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>填表提示词</legend><p style="font-size:10px; color:#666; margin-bottom:8px;">⚠️ 每次聊天都会发送给AI</p><textarea id="pmt-table" style="width:100%; height:300px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical; margin-bottom:10px;">${esc(PROMPTS.tablePrompt)}</textarea><label>注入位置：</label><select id="pmt-table-pos" style="width:100%; padding:5px; margin-bottom:10px;"><option value="system" ${PROMPTS.tablePromptPos === 'system' ? 'selected' : ''}>系统消息</option><option value="user" ${PROMPTS.tablePromptPos === 'user' ? 'selected' : ''}>用户消息</option><option value="assistant" ${PROMPTS.tablePromptPos === 'assistant' ? 'selected' : ''}>助手消息</option></select><label>位置类型：</label><select id="pmt-table-pos-type" style="width:100%; padding:5px; margin-bottom:10px;"><option value="absolute" ${PROMPTS.tablePromptPosType === 'absolute' ? 'selected' : ''}>相对位置（固定）</option><option value="chat" ${PROMPTS.tablePromptPosType === 'chat' ? 'selected' : ''}>聊天位置（动态）</option></select><div id="pmt-table-depth-container" style="${PROMPTS.tablePromptPosType === 'chat' ? '' : 'display:none;'}"><label>深度：</label><input type="number" id="pmt-table-depth" value="${PROMPTS.tablePromptDepth}" min="0" style="width:100%; padding:5px;"><p style="font-size:10px; color:#666;">深度表示从指定位置往前偏移的消息数</p></div></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>总结提示词</legend><p style="font-size:10px; color:#666; margin-bottom:8px;">⚠️ 仅在点击"📝 总结"或自动总结时使用，只发送表格数据，不发送聊天记录</p><textarea id="pmt-summary" style="width:100%; height:200px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical; margin-bottom:10px;">${esc(PROMPTS.summaryPrompt)}</textarea></fieldset><button id="save-pmt">💾 保存</button><button id="reset-pmt">🔄 恢复默认</button></div>`;
        pop('📝 提示词管理', h, true);
        setTimeout(() => {
            $('#pmt-table-pos-type').on('change', function() {
                if ($(this).val() === 'chat') {
                    $('#pmt-table-depth-container').show();
                } else {
                    $('#pmt-table-depth-container').hide();
                }
            });
            $('#save-pmt').on('click', async function() {
    PROMPTS.tablePrompt = $('#pmt-table').val();
    PROMPTS.tablePromptPos = $('#pmt-table-pos').val();
    PROMPTS.tablePromptPosType = $('#pmt-table-pos-type').val();
    PROMPTS.tablePromptDepth = parseInt($('#pmt-table-depth').val()) || 0;
    PROMPTS.summaryPrompt = $('#pmt-summary').val();
    PROMPTS.promptVersion = PROMPT_VERSION;
    try { localStorage.setItem(PK, JSON.stringify(PROMPTS)); } catch (e) {}
    await customAlert('提示词已保存', '成功');
});
            $('#reset-pmt').on('click', async function() {
                if (!await customConfirm('确定恢复默认提示词？', '确认')) return;
                $('#pmt-table-pos').val('system');
                $('#pmt-table-pos-type').val('absolute');
                await customAlert('提示词位置已重置，请点击保存', '提示');
            });
        }, 100);
    }
    
function shcf() {
    // ✨ 修改：增加了“启用插件总开关”的选项
    const h = `<div class="g-p"><h4>⚙️ 高级配置</h4>
    <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
        <legend>全局设置</legend>
        <label style="font-weight:bold; color:#d32f2f;">
            <input type="checkbox" id="c-enabled" ${C.enabled ? 'checked' : ''}> 启用记忆表格插件
        </label>
        <p style="font-size:10px; color:#666; margin:4px 0 0 20px;">关闭后，插件将停止所有自动记录、注入和同步功能，按钮仍然保留。</p>
    </fieldset>
    <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>表格数据注入</legend><label><input type="checkbox" id="c-table-inj" ${C.tableInj ? 'checked' : ''}> 启用表格数据注入</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;">📌 此处是表格和总结一起注入的位置</p><br><label>注入位置：</label><select id="c-table-pos" style="width:100%; padding:5px;"><option value="system" ${C.tablePos === 'system' ? 'selected' : ''}>系统消息</option><option value="user" ${C.tablePos === 'user' ? 'selected' : ''}>用户消息</option><option value="assistant" ${C.tablePos === 'assistant' ? 'selected' : ''}>助手消息</option></select><br><br><label>位置类型：</label><select id="c-table-pos-type" style="width:100%; padding:5px;"><option value="absolute" ${C.tablePosType === 'absolute' ? 'selected' : ''}>相对位置（固定）</option><option value="chat" ${C.tablePosType === 'chat' ? 'selected' : ''}>聊天位置（动态）</option></select><br><br><div id="c-table-depth-container" style="${C.tablePosType === 'chat' ? '' : 'display:none;'}"><label>深度：</label><input type="number" id="c-table-depth" value="${C.tableDepth}" min="0" style="width:100%; padding:5px;"></div></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>自动总结</legend><label><input type="checkbox" id="c-auto-sum" ${C.autoSummary ? 'checked' : ''}> 启用自动总结</label><br><br><label>触发楼层数：</label><input type="number" id="c-auto-floor" value="${C.autoSummaryFloor}" min="10" style="width:100%; padding:5px;"><p style="font-size:10px; color:#666; margin:4px 0 0 0;">⚠️ 达到指定楼层数后，会自动调用AI总结表格数据（只发送表格，不发送聊天记录）</p></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>功能入口</legend><button id="open-api" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px; margin-right:5px;">🤖 AI总结配置</button><button id="open-pmt" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">📝 提示词管理</button></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>其他选项</legend><label><input type="checkbox" id="c-log" ${C.log ? 'checked' : ''}> 控制台详细日志</label><br><br><label><input type="checkbox" id="c-pc" ${C.pc ? 'checked' : ''}> 每个角色独立数据</label><br><br><label><input type="checkbox" id="c-hide" ${C.hideTag ? 'checked' : ''}> 隐藏聊天中的记忆标签</label><br><br><label><input type="checkbox" id="c-filter" ${C.filterHistory ? 'checked' : ''}> 自动过滤历史标签</label></fieldset><button id="save-cfg">💾 保存配置</button></div>`;
    
    pop('⚙️ 配置', h, true);
    setTimeout(() => {
        $('#c-table-pos-type').on('change', function() {
            if ($(this).val() === 'chat') {
                $('#c-table-depth-container').show();
            } else {
                $('#c-table-depth-container').hide();
            }
        });
        $('#save-cfg').on('click', async function() {
            // ✨ 保存总开关状态
            C.enabled = $('#c-enabled').is(':checked');
            
            C.tableInj = $('#c-table-inj').is(':checked');
            C.tablePos = $('#c-table-pos').val();
            C.tablePosType = $('#c-table-pos-type').val();
            C.tableDepth = parseInt($('#c-table-depth').val()) || 0;
            C.autoSummary = $('#c-auto-sum').is(':checked');
            C.autoSummaryFloor = parseInt($('#c-auto-floor').val()) || 50;
            C.log = $('#c-log').is(':checked');
            C.pc = $('#c-pc').is(':checked');
            C.hideTag = $('#c-hide').is(':checked');
            C.filterHistory = $('#c-filter').is(':checked');
            
            // 保存后如果关闭了，提示一下
            if (!C.enabled) {
                await customAlert('插件已禁用，停止自动记录和注入。\n(按钮将保留以便您随时重新开启)', '已禁用');
            } else {
                await customAlert('配置已保存', '成功');
            }
        });
        $('#open-api').on('click', () => navTo('AI总结配置', shapi));
        $('#open-pmt').on('click', () => navTo('提示词管理', shpmt));
    }, 100);
}
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    
function omsg(id) {
    if (!C.enabled) return;
    console.log('🔔🔔🔔 omsg 被调用了！参数:', id);
    try {
        const x = m.ctx();
        if (!x || !x.chat) {
            console.log('❌ ctx或chat不存在');
            return;
        }
        
        const i = typeof id === 'number' ? id : x.chat.length - 1;
        const mg = x.chat[i];
        
        if (!mg || mg.is_user) {
            console.log(mg ? '⚠️ 是用户消息，跳过' : '❌ 消息不存在');
            return;
        }
        
        const swipeId = mg.swipe_id ?? 0;
        const msgKey = `${i}_${swipeId}`;
        
        // ✅✅ 核心修复：先检查是否已处理过这个swipe
        if (processedMessages.has(msgKey)) {
            console.log(`⚠️ 消息${msgKey}已处理过，跳过`);
            return;
        }
        
        console.log('📋 消息详情:', {
            索引: i,
            swipe: swipeId,
            msgKey: msgKey
        });
        
        // ✅✅ 关键修复：在执行指令之前保存快照
        console.log(`📸 [BEFORE] 保存执行前快照: ${msgKey}`);
        const beforeSnapshot = {
            data: m.all().map(sh => JSON.parse(JSON.stringify(sh.json()))),
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: Date.now()
        };
        snapshotHistory[`before_${msgKey}`] = beforeSnapshot;
        
        // 解析和执行指令
        const tx = mg.mes || mg.swipes?.[swipeId] || '';
        console.log(`📝 消息内容长度: ${tx.length}字符`);
        
        const cs = prs(tx);
        if (cs.length > 0) { 
            console.log(`✅ [PARSE] 解析到 ${cs.length} 条指令:`, cs.map(c => `${c.t}(表${c.ti},行${c.ri ?? '新'})`)); 
            exe(cs); 
            console.log(`📊 执行后表格状态:`, m.s.map(s => `${s.n}:${s.r.length}行`));
        } else {
            console.log(`ℹ️ 未找到记忆标签`);
        }
        
        // ✅✅ 保存执行后的快照（用于查看）
        const afterSnapshot = {
            data: m.all().map(sh => JSON.parse(JSON.stringify(sh.json()))),
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: Date.now()
        };
        snapshotHistory[`after_${msgKey}`] = afterSnapshot;
        
        // 标记为已处理
        processedMessages.add(msgKey);
        console.log(`✅ 消息${msgKey}已标记为已处理`);
        
        lastProcessedMsgIndex = i;
        cleanOldSnapshots();
        
        if (C.autoSummary && x.chat.length >= C.autoSummaryFloor && !m.sm.has()) {
            console.log(`🤖 [AUTO SUMMARY] 达到${C.autoSummaryFloor}条消息，触发自动总结`);
            callAIForSummary();
        }
        
        setTimeout(hideMemoryTags, 100);
    } catch (e) { 
        console.error('❌ 消息处理失败:', e); 
    }
}
    
    function ochat() { 
    m.load(); 
    
    // ✅ 切换聊天时清空快照和标记
    snapshotHistory = {};
    lastProcessedMsgIndex = -1;
    isRegenerating = false;
    deletedMsgIndex = -1;
    processedMessages.clear(); // ✅✅ 新增：清空已处理消息集合
    
    console.log('🔄 聊天已切换，快照历史已清空');
    setTimeout(hideMemoryTags, 500); 
}
  function opmt(ev) { 
    try { 
        console.log('📤📤📤 [INJECT] 准备注入提示词...');
        console.log('🔍 当前状态:', {
            isRegenerating,
            deletedMsgIndex,
            chatLength: ev.chat.length,
            现有快照: Object.keys(snapshotHistory).filter(k => k.startsWith('before_')).sort()
        });
        
        // ✅✅✅ 核心修复：重新生成时恢复到"生成前"快照
        if (isRegenerating && deletedMsgIndex >= 0) {
            console.log(`🚨 检测到重新生成消息${deletedMsgIndex}`);
            
            // 查找所有该消息的before快照（可能有多个swipe）
            const beforeKeys = Object.keys(snapshotHistory).filter(k => {
                const match = k.match(/^before_(\d+)_(\d+)$/);
                return match && parseInt(match[1]) === deletedMsgIndex;
            });
            
            console.log(`🔍 找到 ${beforeKeys.length} 个before快照:`, beforeKeys);
            
            let restored = false;
            
            if (beforeKeys.length > 0) {
                // ✅ 使用最早的before快照（第一次生成前的状态）
                const firstBeforeKey = beforeKeys.sort()[0];
                console.log(`🎯 恢复到: ${firstBeforeKey}`);
                
                const snapshot = snapshotHistory[firstBeforeKey];
                if (snapshot) {
                    // ✅ 只清空前8个表格，保留总结表
                    m.s.slice(0, 8).forEach(sheet => { sheet.r = []; });
                    
                    // ✅ 只恢复前8个表格数据
                    snapshot.data.forEach((sd, i) => {
                        if (i < 8 && m.s[i]) {
                            m.s[i].from(sd);
                        }
                    });
                    
                    summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
                    m.save();
                    
                    console.log(`✅ 已恢复到${firstBeforeKey}`);
                    console.log(`📊 恢复后表格:`, m.s.map(s => `${s.n}:${s.r.length}行`).join(', '));
                    restored = true;
                }
            }
            
            if (!restored) {
                // ✅ 如果没找到，尝试恢复到上一条AI消息的after快照
                console.log('⚠️ 未找到before快照，查找上一条AI消息的after快照');
                for (let i = deletedMsgIndex - 1; i >= 0; i--) {
                    const afterKeys = Object.keys(snapshotHistory).filter(k => {
                        const match = k.match(/^after_(\d+)_(\d+)$/);
                        return match && parseInt(match[1]) === i;
                    });
                    
                    if (afterKeys.length > 0) {
                        const lastAfterKey = afterKeys.sort().reverse()[0]; // 最新的swipe
                        console.log(`🎯 恢复到上一条消息: ${lastAfterKey}`);
                        
                        const snapshot = snapshotHistory[lastAfterKey];
                        if (snapshot) {
                            // ✅ 只清空前8个表格，保留总结表
                            m.s.slice(0, 8).forEach(sheet => { sheet.r = []; });
                            // ✅ 只恢复前8个表格数据
                            snapshot.data.forEach((sd, i) => {
                                if (i < 8 && m.s[i]) m.s[i].from(sd);
                            });
                            summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
                            m.save();
                            console.log(`✅ 已恢复到${lastAfterKey}`);
                            restored = true;
                            break;
                        }
                    }
                }
            }
            
            if (!restored) {
                console.warn('⚠️ 没有找到任何可用快照，保持当前状态');
            }
            
            // ✅ 恢复完成后重置标记
            isRegenerating = false;
            deletedMsgIndex = -1;
            console.log('🔓 重新生成标记已重置');
        }
        
        console.log('📊 即将注入的表格数据:', m.s.map(s => `${s.n}:${s.r.length}行`).join(', '));
        inj(ev); 
        console.log('✅ 注入完成');
    } catch (e) { 
        console.error('❌ 注入失败:', e); 
    } 
}
    
function ini() {
    // 1. 基础依赖检查
    if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') { 
        console.log('⏳ 等待依赖加载...');
        setTimeout(ini, 500); 
        return; 
    }

    // ✨✨✨ 核心修改：精准定位顶部工具栏 ✨✨✨
    // 策略：找到“高级格式化(A)”按钮或者“AI配置”按钮，把我们的按钮插在它们后面
    let $anchor = $('#advanced-formatting-button'); 
    if ($anchor.length === 0) $anchor = $('#ai-config-button');
    
    // 如果还是找不到（极少数情况），回退到找扩展菜单
    if ($anchor.length === 0) $anchor = $('#extensionsMenu');

    console.log('✅ 工具栏定位点已找到:', $anchor.attr('id'));

    // --- 加载设置 (保持不变) ---
    try { const sv = localStorage.getItem(UK); if (sv) UI = { ...UI, ...JSON.parse(sv) }; } catch (e) {}
    try { 
        const pv = localStorage.getItem(PK); 
        if (pv) {
            const savedPrompts = JSON.parse(pv);
            PROMPTS = { ...PROMPTS, ...savedPrompts };
            if (savedPrompts.promptVersion !== PROMPT_VERSION) {
                PROMPTS.promptVersion = PROMPT_VERSION;
                localStorage.setItem(PK, JSON.stringify(PROMPTS));
            }
        } else {
            PROMPTS.promptVersion = PROMPT_VERSION;
            localStorage.setItem(PK, JSON.stringify(PROMPTS));
        }
    } catch (e) {}
    try { const av = localStorage.getItem(AK); if (av) API_CONFIG = { ...API_CONFIG, ...JSON.parse(av) }; } catch (e) {}
    
    loadColWidths();
    loadSummarizedRows();
    m.load();
    thm();
    
    const emptySnapshot = {
        data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))), 
        summarized: JSON.parse(JSON.stringify(summarizedRows)),
        timestamp: Date.now()
    };
    snapshotHistory['before_-1_0'] = emptySnapshot;

    // ✨✨✨ 修改重点：创建完美融入顶部栏的按钮 ✨✨✨
    $('#gaigai-wrapper').remove(); // 移除旧按钮防止重复
    
    // 1. 创建容器 (模仿酒馆的 drawer 结构，这样间距和高度会自动对齐)
    const $wrapper = $('<div>', { 
        id: 'gaigai-wrapper',
        class: 'drawer' // 关键：使用 drawer 类名，骗过 CSS 让它认为这是原生按钮
    });

    // 2. 创建对齐容器
    const $toggle = $('<div>', { class: 'drawer-toggle' });

    // 3. 创建图标 (模仿原生图标样式)
    const $icon = $('<div>', {
        id: 'gaigai-top-btn',
        // 关键：使用 drawer-icon 类名，这样大小、颜色、鼠标悬停效果就和旁边的“A”图标一模一样了
        class: 'drawer-icon fa-solid fa-table fa-fw interactable', 
        title: '记忆表格',
        tabindex: '0'
    }).on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        shw(); // 点击打开表格
    });

    // 4. 组装
    $toggle.append($icon);
    $wrapper.append($toggle);

    // 5. 插入到定位点后面 (即“A”图标或者“AI配置”图标的右边)
    if ($anchor.length > 0) {
        $anchor.after($wrapper);
        console.log('✅ 按钮已成功插入到顶部工具栏');
    } else {
        console.warn('⚠️ 未找到工具栏定位点，尝试追加到 body');
        $('body').append($wrapper);
    }
    // ✨✨✨ 修改结束 ✨✨✨
    
    // --- 事件监听 (保持不变) ---
    const x = m.ctx();
    if (x && x.eventSource) {
        try {
            x.eventSource.on(x.event_types.CHARACTER_MESSAGE_RENDERED, function(id) { omsg(id); });
            x.eventSource.on(x.event_types.CHAT_CHANGED, function() { ochat(); });
            x.eventSource.on(x.event_types.CHAT_COMPLETION_PROMPT_READY, function(ev) { opmt(ev); });
            x.eventSource.on(x.event_types.MESSAGE_DELETED, function(eventData) {
                let msgIndex;
                if (typeof eventData === 'number') msgIndex = eventData;
                else if (eventData && typeof eventData === 'object') msgIndex = eventData.index ?? eventData.messageIndex ?? eventData.mesId;
                else if (arguments.length > 1) msgIndex = arguments[1];
                
                if (msgIndex === undefined || msgIndex === null) {
                    const ctx = m.ctx();
                    if (ctx && ctx.chat) msgIndex = ctx.chat.length;
                }
                isRegenerating = true;
                deletedMsgIndex = msgIndex;
                const toDelete = [];
                processedMessages.forEach(key => { if (key.startsWith(`${msgIndex}_`)) toDelete.push(key); });
                toDelete.forEach(key => processedMessages.delete(key));
            });
        } catch (e) {
            console.error('❌ 事件监听注册失败:', e);
        }
    }
    
    setTimeout(hideMemoryTags, 1000);
    console.log('✅ 记忆表格 v' + V + ' 已就绪');
}

// ✅ 修复：增加重试次数，延长等待时间
let initRetryCount = 0;
const maxRetries = 20; // 最多重试20次（10秒）

function tryInit() {
    initRetryCount++;
    if (initRetryCount > maxRetries) {
        console.error('❌ 记忆表格初始化失败：超过最大重试次数');
        return;
    }
    ini();
}

setTimeout(tryInit, 1000);
// ✅✅✅ 直接把核心变量挂到 window.Gaigai 上
window.Gaigai = { 
    v: V, 
    m: m, 
    shw: shw, 
    cleanMemoryTags: cleanMemoryTags, 
    MEMORY_TAG_REGEX: MEMORY_TAG_REGEX, 
    config: API_CONFIG, 
    prompts: PROMPTS
};

// ✅ 使用 Object.defineProperty 创建引用（实现双向同步）
Object.defineProperty(window.Gaigai, 'snapshotHistory', {
    get() { return snapshotHistory; },
    set(val) { snapshotHistory = val; }
});

Object.defineProperty(window.Gaigai, 'isRegenerating', {
    get() { return isRegenerating; },
    set(val) { isRegenerating = val; }
});

Object.defineProperty(window.Gaigai, 'deletedMsgIndex', {
    get() { return deletedMsgIndex; },
    set(val) { deletedMsgIndex = val; }
});

// ✅ 工具函数直接暴露
window.Gaigai.saveSnapshot = saveSnapshot;
window.Gaigai.restoreSnapshot = restoreSnapshot;

console.log('✅ window.Gaigai 已挂载', window.Gaigai);
})();






































