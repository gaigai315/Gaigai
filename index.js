// Gaigai v0.5.3 - 表格对齐终极版
(function() {
    'use strict';
    
    // ✅ 防止重复加载
    if (window.GaigaiLoaded) {
        console.warn('⚠️ Gaigai已加载，跳过重复初始化');
        return;
    }
    window.GaigaiLoaded = true;
    
    console.log('🚀 Gaigai v0.5.3 启动');
    
    const V = '0.5.3';
    const SK = 'gg_data';
    const UK = 'gg_ui';
    
    // UI配置
    let UI = { c: '#9c4c4c', o: 95, g: true };
    
    // 功能配置
    const C = { inj: true, pos: 'system', d: 0, log: true, pc: true };
    
    // 表格定义
    const T = [
        { n: '主线剧情', c: ['剧情名', '开始时间', '完结时间', '地点', '事件概要', '关键物品', '承诺/约定', '状态'] },
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
    
    // 管理器
    class M {
        constructor() {
            this.s = [];
            this.id = null;
            T.forEach(tb => this.s.push(new S(tb.n, tb.c)));
        }
        get(i) { return this.s[i]; }
        all() { return this.s; }
        save() {
            const id = this.gid();
            if (!id) return;
            try {
                localStorage.setItem(`${SK}_${id}`, JSON.stringify({
                    v: V,
                    id: id,
                    d: this.s.map(sh => sh.json())
                }));
            } catch (e) {}
        }
        load() {
            const id = this.gid();
            if (!id) return;
            if (this.id !== id) {
                this.id = id;
                this.s = [];
                T.forEach(tb => this.s.push(new S(tb.n, tb.c)));
            }
            try {
                const sv = localStorage.getItem(`${SK}_${id}`);
                if (sv) {
                    const d = JSON.parse(sv);
                    d.d.forEach((sd, i) => {
                        if (this.s[i]) this.s[i].from(sd);
                    });
                }
            } catch (e) {}
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
            const sh = this.s.filter(s => s.r.length > 0);
            if (sh.length === 0) return '';
            let t = '=== 📚 记忆表格 ===\n\n';
            sh.forEach(s => t += s.txt() + '\n');
            t += '\n=== 表格结束 ===\n';
            return t;
        }
    }
    
    const m = new M();
    
    // 解析
    function prs(tx) {
        const cs = [];
        const rg = /<(GaigaiMemory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
        let mt;
        while ((mt = rg.exec(tx)) !== null) {
            let cn = mt[2].replace(/<!--/g, '').replace(/-->/g, '').trim();
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
    
    // 注入
    function inj(ev) {
        if (!C.inj) return;
        const p = m.pmt();
        if (!p) return;
        let rl = 'system', ps = ev.chat.length;
        if (C.pos === 'system') { rl = 'system'; ps = 0; }
        else if (C.pos === 'user') { rl = 'user'; ps = Math.max(0, ev.chat.length - C.d); }
        else if (C.pos === 'before_last') { rl = 'system'; ps = Math.max(0, ev.chat.length - 1 - C.d); }
        ev.chat.splice(ps, 0, { role: rl, content: p });
        console.log(`✅ [INJECT] ${C.pos} @ ${ps}`);
        if (C.log) console.log('📝\n' + p);
    }
    
    // UI
    function thm() {
        document.documentElement.style.setProperty('--g-c', UI.c);
        document.documentElement.style.setProperty('--g-o', UI.o / 100);
    }
    
    function pop(ttl, htm) {
        $('#g-pop').remove();
        thm();
        const $o = $('<div>', { id: 'g-pop', class: 'g-ov' });
        const $p = $('<div>', { class: UI.g ? 'g-w g-gl' : 'g-w' });
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
    
    function shw() {
        const ss = m.all();
        
        const tbs = ss.map((s, i) => 
            `<button class="g-t${i === 0 ? ' act' : ''}" data-i="${i}">${s.n} (${s.r.length})</button>`
        ).join('');
        
        const tls = `
            <input type="text" id="g-src" placeholder="搜索">
            <button id="g-ad">➕</button>
            <button id="g-ex">📥</button>
            <button id="g-cl">🗑️</button>
            <button id="g-tm">🎨</button>
            <button id="g-cf">⚙️</button>
        `;
        
        const tbls = ss.map((s, i) => gtb(s, i)).join('');
        
        const h = `
            <div class="g-vw">
                <div class="g-ts">${tbs}</div>
                <div class="g-tl">${tls}</div>
                <div class="g-tb">${tbls}</div>
            </div>
        `;
        
        pop('📚 Gaigai', h);
        setTimeout(bnd, 100);
    }
    
    // ✅ 方案二：单一表格 + sticky表头
    function gtb(s, ti) {
        const v = ti === 0 ? '' : 'display:none;';
        let h = `<div class="g-tbc" data-i="${ti}" style="${v}">`;
        h += '<div class="g-tbl-wrap"><table>';
        
        // 表头
        h += '<thead class="g-sticky"><tr>';
        h += '<th class="g-col-num">#</th>';
        s.c.forEach(c => h += `<th>${esc(c)}</th>`);
        h += '<th class="g-col-act">操作</th>';
        h += '</tr></thead>';
        
        // 表体
        h += '<tbody>';
        if (s.r.length === 0) {
            h += `<tr class="g-emp"><td colspan="${s.c.length + 2}">暂无数据</td></tr>`;
        } else {
            s.r.forEach((rw, ri) => {
                h += `<tr data-r="${ri}">`;
                h += `<td class="g-n">${ri}</td>`;
                s.c.forEach((c, ci) => {
                    const val = rw[ci] || '';
                    h += `<td class="g-e" contenteditable="true" data-r="${ri}" data-c="${ci}">${esc(val)}</td>`;
                });
                h += `<td class="g-col-act"><button class="g-d" data-r="${ri}">删除</button></td>`;
                h += '</tr>';
            });
        }
        h += '</tbody></table></div></div>';
        return h;
    }
    
    function bnd() {
        $('.g-t').on('click', function() {
            const i = $(this).data('i');
            $('.g-t').removeClass('act');
            $(this).addClass('act');
            $('.g-tbc').hide();
            $(`.g-tbc[data-i="${i}"]`).show();
        });
        $('.g-e').on('blur', function() {
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
            }
        });
        $('#g-src').on('input', function() {
            const k = $(this).val().toLowerCase();
            $('.g-tbc:visible tbody tr:not(.g-emp)').each(function() {
                $(this).toggle($(this).text().toLowerCase().includes(k) || k === '');
            });
        });
        $('#g-ad').on('click', function() {
            const ti = parseInt($('.g-t.act').data('i'));
            const sh = m.get(ti);
            if (sh) {
                const nr = {};
                sh.c.forEach((_, i) => nr[i] = '');
                sh.ins(nr);
                m.save();
                $(`.g-tbc[data-i="${ti}"]`).html($(gtb(sh, ti)).html());
                bnd();
            }
        });
        $('.g-d').on('click', function() {
            if (!confirm('删除？')) return;
            const ti = parseInt($('.g-t.act').data('i'));
            const ri = parseInt($(this).data('r'));
            const sh = m.get(ti);
            if (sh) {
                sh.del(ri);
                m.save();
                $(`.g-tbc[data-i="${ti}"]`).html($(gtb(sh, ti)).html());
                bnd();
            }
        });
        $('#g-ex').on('click', function() {
            const d = { v: V, t: new Date().toISOString(), s: m.all().map(s => s.json()) };
            const j = JSON.stringify(d, null, 2);
            const b = new Blob([j], { type: 'application/json' });
            const u = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u;
            a.download = `gaigai_${m.gid()}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(u);
        });
        $('#g-cl').on('click', function() {
            const ti = parseInt($('.g-t.act').data('i'));
            const sh = m.get(ti);
            if (!confirm(`清空"${sh.n}"？`)) return;
            sh.r = [];
            m.save();
            $(`.g-tbc[data-i="${ti}"]`).html($(gtb(sh, ti)).html());
            bnd();
        });
        $('#g-tm').on('click', shtm);
        $('#g-cf').on('click', shcf);
    }
    
    function shtm() {
        const h = `
            <div class="g-p">
                <h4>🎨 主题</h4>
                <label>颜色：</label>
                <input type="color" id="tc" value="${UI.c}" style="width:100%; height:35px; border-radius:4px; border:1px solid #ddd;">
                <br><br>
                <label>透明度：<span id="to">${UI.o}%</span></label>
                <input type="range" id="tor" min="70" max="100" value="${UI.o}" style="width:100%;">
                <br><br>
                <label><input type="checkbox" id="tg" ${UI.g ? 'checked' : ''}> 毛玻璃</label>
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
                alert('✅ 已保存');
                $('#g-pop').remove();
                shw();
            });
            $('#tr').on('click', function() {
                UI = { c: '#9c4c4c', o: 95, g: true };
                try { localStorage.removeItem(UK); } catch (e) {}
                alert('✅ 已重置');
                $('#g-pop').remove();
                shw();
            });
        }, 100);
    }
    
    function shcf() {
        const h = `
            <div class="g-p">
                <h4>⚙️ 配置</h4>
                <label><input type="checkbox" id="ci" ${C.inj ? 'checked' : ''}> 启用注入</label>
                <br><br>
                <label>位置：</label>
                <select id="cp">
                    <option value="system" ${C.pos === 'system' ? 'selected' : ''}>系统消息</option>
                    <option value="user" ${C.pos === 'user' ? 'selected' : ''}>用户消息</option>
                    <option value="before_last" ${C.pos === 'before_last' ? 'selected' : ''}>最后消息前</option>
                </select>
                <br><br>
                <label><input type="checkbox" id="cl" ${C.log ? 'checked' : ''}> 显示日志</label>
                <br><br>
                <label><input type="checkbox" id="cpc" ${C.pc ? 'checked' : ''}> 独立数据</label>
                <br><br>
                <button id="cs">💾 保存</button>
                <button id="ct">🧪 测试</button>
                <div id="cr" style="display:none; margin-top:10px; padding:8px; background:#f5f5f5; border-radius:4px;">
                    <pre id="ctx" style="max-height:200px; overflow:auto; font-size:9px;"></pre>
                </div>
            </div>
        `;
        pop('⚙️ 配置', h);
        setTimeout(() => {
            $('#cs').on('click', function() {
                C.inj = $('#ci').is(':checked');
                C.pos = $('#cp').val();
                C.log = $('#cl').is(':checked');
                C.pc = $('#cpc').is(':checked');
                alert('✅ 已保存');
            });
            $('#ct').on('click', function() {
                const p = m.pmt();
                if (p) {
                    $('#cr').show();
                    $('#ctx').text(p);
                } else {
                    alert('⚠️ 无数据');
                }
            });
        }, 100);
    }
    
    function esc(t) {
        const mp = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(t).replace(/[&<>"']/g, c => mp[c]);
    }
    
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
                console.log('✅ 指令:', cs.length);
                exe(cs);
            }
        } catch (e) {}
    }
    
    function ochat() { m.load(); }
    function opmt(ev) { try { inj(ev); } catch (e) {} }
    
    // 初始化
    function ini() {
        if (typeof $ === 'undefined' || typeof SillyTavern === 'undefined') {
            setTimeout(ini, 500);
            return;
        }
        
        try { const sv = localStorage.getItem(UK); if (sv) UI = { ...UI, ...JSON.parse(sv) }; } catch (e) {}
        
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
                console.log('✅ 事件注册');
            } catch (e) {}
        }
        
        console.log('✅ Gaigai v' + V + ' 已就绪');
    }
    
    setTimeout(ini, 1000);
    
    window.Gaigai = { v: V, m: m, shw: shw };
    
})();
