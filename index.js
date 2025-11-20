// 记忆表格 v1.5.0
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v1.5.0 启动');
    
    const V = 'v1.5.0';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 5;
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
        maxTokens: 2000,
        summarySource: 'table', // 默认为表格模式
        lastSummaryIndex: 0     // ✨新增：记录上次总结到的楼层索引
    };
    
let PROMPTS = {
        tablePrompt: `🔴🔴🔴 记忆表格操作格式指南 🔴🔴🔴

【核心指令】
你必须维护一个结构化的记忆表格。每次回复的**最末尾**（所有内容之后），必须输出 <Memory> 标签更新表格。

【自定义规则区域】
(在此处填入你的：剧情规则、时间流逝规则、世界观设定、各表格的具体记录要求等...)
--------------------------------------------------

【表格操作格式 (严格遵守)】
1. 必须且只能使用 <Memory></Memory> 格式。
2. 指令必须包裹在 HTML 注释 中。
3. 严禁使用 Markdown 代码块、JSON 格式或其他标签。

【指令语法】
1. 新增一行 (用于新事件/新人物):
   insertRow(表索引, {0: "第一列内容", 1: "第二列内容", ...})

2. 更新已有行 (用于推进剧情/修改状态):
   updateRow(表索引, 行索引, {列索引: "新内容", ...})
   * 注意：updateRow 只能更新已存在的行！如果表格为空(0行)，必须先用 insertRow。

【表格索引对照】
0:主线 | 1:支线 | 2:状态 | 3:档案 | 4:关系 | 5:设定 | 6:物品 | 7:约定

【输出示例】
(正文剧情内容...)
<Memory></Memory>`,
        tablePromptPos: 'system',
        tablePromptPosType: 'system_end',
        tablePromptDepth: 0,
        summaryPrompt: `请将以下表格数据总结成简洁的文字描述。

【总结要求】
1. 每个表格生成一条总结，分条列出
2. 使用简洁的语言，每条不超过100字
3. 保留关键信息：时间、地点、人物、事件
4. 使用过去式描述

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
            
            const now = Date.now();
            lastInternalSaveTime = now; // ✨✨✨ 更新最后保存时间（上锁）

            const data = { 
                v: V, 
                id: id, 
                ts: now, 
                d: this.s.map(sh => sh.json()),
                summarized: summarizedRows,
                ui: UI,
                colWidths: userColWidths
            };
            
            // 本地存储
            try { 
                localStorage.setItem(`${SK}_${id}`, JSON.stringify(data)); 
                // console.log('💾 本地保存成功'); // 注释掉避免刷屏
            } catch (e) {}
            
            // 云同步
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chatMetadata) {
                        ctx.chatMetadata.gaigai = data;
                        
                        // 强制触发保存
                        if (typeof ctx.saveChat === 'function') ctx.saveChat();
                    }
                } catch (e) {}
            }
        }
        
        load() {
            const id = this.gid();
            if (!id) return;
            
            if (this.id !== id) { 
                this.id = id; 
                this.s = []; 
                T.forEach(tb => this.s.push(new S(tb.n, tb.c))); 
                this.sm = new SM(this); 
                lastInternalSaveTime = 0; // ✨ 切换聊天时重置锁
            }
            
            let cloudData = null;
            let localData = null;
            
            // 1. 获取云端数据
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chatMetadata && ctx.chatMetadata.gaigai) {
                        cloudData = ctx.chatMetadata.gaigai;
                    }
                } catch (e) {}
            }
            
            // 2. 获取本地数据
            try {
                const sv = localStorage.getItem(`${SK}_${id}`);
                if (sv) localData = JSON.parse(sv);
            } catch (e) {}
            
            // 3. 决策使用哪份数据
            let finalData = null;
            if (cloudData && localData) {
                finalData = (cloudData.ts > localData.ts) ? cloudData : localData;
            } else if (cloudData) {
                finalData = cloudData;
            } else if (localData) {
                finalData = localData;
            }
            
            // ✨✨✨ 【核心修复】时间锁检查 ✨✨✨
            // 如果要加载的数据时间戳 <= 内存最后保存的时间，说明数据是旧的（或者是刚保存完的回音）
            // 此时必须拦截，否则会将刚刚回档的空白表格覆盖回旧数据！
            if (finalData && finalData.ts <= lastInternalSaveTime) {
                console.log(`🛡️ [数据保护] 拦截到过时加载请求 (文件:${finalData.ts} <= 内存:${lastInternalSaveTime})，保留当前回档状态。`);
                return;
            }
            
            // 应用数据
            if (finalData && finalData.v && finalData.d) {
                finalData.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
                if (finalData.summarized) summarizedRows = finalData.summarized;
                if (finalData.ui) { UI = { ...UI, ...finalData.ui }; thm(); }
                if (finalData.colWidths) userColWidths = finalData.colWidths;
                
                // 更新锁的时间，防止下次误判
                lastInternalSaveTime = finalData.ts;
                console.log(`✅ 数据加载成功 (v${finalData.v})`);
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

// ✅✅✅ [核心修复] 强力回档函数 (防止快照污染 - 深拷贝版)
function restoreSnapshot(msgIndex) {
    try {
        // 1. 兼容处理：无论传入的是数字还是字符串，都统一处理
        const key = msgIndex.toString();
        const snapshot = snapshotHistory[key];
        
        if (!snapshot) {
            console.warn(`⚠️ [回档失败] 找不到快照ID: ${key}`);
            return false;
        }
        
        // 2. 先彻底清空当前表格，防止残留
        m.s.slice(0, 8).forEach(sheet => sheet.r = []);
        
        // 3. ✨✨✨ [关键修复] 强力深拷贝恢复 ✨✨✨
        // 旧代码是 m.s[i].from(sd)，这会导致当前表格和快照“连体”
        // 现在我们把快照里的数据“复印”一份全新的给表格，互不干扰
        snapshot.data.forEach((sd, i) => {
            if (i < 8 && m.s[i]) {
                // 创建复印件，而不是直接引用
                const deepCopyData = JSON.parse(JSON.stringify(sd));
                m.s[i].from(deepCopyData);
            }
        });
        
        // 4. 恢复总结状态 (同样深拷贝)
        if (snapshot.summarized) {
            summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
        } else {
            summarizedRows = {};
        }
        
        // 5. 强制锁定保存，防止被酒馆的自动保存覆盖
        lastManualEditTime = 0; 
        m.save();
        
        const totalRecords = m.s.reduce((sum, s) => sum + s.r.length, 0);
        console.log(`✅ [完美回档] 快照${key}已恢复 (深拷贝模式，拒绝污染) - 当前行数:${totalRecords}`);
        
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
    // AI自动执行的指令，最后统一保存
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
    if (!UI.c) UI.c = '#9c4c4c';
    if (!UI.tc) UI.tc = '#ffffff';

    const style = `
        /* ========== 1. 基础容器与字体 ========== */
        .g-ov { background: rgba(0, 0, 0, 0.35) !important; }
        .g-w { 
            background: rgba(255, 255, 255, 0.7) !important;
            backdrop-filter: blur(30px) saturate(180%) !important; 
            -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important; 
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
            font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }

        /* ========== 2. 表格布局 ========== */
        .g-tbc { width: 100% !important; height: 100% !important; overflow: auto !important; }
        .g-tbl-wrap { width: 100% !important; height: 100% !important; background: transparent !important; overflow: visible !important; }

        .g-tbl-wrap table {
            table-layout: fixed !important; 
            width: max-content !important; 
            min-width: auto !important; 
            border-collapse: separate !important; 
            border-spacing: 0 !important;
        }

        /* 表头 */
        .g-tbl-wrap th { 
            background: ${UI.c} !important; 
            color: ${UI.tc} !important; 
            border-right: 1px solid rgba(0, 0, 0, 0.2) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.2) !important;
            border-top: none !important; border-left: none !important;
            position: sticky !important; top: 0 !important; z-index: 10 !important;
            height: 32px !important; padding: 0 4px !important;
            box-sizing: border-box !important; overflow: visible !important; 
            white-space: nowrap !important;
        }

        /* 单元格 */
        .g-tbl-wrap td {
            border-right: 1px solid rgba(0, 0, 0, 0.15) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.15) !important;
            background: rgba(255, 255, 255, 0.5) !important;
            box-sizing: border-box !important; padding: 0 !important;
        }
        
        /* 编辑框 */
        .g-e {
            width: 100% !important; height: 100% !important; min-height: 40px !important;
            padding: 6px !important; background: transparent !important;
            white-space: pre-wrap !important; word-break: break-all !important;
            color: #333 !important; caret-color: ${UI.c} !important; transition: all 0.2s !important;
        }
        .g-e:hover { background: rgba(255, 255, 255, 0.8) !important; box-shadow: inset 0 0 0 1px ${UI.c}40 !important; }
        .g-e:focus {
            outline: 2px solid ${UI.c} !important; outline-offset: -2px !important;
            background: #ffffff !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            z-index: 5 !important; color: #000 !important;
        }
        .g-e::selection { background: ${UI.c} !important; color: #fff !important; }

        /* 行号列 */
        .g-col-num {
            position: sticky !important; left: 0 !important; z-index: 11 !important;
            background: ${UI.c} !important; 
            border-right: 1px solid rgba(0, 0, 0, 0.2) !important;
        }
        tbody .g-col-num { background: rgba(200, 200, 200, 0.4) !important; z-index: 9 !important; }

        /* ========== 拖拽手柄 ========== */
        .g-col-resizer { 
            position: absolute !important; 
            right: -5px !important; 
            top: 0 !important; bottom: 0 !important;
            width: 15px !important; 
            cursor: col-resize !important; 
            z-index: 20 !important;
            touch-action: none !important;
            background: transparent !important; 
            -webkit-tap-highlight-color: transparent !important; 
        }
        @media (min-width: 901px) {
            .g-col-resizer:hover { background: rgba(0,0,0,0.05) !important; border-right: 2px solid ${UI.c} !important; }
        }
        @media (max-width: 900px) {
            .g-col-resizer { width: 30px !important; right: -15px !important; background: transparent !important; }
            .g-col-resizer:active { background: transparent !important; border-right: 2px solid ${UI.c} !important; }
        }

        /* ========== 3. 标题栏 ========== */
        .g-hd { 
            background: ${UI.c} !important; opacity: 0.95; 
            border-bottom: 1px solid rgba(0,0,0,0.1) !important; 
            padding: 12px 16px !important; display: flex !important; align-items: center !important;
        }
        .g-hd h3 { color: ${UI.tc} !important; margin: 0 !important; display: flex !important; align-items: center !important; }
        
        .g-title-box {
            display: inline-flex !important; align-items: center !important; gap: 8px !important;
            background: rgba(255, 255, 255, 0.15) !important; border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 20px !important; padding: 4px 12px !important;
            color: ${UI.tc} !important; font-size: 14px !important; font-weight: 700 !important; letter-spacing: 0.5px !important; user-select: none !important;
        }
        .g-ver-tag {
            font-size: 10px !important; font-weight: 600 !important; opacity: 0.9 !important;
            background: rgba(0, 0, 0, 0.15) !important; color: inherit !important;
            padding: 1px 6px !important; border-radius: 4px !important; line-height: 1.2 !important;
        }
        .g-back {
            color: ${UI.tc} !important; background: rgba(255, 255, 255, 0.15) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important;
            font-size: 12px !important; padding: 4px 10px !important; border-radius: 20px !important; margin-right: 12px !important;
            display: flex !important; align-items: center !important; gap: 5px !important; cursor: pointer !important;
        }
        .g-back:hover { background: rgba(255, 255, 255, 0.25) !important; }

        /* ========== 4. 工具栏 ========== */
        .g-tl { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; padding: 0 0 8px 0 !important; align-items: center !important; }
        .g-search-group { flex: 1 1 200px !important; min-width: 150px !important; }
        #g-src { width: 100% !important; padding: 7px 12px !important; border: 1px solid rgba(0,0,0,0.1) !important; background: rgba(255,255,255,0.6) !important; border-radius: 6px !important; font-size: 13px !important; transition: all 0.2s; }
        #g-src:focus { background: rgba(255,255,255,0.9) !important; box-shadow: 0 0 0 2px ${UI.c}40 !important; outline: none !important; }
        .g-btn-group { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; justify-content: flex-end !important; }
        
        .g-tl button { 
            background: ${UI.c} !important; color: ${UI.tc} !important; font-size: 12px !important; font-weight: 600 !important;
            padding: 6px 12px !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; border-radius: 6px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; cursor: pointer !important; white-space: nowrap !important;
            width: auto !important; flex: 0 0 auto !important; transition: all 0.15s !important;
        }
        .g-tl button:hover { filter: brightness(1.1) !important; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important; }
        .g-tl button:active { transform: translateY(0); }

        /* ========== 5. 标签页 ========== */
        .g-ts { 
            display: flex !important; flex-wrap: wrap !important; gap: 6px !important; 
            padding-bottom: 8px !important; border-bottom: 1px solid rgba(0,0,0,0.05) !important; margin-bottom: 8px !important;
            max-height: none !important; overflow: visible !important;
        }
        .g-t { 
            background: rgba(255,255,255,0.3) !important; border: 1px solid rgba(255,255,255,0.2) !important;
            border-radius: 6px !important; padding: 6px 12px !important; margin: 0 !important; 
            font-size: 12px !important; color: #555 !important; flex-grow: 1 !important; text-align: center !important; min-width: 60px !important;
        }
        .g-t.act { background: ${UI.c} !important; color: ${UI.tc} !important; font-weight: bold !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important; }

        /* ========== 6. 面板内部文字 (✨✨✨ 核心修改 ✨✨✨) ========== */
        /* 强制面板里的标题、标签、正文都跟随 UI.tc (字体颜色) */
        .g-p h4, .g-p label, .g-p p, .g-p div, .g-p span { 
            color: ${UI.tc} !important; 
            text-shadow: none !important; 
        }
        
        /* 输入框里的字保持深色，不然白色背景下看不见 */
        .g-p input:not([type="checkbox"]):not([type="radio"]), .g-p textarea, .g-p select {
            color: #333 !important;
        }
        
        /* 按钮文字强制跟随配置 */
        .g-p button { 
            background: ${UI.c} !important; 
            color: ${UI.tc} !important; 
            border-radius: 6px !important;
        }
        
        /* ========== 其他细节 ========== */
        .g-row.g-selected td { background-color: rgba(125, 125, 125, 0.15) !important; }
        #g-btn { color: inherit !important; }
        #g-btn:hover { background-color: rgba(255, 255, 255, 0.2) !important; }
        
        .g-row.g-summarized { background-color: rgba(0, 0, 0, 0.05) !important; }
        
        /* 滚动条 */
        ::-webkit-scrollbar-thumb { background: ${UI.c} !important; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { filter: brightness(0.8); }
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
    // ✨✨✨ 重置总结进度 ✨✨✨
    API_CONFIG.lastSummaryIndex = 0;
    localStorage.setItem(AK, JSON.stringify(API_CONFIG));
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
    
// ✅ 修改：增加可选参数 forceStart, forceEnd
async function callAIForSummary(forceStart = null, forceEnd = null) {
    const tables = m.all().slice(0, 8).filter(s => s.r.length > 0);
    
    if (API_CONFIG.summarySource !== 'chat' && tables.length === 0) { 
        await customAlert('没有表格数据，无法生成总结', '提示'); 
        return; 
    }
    
    // 如果是按钮触发，按钮ID可能是 g-sm (主界面) 或 manual-sum-btn (配置面板)
    // 这里简单处理，只锁定主界面的按钮防抖，配置面板的按钮单独处理
    const btn = $('#g-sm');
    const originalText = btn.text();
    if (btn.length) btn.text('生成中...').prop('disabled', true);
    
    let fullPrompt = '';
    let logMsg = '';
    let startIndex = 0;
    let endIndex = 0;

    if (API_CONFIG.summarySource === 'chat') {
        // === 模式 B：聊天记录总结 ===
        const ctx = m.ctx();
        if (!ctx || !ctx.chat || ctx.chat.length === 0) {
            await customAlert('聊天记录为空，无法总结', '错误');
            if (btn.length) btn.text(originalText).prop('disabled', false);
            return;
        }

        // ✨✨✨ 核心逻辑：确定总结范围 ✨✨✨
        // 1. 确定结束点 (默认为当前最后一条)
        endIndex = (forceEnd !== null) ? parseInt(forceEnd) : ctx.chat.length;
        
        // 2. 确定开始点
        if (forceStart !== null) {
            // 如果是手动指定
            startIndex = parseInt(forceStart);
        } else {
            // 如果是自动/普通触发，接续上次的进度
            startIndex = API_CONFIG.lastSummaryIndex || 0;
        }
        
        // 3. 安全检查
        if (startIndex < 0) startIndex = 0;
        if (endIndex > ctx.chat.length) endIndex = ctx.chat.length;
        
        if (startIndex >= endIndex) {
             await customAlert(`无效的总结范围：${startIndex} 到 ${endIndex}。\n无新内容或开始大于结束。`, '提示');
             if (btn.length) btn.text(originalText).prop('disabled', false);
             return;
        }

        // 1. 获取人设
        let contextText = '';
        try {
            if (ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
                const char = ctx.characters[ctx.characterId];
                contextText += `【当前背景信息】\n角色: ${char.name}\n用户: ${ctx.name1 || 'User'}\n`;
                if (char.description) contextText += `人设简介: ${char.description}\n`; 
                if (char.scenario) contextText += `当前场景: ${char.scenario}\n`;
                contextText += `----------------\n`;
            }
        } catch (e) {}

        // 2. 截取指定范围的聊天记录
        let chatHistoryText = `【聊天历史记录 (第 ${startIndex} 层 - 第 ${endIndex} 层)】\n`;
        let validMsgCount = 0;

        // 遍历切片
        const targetSlice = ctx.chat.slice(startIndex, endIndex);
        
        targetSlice.forEach((msg) => {
            if (msg.is_system) return; 
            const name = msg.name || (msg.is_user ? '用户' : '角色');
            const cleanContent = cleanMemoryTags(msg.mes || msg.content || ''); 
            if (cleanContent) {
                chatHistoryText += `[${name}]: ${cleanContent}\n`;
                validMsgCount++;
            }
        });
        
        if (validMsgCount === 0) {
             await customAlert('指定范围内没有有效对话内容。', '提示');
             if (btn.length) btn.text(originalText).prop('disabled', false);
             return;
        }

        fullPrompt = PROMPTS.summaryPrompt + '\n\n' + contextText + chatHistoryText;
        logMsg = `📝 发送总结请求：范围 ${startIndex}-${endIndex}，共 ${validMsgCount} 条有效消息`;

    } else {
        // === 模式 A：表格数据 ===
        const tableText = m.getTableText();
        fullPrompt = PROMPTS.summaryPrompt + '\n\n' + tableText;
        logMsg = '📝 发送总结请求 (纯表格数据)';
    }

    console.log(logMsg);
    
    try {
        let result;
        if (API_CONFIG.useIndependentAPI) {
            if (!API_CONFIG.apiKey) {
                await customAlert('请先在配置中填写独立API密钥', '提示');
                if (btn.length) btn.text(originalText).prop('disabled', false);
                return;
            }
            result = await callIndependentAPI(fullPrompt);
        } else {
            result = await callTavernAPI(fullPrompt);
        }
        
        if (btn.length) btn.text(originalText).prop('disabled', false);
        
        if (result.success) {
            console.log('✅ 总结成功');
            
            // ✨✨✨ 更新进度指针 ✨✨✨
            // 只有当这次总结的结束点 >= 之前的进度时，才更新进度
            // 这样如果你回头总结 0-10 层，不会把进度条倒退回去
            if (API_CONFIG.summarySource === 'chat') {
                const currentLast = API_CONFIG.lastSummaryIndex || 0;
                if (endIndex > currentLast) {
                    API_CONFIG.lastSummaryIndex = endIndex;
                    localStorage.setItem(AK, JSON.stringify(API_CONFIG));
                    console.log(`🔖 进度已更新：下次从第 ${endIndex} 层开始`);
                }
            }
            
            showSummaryPreview(result.summary, tables);
        } else {
            await customAlert('生成失败：' + result.error, '错误');
        }
    } catch (e) {
        if (btn.length) btn.text(originalText).prop('disabled', false);
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
    console.log('🚀 [独立API] 开始请求总结...');
    console.log('📡 提供商:', API_CONFIG.provider);

    try {
        let response;
        let requestBody;
        let headers = { 'Content-Type': 'application/json' };
        
        // ✨✨✨ 智能静默补全 (核心逻辑) ✨✨✨
        // 1. 先去掉用户可能多手打的末尾斜杠
        let fetchUrl = API_CONFIG.apiUrl.trim().replace(/\/+$/, ''); 
        
        // 2. 只有当它是 OpenAI 模式，且地址不是以 /chat/completions 结尾时，才补全
        // 这样用户填 .../v1，我们这里自动变成 .../v1/chat/completions 发送出去
        if (API_CONFIG.provider === 'openai' && !fetchUrl.endsWith('/chat/completions')) {
            fetchUrl += '/chat/completions';
        }
        console.log('🔗 实际请求地址(后台自动补全):', fetchUrl);

        // === 1. Gemini 处理 ===
        if (API_CONFIG.provider === 'gemini') {
            // Gemini 用的是原地址，只需补 Key
            let geminiUrl = API_CONFIG.apiUrl;
            if (!geminiUrl.includes('key=') && API_CONFIG.apiKey) {
                geminiUrl = `${geminiUrl}${geminiUrl.includes('?') ? '&' : '?'}key=${API_CONFIG.apiKey}`;
            }
            fetchUrl = geminiUrl; // 赋值回去

            requestBody = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: API_CONFIG.temperature || 0.1,
                    maxOutputTokens: API_CONFIG.maxTokens || 4000
                }
            };
        } 
        // === 2. OpenAI 处理 ===
        else {
            if (API_CONFIG.apiKey) {
                headers['Authorization'] = `Bearer ${API_CONFIG.apiKey}`;
            }
            requestBody = {
                model: API_CONFIG.model,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that summarizes data.' },
                    { role: 'user', content: prompt }
                ],
                temperature: API_CONFIG.temperature || 0.1,
                max_tokens: API_CONFIG.maxTokens || 4000,
                stream: false
            };
        }

        // 发起请求
        response = await fetch(fetchUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        // 错误处理
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [独立API] HTTP错误:', response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 100)}` };
        }

        // 解析
        const data = await response.json();
        let summary = '';

        if (API_CONFIG.provider === 'gemini') {
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                summary = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Gemini 返回格式异常');
            }
        } else {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                summary = data.choices[0].message.content;
            } else {
                throw new Error('OpenAI 返回数据异常 (无 choices)');
            }
        }

        console.log('✅ [独立API] 总结成功');
        return { success: true, summary };

    } catch (e) {
        console.error('❌ [独立API] 请求异常:', e);
        return { success: false, error: '请求异常: ' + e.message };
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
    if (!API_CONFIG.summarySource) API_CONFIG.summarySource = 'table';

    const h = `
    <div class="g-p">
        <h4>🤖 AI 总结配置</h4>
        
        <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
            <legend style="font-size:11px; font-weight:600;">📚 总结来源</legend>
            
            <label style="display:flex; align-items:center; margin-bottom:6px;">
                <input type="radio" name="sum-src" value="table" ${API_CONFIG.summarySource === 'table' ? 'checked' : ''}> 
                <span style="font-weight:bold; margin-left:6px;">仅总结表格</span>
            </label>
            <p style="font-size:10px; color:#666; margin:0 0 8px 22px;">只处理表格内的结构化数据。</p>
            
            <label style="display:flex; align-items:center; margin-bottom:6px;">
                <input type="radio" name="sum-src" value="chat" ${API_CONFIG.summarySource === 'chat' ? 'checked' : ''}> 
                <span style="font-weight:bold; margin-left:6px;">总结聊天历史</span>
            </label>
            <p style="font-size:10px; color:#666; margin:0 0 0 22px;">读取对话记录进行总结 (进度在"配置"面板查看)。</p>
        </fieldset>

        <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
            <legend style="font-size:11px; font-weight:600;">🚀 API 模式</legend>
            <label><input type="radio" name="api-mode" value="tavern" ${!API_CONFIG.useIndependentAPI ? 'checked' : ''}> 使用酒馆API（默认）</label>
            <br>
            <label><input type="radio" name="api-mode" value="independent" ${API_CONFIG.useIndependentAPI ? 'checked' : ''}> 使用独立API</label>
        </fieldset>
        
        <fieldset id="api-config-section" style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px; ${API_CONFIG.useIndependentAPI ? '' : 'opacity:0.5; pointer-events:none;'}">
            <legend style="font-size:11px; font-weight:600;">独立API配置</legend>
            
            <label>API提供商：</label>
            <select id="api-provider" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px;">
                <option value="openai" ${API_CONFIG.provider === 'openai' ? 'selected' : ''}>OpenAI / 中转 / DeepSeek</option>
                <option value="gemini" ${API_CONFIG.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
            </select>
            
            <label>API地址 (Base URL)：</label>
            <input type="text" id="api-url" value="${API_CONFIG.apiUrl}" placeholder="例如: https://api.openai.com/v1" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px; margin-bottom:10px;">
            <p style="font-size:10px; color:#999; margin:-8px 0 10px 0;">* 填写到 /v1 即可，程序自动补全</p>
            
            <label>API密钥 (Key)：</label>
            <input type="password" id="api-key" value="${API_CONFIG.apiKey}" placeholder="sk-..." style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px; margin-bottom:10px;">
            
            <div style="display:flex; justify-content:space-between; align-items:end; margin-bottom:4px;">
                <label style="margin:0;">模型名称：</label>
                <span id="fetch-models-btn" style="cursor:pointer; font-size:10px; color:${UI.c}; border:1px solid ${UI.c}; padding:2px 6px; border-radius:3px; background:rgba(255,255,255,0.5);">🔄 拉取列表</span>
            </div>
            
            <div style="position:relative; margin-bottom:10px;">
                <input type="text" id="api-model" value="${API_CONFIG.model}" placeholder="gpt-3.5-turbo" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px;">
                <select id="api-model-select" style="display:none; width:100%; padding:5px; border:1px solid #ddd; border-radius:4px; font-size:10px;"></select>
            </div>
        </fieldset>
        
        <div style="display:flex; gap:10px;">
            <button id="save-api" style="flex:1; padding:6px 12px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存设置</button>
            <button id="test-api" style="flex:1; padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;" ${API_CONFIG.useIndependentAPI ? '' : 'disabled'}>🧪 测试连接</button>
        </div>
    </div>`;
    
    pop('🤖 AI总结配置', h, true);
    
    setTimeout(() => {
        // API 模式切换
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
        
        // 默认地址填充
        $('#api-provider').on('change', function() {
            const provider = $(this).val();
            if (provider === 'openai') {
                if ($('#api-url').val().includes('googleapis')) {
                        $('#api-url').val('https://api.openai.com/v1');
                }
            } else if (provider === 'gemini') {
                $('#api-url').val('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
                $('#api-model').val('gemini-1.5-flash');
            }
        });

        // 拉取模型
        $('#fetch-models-btn').on('click', async function() {
            const btn = $(this);
            const originalText = btn.text();
            btn.text('拉取中...');
            const apiKey = $('#api-key').val();
            let rawUrl = $('#api-url').val().trim().replace(/\/$/, '');
            let modelsUrl = rawUrl;
            if (modelsUrl.endsWith('/chat/completions')) {
                modelsUrl = modelsUrl.replace(/\/chat\/completions$/, '/models');
            } else if (modelsUrl.endsWith('/v1')) {
                modelsUrl = modelsUrl + '/models';
            } else {
                modelsUrl = modelsUrl + '/models';
            }
            try {
                const response = await fetch(modelsUrl, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                let models = [];
                if (Array.isArray(data.data)) models = data.data.map(m => m.id);
                else if (Array.isArray(data)) models = data.map(m => m.id);

                if (models.length > 0) {
                    const $select = $('#api-model-select');
                    const $input = $('#api-model');
                    $select.empty().append('<option value="__manual__">-- 手动输入 --</option>');
                    models.forEach(m => $select.append(`<option value="${m}">${m}</option>`));
                    if (models.includes($input.val())) $select.val($input.val());
                    $input.hide();
                    $select.show();
                    $select.off('change').on('change', function() {
                        const val = $(this).val();
                        if (val === '__manual__') { $select.hide(); $input.show().focus(); }
                        else { $input.val(val); }
                    });
                    await customAlert(`成功拉取 ${models.length} 个模型！`, '成功');
                } else {
                    throw new Error('数据为空');
                }
            } catch (e) {
                console.error(e);
                await customAlert('拉取失败。\n\n请确保API地址是Base URL (如 .../v1)。\n错误: ' + e.message, '提示');
            } finally {
                btn.text(originalText);
            }
        });

        // 保存配置
        $('#save-api').on('click', async function() {
            API_CONFIG.useIndependentAPI = $('input[name="api-mode"]:checked').val() === 'independent';
            API_CONFIG.summarySource = $('input[name="sum-src"]:checked').val();
            API_CONFIG.provider = $('#api-provider').val();
            API_CONFIG.apiUrl = $('#api-url').val().trim(); 
            API_CONFIG.apiKey = $('#api-key').val();
            API_CONFIG.model = $('#api-model').val();
            API_CONFIG.temperature = 0.1; 
            API_CONFIG.maxTokens = 4000;
            API_CONFIG.enableAI = true;
            try { localStorage.setItem(AK, JSON.stringify(API_CONFIG)); } catch (e) {}
            await customAlert('API配置已保存', '成功');
        });

        // 测试连接
        $('#test-api').on('click', async function() {
            const btn = $(this);
            btn.text('测试中...').prop('disabled', true);
            try {
                const tempConfig = {
                    provider: $('#api-provider').val(),
                    apiUrl: $('#api-url').val().trim(),
                    apiKey: $('#api-key').val(),
                    model: $('#api-model').val(),
                    temperature: 0.5,
                    maxTokens: 100
                };
                const result = await testAPIConnection(tempConfig); 
                if (result.success) {
                    await customAlert('✅ API连接成功！', '成功');
                } else {
                    await customAlert('❌ 连接失败\n\n' + result.error, '失败');
                }
            } catch (e) {
                await customAlert('❌ 错误：' + e.message, '错误');
            }
            btn.text('🧪 测试连接').prop('disabled', false);
        });
    }, 100);
}
    
async function testAPIConnection(inputConfig = null) {
    const config = inputConfig || {
        provider: $('#api-provider').val(),
        apiUrl: $('#api-url').val(),
        apiKey: $('#api-key').val(),
        model: $('#api-model').val()
    };
    
    if (!config.apiKey) return { success: false, error: '请输入API密钥' };
    
    // ✨✨✨ 智能静默补全 (与独立API保持一致) ✨✨✨
    let fetchUrl = config.apiUrl.trim().replace(/\/+$/, '');
    
    if (config.provider === 'openai' && !fetchUrl.endsWith('/chat/completions')) {
        fetchUrl += '/chat/completions';
    }
    
    console.log('🧪 [测试] 实际请求地址:', fetchUrl);

    try {
        let response;
        if (config.provider === 'gemini') {
            let geminiUrl = config.apiUrl;
            if (!geminiUrl.includes('key=')) geminiUrl += `?key=${config.apiKey}`;
            
            response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
            });
        } else {
            // OpenAI 模式
            response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: 'Hi' }],
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
    // 1. 定义选项的选中状态辅助函数
    const isSel = (val, target) => val === target ? 'selected' : '';
    
    const h = `<div class="g-p" style="display: flex; flex-direction: column; gap: 15px;">
        <h4 style="margin:0 0 5px 0; opacity:0.8;">📝 提示词管理</h4>

        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight: 600;">📋 填表提示词</span>
                <span style="font-size:10px; opacity:0.6;">(常驻生效)</span>
            </div>
            
            <textarea id="pmt-table" style="width:100%; height:180px; padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:12px; font-family:monospace; resize:vertical; background:rgba(255,255,255,0.5); box-sizing: border-box; margin-bottom: 12px;">${esc(PROMPTS.tablePrompt)}</textarea>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                
                <div>
                    <div style="font-size:12px; font-weight:bold; opacity:0.8; margin-bottom:6px;">角色</div>
                    <select id="pmt-table-pos" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(0,0,0,0.2); background:rgba(255,255,255,0.8); font-size:12px;">
                        <option value="system" ${isSel('system', PROMPTS.tablePromptPos)}>系统</option>
                        <option value="user" ${isSel('user', PROMPTS.tablePromptPos)}>用户</option>
                        <option value="assistant" ${isSel('assistant', PROMPTS.tablePromptPos)}>AI助手</option>
                    </select>
                    <div style="font-size:10px; opacity:0.5; margin-top:4px;">此消息应归于谁。</div>
                </div>

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <div style="font-size:12px; font-weight:bold; opacity:0.8; margin-bottom:6px;">位置</div>
                        <select id="pmt-table-pos-type" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(0,0,0,0.2); background:rgba(255,255,255,0.8); font-size:12px;">
                            <option value="system_end" ${isSel('system_end', PROMPTS.tablePromptPosType)}>相对</option>
                            <option value="chat" ${isSel('chat', PROMPTS.tablePromptPosType)}>聊天中</option>
                        </select>
                        <div style="font-size:10px; opacity:0.5; margin-top:4px;">插入的位置策略。</div>
                    </div>
                    
                    <div id="pmt-table-depth-container" style="width: 60px; ${PROMPTS.tablePromptPosType === 'chat' ? '' : 'display:none;'}">
                        <div style="font-size:12px; font-weight:bold; opacity:0.8; margin-bottom:6px;">深度</div>
                        <input type="number" id="pmt-table-depth" value="${PROMPTS.tablePromptDepth}" min="0" style="width: 100%; text-align: center; padding:7px; border-radius:6px; border:1px solid rgba(0,0,0,0.2); background:rgba(255,255,255,0.8); font-size:12px; box-sizing: border-box;">
                    </div>
                </div>

            </div>
        </div>

        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 8px; font-weight: 600; display:flex; justify-content:space-between; align-items:center;">
                <span>📝 总结提示词</span>
                <span style="font-size:10px; opacity:0.6;">(仅手动触发)</span>
            </div>
            <textarea id="pmt-summary" style="width:100%; height:80px; padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:12px; font-family:monospace; resize:vertical; background:rgba(255,255,255,0.5); box-sizing: border-box;">${esc(PROMPTS.summaryPrompt)}</textarea>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 5px;">
            <button id="reset-pmt" style="flex:1; background:rgba(108, 117, 125, 0.8); font-size:12px; padding:10px; border-radius:6px;">🔄 恢复默认</button>
            <button id="save-pmt" style="flex:2; padding:10px; font-weight:bold; font-size:13px; border-radius:6px;">💾 保存设置</button>
        </div>
    </div>`;

    pop('📝 提示词管理', h, true);
    
    setTimeout(() => {
        // 监听位置变化，控制深度的显示/隐藏
        $('#pmt-table-pos-type').on('change', function() {
            if ($(this).val() === 'chat') {
                $('#pmt-table-depth-container').css('display', 'block').hide().fadeIn(200);
            } else {
                $('#pmt-table-depth-container').fadeOut(200);
            }
        });

        // 保存按钮
        $('#save-pmt').on('click', async function() {
            PROMPTS.tablePrompt = $('#pmt-table').val();
            PROMPTS.tablePromptPos = $('#pmt-table-pos').val();
            PROMPTS.tablePromptPosType = $('#pmt-table-pos-type').val();
            PROMPTS.tablePromptDepth = parseInt($('#pmt-table-depth').val()) || 0;
            PROMPTS.summaryPrompt = $('#pmt-summary').val();
            PROMPTS.promptVersion = PROMPT_VERSION;
            
            try { localStorage.setItem(PK, JSON.stringify(PROMPTS)); } catch (e) {}
            await customAlert('提示词配置已保存', '成功');
        });

        // 恢复默认按钮
        $('#reset-pmt').on('click', async function() {
            if (!await customConfirm('确定要恢复默认提示词配置吗？', '确认')) return;
            
            // 恢复默认值
            $('#pmt-table-pos').val('system');
            $('#pmt-table-pos-type').val('system_end');
            $('#pmt-table-depth').val(0);
            $('#pmt-table-depth-container').hide();
            
            await customAlert('位置已重置，请点击保存。', '提示');
        });
    }, 100);
}
    
