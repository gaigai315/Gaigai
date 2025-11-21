// 记忆表格 v3.2.0
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v3.2.0 启动');
    
    const V = 'v3.2.0';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 12;
    const AK = 'gg_api';
    const CK = 'gg_config';
    const CWK = 'gg_col_widths';
    const SMK = 'gg_summarized';
    const REPO_PATH = 'gaigai315/ST-Memory-Context';
    
    let UI = { c: '#9c4c4c', bc: '#ffffff', tc: '#ffffff' };
    
const C = { 
        enabled: true, 
        contextLimit: false,       
        contextLimitCount: 30,     
        
        // ✨✨✨ 新增：UI折叠配置 ✨✨✨
        uiFold: false,             // UI折叠开关
        uiFoldCount: 50,
        
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
        tablePrompt: `🔴🔴🔴 记忆表格记录指南 🔴🔴🔴

【核心指令】
1.每次回复的最末尾（所有内容和标签之后），必须输出 <Memory> 标签
2.<Memory> 标签必须在最后一行，不能有任何内容在它后面
3.即使本次没有重要剧情，也必须输出（至少更新时间或状态）
4.严禁使用 Markdown 代码块、JSON 格式或其他标签。
5.⚠️【增量更新原则】：只输出本次对话产生的【新变化】。严禁重复输出已存在的旧记录！严禁修改非本次剧情导致的过往数据！

【唯一正确格式】
<Memory></Memory>

⚠️ 必须使用 <Memory> 标签！
⚠️ 必须用<!-- -->包裹！
⚠️ 必须使用数字索引（如 0, 1, 3），严禁使用英文单词（如 date, time）！

【各表格记录规则（同一天多事件系统会自动用分号连接）】
- 主线剧情: 仅记录{{char}}与{{user}}直接产生互动的剧情和影响主线剧情的单独重要事件。格式:HH:mm+角色+地点+事情(严禁记录角色情绪情感)
- 支线追踪: 记录NPC独立情节、或{{user}}/{{char}}与NPC的互动。严禁记录主线剧情。状态必须明确（进行中/已完成/已失败）。
- 角色状态: 仅记录角色自由或身体的重大状态变化（如死亡、残废、囚禁、失明、失忆及恢复）。
- 人物档案: 仅记录System基础设定中完全不存在的新角色。
- 人物关系: 仅记录角色间的决定性关系转换（如朋友→敌人、陌生→恋人）。
- 世界设定: 仅记录System基础设定中完全不存在的全新概念。
- 物品追踪: 仅记录具有唯一性、剧情关键性或特殊纪念意义的道具（如：神器、钥匙、定情信物、重要礼物）。严禁记录普通消耗品（食物/金钱）或环境杂物。
- 约定: 仅记录双方明确达成共识的严肃承诺或誓言。必须包含{{user}}的主动确认。严禁记录单方面的命令、胁迫、日常行程安排或临时口头指令。

【指令语法示例】

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

【表格索引对照】
0:主线 | 1:支线 | 2:状态 | 3:档案 | 4:关系 | 5:设定 | 6:物品 | 7:约定

【输出示例】
(正文剧情内容...)
<Memory><!-- --></Memory>`,
        tablePromptPos: 'system',
        tablePromptPosType: 'system_end',
        tablePromptDepth: 0,
        // 默认：表格总结提示词
        summaryPromptTable: `请将以下表格数据总结成简洁的文字描述。

【智能识别处理】
1. 请将各行分散的信息串联起来，去除冗余，合并同类事件。
2. 重点关注角色状态变化、物品流向及关键剧情节点。

【输出格式要求】
- 必须以“• ”开头，分条列出重要事件。
- 语言风格：客观、简练、使用过去式。
- 严禁编造原文中不存在的内容。

请只总结下面的表格数据：`,

        // 🟢 精简版：聊天记录总结提示词 (基于史官笔法)
    summaryPromptChat: `请分析以下对话历史，严格遵循【史官笔法】生成剧情总结。

【核心原则】
1. 绝对客观：严禁使用主观、情绪化或动机定性的词汇（如“温柔”、“恶意”、“诱骗”），仅记录可观察的事实与结果。
2. 过去式表达：所有记录必须使用过去式（如“已经商议了”、“完成了”），确保叙事的时间定性。
3. 逻辑连贯：确保故事线清晰，不得凭空捏造或扭曲真实剧情 。

【总结内容要求】
1. 主线剧情：
   - 仅记录 {{char}} 与 {{user}} 的关键互动、承诺约定及重要事件。
   - 忽略日常闲聊（如吃饭、发呆），只保留推动剧情的节点。
   - 同一天的剧情请合并为一段描述。

2. 支线追踪：
   - 记录 NPC 的独立行动轨迹、或 NPC 与主角的交互。
   - 明确区分不同势力的行动线，不要混淆。

3. 关键变动（如有）：
   - 角色状态变化（如受伤、死亡、失忆、囚禁）。
   - 确定的关系/情感逆转（如结盟、决裂、爱上、背叛）。

请直接输出总结正文，严禁包含任何开场白、结束语或非剧情相关的交互性对话（如“收到”、“好的”）：`,
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
        // 0号表：主线
        0: { '日期': 90, '开始时间': 80, '完结时间': 80, '状态': 60 },
        // 1号表：支线 (你觉得太宽的就是这里)
        1: { '状态': 60, '支线名': 100, '开始时间': 80, '完结时间': 80, '事件追踪': 150, '关键NPC': 80 },
        // 其他表默认改小
        2: { '时间': 100 },
        3: { '年龄': 40 },
        6: { '状态': 60, '重要程度': 60 },
        7: { '约定时间': 100 },
        8: { '表格类型': 100 }
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
            if (i === this.r.length) { this.r.push({}); }
            else if (i > this.r.length) { return; } 
            
            Object.entries(d).forEach(([k, v]) => {
                if ((this.n === '主线剧情' && k == '3') || (this.n === '支线追踪' && k == '4')) {
                    if (this.r[i][k] && v && !this.r[i][k].includes(v.trim())) {
                        this.r[i][k] += '；' + v.trim();
                        return;
                    }
                }
                this.r[i][k] = v; 
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
        
        // ✅ 过滤逻辑：只发未总结的行，但保留原始行号
        txt(ti) {
            if (this.r.length === 0) return '';
            let t = `【${this.n}】\n`;
            let visibleCount = 0;
            
            this.r.forEach((rw, ri) => {
                if (summarizedRows[ti] && summarizedRows[ti].includes(ri)) {
                    return; // 跳过绿色行
                }

                visibleCount++;
                // 🟢 重点：这里输出的是 ri (原始索引)，比如 [8], [9]
                t += `  [${ri}] `; 
                this.c.forEach((cl, ci) => {
                    const v = rw[ci] || '';
                    if (v) t += `${cl}:${v} | `;
                });
                t += '\n';
            });
            
            if (visibleCount === 0) return '';
            return t;
        }
    }
    
    class SM {
        constructor(manager) { this.m = manager; }
        save(summaryData) {
            const sumSheet = this.m.get(8); 
            const cleanType = (t) => t.replace(/[\*\#\-\s_>•\[\]]/g, ''); 
            const processItem = (rawType, content) => {
                const tableType = cleanType(rawType); 
                const newContent = content.trim();
                if (!tableType || !newContent) return;
                let existingRowIndex = -1;
                for (let i = 0; i < sumSheet.r.length; i++) {
                    if (cleanType(sumSheet.r[i][0]) === tableType) {
                        existingRowIndex = i;
                        break;
                    }
                }
                if (existingRowIndex >= 0) {
                    const existingContent = sumSheet.r[existingRowIndex][1] || '';
                    if (!existingContent.includes(newContent.slice(0, 10))) { 
                        sumSheet.upd(existingRowIndex, { 1: existingContent + '\n\n' + newContent });
                    }
                } else {
                    sumSheet.ins({ 0: tableType, 1: newContent });
                }
            };
            if (typeof summaryData === 'string') {
                const lines = summaryData.split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    const colonIndex = line.search(/[:：]/);
                    if (colonIndex > -1) {
                        processItem(line.substring(0, colonIndex), line.substring(colonIndex + 1));
                    } else if (line.trim().length > 5 && !line.includes('总结')) {
                        processItem('综合', line);
                    }
                });
            } else if (Array.isArray(summaryData)) {
                summaryData.forEach(item => processItem(item.type || '综合', item.content || item));
            }
            this.m.save();
        }
        load() {
            const sumSheet = this.m.get(8);
            if (sumSheet.r.length === 0) return '';
            return sumSheet.r.map(row => `• ${row[0] || '综合'}：${row[1] || ''}`).filter(t => t).join('\n');
        }
        loadArray() { return this.m.get(8).r.map(row => ({ type: row[0] || '综合', content: row[1] || '' })); }
        clear() { this.m.get(8).clear(); this.m.save(); }
        has() { const s = this.m.get(8); return s.r.length > 0 && s.r[0][1]; }
    }  

    class M {
        constructor() { this.s = []; this.id = null; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        save() {
            const id = this.gid();
            if (!id) return;
            const ctx = this.ctx();
            const totalRows = this.s.reduce((acc, sheet) => acc + (sheet.r ? sheet.r.length : 0), 0);
            if (ctx && ctx.chat && ctx.chat.length > 5 && totalRows === 0) {
                console.warn('🛡️ [熔断保护] 检测到异常空数据，已阻止覆盖保存！');
                return;
            }
            const now = Date.now();
            lastInternalSaveTime = now; 
            const data = { v: V, id: id, ts: now, d: this.s.map(sh => sh.json()), summarized: summarizedRows, colWidths: userColWidths };
            try { localStorage.setItem(`${SK}_${id}`, JSON.stringify(data)); } catch (e) {}
            if (C.cloudSync) {
                try { if (ctx && ctx.chatMetadata) { ctx.chatMetadata.gaigai = data; if (typeof ctx.saveChat === 'function') ctx.saveChat(); } } catch (e) {}
            }
        }
        
        load() {
            const id = this.gid();
            if (!id) return;
            if (this.id !== id) { this.id = id; this.s = []; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); lastInternalSaveTime = 0; }
            let cloudData = null; let localData = null;
            if (C.cloudSync) { try { const ctx = this.ctx(); if (ctx && ctx.chatMetadata && ctx.chatMetadata.gaigai) cloudData = ctx.chatMetadata.gaigai; } catch (e) {} }
            try { const sv = localStorage.getItem(`${SK}_${id}`); if (sv) localData = JSON.parse(sv); } catch (e) {}
            let finalData = null;
            if (cloudData && localData) finalData = (cloudData.ts > localData.ts) ? cloudData : localData;
            else if (cloudData) finalData = cloudData;
            else if (localData) finalData = localData;
            
            if (finalData && finalData.ts <= lastInternalSaveTime) return;
            if (finalData && finalData.v && finalData.d) {
                finalData.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
                if (finalData.summarized) summarizedRows = finalData.summarized;
                if (finalData.colWidths) userColWidths = finalData.colWidths;
                lastInternalSaveTime = finalData.ts;
            }
        }
            
        gid() {
            try {
                const x = this.ctx();
                if (!x) return null; 
                const chatId = x.chatMetadata?.file_name || x.chatId;
                if (!chatId) return null; 
                if (C.pc) {
                    const charName = x.name2 || x.characterId;
                    if (!charName) return null; 
                    return `${charName}_${chatId}`;
                }
                return chatId;
            } catch (e) { return null; }
        }
        
        ctx() { return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null; }
        
        getTableText() { return this.s.slice(0, 8).map((s, i) => s.txt(i)).filter(t => t).join('\n'); }
        
        pmt() {
            let result = '';
            if (this.sm.has()) {
                result += '=== 📚 记忆总结（历史压缩数据，仅供参考） ===\n\n' + this.sm.load() + '\n\n=== 总结结束 ===\n\n';
            }
            
            const tableStr = this.s.slice(0, 8).map((s, i) => s.txt(i)).filter(t => t).join('\n');
            if (tableStr) {
                result += '=== 📊 详细表格（当前实际数据，需要操作此处） ===\n\n' + tableStr + '=== 表格结束 ===\n';
            } else if (this.sm.has()) {
                result += '=== 📊 详细表格（空/已归档） ===\n\n⚠️ 所有详细数据已归档，当前可视为空。\n\n=== 表格结束 ===\n';
            }
            
            // ✨✨✨ 核心修改：在状态栏显式告诉 AI 下一个索引 ✨✨✨
            result += '\n=== 📋 当前表格状态 ===\n';
            this.s.slice(0, 8).forEach((s, i) => {
                const displayName = i === 1 ? '支线追踪' : s.n;
                const greenCount = summarizedRows[i] ? summarizedRows[i].length : 0;
                const nextIndex = s.r.length; // 下一个空位的索引
                
                result += `表${i} ${displayName}: 总${s.r.length}行 (🟢已归档${greenCount}行)`;
                
                // 🔴 重点：明确告诉 AI 下一行该填几，防止它因为看不到前面的行而填错
                result += ` -> ⚠️新增请务必使用索引 ${nextIndex} (即 insertRow(${i}, {0:"..."}))`;
                result += '\n';
            });
            result += '=== 状态结束 ===\n';
            
            return result || '';
        }
    }

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
    // ❌ 删除旧逻辑：if (!C.enabled) return; 
    // 现在我们要分情况讨论，不能直接 return

    // ============================================================
    // 步骤1：注入数据（表格 或 总结）
    // ============================================================
    let contentToInject = '';
    let logMsg = '';

    if (C.enabled) {
        // ✅ 情况A：开关开启 -> 注入【总结 + 详细表格】
        // 只要用户勾选了“注入记忆表格”，就全部发送
        if (C.tableInj) {
            contentToInject = m.pmt(); // pmt() 内部包含了总结和详细表格
            logMsg = `📊 完整表格数据已注入`;
        }
    } else {
        // ✅ 情况B：开关关闭 -> 仅注入【记忆总结】(如果有的话)
        // 我们不发详细表格，也不发提示词，但把总结发给AI，作为“只读记忆”
        if (m.sm.has()) {
            contentToInject = '=== 📚 记忆总结（历史存档） ===\n\n' + m.sm.load() + '\n\n';
            logMsg = `⚠️ 记忆已关，仅注入【历史总结】`;
        }
    }

    // 执行注入数据
    if (contentToInject) {
        const dataPos = getInjectionPosition(C.tablePos, C.tablePosType, C.tableDepth, ev.chat);
        const role = getRoleByPosition(C.tablePos);
        ev.chat.splice(dataPos, 0, { 
            role, 
            content: contentToInject,
            isGaigaiData: true
        });
        console.log(`${logMsg} (位置:${dataPos})`);
    }
    
    // ============================================================
    // 步骤2：注入提示词 (仅当开关开启时)
    // ============================================================
    if (C.enabled && PROMPTS.tablePrompt) {
        const pmtPos = getInjectionPosition(PROMPTS.tablePromptPos, PROMPTS.tablePromptPosType, PROMPTS.tablePromptDepth, ev.chat);
        const role = getRoleByPosition(PROMPTS.tablePromptPos);
        ev.chat.splice(pmtPos, 0, { 
            role, 
            content: PROMPTS.tablePrompt,
            isGaigaiPrompt: true
        });
        console.log(`📝 填表提示词已注入 (位置:${pmtPos})`);
    } else if (!C.enabled) {
        console.log(`🚫 记忆已关，跳过提示词注入`);
    }
    
    // ============================================================
    // 步骤3：清理历史消息中的标签（保持不变）
    // ============================================================
    if (C.filterHistory) {
        // ... (清理逻辑保持原样，不用动) ...
        ev.chat = ev.chat.map((msg, index) => {
            if (msg.isGaigaiPrompt || msg.isGaigaiData || msg.isPhoneMessage) return msg;
            if (msg.content && (msg.content.includes('📱 手机') || msg.content.includes('手机微信消息记录'))) return msg;
            if (msg.is_user || msg.role === 'user' || msg.role === 'system') return msg;
            
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
                            cleanedMsg[field] = cleanedMsg[field].replace(MEMORY_TAG_REGEX, '').trim();
                        }
                    });
                    return cleanedMsg;
                }
            }
            return msg;
        });
    }
    
    // 日志打印 (保持不变)
    setTimeout(() => {
        if (C.log) {
            console.log('═════════════════════════════════════════');
            console.log('📤 发送给AI的内容（含手机消息）:');
            ev.chat.forEach((msg, index) => {
                const content = msg.content || msg.mes || msg.message || msg.text || '';
                const hasTag = MEMORY_TAG_REGEX.test(content);
                const isPrompt = msg.isGaigaiPrompt ? '📌提示词' : '';
                const isData = msg.isGaigaiData ? '📊表格' : '';
                const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
                console.log(`[${index}] ${msg.role}${hasTag ? ' 🏷️含标签' : ''}${isPrompt}${isData}: ${preview}`);
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
    // 读取配置
    try {
        const savedUI = localStorage.getItem(UK);
        if (savedUI) {
            const parsed = JSON.parse(savedUI);
            if (parsed.c) UI.c = parsed.c;
            if (parsed.tc) UI.tc = parsed.tc;
        }
    } catch (e) { console.warn('读取主题配置失败'); }
    
    if (!UI.c) UI.c = '#9c4c4c';
    if (!UI.tc) UI.tc = '#ffffff';

    // ✨✨✨ 颜色转换算法：Hex -> RGBA ✨✨✨
    // 这能确保“选中行”的背景色永远是主题色的淡化版，而不是死板的红色
    const hexToRgba = (hex, alpha) => {
        let r = 0, g = 0, b = 0;
        // 处理简写 #fff
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // 生成半透明的主题背景色 (透明度 0.15)
    const selectionBg = hexToRgba(UI.c, 0.15);

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
        
        .g-tbl-wrap { 
            width: 100% !important; 
            height: 100% !important; 
            background: transparent !important; 
            overflow: auto !important; 
            
            /* ✨✨✨ 核心修复 1：底部留白 150px，右侧留白 50px ✨✨✨ */
            /* 右侧留白是为了让最后一列能滑到屏幕中间，防止贴边无法拖拽 */
            padding-bottom: 150px !important; 
            padding-right: 50px !important; 
        }

        .g-tbl-wrap table {
            /* Excel 模式：内容决定宽度，不强制拉伸 */
            width: max-content !important; 
            min-width: auto !important;     
            table-layout: fixed !important; 
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
            box-sizing: border-box !important; 
            overflow: visible !important; /* 允许拖拽条伸出去 */
            white-space: nowrap !important;
        }

        /* 单元格 */
        .g-tbl-wrap td {
            border-right: 1px solid rgba(0, 0, 0, 0.15) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.15) !important;
            background: rgba(255, 255, 255, 0.5) !important;
            box-sizing: border-box !important; padding: 0 !important;
            
            height: 40px !important;
            max-height: 40px !important;
            min-height: 40px !important;
            
            white-space: nowrap !important;
            overflow: hidden !important;
            max-width: 0; 
        }
        
        /* 编辑框 */
        .g-e {
            width: 100% !important; height: 100% !important; 
            padding: 0 6px !important; background: transparent !important;
            
            white-space: nowrap !important; 
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            
            line-height: 40px !important;
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

        /* ✨✨✨ 核心修复 2：加大拖拽条触控面积 ✨✨✨ */
        .g-col-resizer { 
            position: absolute !important; 
            /* 向右偏移 10px，让它跨在两个单元格中间 */
            right: -10px !important; 
            top: 0 !important; bottom: 0 !important;
            /* 宽度加倍到 20px，更容易按到 */
            width: 20px !important; 
            cursor: col-resize !important; 
            z-index: 20 !important;
            touch-action: none !important;
            background: transparent !important; 
            -webkit-tap-highlight-color: transparent !important; 
        }
        
        .g-col-resizer:hover, .g-col-resizer:active { 
            background: transparent !important; 
            /* 视觉上还是显示一条细线，居中 */
            border-right: 2px solid ${UI.c} !important; 
            /* 也就是让边框画在 20px 宽度的中间 */
            background-clip: content-box !important;
            padding-right: 9px !important;
        }

        /* 选中行 */
        .g-row.g-selected td { 
            background-color: ${selectionBg} !important; 
        }
        .g-row.g-selected { 
            outline: 2px solid ${UI.c} !important;
            outline-offset: -2px !important;
        }

        /* 标题栏 */
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

        /* ✨✨✨ 新增：更新提醒小红点 ✨✨✨ */
        .g-has-update {
            color: #ff6b6b !important; /* 图标变红 */
            position: relative !important;
        }
        .g-has-update::after {
            content: '' !important;
            position: absolute !important;
            top: -2px !important;
            right: -3px !important;
            width: 8px !important;
            height: 8px !important;
            background: #ff4757 !important; /* 鲜艳的红点 */
            border-radius: 50% !important;
            border: 1px solid #fff !important;
            box-shadow: 0 0 4px rgba(255, 71, 87, 0.5) !important;
        }

        /* 工具栏 */
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

        /* 标签页 */
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

        /* 面板文字 */
        .g-p h4, .g-p label, .g-p p, .g-p div, .g-p span { color: ${UI.tc} !important; text-shadow: none !important; }
        .g-p input:not([type="checkbox"]):not([type="radio"]), .g-p textarea, .g-p select { color: #333 !important; }
        .g-p button { background: ${UI.c} !important; color: ${UI.tc} !important; border-radius: 6px !important; }
        
        /* 其他 */
        #g-btn { color: inherit !important; }
        #g-btn:hover { background-color: rgba(255, 255, 255, 0.2) !important; }
        .g-row.g-summarized { background-color: rgba(0, 0, 0, 0.05) !important; }
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
            <button id="g-im" title="从JSON恢复数据">📤 导入</button>
            <button id="g-reset-width" title="重置列宽">📏 重置列</button>
            <button id="g-clear-tables" title="保留总结，清空详情">🧹 清表</button>
            <button id="g-ca" title="清空所有数据">💥 全清</button>
            <button id="g-tm" title="设置外观">🎨 主题</button>
            <button id="g-cf" title="插件设置">⚙️ 配置</button>
        </div>
    `;

    const tbls = ss.map((s, i) => gtb(s, i)).join('');
    
    // ✨✨✨ 核心修改：标题栏增加 "关于/更新" 按钮 ✨✨✨
    const cleanVer = V.replace(/^v+/i, ''); 
    const titleHtml = `
        <div class="g-title-box">
            <span>记忆表格</span>
            <span class="g-ver-tag">v${cleanVer}</span>
            <i id="g-about-btn" class="fa-solid fa-circle-info" 
               style="margin-left:6px; cursor:pointer; opacity:0.8; font-size:14px; transition:all 0.2s;" 
               title="使用说明 & 检查更新"></i>
        </div>
    `;
    // ✨✨✨ 结束 ✨✨✨

    const h = `<div class="g-vw">
        <div class="g-ts">${tbs}</div>
        <div class="g-tl">${tls}</div>
        <div class="g-tb">${tbls}</div>
    </div>`;
    
    pop(titleHtml, h);

    // ✨✨✨ 新增：静默检查更新状态（红点逻辑） ✨✨✨
    checkForUpdates(V.replace(/^v+/i, ''));

    // ✨✨✨ 新增：首次打开新版本自动弹出说明书 ✨✨✨
    const lastReadVer = localStorage.getItem('gg_notice_ver');
    if (lastReadVer !== V) {
        // 稍微延迟一点弹出，体验更好
        setTimeout(() => {
            showAbout(true); // true 表示这是自动弹出的
        }, 300);
    }
    
    setTimeout(bnd, 100);
    
    // ✨✨✨ 绑定说明按钮事件 ✨✨✨
    setTimeout(() => {
        $('#g-about-btn').hover(
            function() { $(this).css({ opacity: 1, transform: 'scale(1.1)' }); },
            function() { $(this).css({ opacity: 0.8, transform: 'scale(1)' }); }
        ).on('click', (e) => {
            e.stopPropagation();
            showAbout(); // 打开说明页
        });
    }, 100);

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
        
        // 行号列固定40px (稍微改窄一点点)
        h += '<th class="g-col-num" style="width:40px; min-width:40px; max-width:40px;">';
        h += '<input type="checkbox" class="g-select-all" data-ti="' + ti + '">';
        h += '</th>';
    
        // 数据列表头
        s.c.forEach((c, ci) => {
            // 🟢 修改：默认保底宽度改为 100，不再那么宽了
            const width = getColWidth(ti, c) || 100;
            
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
                h += `<td class="g-col-num" style="width:40px; min-width:40px; max-width:40px;">
                    <div class="g-n">
                        <input type="checkbox" class="g-row-select" data-r="${ri}">
                        
                        <div>${ri + 1}</div>
                        
                    </div>
                </td>`;
                
                // 数据列
                s.c.forEach((c, ci) => { 
                    const val = rw[ci] || '';
                    // 🟢 修改：默认保底宽度改为 100
                    const width = getColWidth(ti, c) || 100;
                    
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
    
// ✅ 更新选中行数组并同步视觉状态 (修复版：去除硬编码颜色，完全依赖 CSS)
function updateSelectedRows() {
    selectedRows = [];
    
    // 1. 清除所有行的选中状态 (移除类名，并清空内联样式)
    $('#g-pop .g-tbc:visible .g-row').removeClass('g-selected').css({
        'background-color': '',
        'outline': ''
    });
    
    // 2. 重新标记选中的行 (只添加类名，不写死颜色！)
    $('#g-pop .g-tbc:visible .g-row-select:checked').each(function() {
        const rowIndex = parseInt($(this).data('r'));
        selectedRows.push(rowIndex);
        
        // ✨✨✨ 关键：这里只加类名，具体的颜色由 thm() 里的 CSS 决定
        $(this).closest('.g-row').addClass('g-selected');
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
    
    startWidth = $th.outerWidth();
    
    startX = e.type === 'touchstart' ? 
        (e.originalEvent.touches[0]?.pageX || e.pageX) : 
        e.pageX;
    
    $('body').css({ 'cursor': 'col-resize', 'user-select': 'none' });
    
    // ✨✨✨ 核心修改：背景设为透明，只留右边框 ✨✨✨
    $(this).css({
        'background': 'transparent', // 之前是红色，现在透明
        'border-right': '2px solid ' + UI.c // 细线还是得留着，不然不知道拖哪了
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
        // 排除编辑框、复选框和行号列
        if ($(e.target).hasClass('g-e') || $(e.target).closest('.g-e').length > 0) return;
        if ($(e.target).is('input[type="checkbox"]') || $(e.target).closest('.g-col-num').length > 0) return;
        
        const $row = $(this); 
        
        // 清除其他行的选中状态
        $('.g-row').removeClass('g-selected').css({'background-color': '', 'outline': ''}); 
        
        // ✨✨✨ 关键：只加类名，不写颜色
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

// ✨✨✨ 新增：导入功能 (美化弹窗版) ✨✨✨
    $('#g-im').off('click').on('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            // ✅ 必须保留 async，否则后面的 await 会报错
            reader.onload = async event => {
                try {
                    const jsonStr = event.target.result;
                    const data = JSON.parse(jsonStr);
                    
                    // 兼容 's' (导出文件) 和 'd' (内部存档) 两种格式
                    const sheetsData = data.s || data.d;
                    
                    if (!sheetsData || !Array.isArray(sheetsData)) {
                        // 🎨 美化：使用自定义弹窗报错
                        await customAlert('❌ 错误：这不是有效的记忆表格备份文件！\n(找不到数据数组)', '导入失败');
                        return;
                    }
                    
                    const timeStr = data.ts ? new Date(data.ts).toLocaleString() : (data.t ? new Date(data.t).toLocaleString() : '未知时间');
                    
                    // 🎨 美化：使用自定义确认框
                    const confirmMsg = `⚠️ 确定要导入吗？\n\n这将用文件里的数据覆盖当前的表格！\n\n📅 备份时间: ${timeStr}`;
                    if (!await customConfirm(confirmMsg, '确认导入')) return;
                    
                    // 开始恢复
                    m.s.forEach((sheet, i) => {
                        if (sheetsData[i]) sheet.from(sheetsData[i]);
                    });
                    
                    if (data.summarized) summarizedRows = data.summarized;
                    
                    // 强制保存并刷新
                    lastManualEditTime = Date.now();
                    m.save();
                    shw(); 
                    
                    // 🎨 美化：成功提示
                    await customAlert('✅ 导入成功！数据已恢复。', '完成');
                    
                } catch (err) {
                    // 🎨 美化：异常提示
                    await customAlert('❌ 读取文件失败: ' + err.message, '错误');
                }
            };
            reader.readAsText(file);
        };
        
        input.click(); 
    });
    
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

        // ✨ 使用聊天总结专用提示词
        const chatPrompt = PROMPTS.summaryPromptChat || PROMPTS.summaryPrompt; 
        fullPrompt = chatPrompt + '\n\n' + contextText + chatHistoryText;
        logMsg = `📝 发送总结请求：范围 ${startIndex}-${endIndex}，共 ${validMsgCount} 条有效消息`;

    } else {
        // === 模式 A：表格数据 ===
        const tableText = m.getTableText();
        // ✨ 使用表格总结专用提示词
        const tablePrompt = PROMPTS.summaryPromptTable || PROMPTS.summaryPrompt;
        fullPrompt = tablePrompt + '\n\n' + tableText;
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
                    <button id="save-summary" style="padding:8px 16px; background:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; width: 100%;">✅ 保存总结</button>
                </div>
            </div>
        `;
        
        $('#g-summary-pop').remove();
        const $o = $('<div>', { id: 'g-summary-pop', class: 'g-ov', css: { 'z-index': '10000001' } });
        const $p = $('<div>', { class: 'g-w', css: { width: '700px', maxWidth: '92vw', height: 'auto' } });
        const $hd = $('<div>', { class: 'g-hd' });
        $hd.append('<h3 style="color:#fff; flex:1;">📝 记忆总结</h3>');
        
        // 右上角的关闭按钮（保留作为唯一的取消方式）
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
            
            // ✨✨✨ 已删除：$('#cancel-summary').on('click'...) 的监听逻辑 ✨✨✨
            
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
    // 保持这个初始化，以防万一
    if (!API_CONFIG.summarySource) API_CONFIG.summarySource = 'table';

    const h = `
    <div class="g-p">
        <h4>🤖 AI 总结配置</h4>
        
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
            // API_CONFIG.summarySource 已移至 shcf 处理，这里只需读取 API 相关配置
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
    
    // 2. 准备临时变量，用于在切换标签时暂存内容
    let tempTablePmt = PROMPTS.summaryPromptTable || PROMPTS.summaryPrompt; // 兼容旧版
    let tempChatPmt = PROMPTS.summaryPromptChat || PROMPTS.summaryPrompt;   // 兼容旧版

    const h = `<div class="g-p" style="display: flex; flex-direction: column; gap: 15px;">
        <h4 style="margin:0 0 5px 0; opacity:0.8;">📝 提示词管理</h4>

        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight: 600;">📋 填表提示词</span>
                <span style="font-size:10px; opacity:0.6;">(常驻生效)</span>
            </div>
            
            <textarea id="pmt-table" style="width:100%; height:150px; padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:12px; font-family:monospace; resize:vertical; background:rgba(255,255,255,0.5); box-sizing: border-box; margin-bottom: 12px;">${esc(PROMPTS.tablePrompt)}</textarea>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <div style="font-size:12px; font-weight:bold; opacity:0.8; margin-bottom:6px;">角色</div>
                    <select id="pmt-table-pos" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(0,0,0,0.2); background:rgba(255,255,255,0.8); font-size:12px;">
                        <option value="system" ${isSel('system', PROMPTS.tablePromptPos)}>系统</option>
                        <option value="user" ${isSel('user', PROMPTS.tablePromptPos)}>用户</option>
                        <option value="assistant" ${isSel('assistant', PROMPTS.tablePromptPos)}>AI助手</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <div style="font-size:12px; font-weight:bold; opacity:0.8; margin-bottom:6px;">位置</div>
                        <select id="pmt-table-pos-type" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(0,0,0,0.2); background:rgba(255,255,255,0.8); font-size:12px;">
                            <option value="system_end" ${isSel('system_end', PROMPTS.tablePromptPosType)}>相对</option>
                            <option value="chat" ${isSel('chat', PROMPTS.tablePromptPosType)}>聊天中</option>
                        </select>
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
                
                <div style="display:flex; background:rgba(0,0,0,0.1); border-radius:4px; padding:2px;">
                    <label style="cursor:pointer; padding:4px 8px; border-radius:3px; font-size:11px; display:flex; align-items:center; transition:all 0.2s;" id="tab-label-table" class="active-tab">
                        <input type="radio" name="pmt-sum-type" value="table" checked style="display:none;">
                        📊 表格总结
                    </label>
                    <label style="cursor:pointer; padding:4px 8px; border-radius:3px; font-size:11px; display:flex; align-items:center; transition:all 0.2s; opacity:0.6;" id="tab-label-chat">
                        <input type="radio" name="pmt-sum-type" value="chat" style="display:none;">
                        💬 聊天总结
                    </label>
                </div>
            </div>
            
            <textarea id="pmt-summary" style="width:100%; height:120px; padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:12px; font-family:monospace; resize:vertical; background:rgba(255,255,255,0.5); box-sizing: border-box;">${esc(tempTablePmt)}</textarea>
            <div style="font-size:10px; opacity:0.5; margin-top:4px; text-align:right;" id="pmt-desc">当前编辑：记忆表格数据的总结指令</div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 5px;">
            <button id="reset-pmt" style="flex:1; background:rgba(108, 117, 125, 0.8); font-size:12px; padding:10px; border-radius:6px;">🔄 恢复默认</button>
            <button id="save-pmt" style="flex:2; padding:10px; font-weight:bold; font-size:13px; border-radius:6px;">💾 保存设置</button>
        </div>
    </div>
    
    <style>
        .active-tab { background: ${UI.c}; color: #fff; opacity: 1 !important; font-weight: bold; }
    </style>`;

    pop('📝 提示词管理', h, true);
    
    setTimeout(() => {
        // 位置逻辑
        $('#pmt-table-pos-type').on('change', function() {
            if ($(this).val() === 'chat') {
                $('#pmt-table-depth-container').css('display', 'block').hide().fadeIn(200);
            } else {
                $('#pmt-table-depth-container').fadeOut(200);
            }
        });

        // ✨✨✨ 核心逻辑：切换提示词标签 ✨✨✨
        $('input[name="pmt-sum-type"]').on('change', function() {
            const type = $(this).val();
            const currentVal = $('#pmt-summary').val();

            // 1. 先保存当前文本框的内容到变量
            if (type === 'chat') {
                // 刚切到chat，说明刚才在table
                tempTablePmt = currentVal;
                $('#pmt-summary').val(tempChatPmt);
                
                // UI更新
                $('#tab-label-table').removeClass('active-tab').css('opacity', '0.6');
                $('#tab-label-chat').addClass('active-tab').css('opacity', '1');
                $('#pmt-desc').text('当前编辑：聊天历史记录的总结指令');
            } else {
                // 刚切到table，说明刚才在chat
                tempChatPmt = currentVal;
                $('#pmt-summary').val(tempTablePmt);
                
                // UI更新
                $('#tab-label-chat').removeClass('active-tab').css('opacity', '0.6');
                $('#tab-label-table').addClass('active-tab').css('opacity', '1');
                $('#pmt-desc').text('当前编辑：记忆表格数据的总结指令');
            }
        });

        // 文本框失去焦点时也同步一下变量，防止直接点保存
        $('#pmt-summary').on('input blur', function() {
            const type = $('input[name="pmt-sum-type"]:checked').val();
            if (type === 'table') tempTablePmt = $(this).val();
            else tempChatPmt = $(this).val();
        });

        // 保存按钮
        $('#save-pmt').on('click', async function() {
            // 确保当前框里的内容已存入变量
            $('#pmt-summary').trigger('blur');

            PROMPTS.tablePrompt = $('#pmt-table').val();
            PROMPTS.tablePromptPos = $('#pmt-table-pos').val();
            PROMPTS.tablePromptPosType = $('#pmt-table-pos-type').val();
            PROMPTS.tablePromptDepth = parseInt($('#pmt-table-depth').val()) || 0;
            
            // ✨ 保存两个不同的总结提示词
            PROMPTS.summaryPromptTable = tempTablePmt;
            PROMPTS.summaryPromptChat = tempChatPmt;
            
            // 移除旧的单字段，防止混淆
            delete PROMPTS.summaryPrompt;

            PROMPTS.promptVersion = PROMPT_VERSION;
            
            try { localStorage.setItem(PK, JSON.stringify(PROMPTS)); } catch (e) {}
            await customAlert('提示词配置已保存', '成功');
        });

        // 恢复默认按钮
        $('#reset-pmt').on('click', async function() {
            if (!await customConfirm('确定要恢复所有默认提示词吗？', '确认')) return;
            
            // 恢复默认
            $('#pmt-table-pos').val('system');
            $('#pmt-table-pos-type').val('system_end');
            $('#pmt-table-depth').val(0);
            $('#pmt-table-depth-container').hide();
            
            // 重置变量为初始默认值 (需要硬编码一下默认值，或者重新刷新页面生效)
            // 这里为了体验，简单重置一下文本
            tempTablePmt = "请将以下表格数据总结成简洁的文字描述..."; // 简化，实际应复制完整默认值
            tempChatPmt = "请总结以下聊天记录中的核心剧情脉络...";
            
            // 触发一次切换来刷新界面
            $('input[name="pmt-sum-type"]:checked').trigger('change');
            
            await customAlert('已恢复默认，请点击保存生效。\n(建议保存后刷新页面以加载完整默认文本)', '提示');
        });
    }, 100);
}
    
function shcf() {
    const ctx = m.ctx();
    const totalCount = ctx && ctx.chat ? ctx.chat.length : 0;
    
    // 智能归零逻辑
    if (API_CONFIG.lastSummaryIndex === undefined || API_CONFIG.lastSummaryIndex > totalCount) {
        API_CONFIG.lastSummaryIndex = 0;
        try { localStorage.setItem(AK, JSON.stringify(API_CONFIG)); } catch (e) {}
    }
    
    const lastIndex = API_CONFIG.lastSummaryIndex;

    const h = `<div class="g-p" style="display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin:0 0 4px 0;">⚙️ 插件配置</h4>
        
        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 600;">💡 记忆开关</label>
                <input type="checkbox" id="c-enabled" ${C.enabled ? 'checked' : ''} style="transform: scale(1.2);">
            </div>
            <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.05); margin: 5px 0 8px 0;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 600;" title="保留人设(#0)，切除中间旧对话，节省Token">✂️ 隐藏楼层</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; opacity: 0.7;">留最近</span>
                    <input type="number" id="c-limit-count" value="${C.contextLimitCount}" min="5" style="width: 40px; padding: 2px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                    <input type="checkbox" id="c-limit-on" ${C.contextLimit ? 'checked' : ''} style="transform: scale(1.2);">
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-weight: 600;" title="页面上只显示最近N条，减少卡顿">👁️ 楼层折叠</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; opacity: 0.7;">显最近</span>
                    <input type="number" id="c-uifold-count" value="${C.uiFoldCount || 50}" min="10" style="width: 40px; padding: 2px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                    <input type="checkbox" id="c-uifold-on" ${C.uiFold ? 'checked' : ''} style="transform: scale(1.2);">
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:8px;">
                <label style="font-weight: 600;">🤖 自动总结</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; opacity: 0.7;">每</span>
                    <input type="number" id="c-auto-floor" value="${C.autoSummaryFloor}" min="10" style="width: 40px; padding: 2px; text-align: center; border-radius: 4px; border: 1px solid rgba(0,0,0,0.2);">
                    <span style="font-size: 11px; opacity: 0.7;">层</span>
                    <input type="checkbox" id="c-auto-sum" ${C.autoSummary ? 'checked' : ''} style="transform: scale(1.2);">
                </div>
            </div>
            <div style="display:flex; gap:12px; padding:8px 0; border-top:1px dashed rgba(255,255,255,0.2); border-bottom:1px dashed rgba(255,255,255,0.2); margin-bottom:10px;">
                <label style="font-size:11px; display:flex; align-items:center; cursor:pointer; opacity:0.9;">
                    <input type="radio" name="cfg-sum-src" value="table" ${API_CONFIG.summarySource === 'table' ? 'checked' : ''} style="margin-right:4px;"> 
                    📊 仅表格
                </label>
                <label style="font-size:11px; display:flex; align-items:center; cursor:pointer; opacity:0.9;">
                    <input type="radio" name="cfg-sum-src" value="chat" ${API_CONFIG.summarySource === 'chat' ? 'checked' : ''} style="margin-right:4px;"> 
                    💬 聊天历史
                </label>
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
                    <span id="reset-range-btn" style="cursor:pointer; text-decoration:underline;">重置进度</span>
                    <span id="reset-done-icon" style="display:none; color:green; margin-left:4px;">✔</span>
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
            <button id="open-api" style="flex:1; font-size:11px; padding:8px;">🤖 API配置</button>
            <button id="open-pmt" style="flex:1; font-size:11px; padding:8px;">📝 提示词</button>
        </div>
        <button id="save-cfg" style="width: 100%; padding: 8px; margin-top: 4px; font-weight: bold;">💾 保存配置</button>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1); text-align: center;">
            <button id="rescue-btn" style="background: transparent; color: #dc3545; border: 1px dashed #dc3545; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; width: 100%;">
                🚑 扫描并恢复丢失的旧数据
            </button>
            <p style="font-size: 10px; color: #999; margin: 5px 0 0 0;">如果更新后表格变空，点此按钮尝试找回。</p>
        </div>
    </div>`;
    
    pop('⚙️ 配置', h, true);
    
    setTimeout(() => {
        $('#c-table-pos-type').on('change', function() {
            if ($(this).val() === 'chat') $('#c-table-depth-container').slideDown(200);
            else $('#c-table-depth-container').slideUp(200);
        });
        
        $('#reset-range-btn').on('click', function() {
            $('#man-start').val(0);
            $('#man-end').val(totalCount);
            API_CONFIG.lastSummaryIndex = 0;
            try { localStorage.setItem(AK, JSON.stringify(API_CONFIG)); } catch (e) {}
            $('#reset-done-icon').fadeIn().delay(1000).fadeOut();
        });

        $('#manual-sum-btn').on('click', async function() {
            const start = parseInt($('#man-start').val());
            const end = parseInt($('#man-end').val());
            if (isNaN(start) || isNaN(end)) { await customAlert('请输入有效的数字', '错误'); return; }
            API_CONFIG.summarySource = $('input[name="cfg-sum-src"]:checked').val();
            const btn = $(this); const oldText = btn.text(); btn.text('⏳').prop('disabled', true);
            setTimeout(async () => {
                await callAIForSummary(start, end);
                btn.text(oldText).prop('disabled', false);
                localStorage.setItem(AK, JSON.stringify(API_CONFIG));
            }, 200);
        });

        // ✨✨✨ 新增：灾难恢复逻辑 ✨✨✨
        $('#rescue-btn').on('click', async function() {
            const btn = $(this);
            btn.text('正在深度扫描数据库...');
            
            // 1. 扫描 LocalStorage
            let bestCandidate = null;
            let maxRows = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('gg_data_')) {
                    try {
                        const raw = localStorage.getItem(key);
                        const d = JSON.parse(raw);
                        // 统计数据量
                        let count = 0;
                        if (d.d) count = d.d.reduce((sum, sheet) => sum + (sheet.r ? sheet.r.length : 0), 0);
                        
                        // 排除空档和当前正在使用的档(简单判断)
                        if (count > 0 && count > maxRows) {
                            maxRows = count;
                            bestCandidate = { key, count, ts: d.ts };
                        }
                    } catch(e) {}
                }
            }
            
            // 2. 结果判断
            if (bestCandidate) {
                const dateStr = new Date(bestCandidate.ts).toLocaleString();
                const msg = `🔍 找到一份可能的数据备份！\n\n` + 
                            `📅 时间：${dateStr}\n` + 
                            `📊 数据量：${bestCandidate.count} 行\n\n` + 
                            `是否立即恢复此数据？(当前数据将被覆盖)`;
                
                if (await customConfirm(msg, '发现备份')) {
                    const raw = localStorage.getItem(bestCandidate.key);
                    const data = JSON.parse(raw);
                    m.s.forEach((sheet, i) => { if (data.d[i]) sheet.from(data.d[i]); });
                    if (data.summarized) summarizedRows = data.summarized;
                    
                    // 强制保存并刷新
                    lastManualEditTime = Date.now();
                    m.save();
                    shw(); 
                    await customAlert('✅ 数据已成功恢复！', '成功');
                    $('#g-pop').remove(); // 关闭配置窗口
                    shw(); // 重新打开主界面
                } else {
                    btn.text('🚑 扫描并恢复丢失的旧数据');
                }
            } else {
                await customAlert('❌ 未扫描到有价值的历史存档。\n\n请尝试使用酒馆自带的【管理聊天 -> 恢复备份】功能。', '未找到');
                btn.text('🚑 扫描并恢复丢失的旧数据');
            }
        });

        $('#save-cfg').on('click', async function() {
            const oldPc = C.pc;
            C.enabled = $('#c-enabled').is(':checked');
            C.uiFold = $('#c-uifold-on').is(':checked');
            C.uiFoldCount = parseInt($('#c-uifold-count').val()) || 50;
            C.contextLimit = $('#c-limit-on').is(':checked');
            C.contextLimitCount = parseInt($('#c-limit-count').val()) || 30;
            C.tableInj = $('#c-table-inj').is(':checked');
            C.tablePos = $('#c-table-pos').val();
            C.tablePosType = $('#c-table-pos-type').val();
            C.tableDepth = parseInt($('#c-table-depth').val()) || 0;
            C.autoSummary = $('#c-auto-sum').is(':checked');
            C.autoSummaryFloor = parseInt($('#c-auto-floor').val()) || 50;
            API_CONFIG.summarySource = $('input[name="cfg-sum-src"]:checked').val();
            try { localStorage.setItem(AK, JSON.stringify(API_CONFIG)); } catch (e) {}
            C.log = $('#c-log').is(':checked');
            C.pc = $('#c-pc').is(':checked');
            C.hideTag = $('#c-hide').is(':checked');
            C.filterHistory = $('#c-filter').is(':checked');
            try { localStorage.setItem(CK, JSON.stringify(C)); } catch (e) {}

            // ✨✨✨ 保存后立即刷新显示状态 ✨✨✨
            applyUiFold();
            
            if (!C.enabled) await customAlert('插件已禁用', '状态');
            else await customAlert('配置已保存', '成功');

            if (oldPc !== C.pc) {
                console.log('🔄 检测到存储模式变更，正在重新加载数据...');
                m.load(); 
                shw();
            }
        });
        
        $('#open-api').on('click', () => navTo('AI总结配置', shapi));
        $('#open-pmt').on('click', () => navTo('提示词管理', shpmt));
    }, 100);
}
    
    function esc(t) { const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(t).replace(/[&<>"']/g, c => mp[c]); }
    
function omsg(id) {
    // ❌ 删除旧的全局拦截： if (!C.enabled) return;
    // 我们把拦截下放到“记录逻辑”内部，不再拦截“总结逻辑”
    
    try {
        const x = m.ctx();
        if (!x || !x.chat) return;
        
        // 获取当前消息索引
        const i = typeof id === 'number' ? id : x.chat.length - 1;
        const mg = x.chat[i];
        
        // 基础检查：如果消息不存在或者是用户的，跳过
        if (!mg || mg.is_user) return;
        
        const msgKey = i.toString();
        
        // 防止重复处理
        if (processedMessages.has(msgKey)) return;

        // ============================================================
        // 模块 A：表格记录与快照 (受记忆开关 C.enabled 控制)
        // ============================================================
        if (C.enabled) {
            // 1. 解析并执行指令
            const swipeId = mg.swipe_id ?? 0;
            const tx = mg.mes || mg.swipes?.[swipeId] || '';
            const cs = prs(tx);
            
            if (cs.length > 0) {
                exe(cs); 
                m.save(); 
            }
            
            // 2. 建立快照
            const snapshot = {
                data: m.s.slice(0, 8).map(sh => JSON.parse(JSON.stringify(sh.json()))),
                summarized: JSON.parse(JSON.stringify(summarizedRows)),
                timestamp: Date.now()
            };
            
            snapshotHistory[msgKey] = snapshot;
            console.log(`📸 [存档] 消息 ${i} 处理完毕`);
            
            processedMessages.add(msgKey);
            cleanOldSnapshots();
        } else {
            // 如果开关关了，我们依然把这个消息标记为“已看”，防止打开开关后重复处理旧消息
            processedMessages.add(msgKey);
        }
        
        // ============================================================
        // 模块 B：自动总结逻辑 (✨不受开关限制，始终运行✨)
        // ============================================================
        if (C.autoSummary) {
            const lastIndex = API_CONFIG.lastSummaryIndex || 0;
            const currentCount = x.chat.length;
            const newMsgCount = currentCount - lastIndex;
            
            // 只有当新增楼层数达标时才触发
            if (newMsgCount >= C.autoSummaryFloor) {
                console.log(`🤖 [自动总结] 触发: 上次总结于${lastIndex}层，新增${newMsgCount}条 (阈值${C.autoSummaryFloor})`);
                // 即使 C.enabled 为 false，只要开启了自动总结，这里依然会执行
                callAIForSummary();
            }
        }
        
        // 隐藏标签 (始终运行，保持界面整洁)
        setTimeout(hideMemoryTags, 100);
        setTimeout(applyUiFold, 200);
        
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
        setTimeout(applyUiFold, 600);
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
        
        // ❌ 删除这一行： if (!C.enabled) return; 
        // 原因：即使记忆开关关了，我们也需要进入 inj 函数去执行“过滤历史标签”的操作，
        // 否则 AI 会看到一堆未清洗的 <Memory> 代码。
        
        // 隐藏楼层逻辑 (受 C.contextLimit 控制，与 C.enabled 无关)
        if (C.contextLimit) {
            ev.chat = applyContextLimit(ev.chat);
        }
        
        isRegenerating = false; // 重置标记

        // 打印日志
        if (C.enabled) {
            console.log(`📤 [发送] 发送给AI的表格状态:`, m.s.slice(0, 8).map(s => `${s.n}:${s.r.length}行`).join(', '));
        } else {
            console.log(`⚠️ [发送] 记忆开关已关闭，将仅执行清洗/只读操作`);
        }

        // 进入注入流程 (内部已做好分流：关了就不发提示词，但会过滤标签)
        inj(ev); 
        
    } catch (e) { 
        console.error('❌ opmt 失败:', e); 
    } 
}

// ✨✨✨ 新功能：UI 折叠逻辑 (双按钮完美版) ✨✨✨
    function applyUiFold() {
        // 1. 基础检查：开关是否开启
        if (!C.uiFold) {
            $('#g-fold-controls').remove(); // 移除旧控件
            $('.mes').show(); // 恢复显示所有
            return;
        }

        const $chat = $('#chat');
        if ($chat.length === 0) return;

        // 2. 获取状态数据
        // 只获取非插件产生的消息（排除隐藏标签等）
        const $allMsgs = $chat.find('.mes:not(.g-hidden-tag)');
        const total = $allMsgs.length;
        const keep = C.uiFoldCount || 50; // 用户设置的保留数（例如 10）
        const BATCH_SIZE = 10; // 每次加载数
        
        // 如果总数都没超过保留数，说明不需要折叠，直接退出
        if (total <= keep) {
            $('#g-fold-controls').remove();
            $allMsgs.show();
            return;
        }

        // 3. 计算当前可见性
        const $hidden = $allMsgs.filter(':hidden');
        const $visible = $allMsgs.filter(':visible');
        
        // 初始化：如果刚刷新页面，一条隐藏的都没有，说明还没执行过折叠
        // 此时强制执行初始折叠
        if ($hidden.length === 0 && $visible.length === total) {
            const hideCount = total - keep;
            $allMsgs.slice(0, hideCount).hide();
            
            // 重新递归调用一次以渲染按钮，确保状态正确
            // 使用 setTimeout 避免递归栈溢出
            return setTimeout(applyUiFold, 0);
        }
        
        // 重新获取最新的隐藏/显示状态
        const hiddenCount = $allMsgs.filter(':hidden').length;
        const visibleCount = $allMsgs.filter(':visible').length;

        // 4. 构建控制条容器
        // 我们先移除旧的，重新根据状态画一个新的，这样最不容易出错
        $('#g-fold-controls').remove();
        $('#g-load-more').remove(); // 移除旧版按钮（如果有残留）

        const $container = $('<div>', {
            id: 'g-fold-controls',
            css: {
                'display': 'flex', 'justify-content': 'center', 'gap': '8px',
                'margin': '10px auto', 'width': '92%', 'max-width': '600px',
                'user-select': 'none', 'z-index': '5'
            }
        });

        // === 按钮 A：加载更多 (只有当有隐藏消息时显示) ===
        if (hiddenCount > 0) {
            const loadCount = Math.min(hiddenCount, BATCH_SIZE);
            const $loadBtn = $('<div>', {
                html: `<i class="fa-solid fa-arrow-down"></i> 加载 <b>${loadCount}</b> 条 (剩${hiddenCount})`,
                title: '点击向上加载更多历史记录',
                css: {
                    'flex': '1', 'padding': '8px', 'text-align': 'center',
                    'background': 'rgba(0,0,0,0.05)', 'border-radius': '8px',
                    'cursor': 'pointer', 'font-size': '12px', 'color': UI.tc || '#888',
                    'border': '1px dashed rgba(0,0,0,0.15)', 'transition': 'all 0.2s'
                }
            }).hover(
                function() { $(this).css('background', 'rgba(0,0,0,0.1)'); },
                function() { $(this).css('background', 'rgba(0,0,0,0.05)'); }
            ).on('click', function() {
                // 找到隐藏的消息，取出最后 BATCH_SIZE 条显示
                const $toShow = $allMsgs.filter(':hidden').slice(-BATCH_SIZE);
                $toShow.css('opacity', 0).show().animate({ opacity: 1 }, 200);
                
                // 重新计算UI
                setTimeout(applyUiFold, 10);
            });
            $container.append($loadBtn);
        }

        // === 按钮 B：一键折叠 (只有当显示的条数 > 保留数时显示) ===
        if (visibleCount > keep) {
            const foldCount = visibleCount - keep;
            const $foldBtn = $('<div>', {
                html: `<i class="fa-solid fa-compress"></i> 折叠 ${foldCount} 条`,
                title: `一键收起，只保留最近 ${keep} 条`,
                css: {
                    'flex': '0 0 auto', 'padding': '8px 12px', 'text-align': 'center',
                    // 稍微带点红色警告色，区分功能
                    'background': 'rgba(255, 100, 100, 0.08)', 
                    'border-radius': '8px',
                    'cursor': 'pointer', 'font-size': '12px', 'color': '#e74c3c',
                    'border': '1px dashed rgba(231, 76, 60, 0.3)', 'transition': 'all 0.2s'
                }
            }).hover(
                function() { $(this).css('background', 'rgba(255, 100, 100, 0.15)'); },
                function() { $(this).css('background', 'rgba(255, 100, 100, 0.08)'); }
            ).on('click', function() {
                // 找到显示的消息，把超出的部分（也就是最上面的 foldCount 条）隐藏
                const $toHide = $allMsgs.filter(':visible').slice(0, foldCount);
                $toHide.hide();
                
                // 重新计算UI
                setTimeout(applyUiFold, 10);
            });
            $container.append($foldBtn);
        }

        // 5. 插入到页面正确位置
        // 永远插入到“当前第一条可见消息”的上面
        const $firstVisible = $allMsgs.filter(':visible').first();
        if ($firstVisible.length > 0) {
            $firstVisible.before($container);
        } else {
            // 理论上不会发生（除非keep设为0），兜底
            $chat.prepend($container);
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
    // ✨✨✨ 核心修复：加载插件配置 (找回 enabled, pc 等设置) ✨✨✨
    try { 
        const cv = localStorage.getItem(CK); 
        if (cv) {
            const savedC = JSON.parse(cv);
            // 合并保存的配置到 C 对象，但保留新版本可能新增的字段默认值
            Object.keys(savedC).forEach(k => {
                if (C.hasOwnProperty(k)) C[k] = savedC[k];
            });
        }
    } catch (e) { console.error('配置加载失败', e); }
    
    try { 
        const pv = localStorage.getItem(PK); 
        if (pv) {
            const savedPrompts = JSON.parse(pv);
            
            // ✨✨✨ 核心修改：版本检测逻辑 ✨✨✨
            if (savedPrompts.promptVersion !== PROMPT_VERSION) {
                console.log(`♻️ 检测到提示词版本升级 (v${savedPrompts.promptVersion} -> v${PROMPT_VERSION})，已应用新版提示词`);
                // 版本不同，强制使用代码里的新提示词 (PROMPTS)，忽略本地旧的
                // 但保留位置设置，以免用户还要重新设置位置
                if (savedPrompts.tablePromptPos) PROMPTS.tablePromptPos = savedPrompts.tablePromptPos;
                if (savedPrompts.tablePromptPosType) PROMPTS.tablePromptPosType = savedPrompts.tablePromptPosType;
                if (savedPrompts.tablePromptDepth) PROMPTS.tablePromptDepth = savedPrompts.tablePromptDepth;
                
                // 更新版本号并保存
                PROMPTS.promptVersion = PROMPT_VERSION;
                localStorage.setItem(PK, JSON.stringify(PROMPTS));
            } else {
                // 版本相同，才使用本地存储的设置 (防止覆盖用户修改)
                PROMPTS = { ...PROMPTS, ...savedPrompts };
            }
        } else {
            // 第一次加载
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

// ✨✨✨ 重写：关于页 & 更新检查 & 首次弹窗 ✨✨✨
    function showAbout(isAutoPopup = false) {
        const cleanVer = V.replace(/^v+/i, '');
        const repoUrl = `https://github.com/${REPO_PATH}`;
        
        // 检查是否已经勾选过“不再显示”
        const isChecked = localStorage.getItem('gg_notice_ver') === V;
        
        const h = `
        <div class="g-p" style="display:flex; flex-direction:column; gap:15px; height:100%;">
            <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:8px; padding:15px; text-align:center;">
                <div style="font-size:18px; font-weight:bold; margin-bottom:5px; color:${UI.tc};">
                    📘 记忆表格 (Memory Context)
                </div>
                <div style="font-size:12px; opacity:0.8; margin-bottom:10px; color:${UI.tc};">当前版本: v${cleanVer}</div>
                
                <div id="update-status" style="background:rgba(0,0,0,0.05); padding:8px; border-radius:4px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> 正在连接 GitHub 检查更新...
                </div>
                
                <a href="${repoUrl}" target="_blank" style="display:inline-block; margin-top:10px; text-decoration:none; color:${UI.c}; font-weight:bold; font-size:12px; border-bottom:1px dashed ${UI.c};">
                    <i class="fa-brands fa-github"></i> 访问 GitHub 项目主页
                </a>
            </div>

            <div style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.4); border-radius:8px; padding:15px; font-size:13px; line-height:1.6; border:1px solid rgba(255,255,255,0.3);">
                <h4 style="margin-top:0;">📖 快速指南</h4>
                <ul style="padding-left:18px; margin:5px 0;">
                    <li><strong>核心功能：</strong> 自动整理对话中的剧情、人物、物品等信息，生成结构化表格及隐藏楼层功能。</li>
                    <li><strong>记忆开关：</strong> 开启时自动记录并发送表格内容；关闭时仅发送已有的总结内容（只读模式）。</li>
                    <li><strong>总结功能：</strong> 记忆开关是不影响总结功能，支持自动和手动总结、支持由“记忆表格数据”或“聊天记录”总结。</li>
                    <li><strong>其他功能：</strong> 总结功能支持单独API配置；支持一键导入/导出备份。</li>
                    <li><strong>其他操作：</strong> 长按单元格支持编辑内容、可自定义提示词、支持拖拽列宽。</li>
                </ul>
                
                <h4 style="margin-top:15px;">⚠️ 注意事项</h4>
                <ul style="padding-left:18px; margin:5px 0;">
                    <li>可在 <strong>配置 -> AI配置</strong> 中填写独立的 API Key 以获得最佳总结体验。</li>
                    <li>如果表格内容混乱，可点击“配置 -> 提示词 -> 恢复默认”重置逻辑。</li>
                </ul>
            </div>

            <div style="padding-top:10px; border-top:1px solid rgba(255,255,255,0.2); text-align:right;">
                <label style="font-size:12px; cursor:pointer; user-select:none; display:inline-flex; align-items:center; gap:6px; color:${UI.tc}; opacity:0.9;">
                    <input type="checkbox" id="dont-show-again" ${isChecked ? 'checked' : ''}>
                    不再自动弹出 v${cleanVer} 版本说明
                </label>
            </div>
        </div>`;
        
        // 使用独立ID，避免覆盖主表格
        $('#g-about-pop').remove();
        const $o = $('<div>', { id: 'g-about-pop', class: 'g-ov', css: { 'z-index': '10000002' } });
        const $p = $('<div>', { class: 'g-w', css: { width: '500px', maxWidth: '90vw', height: '600px', maxHeight:'80vh' } });
        const $hd = $('<div>', { class: 'g-hd' });
        
        // 如果是自动弹出的，显示欢迎标题；如果是手动点的，显示关于
        const titleText = isAutoPopup ? '🎉 欢迎使用新版本' : '关于 & 更新';
        $hd.append(`<h3 style="color:${UI.tc}; flex:1;">${titleText}</h3>`);
        
        // 关闭按钮
        const $x = $('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: UI.tc, cursor: 'pointer', fontSize: '22px' } }).on('click', () => $o.remove());
        $hd.append($x);
        
        const $bd = $('<div>', { class: 'g-bd', html: h });
        $p.append($hd, $bd);
        $o.append($p);
        $('body').append($o);
        
        // 绑定逻辑
        setTimeout(() => {
            // 监听复选框变化
            $('#dont-show-again').on('change', function() {
                if ($(this).is(':checked')) {
                    localStorage.setItem('gg_notice_ver', V); // 记住当前版本已读
                } else {
                    localStorage.removeItem('gg_notice_ver'); // 忘记
                }
            });

            // 立即执行更新检查
            checkForUpdates(cleanVer);
        }, 100);
        
        // 点击遮罩关闭
        $o.on('click', e => { if (e.target === $o[0]) $o.remove(); });
    }

    // ✨✨✨ 修复：正确的函数定义语法 ✨✨✨
    async function checkForUpdates(currentVer) {
        // 1. 获取UI元素
        const $status = $('#update-status'); // 说明页里的状态文字
        const $icon = $('#g-about-btn');     // 标题栏的图标
        
        try {
            // 2. 从 GitHub Raw 读取 main 分支的 index.js
            const rawUrl = `https://raw.githubusercontent.com/${REPO_PATH}/main/index.js`;
            const response = await fetch(rawUrl, { cache: "no-store" });
            
            if (!response.ok) throw new Error('无法连接 GitHub');
            
            const text = await response.text();
            const match = text.match(/const\s+V\s*=\s*['"]v?([\d\.]+)['"]/);
            
            if (match && match[1]) {
                const latestVer = match[1];
                const hasUpdate = compareVersions(latestVer, currentVer) > 0;
                
                if (hasUpdate) {
                    // ✨✨✨ 发现新版本：点亮图标 ✨✨✨
                    $icon.addClass('g-has-update').attr('title', `🚀 发现新版本: v${latestVer} (点击查看)`);
                    
                    // 如果说明页正打开着，也更新里面的文字
                    if ($status.length > 0) {
                        $status.html(`
                            <div style="color:#d32f2f; font-weight:bold;">
                                <i class="fa-solid fa-circle-up"></i> 发现新版本: v${latestVer}
                            </div>
                            <a href="https://github.com/${REPO_PATH}/releases" target="_blank" style="background:#d32f2f; color:#fff; padding:2px 8px; border-radius:4px; text-decoration:none; margin-left:5px;">去更新</a>
                        `);
                    }
                } else {
                    // 没有新版本
                    $icon.removeClass('g-has-update').attr('title', '使用说明 & 检查更新'); // 移除红点
                    
                    if ($status.length > 0) {
                        $status.html(`<div style="color:#28a745; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> 当前已是最新版本</div>`);
                    }
                }
            }
        } catch (e) {
            console.warn('自动更新检查失败:', e);
            if ($status.length > 0) {
                $status.html(`<div style="color:#ff9800;"><i class="fa-solid fa-triangle-exclamation"></i> 检查失败: ${e.message}</div>`);
            }
        }
    }

    // 版本号比较辅助函数 (1.2.0 > 1.1.9)
    // ✨✨✨ 修复：加上 function 关键字 ✨✨✨
    function compareVersions(v1, v2) {
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    }
})();















