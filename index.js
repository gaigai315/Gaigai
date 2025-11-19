// 记忆表格 v1.4.1
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v1.4.1 启动');
    
    const V = 'v1.4.1';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 4;
    const AK = 'gg_api';
    const CWK = 'gg_col_widths';
    const SMK = 'gg_summarized';
    
    let UI = { c: '#9c4c4c', bc: '#ffffff', tc: '#ffffff' };
    
    const C = { 
        enabled: true, // 总开关
        contextLimit: false,       // 隐藏楼层开关
        contextLimitCount: 30,     // 隐藏楼层数量
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
    let snapshotHistory = {}; 
    let lastProcessedMsgIndex = -1; 
    let isRegenerating = false; 
    let deletedMsgIndex = -1; 
    let processedMessages = new Set(); 
    let beforeGenerateSnapshotKey = null;
    let lastManualEditTime = 0; 
    let lastInternalSaveTime = 0; 
    
    // ✅ 自定义弹窗函数 (修复版：颜色完美跟随主题)
    function customAlert(message, title = '提示') {
        return new Promise((resolve) => {
            const id = 'custom-alert-' + Date.now();
            const $overlay = $('<div>', { 
                id: id,
                css: {
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', zIndex: 10000000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', margin: 0
                }
            });
            
            const $dialog = $('<div>', {
                css: {
                    background: '#fff', borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    maxWidth: '500px', width: '90%',
                    maxHeight: '80vh', overflow: 'auto'
                }
            });
            
            const $header = $('<div>', {
                css: {
                    background: UI.c,
                    color: UI.tc || '#ffffff', // ✨ 修复：跟随主题字体色
                    padding: '16px 20px', borderRadius: '12px 12px 0 0',
                    fontSize: '16px', fontWeight: '600'
                },
                text: title
            });
            
            const $body = $('<div>', {
                css: {
                    padding: '24px 20px', fontSize: '14px', lineHeight: '1.6',
                    color: '#333', whiteSpace: 'pre-wrap'
                },
                text: message
            });
            
            const $footer = $('<div>', {
                css: {
                    padding: '12px 20px', borderTop: '1px solid #eee', textAlign: 'right'
                }
            });
            
            const $okBtn = $('<button>', {
                text: '确定',
                css: {
                    background: UI.c,
                    color: UI.tc || '#ffffff', // ✨ 修复：跟随主题字体色
                    border: 'none', padding: '8px 24px', borderRadius: '6px',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
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
                if (e.target === $overlay[0]) { $overlay.remove(); resolve(false); }
            });
            
            $(document).on('keydown.' + id, (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    $(document).off('keydown.' + id); $overlay.remove(); resolve(true);
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
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.6)', zIndex: 10000000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', margin: 0
                }
            });
            
            const $dialog = $('<div>', {
                css: {
                    background: '#fff', borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    maxWidth: '500px', width: '90%',
                    maxHeight: '80vh', overflow: 'auto'
                }
            });
            
            const $header = $('<div>', {
                css: {
                    background: UI.c,
                    color: UI.tc || '#ffffff', // ✨ 修复：跟随主题字体色
                    padding: '16px 20px', borderRadius: '12px 12px 0 0',
                    fontSize: '16px', fontWeight: '600'
                },
                text: title
            });
            
            const $body = $('<div>', {
                css: {
                    padding: '24px 20px', fontSize: '14px', lineHeight: '1.6',
                    color: '#333', whiteSpace: 'pre-wrap'
                },
                text: message
            });
            
            const $footer = $('<div>', {
                css: {
                    padding: '12px 20px', borderTop: '1px solid #eee', textAlign: 'right',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }
            });
            
            const $cancelBtn = $('<button>', {
                text: '取消',
                css: {
                    background: '#6c757d', color: '#ffffff', // ✨ 修复：白色字
                    border: 'none', padding: '8px 24px', borderRadius: '6px',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
                }
            }).on('click', () => { $overlay.remove(); resolve(false); });
            
            const $okBtn = $('<button>', {
                text: '确定',
                css: {
                    background: UI.c,
                    color: UI.tc || '#ffffff', // ✨ 修复：跟随主题字体色
                    border: 'none', padding: '8px 24px', borderRadius: '6px',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
                }
            }).on('click', () => { $overlay.remove(); resolve(true); });
            
            // 悬停效果
            $cancelBtn.hover(function(){$(this).css('filter','brightness(0.9)')}, function(){$(this).css('filter','brightness(1)')});
            $okBtn.hover(function(){$(this).css('filter','brightness(0.9)')}, function(){$(this).css('filter','brightness(1)')});

            $footer.append($cancelBtn, $okBtn);
            $dialog.append($header, $body, $footer);
            $overlay.append($dialog);
            $('body').append($overlay);
            
            $overlay.on('click', (e) => {
                if (e.target === $overlay[0]) { $overlay.remove(); resolve(false); }
            });
            
            $(document).on('keydown.' + id, (e) => {
                if (e.key === 'Escape') { $(document).off('keydown.' + id); $overlay.remove(); resolve(false); } 
                else if (e.key === 'Enter') { $(document).off('keydown.' + id); $overlay.remove(); resolve(true); }
            });
        });
    }
    
    class S {
        constructor(n, c) { this.n = n; this.c = c; this.r = []; }
        upd(i, d) { 
            if (i < 0) return;
            if (i > this.r.length) return;
            if (i === this.r.length) this.r.push({});
            
            Object.entries(d).forEach(([k, v]) => {
                // 自动追加逻辑
                if (this.n === '主线剧情' && k == '3' && this.r[i][k] && v) {
                    const oldContent = this.r[i][k].trim();
                    const newContent = v.trim();
                    if (!oldContent.includes(newContent)) {
                        this.r[i][k] = oldContent + '；' + newContent;
                    }
                } else if (this.n === '支线追踪' && k == '4' && this.r[i][k] && v) {
                    const oldContent = this.r[i][k].trim();
                    const newContent = v.trim();
                    if (!oldContent.includes(newContent)) {
                        this.r[i][k] = oldContent + '；' + newContent;
                    }
                } else {
                    this.r[i][k] = v; 
                }
            });
        }
        ins(d) { this.r.push(d); }
        del(i) { if (i >= 0 && i < this.r.length) this.r.splice(i, 1); }
        delMultiple(indices) {
            const sorted = indices.sort((a, b) => b - a);
            sorted.forEach(i => { if (i >= 0 && i < this.r.length) this.r.splice(i, 1); });
        }
        clear() { this.r = []; }
        json() { return { n: this.n, c: this.c, r: this.r }; }
        from(d) { this.r = d.r || []; }
        txt() {
            if (this.r.length === 0) return '';
            let t = `【${this.n}】\n`;
            this.r.forEach((rw, i) => {
                t += `  [${i}] `;
                this.c.forEach((cl, ci) => { if (rw[ci]) t += `${cl}:${rw[ci]} | `; });
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
                        const t = match[1].trim(), c = match[2].trim();
                        const ex = sumSheet.r.findIndex(r => r[0] === t);
                        if (ex >= 0) sumSheet.upd(ex, { 1: sumSheet.r[ex][1] + '\n\n' + c });
                        else sumSheet.ins({ 0: t, 1: c });
                    } else if (line.trim()) {
                        const ex = sumSheet.r.findIndex(r => r[0] === '综合');
                        if (ex >= 0) sumSheet.upd(ex, { 1: sumSheet.r[ex][1] + '\n\n' + line.trim() });
                        else sumSheet.ins({ 0: '综合', 1: line.trim() });
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
        clear() { const sumSheet = this.m.get(8); sumSheet.clear(); this.m.save(); }
        has() { const sumSheet = this.m.get(8); return sumSheet.r.length > 0 && sumSheet.r[0][1]; }
        getTime() { return ''; }
    }    
    
    class M {
        constructor() { this.s = []; this.id = null; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        save() {
            const id = this.gid();
            if (!id) {
                console.warn('⚠️ 无法获取ID，跳过保存');
                return;
            }
            const now = Date.now();
            lastInternalSaveTime = now; 
            const data = { 
                v: V, id: id, ts: now, 
                d: this.s.map(sh => sh.json()),
                summarized: summarizedRows,
                ui: UI, colWidths: userColWidths
            };
            try { localStorage.setItem(`${SK}_${id}`, JSON.stringify(data)); } catch (e) {}
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chatMetadata) {
                        ctx.chatMetadata.gaigai = data;
                        if (typeof ctx.saveChat === 'function') ctx.saveChat();
                    }
                } catch (e) {}
            }
        }
        
        load() {
            const id = this.gid();
            if (!id) return;
            if (this.id !== id) { 
                this.id = id; this.s = []; 
                T.forEach(tb => this.s.push(new S(tb.n, tb.c))); 
                this.sm = new SM(this); 
                lastInternalSaveTime = 0; 
            }
            let c = null, l = null;
            if (C.cloudSync) { try { const x = this.ctx(); if (x?.chatMetadata?.gaigai) c = x.chatMetadata.gaigai; } catch (e) {} }
            try { const s = localStorage.getItem(`${SK}_${id}`); if (s) l = JSON.parse(s); } catch (e) {}
            
            let f = c && l ? (c.ts > l.ts ? c : l) : (c || l);
            
            if (f && f.ts <= lastInternalSaveTime) {
                console.log(`🛡️ [数据保护] 拦截到过时加载请求，保留当前回档状态。`);
                return;
            }
            
            if (f && f.v && f.d) {
                f.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
                if (f.summarized) summarizedRows = f.summarized;
                if (f.ui) { UI = { ...UI, ...f.ui }; thm(); }
                if (f.colWidths) userColWidths = f.colWidths;
                lastInternalSaveTime = f.ts;
                console.log(`✅ 数据加载成功 (${f.v})`);
            }
        }
            
        gid() {
            try {
                const x = this.ctx();
                if (!x) return 'default';
                const cid = x.chatMetadata?.file_name || x.chatId || 'default_chat';
                if (C.pc) { const cn = x.name2 || x.characterId || 'unknown'; return `${cn}_${cid}`; }
                return cid;
            } catch (e) { return 'default'; }
        }
        ctx() { return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null; }
        getTableText() {
            const sh = this.s.slice(0, 8).filter(s => s.r.length > 0);
            if (sh.length === 0) return '';
            return sh.map(s => s.txt()).join('\n');
        }
        pmt() {
            let r = '';
            if (this.sm.has()) r += '=== 📚 记忆总结 ===\n\n' + this.sm.load() + '\n\n=== 总结结束 ===\n\n';
            const sh = this.s.slice(0, 8).filter(s => s.r.length > 0);
            if (sh.length > 0) {
                r += '=== 📊 详细表格 ===\n\n';
                sh.forEach(s => r += s.txt() + '\n');
                r += '=== 表格结束 ===\n';
            }
            return r;
        }
    }

    function saveSnapshot(msgIndex) {
        try {
            const snapshot = {
                data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))),
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            snapshotHistory[msgIndex] = snapshot;
            console.log(`📸 快照${msgIndex}已保存`);
        } catch (e) { console.error('❌ 快照保存失败:', e); }
    }

    // ✅✅✅ [核心修复] 强力回档函数 (防止快照污染 - 深拷贝版)
    function restoreSnapshot(msgIndex) {
        try {
            const key = msgIndex.toString();
            const snapshot = snapshotHistory[key];
            
            if (!snapshot) {
                console.warn(`⚠️ [回档失败] 找不到快照ID: ${key}`);
                return false;
            }
            
            m.s.slice(0, 8).forEach(sheet => sheet.r = []);
            
            // ✨ 深拷贝恢复，防止快照污染
            snapshot.data.forEach((sd, i) => {
                if (i < 8 && m.s[i]) {
                    const deepCopyData = JSON.parse(JSON.stringify(sd));
                    m.s[i].from(deepCopyData);
                }
            });
            
            if (snapshot.summarized) summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
            else summarizedRows = {};
            
            lastManualEditTime = 0; 
            m.save();
            
            const totalRecords = m.s.reduce((sum, s) => sum + s.r.length, 0);
            console.log(`✅ [完美回档] 快照${key}已恢复 (深拷贝模式) - 当前行数:${totalRecords}`);
            
            return true;
        } catch (e) {
            console.error('❌ 快照恢复失败:', e);
            return false;
        }
    }

    function cleanOldSnapshots() {
        const keys = Object.keys(snapshotHistory);
        if (keys.length > 30) {
            keys.sort((a, b) => parseInt(a) - parseInt(b));
            const toDel = keys.slice(0, keys.length - 30);
            toDel.forEach(k => delete snapshotHistory[k]);
        }
    }
    
    const m = new M();
    
    // 列宽管理
    function saveColWidths() { try { localStorage.setItem(CWK, JSON.stringify(userColWidths)); } catch (e) {} }
    function loadColWidths() { try { const s = localStorage.getItem(CWK); if (s) userColWidths = JSON.parse(s); } catch (e) {} }
    function getColWidth(ti, cn) { return userColWidths[ti]?.[cn] || DEFAULT_COL_WIDTHS[ti]?.[cn] || null; }
    function setColWidth(ti, cn, w) { if(!userColWidths[ti]) userColWidths[ti]={}; userColWidths[ti][cn]=w; saveColWidths(); m.save(); }
    
    async function resetColWidths() {
        if (await customConfirm('确定重置所有列宽为默认值？', '重置列宽')) {
            userColWidths = {};
            saveColWidths();
            m.save(); 
            await customAlert('列宽已重置，请重新打开表格', '成功');
            if ($('#g-pop').length > 0) shw();
        }
    }
    
    // 总结行管理
    function saveSummarizedRows() { try { localStorage.setItem(SMK, JSON.stringify(summarizedRows)); } catch (e) {} }
    function loadSummarizedRows() { try { const s = localStorage.getItem(SMK); if (s) summarizedRows = JSON.parse(s); } catch (e) {} }
    function markAsSummarized(ti, ri) { if(!summarizedRows[ti]) summarizedRows[ti]=[]; if(!summarizedRows[ti].includes(ri)) summarizedRows[ti].push(ri); saveSummarizedRows(); }
    function isSummarized(ti, ri) { return summarizedRows[ti] && summarizedRows[ti].includes(ri); }
    function clearSummarizedMarks() { summarizedRows = {}; saveSummarizedRows(); }
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    function cleanMemoryTags(text) { if (!text) return text; return text.replace(MEMORY_TAG_REGEX, '').trim(); }
    
    // 解析指令
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

    // 注入逻辑
    function inj(ev) {
        if (!C.enabled) return;
        
        const tableData = m.pmt();
        if (tableData && C.tableInj) {
            const dataPos = getInjectionPosition(C.tablePos, C.tablePosType, C.tableDepth, ev.chat);
            const role = getRoleByPosition(C.tablePos);
            ev.chat.splice(dataPos, 0, { role, content: tableData, isGaigaiData: true });
            console.log(`📊 表格数据已注入到位置${dataPos}`);
        }
        
        if (PROMPTS.tablePrompt) {
            const pmtPos = getInjectionPosition(PROMPTS.tablePromptPos, PROMPTS.tablePromptPosType, PROMPTS.tablePromptDepth, ev.chat);
            const role = getRoleByPosition(PROMPTS.tablePromptPos);
            ev.chat.splice(pmtPos, 0, { role, content: PROMPTS.tablePrompt, isGaigaiPrompt: true });
            console.log(`📝 填表提示词已注入到位置${pmtPos}`);
        }
        
        if (C.filterHistory) {
            console.log('🔍 开始清理历史标签...');
            ev.chat = ev.chat.map((msg, index) => {
                if (msg.isGaigaiPrompt || msg.isGaigaiData || msg.isPhoneMessage) return msg;
                if (msg.content && (msg.content.includes('📱 手机') || msg.content.includes('手机微信消息记录'))) return msg;
                
                if (msg.role === 'assistant' || !msg.is_user) {
                    const fields = ['content', 'mes', 'message', 'text'];
                    let cleaned = { ...msg };
                    let changed = false;
                    fields.forEach(f => {
                        if (cleaned[f] && typeof cleaned[f] === 'string' && MEMORY_TAG_REGEX.test(cleaned[f])) {
                            cleaned[f] = cleaned[f].replace(MEMORY_TAG_REGEX, '').trim();
                            changed = true;
                        }
                    });
                    if (changed) return cleaned;
                }
                return msg;
            });
            console.log('✅ 历史标签清理完成');
        }
        
        console.log('%c✅ 注入完成', 'color: green; font-weight: bold;');
    }

    function getRoleByPosition(pos) { return pos === 'system' ? 'system' : 'user'; }
    function getInjectionPosition(pos, posType, depth, chat) {
        const len = chat ? chat.length : 0;
        if (posType === 'absolute') return pos === 'system' ? 0 : len;
        if (posType === 'system_end') {
            if (!chat) return 0;
            let idx = -1;
            for (let i = 0; i < len; i++) if (chat[i] && chat[i].role === 'system') idx = i;
            return idx >= 0 ? idx + 1 : 0;
        }
        return Math.max(0, len - depth);
    }
    
    function hideMemoryTags() {
        if (!C.hideTag) return;
        $('.mes_text').each(function() {
            const $this = $(this);
            let html = $this.html();
            if (!html) return;
            if (MEMORY_TAG_REGEX.test(html)) {
                html = html.replace(MEMORY_TAG_REGEX, '<div class="g-hidden-tag" style="display:none!important;">$&</div>');
                $this.html(html);
            }
        });
    }
    
    // UI Functions
    function thm() {
        if (!UI.c) UI.c = '#9c4c4c';
        if (!UI.tc) UI.tc = '#ffffff';
        const style = `
        .g-ov { background: rgba(0, 0, 0, 0.35) !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 99999 !important; overflow: hidden !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 10px !important; box-sizing: border-box !important; }
        .g-w { background: rgba(255, 255, 255, 0.7) !important; backdrop-filter: blur(30px) saturate(180%) !important; -webkit-backdrop-filter: blur(30px) saturate(180%) !important; border: 1px solid rgba(255, 255, 255, 0.6) !important; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important; font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; position: relative !important; width: 90vw !important; height: 85vh !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; }
        .g-hd { background: ${UI.c} !important; opacity: 0.95; border-bottom: 1px solid rgba(0,0,0,0.1) !important; padding: 12px 16px !important; display: flex !important; align-items: center !important; }
        .g-hd h3 { color: ${UI.tc} !important; margin: 0 !important; display: flex !important; align-items: center !important; flex:1; }
        .g-bd { padding: 10px; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .g-ts { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; padding-bottom: 8px !important; border-bottom: 1px solid rgba(0,0,0,0.05) !important; margin-bottom: 8px !important; max-height: none !important; overflow: visible !important; }
        .g-t { background: rgba(255,255,255,0.3) !important; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 6px !important; padding: 6px 12px !important; margin: 0 !important; font-size: 12px !important; color: #555 !important; flex-grow: 1 !important; text-align: center !important; min-width: 60px !important; cursor: pointer; }
        .g-t.act { background: ${UI.c} !important; color: ${UI.tc} !important; font-weight: bold !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important; }
        .g-tb { flex: 1; overflow: auto; background: rgba(255,255,255,0.25); }
        .g-tbl-wrap table { table-layout: fixed !important; width: max-content !important; min-width: auto !important; border-collapse: separate !important; border-spacing: 0 !important; }
        .g-tbl-wrap th { background: ${UI.c} !important; color: ${UI.tc} !important; border-right: 1px solid rgba(0, 0, 0, 0.2) !important; border-bottom: 1px solid rgba(0, 0, 0, 0.2) !important; position: sticky !important; top: 0 !important; z-index: 10 !important; height: 32px !important; padding: 0 4px !important; box-sizing: border-box !important; white-space: nowrap !important; }
        .g-tbl-wrap td { border-right: 1px solid rgba(0, 0, 0, 0.15) !important; border-bottom: 1px solid rgba(0, 0, 0, 0.15) !important; background: rgba(255, 255, 255, 0.5) !important; box-sizing: border-box !important; padding: 0 !important; }
        .g-e { width: 100% !important; height: 100% !important; min-height: 40px !important; padding: 6px !important; background: transparent !important; white-space: pre-wrap !important; word-break: break-all !important; color: #333 !important; caret-color: ${UI.c} !important; outline:none; }
        .g-e:focus { outline: 2px solid ${UI.c} !important; background: #ffffff !important; z-index: 5 !important; }
        .g-col-resizer { position: absolute !important; right: -5px !important; top: 0 !important; bottom: 0 !important; width: 15px !important; cursor: col-resize !important; z-index: 20 !important; }
        .g-row.g-selected { background-color: rgba(156, 76, 76, 0.15) !important; outline: 2px solid ${UI.c} !important; }
        .g-tl { display: flex; gap: 8px; padding-bottom: 8px; }
        .g-tl button { background: ${UI.c}; color: ${UI.tc}; border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .g-search-group { flex: 1; } #g-src { width: 100%; padding: 7px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; }
        .g-col-num { position: sticky !important; left: 0 !important; z-index: 11 !important; background: ${UI.c} !important; border-right: 1px solid rgba(0,0,0,0.2) !important; }
        tbody .g-col-num { background: rgba(200,200,200,0.4) !important; z-index: 9 !important; }
        .g-n { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
        `;
        $('#gaigai-theme').remove();
        $('<style id="gaigai-theme">').text(style).appendTo('head');
    }

    function pop(ttl, htm, showBack = false) {
        $('#g-pop').remove(); thm();
        const $o = $('<div>', { id: 'g-pop', class: 'g-ov' });
        const $p = $('<div>', { class: 'g-w' });
        const $h = $('<div>', { class: 'g-hd' });
        if (showBack) $h.append($('<button>', { class: 'g-back', html: '<i class="fa-solid fa-chevron-left"></i> 返回', css: { marginRight: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', color: UI.tc, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' } }).on('click', goBack));
        $h.append($('<h3>').text(ttl));
        $h.append($('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: UI.tc, fontSize: '24px', cursor: 'pointer' } }).on('click', () => { $o.remove(); pageStack = []; }));
        $p.append($h, $('<div>', { class: 'g-bd', html: htm }));
        $o.append($p).on('click', e => { if (e.target === $o[0]) { $o.remove(); pageStack = []; } });
        $('body').append($o);
    }
    
    function shw() {
        m.load(); pageStack = [shw];
        const ss = m.all();
        const tbs = ss.map((s, i) => `<button class="g-t${i === 0 ? ' act' : ''}" data-i="${i}">${i === 1 ? '支线剧情' : s.n} (${s.r.length})</button>`).join('');
        const tls = `<div class="g-search-group"><input type="text" id="g-src" placeholder="🔍 搜索内容..."></div><div class="g-btn-group"><button id="g-ad">➕ 新增</button><button id="g-dr">🗑️ 删除</button><button id="g-sm">📝 总结</button><button id="g-ex">📥 导出</button><button id="g-reset-width">📏 重置列</button><button id="g-clear-tables">🧹 清表</button><button id="g-ca">💥 全清</button><button id="g-tm">🎨 主题</button><button id="g-cf">⚙️ 配置</button></div>`;
        const tbls = ss.map((s, i) => gtb(s, i)).join('');
        const cleanVer = V.replace(/^v+/i, ''); 
        pop(`记忆表格 v${cleanVer}`, `<div class="g-vw"><div class="g-ts">${tbs}</div><div class="g-tl">${tls}</div><div class="g-tb">${tbls}</div></div>`);
        setTimeout(bnd, 100);
    }
    
    function gtb(s, ti) {
        const v = ti === 0 ? '' : 'display:none;';
        let h = `<div class="g-tbc" data-i="${ti}" style="${v}"><div class="g-tbl-wrap"><table><thead class="g-sticky"><tr><th class="g-col-num" style="width:50px;"><input type="checkbox" class="g-select-all" data-ti="${ti}"></th>`;
        s.c.forEach((c, ci) => {
            const w = getColWidth(ti, c) || 150;
            h += `<th style="width:${w}px;" data-ti="${ti}" data-col="${ci}" data-col-name="${esc(c)}">${esc(c)}<div class="g-col-resizer" data-ti="${ti}" data-ci="${ci}" data-col-name="${esc(c)}"></div></th>`;
        });
        h += '</tr></thead><tbody>';
        if (s.r.length === 0) h += `<tr class="g-emp"><td colspan="${s.c.length + 1}" style="text-align:center;padding:20px;color:#999;">暂无数据</td></tr>`;
        else {
            s.r.forEach((rw, ri) => {
                const sc = isSummarized(ti, ri) ? ' g-summarized' : '';
                h += `<tr data-r="${ri}" class="g-row${sc}"><td class="g-col-num"><div class="g-n"><input type="checkbox" class="g-row-select" data-r="${ri}"><div>${ri}</div></div></td>`;
                s.c.forEach((c, ci) => {
                    const w = getColWidth(ti, c) || 150;
                    h += `<td style="width:${w}px;"><div class="g-e" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(rw[ci]||'')}</div></td>`;
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
        $('.g-t').off('click').on('click', function() { 
            const i = $(this).data('i'); $('.g-t').removeClass('act'); $(this).addClass('act'); 
            $('.g-tbc').hide(); $(`.g-tbc[data-i="${i}"]`).show(); 
            selectedRow = null; selectedRows = []; selectedTableIndex = i; 
            $('.g-row').removeClass('g-selected'); $('.g-row-select').prop('checked', false); $('.g-select-all').prop('checked', false);
        });
        $('#g-pop').off('change', '.g-select-all').on('change', '.g-select-all', function(e) {
            e.stopPropagation(); const checked = $(this).prop('checked'); const ti = parseInt($(this).data('ti'));
            $(`.g-tbc[data-i="${ti}"] .g-row-select`).prop('checked', checked); updateSelectedRows();
        });
        $('#g-pop').off('change', '.g-row-select').on('change', '.g-row-select', function(e) { e.stopPropagation(); updateSelectedRows(); });
        
        // 拖拽逻辑
        let isResizing=false, startX=0, startWidth=0, tableIndex=0, colIndex=0, colName='', $th=null;
        $('#g-pop').off('mousedown touchstart', '.g-col-resizer').on('mousedown touchstart', '.g-col-resizer', function(e) {
            e.preventDefault(); e.stopPropagation(); isResizing=true;
            tableIndex = parseInt($(this).data('ti')); colIndex = parseInt($(this).data('ci')); colName = $(this).data('col-name');
            $th = $(this).closest('th'); startWidth = $th.outerWidth();
            startX = e.type==='touchstart' ? e.originalEvent.touches[0].pageX : e.pageX;
            $('body').css('cursor', 'col-resize');
        });
        $(document).off('mousemove.resizer touchmove.resizer').on('mousemove.resizer touchmove.resizer', function(e) {
            if(!isResizing) return;
            const cx = e.type==='touchmove' ? e.originalEvent.touches[0].pageX : e.pageX;
            const nw = Math.max(20, startWidth + (cx - startX));
            $th.css('width', nw); $(`.g-tbc[data-i="${tableIndex}"] td[data-col="${colIndex}"]`).parent().css('width', nw);
        });
        $(document).off('mouseup.resizer touchend.resizer').on('mouseup.resizer touchend.resizer', function(e) {
            if(!isResizing) return;
            const cx = e.type==='touchend' ? e.originalEvent.changedTouches[0].pageX : e.pageX;
            const nw = Math.max(20, startWidth + (cx - startX));
            setColWidth(tableIndex, colName, nw);
            isResizing=false; $('body').css('cursor', '');
        });

        // 编辑与选择
        $('#g-pop').off('dblclick', '.g-e').on('dblclick', '.g-e', function(e) {
            e.stopPropagation(); const ti=$('.g-t.act').data('i'); showBigEditor(ti, $(this).data('r'), $(this).data('c'), $(this).text());
        });
        $('#g-pop').off('blur', '.g-e').on('blur', '.g-e', function() {
            const ti=$('.g-t.act').data('i'), ri=$(this).data('r'), ci=$(this).data('c');
            m.get(ti).upd(ri, { [ci]: $(this).text() }); m.save(); updateTabCount(ti);
        });
        $('#g-pop').off('click', '.g-row').on('click', '.g-row', function(e) {
            if($(e.target).is('.g-e') || $(e.target).is('input')) return;
            $('.g-row').removeClass('g-selected'); $(this).addClass('g-selected');
            selectedRow = $(this).data('r'); selectedTableIndex = $('.g-t.act').data('i');
        });

        // 按钮绑定
        $('#g-ad').off('click').on('click', () => { const ti=$('.g-t.act').data('i'); const sh=m.get(ti); const nr={}; sh.c.forEach((_,i)=>nr[i]=''); sh.ins(nr); m.save(); refreshTable(ti); updateTabCount(ti); });
        $('#g-dr').off('click').on('click', async () => {
            const ti=$('.g-t.act').data('i'); const sh=m.get(ti);
            if(selectedRows.length>0) {
                if(await customConfirm(`确定删除 ${selectedRows.length} 行？`)) { sh.delMultiple(selectedRows); selectedRows=[]; refreshTable(ti); updateTabCount(ti); }
            } else if(selectedRow!==null) {
                if(await customConfirm(`确定删除第 ${selectedRow} 行？`)) { sh.del(selectedRow); selectedRow=null; refreshTable(ti); updateTabCount(ti); }
            } else customAlert('请先选择行');
        });
        $('#g-src').off('input').on('input', function() { const k=$(this).val().toLowerCase(); $('.g-tbc:visible tbody tr:not(.g-emp)').each(function(){ $(this).toggle($(this).text().toLowerCase().includes(k)); }); });
        $('#g-tm').click(shtm); $('#g-cf').click(shcf); $('#g-sm').click(callAIForSummary);
        $('#g-ex').click(() => {
            const b = new Blob([JSON.stringify({v:V, t:new Date().toISOString(), s:m.all().map(s=>s.json())},null,2)], {type:'application/json'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `memory_${Date.now()}.json`; a.click();
        });
        $('#g-reset-width').click(resetColWidths);
        $('#g-clear-tables').click(async () => { if(await customConfirm('清空所有表格（保留总结）？')) { m.all().slice(0,8).forEach(s=>s.clear()); clearSummarizedMarks(); m.save(); shw(); } });
        $('#g-ca').click(async () => { if(await customConfirm('⚠️ 危险：清空所有数据（包括总结）？')) { m.all().forEach(s=>s.clear()); clearSummarizedMarks(); m.save(); shw(); } });
    }

    function updateSelectedRows() {
        selectedRows = [];
        $('#g-pop .g-tbc:visible .g-row').removeClass('g-selected');
        $('#g-pop .g-tbc:visible .g-row-select:checked').each(function() {
            selectedRows.push($(this).data('r'));
            $(this).closest('.g-row').addClass('g-selected');
        });
    }

    function showBigEditor(ti, ri, ci, val) {
        const h = `<textarea id="big-editor" style="width:100%;height:300px;padding:10px;border:1px solid #ddd;">${esc(val)}</textarea><div style="margin-top:10px"><button id="save-edit">保存</button></div>`;
        $('#g-edit-pop').remove();
        const $o = $('<div>', {id:'g-edit-pop', class:'g-ov', css:{zIndex:10000000}}).append($('<div>', {class:'g-w', css:{width:'600px',height:'auto'}}).append($('<div>', {class:'g-hd'}).append($('<h3>').text('编辑'), $('<button>', {text:'×',class:'g-x'}).click(()=>$o.remove())), $('<div>', {class:'g-bd', html:h})));
        $('body').append($o);
        $('#save-edit').click(() => { m.get(ti).upd(ri, {[ci]: $('#big-editor').val()}); m.save(); refreshTable(ti); $o.remove(); });
    }

    function shtm() {
        const h = `<div class="g-p"><h4>🎨 主题</h4><label>主题色</label><input type="color" id="tc" value="${UI.c}" style="width:100%"><br><br><label>字体色</label><input type="color" id="ttc" value="${UI.tc}" style="width:100%"><br><br><button id="ts">保存</button></div>`;
        pop('主题设置', h, true);
        $('#ts').click(() => { UI.c=$('#tc').val(); UI.tc=$('#ttc').val(); localStorage.setItem(UK, JSON.stringify(UI)); m.save(); thm(); customAlert('已保存'); });
    }

    function shcf() {
        const h = `<div class="g-p"><h4>⚙️ 配置</h4><label><input type="checkbox" id="c-enabled" ${C.enabled?'checked':''}> 启用插件</label><br><label><input type="checkbox" id="c-limit-on" ${C.contextLimit?'checked':''}> 隐藏楼层 (保留最近 ${C.contextLimitCount} 层)</label><br><button id="save-cfg">保存</button><button id="open-pmt">提示词</button><button id="open-api">API</button></div>`;
        pop('配置', h, true);
        $('#save-cfg').click(() => { C.enabled=$('#c-enabled').is(':checked'); C.contextLimit=$('#c-limit-on').is(':checked'); customAlert('已保存'); });
        $('#open-pmt').click(shpmt); $('#open-api').click(shapi);
    }

    function shpmt() {
        const h = `<div class="g-p"><textarea id="pmt-table" style="width:100%;height:200px">${esc(PROMPTS.tablePrompt)}</textarea><button id="save-pmt">保存</button></div>`;
        pop('提示词', h, true);
        $('#save-pmt').click(() => { PROMPTS.tablePrompt=$('#pmt-table').val(); localStorage.setItem(PK, JSON.stringify(PROMPTS)); customAlert('已保存'); });
    }

    function shapi() {
        const h = `<div class="g-p"><label>API Key</label><input type="password" id="api-key" value="${API_CONFIG.apiKey}" style="width:100%"><button id="save-api">保存</button></div>`;
        pop('API配置', h, true);
        $('#save-api').click(() => { API_CONFIG.apiKey=$('#api-key').val(); localStorage.setItem(AK, JSON.stringify(API_CONFIG)); customAlert('已保存'); });
    }

    function omsg(id) {
        if (!C.enabled) return;
        try {
            const x = m.ctx();
            if (!x || !x.chat) return;
            const i = typeof id === 'number' ? id : x.chat.length - 1;
            const mg = x.chat[i];
            if (!mg || mg.is_user) return;
            
            const msgKey = i.toString();
            if (processedMessages.has(msgKey)) return;

            const swipeId = mg.swipe_id ?? 0;
            const tx = mg.mes || mg.swipes?.[swipeId] || '';
            const cs = prs(tx);
            
            if (cs.length > 0) { exe(cs); m.save(); }
            
            const snapshot = {
                data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))),
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            snapshotHistory[msgKey] = snapshot;
            lastProcessedMsgIndex = i; 
            
            processedMessages.add(msgKey);
            cleanOldSnapshots();
            
            if (C.autoSummary && x.chat.length >= C.autoSummaryFloor && !m.sm.has()) callAIForSummary();
            setTimeout(hideMemoryTags, 100);
        } catch (e) {}
    }
    
    function ochat() { 
        lastInternalSaveTime = 0; 
        m.load(); 
        thm(); 
        snapshotHistory = {};
        lastProcessedMsgIndex = -1;
        isRegenerating = false;
        deletedMsgIndex = -1;
        processedMessages.clear(); 
        
        const ctx = m.ctx();
        const currentLen = ctx && ctx.chat ? ctx.chat.length : 0;

        if (currentLen > 0) {
            const lastIdx = currentLen - 1;
            snapshotHistory[lastIdx.toString()] = {
                data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))), 
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            console.log(`📂 [初始化] 已有对话，归档快照: ${lastIdx}`);
        }

        const emptyData = m.all().slice(0, 8).map(sh => {
            let copy = JSON.parse(JSON.stringify(sh.json()));
            copy.r = []; 
            return copy;
        });
        snapshotHistory['-1'] = { data: emptyData, summarized: {}, timestamp: 0 };
        console.log('✨ [修复] 已建立绝对空白的创世快照 (-1)');
    }

    function opmt(ev) { 
        try { 
            if (ev.detail?.isDryRun) return; 
            if (!C.enabled) return;
            if (C.contextLimit) ev.chat = applyContextLimit(ev.chat);
            isRegenerating = false; 

            const ctx = m.ctx();
            if (ctx && ctx.chat) {
                let nextMsgIndex = ctx.chat.length;
                if (lastProcessedMsgIndex >= nextMsgIndex) {
                    console.log(`🚨 [检测到冲突] 内存进度(${lastProcessedMsgIndex}) >= 目标(${nextMsgIndex})`);
                    let targetKey = -999;
                    let found = false;
                    Object.keys(snapshotHistory).forEach(k => {
                        const kn = parseInt(k);
                        if (kn < nextMsgIndex && kn > targetKey) { targetKey = kn; found = true; }
                    });
                    
                    if (found) {
                        console.log(`🔄 回滚到: ${targetKey}`);
                        restoreSnapshot(targetKey.toString());
                        lastProcessedMsgIndex = targetKey;
                        Object.keys(snapshotHistory).forEach(k => {
                            if (parseInt(k) >= nextMsgIndex) delete snapshotHistory[k];
                        });
                    }
                }
            }
            inj(ev); 
        } catch (e) {} 
    }

    function applyContextLimit(chat) {
        if (!C.contextLimit || !chat || chat.length <= C.contextLimitCount) return chat;
        const systemAnchor = chat[0];
        const recentChat = chat.slice(-C.contextLimitCount);
        if (recentChat.includes(systemAnchor)) return chat;
        console.log(`✂️ [隐藏楼层] 保留#0 + 最近${C.contextLimitCount}条`);
        return [systemAnchor, ...recentChat];
    }

    function ini() {
        if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') { 
            setTimeout(ini, 500); return; 
        }
        
        let $anchor = $('#advanced-formatting-button'); 
        if ($anchor.length === 0) $anchor = $('#ai-config-button');
        if ($anchor.length === 0) $anchor = $('#extensionsMenu');

        try { const sv = localStorage.getItem(UK); if (sv) UI = { ...UI, ...JSON.parse(sv) }; } catch (e) {}
        try { const pv = localStorage.getItem(PK); if (pv) PROMPTS = { ...PROMPTS, ...JSON.parse(pv) }; } catch (e) {}
        try { const av = localStorage.getItem(AK); if (av) API_CONFIG = { ...API_CONFIG, ...JSON.parse(av) }; } catch (e) {}
        
        loadColWidths();
        loadSummarizedRows();
        m.load();
        thm();
        ochat();

        $('#gaigai-wrapper').remove();
        const $wrapper = $('<div>', { id: 'gaigai-wrapper', class: 'drawer' });
        const $toggle = $('<div>', { class: 'drawer-toggle' });
        const $icon = $('<div>', {
            id: 'gaigai-top-btn',
            class: 'drawer-icon fa-solid fa-table fa-fw interactable', 
            title: '记忆表格',
            tabindex: '0'
        }).on('click', (e) => { e.preventDefault(); e.stopPropagation(); shw(); });

        $toggle.append($icon);
        $wrapper.append($toggle);
        if ($anchor.length > 0) $anchor.after($wrapper);
        else $('body').append($wrapper);
                
        const x = m.ctx();
        if (x && x.eventSource) {
            x.eventSource.on(x.event_types.CHARACTER_MESSAGE_RENDERED, omsg);
            x.eventSource.on(x.event_types.CHAT_CHANGED, ochat);
            x.eventSource.on(x.event_types.CHAT_COMPLETION_PROMPT_READY, opmt);
            x.eventSource.on(x.event_types.MESSAGE_DELETED, (d) => {
                let idx = typeof d === 'number' ? d : d?.index;
                if (idx !== undefined) processedMessages.delete(idx.toString());
            });
        }
    }

    let initRetryCount = 0;
    function tryInit() {
        initRetryCount++;
        if (initRetryCount > 20) return;
        ini();
    }
    setTimeout(tryInit, 1000);

    window.Gaigai = { v: V, m: m, shw: shw, restoreSnapshot, saveSnapshot, config: API_CONFIG, prompts: PROMPTS };
    Object.defineProperty(window.Gaigai, 'snapshotHistory', { get: () => snapshotHistory, set: (v) => snapshotHistory = v });
    Object.defineProperty(window.Gaigai, 'lastProcessedMsgIndex', { get: () => lastProcessedMsgIndex, set: (v) => lastProcessedMsgIndex = v });

    console.log('✅ window.Gaigai 已挂载');
})();