function shcf() {
    // 1. 预先获取进度数据
    if (API_CONFIG.lastSummaryIndex === undefined) API_CONFIG.lastSummaryIndex = 0;
    const ctx = m.ctx();
    const totalCount = ctx && ctx.chat ? ctx.chat.length : 0;
    const lastIndex = API_CONFIG.lastSummaryIndex;

    const h = `<div class="g-p" style="display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin:0 0 4px 0;">⚙️ 插件配置</h4>
        
        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 600;">💡 记忆开关</label>
                <input type="checkbox" id="c-enabled" ${C.enabled ? 'checked' : ''} style="transform: scale(1.2);">
            </div>
            <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.05); margin: 5px 0 8px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-weight: 600;" title="保留人设(#0)，切除中间旧对话">✂️ 隐藏楼层</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; opacity: 0.7;">保留最近</span>
                    <input type="number" id="c-limit-count" value="${C.contextLimitCount}" min="5" style="width: 40px; padding: 2px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                    <input type="checkbox" id="c-limit-on" ${C.contextLimit ? 'checked' : ''} style="transform: scale(1.2);">
                </div>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 600;">💉 注入记忆表格</label>
                <input type="checkbox" id="c-table-inj" ${C.tableInj ? 'checked' : ''} style="transform: scale(1.2);">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                <div>
                    <div style="opacity:0.7; margin-bottom:2px;">角色</div>
                    <select id="c-table-pos" style="width:100%; padding:4px; border-radius:4px; border:1px solid rgba(0,0,0,0.2);">
                        <option value="system" ${C.tablePos === 'system' ? 'selected' : ''}>系统</option>
                        <option value="user" ${C.tablePos === 'user' ? 'selected' : ''}>用户</option>
                        <option value="assistant" ${C.tablePos === 'assistant' ? 'selected' : ''}>AI助手</option>
                    </select>
                </div>
                <div>
                    <div style="opacity:0.7; margin-bottom:2px;">位置</div>
                    <select id="c-table-pos-type" style="width:100%; padding:4px; border-radius:4px; border:1px solid rgba(0,0,0,0.2);">
                        <option value="system_end" ${C.tablePosType === 'system_end' ? 'selected' : ''}>相对</option>
                        <option value="chat" ${C.tablePosType === 'chat' ? 'selected' : ''}>聊天中</option>
                    </select>
                </div>
            </div>
            <div id="c-table-depth-container" style="margin-top: 8px; ${C.tablePosType === 'chat' ? '' : 'display:none;'}">
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                    <span style="opacity:0.7;">深度 (倒数第几条)</span>
                    <input type="number" id="c-table-depth" value="${C.tableDepth}" min="0" style="width: 40px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                </div>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:12px;">
                <label style="font-weight: 600;">🤖 自动总结</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; opacity: 0.7;">每</span>
                    <input type="number" id="c-auto-floor" value="${C.autoSummaryFloor}" min="10" style="width: 40px; padding: 2px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                    <span style="font-size: 11px; opacity: 0.7;">层</span>
                    <input type="checkbox" id="c-auto-sum" ${C.autoSummary ? 'checked' : ''} style="transform: scale(1.2);">
                </div>
            </div>

            <div style="border: 1px dashed ${UI.c}; background: rgba(255,255,255,0.4); border-radius: 6px; padding: 8px;">
                <div style="font-size:11px; font-weight:bold; color:${UI.c} !important; margin-bottom:6px; display:flex; justify-content:space-between;">
                    <span>🎯 手动范围执行</span>
                    <span style="opacity:0.8; font-weight:normal; color:#333;">当前总楼层: ${totalCount}</span>
                </div>
                
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <div style="flex:1;">
                        <input type="number" id="man-start" value="${lastIndex}" title="起始楼层" style="width:100%; padding:4px; text-align:center; border:1px solid rgba(0,0,0,0.2); border-radius:4px; font-size:11px; color:#333;">
                    </div>
                    <span style="font-weight:bold; color:${UI.c}; font-size:10px;">➜</span>
                    <div style="flex:1;">
                        <input type="number" id="man-end" value="${totalCount}" title="结束楼层" style="width:100%; padding:4px; text-align:center; border:1px solid rgba(0,0,0,0.2); border-radius:4px; font-size:11px; color:#333;">
                    </div>
                    <button id="manual-sum-btn" style="padding:4px 8px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px; white-space:nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">⚡ 执行</button>
                </div>
                <div style="font-size:9px; color:#666; text-align:center;">
                    上次总结至: <strong>${lastIndex}</strong> 层 | 
                    <span style="cursor:pointer; text-decoration:underline;" onclick="$('#man-start').val(${lastIndex});$('#man-end').val(${totalCount});">重置范围</span>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
            <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="c-log" ${C.log ? 'checked' : ''}> F12 调试日志</label>
            <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="c-pc" ${C.pc ? 'checked' : ''}> 角色独立存储</label>
            <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="c-hide" ${C.hideTag ? 'checked' : ''}> 隐藏记忆标签</label>
            <label style="display:flex; align-items:center; gap:4px;"><input type="checkbox" id="c-filter" ${C.filterHistory ? 'checked' : ''}> 过滤历史标签</label>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button id="open-api" style="flex:1; font-size:11px; padding:8px;">🤖 AI/API配置</button>
            <button id="open-pmt" style="flex:1; font-size:11px; padding:8px;">📝 提示词</button>
        </div>
        <button id="save-cfg" style="width: 100%; padding: 8px; margin-top: 4px; font-weight: bold;">💾 保存配置</button>
    </div>`;
    
    pop('⚙️ 配置', h, true);
    
    setTimeout(() => {
        $('#c-table-pos-type').on('change', function() {
            if ($(this).val() === 'chat') $('#c-table-depth-container').slideDown(200);
            else $('#c-table-depth-container').slideUp(200);
        });

        // 手动总结按钮事件
        $('#manual-sum-btn').on('click', async function() {
            const start = parseInt($('#man-start').val());
            const end = parseInt($('#man-end').val());
            
            if (isNaN(start) || isNaN(end)) {
                await customAlert('请输入有效的数字', '错误');
                return;
            }
            
            if (API_CONFIG.summarySource !== 'chat') {
                if (await customConfirm('手动范围总结需要使用"聊天历史"模式。\n是否自动切换？', '提示')) {
                    API_CONFIG.summarySource = 'chat';
                    localStorage.setItem(AK, JSON.stringify(API_CONFIG));
                } else {
                    return;
                }
            }
            
            const btn = $(this);
            const oldText = btn.text();
            btn.text('⏳').prop('disabled', true);
            
            setTimeout(async () => {
                await callAIForSummary(start, end);
                btn.text(oldText).prop('disabled', false);
            }, 200);
        });

        // 保存配置
        $('#save-cfg').on('click', async function() {
            C.enabled = $('#c-enabled').is(':checked');
            C.contextLimit = $('#c-limit-on').is(':checked');
            C.contextLimitCount = parseInt($('#c-limit-count').val()) || 30;
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
            
            if (!C.enabled) await customAlert('插件已禁用', '状态');
            else await customAlert('配置已保存', '成功');
        });
        
        $('#open-api').on('click', () => navTo('AI总结配置', shapi));
        $('#open-pmt').on('click', () => navTo('提示词管理', shpmt));
    }, 100);
}
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    
function omsg(id) {
    if (!C.enabled) return;
    
    try {
        const x = m.ctx();
        if (!x || !x.chat) return;
        
        // 获取当前消息索引
        const i = typeof id === 'number' ? id : x.chat.length - 1;
        const mg = x.chat[i];
        
        // 如果消息不存在，或者是用户的消息，不处理（只记录AI生成的）
        if (!mg || mg.is_user) return;
        
        const msgKey = i.toString();
        
        // 防止重复处理同一条消息
        if (processedMessages.has(msgKey)) return;

        // 1. 解析并执行AI回复中的指令（如果有 updateRow 等）
        const swipeId = mg.swipe_id ?? 0;
        const tx = mg.mes || mg.swipes?.[swipeId] || '';
        const cs = prs(tx);
        
        if (cs.length > 0) {
            exe(cs); // 执行指令，更新表格数据
            m.save(); // 立即保存到存储
        }
        
        // 2. 【核心修改】指令执行完毕后，立即为这一层消息建立“已完成态”快照
        // 这样当用户重roll这一层时，我们知道这一层生成了什么，但回档时我们回滚到“上一层”
        const snapshot = {
            data: m.s.slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))),
            summarized: JSON.parse(JSON.stringify(summarizedRows)),
            timestamp: Date.now()
        };
        
        snapshotHistory[msgKey] = snapshot;
        console.log(`📸 [存档] 消息 ${i} 处理完毕，快照已保存。`);
        
        // 3. 标记为已处理
        processedMessages.add(msgKey);
        cleanOldSnapshots();
        
        // 4. 自动总结逻辑 (增量模式优化)
        if (C.autoSummary) {
            const lastIndex = API_CONFIG.lastSummaryIndex || 0;
            const currentCount = x.chat.length;
            const newMsgCount = currentCount - lastIndex;
            
            // 如果新增的消息数量达到了设定的阈值 (例如每50层)
            if (newMsgCount >= C.autoSummaryFloor) {
                console.log(`🤖 [自动总结] 触发: 上次总结于${lastIndex}层，新增${newMsgCount}条 (阈值${C.autoSummaryFloor})`);
                callAIForSummary();
            }
        }
        
        setTimeout(hideMemoryTags, 100);
        
    } catch (e) {
        console.error('❌ omsg 错误:', e);
    }
}
    
