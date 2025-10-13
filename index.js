// 记忆表格 v0.8.0 - 自动云同步版
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v0.8.0 启动');
    
    const V = '0.8.0';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
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

【时间格式】
古代: x年x月x日·辰时(07:30)
现代: x年x月x日·上午(08:30)
日期格式: x年x月x日

【主线剧情特殊规则】
- 以日期为单位记录，同一天的事件更新在同一行
- 日期列格式：x年x月x日
- 事件概要中必须包含地点信息（格式：在XX地点，发生XX事件）
- 同一天内的多个事件用分号连接在事件概要中
- 跨天事件：先更新当天内容，第二天新增一行
- 开始时间/完结时间记录具体时刻（可选填）

【使用示例】

新增主线（新的一天）:
<GaigaiMemory><!-- insertRow(0, {0: "2024年3月15日", 1: "上午(08:30)", 2: "", 3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石", 4: "进行中"})--></GaigaiMemory>

更新主线（同一天新事件）:
<GaigaiMemory><!-- updateRow(0, 0, {3: "在村庄接受长老委托，前往迷雾森林寻找失落宝石；在迷雾森林遭遇神秘商人艾莉娅，获得线索：宝石在古神殿深处"})--></GaigaiMemory>

跨天处理（完结前一天，开始新一天）:
<GaigaiMemory><!-- updateRow(0, 0, {2: "深夜(23:50)", 4: "暂停"})
insertRow(0, {0: "2024年3月16日", 1: "凌晨(00:10)", 2: "", 3: "在古神殿继续探索", 4: "进行中"})--></GaigaiMemory>

新增支线:
<GaigaiMemory><!-- insertRow(1, {0: "进行中", 1: "艾莉娅的委托", 2: "2024年3月15日·下午(14:00)", 3: "", 4: "艾莉娅请求帮忙寻找失散的妹妹", 5: "艾莉娅"})--></GaigaiMemory>

新增人物:
<GaigaiMemory><!-- insertRow(3, {0: "艾莉娅", 1: "23", 2: "神秘商人", 3: "迷雾森林", 4: "神秘冷静，知识渊博", 5: "有一个失散的妹妹，擅长占卜"})--></GaigaiMemory>

新增人物关系:
<GaigaiMemory><!-- insertRow(4, {0: "{{user}}", 1: "艾莉娅", 2: "委托人与受托者", 3: "中立友好，略带神秘感"})--></GaigaiMemory>

新增约定:
<GaigaiMemory><!-- insertRow(7, {0: "2024年3月18日前", 1: "找到失落宝石交给长老", 2: "长老"})--></GaigaiMemory>

【记录规则】
- 主线: 按日期记录，事件概要中必须写明地点，同一天事件用分号连接
- 支线: 仅记录NPC相关情节，状态必须明确（进行中/已完成/已失败）
- 角色状态: 仅记录死亡/囚禁/残废等重大变化
- 人物档案: 仅记录世界书中不存在的新角色，备注可记录背景/特征/能力等
- 人物关系: 仅记录决定性转换，情感态度描述双方情绪和氛围
- 世界设定: 仅记录世界书中不存在的新设定
- 物品追踪: 仅记录剧情关键物品
- 约定: 记录重要约定和承诺，注明时限和相关角色

【强制要求】
1. 必须使用<GaigaiMemory>标签
2. 指令必须用<!-- -->包裹
3. 列索引从0开始: {0: "值", 1: "值"}
4. 同日事件用分号连接
5. 全部使用过去式，客观描述
6. 主线事件概要必须包含地点信息

禁止使用表格格式、禁止使用JSON格式、禁止使用<memory>标签。`,
        tablePromptPos: 'system',
        tablePromptPosType: 'absolute',
        tablePromptDepth: 0,
        
        summaryPrompt: `你是一个专业的记忆整理助手。请将以下各个表格的数据进行精炼总结。

【总结要求】
1. **分表总结**：为每个有数据的表格生成一条独立总结
2. **格式规范**：使用"• 表格名：总结内容"的格式，每条总结独占一行
3. **内容精炼**：每条总结控制在80-150字，保留关键信息
4. **时间线索**：涉及时间的事件必须注明时间点
5. **人物关联**：人物相关信息要注明关系和状态
6. **客观描述**：使用过去式，客观陈述事实

【输出格式示例】
• 主线剧情：2024年3月15日，在村庄接受长老委托前往迷雾森林寻找失落宝石；途中遭遇神秘商人艾莉娅，获得线索指向古神殿深处。当前任务进行中。
• 支线追踪：艾莉娅的委托进行中，需要帮忙寻找她失散的妹妹，开始时间3月15日下午14:00。
• 人物档案：新认识艾莉娅（23岁），神秘商人，常驻迷雾森林，性格神秘冷静，知识渊博，擅长占卜，有一个失散的妹妹。
• 人物关系：与艾莉娅建立委托关系，当前关系为中立友好，略带神秘感。
• 约定：需在2024年3月18日前找到失落宝石交给长老。

【注意事项】
- 只总结有数据的表格，空表格跳过
- 相同类型的多条记录要合并概述
- 保留数字、时间、地点等关键要素
- 不要添加推测或评价，只陈述事实

请严格按照以上要求生成总结。`,
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
        { n: '记忆总结', c: ['表格类型', '总结内容', '生成时间'] }
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
        8: { '生成时间': 140 }
    };
    
    let userColWidths = {};
    let summarizedRows = {};
    
    let pageStack = [];
    
    // ✅ 自定义弹窗函数
    function customAlert(message, title = '提示') {
        return new Promise((resolve) => {
            const id = 'custom-alert-' + Date.now();
            const $overlay = $('<div>', { 
                id: id,
                class: 'g-custom-dialog-overlay',
                css: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 10000000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }
            });
            
            const $dialog = $('<div>', {
                class: 'g-custom-dialog',
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
                class: 'g-custom-dialog-overlay',
                css: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 10000000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }
            });
            
            const $dialog = $('<div>', {
                class: 'g-custom-dialog',
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
            sumSheet.clear();
            if (typeof summaryData === 'string') {
                const lines = summaryData.split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    const match = line.match(/^[•\-\*]\s*(.+?)：(.+)$/);
                    if (match) {
                        sumSheet.ins({ 0: match[1].trim(), 1: match[2].trim(), 2: new Date().toLocaleString() });
                    } else if (line.trim()) {
                        sumSheet.ins({ 0: '综合', 1: line.trim(), 2: new Date().toLocaleString() });
                    }
                });
            } else if (Array.isArray(summaryData)) {
                summaryData.forEach(item => {
                    sumSheet.ins({ 0: item.type || '综合', 1: item.content || item, 2: new Date().toLocaleString() });
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
            return sumSheet.r.map(row => ({ type: row[0] || '综合', content: row[1] || '', time: row[2] || '' }));
        }
        clear() { const sumSheet = this.m.get(8); sumSheet.clear(); this.m.save(); }
        has() { const sumSheet = this.m.get(8); return sumSheet.r.length > 0 && sumSheet.r[0][1]; }
        getTime() { const sumSheet = this.m.get(8); if (sumSheet.r.length > 0) { return sumSheet.r[0][2] || ''; } return ''; }
    }
    
    class M {
        constructor() { this.s = []; this.id = null; T.forEach(tb => this.s.push(new S(tb.n, tb.c))); this.sm = new SM(this); }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        // ✅ 自动云同步保存
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
            
            // 本地存储
            try { 
                localStorage.setItem(`${SK}_${id}`, JSON.stringify(data)); 
                console.log('💾 本地保存成功');
            } catch (e) {
                console.error('❌ 本地保存失败:', e);
            }
            
            // ✅ 自动云同步
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chat_metadata) {
                        if (!ctx.chat_metadata.gaigai) ctx.chat_metadata.gaigai = {};
                        ctx.chat_metadata.gaigai.data = data;
                        ctx.chat_metadata.gaigai.version = V;
                        ctx.chat_metadata.gaigai.lastSync = new Date().toISOString();
                        
                        // 强制触发保存
                        if (typeof ctx.saveMetadata === 'function') {
                            ctx.saveMetadata();
                        }
                        if (typeof ctx.saveChat === 'function') {
                            ctx.saveChat();
                        }
                        
                        console.log('☁️ 自动云同步成功');
                    }
                } catch (e) { 
                    console.error('❌ 云同步失败:', e); 
                }
            }
        }
        
        // ✅ 自动云同步加载
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
            
            let loaded = false;
            
            // ✅ 优先从云端加载（自动同步）
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chat_metadata && ctx.chat_metadata.gaigai && ctx.chat_metadata.gaigai.data) {
                        const d = ctx.chat_metadata.gaigai.data;
                        d.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
                        if (d.summarized) summarizedRows = d.summarized;
                        if (d.ui) UI = { ...UI, ...d.ui };
                        if (d.colWidths) userColWidths = d.colWidths;
                        loaded = true;
                        const lastSync = ctx.chat_metadata.gaigai.lastSync || '未知';
                        console.log(`☁️ 从云端加载成功 (最后同步: ${lastSync})`);
                    }
                } catch (e) { 
                    console.warn('⚠️ 云端加载失败，使用本地:', e); 
                }
            }
            
            // 云端失败则从本地加载
            if (!loaded) {
                try {
                    const sv = localStorage.getItem(`${SK}_${id}`);
                    if (sv) {
                        const d = JSON.parse(sv);
                        d.d.forEach((sd, i) => { if (this.s[i]) this.s[i].from(sd); });
                        if (d.summarized) summarizedRows = d.summarized;
                        if (d.ui) UI = { ...UI, ...d.ui };
                        if (d.colWidths) userColWidths = d.colWidths;
                        console.log('💾 从本地加载成功');
                    }
                } catch (e) {
                    console.error('❌ 本地加载失败:', e);
                }
            }
        }
        
        gid() {
            try {
                const x = this.ctx();
                if (!x) {
                    console.warn('⚠️ 无法获取上下文');
                    return 'default';
                }
                
                const chatId = x.chat_metadata?.file_name || x.chatId || 'default_chat';
                
                if (C.pc) {
                    const charName = x.name2 || x.characterId || 'unknown_char';
                    return `${charName}_${chatId}`;
                }
                
                return chatId;
            } catch (e) { 
                console.error('❌ ID生成失败:', e);
                return 'default'; 
            }
        }
        
        ctx() { return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null; }
        
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
    
    const m = new M();    
    // 列宽管理函数
    function saveColWidths() {
        try {
            localStorage.setItem(CWK, JSON.stringify(userColWidths));
        } catch (e) {
            console.warn('⚠️ 保存列宽失败:', e);
        }
    }
    
    function loadColWidths() {
        try {
            const saved = localStorage.getItem(CWK);
            if (saved) {
                userColWidths = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('⚠️ 加载列宽失败:', e);
            userColWidths = {};
        }
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
        } catch (e) {
            console.warn('⚠️ 保存已总结标记失败:', e);
        }
    }
    
    function loadSummarizedRows() {
        try {
            const saved = localStorage.getItem(SMK);
            if (saved) {
                summarizedRows = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('⚠️ 加载已总结标记失败:', e);
            summarizedRows = {};
        }
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
        } catch (e) { console.warn('⚠️ 解析参数失败:', s, e); }
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
            if (cleanedCount > 0) console.log(`🧹 [FILTER] 已清理 ${cleanedCount} 条AI历史回复中的记忆标签`);
        }
        
        if (PROMPTS.tablePrompt) {
            const pmtPos = getInjectionPosition(PROMPTS.tablePromptPos, PROMPTS.tablePromptPosType, PROMPTS.tablePromptDepth, ev.chat.length);
            const role = getRoleByPosition(PROMPTS.tablePromptPos);
            ev.chat.splice(pmtPos, 0, { role, content: PROMPTS.tablePrompt });
            console.log(`📝 [TABLE PROMPT] 填表提示词已注入 (${PROMPTS.tablePromptPos}, ${PROMPTS.tablePromptPosType}, 深度${PROMPTS.tablePromptDepth}, 索引${pmtPos})`);
        }
        
        const tableData = m.pmt();
        if (!tableData) { console.log('ℹ️ [INJECT] 无表格数据，跳过注入'); return; }
        if (C.tableInj) {
            const dataPos = getInjectionPosition(C.tablePos, C.tablePosType, C.tableDepth, ev.chat.length);
            const role = getRoleByPosition(C.tablePos);
            ev.chat.splice(dataPos, 0, { role, content: tableData });
            console.log(`📊 [TABLE DATA] 表格数据已注入 (${C.tablePos}, ${C.tablePosType}, 深度${C.tableDepth}, 索引${dataPos})`);
        }
        console.log('%c✅ [INJECT SUCCESS]', 'color: green; font-weight: bold;');
        console.log(`📊 数据长度: ${tableData.length} 字符`);
        console.log(`📋 包含总结: ${m.sm.has() ? '是' : '否'}`);
        if (C.log) { console.log('%c📝 注入内容:', 'color: blue; font-weight: bold;'); console.log(tableData); }
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
            #g-btn { color: ${UI.c} !important; }
            #g-btn:hover { background-color: ${UI.c}33 !important; }
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
        pageStack = [shw];
        const ss = m.all();
        // ✅ 标签栏：支线追踪 → 支线剧情
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
    }
    
    function gtb(s, ti) {
        const v = ti === 0 ? '' : 'display:none;';
        let h = `<div class="g-tbc" data-i="${ti}" style="${v}"><div class="g-tbl-wrap"><table>`;
        h += '<thead class="g-sticky"><tr><th class="g-col-num"><input type="checkbox" class="g-select-all" data-ti="' + ti + '" style="cursor:pointer; display:block; margin:0 auto;"></th>';
        
        s.c.forEach((c, ci) => {
            const width = getColWidth(ti, c);
            const widthStyle = width ? `style="width:${width}px; min-width:${width}px; position:relative;"` : 'style="position:relative;"';
            h += `<th ${widthStyle} data-col="${ci}" data-col-name="${esc(c)}">
                ${esc(c)}
                <div class="g-resizer" data-ti="${ti}" data-ci="${ci}" data-col-name="${esc(c)}" style="position:absolute; right:0; top:0; width:5px; height:100%; cursor:col-resize; background:transparent; z-index:10;" title="拖拽调整列宽"></div>
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
                            <input type="checkbox" class="g-row-select" data-r="${ri}" style="cursor:pointer; margin-bottom:3px;">
                            <div>${ri}</div>
                        </div>
                    </td>`;
                s.c.forEach((c, ci) => { 
                    const val = rw[ci] || '';
                    const width = getColWidth(ti, c);
                    const widthStyle = width ? `style="width:${width}px; min-width:${width}px;"` : '';
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
        });
        
        $(document).off('change', '.g-select-all');
        $('#g-pop').on('change', '.g-select-all', function() {
            const checked = $(this).prop('checked');
            const $table = $(this).closest('table');
            $table.find('.g-row-select').prop('checked', checked);
            updateSelectedRows();
        });
        
        $(document).off('change', '.g-row-select');
        $('#g-pop').on('change', '.g-row-select', function(e) {
            e.stopPropagation();
            updateSelectedRows();
        });
        
        function updateSelectedRows() {
            selectedRows = [];
            $('.g-tbc:visible .g-row-select:checked').each(function() {
                selectedRows.push(parseInt($(this).data('r')));
            });
        }
        
        let isResizing = false;
        let currentResizer = null;
        let startX = 0;
        let startWidth = 0;
        let tableIndex = 0;
        let colIndex = 0;
        let colName = '';
        
        $(document).off('mousedown touchstart', '.g-resizer');
        $('#g-pop').on('mousedown touchstart', '.g-resizer', function(e) {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            currentResizer = $(this);
            tableIndex = parseInt(currentResizer.data('ti'));
            colIndex = parseInt(currentResizer.data('ci'));
            colName = currentResizer.data('col-name');
            
            const $th = currentResizer.closest('th');
            const clientX = e.type === 'touchstart' ? e.originalEvent.touches[0].pageX : e.pageX;
            startX = clientX;
            startWidth = $th.outerWidth();
            
            $('body').css('cursor', 'col-resize');
            currentResizer.css('background', UI.c);
        });
        
        $(document).off('mousemove.resizer touchmove.resizer').on('mousemove.resizer touchmove.resizer', function(e) {
            if (!isResizing) return;
            e.preventDefault();
            
            const clientX = e.type === 'touchmove' ? e.originalEvent.touches[0].pageX : e.pageX;
            const deltaX = clientX - startX;
            const newWidth = Math.max(50, startWidth + deltaX);
            
            const $table = currentResizer.closest('table');
            $table.find(`th[data-col="${colIndex}"], td[data-col="${colIndex}"]`).css({
                'width': newWidth + 'px',
                'min-width': newWidth + 'px'
            });
        });
        
        $(document).off('mouseup.resizer touchend.resizer').on('mouseup.resizer touchend.resizer', function(e) {
            if (!isResizing) return;
            isResizing = false;
            
            const clientX = e.type === 'touchend' ? (e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0].pageX : startX) : e.pageX;
            const deltaX = clientX - startX;
            const newWidth = Math.max(50, startWidth + deltaX);
            
            setColWidth(tableIndex, colName, newWidth);
            
            $('body').css('cursor', '');
            if (currentResizer) {
                currentResizer.css('background', '');
            }
            currentResizer = null;
            
            console.log(`✅ 列宽已保存: 表${tableIndex} - ${colName} = ${newWidth}px`);
        });
        
        $(document).off('dblclick', '.g-e');
        $('#g-pop').on('dblclick', '.g-e', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            const ti = parseInt($('.g-t.act').data('i')); 
            const ri = parseInt($(this).data('r')); 
            const ci = parseInt($(this).data('c')); 
            const val = $(this).text(); 
            $(this).blur(); 
            showBigEditor(ti, ri, ci, val); 
        });
        
        $(document).off('blur', '.g-e');
        $('#g-pop').on('blur', '.g-e', function() { 
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
        
        $(document).off('click', '.g-row, .g-n');
        $('#g-pop').on('click', '.g-row, .g-n', function(e) { 
            if ($(e.target).hasClass('g-e') || $(e.target).closest('.g-e').length > 0) return;
            if ($(e.target).is('input[type="checkbox"]')) return;
            
            const $row = $(this).closest('.g-row'); 
            $('.g-row').removeClass('g-selected'); 
            $row.addClass('g-selected'); 
            selectedRow = parseInt($row.data('r')); 
            selectedTableIndex = parseInt($('.g-t.act').data('i')); 
        });
        
        // ✅ 删除按钮使用自定义弹窗
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
                        summarizedRows[ti] = summarizedRows[ti].map(idx => {
                            if (idx > ri) return idx - 1;
                            return idx;
                        });
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
                    if (index > -1) {
                        summarizedRows[ti].splice(index, 1);
                    }
                    summarizedRows[ti] = summarizedRows[ti].map(ri => ri > selectedRow ? ri - 1 : ri);
                    saveSummarizedRows();
                }
                
                selectedRow = null;
            } else {
                await customAlert('请先选中要删除的行（勾选复选框或点击行号）', '提示');
                return;
            }
            
            m.save();
            refreshTable(ti);
            updateTabCount(ti);
        });
        
        $(document).off('keydown.deleteRow').on('keydown.deleteRow', function(e) { 
            if (e.key === 'Delete' && (selectedRow !== null || selectedRows.length > 0) && $('#g-pop').length > 0) { 
                if ($(e.target).hasClass('g-e') || $(e.target).is('input, textarea')) return; 
                $('#g-dr').click();
            } 
        });
        
        $('#g-src').on('input', function() { 
            const k = $(this).val().toLowerCase(); 
            $('.g-tbc:visible tbody tr:not(.g-emp)').each(function() { 
                $(this).toggle($(this).text().toLowerCase().includes(k) || k === ''); 
            }); 
        });
        
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
        
        $('#g-sm').on('click', callAIForSummary);
        
        $('#g-ex').on('click', function() { 
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
            setTimeout(() => { 
                m.all().forEach(s => s.clear()); 
                clearSummarizedMarks();
                m.save(); 
                $('#g-pop').remove(); 
                shw(); 
            }, 10); 
        });
        
        $('#g-tm').on('click', () => navTo('主题设置', shtm));
        $('#g-cf').on('click', () => navTo('配置', shcf));
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
    
    // ✅ 优化后的总结功能：支持酒馆API和独立API
    async function callAIForSummary() {
        const tables = m.all().slice(0, 8).filter(s => s.r.length > 0);
        if (tables.length === 0) { 
            await customAlert('没有表格数据，无法生成总结', '提示'); 
            return; 
        }
        
        // 检查是否配置了API
        if (API_CONFIG.useIndependentAPI && !API_CONFIG.apiKey) {
            await customAlert('总结功能需要配置独立API\n\n请进行以下操作：\n1. 点击"⚙️ 配置"\n2. 点击"🤖 AI总结配置"\n3. 填写API信息并保存', '配置提示');
            return;
        }
        
        const btn = $('#g-sm');
        const originalText = btn.text();
        btn.text('生成中...').prop('disabled', true);
        
        // ✅ 构建纯表格数据提示词
        let prompt = PROMPTS.summaryPrompt + '\n\n';
        tables.forEach(s => { prompt += s.txt() + '\n\n'; });
        
        console.log('📝 发送给AI的总结提示词：');
        console.log(prompt);
        
        try {
            let result;
            if (API_CONFIG.useIndependentAPI) {
                // 使用独立API
                result = await callIndependentAPI(prompt);
            } else {
                // 使用酒馆API
                result = await callTavernAPI(prompt);
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
    // ✅ 总结预览弹窗
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
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
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
            if (!context || !context.generate) {
                return { success: false, error: '无法访问酒馆API，请确保酒馆已连接' };
            }
            const summary = await context.generate(prompt, { max_tokens: 1000, temperature: 0.7 });
            if (summary) {
                return { success: true, summary };
            } else {
                return { success: false, error: '酒馆API未返回内容' };
            }
        } catch (err) {
            return { success: false, error: `酒馆API调用失败: ${err.message}` };
        }
    }
    
    function shtm() {
        const h = `<div class="g-p"><h4>🎨 主题设置</h4><label>主题色（按钮、表头颜色）：</label><input type="color" id="tc" value="${UI.c}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;"><br><br><label>背景色：</label><input type="color" id="tbc" value="${UI.bc}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd; cursor:pointer;"><br><br><div style="background:#e7f3ff; padding:10px; border-radius:4px; font-size:10px; margin-bottom:12px;"><strong>💡 提示：</strong><br>• 主题色：控制按钮、表头的颜色<br>• 背景色：控制弹窗的背景颜色<br>• 建议使用浅色背景+深色主题色<br>• <span style="color:#28a745;">✅ 主题会自动云同步</span></div><button id="ts" style="padding:8px 16px; background:${UI.c}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">💾 保存</button><button id="tr" style="padding:8px 16px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">🔄 恢复默认</button></div>`;
        pop('🎨 主题设置', h, true);
        setTimeout(() => {
            $('#ts').on('click', async function() { 
                UI.c = $('#tc').val(); 
                UI.bc = $('#tbc').val(); 
                try { localStorage.setItem(UK, JSON.stringify(UI)); } catch (e) {} 
                m.save();
                thm(); 
                await customAlert('主题已保存并应用\n\n会自动同步到手机/电脑', '成功'); 
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
        const h = `<div class="g-p"><h4>📝 提示词管理</h4><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>填表提示词</legend><p style="font-size:10px; color:#666; margin-bottom:8px;">⚠️ 每次聊天都会发送给AI</p><textarea id="pmt-table" style="width:100%; height:300px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical; margin-bottom:10px;">${esc(PROMPTS.tablePrompt)}</textarea><label>注入位置：</label><select id="pmt-table-pos" style="width:100%; padding:5px; margin-bottom:10px;"><option value="system" ${PROMPTS.tablePromptPos === 'system' ? 'selected' : ''}>系统消息</option><option value="user" ${PROMPTS.tablePromptPos === 'user' ? 'selected' : ''}>用户消息</option><option value="assistant" ${PROMPTS.tablePromptPos === 'assistant' ? 'selected' : ''}>助手消息</option></select><label>位置类型：</label><select id="pmt-table-pos-type" style="width:100%; padding:5px; margin-bottom:10px;"><option value="absolute" ${PROMPTS.tablePromptPosType === 'absolute' ? 'selected' : ''}>相对位置（固定）</option><option value="chat" ${PROMPTS.tablePromptPosType === 'chat' ? 'selected' : ''}>聊天位置（动态）</option></select><div id="pmt-table-depth-container" style="${PROMPTS.tablePromptPosType === 'chat' ? '' : 'display:none;'}"><label>深度：</label><input type="number" id="pmt-table-depth" value="${PROMPTS.tablePromptDepth}" min="0" style="width:100%; padding:5px;"><p style="font-size:10px; color:#666;">深度表示从指定位置往前偏移的消息数</p></div></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>总结提示词</legend><p style="font-size:10px; color:#666; margin-bottom:8px;">⚠️ 仅在点击"📝 总结"按钮时使用</p><textarea id="pmt-summary" style="width:100%; height:200px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical; margin-bottom:10px;">${esc(PROMPTS.summaryPrompt)}</textarea></fieldset><button id="save-pmt">💾 保存</button><button id="reset-pmt">🔄 恢复默认</button></div>`;
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
        const h = `<div class="g-p"><h4>⚙️ 高级配置</h4><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>表格数据注入</legend><label><input type="checkbox" id="c-table-inj" ${C.tableInj ? 'checked' : ''}> 启用表格数据注入</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;">📌 此处是表格和总结一起注入的位置</p><br><label>注入位置：</label><select id="c-table-pos" style="width:100%; padding:5px;"><option value="system" ${C.tablePos === 'system' ? 'selected' : ''}>系统消息</option><option value="user" ${C.tablePos === 'user' ? 'selected' : ''}>用户消息</option><option value="assistant" ${C.tablePos === 'assistant' ? 'selected' : ''}>助手消息</option></select><br><br><label>位置类型：</label><select id="c-table-pos-type" style="width:100%; padding:5px;"><option value="absolute" ${C.tablePosType === 'absolute' ? 'selected' : ''}>相对位置（固定）</option><option value="chat" ${C.tablePosType === 'chat' ? 'selected' : ''}>聊天位置（动态）</option></select><br><br><div id="c-table-depth-container" style="${C.tablePosType === 'chat' ? '' : 'display:none;'}"><label>深度：</label><input type="number" id="c-table-depth" value="${C.tableDepth}" min="0" style="width:100%; padding:5px;"></div></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>自动总结</legend><label><input type="checkbox" id="c-auto-sum" ${C.autoSummary ? 'checked' : ''}> 启用自动总结</label><br><br><label>触发楼层数：</label><input type="number" id="c-auto-floor" value="${C.autoSummaryFloor}" min="10" style="width:100%; padding:5px;"></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>云同步</legend><label><input type="checkbox" id="c-cloud" ${C.cloudSync ? 'checked' : ''}> 启用自动云同步</label><p style="font-size:10px; color:#666; margin:4px 0 0 20px;"><strong>☁️ 自动同步说明：</strong><br>• 启用后，数据自动保存到云端<br>• 手机和电脑数据实时一致<br>• 包含：表格、主题、列宽配置<br>• 无需手动上传/下载</p></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>功能入口</legend><button id="open-api" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px; margin-right:5px;">🤖 AI总结配置</button><button id="open-pmt" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">📝 提示词管理</button></fieldset><fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;"><legend>其他选项</legend><label><input type="checkbox" id="c-log" ${C.log ? 'checked' : ''}> 控制台详细日志</label><br><br><label><input type="checkbox" id="c-pc" ${C.pc ? 'checked' : ''}> 每个角色独立数据</label><br><br><label><input type="checkbox" id="c-hide" ${C.hideTag ? 'checked' : ''}> 隐藏聊天中的记忆标签</label><br><br><label><input type="checkbox" id="c-filter" ${C.filterHistory ? 'checked' : ''}> 自动过滤历史标签</label></fieldset><button id="save-cfg">💾 保存配置</button></div>`;
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
                C.cloudSync = $('#c-cloud').is(':checked');
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
            const tx = mg.mes || mg.swipes?.[mg.swipe_id] || '';
            const cs = prs(tx);
            if (cs.length > 0) { console.log(`✅ [PARSE] 解析到 ${cs.length} 条指令`); exe(cs); }
            
            // ✅ 自动总结
            if (C.autoSummary && x.chat.length >= C.autoSummaryFloor && !m.sm.has()) {
                console.log(`🤖 [AUTO SUMMARY] 达到${C.autoSummaryFloor}条消息，触发自动总结`);
                callAIForSummary();
            }
            
            setTimeout(hideMemoryTags, 100);
        } catch (e) { console.error('❌ 消息处理失败:', e); }
    }
    
    function ochat() { m.load(); setTimeout(hideMemoryTags, 500); }
    function opmt(ev) { try { inj(ev); } catch (e) { console.error('❌ 注入失败:', e); } }
    
    function ini() {
        if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') { setTimeout(ini, 500); return; }
        try { const sv = localStorage.getItem(UK); if (sv) UI = { ...UI, ...JSON.parse(sv) }; } catch (e) {}
        try { const pv = localStorage.getItem(PK); if (pv) PROMPTS = { ...PROMPTS, ...JSON.parse(pv) }; } catch (e) {}
        try { const av = localStorage.getItem(AK); if (av) API_CONFIG = { ...API_CONFIG, ...JSON.parse(av) }; } catch (e) {}
        loadColWidths();
        loadSummarizedRows();
        m.load();
        thm();
        $('#g-btn').remove();
        const $b = $('<div>', { id: 'g-btn', class: 'list-group-item flex-container flexGap5', css: { cursor: 'pointer' }, html: '<i class="fa-solid fa-table"></i><span style="margin-left:8px;">记忆表格</span>' }).on('click', shw);
        $('#extensionsMenu').append($b);
        const x = m.ctx();
        if (x && x.eventSource) {
            try {
                x.eventSource.on(x.event_types.CHARACTER_MESSAGE_RENDERED, omsg);
                x.eventSource.on(x.event_types.CHAT_CHANGED, ochat);
                x.eventSource.on(x.event_types.CHAT_COMPLETION_PROMPT_READY, opmt);
                console.log('✅ [EVENT] 事件监听已注册');
            } catch (e) {}
        }
        setTimeout(hideMemoryTags, 1000);
        console.log('✅ 记忆表格 v' + V + ' 已就绪');
        console.log('📋 包含总结:', m.sm.has() ? `有总结 (${m.sm.loadArray().length}条)` : '无总结');
        console.log('☁️ 自动云同步:', C.cloudSync ? '已启用' : '已关闭');
        console.log('🤖 AI总结:', API_CONFIG.enableAI ? (API_CONFIG.useIndependentAPI ? '独立API' : '酒馆API') : '未配置');
        console.log('🔄 自动总结:', C.autoSummary ? `已启用 (${C.autoSummaryFloor}条触发)` : '已关闭');
    }
    setTimeout(ini, 1000);
    window.Gaigai = { v: V, m: m, shw: shw, cleanMemoryTags: cleanMemoryTags, MEMORY_TAG_REGEX: MEMORY_TAG_REGEX, config: API_CONFIG, prompts: PROMPTS };
})();
