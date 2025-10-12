// Gaigai v0.7.0 - API+云同步+提示词管理+大编辑框
(function() {
    'use strict';
    
    if (window.GaigaiLoaded) {
        console.warn('⚠️ Gaigai已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 Gaigai v0.7.0 启动');
    
    const V = '0.7.0';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    const SMK = 'gg_summary';
    const PK = 'gg_prompts'; // 提示词配置
    
    // UI配置
    let UI = { c: '#9c4c4c', o: 95, g: true };
    
    // 功能配置
    const C = { 
        inj: true, 
        pos: 'system', 
        d: 0, 
        log: true, 
        pc: true,
        hideTag: true,
        useSummary: false,
        filterHistory: true,
        cloudSync: true,
        apiEnabled: true, // API开关
        apiPort: 8100 // API端口
    };
    
    // ✅ 提示词模板配置
    let PROMPTS = {
        tablePrefix: '=== 📚 记忆表格 ===\n\n',
        tableSuffix: '\n=== 表格结束 ===\n',
        summaryPrefix: '=== 📚 记忆总结 ===\n\n',
        summarySuffix: '\n\n=== 总结结束 ===\n',
        customTemplate: '' // 自定义模板
    };
    
    // ✅ 记忆标签正则表达式
    const MEMORY_TAG_REGEX = /<(GaigaiMemory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
    
    // ✅ 表格定义（删除了主线剧情的"关键物品"列）
    const T = [
        { n: '主线剧情', c: ['剧情名', '开始时间', '完结时间', '地点', '事件概要', '承诺/约定', '状态'] },
        { n: '支线追踪', c: ['支线名', '开始时间', '完结时间', '事件进展', '状态', '关键NPC'] },
        { n: '角色状态', c: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
        { n: '人物档案', c: ['姓名', '年龄', '身份', '地点', '性格', '对user态度'] },
        { n: '人物关系', c: ['角色A', '角色B', '关系描述'] },
        { n: '世界设定', c: ['设定名', '类型', '详细说明', '影响范围'] },
        { n: '物品追踪', c: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注'] }
    ];
    
    // Sheet类
    class S {
        constructor(n, c) {
            this.n = n;
            this.c = c;
            this.r = [];
        }
        upd(i, d) {
            while (this.r.length <= i) this.r.push({});
            Object.entries(d).forEach(([k, v]) => this.r[i][k] = v);
        }
        ins(d) { this.r.push(d); }
        del(i) { if (i >= 0 && i < this.r.length) this.r.splice(i, 1); }
        clear() { this.r = []; }
        json() { return { n: this.n, c: this.c, r: this.r }; }
        from(d) {
            this.n = d.n || this.n;
            this.c = d.c || this.c;
            this.r = d.r || [];
        }
        txt() {
            if (this.r.length === 0) return `【${this.n}】：无数据`;
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
    
    // 总结管理器
    class SM {
        constructor() {
            this.txt = '';
            this.ts = null;
        }
        save(id) {
            try {
                localStorage.setItem(`${SMK}_${id}`, JSON.stringify({
                    txt: this.txt,
                    ts: this.ts
                }));
            } catch (e) {}
        }
        load(id) {
            try {
                const d = localStorage.getItem(`${SMK}_${id}`);
                if (d) {
                    const p = JSON.parse(d);
                    this.txt = p.txt || '';
                    this.ts = p.ts || null;
                }
            } catch (e) {}
        }
        clear(id) {
            this.txt = '';
            this.ts = null;
            try {
                localStorage.removeItem(`${SMK}_${id}`);
            } catch (e) {}
        }
        has() { return this.txt.length > 0; }
    }
    
    // 管理器
    class M {
        constructor() {
            this.s = [];
            this.id = null;
            this.sm = new SM();
            T.forEach(tb => this.s.push(new S(tb.n, tb.c)));
        }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        
        // ✅ 云同步：保存到 chat_metadata
        save() {
            const id = this.gid();
            if (!id) return;
            
            const data = {
                v: V,
                id: id,
                ts: Date.now(),
                d: this.s.map(sh => sh.json())
            };
            
            // 本地存储（备份）
            try {
                localStorage.setItem(`${SK}_${id}`, JSON.stringify(data));
            } catch (e) {}
            
            // ✅ 云同步：保存到聊天元数据
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chat_metadata) {
                        if (!ctx.chat_metadata.gaigai) ctx.chat_metadata.gaigai = {};
                        ctx.chat_metadata.gaigai.data = data;
                        ctx.chat_metadata.gaigai.version = V;
                        ctx.saveMetadata();
                        console.log('☁️ 数据已同步到云端', data);
                    }
                } catch (e) {
                    console.warn('⚠️ 云同步失败:', e);
                }
            }
        }
        
        // ✅ 云同步：从 chat_metadata 加载
        load() {
            const id = this.gid();
            if (!id) return;
            if (this.id !== id) {
                this.id = id;
                this.s = [];
                T.forEach(tb => this.s.push(new S(tb.n, tb.c)));
                this.sm = new SM();
            }
            
            let loaded = false;
            
            // ✅ 优先从云端加载
            if (C.cloudSync) {
                try {
                    const ctx = this.ctx();
                    if (ctx && ctx.chat_metadata && ctx.chat_metadata.gaigai && ctx.chat_metadata.gaigai.data) {
                        const d = ctx.chat_metadata.gaigai.data;
                        d.d.forEach((sd, i) => {
                            if (this.s[i]) this.s[i].from(sd);
                        });
                        loaded = true;
                        console.log('☁️ 从云端加载数据', d);
                    }
                } catch (e) {
                    console.warn('⚠️ 云端加载失败，尝试本地:', e);
                }
            }
            
            // 如果云端没有，从本地加载
            if (!loaded) {
                try {
                    const sv = localStorage.getItem(`${SK}_${id}`);
                    if (sv) {
                        const d = JSON.parse(sv);
                        d.d.forEach((sd, i) => {
                            if (this.s[i]) this.s[i].from(sd);
                        });
                        console.log('💾 从本地加载数据');
                    }
                } catch (e) {}
            }
            
            this.sm.load(id);
        }
        
        gid() {
            try {
                const x = this.ctx();
                if (!x) return 'def';
                if (C.pc) {
                    const ch = x.name2 || 'unk';
                    const ct = x.chat_metadata?.file_name || 'main';
                    return `${ch}_${ct}`;
                }
                return x.chat_metadata?.file_name || 'def';
            } catch (e) {
                return 'def';
            }
        }
        ctx() {
            return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
        }
        pmt() {
            if (C.useSummary && this.sm.has()) {
                return PROMPTS.summaryPrefix + this.sm.txt + PROMPTS.summarySuffix;
            }
            
            const sh = this.s.filter(s => s.r.length > 0);
            if (sh.length === 0) return '';
            
            if (PROMPTS.customTemplate) {
                // 使用自定义模板
                let result = PROMPTS.customTemplate;
                sh.forEach(s => {
                    result = result.replace(`{{${s.n}}}`, s.txt());
                });
                return result;
            }
            
            // 默认格式
            let t = PROMPTS.tablePrefix;
            sh.forEach(s => t += s.txt() + '\n');
            t += PROMPTS.tableSuffix;
            return t;
        }
    }
    
    const m = new M();
    
    // ✅ 清理文本中的记忆标签
    function cleanMemoryTags(text) {
        if (!text) return text;
        return text.replace(MEMORY_TAG_REGEX, '').trim();
    }
    
    // 解析（支持HTML注释格式）
    function prs(tx) {
        const cs = [];
        const rg = MEMORY_TAG_REGEX;
        let mt;
        while ((mt = rg.exec(tx)) !== null) {
            let cn = mt[2]
                .replace(/<!--/g, '')
                .replace(/-->/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            ['insertRow', 'updateRow', 'deleteRow'].forEach(fn => {
                let si = 0;
                while (true) {
                    const fi = cn.indexOf(fn + '(', si);
                    if (fi === -1) break;
                    let dp = 0, ei = -1;
                    for (let i = fi + fn.length; i < cn.length; i++) {
                        if (cn[i] === '(') dp++;
                        if (cn[i] === ')') {
                            dp--;
                            if (dp === 0) { ei = i; break; }
                        }
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
        } catch (e) {
            console.warn('⚠️ 解析参数失败:', s, e);
        }
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
    
    // ✅ 只过滤AI回复中的标签
    function inj(ev) {
        if (!C.inj) {
            console.log('⚠️ [INJECT] 注入功能已关闭');
            return;
        }
        
        if (C.filterHistory) {
            let cleanedCount = 0;
            ev.chat.forEach(msg => {
                if (msg.role === 'assistant' && msg.content && MEMORY_TAG_REGEX.test(msg.content)) {
                    const original = msg.content;
                    msg.content = cleanMemoryTags(msg.content);
                    if (original !== msg.content) {
                        cleanedCount++;
                    }
                }
            });
            if (cleanedCount > 0) {
                console.log(`🧹 [FILTER] 已清理 ${cleanedCount} 条AI历史回复中的记忆标签`);
            }
        }
        
        const p = m.pmt();
        if (!p) {
            console.log('ℹ️ [INJECT] 无表格数据，跳过注入');
            return;
        }
        
        let rl = 'system', ps = ev.chat.length;
        
        // ✅ 支持更多注入位置
        switch(C.pos) {
            case 'system':
                rl = 'system';
                ps = 0;
                break;
            case 'user':
                rl = 'user';
                ps = Math.max(0, ev.chat.length - C.d);
                break;
            case 'before_last':
                rl = 'system';
                ps = Math.max(0, ev.chat.length - 1 - C.d);
                break;
            case 'assistant':
                rl = 'assistant';
                ps = Math.max(0, ev.chat.length - C.d);
                break;
            case 'world_info_before':
                rl = 'system';
                ps = 1; // 在世界书之前
                break;
            case 'world_info_after':
                rl = 'system';
                ps = 2; // 在世界书之后
                break;
            default:
                rl = 'system';
                ps = 0;
        }
        
        ev.chat.splice(ps, 0, { role: rl, content: p });
        
        console.log('%c✅ [INJECT SUCCESS]', 'color: green; font-weight: bold; font-size: 12px;');
        console.log(`📍 注入位置: ${C.pos} (索引: ${ps}/${ev.chat.length})`);
        console.log(`👤 消息角色: ${rl}`);
        console.log(`📊 数据长度: ${p.length} 字符`);
        console.log(`📋 模式: ${C.useSummary && m.sm.has() ? '总结模式' : '详细表格'}`);
        
        if (C.log) {
            console.log('%c📝 注入内容:', 'color: blue; font-weight: bold;');
            console.log(p);
        }
        
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: green;');
    }
    
    // 隐藏记忆标签
    function hideMemoryTags() {
        if (!C.hideTag) return;
        
        $('.mes_text').each(function() {
            const $this = $(this);
            let html = $this.html();
            if (!html) return;
            
            html = html.replace(
                MEMORY_TAG_REGEX,
                '<div class="g-hidden-tag" style="display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;">$&</div>'
            );
            
            $this.html(html);
        });
    }
    
    // UI
    function thm() {
        document.documentElement.style.setProperty('--g-c', UI.c);
        document.documentElement.style.setProperty('--g-o', UI.o / 100);
    }
    
    function pop(ttl, htm, isLarge = false) {
        $('#g-pop').remove();
        thm();
        const $o = $('<div>', { id: 'g-pop', class: 'g-ov' });
        const $p = $('<div>', { class: (UI.g ? 'g-w g-gl' : 'g-w') + (isLarge ? ' g-w-edit' : '') });
        const $h = $('<div>', { class: 'g-hd', html: `<h3>${ttl}</h3>` });
        const $x = $('<button>', { class: 'g-x', text: '×' }).on('click', () => $o.remove());
        const $b = $('<div>', { class: 'g-bd', html: htm });
        $h.append($x);
        $p.append($h, $b);
        $o.append($p);
        $o.on('click', e => { if (e.target === $o[0]) $o.remove(); });
        $(document).on('keydown.g', e => { if (e.key === 'Escape') { $o.remove(); $(document).off('keydown.g'); } });
        $('body').append($o);
        return $p;
    }
    
    // ✅ 大编辑框弹窗（修复嵌套问题）
    function showBigEditor(ti, ri, ci, currentValue) {
        const sh = m.get(ti);
        const colName = sh.c[ci];
        
        const h = `
            <div class="g-p">
                <h4>✏️ 编辑单元格</h4>
                <p style="color:#666; font-size:11px; margin-bottom:10px;">
                    表格：<strong>${sh.n}</strong> | 
                    行：<strong>${ri}</strong> | 
                    列：<strong>${colName}</strong>
                </p>
                <textarea id="big-editor" style="
                    width:100%; 
                    height:300px; 
                    padding:10px; 
                    border:1px solid #ddd; 
                    border-radius:4px; 
                    font-size:12px; 
                    font-family:inherit; 
                    resize:vertical;
                    line-height:1.6;
                ">${esc(currentValue)}</textarea>
                <div style="margin-top:12px;">
                    <button id="save-edit" style="padding:6px 12px; background:var(--g-c); color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存</button>
                    <button id="cancel-edit" style="padding:6px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">取消</button>
                </div>
            </div>
        `;
        
        // 使用更高的z-index创建编辑弹窗
        $('#g-edit-pop').remove();
        const $o = $('<div>', { id: 'g-edit-pop', class: 'g-ov', css: { 'z-index': '10000000' } });
        const $p = $('<div>', { class: UI.g ? 'g-w g-gl g-w-edit' : 'g-w g-w-edit' });
        const $hd = $('<div>', { class: 'g-hd', html: '<h3>✏️ 编辑内容</h3>' });
        const $x = $('<button>', { class: 'g-x', text: '×' }).on('click', () => $o.remove());
        const $bd = $('<div>', { class: 'g-bd', html: h });
        $hd.append($x);
        $p.append($hd, $bd);
        $o.append($p);
        $('body').append($o);
        
        setTimeout(() => {
            $('#big-editor').focus();
            
            $('#save-edit').on('click', function() {
                const newValue = $('#big-editor').val();
                const d = {};
                d[ci] = newValue;
                sh.upd(ri, d);
                m.save();
                
                // 更新原单元格显示
                $(`.g-e[data-r="${ri}"][data-c="${ci}"]`).text(newValue);
                
                $o.remove();
            });
            
            $('#cancel-edit').on('click', () => $o.remove());
        }, 100);
    }
    
    function shw() {
        const ss = m.all();
        
        const tbs = ss.map((s, i) => {
            const count = s.r.length;
            return `<button class="g-t${i === 0 ? ' act' : ''}" data-i="${i}">${s.n} (${count})</button>`;
        }).join('');
        
        const tls = `
            <input type="text" id="g-src" placeholder="搜索">
            <button id="g-ad" title="新增行">➕ 新增</button>
            <button id="g-dr" title="删除选中行" style="background:#dc3545;">🗑️ 删除选中</button>
            <button id="g-sm" title="生成AI总结">📝 总结</button>
            <button id="g-ex" title="导出数据">📥 导出</button>
            <button id="g-ca" title="清空所有表格">🗑️ 全清</button>
            <button id="g-tm" title="主题设置">🎨</button>
            <button id="g-cf" title="配置">⚙️</button>
        `;
        
        const tbls = ss.map((s, i) => gtb(s, i)).join('');
        
        const h = `
            <div class="g-vw">
                <div class="g-ts">${tbs}</div>
                <div class="g-tl">${tls}</div>
                <div class="g-tb">${tbls}</div>
            </div>
        `;
        
        pop('📚 Gaigai v' + V, h);
        setTimeout(bnd, 100);
    }
    
    function gtb(s, ti) {
        const v = ti === 0 ? '' : 'display:none;';
        let h = `<div class="g-tbc" data-i="${ti}" style="${v}">`;
        h += '<div class="g-tbl-wrap"><table>';
        
        h += '<thead class="g-sticky"><tr>';
        h += '<th class="g-col-num">#</th>';
        s.c.forEach(c => h += `<th>${esc(c)}</th>`);
        h += '</tr></thead>';
        
        h += '<tbody>';
        if (s.r.length === 0) {
            h += `<tr class="g-emp"><td colspan="${s.c.length + 1}">暂无数据</td></tr>`;
        } else {
            s.r.forEach((rw, ri) => {
                h += `<tr data-r="${ri}" class="g-row">`;
                h += `<td class="g-col-num"><div class="g-n">${ri}</div></td>`;
                s.c.forEach((c, ci) => {
                    const val = rw[ci] || '';
                    h += `<td><div class="g-e" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(val)}</div></td>`;
                });
                h += '</tr>';
            });
        }
        h += '</tbody></table></div></div>';
        return h;
    }
    
    let selectedRow = null;
    let selectedTableIndex = null;
    
    function bnd() {
        $('.g-t').on('click', function() {
            const i = $(this).data('i');
            $('.g-t').removeClass('act');
            $(this).addClass('act');
            $('.g-tbc').hide();
            $(`.g-tbc[data-i="${i}"]`).show();
            selectedRow = null;
            selectedTableIndex = i;
            $('.g-row').removeClass('g-selected');
        });
        
        // ✅ 双击单元格打开大编辑框
        $(document).off('dblclick', '.g-e').on('dblclick', '.g-e', function(e) {
            e.stopPropagation();
            const ti = parseInt($('.g-t.act').data('i'));
            const ri = parseInt($(this).data('r'));
            const ci = parseInt($(this).data('c'));
            const val = $(this).text();
            showBigEditor(ti, ri, ci, val);
        });
        
        // 单行编辑
        $(document).off('blur', '.g-e').on('blur', '.g-e', function() {
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
        
        // ✅ 选中行（点击行号或整行）
        $(document).off('click', '.g-row, .g-n').on('click', '.g-row, .g-n', function(e) {
            // 防止点击单元格时选中
            if ($(e.target).hasClass('g-e') || $(e.target).closest('.g-e').length > 0) return;
            
            const $row = $(this).closest('.g-row');
            $('.g-row').removeClass('g-selected');
            $row.addClass('g-selected');
            selectedRow = parseInt($row.data('r'));
            selectedTableIndex = parseInt($('.g-t.act').data('i'));
        });
        
        // ✅ 删除选中行按钮
        $('#g-dr').off('click').on('click', function() {
            if (selectedRow === null) {
                alert('请先选中要删除的行（点击行号）');
                return;
            }
            
            if (!confirm(`确定删除第 ${selectedRow} 行？`)) return;
            
            const ti = selectedTableIndex !== null ? selectedTableIndex : parseInt($('.g-t.act').data('i'));
            const sh = m.get(ti);
            if (sh) {
                sh.del(selectedRow);
                m.save();
                refreshTable(ti);
                updateTabCount(ti);
                selectedRow = null;
            }
        });
        
        // ✅ 监听Delete键删除选中行
        $(document).off('keydown.deleteRow').on('keydown.deleteRow', function(e) {
            if (e.key === 'Delete' && selectedRow !== null && $('#g-pop').length > 0) {
                // 防止在输入框中触发
                if ($(e.target).hasClass('g-e') || $(e.target).is('input, textarea')) {
                    return;
                }
                
                if (!confirm(`确定删除第 ${selectedRow} 行？`)) return;
                
                const ti = selectedTableIndex !== null ? selectedTableIndex : parseInt($('.g-t.act').data('i'));
                const sh = m.get(ti);
                if (sh) {
                    sh.del(selectedRow);
                    m.save();
                    refreshTable(ti);
                    updateTabCount(ti);
                    selectedRow = null;
                }
            }
        });
        
        $('#g-src').on('input', function() {
            const k = $(this).val().toLowerCase();
            $('.g-tbc:visible tbody tr:not(.g-emp)').each(function() {
                $(this).toggle($(this).text().toLowerCase().includes(k) || k === '');
            });
        });
        
        // ✅ 修复：确保每次只新增一行
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
        
        $('#g-sm').on('click', genSummary);
        
        $('#g-ex').on('click', function() {
            const d = { v: V, t: new Date().toISOString(), s: m.all().map(s => s.json()), summary: m.sm };
            const j = JSON.stringify(d, null, 2);
            const b = new Blob([j], { type: 'application/json' });
            const u = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u;
            a.download = `gaigai_${m.gid()}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(u);
        });
        
        // ✅ 修复：优化全清按钮，防止卡顿
        $('#g-ca').off('click').on('click', function() {
            if (!confirm('⚠️ 确定清空所有表格？此操作不可恢复！\n\n建议先导出备份。')) return;
            
            // 使用setTimeout避免阻塞UI
            setTimeout(() => {
                m.all().forEach(s => s.clear());
                m.save();
                $('#g-pop').remove();
                shw();
            }, 10);
        });
        
        $('#g-tm').on('click', shtm);
        $('#g-cf').on('click', shcf);
    }
    
    function refreshTable(ti) {
        const sh = m.get(ti);
        $(`.g-tbc[data-i="${ti}"]`).html($(gtb(sh, ti)).html());
        selectedRow = null;
        bnd();
    }
    
    function updateTabCount(ti) {
        const sh = m.get(ti);
        $(`.g-t[data-i="${ti}"]`).text(`${sh.n} (${sh.r.length})`);
    }
    
    function genSummary() {
        const hasData = m.all().some(s => s.r.length > 0);
        if (!hasData) {
            alert('⚠️ 没有表格数据，无法生成总结');
            return;
        }
        
        const h = `
            <div class="g-p">
                <h4>📝 生成AI总结</h4>
                <p style="color:#666; font-size:11px; line-height:1.6;">
                    将当前所有表格数据发送给AI，生成精简总结。<br>
                    生成后可选择清空表格，之后将使用总结替代详细表格。
                </p>
                <hr style="margin:12px 0; border:none; border-top:1px solid #ddd;">
                
                <label style="font-weight:600; margin-bottom:8px; display:block;">总结内容：</label>
                <textarea id="sum-txt" style="width:100%; height:200px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;" placeholder="请手动输入总结内容，或复制AI生成的总结..."></textarea>
                
                <div style="margin-top:12px; padding:10px; background:#fff3cd; border-radius:4px; font-size:10px;">
                    <strong>💡 使用提示：</strong><br>
                    1. 复制下方的"表格数据"<br>
                    2. 在聊天框发送给AI："请总结以下表格内容"<br>
                    3. 将AI的总结复制到上方文本框<br>
                    4. 点击保存
                </div>
                
                <hr style="margin:12px 0; border:none; border-top:1px solid #ddd;">
                
                <label style="font-weight:600; margin-bottom:8px; display:block;">
                    表格数据（复制给AI）：
                    <button id="copy-data" style="float:right; padding:3px 8px; font-size:9px; background:#28a745; color:#fff; border:none; border-radius:3px; cursor:pointer;">📋 复制</button>
                </label>
                <textarea readonly style="width:100%; height:150px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:9px; font-family:monospace; background:#f8f9fa;" id="tbl-data">${esc(m.pmt())}</textarea>
                
                <div style="margin-top:12px;">
                    <button id="save-sum" style="padding:6px 12px; background:var(--g-c); color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存总结</button>
                    <button id="save-clear" style="padding:6px 12px; background:#dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存并清空表格</button>
                    <button onclick="$('#g-pop').remove()" style="padding:6px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">取消</button>
                </div>
            </div>
        `;
        
        pop('📝 生成AI总结', h);
        
        setTimeout(() => {
            $('#copy-data').on('click', function() {
                const txt = $('#tbl-data').val();
                navigator.clipboard.writeText(txt).then(() => {
                    $(this).text('✅ 已复制').css('background', '#28a745');
                    setTimeout(() => {
                        $(this).text('📋 复制').css('background', '#28a745');
                    }, 2000);
                });
            });
            
            $('#save-sum').on('click', function() {
                const txt = $('#sum-txt').val().trim();
                if (!txt) {
                    alert('请输入总结内容');
                    return;
                }
                m.sm.txt = txt;
                m.sm.ts = new Date().toISOString();
                m.sm.save(m.gid());
                alert('✅ 总结已保存');
                $('#g-pop').remove();
            });
            
            $('#save-clear').on('click', function() {
                const txt = $('#sum-txt').val().trim();
                if (!txt) {
                    alert('请输入总结内容');
                    return;
                }
                if (!confirm('⚠️ 确定清空所有表格？\n\n总结将被保存，表格数据将被清空。')) return;
                
                m.sm.txt = txt;
                m.sm.ts = new Date().toISOString();
                m.sm.save(m.gid());
                
                m.all().forEach(s => s.clear());
                m.save();
                
                alert('✅ 总结已保存，表格已清空');
                $('#g-pop').remove();
                shw();
            });
        }, 100);
    }
    
    function shtm() {
        const h = `
            <div class="g-p">
                <h4>🎨 主题设置</h4>
                <label>主题颜色：</label>
                <input type="color" id="tc" value="${UI.c}" style="width:100%; height:35px; border-radius:4px; border:1px solid #ddd;">
                <br><br>
                <label>背景透明度：<span id="to">${UI.o}%</span></label>
                <input type="range" id="tor" min="0" max="100" value="${UI.o}" style="width:100%;">
                <br><br>
                <label><input type="checkbox" id="tg" ${UI.g ? 'checked' : ''}> 毛玻璃效果</label>
                <br><br>
                <button id="ts">💾 保存</button>
                <button id="tr">🔄 重置</button>
            </div>
        `;
        pop('🎨 主题', h);
        setTimeout(() => {
            $('#tor').on('input', function() { $('#to').text($(this).val() + '%'); });
            $('#ts').on('click', function() {
                UI.c = $('#tc').val();
                UI.o = parseInt($('#tor').val());
                UI.g = $('#tg').is(':checked');
                try { localStorage.setItem(UK, JSON.stringify(UI)); } catch (e) {}
                thm();
                if (UI.g) {
                    $('.g-w').addClass('g-gl');
                } else {
                    $('.g-w').removeClass('g-gl');
                }
                alert('✅ 主题已保存并应用');
            });
            $('#tr').on('click', function() {
                UI = { c: '#9c4c4c', o: 95, g: true };
                try { localStorage.removeItem(UK); } catch (e) {}
                alert('✅ 已重置为默认主题');
                $('#g-pop').remove();
                shw();
            });
        }, 100);
    }
    
    // ✅ 提示词管理界面
    function shpmt() {
        const h = `
            <div class="g-p">
                <h4>📝 提示词管理</h4>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">表格提示词前缀</legend>
                    <textarea id="pmt-tbl-prefix" style="width:100%; height:60px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;">${esc(PROMPTS.tablePrefix)}</textarea>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">表格提示词后缀</legend>
                    <textarea id="pmt-tbl-suffix" style="width:100%; height:60px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;">${esc(PROMPTS.tableSuffix)}</textarea>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">总结提示词前缀</legend>
                    <textarea id="pmt-sum-prefix" style="width:100%; height:60px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;">${esc(PROMPTS.summaryPrefix)}</textarea>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">总结提示词后缀</legend>
                    <textarea id="pmt-sum-suffix" style="width:100%; height:60px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;">${esc(PROMPTS.summarySuffix)}</textarea>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">自定义模板（可选）</legend>
                    <p style="font-size:10px; color:#666; margin:0 0 8px 0;">
                        使用 <code>{{表格名}}</code> 作为占位符，例如：<code>{{主线剧情}}</code>
                    </p>
                    <textarea id="pmt-custom" style="width:100%; height:120px; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:10px; font-family:monospace; resize:vertical;" placeholder="留空使用默认格式">${esc(PROMPTS.customTemplate)}</textarea>
                </fieldset>
                
                <button id="save-pmt" style="padding:6px 12px; background:var(--g-c); color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 保存</button>
                <button id="reset-pmt" style="padding:6px 12px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">🔄 重置</button>
            </div>
        `;
        
        pop('📝 提示词管理', h);
        
        setTimeout(() => {
            $('#save-pmt').on('click', function() {
                PROMPTS.tablePrefix = $('#pmt-tbl-prefix').val();
                PROMPTS.tableSuffix = $('#pmt-tbl-suffix').val();
                PROMPTS.summaryPrefix = $('#pmt-sum-prefix').val();
                PROMPTS.summarySuffix = $('#pmt-sum-suffix').val();
                PROMPTS.customTemplate = $('#pmt-custom').val();
                
                try {
                    localStorage.setItem(PK, JSON.stringify(PROMPTS));
                } catch (e) {}
                
                alert('✅ 提示词已保存');
            });
            
            $('#reset-pmt').on('click', function() {
                if (!confirm('确定重置为默认提示词？')) return;
                
                PROMPTS = {
                    tablePrefix: '=== 📚 记忆表格 ===\n\n',
                    tableSuffix: '\n=== 表格结束 ===\n',
                    summaryPrefix: '=== 📚 记忆总结 ===\n\n',
                    summarySuffix: '\n\n=== 总结结束 ===\n',
                    customTemplate: ''
                };
                
                try {
                    localStorage.removeItem(PK);
                } catch (e) {}
                
                alert('✅ 已重置为默认提示词');
                $('#g-pop').remove();
                shpmt();
            });
        }, 100);
    }
    
    function shcf() {
        const h = `
            <div class="g-p">
                <h4>⚙️ 高级配置</h4>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">云同步</legend>
                    <label><input type="checkbox" id="ccs" ${C.cloudSync ? 'checked' : ''}> 启用云同步</label>
                    <p style="font-size:10px; color:#666; margin:4px 0 0 20px;">
                        数据将保存到聊天元数据中，随聊天记录同步到云端
                    </p>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">注入设置</legend>
                    <label><input type="checkbox" id="ci" ${C.inj ? 'checked' : ''}> 启用注入</label>
                    <br><br>
                    <label>注入位置：</label>
                    <select id="cp" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;">
                        <option value="system" ${C.pos === 'system' ? 'selected' : ''}>系统消息（开头）</option>
                        <option value="user" ${C.pos === 'user' ? 'selected' : ''}>用户消息</option>
                        <option value="assistant" ${C.pos === 'assistant' ? 'selected' : ''}>助手消息</option>
                        <option value="before_last" ${C.pos === 'before_last' ? 'selected' : ''}>最后消息前</option>
                        <option value="world_info_before" ${C.pos === 'world_info_before' ? 'selected' : ''}>世界书之前</option>
                        <option value="world_info_after" ${C.pos === 'world_info_after' ? 'selected' : ''}>世界书之后</option>
                    </select>
                    <br><br>
                    <label>深度（从末尾往前的消息数）：</label>
                    <input type="number" id="cd" value="${C.d}" min="0" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    <br><br>
                    <label><input type="checkbox" id="cfh" ${C.filterHistory ? 'checked' : ''}> 自动过滤历史标签</label>
                    <p style="font-size:10px; color:#666; margin:4px 0 0 20px;">
                        仅清理AI历史回复中的标签，保留提示词示例
                    </p>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">总结模式</legend>
                    <label><input type="checkbox" id="cus" ${C.useSummary ? 'checked' : ''}> 使用总结替代详细表格</label>
                    <p style="font-size:10px; color:#666; margin:8px 0 0 0;">
                        启用后，如果有总结，将发送总结而不是详细表格
                    </p>
                    ${m.sm.has() ? `<p style="font-size:10px; color:#28a745; margin:4px 0 0 0;">✅ 当前有总结（${new Date(m.sm.ts).toLocaleString()}）</p>` : '<p style="font-size:10px; color:#999; margin:4px 0 0 0;">暂无总结</p>'}
                    ${m.sm.has() ? '<button id="clear-sum" style="margin-top:8px; padding:4px 8px; background:#dc3545; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:10px;">🗑️ 删除总结</button>' : ''}
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">API设置</legend>
                    <label><input type="checkbox" id="capi" ${C.apiEnabled ? 'checked' : ''}> 启用API接口</label>
                    <br><br>
                    <label>API端口：</label>
                    <input type="number" id="cport" value="${C.apiPort}" min="1024" max="65535" style="width:100%; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    <p style="font-size:10px; color:#666; margin:4px 0 0 0;">
                        API地址：<code>http://localhost:${C.apiPort}/gaigai</code>
                    </p>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">提示词管理</legend>
                    <button id="open-pmt" style="padding:6px 12px; background:#17a2b8; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">📝 打开提示词编辑器</button>
                </fieldset>
                
                <fieldset style="border:1px solid #ddd; padding:10px; border-radius:4px; margin-bottom:12px;">
                    <legend style="font-size:11px; font-weight:600;">其他选项</legend>
                    <label><input type="checkbox" id="cl" ${C.log ? 'checked' : ''}> 控制台显示详细日志</label>
                    <br><br>
                    <label><input type="checkbox" id="cpc" ${C.pc ? 'checked' : ''}> 每个角色独立数据</label>
                    <br><br>
                    <label><input type="checkbox" id="cht" ${C.hideTag ? 'checked' : ''}> 隐藏聊天中的记忆标签</label>
                </fieldset>
                
                <button id="cs">💾 保存配置</button>
                <button id="ct">🧪 测试注入</button>
                <button id="crg">📋 API文档</button>
                <div id="cr" style="display:none; margin-top:10px; padding:8px; background:#f5f5f5; border-radius:4px;">
                    <pre id="ctx" style="max-height:200px; overflow:auto; font-size:9px; white-space: pre-wrap;"></pre>
                </div>
            </div>
        `;
        pop('⚙️ 配置', h);
        setTimeout(() => {
            $('#cs').on('click', function() {
                C.inj = $('#ci').is(':checked');
                C.pos = $('#cp').val();
                C.d = parseInt($('#cd').val()) || 0;
                C.log = $('#cl').is(':checked');
                C.pc = $('#cpc').is(':checked');
                C.hideTag = $('#cht').is(':checked');
                C.useSummary = $('#cus').is(':checked');
                C.filterHistory = $('#cfh').is(':checked');
                C.cloudSync = $('#ccs').is(':checked');
                C.apiEnabled = $('#capi').is(':checked');
                C.apiPort = parseInt($('#cport').val()) || 8100;
                alert('✅ 配置已保存');
            });
            $('#ct').on('click', function() {
                const p = m.pmt();
                if (p) {
                    $('#cr').show();
                    $('#ctx').text(p);
                } else {
                    $('#cr').show();
                    $('#ctx').text('⚠️ 当前没有数据');
                }
            });
            $('#crg').on('click', function() {
                const doc = `
📚 Gaigai API 文档

基础URL: http://localhost:${C.apiPort}/gaigai

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 获取所有表格数据
GET /data

返回示例：
{
  "success": true,
  "data": {
    "主线剧情": [...],
    "支线追踪": [...]
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2️⃣ 执行编辑操作（XML格式）
POST /execute
Content-Type: text/plain

<GaigaiMemory><!-- insertRow(0, {0: "剧情名", 1: "开始时间"})--></GaigaiMemory>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3️⃣ 执行编辑操作（JSON格式）
POST /execute
Content-Type: application/json

{
  "type": "insert",
  "tableIndex": 0,
  "data": {
    "0": "剧情名",
    "1": "开始时间"
  }
}

或批量操作：
{
  "operations": [
    {"type": "insert", "tableIndex": 0, "data": {...}},
    {"type": "update", "tableIndex": 0, "rowIndex": 0, "data": {...}}
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4️⃣ 清空指定表格
POST /clear/{tableIndex}

5️⃣ 获取提示词
GET /prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 操作类型说明：
- insert: 插入新行
- update: 更新指定行
- delete: 删除指定行

📌 tableIndex 对应：
0: 主线剧情
1: 支线追踪
2: 角色状态
3: 人物档案
4: 人物关系
5: 世界设定
6: 物品追踪
                `.trim();
                $('#cr').show();
                $('#ctx').text(doc);
            });
            $('#clear-sum').on('click', function() {
                if (!confirm('确定删除总结？')) return;
                m.sm.clear(m.gid());
                alert('✅ 总结已删除');
                $('#g-pop').remove();
                shcf();
            });
            $('#open-pmt').on('click', function() {
                $('#g-pop').remove();
                shpmt();
            });
        }, 100);
    }
    
    function esc(t) {
        const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(t).replace(/[&<>"']/g, c => mp[c]);
    }
    
    // ✅ API接口实现
    class API {
        constructor() {
            this.handlers = new Map();
            this.setupHandlers();
        }
        
        setupHandlers() {
            // 获取所有数据
            this.handlers.set('GET:/data', () => {
                const data = {};
                m.all().forEach(s => {
                    data[s.n] = s.r;
                });
                return { success: true, data };
            });
            
            // 获取提示词
            this.handlers.set('GET:/prompt', () => {
                return { success: true, prompt: m.pmt() };
            });
            
            // 执行编辑操作
            this.handlers.set('POST:/execute', (body) => {
                try {
                    let matches;
                    
                    // 检测格式
                    if (typeof body === 'string') {
                        // XML格式
                        const regex = MEMORY_TAG_REGEX;
                        matches = [];
                        let mt;
                        while ((mt = regex.exec(body)) !== null) {
                            matches.push(mt[1]);
                        }
                    } else if (typeof body === 'object') {
                        // JSON格式
                        const ops = Array.isArray(body) ? body : (body.operations || [body]);
                        matches = ops.map(op => {
                            const { type, tableIndex, rowIndex, data } = op;
                            switch(type) {
                                case 'insert':
                                    return `insertRow(${tableIndex}, ${JSON.stringify(data)})`;
                                case 'update':
                                    return `updateRow(${tableIndex}, ${rowIndex}, ${JSON.stringify(data)})`;
                                case 'delete':
                                    return `deleteRow(${tableIndex}, ${rowIndex})`;
                            }
                        });
                        matches = ['<!--\n' + matches.join('\n') + '\n-->'];
                    }
                    
                    if (!matches || matches.length === 0) {
                        return { success: false, error: '未找到有效的编辑指令' };
                    }
                    
                    const cs = prs('<GaigaiMemory>' + matches.join('') + '</GaigaiMemory>');
                    exe(cs);
                    
                    return { success: true, message: `执行了 ${cs.length} 条指令` };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            });
            
            // 清空表格
            this.handlers.set('POST:/clear', (body) => {
                const { tableIndex } = body;
                const sh = m.get(tableIndex);
                if (sh) {
                    sh.clear();
                    m.save();
                    return { success: true, message: `已清空 ${sh.n}` };
                }
                return { success: false, error: '表格不存在' };
            });
        }
        
        handle(method, path, body) {
            const key = `${method}:${path}`;
            const handler = this.handlers.get(key);
            if (handler) {
                return handler(body);
            }
            return { success: false, error: '未找到对应的API' };
        }
    }
    
    const api = new API();
    
    // 事件
    function omsg(id) {
        try {
            const x = m.ctx();
            if (!x || !x.chat) return;
            const i = typeof id === 'number' ? id : x.chat.length - 1;
            const mg = x.chat[i];
            if (!mg || mg.is_user) return;
            const tx = mg.mes || mg.swipes?.[mg.swipe_id] || '';
            const cs = prs(tx);
            if (cs.length > 0) {
                console.log(`✅ [PARSE] 解析到 ${cs.length} 条指令`);
                exe(cs);
            }
            
            setTimeout(hideMemoryTags, 100);
        } catch (e) {
            console.error('❌ 消息处理失败:', e);
        }
    }
    
    function ochat() { 
        m.load();
        setTimeout(hideMemoryTags, 500);
    }
    
    function opmt(ev) { 
        try { 
            inj(ev); 
        } catch (e) { 
            console.error('❌ 注入失败:', e); 
        } 
    }
    
    // 初始化
    function ini() {
        if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') {
            setTimeout(ini, 500);
            return;
        }
        
        // 加载配置
        try { 
            const sv = localStorage.getItem(UK); 
            if (sv) UI = { ...UI, ...JSON.parse(sv) }; 
        } catch (e) {}
        
        try {
            const pv = localStorage.getItem(PK);
            if (pv) PROMPTS = { ...PROMPTS, ...JSON.parse(pv) };
        } catch (e) {}
        
        m.load();
        
        $('#g-btn').remove();
        const $b = $('<div>', {
            id: 'g-btn',
            class: 'list-group-item flex-container flexGap5',
            css: { cursor: 'pointer' },
            html: '<i class="fa-solid fa-table"></i><span style="margin-left:8px;">Gaigai</span>'
        }).on('click', shw);
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
        
        console.log('✅ Gaigai v' + V + ' 已就绪');
        console.log('📋 总结状态:', m.sm.has() ? '有总结' : '无总结');
        console.log('☁️ 云同步:', C.cloudSync ? '已启用' : '已关闭');
        console.log('🔌 API:', C.apiEnabled ? `已启用 (端口 ${C.apiPort})` : '已关闭');
        console.log('🧹 过滤模式: 仅清理AI历史回复，保留提示词示例');
    }
    
    setTimeout(ini, 1000);
    
    // ✅ 暴露全局API
    window.Gaigai = { 
        v: V, 
        m: m, 
        shw: shw, 
        genSummary: genSummary,
        cleanMemoryTags: cleanMemoryTags,
        MEMORY_TAG_REGEX: MEMORY_TAG_REGEX,
        api: api,
        execute: (method, path, body) => api.handle(method, path, body),
        getData: () => api.handle('GET', '/data'),
        getPrompt: () => api.handle('GET', '/prompt'),
        insertRow: (tableIndex, data) => api.handle('POST', '/execute', { type: 'insert', tableIndex, data }),
        updateRow: (tableIndex, rowIndex, data) => api.handle('POST', '/execute', { type: 'update', tableIndex, rowIndex, data }),
        deleteRow: (tableIndex, rowIndex) => api.handle('POST', '/execute', { type: 'delete', tableIndex, rowIndex }),
        clearTable: (tableIndex) => api.handle('POST', '/clear', { tableIndex })
    };
    
})();
