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
        // ✨✨✨ 新增：隐藏楼层配置 ✨✨✨
        contextLimit: false,       // 开关：默认关闭
        contextLimitCount: 30,     // 数量：默认保留最近30层
        // ✨✨✨ 结束 ✨✨✨
        
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
    let lastManualEditTime = 0; // ✨ 新增：记录用户最后一次手动编辑的时间
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
    }

    class M {
        constructor() { this.s = []; this.id = null; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        save() {
            const id = this.gid();
            if (!id) return;
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
            
            console.log(`✅ [完美回档] 快照${key}已恢复 (深拷贝模式)`);
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
        
        // 保存到本地
        saveColWidths();
        
        // ✨✨✨ 关键修复：强制保存到聊天记录，这样平板才能同步 ✨✨✨
        m.save(); 
    }
    
async function resetColWidths() {
        if (await customConfirm('确定重置所有列宽为默认值？', '重置列宽')) {
            userColWidths = {};
            saveColWidths();
            m.save(); // ✨✨✨ 这里也要加，确保重置操作同步到平板
            await customAlert('列宽已重置，请重新打开表格', '成功');
            
            // 1. 清除本地
            saveColWidths();
            
            // ✨✨✨ 核心修复：同步清除聊天记录里的宽度 ✨✨✨
            m.save();
            
            await customAlert('列宽已重置，请重新打开表格', '成功');
            
            // 自动刷新一下当前视图，不用手动重开
            if ($('#g-pop').length > 0) {
                shw();
            }
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
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    
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
                sh.upd(ri, d); 
                lastManualEditTime = Date.now(); // ✨ 新增
                m.save();

                $(`.g-e[data-r="${ri}"][data-c="${ci}"]`).text(newValue);
                $o.remove();
            });
            $('#cancel-edit').on('click', () => $o.remove());
            $o.on('keydown', e => { if (e.key === 'Escape') $o.remove(); });
        }, 100);
    }
    