// ✅✅✅ [修正版] 聊天切换/初始化函数
    function ochat() { 
        lastInternalSaveTime = 0; 
        m.load(); // 加载当前数据
        
        thm(); 
        
        // 重置所有状态
        snapshotHistory = {};
        lastProcessedMsgIndex = -1;
        isRegenerating = false;
        deletedMsgIndex = -1;
        processedMessages.clear(); 
        
        // 获取当前聊天长度
        const ctx = m.ctx();
        const currentLen = ctx && ctx.chat ? ctx.chat.length : 0;

        // 1. 如果当前已经有对话（比如你刷新页面时已经聊了2句）
        // 我们要把当前加载进来的表格数据，正确归档到“最后一条消息”的名下
        if (currentLen > 0) {
            const lastIdx = currentLen - 1;
            snapshotHistory[lastIdx.toString()] = {
                data: m.all().slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))), 
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            console.log(`📂 [初始化] 检测到已有对话，当前表格状态已归档为快照: ${lastIdx}`);
        }

        // 2. ✨✨✨ [核心修复] 强制创建一个“绝对干净”的 -1 号快照 ✨✨✨
        // 无论你当前表格里有什么，-1 号快照必须是空的！
        // 这样当你重roll第一条消息时，才能回滚到真正的“空”。
        
        // 手动构造空数据
        const emptyData = m.all().slice(0, 8).map(sh => {
            let copy = JSON.parse(JSON.stringify(sh.json()));
            copy.r = []; // 强制清空所有行
            return copy;
        });

        snapshotHistory['-1'] = {
            data: emptyData,
            summarized: {}, 
            timestamp: 0 
        };
        
        console.log('✨ [修复] 已建立绝对空白的创世快照 (-1)');
        setTimeout(hideMemoryTags, 500); 
    }
    
