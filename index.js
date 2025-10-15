// 记忆表格 v0.8.4
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v0.8.3 启动');
    
    const V = '0.8.3';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 2;
    const AK = 'gg_api';
    const CWK = 'gg_col_widths';
    const SMK = 'gg_summarized';
    
    let UI = { c: '#9c4c4c', bc: '#ffffff' };
    
    const C = { 
        tableInj: true,
        tablePos: 'system',
        tablePosType: 'absolute',
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
        tablePrompt: `Gaigai必须在每次回复的所有剧情和标签或状态栏的最底端，输出以下记忆标签，严格遵守格式。

【唯一正确格式】
<GaigaiMemory><!-- insertRow(表格索引, {0: "内容1", 1: "内容2", ...})
updateRow(表格索引, 行索引, {列号: "新内容"})--></GaigaiMemory>

【表格索引】
0: 主线剧情 (日期, 开始时间, 完结时间, 事件概要, 状态)
1: 支线追踪 (状态, 支线名, 开始时间, 完结时间, 事件追踪, 关键NPC)
2: 角色状态 (角色名, 状态变化, 时间, 原因, 当前位置)
3: 人物档案 (姓名, 年龄, 身份, 地点, 性格, 备注)
4: 人物关系 (角色A, 角色B, 关系描述, 情感态度)
5: 世界设定 (设定名, 类型, 详细说明, 影响范围)
6: 物品追踪 (物品名称, 物品描述, 当前位置, 持有者, 状态, 重要程度, 备注)
7: 约定 (约定时间, 约定内容, 核心角色)

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
   - 列3【事件概要】：同一天多个事件用分号连接；跨天则写新事件
   - 列4【状态】：进行中/已完成/暂停

3. 时间推进逻辑：
   - 从早上到中午（同一天）→ updateRow 更新事件概要，开始时间保持不变
   - 从晚上到第二天凌晨（跨天）→ 先 updateRow 完结前一天（填写列2完结时间），再 insertRow 新增第二天
   - 同一天结束 → updateRow 填写列2【完结时间】和列4【状态:已完成】

【使用示例】

✅ 第一天开始（新增）:
<GaigaiMemory><!-- insertRow(0, {0: "2024年3月15日", 1: "上午(08:30)", 2: "", 3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石", 4: "进行中"})--></GaigaiMemory>

✅ 同一天推进（更新事件，时间不变）:
<GaigaiMemory><!-- updateRow(0, 0, {3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石；在迷雾森林遭遇神秘商人艾莉娅，获得线索：宝石在古神殿深处"})--></GaigaiMemory>

✅ 同一天完结:
<GaigaiMemory><!-- updateRow(0, 0, {2: "晚上(22:00)", 3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石；在迷雾森林遭遇神秘商人艾莉娅，获得线索：宝石在古神殿深处；在森林露营休息", 4: "暂停"})--></GaigaiMemory>

✅ 跨天处理（完结前一天 + 新增第二天）:
<GaigaiMemory><!-- updateRow(0, 0, {2: "深夜(23:50)", 4: "已完成"})
insertRow(0, {0: "2024年3月16日", 1: "凌晨(00:10)", 2: "", 3: "在古神殿继续探索，寻找宝石线索", 4: "进行中"})--></GaigaiMemory>

✅ 新增支线:
<GaigaiMemory><!-- insertRow(1, {0: "进行中", 1: "艾莉娅的委托", 2: "2024年3月15日·下午(14:00)", 3: "", 4: "艾莉娅请求帮忙寻找失散的妹妹", 5: "艾莉娅"})--></GaigaiMemory>

✅ 新增人物档案:
<GaigaiMemory><!-- insertRow(3, {0: "艾莉娅", 1: "23", 2: "神秘商人", 3: "迷雾森林", 4: "神秘冷静，知识渊博", 5: "有一个失散的妹妹，擅长占卜"})--></GaigaiMemory>

✅ 新增人物关系:
<GaigaiMemory><!-- insertRow(4, {0: "{{user}}", 1: "艾莉娅", 2: "委托人与受托者", 3: "中立友好，略带神秘感"})--></GaigaiMemory>

✅ 新增约定:
<GaigaiMemory><!-- insertRow(7, {0: "2024年3月18日前", 1: "找到失落宝石交给长老", 2: "长老"})--></GaigaiMemory>

【各表格记录规则】
- 主线剧情: 按日期记录，事件概要必须含地点，同一天多事件用分号连接
- 支线追踪: 仅记录NPC相关情节，状态必须明确（进行中/已完成/已失败）
- 角色状态: 仅记录死亡/囚禁/残废等重大变化
- 人物档案: 仅记录世界书中不存在的新角色
- 人物关系: 仅记录关键转变
- 世界设定: 仅记录世界书中不存在的新设定
- 物品追踪: 仅记录剧情关键物品
- 约定: 记录重要约定，注明时限和相关角色

【强制要求】⭐必须遵守⭐
1. 必须使用 <GaigaiMemory> 标签
2. 指令必须用 <!-- --> 包裹
3. 列索引从0开始: {0: "值", 1: "值"}
4. 跨天必须新增行，同时填写新日期
5. 同日事件用分号连接
6. 全部使用过去式，客观描述
7. 主线事件概要必须包含地点信息

【常见错误❌】
❌ 跨天了但只更新时间不更新日期
❌ 同一天重复新增多行
❌ 忘记填写列0的日期
❌ 事件概要中没有写地点

禁止使用表格格式、禁止使用JSON格式、禁止使用<memory>标签。`,
        tablePromptPos: 'system',
        tablePromptPosType: 'absolute',
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
    
    const MEMORY_TAG_REGEX = /<(GaigaiMemory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
    
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
        upd(i, d) { while (this.r.length <= i) this.r.push({}); Object.entries(d).forEach(([k, v]) => this.r[i][k] = v); }
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
            if (this.sm.has()) {
                result += '=== 📚 记忆总结 ===\n\n';
                result += this.sm.load();
                result += '\n\n=== 总结结束 ===\n\n';
            }
            const sh = this.s.slice(0, 8).filter(s => s.r.length > 0);
            if (sh.length > 0) {
                result += '=== 📊 详细表格 ===\n\n';
                sh.forEach(s => result += s.txt() + '\n');
                result += '=== 表格结束 ===\n';
            }
            return result || '';
        }
    }

    // ✅✅ 快照管理系统
