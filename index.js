// Gaigai 表格记忆系统 v0.5.0 - 完整终极版
(function() {
    'use strict';
    
    console.log('🚀 Gaigai 表格 v0.5.0 启动中...');
    
    const VERSION = '0.5.0';
    const STORAGE_KEY = 'gaigai_data';
    const UI_CONFIG_KEY = 'gaigai_ui_config';
    
    // ========== UI配置 ==========
    let UI_CONFIG = {
        themeColor: '#9c4c4c',      // 主题色
        bgOpacity: 0.95,             // 背景透明度
        glassEffect: true,           // 毛玻璃效果
        popupWidth: 750,             // 弹窗宽度
        popupHeight: 550             // 弹窗高度
    };
    
    // 加载UI配置
    function loadUIConfig() {
        try {
            const saved = localStorage.getItem(UI_CONFIG_KEY);
            if (saved) {
                UI_CONFIG = { ...UI_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('加载UI配置失败:', e);
        }
    }
    
    // 保存UI配置
    function saveUIConfig() {
        try {
            localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(UI_CONFIG));
            console.log('💾 UI配置已保存');
        } catch (e) {
            console.error('保存UI配置失败:', e);
        }
    }
    
    // ========== 用户配置 ==========
    const CONFIG = {
        enableInjection: true,
        injectionPosition: 'system',
        injectionDepth: 0,
        showInjectionLog: true,
        perCharacterData: true
    };
    
    // ========== 表格配置 ==========
    const TABLE_CONFIG = [
        { name: '主线剧情', columns: ['剧情名', '开始时间', '完结时间', '地点', '事件概要', '关键物品', '承诺/约定', '状态'] },
        { name: '支线追踪', columns: ['支线名', '开始时间', '完结时间', '事件进展', '状态', '关键NPC'] },
        { name: '角色状态', columns: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
        { name: '人物档案', columns: ['姓名', '年龄', '身份', '地点', '性格', '对user态度'] },
        { name: '人物关系', columns: ['角色A', '角色B', '关系描述'] },
        { name: '世界设定', columns: ['设定名', '类型', '详细说明', '影响范围'] },
        { name: '物品追踪', columns: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注'] }
    ];
    
    // ========== Sheet 类 ==========
    class Sheet {
        constructor(name, columns) {
            this.name = name;
            this.columns = columns;
            this.rows = [];
        }
        
        updateRow(rowIndex, data) {
            if (rowIndex < 0) return;
            while (this.rows.length <= rowIndex) {
                this.rows.push({});
            }
            Object.entries(data).forEach(([colIndex, value]) => {
                this.rows[rowIndex][colIndex] = value;
            });
            console.log(`✏️ 更新 ${this.name} 行${rowIndex}:`, data);
        }
        
        insertRow(data) {
            this.rows.push(data);
            console.log(`➕ 插入 ${this.name}:`, data);
        }
        
        deleteRow(rowIndex) {
            if (rowIndex >= 0 && rowIndex < this.rows.length) {
                this.rows.splice(rowIndex, 1);
                console.log(`🗑️ 删除 ${this.name} 行${rowIndex}`);
            }
        }
        
        toJSON() {
            return { name: this.name, columns: this.columns, rows: this.rows };
        }
        
        fromJSON(data) {
            this.name = data.name || this.name;
            this.columns = data.columns || this.columns;
            this.rows = data.rows || [];
        }
        
        toReadableText() {
            if (this.rows.length === 0) return `【${this.name}】：暂无数据`;
            
            let text = `【${this.name}】\n`;
            this.rows.forEach((row, index) => {
                text += `  [行${index}] `;
                this.columns.forEach((col, colIndex) => {
                    const value = row[colIndex] || '';
                    if (value) {
                        text += `${col}:${value} | `;
                    }
                });
                text += '\n';
            });
            return text;
        }
    }
    
    // ========== Sheet 管理器 ==========
    class SheetManager {
        constructor() {
            this.sheets = [];
            this.currentChatId = null;
            this.init();
        }
        
        init() {
            TABLE_CONFIG.forEach(config => {
                this.sheets.push(new Sheet(config.name, config.columns));
            });
        }
        
        getSheet(index) { return this.sheets[index]; }
        getAllSheets() { return this.sheets; }
        
        save() {
            const chatId = this.getChatId();
            if (!chatId) return;
            const data = { version: VERSION, chatId: chatId, sheets: this.sheets.map(sheet => sheet.toJSON()) };
            try {
                localStorage.setItem(`${STORAGE_KEY}_${chatId}`, JSON.stringify(data));
                console.log('💾 表格数据已保存');
            } catch (e) {
                console.error('保存失败:', e);
            }
        }
        
        load() {
            const chatId = this.getChatId();
            if (!chatId) return;
            
            if (this.currentChatId !== chatId) {
                console.log('💬 检测到聊天切换');
                this.currentChatId = chatId;
                this.init();
            }
            
            try {
                const saved = localStorage.getItem(`${STORAGE_KEY}_${chatId}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    data.sheets.forEach((sheetData, index) => {
                        if (this.sheets[index]) {
                            this.sheets[index].fromJSON(sheetData);
                        }
                    });
                    console.log('📂 表格数据已加载');
                }
            } catch (e) {
                console.error('加载失败:', e);
            }
        }
        
        getChatId() {
            try {
                const context = this.getContext();
                if (!context) return 'default';
                
                let chatId = 'default';
                
                if (CONFIG.perCharacterData) {
                    const characterName = context.name2 || context.characters?.[context.characterId]?.name || 'unknown';
                    const chatName = context.chat_metadata?.file_name || context.sessionId || context.characterId || 'main';
                    chatId = `${characterName}_${chatName}`;
                }
                
                return chatId;
            } catch (e) {
                return 'default';
            }
        }
        
        getContext() {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                return SillyTavern.getContext();
            }
            return null;
        }
        
        generateMemoryPrompt() {
            const sheets = this.sheets.filter(sheet => sheet.rows.length > 0);
            
            if (sheets.length === 0) return '';
            
            let text = '=== 📚 记忆表格（请参考以下信息保持一致性）===\n\n';
            sheets.forEach(sheet => {
                text += sheet.toReadableText() + '\n';
            });
            text += '\n=== 表格数据结束 ===\n';
            text += '请根据以上表格内容保持剧情连贯性，并在发生重要事件时更新表格。\n';
            
            return text;
        }
    }
    
    const sheetManager = new SheetManager();
    
    // ========== AI 指令解析 ==========
    function parseAICommands(text) {
        const commands = [];
        
        const tagRegex = /<(GaigaiMemory|tableEdit|gaigaimemory|tableedit)>([\s\S]*?)<\/\1>/gi;
        const matches = [];
        let match;
        
        while ((match = tagRegex.exec(text)) !== null) {
            matches.push(match[2]);
        }
        
        if (matches.length === 0) return commands;
        
        matches.forEach((content) => {
            content = content.replace(/<!--/g, '').replace(/-->/g, '').trim();
            
            const funcNames = ['insertRow', 'updateRow', 'deleteRow'];
            
            funcNames.forEach(funcName => {
                let startIndex = 0;
                
                while (true) {
                    const funcIndex = content.indexOf(funcName + '(', startIndex);
                    if (funcIndex === -1) break;
                    
                    let depth = 0;
                    let endIndex = -1;
                    for (let i = funcIndex + funcName.length; i < content.length; i++) {
                        if (content[i] === '(') depth++;
                        if (content[i] === ')') {
                            depth--;
                            if (depth === 0) {
                                endIndex = i;
                                break;
                            }
                        }
                    }
                    
                    if (endIndex === -1) break;
                    
                    const argsStart = funcIndex + funcName.length + 1;
                    const argsStr = content.substring(argsStart, endIndex);
                    
                    const parsed = parseSimpleArgs(argsStr, funcName);
                    if (parsed) {
                        commands.push({
                            type: funcName.replace('Row', '').toLowerCase(),
                            ...parsed
                        });
                    }
                    
                    startIndex = endIndex + 1;
                }
            });
        });
        
        return commands;
    }
    
    function parseSimpleArgs(argsStr, funcName) {
        try {
            const braceStart = argsStr.indexOf('{');
            const braceEnd = argsStr.lastIndexOf('}');
            
            if (braceStart === -1 || braceEnd === -1) return null;
            
            const beforeBrace = argsStr.substring(0, braceStart).trim();
            const objectStr = argsStr.substring(braceStart, braceEnd + 1);
            
            const numberStrs = beforeBrace.split(',').map(s => s.trim()).filter(s => s !== '');
            const numbers = numberStrs.map(s => parseInt(s));
            
            const data = parseDataObject(objectStr);
            
            if (funcName === 'insertRow') {
                return { tableIndex: numbers[0], rowIndex: null, data: data };
            } else if (funcName === 'updateRow') {
                return { tableIndex: numbers[0], rowIndex: numbers[1], data: data };
            } else if (funcName === 'deleteRow') {
                return { tableIndex: numbers[0], rowIndex: numbers[1], data: null };
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
    
    function parseDataObject(str) {
        const data = {};
        try {
            str = str.trim().replace(/^\{|\}$/g, '').trim();
            const kvRegex = /(\d+)\s*:\s*"([^"]*)"/g;
            let match;
            
            while ((match = kvRegex.exec(str)) !== null) {
                data[match[1]] = match[2];
            }
        } catch (e) {
            console.error('数据解析失败:', e);
        }
        return data;
    }
    
    function executeCommands(commands) {
        commands.forEach((cmd) => {
            const sheet = sheetManager.getSheet(cmd.tableIndex);
            if (!sheet) return;
            
            switch (cmd.type) {
                case 'update':
                    if (cmd.rowIndex !== null) sheet.updateRow(cmd.rowIndex, cmd.data);
                    break;
                case 'insert':
                    sheet.insertRow(cmd.data);
                    break;
                case 'delete':
                    if (cmd.rowIndex !== null) sheet.deleteRow(cmd.rowIndex);
                    break;
            }
        });
        
        sheetManager.save();
    }
    
    // ========== 注入表格数据到AI ==========
    function injectMemoryToPrompt(eventData) {
        if (!CONFIG.enableInjection) return;
        
        const memoryPrompt = sheetManager.generateMemoryPrompt();
        if (!memoryPrompt) return;
        
        let role = 'system';
        let insertPosition = eventData.chat.length;
        
        switch (CONFIG.injectionPosition) {
            case 'system':
                role = 'system';
                insertPosition = 0;
                break;
            case 'user':
                role = 'user';
                insertPosition = Math.max(0, eventData.chat.length - CONFIG.injectionDepth);
                break;
            case 'before_last':
                role = 'system';
                insertPosition = Math.max(0, eventData.chat.length - 1 - CONFIG.injectionDepth);
                break;
        }
        
        const injectionMessage = { role: role, content: memoryPrompt };
        eventData.chat.splice(insertPosition, 0, injectionMessage);
        
        console.log(`✅ [INJECT] 已注入，位置: ${CONFIG.injectionPosition}, 索引: ${insertPosition}`);
        
        if (CONFIG.showInjectionLog) {
            console.log('📝 [INJECT] 内容：\n' + memoryPrompt);
        }
    }
    
    // ========== UI 渲染 ==========
    function applyTheme() {
        const root = document.documentElement;
        root.style.setProperty('--gaigai-theme-color', UI_CONFIG.themeColor);
        root.style.setProperty('--gaigai-bg-opacity', UI_CONFIG.bgOpacity);
    }
    
    function createPopup(title, content, width) {
        $('#gaigai-popup').remove();
        
        applyTheme();
        
        const overlay = $('<div>', { id: 'gaigai-popup', class: 'gaigai-overlay' });
        
        const popupClass = UI_CONFIG.glassEffect ? 'gaigai-popup glass-effect' : 'gaigai-popup';
        const popup = $('<div>', { class: popupClass });
        
        const header = $('<div>', { class: 'gaigai-header', html: `<h3>${title}</h3>` });
        const closeBtn = $('<button>', { class: 'gaigai-close', text: '×' }).on('click', () => overlay.remove());
        
        header.append(closeBtn);
        
        const body = $('<div>', { class: 'gaigai-body', html: content });
        
        popup.append(header, body);
        overlay.append(popup);
        
        overlay.on('click', function(e) {
            if (e.target === overlay[0]) overlay.remove();
        });
        
        $(document).on('keydown.gaigai', function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                $(document).off('keydown.gaigai');
            }
        });
        
        $('body').append(overlay);
        return popup;
    }
    
    function showTableViewer() {
        const sheets = sheetManager.getAllSheets();
        
        let html = '<div class="gaigai-viewer">';
        
        html += '<div class="gaigai-tabs">';
        sheets.forEach((sheet, index) => {
            const active = index === 0 ? 'active' : '';
            const count = sheet.rows.length;
            html += `<button class="gaigai-tab ${active}" data-index="${index}">${sheet.name} (${count})</button>`;
        });
        html += '</div>';
        
        html += `
            <div class="gaigai-toolbar">
                <input type="text" id="gaigai-search" placeholder="搜索..." />
                <button id="gaigai-add-row">➕ 添加</button>
                <button id="gaigai-export">📥 导出</button>
                <button id="gaigai-clear">🗑️ 清空</button>
                <button id="gaigai-theme">🎨 主题</button>
                <button id="gaigai-config">⚙️ 配置</button>
            </div>
        `;
        
        html += '<div class="gaigai-tables">';
        sheets.forEach((sheet, index) => {
            html += generateTableHTML(sheet, index);
        });
        html += '</div></div>';
        
        createPopup('📚 Gaigai表格记忆', html);
        
        setTimeout(() => {
            bindViewerEvents();
        }, 100);
    }
    
    function generateTableHTML(sheet, tableIndex) {
        const isActive = tableIndex === 0;
        const display = isActive ? '' : 'display:none;';
        
        let html = `<div class="gaigai-table-container" data-index="${tableIndex}" style="${display}">`;
        
        html += '<div class="gaigai-table-header">';
        html += '<table><thead><tr>';
        html += '<th style="width:45px;">#</th>';
        sheet.columns.forEach(col => {
            html += `<th>${escapeHtml(col)}</th>`;
        });
        html += '<th style="width:70px;">操作</th>';
        html += '</tr></thead></table>';
        html += '</div>';
        
        html += '<div class="gaigai-table-body">';
        html += '<table>';
        html += '<thead style="visibility: collapse;"><tr>';
        html += '<th style="width:45px;">#</th>';
        sheet.columns.forEach(col => {
            html += `<th>${escapeHtml(col)}</th>`;
        });
        html += '<th style="width:70px;">操作</th>';
        html += '</tr></thead>';
        
        html += '<tbody>';
        if (sheet.rows.length === 0) {
            html += `<tr class="empty-row"><td colspan="${sheet.columns.length + 2}">暂无数据</td></tr>`;
        } else {
            sheet.rows.forEach((row, rowIndex) => {
                html += `<tr data-row="${rowIndex}">`;
                html += `<td class="row-num">${rowIndex}</td>`;
                
                sheet.columns.forEach((col, colIndex) => {
                    const value = row[colIndex] || '';
                    html += `<td class="editable" contenteditable="true" data-row="${rowIndex}" data-col="${colIndex}">${escapeHtml(value)}</td>`;
                });
                
                html += `<td><button class="delete-row" data-row="${rowIndex}">删除</button></td>`;
                html += '</tr>';
            });
        }
        html += '</tbody></table></div></div>';
        
        return html;
    }
    
    function bindViewerEvents() {
        $('.gaigai-tab').on('click', function() {
            const index = $(this).data('index');
            $('.gaigai-tab').removeClass('active');
            $(this).addClass('active');
            $('.gaigai-table-container').hide();
            $(`.gaigai-table-container[data-index="${index}"]`).show();
        });
        
        $('.editable').on('blur', function() {
            const tableIndex = parseInt($('.gaigai-tab.active').data('index'));
            const rowIndex = parseInt($(this).data('row'));
            const colIndex = parseInt($(this).data('col'));
            const newValue = $(this).text().trim();
            
            const sheet = sheetManager.getSheet(tableIndex);
            if (sheet) {
                const data = {};
                data[colIndex] = newValue;
                sheet.updateRow(rowIndex, data);
                sheetManager.save();
            }
        });
        
        $('#gaigai-search').on('input', function() {
            const keyword = $(this).val().toLowerCase();
            $('.gaigai-table-container:visible tbody tr:not(.empty-row)').each(function() {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.includes(keyword) || keyword === '');
            });
        });
        
        $('#gaigai-add-row').on('click', function() {
            const tableIndex = parseInt($('.gaigai-tab.active').data('index'));
            const sheet = sheetManager.getSheet(tableIndex);
            
            if (sheet) {
                const newRow = {};
                sheet.columns.forEach((_, index) => {
                    newRow[index] = '';
                });
                sheet.insertRow(newRow);
                sheetManager.save();
                
                const $table = $(`.gaigai-table-container[data-index="${tableIndex}"]`);
                $table.html($(generateTableHTML(sheet, tableIndex)).html());
                bindViewerEvents();
            }
        });
        
        $('.delete-row').on('click', function() {
            if (!confirm('确定删除？')) return;
            
            const tableIndex = parseInt($('.gaigai-tab.active').data('index'));
            const rowIndex = parseInt($(this).data('row'));
            const sheet = sheetManager.getSheet(tableIndex);
            
            if (sheet) {
                sheet.deleteRow(rowIndex);
                sheetManager.save();
                
                const $table = $(`.gaigai-table-container[data-index="${tableIndex}"]`);
                $table.html($(generateTableHTML(sheet, tableIndex)).html());
                bindViewerEvents();
            }
        });
        
        $('#gaigai-export').on('click', function() {
            const data = {
                version: VERSION,
                exportTime: new Date().toISOString(),
                sheets: sheetManager.getAllSheets().map(s => s.toJSON())
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gaigai_${sheetManager.getChatId()}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        $('#gaigai-clear').on('click', function() {
            const tableIndex = parseInt($('.gaigai-tab.active').data('index'));
            const sheet = sheetManager.getSheet(tableIndex);
            
            if (!confirm(`确定清空"${sheet.name}"？`)) return;
            
            sheet.rows = [];
            sheetManager.save();
            
            const $table = $(`.gaigai-table-container[data-index="${tableIndex}"]`);
            $table.html($(generateTableHTML(sheet, tableIndex)).html());
            bindViewerEvents();
        });
        
        $('#gaigai-theme').on('click', function() {
            showThemePanel();
        });
        
        $('#gaigai-config').on('click', function() {
            showConfigPanel();
        });
    }
    
    function showThemePanel() {
        const themeHtml = `
            <div class="gaigai-config">
                <h4>🎨 主题设置</h4>
                
                <label>主题颜色：</label>
                <input type="color" id="theme-color" value="${UI_CONFIG.themeColor}" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd;">
                <br><br>
                
                <label>背景透明度：<span id="opacity-value">${Math.round(UI_CONFIG.bgOpacity * 100)}%</span></label>
                <input type="range" id="bg-opacity" min="50" max="100" value="${UI_CONFIG.bgOpacity * 100}" style="width:100%;">
                <br><br>
                
                <label>
                    <input type="checkbox" id="glass-effect" ${UI_CONFIG.glassEffect ? 'checked' : ''}>
                    启用毛玻璃效果
                </label>
                <br><br>
                
                <label>弹窗宽度：<span id="width-value">${UI_CONFIG.popupWidth}px</span></label>
                <input type="range" id="popup-width" min="600" max="1200" step="50" value="${UI_CONFIG.popupWidth}" style="width:100%;">
                <br><br>
                
                <label>弹窗高度：<span id="height-value">${UI_CONFIG.popupHeight}px</span></label>
                <input type="range" id="popup-height" min="400" max="800" step="50" value="${UI_CONFIG.popupHeight}" style="width:100%;">
                <br><br>
                
                <button id="save-theme">💾 保存并应用</button>
                <button id="reset-theme">🔄 恢复默认</button>
                
                <div style="margin-top:15px; padding:10px; background:#f0f0f0; border-radius:5px; font-size:11px;">
                    <strong>预设主题：</strong><br>
                    <button class="preset-theme" data-color="#9c4c4c" style="background:#9c4c4c; color:#fff; margin:5px; padding:5px 10px; border:none; border-radius:3px;">经典红</button>
                    <button class="preset-theme" data-color="#4a90e2" style="background:#4a90e2; color:#fff; margin:5px; padding:5px 10px; border:none; border-radius:3px;">天空蓝</button>
                    <button class="preset-theme" data-color="#50c878" style="background:#50c878; color:#fff; margin:5px; padding:5px 10px; border:none; border-radius:3px;">薄荷绿</button>
                    <button class="preset-theme" data-color="#9b59b6" style="background:#9b59b6; color:#fff; margin:5px; padding:5px 10px; border:none; border-radius:3px;">优雅紫</button>
                    <button class="preset-theme" data-color="#e67e22" style="background:#e67e22; color:#fff; margin:5px; padding:5px 10px; border:none; border-radius:3px;">活力橙</button>
                </div>
            </div>
        `;
        
        createPopup('🎨 主题设置', themeHtml, '500px');
        
        setTimeout(() => {
            $('#bg-opacity').on('input', function() {
                $('#opacity-value').text($(this).val() + '%');
            });
            
            $('#popup-width').on('input', function() {
                $('#width-value').text($(this).val() + 'px');
            });
            
            $('#popup-height').on('input', function() {
                $('#height-value').text($(this).val() + 'px');
            });
            
            $('.preset-theme').on('click', function() {
                const color = $(this).data('color');
                $('#theme-color').val(color);
            });
            
            $('#save-theme').on('click', function() {
                UI_CONFIG.themeColor = $('#theme-color').val();
                UI_CONFIG.bgOpacity = parseInt($('#bg-opacity').val()) / 100;
                UI_CONFIG.glassEffect = $('#glass-effect').is(':checked');
                UI_CONFIG.popupWidth = parseInt($('#popup-width').val());
                UI_CONFIG.popupHeight = parseInt($('#popup-height').val());
                
                saveUIConfig();
                applyTheme();
                alert('✅ 主题已保存！刷新表格查看效果。');
                $('#gaigai-popup').remove();
                showTableViewer();
            });
            
            $('#reset-theme').on('click', function() {
                if (!confirm('确定恢复默认主题？')) return;
                
                UI_CONFIG = {
                    themeColor: '#9c4c4c',
                    bgOpacity: 0.95,
                    glassEffect: true,
                    popupWidth: 750,
                    popupHeight: 550
                };
                
                saveUIConfig();
                alert('✅ 已恢复默认！');
                $('#gaigai-popup').remove();
                showTableViewer();
            });
        }, 100);
    }
    
    function showConfigPanel() {
        const configHtml = `
            <div class="gaigai-config">
                <h4>⚙️ 功能配置</h4>
                
                <label>
                    <input type="checkbox" id="config-enable-injection" ${CONFIG.enableInjection ? 'checked' : ''}>
                    启用表格数据注入
                </label>
                <br><br>
                
                <label>注入位置：</label>
                <select id="config-injection-position">
                    <option value="system" ${CONFIG.injectionPosition === 'system' ? 'selected' : ''}>系统消息（最前面）</option>
                    <option value="user" ${CONFIG.injectionPosition === 'user' ? 'selected' : ''}>用户消息</option>
                    <option value="before_last" ${CONFIG.injectionPosition === 'before_last' ? 'selected' : ''}>最后一条消息前</option>
                </select>
                <br><br>
                
                <label>
                    <input type="checkbox" id="config-show-log" ${CONFIG.showInjectionLog ? 'checked' : ''}>
                    在控制台显示注入内容
                </label>
                <br><br>
                
                <label>
                    <input type="checkbox" id="config-per-character" ${CONFIG.perCharacterData ? 'checked' : ''}>
                    每个角色独立数据
                </label>
                <br><br>
                
                <button id="save-config">💾 保存配置</button>
                <button id="test-inject">🧪 测试注入</button>
                
                <div id="config-result" style="margin-top:15px; padding:10px; background:#f0f0f0; border-radius:5px; display:none;">
                    <pre id="config-result-text" style="max-height:250px; overflow:auto; font-size:10px;"></pre>
                </div>
            </div>
        `;
        
        createPopup('⚙️ 配置', configHtml, '550px');
        
        setTimeout(() => {
            $('#save-config').on('click', function() {
                CONFIG.enableInjection = $('#config-enable-injection').is(':checked');
                CONFIG.injectionPosition = $('#config-injection-position').val();
                CONFIG.showInjectionLog = $('#config-show-log').is(':checked');
                CONFIG.perCharacterData = $('#config-per-character').is(':checked');
                
                alert('✅ 配置已保存！');
                console.log('💾 新配置:', CONFIG);
            });
            
            $('#test-inject').on('click', function() {
                const testPrompt = sheetManager.generateMemoryPrompt();
                if (testPrompt) {
                    $('#config-result').show();
                    $('#config-result-text').text(testPrompt);
                } else {
                    alert('⚠️ 当前没有表格数据');
                }
            });
        }, 100);
    }
    
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    // ========== 事件处理 ==========
    function onMessageReceived(messageId) {
        try {
            const context = sheetManager.getContext();
            if (!context || !context.chat) return;
            
            const msgIndex = typeof messageId === 'number' ? messageId : context.chat.length - 1;
            const message = context.chat[msgIndex];
            
            if (!message || message.is_user) return;
            
            const text = message.mes || message.swipes?.[message.swipe_id] || message.message || '';
            const commands = parseAICommands(text);
            
            if (commands.length > 0) {
                console.log('✅ 检测到表格更新指令，数量:', commands.length);
                executeCommands(commands);
            }
        } catch (e) {
            console.error('❌ 处理消息失败:', e);
        }
    }
    
    function onChatChanged() {
        console.log('💬 聊天已切换');
        sheetManager.load();
    }
    
    function onPromptReady(eventData) {
        try {
            injectMemoryToPrompt(eventData);
        } catch (e) {
            console.error('❌ 注入失败:', e);
        }
    }
    
    // ========== 初始化 ==========
    function init() {
        console.log('📋 初始化中...');
        
        if (typeof $ === 'undefined') {
            setTimeout(init, 500);
            return;
        }
        
        if (typeof SillyTavern === 'undefined') {
            setTimeout(init, 500);
            return;
        }
        
        loadUIConfig();
        sheetManager.load();
        addButtons();
        registerEvents();
        
        console.log('✅ Gaigai表格已就绪');
        console.log('💡 当前配置:', CONFIG);
        console.log('🎨 UI配置:', UI_CONFIG);
    }
    
    function addButtons() {
        $('#gaigai-btn').remove();
        const btn = $('<div>', {
            id: 'gaigai-btn',
            class: 'list-group-item flex-container flexGap5',
            css: { cursor: 'pointer' },
            html: '<i class="fa-solid fa-table"></i><span style="margin-left:8px;">Gaigai表格</span>'
        });
        btn.on('click', showTableViewer);
        $('#extensionsMenu').append(btn);
    }
    
    function registerEvents() {
        const context = sheetManager.getContext();
        if (!context || !context.eventSource) {
            console.warn('⚠️ 事件系统未就绪');
            return;
        }
        
        try {
            context.eventSource.on(context.event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
            context.eventSource.on(context.event_types.CHAT_CHANGED, onChatChanged);
            context.eventSource.on(context.event_types.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
            
            console.log('✅ 所有事件已注册');
        } catch (e) {
            console.error('❌ 事件注册失败:', e);
        }
    }
    
    setTimeout(init, 1000);
    
    window.Gaigai = {
        version: VERSION,
        config: CONFIG,
        uiConfig: UI_CONFIG,
        sheetManager: sheetManager,
        showTableViewer: showTableViewer,
        testInject: () => {
            const prompt = sheetManager.generateMemoryPrompt();
            console.log('🧪 测试注入内容：\n' + prompt);
            return prompt;
        }
    };
    
    console.log('📦 Gaigai表格代码已加载');
    
})();