function shw() {
    m.load();
    pageStack = [shw];
    
    const ss = m.all();
    const tbs = ss.map((s, i) => { 
        const count = s.r.length;
        const displayName = i === 1 ? '支线剧情' : s.n;
        return `<button class="g-t${i === 0 ? ' act' : ''}" data-i="${i}">${displayName} (${count})</button>`; 
    }).join('');

    const tls = `
        <div class="g-search-group">
            <input type="text" id="g-src" placeholder="🔍 搜索内容...">
        </div>
        <div class="g-btn-group">
            <button id="g-ad" title="新增一行">➕ 新增</button>
            <button id="g-dr" title="删除选中行">🗑️ 删除</button>
            <button id="g-sm" title="AI智能总结">📝 总结</button>
            <button id="g-ex" title="导出JSON备份">📥 导出</button>
            <button id="g-reset-width" title="重置列宽">📏 重置列</button>
            <button id="g-clear-tables" title="保留总结，清空详情">🧹 清表</button>
            <button id="g-ca" title="清空所有数据">💥 全清</button>
            <button id="g-tm" title="设置外观">🎨 主题</button>
            <button id="g-cf" title="插件设置">⚙️ 配置</button>
        </div>
    `;

    const tbls = ss.map((s, i) => gtb(s, i)).join('');
    
    // ✨✨✨ 核心修改：美化标题 & 修复 "vv" 问题 ✨✨✨
    // 1. 确保 V 里面没有 v (使用正则去掉开头所有的 v)
    const cleanVer = V.replace(/^v+/i, ''); 
    
    // 2. 构建新的胶囊标题结构 (去掉书本图标)
    const titleHtml = `
        <div class="g-title-box">
            <span>记忆表格</span>
            <span class="g-ver-tag">v${cleanVer}</span>
        </div>
    `;
    // ✨✨✨ 结束 ✨✨✨

    const h = `<div class="g-vw">
        <div class="g-ts">${tbs}</div>
        <div class="g-tl">${tls}</div>
        <div class="g-tb">${tbls}</div>
    </div>`;
    
    // 传入 titleHtml 而不是之前的字符串
    pop(titleHtml, h);
    
    setTimeout(bnd, 100);
    setTimeout(() => {
        $('#g-pop .g-row-select, #g-pop .g-select-all').css({
            'display': 'block', 'visibility': 'visible', 'opacity': '1',
            'position': 'relative', 'z-index': '99999', 'pointer-events': 'auto',
            '-webkit-appearance': 'checkbox', 'appearance': 'checkbox'
        });
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
    
// ✨✨✨ 编辑单元格：PC端双击 + 移动端长按 ✨✨✨
let longPressTimer = null;
let touchStartTime = 0;

// PC端：保留双击
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

// 移动端：长按触发（500ms）
$('#g-pop').off('touchstart', '.g-e').on('touchstart', '.g-e', function(e) {
    const $this = $(this);
    touchStartTime = Date.now();
    
    // 清除之前的计时器
    if (longPressTimer) clearTimeout(longPressTimer);
    
    // 500ms后触发大框编辑
    longPressTimer = setTimeout(function() {
        // 震动反馈（如果设备支持）
        if (navigator.vibrate) navigator.vibrate(50);
        
        const ti = parseInt($('.g-t.act').data('i')); 
        const ri = parseInt($this.data('r')); 
        const ci = parseInt($this.data('c')); 
        const val = $this.text(); 
        
        // 取消默认编辑行为
        $this.blur();
        $this.attr('contenteditable', 'false');
        
        showBigEditor(ti, ri, ci, val);
        
        // 恢复可编辑
        setTimeout(() => $this.attr('contenteditable', 'true'), 100);
    }, 500);
});

// 移动端：取消长按（手指移动或抬起时）
$('#g-pop').off('touchmove touchend touchcancel', '.g-e').on('touchmove touchend touchcancel', '.g-e', function(e) {
    // 如果手指移动了，取消长按
    if (e.type === 'touchmove') {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
    
    // 如果手指抬起，检查是否是短按（用于正常编辑）
    if (e.type === 'touchend') {
        const touchDuration = Date.now() - touchStartTime;
        
        // 如果按下时间小于500ms，取消长按
        if (touchDuration < 500) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }
    
    // touchcancel 时也清除
    if (e.type === 'touchcancel') {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
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
        lastManualEditTime = Date.now(); // ✨ 新增
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

        lastManualEditTime = Date.now();
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
        lastManualEditTime = Date.now(); // ✨ 新增
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
    lastManualEditTime = Date.now(); // ✨ 新增
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
    lastManualEditTime = Date.now();
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

    function omsg(id) {
        if (!C.enabled) return;
        try {
            const x = m.ctx();
            if (!x || !x.chat) return;
            
            const i = typeof id === 'number' ? id : x.chat.length - 1;
            const mg = x.chat[i];
            
            // 只处理 AI 消息
            if (!mg || mg.is_user) return;
            
            const msgKey = i.toString();
            if (processedMessages.has(msgKey)) return;

            const swipeId = mg.swipe_id ?? 0;
            const tx = mg.mes || mg.swipes?.[swipeId] || '';
            const cs = prs(tx);
            
            if (cs.length > 0) {
                exe(cs); 
                m.save(); 
            }
            
            const snapshot = {
                data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))),
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            
            snapshotHistory[msgKey] = snapshot;
            lastProcessedMsgIndex = i; // ✅ 更新当前处理的进度
            console.log(`📸 [存档] 消息 ${i} 处理完毕，快照已保存。`);
            
            processedMessages.add(msgKey);
            cleanOldSnapshots();
            
            if (C.autoSummary && x.chat.length >= C.autoSummaryFloor && !m.sm.has()) {
                callAIForSummary();
            }
            setTimeout(hideMemoryTags, 100);
        } catch (e) { console.error('❌ omsg 错误:', e); }
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
        
        // 创世快照：强制创建一个“绝对干净”的 -1 号快照
        const emptyData = m.all().slice(0, 8).map(sh => {
            let copy = JSON.parse(JSON.stringify(sh.json()));
            copy.r = []; 
            return copy;
        });

        snapshotHistory['-1'] = {
            data: emptyData, 
            summarized: {},
            timestamp: 0 
        };
        console.log('🔄 聊天已切换，初始快照(-1)已创建');
    }

    // ✅✅✅ 核心修复：opmt (生成前钩子)
    function opmt(ev) { 
        try { 
            if (ev.detail?.isDryRun) return; 
            if (!C.enabled) return;

            if (C.contextLimit) {
                ev.chat = applyContextLimit(ev.chat);
            }
            
            isRegenerating = false; 

            // ✅✅✅ 自动回滚逻辑
            const ctx = m.ctx();
            if (ctx && ctx.chat) {
                // 获取当前“真实”的聊天进度
                const currentFlowIndex = ctx.chat.length;
                
                // 检查内存里有没有“未来”的脏数据
                // 比如内存里已经有 Index 1 的快照（上次生成的），现在又要生成 Index 1
                if (snapshotHistory[currentFlowIndex.toString()] || lastProcessedMsgIndex >= currentFlowIndex) {
                    console.log(`🚨 [自动修复] 检测到重Roll/分支切换！(当前进度 ${currentFlowIndex})`);
                    
                    // 寻找最近的“过去”快照 (比如 -1)
                    let bestSnapshot = -999;
                    let found = false;
                    
                    Object.keys(snapshotHistory).forEach(k => {
                        const kn = parseInt(k);
                        // 找一个比当前进度小的快照
                        if (kn < currentFlowIndex && kn > bestSnapshot) {
                            bestSnapshot = kn;
                            found = true;
                        }
                    });
                    
                    if (found) {
                        console.log(`🔄 正在回滚到快照: ${bestSnapshot}`);
                        restoreSnapshot(bestSnapshot.toString());
                        
                        // 清理掉脏数据 (删除所有 >= 当前进度的快照)
                        Object.keys(snapshotHistory).forEach(k => {
                            if (parseInt(k) >= currentFlowIndex) {
                                delete snapshotHistory[k];
                            }
                        });
                        
                        // 重置内部指针
                        lastProcessedMsgIndex = bestSnapshot;
                    }
                }
            }

            console.log(`📤 [发送] 发送给AI的表格状态:`, m.s.slice(0, 8).map(s => `${s.n}:${s.r.length}行`).join(', '));
            inj(ev); 
            
        } catch (e) { 
            console.error('❌ opmt 失败:', e); 
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
    
        // ✨✨✨ 核心修复：创建“创世快照”(-1号)，代表对话开始前的空状态 ✨✨✨
        snapshotHistory['-1'] = {
            data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))), 
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: 0 // 时间戳设为0，确保它比任何手动编辑都早
        };
        console.log("📸 [创世快照] 已创建初始空状态快照 '-1'。");
    
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
    
        // 5. 插入到定位点后面 (即"A"图标或者"AI配置"图标的右边)
        if ($anchor.length > 0) {
            $anchor.after($wrapper);
            console.log('✅ 按钮已成功插入到顶部工具栏');
        } else {
            console.warn('⚠️ 未找到工具栏定位点，尝试追加到 body');
            $('body').append($wrapper);
        }
        // ✨✨✨ 修改结束 ✨✨✨
                
    // --- 事件监听 ---
    const x = m.ctx();
    if (x && x.eventSource) {
        try {
            x.eventSource.on(x.event_types.CHARACTER_MESSAGE_RENDERED, function(id) { omsg(id); });
            x.eventSource.on(x.event_types.CHAT_CHANGED, function() { ochat(); });
            x.eventSource.on(x.event_types.CHAT_COMPLETION_PROMPT_READY, function(ev) { opmt(ev); });
            
    // 监听消息删除（重roll或手动删除）
            x.eventSource.on(x.event_types.MESSAGE_DELETED, function(eventData) {
                // 获取被删除的消息ID
                let msgIndex;
                if (typeof eventData === 'number') msgIndex = eventData;
                else if (eventData && typeof eventData === 'object') msgIndex = eventData.index ?? eventData.messageIndex ?? eventData.mesId;
                else if (arguments.length > 1) msgIndex = arguments[1];
                
                if (msgIndex === undefined || msgIndex === null) return;
    
                isRegenerating = true; 
                console.log(`🗑️ [删除事件] 第 ${msgIndex} 层被删除，准备回档。`);
    
                // 【核心逻辑】
                // 1. 我们要找一个“过去”的快照，它的 ID 必须严格小于当前被删的 ID
                // 2. 比如删了第 3 层，我们要找 2, 1, 0, -1 中最大的那个
                // 3. 比如删了第 1 层（第一条回复），我们要找 -1 (初始快照)
                
                let keyToRestore = -999; 
                let found = false;
    
                // 遍历所有快照，找出符合条件的目标
                Object.keys(snapshotHistory).forEach(k => {
                    const keyNum = parseInt(k); // 必须转数字比较
                    if (keyNum < msgIndex && keyNum > keyToRestore) {
                        keyToRestore = keyNum;
                        found = true;
                    }
                });
    
                if (found) {
                    const targetKey = keyToRestore.toString();
                    const snapshot = snapshotHistory[targetKey];
                    
                    // 检查是否用户在最后一次快照后手动修改过表格
                    // 如果手动修改时间 > 快照时间，说明用户不想回滚，想保留手动改的
                    if (lastManualEditTime > snapshot.timestamp && snapshot.timestamp !== 0) {
                        console.log(`🚫 [跳过回档] 用户在 ${new Date(lastManualEditTime).toLocaleTimeString()} 手动修改过表格，保留当前状态。`);
                    } else {
                        console.log(`🔄 [执行回档] 回滚到状态: ${targetKey} (对应消息 ${msgIndex} 之前)`);
                        
                        // 1. 清空当前表格
                        m.s.slice(0, 8).forEach(sheet => sheet.r = []);
                        // 2. 填入快照数据
                        snapshot.data.forEach((sd, i) => { if (i < 8 && m.s[i]) m.s[i].from(sd); });
                        // 3. 恢复总结状态
                        summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
                        
                        m.save();
                        console.log(`✅ [回档完成] 表格已恢复。`);
                    }
    
                    // 【清理未来】删除了第 N 层，那么 N 及之后的所有快照都作废
                    Object.keys(snapshotHistory).forEach(k => {
                        if (parseInt(k) >= msgIndex) {
                            delete snapshotHistory[k];
                        }
                    });
                    
                } else {
                    console.warn(`⚠️ [回档警告] 未找到 ID < ${msgIndex} 的快照，可能刚加载插件未建立历史。`);
                }
                
                processedMessages.delete(msgIndex.toString());
            });
            // ✨✨✨ 结束 ✨✨✨
            
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