function saveSnapshot(msgIndex) {
    try {
        const snapshot = {
            data: m.all().map(sh => JSON.parse(JSON.stringify(sh.json()))),
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: Date.now()
        };
        snapshotHistory[msgIndex] = snapshot;
        console.log(`📸 快照已保存 [消息${msgIndex}] 时间: ${new Date().toLocaleTimeString()}`);
    } catch (e) {
        console.error('❌ 快照保存失败:', e);
    }
}

function restoreSnapshot(msgIndex) {
    try {
        const snapshot = snapshotHistory[msgIndex];
        if (!snapshot) {
            console.warn(`⚠️ 未找到消息${msgIndex}的快照`);
            return false;
        }
        
        // 恢复表格数据
        snapshot.data.forEach((sd, i) => {
            if (m.s[i]) {
                m.s[i].from(sd);
            }
        });
        
        // 恢复总结标记
        summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
        
        // 保存到存储
        m.save();
        
        console.log(`🔄 快照已恢复 [消息${msgIndex}] (保存于: ${new Date(snapshot.timestamp).toLocaleTimeString()})`);
        return true;
    } catch (e) {
        console.error('❌ 快照恢复失败:', e);
        return false;
    }
}

function cleanOldSnapshots() {
    const keys = Object.keys(snapshotHistory).map(Number).sort((a, b) => b - a);
    if (keys.length > 30) {
        const toDelete = keys.slice(30);
        toDelete.forEach(key => delete snapshotHistory[key]);
        console.log(`🧹 已清理 ${toDelete.length} 个旧快照，保留最近30条`);
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
        if (C.filterHistory) {
            let cleanedCount = 0;
            ev.chat.forEach(msg => {
                if (msg.role === 'assistant' && msg.content && MEMORY_TAG_REGEX.test(msg.content)) {
                    const original = msg.content;
                    msg.content = cleanMemoryTags(msg.content);
                    if (original !== msg.content) cleanedCount++;
                }
            });
            if (cleanedCount > 0) console.log(`🧹 已清理 ${cleanedCount} 条历史标签`);
        }
        
        if (PROMPTS.tablePrompt) {
            const pmtPos = getInjectionPosition(PROMPTS.tablePromptPos, PROMPTS.tablePromptPosType, PROMPTS.tablePromptDepth, ev.chat.length);
            const role = getRoleByPosition(PROMPTS.tablePromptPos);
            ev.chat.splice(pmtPos, 0, { role, content: PROMPTS.tablePrompt });
            console.log(`📝 填表提示词已注入`);
        }
        
        const tableData = m.pmt();
        if (!tableData) { console.log('ℹ️ 无表格数据'); return; }
        if (C.tableInj) {
            const dataPos = getInjectionPosition(C.tablePos, C.tablePosType, C.tableDepth, ev.chat.length);
            const role = getRoleByPosition(C.tablePos);
            ev.chat.splice(dataPos, 0, { role, content: tableData });
            console.log(`📊 表格数据已注入`);
        }
        
        console.log('%c✅ 注入成功', 'color: green; font-weight: bold;');
        if (C.log) { console.log('注入内容:', tableData); }
    }
    
    function getRoleByPosition(pos) { 
        if (pos === 'system') return 'system'; 
        return 'user'; 
    }
    
    function getInjectionPosition(pos, posType, depth, chatLength) {
        if (posType === 'absolute') {
            switch(pos) {
                case 'system': return 0;
                case 'user': return chatLength;
                case 'assistant': return chatLength;
                default: return 0;
            }
        } else {
            switch(pos) {
                case 'system': return depth;
                case 'user': return Math.max(0, chatLength - depth);
                case 'assistant': return Math.max(0, chatLength - depth);
                default: return Math.max(0, chatLength - depth);
            }
        }
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
    const style = `
        .g-ov { background: rgba(0, 0, 0, 0.5) !important; }
        .g-w { background: ${UI.bc} !important; border: 2px solid ${UI.c} !important; }
        .g-hd { background: ${UI.c} !important; }
        .g-hd h3 { color: #fff !important; }
        .g-t.act { background: ${UI.c} !important; }
        .g-tbl-wrap thead.g-sticky { background: ${UI.c} !important; }
        .g-tbl-wrap th { background: ${UI.c} !important; }
        .g-tl button { background: ${UI.c} !important; }
        #g-sm { background: #28a745 !important; }
        #g-ca, #g-dr { background: #dc3545 !important; }
        #g-tm, #g-cf { background: #6c757d !important; }
        .g-p button { background: ${UI.c} !important; }
        .g-row.g-selected { outline: 2px solid ${UI.c} !important; }
        #g-btn { color: inherit !important; }
        #g-btn i { color: inherit !important; }
        #g-btn span { vertical-align: middle !important; }
        #g-btn:hover { background-color: rgba(156, 76, 76, 0.1) !important; }
        .g-resizer { background: ${UI.c} !important; }
        .g-row.g-summarized { background-color: rgba(40, 167, 69, 0.08) !important; }
        .g-row.g-summarized td { background-color: rgba(40, 167, 69, 0.05) !important; }
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
            const $back = $('<button>', { class: 'g-back', html: '← 返回', css: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', marginRight: '10px', padding: '5px 10px' } }).on('click', goBack);
            $h.append($back);
        }
        $h.append(`<h3 style="flex:1;">${ttl}</h3>`);
        const $x = $('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '22px', padding: '0', width: '24px', height: '24px' } }).on('click', () => { $o.remove(); pageStack = []; });
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
    const tls = `<input type="text" id="g-src" placeholder="搜索"><button id="g-ad" title="新增行">➕ 新增</button><button id="g-dr" title="删除选中行" style="background:#dc3545;">🗑️ 删除选中</button><button id="g-sm" title="生成总结">📝 总结</button><button id="g-ex" title="导出数据">📥 导出</button><button id="g-reset-width" title="重置列宽" style="background:#ffc107;">📏 重置列宽</button><button id="g-ca" title="清空所有表格">🗑️ 全清</button><button id="g-tm" title="主题设置">🎨</button><button id="g-cf" title="配置">⚙️</button>`;
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
    
    // ✅ 计算列宽（如果没有自定义宽度，使用合理的默认值）
    const totalCols = s.c.length + 1;  // +1 是行号列
    
    let h = `<div class="g-tbc" data-i="${ti}" style="${v}"><div class="g-tbl-wrap"><table>`;
    
    // ✅ 表头：行号列固定50px
    h += '<thead class="g-sticky"><tr><th class="g-col-num" style="width:50px;"><input type="checkbox" class="g-select-all" data-ti="' + ti + '"></th>';
    
    s.c.forEach((c, ci) => {
        const width = getColWidth(ti, c);
        // ✅ 如果有自定义宽度就用自定义的，否则不设置（让浏览器自动分配）
        const widthStyle = width ? 
            `style="width:${width}px; position:relative;"` : 
            `style="position:relative;"`;
        
        h += `<th ${widthStyle} data-col="${ci}" data-col-name="${esc(c)}">
            ${esc(c)}
            <div class="g-resizer" data-ti="${ti}" data-ci="${ci}" data-col-name="${esc(c)}" 
                 style="position:absolute; right:0; top:0; width:8px; height:100%; cursor:col-resize; background:transparent; z-index:10;" 
                 title="拖拽调整列宽"></div>
        </th>`;
    });
    h += '</tr></thead><tbody>';
    
    if (s.r.length === 0) {
        h += `<tr class="g-emp"><td colspan="${s.c.length + 1}">暂无数据</td></tr>`;
    } else {
        s.r.forEach((rw, ri) => {
            const summarizedClass = isSummarized(ti, ri) ? ' g-summarized' : '';
            h += `<tr data-r="${ri}" class="g-row${summarizedClass}">
                <td class="g-col-num">
                    <div class="g-n">
                        <input type="checkbox" class="g-row-select" data-r="${ri}">
                        <div>${ri}</div>
                    </div>
                </td>`;
            s.c.forEach((c, ci) => { 
                const val = rw[ci] || '';
                const width = getColWidth(ti, c);
                // ✅ 单元格宽度与表头保持一致
                const widthStyle = width ? `style="width:${width}px;"` : '';
                h += `<td ${widthStyle} data-col="${ci}"><div class="g-e" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(val)}</div></td>`; 
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
    
    // ✅✅✅ Excel式列宽拖拽（拖一列，后面整体平移）
let isResizing = false;
let currentResizer = null;
let startX = 0;
let startWidth = 0;
let tableIndex = 0;
let colIndex = 0;
let colName = '';
let $currentTh = null;

// 鼠标/触摸按下：开始拖拽
$('#g-pop').off('mousedown touchstart', '.g-resizer').on('mousedown touchstart', '.g-resizer', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    currentResizer = $(this);
    tableIndex = parseInt(currentResizer.data('ti'));
    colIndex = parseInt(currentResizer.data('ci'));
    colName = currentResizer.data('col-name');
    
    $currentTh = currentResizer.closest('th');
    const clientX = e.type === 'touchstart' ? e.originalEvent.touches[0].pageX : e.pageX;
    
    startX = clientX;
    startWidth = $currentTh.outerWidth();
    
    $('body').css('cursor', 'col-resize');
    currentResizer.css('background', UI.c);
    
    console.log(`🖱️ 开始拖拽: 表${tableIndex} - 列${colIndex}(${colName}) - 初始宽度${startWidth}px`);
});

// 鼠标/触摸移动：实时调整宽度
$(document).off('mousemove.resizer touchmove.resizer').on('mousemove.resizer touchmove.resizer', function(e) {
    if (!isResizing || !$currentTh) return;
    e.preventDefault();
    
    const clientX = e.type === 'touchmove' ? e.originalEvent.touches[0].pageX : e.pageX;
    const deltaX = clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX);  // 最小50px
    
    // ✅ 只改变当前th和td的宽度，表格会自动调整总宽度
    const $currentTable = $currentTh.closest('table');
    $currentTable.find(`th[data-col="${colIndex}"]`).css('width', newWidth + 'px');
    $currentTable.find(`td[data-col="${colIndex}"]`).css('width', newWidth + 'px');
});

// 鼠标/触摸释放：保存新宽度
$(document).off('mouseup.resizer touchend.resizer').on('mouseup.resizer touchend.resizer', function(e) {
    if (!isResizing) return;
    
    const clientX = e.type === 'touchend' ? 
        (e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0].pageX : startX) : 
        e.pageX;
    const deltaX = clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX);
    
    // 保存到配置
    setColWidth(tableIndex, colName, newWidth);
    
    $('body').css('cursor', '');
    if (currentResizer) {
        currentResizer.css('background', '');
    }
    
    isResizing = false;
    currentResizer = null;
    $currentTh = null;
    
    console.log(`✅ 列宽已保存: 表${tableIndex} - ${colName} = ${newWidth}px`);
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
    $('#g-ca').off('click').on('click', async function() { 
        if (!await customConfirm('确定清空所有表格？此操作不可恢复！\n\n建议先导出备份。', '⚠️ 危险操作')) return; 
        m.all().forEach(s => s.clear()); 
        clearSummarizedMarks();
        m.save(); 
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
        const h = `<div class="g-p"><h4>🎨 主题设置</h4><label>主题色（按钮、表头颜色）：</label><input type="color" id="tc" value="${UI.c}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;"><br><br><label>背景色：</label><input type="color" id="tbc" value="${UI.bc}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;"><br><br><div style="background:#e7f3ff; padding:10px; border-radius:4px; font-size:10px; margin-bottom:12px;"><strong>💡 提示：</strong><br>• 主题色：控制按钮、表头的颜色<br>• 背景色：控制弹窗的背景颜色<br>• 建议使用浅色背景+深色主题色</div><button id="ts" style="padding:8px 16px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">💾 保存</button><button id="tr" style="padding:8px 16px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">🔄 恢复默认</button></div>`;
        pop('🎨 主题设置', h, true);
        setTimeout(() => {
            $('#ts').on('click', async function() { 
                UI.c = $('#tc').val(); 
                UI.bc = $('#tbc').val(); 
                try { localStorage.setItem(UK, JSON.stringify(UI)); } catch (e) {} 
                m.save();
                thm(); 
                await customAlert('主题已保存并应用', '成功'); 
            });
            $('#tr').on('click', async function() { 
                if (!await customConfirm('确定恢复默认主题？', '确认')) return;
                UI = { c: '#9c4c4c', bc: '#ffffff' }; 
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
    PROMPTS.promptVersion = V; // ✅ 保存版本号
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
    const h = `<div class="g-p"><h4>⚙️ 高级配置</h4><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>表格数据注入</legend><label><input type="checkbox" id="c-table-inj" ${C.tableInj ? 'checked' : ''}> 启用表格数据注入</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;">📌 此处是表格和总结一起注入的位置</p><br><label>注入位置：</label><select id="c-table-pos" style="width:100%; padding:5px;"><option value="system" ${C.tablePos === 'system' ? 'selected' : ''}>系统消息</option><option value="user" ${C.tablePos === 'user' ? 'selected' : ''}>用户消息</option><option value="assistant" ${C.tablePos === 'assistant' ? 'selected' : ''}>助手消息</option></select><br><br><label>位置类型：</label><select id="c-table-pos-type" style="width:100%; padding:5px;"><option value="absolute" ${C.tablePosType === 'absolute' ? 'selected' : ''}>相对位置（固定）</option><option value="chat" ${C.tablePosType === 'chat' ? 'selected' : ''}>聊天位置（动态）</option></select><br><br><div id="c-table-depth-container" style="${C.tablePosType === 'chat' ? '' : 'display:none;'}"><label>深度：</label><input type="number" id="c-table-depth" value="${C.tableDepth}" min="0" style="width:100%; padding:5px;"></div></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>自动总结</legend><label><input type="checkbox" id="c-auto-sum" ${C.autoSummary ? 'checked' : ''}> 启用自动总结</label><br><br><label>触发楼层数：</label><input type="number" id="c-auto-floor" value="${C.autoSummaryFloor}" min="10" style="width:100%; padding:5px;"><p style="font-size:10px; color:#666; margin:4px 0 0 0;">⚠️ 达到指定楼层数后，会自动调用AI总结表格数据（只发送表格，不发送聊天记录）</p></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>功能入口</legend><button id="open-api" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px; margin-right:5px;">🤖 AI总结配置</button><button id="open-pmt" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">📝 提示词管理</button></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>其他选项</legend><label><input type="checkbox" id="c-log" ${C.log ? 'checked' : ''}> 控制台详细日志</label><br><br><label><input type="checkbox" id="c-pc" ${C.pc ? 'checked' : ''}> 每个角色独立数据</label><br><br><label><input type="checkbox" id="c-hide" ${C.hideTag ? 'checked' : ''}> 隐藏聊天中的记忆标签</label><br><br><label><input type="checkbox" id="c-filter" ${C.filterHistory ? 'checked' : ''}> 自动过滤历史标签</label></fieldset><button id="save-cfg">💾 保存配置</button></div>`;
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
                await customAlert('配置已保存', '成功');
            });
            $('#open-api').on('click', () => navTo('AI总结配置', shapi));
            $('#open-pmt').on('click', () => navTo('提示词管理', shpmt));
        }, 100);
    }
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    
    function omsg(id) {
    try {
        const x = m.ctx();
        if (!x || !x.chat) return;
        const i = typeof id === 'number' ? id : x.chat.length - 1;
        const mg = x.chat[i];
        if (!mg || mg.is_user) return;
        
        // ✅ 检测是否是重新生成
        if (isRegenerating && deletedMsgIndex === i) {
            console.log(`🔄 [REGENERATE] 检测到重新生成 [消息${i}]`);
            
            // 恢复到删除前的快照
            const restored = restoreSnapshot(i);
            if (restored) {
                console.log(`✅ 快照已恢复，旧数据已清除`);
            } else {
                console.warn(`⚠️ 未找到快照，将基于当前状态处理`);
            }
            
            // 重置标记
            isRegenerating = false;
            deletedMsgIndex = -1;
        } else {
            // ✅ 正常消息，保存快照
            saveSnapshot(i);
        }
        
        const tx = mg.mes || mg.swipes?.[mg.swipe_id] || '';
        const cs = prs(tx);
        if (cs.length > 0) { 
            console.log(`✅ [PARSE] 解析到 ${cs.length} 条指令 ${isRegenerating ? '(已清除旧数据)' : '(新消息)'}`); 
            exe(cs); 
        }
        
        // ✅ 更新最后处理的消息索引
        lastProcessedMsgIndex = i;
        
        // ✅ 定期清理旧快照
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
    
    console.log('🔄 聊天已切换，快照历史已清空');
    setTimeout(hideMemoryTags, 500); 
}
    function opmt(ev) { try { inj(ev); } catch (e) { console.error('❌ 注入失败:', e); } }
    
    function ini() {
        if (typeof $ === 'undefined') { 
            console.log('⏳ 等待 jQuery 加载...');
            setTimeout(ini, 500); 
            return; 
        }
        
        if (typeof SillyTavern === 'undefined') { 
            console.log('⏳ 等待 SillyTavern 加载...');
            setTimeout(ini, 500); 
            return; 
        }
        
        if ($('#extensionsMenu').length === 0) {
            console.log('⏳ 等待扩展菜单加载...');
            setTimeout(ini, 500);
            return;
        }
        
        console.log('✅ 所有依赖已加载，开始初始化');
        
        try { const sv = localStorage.getItem(UK); if (sv) UI = { ...UI, ...JSON.parse(sv) }; } catch (e) {}
        try { 
    const pv = localStorage.getItem(PK); 
    if (pv) {
        const savedPrompts = JSON.parse(pv);
        // ✅ 检查是否有版本标记，如果没有或版本不匹配，使用默认提示词
        if (savedPrompts.promptVersion === V) {
            PROMPTS = { ...PROMPTS, ...savedPrompts };
            console.log('📝 使用已保存的提示词（版本匹配）');
        } else {
            console.log('📝 版本不匹配，使用新的默认提示词');
            // 保存新版本的提示词
            PROMPTS.promptVersion = V;
            localStorage.setItem(PK, JSON.stringify(PROMPTS));
        }
    } else {
        // 首次使用，标记版本
        PROMPTS.promptVersion = V;
        localStorage.setItem(PK, JSON.stringify(PROMPTS));
    }
} catch (e) {
    console.warn('⚠️ 提示词加载失败，使用默认值');
}
        try { const av = localStorage.getItem(AK); if (av) API_CONFIG = { ...API_CONFIG, ...JSON.parse(av) }; } catch (e) {}
        loadColWidths();
        loadSummarizedRows();
        m.load();
        thm();
        
        $('#g-btn').remove();
        const $b = $('<div>', { 
    id: 'g-btn', 
    class: 'list-group-item flex-container flexGap5',
    css: { cursor: 'pointer' }
});

// ✅ 改用 div 标签，添加 extensionsMenuExtensionButton 类
const $icon = $('<div>', { 
    class: 'fa-solid fa-table extensionsMenuExtensionButton'
});

// ✅ 去掉 marginLeft，依靠 flexGap5 控制间距
const $text = $('<span>', { 
    text: '记忆表格'
});

$b.append($icon, $text);
$b.on('click', shw);
        
        $('#extensionsMenu').append($b);
        console.log('✅ 扩展按钮已添加到菜单');
        
       const x = m.ctx();
if (x && x.eventSource) {
    try {
        x.eventSource.on(x.event_types.CHARACTER_MESSAGE_RENDERED, omsg);
        x.eventSource.on(x.event_types.CHAT_CHANGED, ochat);
        x.eventSource.on(x.event_types.CHAT_COMPLETION_PROMPT_READY, opmt);
        
        // ✅✅ 监听消息删除事件（检测重新生成）
        if (x.event_types.MESSAGE_DELETED) {
            x.eventSource.on(x.event_types.MESSAGE_DELETED, function(msgIndex) {
                console.log(`🗑️ [MESSAGE_DELETED] 消息${msgIndex}被删除`);
                
                // 标记为重新生成模式
                isRegenerating = true;
                deletedMsgIndex = msgIndex;
                
                console.log(`🔄 已标记为重新生成模式 [消息${msgIndex}]`);
            });
        }
        
        // ✅ 监听生成结束（清理重新生成标记）
        if (x.event_types.GENERATION_ENDED) {
            x.eventSource.on(x.event_types.GENERATION_ENDED, function() {
                // 延迟清理，确保 omsg 已处理
                setTimeout(() => {
                    if (isRegenerating) {
                        console.log(`⚠️ 生成结束但标记未清理，强制重置`);
                        isRegenerating = false;
                        deletedMsgIndex = -1;
                    }
                }, 1000);
            });
        }
        
        console.log('✅ [EVENT] 事件监听已注册（包含重新生成检测）');
    } catch (e) {
        console.error('❌ 事件监听注册失败:', e);
    }
}
        
        setTimeout(hideMemoryTags, 1000);
        
        console.log('✅ 记忆表格 v' + V + ' 已就绪');
        console.log('📋 包含总结:', m.sm.has() ? `有总结 (${m.sm.loadArray().length}条)` : '无总结');
        console.log('🤖 AI总结:', API_CONFIG.enableAI ? (API_CONFIG.useIndependentAPI ? '独立API' : '酒馆API') : '未配置');
        console.log('🔄 自动总结:', C.autoSummary ? `已启用 (${C.autoSummaryFloor}条触发)` : '已关闭');
    }
    
    setTimeout(ini, 1000);
    
    window.Gaigai = { 
        v: V, 
        m: m, 
        shw: shw, 
        cleanMemoryTags: cleanMemoryTags, 
        MEMORY_TAG_REGEX: MEMORY_TAG_REGEX, 
        config: API_CONFIG, 
        prompts: PROMPTS 
    };
})();