// ✨✨✨ 核心逻辑：三明治切分法 (保留#0灵魂 + 最近N条) ✨✨✨
function applyContextLimit(chat) {
    // 1. 基础检查
    if (!C.contextLimit || !chat || chat.length <= C.contextLimitCount) return chat;

    // 2. 提取“灵魂”：第 0 层
    // 这一层包含了酒馆预处理好的系统指令、世界书、人设、以及其他插件合并进去的提示词
    // 它是 AI 的“大脑”，绝对不能丢！
    const systemAnchor = chat[0];

    // 3. 提取“当下”：最近的 N 层
    // slice(-N) 表示从后往前取 N 个
    const recentChat = chat.slice(-C.contextLimitCount);

    // 4. 安全检查：防止重复
    // 如果“最近 N 层”里已经包含了第 0 层（说明总楼数还没超过限制），那就直接返回
    if (recentChat.includes(systemAnchor)) {
        return chat;
    }

    // 5. 拼装三明治：[灵魂 #0] + [最近 N 层]
    // 中间的旧楼层就这样被“隐藏”了（AI看不见，但酒馆历史记录里还在）
    const newChat = [systemAnchor, ...recentChat];

    console.log(`✂️ [隐藏楼层] 原始: ${chat.length} -> 发送: ${newChat.length} (保留了#0 + 最近${C.contextLimitCount}条)`);
    return newChat;
}

