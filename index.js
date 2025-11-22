// 记忆表格 v4.2.0
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ 记忆表格已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 记忆表格 v4.2.0 启动');
    
    const V = 'v4.2.0';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const PK = 'gg_prompts';
    const PROMPT_VERSION = 16;
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
    
    // ============================================================
    // ✨✨✨ 核心配置区：在此处修改默认提示词，全局生效 ✨✨✨
    // ============================================================
    
    // 1. 填表提示词 (默认值)
    const DEFAULT_TABLE_PROMPT = `🔴🔴🔴 记忆表格记录指南 🔴🔴🔴

【核心指令】
1.每次回复的最末尾（所有内容和标签之后），必须输出 <Memory> 标签
2.<Memory> 标签必须在最后一行，不能有任何内容在它后面
3.即使本次没有重要剧情，也必须输出（至少更新时间或状态）
4.严禁使用 Markdown 代码块、JSON 格式或其他标签。
5.⚠️【增量更新原则】：只输出本次对话产生的【新变化】。严禁重复输出已存在的旧记录！严禁修改非本次剧情导致的过往数据！

【唯一正确格式】
<Memory><!-- --></Memory>

⚠️ 必须使用 <Memory> 标签！
⚠️ 必须用<!-- -->包裹！
⚠️ 必须使用数字索引（如 0, 1, 3），严禁使用英文单词（如 date, time）！

【各表格记录规则（同一天多事件系统会自动用分号连接）】
- 主线剧情: 仅记录{{char}}与{{user}}直接产生互动的剧情和影响主线剧情的重要事件或{{char}}/{{user}}的单人主线剧情。格式:HH:mm+角色+地点+事情(严禁记录角色情绪情感)
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

【输出示例】
(正文剧情内容...)
<Memory><!-- --></Memory>`;

    // 2. 表格总结提示词 (默认值)
    const DEFAULT_SUM_TABLE = `请将以下表格数据总结成简洁的文字描述。

【智能识别处理】
1. 请将各行分散的信息串联起来，去除冗余，合并同类事件。
2. 重点关注角色状态变化、物品流向及关键剧情节点。

【输出格式要求】
- 必须以“• ”开头，分条列出重要事件。
- 语言风格：客观、简练、使用过去式。
- 严禁编造原文中不存在的内容。

请只总结下面的表格数据：`;

    // 3. 聊天总结提示词 (默认值)
    const DEFAULT_SUM_CHAT = `请分析以下对话历史，严格遵循【史官笔法】生成剧情总结。

【核心原则】
1. 绝对客观：严禁使用主观、情绪化或动机定性的词汇（如“温柔”、“恶意”、“诱骗”），仅记录可观察的事实与结果。
2. 过去式表达：所有记录必须使用过去式（如“已经商议了”、“完成了”），确保叙事的时间定性。
3. 逻辑连贯：确保故事线清晰，不得凭空捏造或扭曲真实剧情 。
4.请勿使用*、-、#等多余符号。

【总结内容要求】
1. 主线剧情：
   - 仅记录 {{char}} 与 {{user}} 的关键互动、承诺约定及重要事件。
   - 忽略日常闲聊（如吃饭、发呆），只保留推动剧情的节点。
   - 同一天的剧情请合并为一段描述。
   - 格式为：x年x月x日+时间+地点+角色人物名称+事件

2. 支线追踪：
   - 记录 NPC 的独立行动轨迹、或 NPC 与主角的交互。
   - 明确区分不同势力的行动线，不要混淆。

3. 关键变动（如有）：
   - 角色状态变化（如受伤、死亡、失忆、囚禁）。
   - 确定的关系/情感逆转（如结盟、决裂、爱上、背叛）。

【输出格式】
   主线剧情：
   支线剧情：
   角色状态：
   角色情感：

请直接输出总结正文，严禁包含任何开场白、结束语或非剧情相关的交互性对话（如“收到”、“好的”）：`;

    // ============================================================
    // 🚀 插件运行时配置对象 (自动引用上面的常量)
    // ============================================================
    let PROMPTS = {
        tablePrompt: DEFAULT_TABLE_PROMPT,
        tablePromptPos: 'system',
        tablePromptPosType: 'system_end',
        tablePromptDepth: 0,
        summaryPromptTable: DEFAULT_SUM_TABLE,
        summaryPromptChat: DEFAULT_SUM_CHAT
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
        
        // ✅✅✅ 极简版保存逻辑：不合并，直接新增一行
        save(summaryData) {
            const sumSheet = this.m.get(8); // 获取第9个表格（索引8）即总结表
            
            // 1. 处理内容，确保是纯文本
            let content = '';
            if (typeof summaryData === 'string') {
                content = summaryData.trim();
            } else if (Array.isArray(summaryData)) {
                // 防御性编程：万一传进来是数组，转成字符串
                content = summaryData.map(item => item.content || item).join('\n\n');
            }
            
            if (!content) return;

            // 2. 自动生成类型名称 (例如: 剧情总结 1, 剧情总结 2)
            // 逻辑：当前有多少行，下一个就是 N+1
            const nextIndex = sumSheet.r.length + 1;
            const typeName = `剧情总结 ${nextIndex}`;

            // 3. 直接插入新行 (0列=类型, 1列=内容)
            sumSheet.ins({ 0: typeName, 1: content });
            
            this.m.save();
        }

        // 读取逻辑也微调一下，让多条总结之间有间隔，方便AI理解
        load() {
            const sumSheet = this.m.get(8);
            if (sumSheet.r.length === 0) return '';
            
            // 格式示例：
            // 【剧情总结 1】
            // ...内容...
            //
            // 【剧情总结 2】
            // ...内容...
            return sumSheet.r.map(row => `【${row[0] || '历史片段'}】\n${row[1] || ''}`).filter(t => t).join('\n\n');
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
            // ✅ 修改为：纯粹的状态描述，不带操作暗示，防止 AI 误解
            result += '=== 📊 当前已记录的记忆内容 ===\n\n' + tableStr + '=== 表格结束 ===\n';
        } else if (this.sm.has()) {
            result += '=== 📊 当前已记录的记忆内容（空/已归档） ===\n\n⚠️ 所有详细数据已归档，当前可视为空。\n\n=== 表格结束 ===\n';
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
    // 步骤2：注入提示词 (只要开关开启就注入，不限制总结模式)
    // ============================================================
    // ✅ 修复：去掉了 summarySource === 'table' 的限制
    // 现在只要 C.enabled 为 true，无论你选什么总结模式，都会发送填表指令
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
    } else {
        // ⚠️ 逻辑修正：走到这里意味着 C.enabled = true (开关开了)，但是 PROMPTS.tablePrompt 为空
        // 这通常是因为配置没同步，或者被误删了
        console.warn(`⚠️ [Gaigai警告] 记忆开关已开，但“填表提示词”内容为空，无法注入！请检查配置。`);
    }
    
// ============================================================
    // 步骤3：清理历史消息中的标签（已修复：原地修改，防止引用丢失）
    // ============================================================
    if (C.filterHistory) {
        // 使用 forEach 直接修改 ev.chat 里的对象，不创建新数组
        ev.chat.forEach((msg, index) => {
            // 1. 跳过特殊的、或者无需处理的消息
            // 注意：forEach 里直接 return 相当于 continue，跳过当前这条
            if (msg.isGaigaiPrompt || msg.isGaigaiData || msg.isPhoneMessage) return;
            if (msg.content && (msg.content.includes('📱 手机') || msg.content.includes('手机微信消息记录'))) return;
            // 跳过用户和系统消息
            if (msg.is_user || msg.role === 'user' || msg.role === 'system') return;
            
            // 2. 只处理 AI (assistant) 的消息
            if (msg.role === 'assistant' || !msg.is_user) {
                const contentFields = ['content', 'mes', 'message', 'text'];
                
                // 遍历所有可能的字段，发现标签直接原地删除
                contentFields.forEach(field => {
                    if (msg[field] && typeof msg[field] === 'string' && MEMORY_TAG_REGEX.test(msg[field])) {
                        // ⚡️ 核心修改：直接修改 msg 对象的属性值
                        msg[field] = msg[field].replace(MEMORY_TAG_REGEX, '').trim();
                    }
                });
            }
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
    
// 终极修复：使用 TreeWalker 精准替换文本节点，绝对不触碰图片/DOM结构
    function hideMemoryTags() {
        if (!C.hideTag) return;

        // 1. 注入一次性 CSS 规则，这是最安全的隐藏方式
        if (!document.getElementById('gaigai-hide-style')) {
            $('<style id="gaigai-hide-style">memory, gaigaimemory, tableedit { display: none !important; }</style>').appendTo('head');
        }

        $('.mes_text').each(function() {
            const root = this;
            // 如果已经处理过，直接跳过
            if (root.dataset.gaigaiProcessed) return;

            // 策略 A: 如果 <Memory> 被浏览器识别为标签，直接用 CSS 隐藏 (不通过 JS 修改)
            $(root).find('memory, gaigaimemory, tableedit').hide();

            // 策略 B: 如果 <Memory> 是纯文本，使用 TreeWalker 精准查找
            // 这种方式只会修改文字节点，旁边的 <img src="..."> 绝对不会被重置！
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let node;
            const nodesToReplace = [];

            while (node = walker.nextNode()) {
                if (MEMORY_TAG_REGEX.test(node.nodeValue)) {
                    nodesToReplace.push(node);
                }
            }

            if (nodesToReplace.length > 0) {
                nodesToReplace.forEach(textNode => {
                    const span = document.createElement('span');
                    // 只替换文字内容，不触碰父级 innerHTML
                    const newHtml = textNode.nodeValue.replace(MEMORY_TAG_REGEX, 
                        '<span class="g-hidden-tag" style="display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;">$&</span>');
                    
                    span.innerHTML = newHtml;
                    // 原地替换文本节点
                    textNode.parentNode.replaceChild(span, textNode);
                });
                // 标记已处理
                root.dataset.gaigaiProcessed = 'true';
            }
        });
    }
    
function thm() {
    // 1. 读取配置
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

    // ✅✅✅ 核心修复 1：强制更新全局 CSS 变量
    // 这一步会把所有用 var(--g-c) 的地方（悬停、复选框等）全部变成你的主题色
    document.documentElement.style.setProperty('--g-c', UI.c);

    // 2. 计算颜色 (RGB) 用于透明度
    const getRgbStr = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `${r}, ${g}, ${b}`;
    };

    const rgbStr = getRgbStr(UI.c);
    const selectionBg = `rgba(${rgbStr}, 0.15)`; 
    const hoverBg = `rgba(${rgbStr}, 0.08)`;     
    const shadowColor = `rgba(${rgbStr}, 0.3)`;  

    const style = `
        /* 1. 字体与重置 */
        #g-pop div, #g-pop p, #g-pop span, #g-pop td, #g-pop th, #g-pop button, #g-pop input, #g-pop select, #g-pop textarea, #g-pop h3, #g-pop h4,
        #g-edit-pop *, #g-summary-pop *, #g-about-pop * {
            font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            box-sizing: border-box;
            color: #333;
        }
        #g-pop i, .g-ov i { font-family: "Font Awesome 6 Free", "FontAwesome" !important; font-weight: 900 !important; }

        /* 2. 容器 */
        .g-ov { background: rgba(0, 0, 0, 0.35) !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; z-index: 20000 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        .g-w { 
            background: rgba(255, 255, 255, 0.6) !important; 
            backdrop-filter: blur(20px) saturate(180%) !important; 
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important; 
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
            border-radius: 12px !important;
            display: flex !important; flex-direction: column !important;
            position: relative !important; margin: auto !important;
            transform: none !important; left: auto !important; top: auto !important;
        }

        /* 3. 表格核心布局 - 🚫去除 min-width 限制 */
        .g-tbc { width: 100% !important; height: 100% !important; overflow: hidden !important; display: flex; flex-direction: column !important; }
        
        .g-tbl-wrap { 
            width: 100% !important; 
            flex: 1 !important;
            background: transparent !important; 
            overflow: auto !important; 
            padding-bottom: 150px !important; 
            padding-right: 50px !important; 
            box-sizing: border-box !important;
        }

        .g-tbl-wrap table {
            /* ✅ 固定布局：列宽听你的 */
            table-layout: fixed !important; 
            
            /* ✅ 关键：宽度设为 max-content，允许缩小！ */
            /* 只要不设 min-width: 100%，就不会出现“左右被迫拉动”的情况 */
            width: max-content !important; 
            min-width: auto !important; 
            
            border-collapse: separate !important; 
            border-spacing: 0 !important;
            margin: 0 !important;
        }

        .g-tbl-wrap th { 
            background: ${UI.c} !important; 
            color: ${UI.tc} !important; 
            border-right: 1px solid rgba(0, 0, 0, 0.2) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.2) !important;
            position: sticky !important; top: 0 !important; z-index: 10 !important;
            height: 32px !important; padding: 0 4px !important;
            font-size: 12px !important; font-weight: bold !important;
            text-align: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }

        .g-tbl-wrap td {
            border-right: 1px solid rgba(0, 0, 0, 0.15) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.15) !important;
            background: rgba(255, 255, 255, 0.5) !important;
            padding: 0 !important; height: 40px !important;
            box-sizing: border-box !important;
            
            /* ✅ 强制文字截断，防止撑开单元格 */
            overflow: hidden !important; 
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
            max-width: 0 !important; 
        }
        
        /* 4. 拖拽条与选中 */
        .g-col-resizer { 
            position: absolute !important; right: -5px !important; top: 0 !important; bottom: 0 !important; 
            width: 10px !important; cursor: col-resize !important; z-index: 20 !important; 
            background: transparent !important; 
        }
        .g-col-resizer:hover { background: ${hoverBg} !important; }
        .g-col-resizer:active { background: ${shadowColor} !important; border-right: 1px solid ${UI.c} !important; }

        /* 选中样式 */
        .g-t.act { background: ${UI.c} !important; filter: brightness(0.9); color: ${UI.tc} !important; font-weight: bold !important; border: none !important; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2) !important; }
        .g-row.g-selected td { background-color: ${selectionBg} !important; }
        .g-row.g-selected { outline: 2px solid ${UI.c} !important; outline-offset: -2px !important; }
        /* 🚀 新增：防止行背景在缩放时花屏 */
        .g-row {
            cursor: pointer;
            transition: background-color 0.2s;
            transform: translate3d(0, 0, 0);
            will-change: background-color;
        }
        .g-row.g-summarized { background-color: rgba(0, 0, 0, 0.05) !important; }

        /* 5. 其他组件 */
        .g-hd { background: ${UI.c} !important; opacity: 0.98; border-bottom: 1px solid rgba(0,0,0,0.1) !important; padding: 0 16px !important; height: 50px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; flex-shrink: 0 !important; border-radius: 12px 12px 0 0 !important; }
        .g-hd h3 { color: ${UI.tc} !important; margin: 0 !important; font-size: 16px !important; font-weight: bold !important; text-align: center !important; flex: 1; }
        .g-x { background: transparent !important; border: none !important; color: ${UI.tc} !important; cursor: pointer !important; font-size: 20px !important; width: 32px !important; height: 32px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        .g-back { background: transparent !important; border: none !important; color: ${UI.tc} !important; cursor: pointer !important; font-size: 14px !important; font-weight: 600 !important; display: flex !important; align-items: center !important; gap: 6px !important; padding: 4px 8px !important; border-radius: 4px !important; }
        .g-back:hover { background: rgba(255,255,255,0.2) !important; }

        /* 修复：增加 will-change 属性，告诉浏览器提前优化渲染，解决缩放时的花屏闪烁 */
        .g-e { 
            width: 100% !important; height: 100% !important; padding: 0 6px !important; border: none !important; background: transparent !important; line-height: 40px !important; font-size: 12px !important; color: #333 !important; 
            white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
            
            /* 🚀 核心修复代码 👇 */
            transform: translate3d(0, 0, 0);
            will-change: transform, box-shadow, background; 
            backface-visibility: hidden;
        }
        .g-e:focus {
            outline: 2px solid ${UI.c} !important;
            outline-offset: -2px;
            background: rgba(255, 249, 230, 0.95) !important;
            box-shadow: 0 4px 12px ${shadowColor} !important;
            z-index: 10;
            position: relative;
        }
        
        /* 修复鼠标悬停时的边框颜色 (之前是红色，现在跟随变量) */
        .g-e:hover {
            background: rgba(255, 251, 240, 0.9) !important;
            box-shadow: inset 0 0 0 1px var(--g-c); /* ✅ 现在 var(--g-c) 已经是正确的主题色了 */
        }
        
        .g-col-num { position: sticky !important; left: 0 !important; z-index: 11 !important; background: ${UI.c} !important; border-right: 1px solid rgba(0, 0, 0, 0.2) !important; }
        tbody .g-col-num { background: rgba(200, 200, 200, 0.4) !important; z-index: 9 !important; }
        
        .g-tl button, .g-p button { background: ${UI.c} !important; color: ${UI.tc} !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; border-radius: 6px !important; padding: 6px 12px !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; white-space: nowrap !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
        
        /* 滚动条颜色 */
        #g-pop ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
        #g-pop ::-webkit-scrollbar-thumb { background: ${UI.c} !important; border-radius: 10px !important; }
        #g-pop ::-webkit-scrollbar-thumb:hover { background: ${UI.c} !important; filter: brightness(0.8); }
        
        @media (max-width: 600px) {
            .g-w { width: 100vw !important; height: 85vh !important; bottom: 0 !important; border-radius: 12px 12px 0 0 !important; position: absolute !important; }
            .g-ts { flex-wrap: nowrap !important; overflow-x: auto !important; }
        }
    `;
    
    $('#gaigai-theme').remove();
    $('<style id="gaigai-theme">').text(style).appendTo('head');
}
    
function pop(ttl, htm, showBack = false) {
    $('#g-pop').remove();
    thm(); // 重新应用样式
    
    const $o = $('<div>', { id: 'g-pop', class: 'g-ov' });
    const $p = $('<div>', { class: 'g-w' });
    const $h = $('<div>', { class: 'g-hd' });
    
    // 1. 左侧容器 (放返回按钮或占位)
    const $left = $('<div>', { css: { 'min-width': '60px', 'display': 'flex', 'align-items': 'center' } });
    if (showBack) {
        const $back = $('<button>', { 
            class: 'g-back', 
            html: '<i class="fa-solid fa-chevron-left"></i> 返回' 
        }).on('click', goBack);
        $left.append($back);
    }
    
    // 2. 中间标题 (强制居中)
    // 如果 ttl 是 HTML 字符串（比如包含版本号），直接用 html()，否则用 text()
    const $title = $('<h3>');
    if (ttl.includes('<')) $title.html(ttl);
    else $title.text(ttl);
    
    // 3. 右侧容器 (放关闭按钮)
    const $right = $('<div>', { css: { 'min-width': '60px', 'display': 'flex', 'justify-content': 'flex-end', 'align-items': 'center' } });
    const $x = $('<button>', { 
        class: 'g-x', 
        text: '×'
    }).on('click', () => { $o.remove(); pageStack = []; });
    $right.append($x);
    
    // 组装标题栏
    $h.append($left, $title, $right);
    
    const $b = $('<div>', { class: 'g-bd', html: htm });
    $p.append($h, $b);
    $o.append($p);
    
    // 点击遮罩关闭
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
        
        // ✨ 修复：使用 css display 显式切换，配合 flex 布局
        $('.g-tbc').css('display', 'none'); 
        $(`.g-tbc[data-i="${i}"]`).css('display', 'flex');
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
    
// ✅ 更新选中行数组并同步视觉状态 (纯 CSS 版)
    function updateSelectedRows() {
        selectedRows = [];
        
        // 1. 清除所有行的选中状态
        // ✨ 修复：不再操作 style，只操作 class，颜色由 CSS 决定
        $('#g-pop .g-tbc:visible .g-row').removeClass('g-selected');
        
        // 2. 重新标记选中的行
        $('#g-pop .g-tbc:visible .g-row-select:checked').each(function() {
            const rowIndex = parseInt($(this).data('r'));
            selectedRows.push(rowIndex);
            $(this).closest('.g-row').addClass('g-selected');
        });
        
        console.log('已选中行:', selectedRows);
    }
    
// ✅✅✅ 新版 Excel 式拖拽逻辑 (直接改宽度，无红线)
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let tableIndex = 0;
    let colName = '';
    let $th = null;

    // 1. 鼠标/手指 按下 (绑定在拖拽条上)
    $('#g-pop').off('mousedown touchstart', '.g-col-resizer').on('mousedown touchstart', '.g-col-resizer', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        tableIndex = parseInt($(this).data('ti'));
        colName = $(this).data('col-name'); // 获取列名用于保存
        
        // 锁定当前表头 TH 元素
        $th = $(this).closest('th'); 
        startWidth = $th.outerWidth(); 
        
        // 记录初始 X 坐标 (兼容移动端)
        startX = e.type === 'touchstart' ? 
            (e.originalEvent.touches[0]?.pageX || e.pageX) : 
            e.pageX;
        
        // 样式：改变鼠标，禁用文字选中
        $('body').css({ 'cursor': 'col-resize', 'user-select': 'none' });
    });

    // 2. 鼠标/手指 移动 (绑定在文档上，防止拖太快脱离)
    $(document).off('mousemove.resizer touchmove.resizer').on('mousemove.resizer touchmove.resizer', function(e) {
        if (!isResizing || !$th) return;
        
        const currentX = e.type === 'touchmove' ? 
            (e.originalEvent.touches[0]?.pageX || e.pageX) : 
            e.pageX;
        
        const deltaX = currentX - startX;
        const newWidth = Math.max(30, startWidth + deltaX); // 最小宽度限制 30px
        
        // ⚡ 核心修改：直接修改 TH 的宽度
        // 因为我们在第一步里设置了 table-layout: fixed，这一步会直接生效
        // 表格总宽度会自动撑开，不会挤压其他列
        $th.css('width', newWidth + 'px');
    });

    // 3. 鼠标/手指 抬起 (结束拖拽并保存)
    $(document).off('mouseup.resizer touchend.resizer').on('mouseup.resizer touchend.resizer', function(e) {
        if (!isResizing) return;
        
        // 保存最后一次的宽度到配置里
        if ($th && colName) {
            const finalWidth = $th.outerWidth();
            setColWidth(tableIndex, colName, finalWidth);
            console.log(`✅ 列 [${colName}] 宽度已保存：${finalWidth}px`);
        }
        
        // 还原光标和选中状态
        $('body').css({ 'cursor': '', 'user-select': '' });
        
        // 重置变量
        isResizing = false;
        $th = null;
    });

    // 4. 辅助：防止拖拽时意外选中文字
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
        
        // ✨✨✨ 核心修复：删除后立刻更新快照，防止数据“复活” ✨✨✨
        const currentMsgIndex = (m.ctx() && m.ctx().chat) ? m.ctx().chat.length - 1 : -1;
        saveSnapshot(currentMsgIndex);
        console.log('🗑️ [删除同步] 已强制更新快照，防止已删数据复活');
        
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
    
    $('#g-sm').off('click').on('click', () => callAIForSummary(null, null, 'table'));
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
    
    // ✨✨✨ 核心修复：全清后立刻覆盖快照，确保“空状态”被记住 ✨✨✨
    const currentMsgIndex = (m.ctx() && m.ctx().chat) ? m.ctx().chat.length - 1 : -1;
    saveSnapshot(currentMsgIndex);
    console.log('💥 [全清同步] 已强制更新快照，防止旧数据复活');
    
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
    
// ✅✅✅ 100% 适配版：精准定位 persona_description
async function callAIForSummary(forceStart = null, forceEnd = null, forcedMode = null) {
    const currentMode = forcedMode || API_CONFIG.summarySource;
    const isTableMode = currentMode !== 'chat'; 
    
    const tables = m.all().slice(0, 8).filter(s => s.r.length > 0);
    const btn = $('#g-sm'); 
    const manualBtn = $('#manual-sum-btn'); 
    
    // ============================================================
    // 🕵️‍♂️ 2. 精准情报搜集 (API + 你的特定DOM ID)
    // ============================================================
    const ctx = m.ctx();
    
    // 1. 获取名字 (优先 API，失败则抓取页面 #your_name)
    let userName = (ctx && ctx.name1) ? ctx.name1 : ($('#your_name').text() || 'User');
    let charName = (ctx && ctx.name2) ? ctx.name2 : 'Character';
    
    let contextText = ''; 
    let scanTextForWorldInfo = ''; 

    // 2. 获取角色信息 (API)
    let charInfo = '';
    if (ctx && ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
        const char = ctx.characters[ctx.characterId];
        if (char.name) charName = char.name; // 修正角色名
        
        if (char.description) charInfo += `[人物简介]\n${char.description}\n`;
        if (char.personality) charInfo += `[性格/设定]\n${char.personality}\n`;
        if (char.scenario) charInfo += `[当前场景]\n${char.scenario}\n`;
    }

    // 3. 获取用户人设 (修正：精准打击 #persona_description)
    // 你的界面使用的是 #persona_description，而不是 #user_persona
    let userPersona = '';
    
    // A. 先试 API
    if (ctx) userPersona = ctx.user_persona || ctx.persona;
    
    // B. 如果 API 没有，直接读取你界面上的那个框
    if (!userPersona) {
        try {
            userPersona = $('#persona_description').val(); 
        } catch(e) {}
    }

    // C. 如果还是没有，尝试读取全局变量 (备用)
    if (!userPersona && window.SillyTavern && window.SillyTavern.user) {
        userPersona = window.SillyTavern.user.persona;
    }

    // 4. 拼装背景
    let userInfo = userPersona ? `[用户设定/User Persona]\n${userPersona}\n` : '';
    
    if (charInfo || userInfo) {
        contextText = `【背景资料】\n角色: ${charName}\n用户: ${userName}\n\n${charInfo}\n${userInfo}`;
    }
    // ============================================================

    let rawPrompt = isTableMode ? PROMPTS.summaryPromptTable : PROMPTS.summaryPromptChat;
    if (!rawPrompt || !rawPrompt.trim()) rawPrompt = PROMPTS.summaryPrompt || "请总结以下内容：";

    // 变量替换
    let targetPrompt = rawPrompt
        .replace(/{{user}}/gi, userName)
        .replace(/{{char}}/gi, charName);

    // 表格模式拦截
    if (isTableMode) {
        if (tables.length === 0) { await customAlert('表格为空', '提示'); return; }
        if (!await customConfirm(`即将总结 ${tables.length} 个表格`, '确认')) return;
    } 
    
    // 锁定按钮
    const activeBtn = forceStart !== null ? manualBtn : btn;
    const originalText = activeBtn.text();
    if (activeBtn.length) activeBtn.text('生成中...').prop('disabled', true);
    
    let fullPrompt = '';
    let logMsg = '';
    let startIndex = 0;
    let endIndex = 0;

    if (!isTableMode) {
        // === 聊天模式 ===
        if (!ctx || !ctx.chat || ctx.chat.length === 0) {
            await customAlert('聊天记录为空', '错误');
            if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false);
            return;
        }

        endIndex = (forceEnd !== null) ? parseInt(forceEnd) : ctx.chat.length;
        startIndex = (forceStart !== null) ? parseInt(forceStart) : (API_CONFIG.lastSummaryIndex || 0);
        
        if (startIndex < 0) startIndex = 0;
        if (startIndex >= endIndex) {
             await customAlert(`范围无效`, '提示');
             if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false);
             return;
        }

        let chatHistoryText = `【对话内容 (${startIndex} - ${endIndex} 层)】\n`;
        let validMsgCount = 0;
        const targetSlice = ctx.chat.slice(startIndex, endIndex);
        
        targetSlice.forEach((msg) => {
            if (msg.isGaigaiPrompt || msg.isGaigaiData || msg.isPhoneMessage) return;
            let content = msg.mes || msg.content || '';
            if (content.includes("记忆表格记录指南")) return;
            content = cleanMemoryTags(content);
            if (!content.trim()) return;
            
            const name = msg.name || (msg.is_user ? userName : charName);
            chatHistoryText += `[${name}]: ${content}\n`;
            scanTextForWorldInfo += content + '\n'; 
            validMsgCount++;
        });
        
        if (validMsgCount === 0) {
             await customAlert('范围内无有效内容', '提示');
             if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false);
             return;
        }

        // --- D. 世界书扫描 (增强版兼容逻辑) ---
        let triggeredLore = [];
        let worldInfoList = [];

        try {
            // 依次尝试：Context -> Global -> Extension
            if (ctx.worldInfo && Array.isArray(ctx.worldInfo)) worldInfoList = ctx.worldInfo;
            else if (window.world_info && Array.isArray(window.world_info)) worldInfoList = window.world_info;
            else if (window.extension_settings && window.extension_settings.lore) worldInfoList = window.extension_settings.lore;
            else if (window.lore && Array.isArray(window.lore)) worldInfoList = window.lore;
        } catch(e) {}

        if (worldInfoList.length > 0 && scanTextForWorldInfo) {
            const lowerText = scanTextForWorldInfo.toLowerCase();
            worldInfoList.forEach(entry => {
                // 兼容 keys, key, keywords, uid
                const keysStr = entry.keys || entry.key || entry.keywords || entry.uid || ''; 
                if (!keysStr) return;

                const keys = String(keysStr).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
                const isHit = keys.some(k => lowerText.includes(k));
                
                if (isHit) {
                    // 兼容 content, entry
                    const content = entry.content || entry.entry || '';
                    if (content) triggeredLore.push(`[相关设定: ${keys[0]}] ${content}`);
                }
            });
        }

        if (triggeredLore.length > 0) {
            contextText += `\n【相关世界设定/World Info】\n${triggeredLore.join('\n')}\n----------------\n`;
        } else {
            contextText += `----------------\n`;
        }

        fullPrompt = targetPrompt + '\n\n' + contextText + chatHistoryText;
        logMsg = `📝 聊天总结: ${startIndex}-${endIndex} (Lore:${triggeredLore.length})`;

    } else {
        const tableText = m.getTableText();
        fullPrompt = targetPrompt + '\n\n' + tableText;
        logMsg = '📝 表格总结';
    }

    console.log(logMsg);
    
    window.Gaigai.lastRequestData = {
        chat: [{
            role: 'system', 
            content: `🛑 [模式: ${isTableMode ? '表格' : '聊天'}]\n${fullPrompt}`,
            isGaigaiPrompt: true
        }],
        timestamp: Date.now(),
        model: API_CONFIG.model || 'Unknown'
    };

    try {
        let result;
        if (API_CONFIG.useIndependentAPI) {
            if (!API_CONFIG.apiKey) { await customAlert('缺少API密钥', '提示'); if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false); return; }
            result = await callIndependentAPI(fullPrompt);
        } else {
            result = await callTavernAPI(fullPrompt);
        }
        
        if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false);
        
        if (result.success) {
            if (!result.summary || !result.summary.trim()) { await customAlert('AI返回空', '警告'); return; }

            if (!isTableMode) {
                const currentLast = API_CONFIG.lastSummaryIndex || 0;
                if (endIndex > currentLast) {
                    API_CONFIG.lastSummaryIndex = endIndex;
                    localStorage.setItem(AK, JSON.stringify(API_CONFIG));
                }
            }
            
            showSummaryPreview(result.summary, tables, isTableMode);
            
        } else {
            await customAlert('生成失败：' + result.error, '错误');
        }
    } catch (e) {
        if (activeBtn.length) activeBtn.text(originalText).prop('disabled', false);
        await customAlert('错误：' + e.message, '错误');
    }
}
    
