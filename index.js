// Gaigai 表格记忆系统 v0.4.0 - 完整功能版
(function() {
    'use strict';
    
    console.log('🚀 Gaigai 表格 v0.4.0 启动中...');
    
    const VERSION = '0.4.0';
    const STORAGE_KEY = 'gaigai_data';
    
    // ========== 用户配置 ==========
    const CONFIG = {
        enableInjection: true,           // 是否启用注入
        injectionPosition: 'system',     // 注入位置：'system'(系统消息) | 'user'(用户消息) | 'before_last'(最后一条消息前)
        injectionDepth: 0,               // 从末尾往前插入的位置（0=最后，1=倒数第二条...）
        showInjectionLog: true,          // 是否在控制台显示注入的完整内容
        perCharacterData: true           // 是否为每个角色独立存储数据
    };
    
    // ========== 配置 ==========
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
                console.log('💾 表格数据已保存，存储键:', `${STORAGE_KEY}_${chatId}`);
            } catch (e) {
                console.error('保存失败:', e);
            }
        }
        
        load() {
            const chatId = this.getChatId();
            if (!chatId) return;
            
            // 如果聊天ID变化，重新初始化表格
            if (this.currentChatId !== chatId) {
                console.log('💬 检测到聊天切换，重新加载数据');
                this.currentChatId = chatId;
                this.init(); // 重置为空表格
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
                    console.log('📂 表格数据已加载，存储键:', `${STORAGE_KEY}_${chatId}`);
                }
            } catch (e) {
                console.error('加载失败:', e);
            }
        }
        
        getChatId() {
            try {
                const context = this.getContext();
                if (!context) return 'default';
                
                // ✅ 改进：优先使用角色名+聊天ID组合
                let chatId = 'default';
                
                if (CONFIG.perCharacterData) {
                    // 获取当前角色名
                    const characterName = context.name2 || context.characters?.[context.characterId]?.name || 'unknown';
                    // 获取聊天文件名或ID
                    const chatName = context.chat_metadata?.file_name || 
                                   context.sessionId || 
                                   context.characterId || 
                                   'main';
                    
                    chatId = `${characterName}_${chatName}`;
                    console.log('📝 当前角色:', characterName, '聊天ID:', chatName);
                } else {
                    chatId = context.chat_metadata?.file_name || 
                            context.sessionId || 
                            'default';
                }
                
                return chatId;
            } catch (e) {
                console.error('获取ChatId失败:', e);
                return 'default';
            }
        }
        
        getContext() {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                return SillyTavern.getContext();
            }
            return null;
        }
        
        // ✅ 生成发送给AI的格式化文本
        generateMemoryPrompt() {
            const sheets = this.sheets.filter(sheet => sheet.rows.length > 0);
            
            if (sheets.length === 0) {
                return ''; // 如果没有数据，不注入
            }
            
            let text = '=== 📚 记忆表格（请参考以下信息保持一致性）===\n\n';
            
            sheets.forEach(sheet => {
                text += sheet.toReadableText() + '\n';
            });
            
            text += '\n=== 表格数据结束 ===\n';
            text += '请根据以上表格内容保持剧情连贯性，并在发生重要事件时更新表格。\n';
            
            return text;
        }
        
        // 生成编辑说明（仅用于用户查看）
        generateEditInstructions() {
            let text = '\n\n=== 📋 表格更新指令格式 ===\n';
            text += '使用 <GaigaiMemory>标签包裹指令（用 <!-- --> 包裹）\n';
            text += '表格编号: 0-主线剧情 1-支线追踪 2-角色状态 3-人物档案 4-人物关系 5-世界设定 6-物品追踪\n\n';
            text += '示例：\n';
            text += '<GaigaiMemory>\n';
            text += '<!-- insertRow(0, {0: "剧情名", 1: "开始时间", 2: "", 3: "地点", 4: "事件概要", 5: "关键物品", 6: "承诺/约定", 7: "进行中"}) -->\n';
            text += '</GaigaiMemory>\n';
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
    
    // ========== 核心：注入表格数据到AI提示词 ==========
    function injectMemoryToPrompt(eventData) {
        if (!CONFIG.enableInjection) {
            console.log('⏭️ [INJECT] 注入已禁用');
            return;
        }
        
        const memoryPrompt = sheetManager.generateMemoryPrompt();
        
        if (!memoryPrompt) {
            console.log('⏭️ [INJECT] 无数据，跳过注入');
            return;
        }
        
        // 确定注入角色和位置
        let role = 'system';
        let insertPosition = eventData.chat.length;
        
        switch (CONFIG.injectionPosition) {
            case 'system':
                role = 'system';
                insertPosition = 0; // 插入到最前面
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
        
        const injectionMessage = {
            role: role,
            content: memoryPrompt
        };
        
        // 插入消息
        eventData.chat.splice(insertPosition, 0, injectionMessage);
        
        console.log(`✅ [INJECT] 表格数据已注入`);
        console.log(`   位置: ${CONFIG.injectionPosition}, 角色: ${role}, 索引: ${insertPosition}`);
        console.log(`   内容长度: ${memoryPrompt.length} 字符`);
        
        if (CONFIG.showInjectionLog) {
            console.log('📝 [INJECT] 注入的完整内容：');
            console.log('================== 开始 ==================');
            console.log(memoryPrompt);
            console.log('================== 结束 ==================');
        }
    }
    
    // ========== UI 渲染（保持不变）==========
    function createPopup(title, content, width) {
        $('#gaigai-popup').remove();
        
        const overlay = $('<div>', { id: 'gaigai-popup', class: 'gaigai-overlay' });
        const popup = $('<div>', { class: 'gaigai-popup' });
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
                <button id="gaigai-add-row">➕ 添加行</button>
                <button id="gaigai-export">📥 导出</button>
                <button id="gaigai-clear">🗑️ 清空</button>
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
        
        let html = `<div class="gaigai-table" data-index="${tableIndex}" style="${display}">`;
        html += '<div class="table-wrapper"><table>';
        
        html += '<thead><tr>';
        html += '<th style="width:50px;">#</th>';
        sheet.columns.forEach(col => {
            html += `<th>${escapeHtml(col)}</th>`;
        });
        html += '<th style="width:80px;">操作</th>';
        html += '</tr></thead>';
        
        html += '<tbody>';
        if (sheet.rows.length === 0) {
            html += `<tr class="empty-row"><td colspan="${sheet.columns.length + 2}">暂无数据，点击"添加行"开始记录</td></tr>`;
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
            $('.gaigai-table').hide();
            $(`.gaigai-table[data-index="${index}"]`).show();
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
            $('.gaigai-table:visible tbody tr:not(.empty-row)').each(function() {
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
                
                const $table = $(`.gaigai-table[data-index="${tableIndex}"]`);
                $table.html($(generateTableHTML(sheet, tableIndex)).html());
                bindViewerEvents();
            }
        });
        
        $('.delete-row').on('click', function() {
            if (!confirm('确定删除这一行吗？')) return;
            
            const tableIndex = parseInt($('.gaigai-tab.active').data('index'));
            const rowIndex = parseInt($(this).data('row'));
            const sheet = sheetManager.getSheet(tableIndex);
            
            if (sheet) {
                sheet.deleteRow(rowIndex);
                sheetManager.save();
                
                const $table = $(`.gaigai-table[data-index="${tableIndex}"]`);
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
            
            if (!confirm(`确定清空"${sheet.name}"的所有数据吗？`)) return;
            
            sheet.rows = [];
            sheetManager.save();
            
            const $table = $(`.gaigai-table[data-index="${tableIndex}"]`);
            $table.html($(generateTableHTML(sheet, tableIndex)).html());
            bindViewerEvents();
        });
        
        // ✅ 配置按钮
        $('#gaigai-config').on('click', function() {
            showConfigPanel();
        });
    }
    
    // ✅ 配置面板
    function showConfigPanel() {
        const configHtml = `
            <div class="gaigai-config">
                <h4>💡 注入配置</h4>
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
                    插入深度：<input type="number" id="config-injection-depth" value="${CONFIG.injectionDepth}" min="0" max="10" style="width:60px">
                    <small>（0=最后，1=倒数第二...）</small>
                </label>
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
                    <pre id="config-result-text" style="max-height:300px; overflow:auto; font-size:11px;"></pre>
                </div>
            </div>
        `;
        
        createPopup('⚙️ 配置', configHtml, '600px');
        
        setTimeout(() => {
            $('#save-config').on('click', function() {
                CONFIG.enableInjection = $('#config-enable-injection').is(':checked');
                CONFIG.injectionPosition = $('#config-injection-position').val();
                CONFIG.injectionDepth = parseInt($('#config-injection-depth').val());
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
    
    // ✅ 注入事件
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
        
        sheetManager.load();
        addButtons();
        registerEvents();
        
        console.log('✅ Gaigai表格已就绪');
        console.log('💡 当前配置:', CONFIG);
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
            // 接收AI消息
            context.eventSource.on(
                context.event_types.CHARACTER_MESSAGE_RENDERED,
                onMessageReceived
            );
            
            // 切换聊天
            context.eventSource.on(
                context.event_types.CHAT_CHANGED,
                onChatChanged
            );
            
            // ✅ 注入提示词
            context.eventSource.on(
                context.event_types.CHAT_COMPLETION_PROMPT_READY,
                onPromptReady
            );
            
            console.log('✅ 所有事件已注册');
        } catch (e) {
            console.error('❌ 事件注册失败:', e);
        }
    }
    
    setTimeout(init, 1000);
    
    window.Gaigai = {
        version: VERSION,
        config: CONFIG,
        sheetManager: sheetManager,
        showTableViewer: showTableViewer,
        testInject: () => {
            const prompt = sheetManager.generateMemoryPrompt();
            console.log('🧪 测试注入内容：');
            console.log(prompt);
            return prompt;
        }
    };
    
    console.log('📦 Gaigai表格代码已加载');
    
})();