function opmt(ev) { 
    try { 
        if (ev.detail?.isDryRun) return; // 忽略“假发送”
        if (!C.enabled) return;

        if (C.contextLimit) {
            ev.chat = applyContextLimit(ev.chat);
        }
        
        isRegenerating = false; // 重置标记

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
        
// 监听消息删除（重roll或手动删除） - 修复版
        x.eventSource.on(x.event_types.MESSAGE_DELETED, function(eventData) {
            // 获取被删除的消息ID
            let msgIndex;
            if (typeof eventData === 'number') msgIndex = eventData;
            else if (eventData && typeof eventData === 'object') msgIndex = eventData.index ?? eventData.messageIndex ?? eventData.mesId;
            else if (arguments.length > 1) msgIndex = arguments[1];
            
            if (msgIndex === undefined || msgIndex === null) return;

            isRegenerating = true; 
            console.log(`🗑️ [删除事件] 第 ${msgIndex} 层被删除，准备回档。`);

            // 【核心逻辑】寻找目标快照
            let keyToRestore = -999; 
            let found = false;

            // 遍历所有快照，找出 ID < 当前删除层 的最大快照
            Object.keys(snapshotHistory).forEach(k => {
                const keyNum = parseInt(k);
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
                    
                    // 1. 先彻底清空当前表格，防止残留
                    m.s.slice(0, 8).forEach(sheet => sheet.r = []);
                    
                    // 2. ✨✨✨ [关键修复] 强力深拷贝恢复 ✨✨✨
                    // 原理：把快照里的数据“复印”一份全新的给表格，坚决不让表格碰到原件
                    snapshot.data.forEach((sd, i) => {
                        if (i < 8 && m.s[i]) {
                            // 创建复印件，而不是直接引用
                            const deepCopyData = JSON.parse(JSON.stringify(sd));
                            m.s[i].from(deepCopyData);
                        }
                    });
                    
                    // 3. 恢复总结状态 (同样深拷贝)
                    if (snapshot.summarized) {
                        summarizedRows = JSON.parse(JSON.stringify(snapshot.summarized));
                    } else {
                        summarizedRows = {};
                    }
                    
                    // 4. 强制重置手动编辑锁，防止因为回档触发保存而导致锁死
                    lastManualEditTime = 0; 
                    m.save();
                    
                    console.log(`✅ [回档完成] 表格已恢复 (深拷贝模式，拒绝污染)`);
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
            
            // 允许该层再次被处理
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


