// ✅✅✅ 修正版：接收模式参数，精准控制弹窗逻辑
function showSummaryPreview(summaryText, sourceTables, isTableMode) {
    const h = `
        <div class="g-p">
            <h4>📝 记忆总结预览</h4>
            <p style="color:#666; font-size:11px; margin-bottom:10px;">
                ✅ 已生成总结建议<br>
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
            
            // 1. 保存到总结表 (表8)
            m.sm.save(editedSummary);
            
            // 2. 标记绿色行 (仅在表格模式下)
            if (isTableMode) {
                sourceTables.forEach(table => {
                    const ti = m.all().indexOf(table);
                    if (ti !== -1) {
                        for (let ri = 0; ri < table.r.length; ri++) {
                            markAsSummarized(ti, ri);
                        }
                    }
                });
            }
            
            m.save();
            $o.remove();
            
            // 3. 🎯 关键修复：根据传递进来的模式，决定是否询问清空
            setTimeout(async () => {
                if (!isTableMode) {
                    // === 聊天模式：只提示成功，绝不废话，绝不删表 ===
                    await customAlert('✅ 剧情总结已保存！\n(进度指针已自动更新)', '保存成功');
                } else {
                    // === 表格模式：只有它是表格模式，才询问是否删表 ===
                    if (await customConfirm('总结已保存！\n\n是否清空已总结的原始表格数据？\n\n• 点击"确定"：清空已总结的数据，只保留总结\n• 点击"取消"：保留原始数据（已总结的行会显示为淡绿色背景）', '保存成功')) {
                        clearSummarizedData();
                        await customAlert('已清空已总结的数据', '完成');
                    } else {
                        await customAlert('已保留原始数据（已总结的行显示为淡绿色）', '完成');
                    }
                }
                
                // 刷新界面
                if ($('#g-pop').length > 0) {
                    shw();
                }
                // 如果你想自动跳到总结页，保留这行；不想跳就删掉
                $('.g-t[data-i="8"]').click();
            }, 100);
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
            // ✨✨✨ 智能构建 Gemini 地址 (支持 Google AI Studio 官方及反代) ✨✨✨
            let baseUrl = API_CONFIG.apiUrl.trim().replace(/\/+$/, '');
            
            // 容错：如果用户习惯性填了 /v1 (OpenAI格式)，帮他去掉，防止报错
            if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

            // 如果地址里没有具体的操作指令，说明填的是 Base URL，自动补全标准路径
            // 这样你只需要填 https://generativelanguage.googleapis.com 即可
            if (!baseUrl.includes(':generateContent')) {
                baseUrl = `${baseUrl}/v1beta/models/${API_CONFIG.model}:generateContent`;
            }

            // 补全 Key
            if (!baseUrl.includes('key=') && API_CONFIG.apiKey) {
                baseUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}key=${API_CONFIG.apiKey}`;
            }
            fetchUrl = baseUrl; 

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
            
            // ✨ 核心修复：优先使用 generateRaw
            // 这是一个“纯净”的发送通道，不会自动附带聊天历史或系统提示词
            // 这样就完美符合了“截断”的需求，只有我们在 callAIForSummary 里拼接的内容会被发出去
            if (typeof context.generateRaw === 'function') {
                // 参数：prompt, images, isImpersonate, isQuiet
                // isQuiet=true 表示不显示在聊天框里，也不记录到历史
                const summary = await context.generateRaw(prompt, null, false, true);
                if (summary) return { success: true, summary };
            } 
            
            // 回退方案 (旧版酒馆可能没有 generateRaw)
            if (typeof context.generateQuietPrompt === 'function') {
                const summary = await context.generateQuietPrompt(prompt, false, false);
                if (summary) return { success: true, summary };
            }
            
            return { success: false, error: '酒馆API方法不可用，建议在配置中切换为[独立API]模式' };
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
            // ✨✨✨ 智能构建测试地址 ✨✨✨
            let baseUrl = config.apiUrl.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

            // 自动补全路径
            if (!baseUrl.includes(':generateContent')) {
                baseUrl = `${baseUrl}/v1beta/models/${config.model}:generateContent`;
            }

            if (!baseUrl.includes('key=')) baseUrl += `?key=${config.apiKey}`;
            
            response = await fetch(baseUrl, {
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

        // ============================================================
        // ✨ 修复：恢复默认提示词 (直接引用全局常量，无需重复硬编码)
        // ============================================================
        $('#reset-pmt').on('click', function() {
            
            // 1. 构建选择弹窗 HTML
            const confirmHtml = `
                <div class="g-p">
                    <div style="margin-bottom:12px; color:#666; font-size:12px;">请勾选需要恢复默认的项目：</div>
                    
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; background:rgba(255,255,255,0.5); padding:8px; border-radius:6px;">
                        <input type="checkbox" id="rst-table" checked style="transform:scale(1.2);">
                        <div>
                            <div style="font-weight:bold;">📋 填表提示词</div>
                            <div style="font-size:10px; color:#888;">(Memory Guide)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; background:rgba(255,255,255,0.5); padding:8px; border-radius:6px;">
                        <input type="checkbox" id="rst-sum-table" checked style="transform:scale(1.2);">
                        <div>
                            <div style="font-weight:bold;">📊 表格总结提示词</div>
                            <div style="font-size:10px; color:#888;">(基于表格数据的总结指令)</div>
                        </div>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:8px; margin-bottom:10px; cursor:pointer; background:rgba(255,255,255,0.5); padding:8px; border-radius:6px;">
                        <input type="checkbox" id="rst-sum-chat" checked style="transform:scale(1.2);">
                        <div>
                            <div style="font-weight:bold;">💬 聊天总结提示词</div>
                            <div style="font-size:10px; color:#888;">(基于对话历史的史官笔法)</div>
                        </div>
                    </label>

                    <div style="margin-top:15px; font-size:11px; color:#dc3545; text-align:center;">
                        ⚠️ 注意：点击确定后，现有内容将被覆盖！
                    </div>
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button id="rst-cancel" style="flex:1; background:#6c757d; border:none; color:#fff; padding:8px; border-radius:4px; cursor:pointer;">取消</button>
                        <button id="rst-confirm" style="flex:1; background:${UI.c}; border:none; color:#fff; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">确定恢复</button>
                    </div>
                </div>
            `;

            // 2. 显示弹窗
            $('#g-reset-pop').remove();
            const $o = $('<div>', { id: 'g-reset-pop', class: 'g-ov', css: { 'z-index': '10000010' } });
            const $p = $('<div>', { class: 'g-w', css: { width: '350px', maxWidth: '90vw', height: 'auto' } });
            const $h = $('<div>', { class: 'g-hd', html: `<h3 style="color:${UI.tc};">🔄 恢复默认</h3>` });
            const $b = $('<div>', { class: 'g-bd', html: confirmHtml });
            $p.append($h, $b); $o.append($p); $('body').append($o);

            // 3. 绑定事件
            $('#rst-cancel').on('click', () => $o.remove());
            
            $('#rst-confirm').on('click', async function() {
                const restoreTable = $('#rst-table').is(':checked');
                const restoreSumTable = $('#rst-sum-table').is(':checked');
                const restoreSumChat = $('#rst-sum-chat').is(':checked');
                
                let msg = [];
                
                // ✅ 核心：直接引用顶部的全局常量 DEFAULT_...
                
                if (restoreTable) {
                    $('#pmt-table').val(DEFAULT_TABLE_PROMPT);
                    msg.push('填表提示词');
                }
                
                if (restoreSumTable) {
                    tempTablePmt = DEFAULT_SUM_TABLE; 
                    if ($('input[name="pmt-sum-type"]:checked').val() === 'table') {
                        $('#pmt-summary').val(DEFAULT_SUM_TABLE);
                    }
                    msg.push('表格总结');
                }
                
                if (restoreSumChat) {
                    tempChatPmt = DEFAULT_SUM_CHAT; 
                    if ($('input[name="pmt-sum-type"]:checked').val() === 'chat') {
                        $('#pmt-summary').val(DEFAULT_SUM_CHAT);
                    }
                    msg.push('聊天总结');
                }
                
                $o.remove();
                
                if (msg.length > 0) {
                    await customAlert(`✅ 已恢复：${msg.join('、')}\n\n请记得点击【💾 保存设置】以生效！`, '操作成功');
                }
            });
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
                    <span>🎯 手动楼层总结</span>
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
            <button id="open-probe" style="width: 100%; padding: 8px; margin-bottom: 10px; background: #17a2b8; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                🔍 最后发送内容 & Toke
            </button>

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
            
            // ✨ 修复：界面文字同步更新
            $(this).parent().find('strong').text('0');
            
            $('#reset-done-icon').fadeIn().delay(1000).fadeOut();
        });
        
        $('#manual-sum-btn').on('click', async function() {
            const start = parseInt($('#man-start').val());
            const end = parseInt($('#man-end').val());
            if (isNaN(start) || isNaN(end)) { await customAlert('请输入有效的数字', '错误'); return; }
            
            // ✅ 强制使用 'chat' 模式，无视上面的单选框
            const btn = $(this); const oldText = btn.text(); btn.text('⏳').prop('disabled', true);
            
            // 稍微延迟执行以显示 loading
            setTimeout(async () => {
                await callAIForSummary(start, end, 'chat');
                btn.text(oldText).prop('disabled', false);
                // 更新配置存储（可选）
                localStorage.setItem(AK, JSON.stringify(API_CONFIG));
            }, 200);
        });

        // ✨✨✨ 绑定探针按钮事件 ✨✨✨
        $('#open-probe').on('click', function() {
            if (typeof window.Gaigai.showLastRequest === 'function') {
                window.Gaigai.showLastRequest();
            } else {
                customAlert('❌ 探针模块 (probe.js) 尚未加载。\n\n请确保 probe.js 文件存在于同级目录下，并尝试刷新页面。', '错误');
            }
        });

// ✨✨✨ 优化：智能灾难恢复逻辑 ✨✨✨
        $('#rescue-btn').on('click', async function() {
            const btn = $(this);
            const originalText = btn.text();
            btn.text('正在分析备份...');
            
            const currentId = m.gid();
            const currentRows = m.all().reduce((sum, s) => sum + s.r.length, 0);
            
            // 1. 扫描 LocalStorage 里的所有 gg_data
            let candidates = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('gg_data_')) {
                    try {
                        const raw = localStorage.getItem(key);
                        const d = JSON.parse(raw);
                        const count = d.d ? d.d.reduce((sum, sheet) => sum + (sheet.r ? sheet.r.length : 0), 0) : 0;
                        const ts = d.ts || 0;
                        
                        // 只有当这个备份的数据量 > 0，才作为候选
                        if (count > 0) {
                            candidates.push({ key, count, ts, id: d.id });
                        }
                    } catch(e) {}
                }
            }
            
            // 按时间倒序排列（最新的在前）
            candidates.sort((a, b) => b.ts - a.ts);
            
            // 排除掉当前正在使用的这个档（避免恢复自己）
            const bestCandidate = candidates.find(c => c.id !== currentId) || candidates[0];
            
            // 2. 结果判断
            if (bestCandidate) {
                // 如果找到的备份比当前的行数还少，或者时间太久远，提示用户
                const isOlder = bestCandidate.ts < Date.now() - 86400000; // 24小时前
                const dateStr = new Date(bestCandidate.ts).toLocaleString();
                
                let msg = `🔍 找到最近一份有效备份！\n\n`;
                msg += `📅 时间：${dateStr} ${isOlder ? '(⚠️较旧)' : ''}\n`;
                msg += `📊 备份数据量：${bestCandidate.count} 行\n`;
                msg += `📉 当前数据量：${currentRows} 行\n\n`;
                
                if (currentRows === 0 && bestCandidate.count > 0) {
                    msg += `💡 建议：当前表格为空，推荐恢复此备份。`;
                } else if (currentRows > bestCandidate.count) {
                    msg += `⚠️ 警告：备份的数据量比现在少，恢复可能导致数据丢失！`;
                } else {
                    msg += `💡 提示：如果这是您丢失的数据，请点击确定。`;
                }
                
                msg += `\n\n是否覆盖当前表格？`;
                
                if (await customConfirm(msg, '恢复数据')) {
                    const raw = localStorage.getItem(bestCandidate.key);
                    const data = JSON.parse(raw);
                    m.s.forEach((sheet, i) => { if (data.d[i]) sheet.from(data.d[i]); });
                    if (data.summarized) summarizedRows = data.summarized;
                    
                    lastManualEditTime = Date.now();
                    // ✨ 恢复后也更新快照，防止它又没了
                    const currentMsgIndex = (m.ctx() && m.ctx().chat) ? m.ctx().chat.length - 1 : -1;
                    saveSnapshot(currentMsgIndex);
                    
                    m.save();
                    shw(); 
                    await customAlert('✅ 数据已成功恢复！', '成功');
                    $('#g-pop').remove(); 
                    shw(); 
                } else {
                    btn.text(originalText);
                }
            } else {
                await customAlert('❌ 未扫描到任何有效备份。\n\n如果是刚清空，请尝试使用酒馆自带的【恢复上一次对话】。', '未找到');
                btn.text(originalText);
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
    
// ✨✨✨ 核心逻辑：智能切分法 (保留所有System设定 + 最近N条对话) ✨✨✨
function applyContextLimit(chat) {
    // 1. 基础检查：如果没开开关，或者消息太少，直接原样返回
    if (!C.contextLimit || !chat || chat.length <= C.contextLimitCount) return chat;

    // 2. 统计“纯对话”的数量 (User 和 Assistant)
    let dialogueCount = 0;
    chat.forEach(msg => {
        if (msg.role !== 'system') {
            dialogueCount++;
        }
    });

    // 3. 计算需要切掉多少条“旧对话”
    // 比如：总对话 100 条，限制 30 条 -> 需要跳过前 70 条对话
    let skipCount = Math.max(0, dialogueCount - C.contextLimitCount);

    // 如果不需要切，直接返回
    if (skipCount === 0) return chat;

    console.log(`✂️ [隐藏楼层] 触发智能清洗:`);
    console.log(`   - 总消息: ${chat.length} | 纯对话: ${dialogueCount}`);
    console.log(`   - 需保留: ${C.contextLimitCount} | 需切除旧对话: ${skipCount}`);

    // 4. 执行过滤 (Filter)
    // 核心原则：System 永远保留，Dialogue 只保留后 N 条
    let skippedDialogue = 0;
    
    const newChat = chat.filter((msg, index) => {
        // ✅ 规则 A: 系统指令/世界书/人设/插件注入 -> 永远保留！
        if (msg.role === 'system') {
            return true;
        }

        // ✅ 规则 B: 用户的普通对话 -> 按数量切除旧的
        if (skippedDialogue < skipCount) {
            skippedDialogue++;
            // 这是一个旧对话，丢弃它
            // (可选：在这里打印日志看看切了啥)
            return false; 
        }

        // ✅ 规则 C: 剩下的就是最近的对话 -> 保留
        return true;
    });

    console.log(`   - 清洗后剩余: ${newChat.length} (所有系统设定已保护)`);
    return newChat;
}

function opmt(ev) { 
    try { 
        // 1. 基础安全检查
        if (!ev || !ev.detail) return;

        // 🛑 核心修复：白名单机制 (强力过滤)
        // 只捕获以下类型的请求：聊天、重生成、划卡、扮演、继续、群聊
        // 其他所有类型（如 summary, lore, background 等）统统忽略！
        const validTypes = ['chat', 'regenerate', 'swipe', 'impersonate', 'continue', 'group_chat'];
        
        if (ev.detail.type && !validTypes.includes(ev.detail.type)) {
            // 这是一个后台请求，直接忽略，不更新探针
            return;
        }

        // 🛑 二次保险：忽略静默/后台/不更新的请求
        if (ev.detail.isDryRun || ev.detail.quiet || ev.detail.bg || ev.detail.no_update || ev.detail.skip_save) {
            return;
        }

        // 1. 执行隐藏楼层逻辑
        if (C.contextLimit) {
            // ✨✨✨ 修复开始：使用 splice 原地修改数组 ✨✨✨
            const newChat = applyContextLimit(ev.chat);
            
            // 只有当数组真的发生变化时才操作，节省性能
            if (newChat !== ev.chat) {
                // 1. 清空原数组
                ev.chat.splice(0, ev.chat.length);
                // 2. 将新数组的内容推入原数组 (保持内存引用不变)
                // 使用 apply 防止堆栈溢出
                ev.chat.push.apply(ev.chat, newChat);
            }
            // ✨✨✨ 修复结束 ✨✨✨
        }
        
        isRegenerating = false; 

        // 2. 执行注入与清洗逻辑
        inj(ev); 
        
        // 3. 探针捕获 (保持不变)
        window.Gaigai.lastRequestData = {
            chat: JSON.parse(JSON.stringify(ev.chat)), 
            timestamp: Date.now(),
            model: API_CONFIG.model || 'Unknown'
        };
        console.log('✅ [探针] 真实请求数据已捕获 (可随时在配置中查看)');
        
    } catch (e) { 
        console.error('❌ opmt 失败:', e); 
    } 
}

// ✨✨✨ 新功能：UI 折叠逻辑 (v2.7.0 磨砂玻璃+双向分批) ✨✨✨
    function applyUiFold() {
        // 1. 基础检查
        if (!C.uiFold) {
            $('#g-fold-controls').remove();
            $('.mes').show();
            return;
        }

        const $chat = $('#chat');
        if ($chat.length === 0) return;

        const $allMsgs = $chat.find('.mes:not(.g-hidden-tag)');
        const total = $allMsgs.length;
        const keep = C.uiFoldCount || 50;
        const BATCH_SIZE = 10; // ⚡️ 每次 加载/折叠 的数量

        // 如果总数没超过保留数，不需要折叠
        if (total <= keep) {
            $('#g-fold-controls').remove();
            $allMsgs.show();
            return;
        }

        // 2. 状态计算
        const $hidden = $allMsgs.filter(':hidden');
        const $visible = $allMsgs.filter(':visible');
        const controlsExist = $('#g-fold-controls').length > 0;

        // 🛡️ 初始化逻辑修复：只有当控件不存在时，才执行初始强制折叠
        // 防止全部展开后被误判为“刚刷新”，导致自动回缩
        if (!controlsExist && $hidden.length === 0 && $visible.length === total) {
            const hideCount = total - keep;
            $allMsgs.slice(0, hideCount).css('display', 'none');
            // 递归调用一次以渲染按钮
            return setTimeout(applyUiFold, 0);
        }

        // 重新获取状态
        const hiddenCount = $allMsgs.filter(':hidden').length;
        const visibleCount = $allMsgs.filter(':visible').length;

        // 3. 构建 UI (毛玻璃风格)
        $('#g-fold-controls').remove(); // 移除旧的，重新画

        const $container = $('<div>', {
            id: 'g-fold-controls',
            css: {
                'display': 'flex', 'justify-content': 'center', 'gap': '12px',
                'margin': '15px auto 10px auto', 'width': '90%', 'max-width': '500px',
                'user-select': 'none', 'z-index': '5',
                'transition': 'all 0.3s ease'
            }
        });

        // 通用按钮样式 (毛玻璃)
        const glassStyle = {
            'flex': '1',
            'min-width': '100px', 'max-width': '180px', // 限制宽度，不长不短
            'padding': '6px 12px',
            'text-align': 'center',
            'font-size': '12px', 'font-weight': '600',
            'color': UI.tc || '#fff',
            'border-radius': '20px', // 圆润
            'cursor': 'pointer',
            'transition': 'all 0.2s',
            // ✨ 核心美化：磨砂玻璃效果 ✨
            'background': 'rgba(150, 150, 150, 0.2)', // 半透明底
            'backdrop-filter': 'blur(8px)',           // 背景模糊
            '-webkit-backdrop-filter': 'blur(8px)',
            'border': '1px solid rgba(255, 255, 255, 0.2)', // 淡淡的边框
            'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.1)'
        };

        // === 按钮 A：向下加载 (显示更多历史) ===
        if (hiddenCount > 0) {
            const loadCount = Math.min(hiddenCount, BATCH_SIZE);
            const $loadBtn = $('<div>', {
                html: `<i class="fa-solid fa-clock-rotate-left"></i> 再看 ${loadCount} 条`,
                title: `上方还有 ${hiddenCount} 条历史记录`,
                css: glassStyle
            }).hover(
                function() { $(this).css({ 'background': 'rgba(150, 150, 150, 0.3)', 'transform': 'translateY(-1px)' }); },
                function() { $(this).css({ 'background': 'rgba(150, 150, 150, 0.2)', 'transform': 'translateY(0)' }); }
            ).on('click', function() {
                // 取出最后面的 BATCH_SIZE 条隐藏消息
                const $toShow = $allMsgs.filter(':hidden').slice(-loadCount);
                
                // 动画显示
                $toShow.css('opacity', 0).css('display', '').animate({ opacity: 1 }, 200);
                
                // 刷新UI
                setTimeout(applyUiFold, 10);
            });
            $container.append($loadBtn);
        }

        // === 按钮 B：向上折叠 (隐藏顶部历史) ===
        // 只有当显示的条数 > 保留数时才出现
        if (visibleCount > keep) {
            // 比如显示了30条，保留10条，多出了20条。
            // 并不是一次性折叠20条，而是折叠 BATCH_SIZE (10条)，或者剩余的零头。
            const excess = visibleCount - keep;
            const foldCount = Math.min(excess, BATCH_SIZE);
            
            const $foldBtn = $('<div>', {
                html: `<i class="fa-solid fa-angles-up"></i> 收起 ${foldCount} 条`,
                title: `已展开 ${visibleCount} 条，点击分批收起`,
                css: { ...glassStyle, 'background': 'rgba(255, 100, 100, 0.15)', 'border-color': 'rgba(255, 100, 100, 0.3)' } // 稍微带点红色
            }).hover(
                function() { $(this).css({ 'background': 'rgba(255, 100, 100, 0.25)', 'transform': 'translateY(-1px)' }); },
                function() { $(this).css({ 'background': 'rgba(255, 100, 100, 0.15)', 'transform': 'translateY(0)' }); }
            ).on('click', function() {
                // 找到显示的消息中的“最上面”那几条
                const $toHide = $allMsgs.filter(':visible').slice(0, foldCount);
                
                // 动画隐藏
                $toHide.animate({ opacity: 0 }, 200, function() {
                    $(this).css('display', 'none');
                    // 动画结束后刷新UI，防止闪烁
                    if ($(this).is($toHide.last())) {
                        setTimeout(applyUiFold, 0);
                    }
                });
            });
            $container.append($foldBtn);
        }

        // 4. 插入位置：永远在第一条可见消息的头顶
        const $firstVisible = $allMsgs.filter(':visible').first();
        if ($firstVisible.length > 0) {
            $firstVisible.before($container);
        } else {
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
    ui: UI,
    config_obj: C,
    esc: esc,
    pop: pop,
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

// ✨✨✨ 重写：关于页 & 更新检查 & 首次弹窗 (颜色修复版) ✨✨✨
    function showAbout(isAutoPopup = false) {
        const cleanVer = V.replace(/^v+/i, '');
        const repoUrl = `https://github.com/${REPO_PATH}`;
        
        // 检查是否已经勾选过“不再显示”
        const isChecked = localStorage.getItem('gg_notice_ver') === V;
        
        // 统一使用 #333 作为文字颜色，确保在白色磨砂背景上清晰可见
        const textColor = '#333333';
        
const h = `
        <div class="g-p" style="display:flex; flex-direction:column; gap:12px; height:100%;">
            <div style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:8px; padding:12px; text-align:center; flex-shrink:0;">
                <div style="font-size:18px; font-weight:bold; margin-bottom:5px; color:${textColor};">
                    📘 记忆表格 (Memory Context)
                </div>
                <div style="font-size:12px; opacity:0.8; margin-bottom:8px; color:${textColor};">当前版本: v${cleanVer}</div>
                <div id="update-status" style="background:rgba(0,0,0,0.05); padding:6px; border-radius:4px; font-size:11px; display:flex; align-items:center; justify-content:center; gap:8px; color:${textColor};">
                    <i class="fa-solid fa-spinner fa-spin"></i> 正在连接 GitHub 检查更新...
                </div>
            </div>

            <div style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.4); border-radius:8px; padding:15px; font-size:13px; line-height:1.6; border:1px solid rgba(255,255,255,0.3);">
                
                <div style="background:rgba(255, 165, 0, 0.15); border:1px solid rgba(255, 140, 0, 0.4); border-radius:6px; padding:10px; margin-bottom:15px; color:#d35400; font-size:12px; display:flex; align-items:start; gap:8px;">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-top:3px;"></i>
                    <div>
                        <strong>更新/操作前必读：</strong><br>
                        为了防止数据意外丢失，强烈建议在<strong>每次更新插件文件</strong>之前，点击主界面的【📥 导出】按钮备份您的记忆数据！
                    </div>
                </div>
                <h4 style="margin-top:0; border-bottom:1px dashed rgba(0,0,0,0.1); padding-bottom:5px; color:${textColor};">📉 关键区别 (必读)</h4>
                <div style="margin-bottom:15px; font-size:12px; color:${textColor}; background:rgba(255,255,255,0.3); padding:8px; border-radius:6px;">
                    <div style="margin-bottom:8px;">
                        <strong>👁️ UI 楼层折叠：</strong><br>
                        <span style="opacity:0.8;">仅在网页界面上收起旧消息，防止页面卡顿。</span><br>
                        <span style="font-size:11px; font-weight:bold; opacity:0.9;">👉 AI 依然能收到被折叠的楼层内容。</span>
                    </div>
                    <div>
                        <strong>✂️ 隐藏楼层 (隐藏上下文)：</strong><br>
                        <span style="opacity:0.8;">在发送请求时切除中间旧消息，仅保留人设和最近对话。</span><br>
                        <span style="font-size:11px; font-weight:bold; opacity:0.9;">👉 大幅省Token，AI看不见旧内容(建议配合表格记忆)。</span>
                    </div>
                </div>

                <h4 style="border-bottom:1px dashed rgba(0,0,0,0.1); padding-bottom:5px; color:${textColor};">💡 推荐用法</h4>
                <ul style="margin:0; padding-left:20px; font-size:12px; color:${textColor}; margin-bottom:15px;">
                    <li><strong>方案 A (省钱流)：</strong> 开启[记忆表格] + [隐藏楼层]。AI靠表格记事，靠隐藏楼层省Token。</li>
                    <li><strong>方案 B (史官流)：</strong> 关闭[记忆表格]，使用[聊天总结]。即使关闭记忆，总结功能依然可用。</li>
                </ul>

                <h4 style="border-bottom:1px dashed rgba(0,0,0,0.1); padding-bottom:5px; color:${textColor};">📍 注入位置</h4>
                <div style="margin-bottom:15px; font-size:12px; color:${textColor};">
                    默认相对位置注入到 <strong>System Prompt (系统预设)</strong> 的最末尾，可在配置中修改，可通过【最后发送内容 & Toke】功能查看。
                </div>

                <h4 style="border-bottom:1px dashed rgba(0,0,0,0.1); padding-bottom:5px; color:${textColor};">✨ 核心功能</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:12px; color:${textColor};">
                    <span>✅ <strong>自动记录：</strong> 智能提取剧情/物品</span>
                    <span>✅ <strong>隐藏楼层：</strong> 智能压缩历史记录</span>
                    <span>✅ <strong>折叠楼层：</strong> 聊天楼层折叠收纳</span>
                    <span>✅ <strong>双模总结：</strong> 支持表格/聊天记录源</span>
                    <span>✅ <strong>独立 API：</strong> 支持单独配置总结模型</span>
                    <span>✅ <strong>灾难恢复：</strong> 支持快照回档/数据扫描</span>
                    <span>✅ <strong>完全编辑：</strong> 支持长按编辑/拖拽列宽</span>
                    <span>✅ <strong>数据探针：</strong> 一键核查发送给AI的真实内容</span>
                </div>
                
                <div style="margin-top:15px; font-size:11px; text-align:center; opacity:0.7;">
                    <a href="${repoUrl}" target="_blank" style="text-decoration:none; color:${textColor}; border-bottom:1px dashed ${textColor};">
                        <i class="fa-brands fa-github"></i> 访问 GitHub 项目主页
                    </a>
                </div>
            </div>

            <div style="padding-top:5px; border-top:1px solid rgba(255,255,255,0.2); text-align:right; flex-shrink:0;">
                <label style="font-size:12px; cursor:pointer; user-select:none; display:inline-flex; align-items:center; gap:6px; color:${textColor}; opacity:0.9;">
                    <input type="checkbox" id="dont-show-again" ${isChecked ? 'checked' : ''}>
                    不再自动弹出 v${cleanVer} 说明
                </label>
            </div>
        </div>`;
        
        $('#g-about-pop').remove();
        const $o = $('<div>', { id: 'g-about-pop', class: 'g-ov', css: { 'z-index': '10000002' } });
        const $p = $('<div>', { class: 'g-w', css: { width: '500px', maxWidth: '90vw', height: '650px', maxHeight:'85vh' } });
        const $hd = $('<div>', { class: 'g-hd' });
        
        const titleText = isAutoPopup ? '🎉 欢迎使用新版本' : '关于 & 指南';
        $hd.append(`<h3 style="color:${UI.tc}; flex:1;">${titleText}</h3>`);
        
        const $x = $('<button>', { class: 'g-x', text: '×', css: { background: 'none', border: 'none', color: UI.tc, cursor: 'pointer', fontSize: '22px' } }).on('click', () => $o.remove());
        $hd.append($x);
        
        const $bd = $('<div>', { class: 'g-bd', html: h });
        $p.append($hd, $bd);
        $o.append($p);
        $('body').append($o);
        
        setTimeout(() => {
            $('#dont-show-again').on('change', function() {
                if ($(this).is(':checked')) {
                    localStorage.setItem('gg_notice_ver', V);
                } else {
                    localStorage.removeItem('gg_notice_ver');
                }
            });
            checkForUpdates(cleanVer);
        }, 100);
        
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

// ✨✨✨ 探针模块 (内置版) ✨✨✨
(function() {
    console.log('🔍 探针模块 (内置版) 已启动');

    // 1. Token 计算辅助函数
    function countTokens(text) {
        if (!text) return 0;
        try {
            if (window.GPT3Tokenizer) {
                const tokenizer = new window.GPT3Tokenizer({ type: 'gpt3' }); 
                return tokenizer.encode(text).bpe.length;
            }
            const ctx = SillyTavern.getContext();
            if (ctx && ctx.encode) return ctx.encode(text).length;
        } catch (e) {}
        return text.length; 
    }

    // 2. 挂载显示函数到 Gaigai 对象
    // 必须等待 index.js 主体执行完，Gaigai 对象挂载后才能执行
    setTimeout(() => {
        if (!window.Gaigai) return;
        
window.Gaigai.showLastRequest = function() {
            const lastData = window.Gaigai.lastRequestData;
            if (!lastData || !lastData.chat) {
                const alertFn = window.Gaigai.pop ? (msg) => alert(msg) : alert;
                alertFn('❌ 暂无记录！\n\n请先去发送一条消息，插件会自动捕获发送内容。');
                return;
            }

            let UI = { c: '#9c4c4c' }; 
            try {
                const savedUI = localStorage.getItem('gg_ui');
                if (savedUI) UI = JSON.parse(savedUI);
                else if (window.Gaigai.ui) UI = window.Gaigai.ui;
            } catch (e) {}
            
            const esc = window.Gaigai.esc || ((t) => t);
            const pop = window.Gaigai.pop;
            const chat = lastData.chat;
            let totalTokens = 0; // 初始化计数器
            let listHtml = '';

            // 生成列表并计算 Token
            chat.forEach((msg, idx) => {
                const content = msg.content || '';
                // 简单的估算Token，仅供参考
                const tokens = (msg.content && msg.content.length) ? Math.ceil(msg.content.length / 1.5) : 0; 
                totalTokens += tokens;
                
                let roleName = msg.role.toUpperCase();
                let roleColor = '#666';
                let icon = '📄';

                if (msg.role === 'system') {
                    roleName = 'SYSTEM (系统)';
                    roleColor = '#28a745'; icon = '⚙️';
                    if (msg.isGaigaiData) { roleName = 'MEMORY (记忆表格)'; roleColor = '#d35400'; icon = '📊'; }
                    if (msg.isGaigaiPrompt) { roleName = 'PROMPT (提示词)'; roleColor = '#e67e22'; icon = '📌'; }
                } else if (msg.role === 'user') {
                    roleName = 'USER (用户)'; roleColor = '#2980b9'; icon = '🧑';
                } else if (msg.role === 'assistant') {
                    roleName = 'ASSISTANT (AI)'; roleColor = '#8e44ad'; icon = '🤖';
                }

                listHtml += `
                <details class="g-probe-item" style="margin-bottom:8px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; background:rgba(255,255,255,0.5);">
                    <summary style="padding:10px; background:rgba(255,255,255,0.8); cursor:pointer; list-style:none; display:flex; justify-content:space-between; align-items:center; user-select:none; outline:none;">
                        <div style="font-weight:bold; color:${roleColor}; font-size:12px; display:flex; align-items:center; gap:6px;">
                            <span>${icon}</span>
                            <span>${roleName}</span>
                            <span style="background:rgba(0,0,0,0.05); color:#666; padding:1px 5px; border-radius:4px; font-size:10px; font-weight:normal;">#${idx}</span>
                        </div>
                        <div style="font-size:11px; font-family:monospace; color:#555; background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:4px;">
                            ${tokens} TK
                        </div>
                    </summary>
                    <div class="g-probe-content" style="padding:10px; font-size:12px; line-height:1.6; color:#333; border-top:1px solid rgba(0,0,0,0.05); white-space:pre-wrap; font-family:'Segoe UI', monospace; word-break:break-word; max-height: 500px; overflow-y: auto; background: rgba(255,255,255,0.3);">${esc(content)}</div>
                </details>`;
            });

            const h = `
            <div class="g-p" style="padding:15px; height:100%; display:flex; flex-direction:column;">
                <div style="flex:0 0 auto; background: linear-gradient(135deg, ${UI.c}EE, ${UI.c}99); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.25); color:#fff; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <div style="font-size:12px; opacity:0.9;">Total Tokens</div>
                            <div style="font-size:24px; font-weight:bold;">${totalTokens}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px; opacity:0.9;">Messages</div>
                            <div style="font-size:18px; font-weight:bold;">${chat.length} 条</div>
                        </div>
                    </div>
                    <div style="position:relative;">
                        <input type="text" id="g-probe-search-input" placeholder="🔍 搜索..." 
                            style="width:100%; padding:8px 10px; padding-left:30px; border:1px solid rgba(255,255,255,0.3); border-radius:4px; background:rgba(0,0,0,0.2); color:#fff; font-size:12px; outline:none;">
                        <i class="fa-solid fa-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.6); font-size:12px;"></i>
                    </div>
                </div>
                <div id="g-probe-list" style="flex:1; overflow-y:auto; padding-right:5px;">${listHtml}</div>
            </div>`;

            if (pop) {
                pop('🔍 最后发送内容 & Toke', h, true);
                setTimeout(() => {
                    $('#g-probe-search-input').on('input', function() {
                        const val = $(this).val().toLowerCase().trim();
                        $('.g-probe-item').each(function() {
                            const $details = $(this);
                            const text = $details.find('.g-probe-content').text().toLowerCase();
                            if (!val) {
                                $details.show().removeAttr('open').css('border', '1px solid rgba(0,0,0,0.1)'); 
                            } else if (text.includes(val)) {
                                $details.show().attr('open', true).css('border', `2px solid ${UI.c}`); 
                            } else {
                                $details.hide();
                            }
                        });
                    });
                }, 100);
            } else alert('UI库未加载');
        };
    }, 500); // 延迟500毫秒确保 window.Gaigai 已挂载
})();
})();










