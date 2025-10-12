// Gaigai 表格记忆系统 v0.5.1 - 极简可靠版
(function() {
    'use strict';
    
    console.log('🚀 Gaigai v0.5.1 启动');
    
    const VERSION = '0.5.1';
    const STORAGE_KEY = 'gaigai_data';
    const UI_KEY = 'gaigai_ui';
    
    // UI配置
    let UI = {
        color: '#9c4c4c',
        opacity: 95,
        glass: true
    };
    
    // 功能配置
    const CFG = {
        inject: true,
        position: 'system',
        depth: 0,
        showLog: true,
        perChar: true
    };
    
    // 表格配置
    const TABLES = [
        { name: '主线剧情', cols: ['剧情名', '开始时间', '完结时间', '地点', '事件概要', '关键物品', '承诺/约定', '状态'] },
        { name: '支线追踪', cols: ['支线名', '开始时间', '完结时间', '事件进展', '状态', '关键NPC'] },
        { name: '角色状态', cols: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
        { name: '人物档案', cols: ['姓名', '年龄', '身份', '地点', '性格', '对user态度'] },
        { name: '人物关系', cols: ['角色A', '角色B', '关系描述'] },
        { name: '世界设定', cols: ['设定名', '类型', '详细说明', '影响范围'] },
        { name: '物品追踪', cols: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注'] }
    ];
    
    // Sheet类
    class Sheet {
        constructor(name, cols) {
            this.name = name;
            this.cols = cols;
            this.rows = [];
        }
        
        update(idx, data) {
            while (this.rows.length <= idx) this.rows.push({});
            Object.entries(data).forEach(([k, v]) => this.rows[idx][k] = v);
        }
        
        insert(data) {
            this.rows.push(data);
        }
        
        delete(idx) {
            if (idx >= 0 && idx < this.rows.length) this.rows.splice(idx, 1);
        }
        
        toJSON() {
            return { name: this.name, cols: this.cols, rows: this.rows };
        }
        
        fromJSON(d) {
            this.name = d.name || this.name;
            this.cols = d.cols || this.cols;
            this.rows = d.rows || [];
        }
        
        toText() {
            if (this.rows.length === 0) return `【${this.name}】：无数据`;
            let t = `【${this.name}】\n`;
            this.rows.forEach((r, i) => {
                t += `  [${i}] `;
                this.cols.forEach((c, ci) => {
                    const v = r[ci] || '';
                    if (v) t += `${c}:${v} | `;
                });
                t += '\n';
            });
            return t;
        }
    }
    
    // 管理器
    class Manager {
        constructor() {
            this.sheets = [];
            this.chatId = null;
            TABLES.forEach(t => this.sheets.push(new Sheet(t.name, t.cols)));
        }
        
        get(i) { return this.sheets[i]; }
        all() { return this.sheets; }
        
        save() {
            const id = this.getChatId();
            if (!id) return;
            try {
                localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify({
                    v: VERSION,
                    id: id,
                    data: this.sheets.map(s => s.toJSON())
                }));
            } catch (e) {}
        }
        
        load() {
            const id = this.getChatId();
            if (!id) return;
            if (this.chatId !== id) {
                this.chatId = id;
                this.sheets = [];
                TABLES.forEach(t => this.sheets.push(new Sheet(t.name, t.cols)));
            }
            try {
                const s = localStorage.getItem(`${STORAGE_KEY}_${id}`);
                if (s) {
                    const d = JSON.parse(s);
                    d.data.forEach((sd, i) => {
                        if (this.sheets[i]) this.sheets[i].fromJSON(sd);
                    });
                }
            } catch (e) {}
        }
        
        getChatId() {
            try {
                const ctx = this.getCtx();
                if (!ctx) return 'def';
                if (CFG.perChar) {
                    const char = ctx.name2 || 'unk';
                    const chat = ctx.chat_metadata?.file_name || 'main';
                    return `${char}_${chat}`;
                }
                return ctx.chat_metadata?.file_name || 'def';
            } catch (e) {
                return 'def';
            }
        }
        
        getCtx() {
            return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
        }
        
        toPrompt() {
            const s = this.sheets.filter(sh => sh.rows.length > 0);
            if (s.length === 0) return '';
            let t = '=== 📚 记忆表格 ===\n\n';
            s.forEach(sh => t += sh.toText() + '\n');
            t += '\n=== 表格结束 ===\n';
            return t;
        }
    }
    
    const mgr = new Manager();
    
    // 解析AI指令
    function parse(txt) {
        const cmds = [];
        const reg = /<(GaigaiMemory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
        let m;
        while ((m = reg.exec(txt)) !== null) {
            let c = m[2].replace(/<!--/g, '').replace(/-->/g, '').trim();
            ['insertRow', 'updateRow', 'deleteRow'].forEach(fn => {
                let si = 0;
                while (true) {
                    const fi = c.indexOf(fn + '(', si);
                    if (fi === -1) break;
                    let d = 0, ei = -1;
                    for (let i = fi + fn.length; i < c.length; i++) {
                        if (c[i] === '(') d++;
                        if (c[i] === ')') {
                            d--;
                            if (d === 0) { ei = i; break; }
                        }
                    }
                    if (ei === -1) break;
                    const args = c.substring(fi + fn.length + 1, ei);
                    const p = parseArgs(args, fn);
                    if (p) cmds.push({ type: fn.replace('Row', '').toLowerCase(), ...p });
                    si = ei + 1;
                }
            });
        }
        return cmds;
    }
    
    function parseArgs(str, fn) {
        try {
            const bs = str.indexOf('{'), be = str.lastIndexOf('}');
            if (bs === -1 || be === -1) return null;
            const nums = str.substring(0, bs).split(',').map(s => s.trim()).filter(s => s).map(s => parseInt(s));
            const obj = parseObj(str.substring(bs, be + 1));
            if (fn === 'insertRow') return { ti: nums[0], ri: null, d: obj };
            if (fn === 'updateRow') return { ti: nums[0], ri: nums[1], d: obj };
            if (fn === 'deleteRow') return { ti: nums[0], ri: nums[1], d: null };
        } catch (e) {}
        return null;
    }
    
    function parseObj(str) {
        const d = {};
        str = str.trim().replace(/^\{|\}$/g, '').trim();
        const r = /(\d+)\s*:\s*"([^"]*)"/g;
        let m;
        while ((m = r.exec(str)) !== null) d[m[1]] = m[2];
        return d;
    }
    
    function exec(cmds) {
        cmds.forEach(c => {
            const s = mgr.get(c.ti);
            if (!s) return;
            if (c.type === 'update' && c.ri !== null) s.update(c.ri, c.d);
            if (c.type === 'insert') s.insert(c.d);
            if (c.type === 'delete' && c.ri !== null) s.delete(c.ri);
        });
        mgr.save();
    }
    
    // 注入
    function inject(ev) {
        if (!CFG.inject) return;
        const p = mgr.toPrompt();
        if (!p) return;
        let role = 'system', pos = ev.chat.length;
        if (CFG.position === 'system') { role = 'system'; pos = 0; }
        else if (CFG.position === 'user') { role = 'user'; pos = Math.max(0, ev.chat.length - CFG.depth); }
        else if (CFG.position === 'before_last') { role = 'system'; pos = Math.max(0, ev.chat.length - 1 - CFG.depth); }
        ev.chat.splice(pos, 0, { role: role, content: p });
        console.log(`✅ [INJECT] ${CFG.position} @ ${pos}`);
        if (CFG.showLog) console.log('📝\n' + p);
    }
    
    // UI - 应用主题
    function theme() {
        document.documentElement.style.setProperty('--gg-color', UI.color);
        document.documentElement.style.setProperty('--gg-opa', UI.opacity / 100);
    }
    
    // UI - 创建弹窗
    function popup(title, html) {
        $('#gg-pop').remove();
        theme();
        
        const $o = $('<div>', { id: 'gg-pop', class: 'gg-over' });
        const $p = $('<div>', { class: UI.glass ? 'gg-win gg-glass' : 'gg-win' });
        const $h = $('<div>', { class: 'gg-head', html: `<h3>${title}</h3>` });
        const $x = $('<button>', { class: 'gg-x', text: '×' }).on('click', () => $o.remove());
        const $b = $('<div>', { class: 'gg-body', html: html });
        
        $h.append($x);
        $p.append($h, $b);
        $o.append($p);
        
        $o.on('click', e => { if (e.target === $o[0]) $o.remove(); });
        $(document).on('keydown.gg', e => { if (e.key === 'Escape') { $o.remove(); $(document).off('keydown.gg'); } });
        
        $('body').append($o);
        return $p;
    }
    
    // UI - 显示表格
    function show() {
        const ss = mgr.all();
        
        // ✅ 关键：确保只生成一次，用join而不是循环拼接
        const tabs = ss.map((s, i) => 
            `<button class="gg-tab${i === 0 ? ' active' : ''}" data-i="${i}">${s.name} (${s.rows.length})</button>`
        ).join('');
        
        const tools = `
            <input type="text" id="gg-search" placeholder="搜索">
            <button id="gg-add">➕</button>
            <button id="gg-exp">📥</button>
            <button id="gg-clr">🗑️</button>
            <button id="gg-thm">🎨</button>
            <button id="gg-cfg">⚙️</button>
        `;
        
        const tables = ss.map((s, i) => genTable(s, i)).join('');
        
        const html = `
            <div class="gg-view">
                <div class="gg-tabs">${tabs}</div>
                <div class="gg-tools">${tools}</div>
                <div class="gg-tbls">${tables}</div>
            </div>
        `;
        
        popup('📚 Gaigai表格', html);
        setTimeout(bind, 100);
    }
    
    // UI - 生成单个表格
    function genTable(s, ti) {
        const vis = ti === 0 ? '' : 'display:none;';
        
        let h = `<div class="gg-tbl" data-i="${ti}" style="${vis}">`;
        
        // 表头
        h += '<div class="gg-thead"><table><thead><tr>';
        h += '<th style="width:40px;">#</th>';
        s.cols.forEach(c => h += `<th>${esc(c)}</th>`);
        h += '<th style="width:60px;">操作</th>';
        h += '</tr></thead></table></div>';
        
        // 表体
        h += '<div class="gg-tbody"><table>';
        h += '<thead style="visibility:collapse;"><tr>';
        h += '<th style="width:40px;">#</th>';
        s.cols.forEach(c => h += `<th>${esc(c)}</th>`);
        h += '<th style="width:60px;">操作</th>';
        h += '</tr></thead><tbody>';
        
        if (s.rows.length === 0) {
            h += `<tr class="gg-empty"><td colspan="${s.cols.length + 2}">暂无数据</td></tr>`;
        } else {
            s.rows.forEach((r, ri) => {
                h += `<tr data-r="${ri}"><td class="gg-num">${ri}</td>`;
                s.cols.forEach((c, ci) => {
                    const v = r[ci] || '';
                    h += `<td class="gg-ed" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(v)}</td>`;
                });
                h += `<td><button class="gg-del" data-r="${ri}">删除</button></td></tr>`;
            });
        }
        
        h += '</tbody></table></div></div>';
        return h;
    }
    
    // UI - 绑定事件
    function bind() {
        $('.gg-tab').on('click', function() {
            const i = $(this).data('i');
            $('.gg-tab').removeClass('active');
            $(this).addClass('active');
            $('.gg-tbl').hide();
            $(`.gg-tbl[data-i="${i}"]`).show();
        });
        
        $('.gg-ed').on('blur', function() {
            const ti = parseInt($('.gg-tab.active').data('i'));
            const ri = parseInt($(this).data('r'));
            const ci = parseInt($(this).data('c'));
            const v = $(this).text().trim();
            const s = mgr.get(ti);
            if (s) {
                const d = {};
                d[ci] = v;
                s.update(ri, d);
                mgr.save();
            }
        });
        
        $('#gg-search').on('input', function() {
            const k = $(this).val().toLowerCase();
            $('.gg-tbl:visible tbody tr:not(.gg-empty)').each(function() {
                $(this).toggle($(this).text().toLowerCase().includes(k) || k === '');
            });
        });
        
        $('#gg-add').on('click', function() {
            const ti = parseInt($('.gg-tab.active').data('i'));
            const s = mgr.get(ti);
            if (s) {
                const nr = {};
                s.cols.forEach((_, i) => nr[i] = '');
                s.insert(nr);
                mgr.save();
                $(`.gg-tbl[data-i="${ti}"]`).html($(genTable(s, ti)).html());
                bind();
            }
        });
        
        $('.gg-del').on('click', function() {
            if (!confirm('删除？')) return;
            const ti = parseInt($('.gg-tab.active').data('i'));
            const ri = parseInt($(this).data('r'));
            const s = mgr.get(ti);
            if (s) {
                s.delete(ri);
                mgr.save();
                $(`.gg-tbl[data-i="${ti}"]`).html($(genTable(s, ti)).html());
                bind();
            }
        });
        
        $('#gg-exp').on('click', function() {
            const d = { v: VERSION, t: new Date().toISOString(), s: mgr.all().map(s => s.toJSON()) };
            const j = JSON.stringify(d, null, 2);
            const b = new Blob([j], { type: 'application/json' });
            const u = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u;
            a.download = `gaigai_${mgr.getChatId()}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(u);
        });
        
        $('#gg-clr').on('click', function() {
            const ti = parseInt($('.gg-tab.active').data('i'));
            const s = mgr.get(ti);
            if (!confirm(`清空"${s.name}"？`)) return;
            s.rows = [];
            mgr.save();
            $(`.gg-tbl[data-i="${ti}"]`).html($(genTable(s, ti)).html());
            bind();
        });
        
        $('#gg-thm').on('click', showTheme);
        $('#gg-cfg').on('click', showCfg);
    }
    
    // UI - 主题面板
    function showTheme() {
        const h = `
            <div class="gg-panel">
                <h4>🎨 主题</h4>
                <label>颜色：</label>
                <input type="color" id="t-col" value="${UI.color}" style="width:100%; height:35px; border-radius:4px; border:1px solid #ddd;">
                <br><br>
                <label>透明度：<span id="t-opa">${UI.opacity}%</span></label>
                <input type="range" id="t-opar" min="70" max="100" value="${UI.opacity}" style="width:100%;">
                <br><br>
                <label><input type="checkbox" id="t-gls" ${UI.glass ? 'checked' : ''}> 毛玻璃</label>
                <br><br>
                <button id="t-save">💾 保存</button>
                <button id="t-rst">🔄 重置</button>
            </div>
        `;
        popup('🎨 主题', h);
        setTimeout(() => {
            $('#t-opar').on('input', function() { $('#t-opa').text($(this).val() + '%'); });
            $('#t-save').on('click', function() {
                UI.color = $('#t-col').val();
                UI.opacity = parseInt($('#t-opar').val());
                UI.glass = $('#t-gls').is(':checked');
                try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch (e) {}
                alert('✅ 已保存');
                $('#gg-pop').remove();
                show();
            });
            $('#t-rst').on('click', function() {
                UI = { color: '#9c4c4c', opacity: 95, glass: true };
                try { localStorage.removeItem(UI_KEY); } catch (e) {}
                alert('✅ 已重置');
                $('#gg-pop').remove();
                show();
            });
        }, 100);
    }
    
    // UI - 配置面板
    function showCfg() {
        const h = `
            <div class="gg-panel">
                <h4>⚙️ 配置</h4>
                <label><input type="checkbox" id="c-inj" ${CFG.inject ? 'checked' : ''}> 启用注入</label>
                <br><br>
                <label>位置：</label>
                <select id="c-pos">
                    <option value="system" ${CFG.position === 'system' ? 'selected' : ''}>系统消息</option>
                    <option value="user" ${CFG.position === 'user' ? 'selected' : ''}>用户消息</option>
                    <option value="before_last" ${CFG.position === 'before_last' ? 'selected' : ''}>最后消息前</option>
                </select>
                <br><br>
                <label><input type="checkbox" id="c-log" ${CFG.showLog ? 'checked' : ''}> 显示日志</label>
                <br><br>
                <label><input type="checkbox" id="c-pc" ${CFG.perChar ? 'checked' : ''}> 独立数据</label>
                <br><br>
                <button id="c-save">💾 保存</button>
                <button id="c-test">🧪 测试</button>
                <div id="c-res" style="display:none; margin-top:10px; padding:8px; background:#f5f5f5; border-radius:4px;">
                    <pre id="c-txt" style="max-height:200px; overflow:auto; font-size:9px;"></pre>
                </div>
            </div>
        `;
        popup('⚙️ 配置', h);
        setTimeout(() => {
            $('#c-save').on('click', function() {
                CFG.inject = $('#c-inj').is(':checked');
                CFG.position = $('#c-pos').val();
                CFG.showLog = $('#c-log').is(':checked');
                CFG.perChar = $('#c-pc').is(':checked');
                alert('✅ 已保存');
            });
            $('#c-test').on('click', function() {
                const p = mgr.toPrompt();
                if (p) {
                    $('#c-res').show();
                    $('#c-txt').text(p);
                } else {
                    alert('⚠️ 无数据');
                }
            });
        }, 100);
    }
    
    function esc(t) {
        const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(t).replace(/[&<>"']/g, c => m[c]);
    }
    
    // 事件
    function onMsg(id) {
        try {
            const ctx = mgr.getCtx();
            if (!ctx || !ctx.chat) return;
            const i = typeof id === 'number' ? id : ctx.chat.length - 1;
            const m = ctx.chat[i];
            if (!m || m.is_user) return;
            const t = m.mes || m.swipes?.[m.swipe_id] || '';
            const c = parse(t);
            if (c.length > 0) {
                console.log('✅ 指令:', c.length);
                exec(c);
            }
        } catch (e) {}
    }
    
    function onChat() {
        mgr.load();
    }
    
    function onPrompt(ev) {
        try { inject(ev); } catch (e) {}
    }
    
    // 初始化
    function init() {
        if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') {
            setTimeout(init, 500);
            return;
        }
        
        try { const s = localStorage.getItem(UI_KEY); if (s) UI = { ...UI, ...JSON.parse(s) }; } catch (e) {}
        
        mgr.load();
        
        $('#gg-btn').remove();
        const $b = $('<div>', {
            id: 'gg-btn',
            class: 'list-group-item flex-container flexGap5',
            css: { cursor: 'pointer' },
            html: '<i class="fa-solid fa-table"></i><span style="margin-left:8px;">Gaigai</span>'
        }).on('click', show);
        $('#extensionsMenu').append($b);
        
        const ctx = mgr.getCtx();
        if (ctx && ctx.eventSource) {
            try {
                ctx.eventSource.on(ctx.event_types.CHARACTER_MESSAGE_RENDERED, onMsg);
                ctx.eventSource.on(ctx.event_types.CHAT_CHANGED, onChat);
                ctx.eventSource.on(ctx.event_types.CHAT_COMPLETION_PROMPT_READY, onPrompt);
                console.log('✅ 事件注册');
            } catch (e) {}
        }
        
        console.log('✅ Gaigai已就绪');
    }
    
    setTimeout(init, 1000);
    
    window.Gaigai = { v: VERSION, mgr: mgr, show: show };
    
})();
