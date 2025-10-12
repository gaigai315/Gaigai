// Gaigai 表格记忆系统 v0.2
(function() {
    'use strict';
    
    console.log('🚀 Gaigai 表格 v0.2 启动中...');
    
    const VERSION = '0.2.0';
    const STORAGE_KEY = 'gaigai_data';
    
    // ========== 配置 ==========
    const TABLE_CONFIG = [
        { name: '主线剧情', columns: ['剧情名', '开始时间', '完结时间', '地点', '事件概要', '关键物品', '承诺/约定', '状态'] },
        { name: '支线追踪', columns: ['支线名', '开始时间', '完结时间', '事件进展', '状态', '关键NPC'] },
        { name: '角色状态', columns: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
        { name: '人物档案', columns: ['姓名', '身份', '年龄', '性格', '对user态度', '关键能力', '当前状态', '备注'] },
        { name: '人物关系', columns: ['角色A', '角色B', '关系变化', '时间', '原因'] },
        { name: '人物情感', columns: ['角色', '对象', '情感变化', '时间', '原因'] },
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
            return {
                name: this.name,
                columns: this.columns,
                rows: this.rows
            };
        }
        
        fromJSON(data) {
            this.name = data.name || this.name;
            this.columns = data.columns || this.columns;
            this.rows = data.rows || [];
        }
        
        // 生成可读文本
        toReadableText() {
            if (this.rows.length === 0) return `【${this.name}】：暂无数据`;
            
            let text = `【${this.name}】\n`;
            this.rows.forEach((row, index) => {
                text += `  行${index}: `;
                this.columns.forEach((col, colIndex) => {
                    const value = row[colIndex] || '空';
                    text += `${col}="${value}" `;
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
        
        getSheet(index) {
            return this.sheets[index];
        }
        
        getAllSheets() {
            return this.sheets;
        }
        
        save() {
            const chatId = this.getChatId();
            if (!chatId) return;
            
            const data = {
                version: VERSION,
                chatId: chatId,
                sheets: this.sheets.map(sheet => sheet.toJSON())
            };
            
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
                
                return context.chat_metadata?.file_name || 
                       context.characters?.[context.characterId]?.chat || 
                       'default';
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
        
        // 生成所有表格的可读文本
        generateMemoryText() {
            let text = '=== 📚 当前记忆表格数据 ===\n\n';
            this.sheets.forEach(sheet => {
                text += sheet.toReadableText() + '\n';
            });
            text += '\n=== 📋 表格更新指令说明 ===\n';
            text += '使用 <GaigaiMemory>标签包裹指令\n';
            text += '示例: <GaigaiMemory>updateRow(0, 0, {2:"完结时间"})</GaigaiMemory>\n';
            text += '表格编号: 0-主线 1-支线 2-角色 3-档案 4-关系 5-情感 6-设定 7-物品\n';
            return text;
        }
    }
    
    // ========== 全局管理器实例 ==========
    const sheetManager = new SheetManager();
    
    // ========== AI 指令解析（修复版）==========
    function parseAICommands(text) {
        const commands = [];
        
        const tagRegex = /<(?:GaigaiMemory|tableEdit)>([\s\S]*?)<\/(?:GaigaiMemory|tableEdit)>/gi;
        const matches = text.matchAll(tagRegex);
        
        for (const match of matches) {
            let content = match[1];
            
            // 去除HTML注释符号
            content = content.replace(/<!--/g, '').replace(/-->/g, '').trim();
            
            console.log('🔍 解析内容:', content);
            
            // ✅ 修复：使用正确的正则表达式（匹配括号）
            const updateRegex = /updateRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
            let updateMatch;
            while ((updateMatch = updateRegex.exec(content)) !== null) {
                const parsedData = parseDataObject(updateMatch[3]);
                console.log('📝 解析updateRow:', parsedData);
                commands.push({
                    type: 'update',
                    tableIndex: parseInt(updateMatch[1]),
                    rowIndex: parseInt(updateMatch[2]),
                    data: parsedData
                });
            }
            
            const insertRegex = /insertRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
            let insertMatch;
            while ((insertMatch = insertRegex.exec(content)) !== null) {
                const parsedData = parseDataObject(insertMatch[2]);
                console.log('📝 解析insertRow:', parsedData);
                commands.push({
                    type: 'insert',
                    tableIndex: parseInt(insertMatch[1]),
                    data: parsedData
                });
            }
            
            const deleteRegex = /deleteRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*KATEX_INLINE_CLOSE/g;
            let deleteMatch;
            while ((deleteMatch = deleteRegex.exec(content)) !== null) {
                commands.push({
                    type: 'delete',
                    tableIndex: parseInt(deleteMatch[1]),
                    rowIndex: parseInt(deleteMatch[2])
                });
            }
        }
        
        return commands;
    }
    
    function parseDataObject(str) {
        const data = {};
        
        // 更强壮的正则：匹配 数字:值 的格式
        // 支持：0: "值"  或  0:"值"  或  0: '值'
        const pairs = str.split(',');
        
        pairs.forEach(pair => {
            // 匹配 数字: "内容" 或 数字: '内容'
            const match = pair.match(/(\d+)\s*:\s*["']([^"']*)["']/);
            if (match) {
                data[match[1]] = match[2];
            }
        });
        
        console.log('🔧 解析数据对象:', str, '→', data);
        return data;
    }
    
    function executeCommands(commands) {
        commands.forEach(cmd => {
            const sheet = sheetManager.getSheet(cmd.tableIndex);
            if (!sheet) {
                console.warn(`表格 ${cmd.tableIndex} 不存在`);
                return;
            }
            
            switch (cmd.type) {
                case 'update':
                    sheet.updateRow(cmd.rowIndex, cmd.data);
                    break;
                case 'insert':
                    sheet.insertRow(cmd.data);
                    break;
                case 'delete':
                    sheet.deleteRow(cmd.rowIndex);
                    break;
            }
        });
        
        sheetManager.save();
        console.log('✅ 表格已更新并保存');
    }
    
    // ========== UI 渲染 ==========
    function createPopup(title, content, width) {
        $('#gaigai-popup').remove();
        
        const overlay = $('<div>', {
            id: 'gaigai-popup',
            class: 'gaigai-overlay'
        });
        
        const popup = $('<div>', {
            class: 'gaigai-popup',
            css: { maxWidth: width || '900px' }
        });
        
        const header = $('<div>', {
            class: 'gaigai-header',
            html: `<h3>${title}</h3>`
        });
        
        const closeBtn = $('<button>', {
            class: 'gaigai-close',
            text: '×'
        }).on('click', () => overlay.remove());
        
        header.append(closeBtn);
        
        const body = $('<div>', {
            class: 'gaigai-body',
            html: content
        });
        
        popup.append(header, body);
        overlay.append(popup);
        
        overlay.on('click', function(e) {
            if (e.target === overlay[0]) {
                overlay.remove();
            }
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
            html += `<button class="gaigai-tab ${active}" data-index="${index}">${sheet.name}</button>`;
        });
        html += '</div>';
        
        html += `
            <div class="gaigai-toolbar">
                <input type="text" id="gaigai-search" placeholder="搜索..." />
                <button id="gaigai-add-row">➕ 添加行</button>
                <button id="gaigai-export">📥 导出</button>
                <button id="gaigai-clear">🗑️ 清空</button>
            </div>
        `;
        
        html += '<div class="gaigai-tables">';
        sheets.forEach((sheet, index) => {
            html += generateTableHTML(sheet, index);
        });
        html += '</div></div>';
        
        createPopup('📚 Gaigai表格记忆', html, '900px');
        
        setTimeout(() => {
            bindViewerEvents();
        }, 100);
    }
    
    function generateTableHTML(sheet, tableIndex) {
        const isActive = tableIndex === 0;
        const display = isActive ? '' : 'display:none;';
        
        let html = `<div class="gaigai-table" data-index="${tableIndex}" style="${display}">`;
        html += '<table>';
        
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
        html += '</tbody></table></div>';
        
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
    }
    
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    // ========== 核心：注入表格到AI上下文 ==========
    function injectMemoryToChat() {
        const memoryText = sheetManager.generateMemoryText();
        
        // 方法1：通过扩展设置注入
        if (typeof window.setExtensionPrompt === 'function') {
            window.setExtensionPrompt('gaigai', memoryText, 1, 0);
            console.log('✅ 表格已注入到AI上下文（扩展提示词）');
        }
        
        // 方法2：直接添加到聊天上下文
        const context = sheetManager.getContext();
        if (context && context.setExtensionPrompt) {
            context.setExtensionPrompt('gaigai', memoryText, 1, 0);
            console.log('✅ 表格已注入到AI上下文（SillyTavern）');
        }
    }
    
    // ========== 事件处理 ==========
    function onMessageReceived(messageId) {
        console.log('📨 收到消息事件，ID:', messageId);
        
        try {
            const context = sheetManager.getContext();
            if (!context || !context.chat) {
                console.warn('⚠️ 上下文不可用');
                return;
            }
            
            // 如果 messageId 是数字，直接用；如果是对象，取最后一条
            const msgIndex = typeof messageId === 'number' ? messageId : context.chat.length - 1;
            const message = context.chat[msgIndex];
            
            if (!message) {
                console.warn('⚠️ 消息不存在，索引:', msgIndex);
                return;
            }
            
            console.log('📬 消息类型:', message.is_user ? '用户' : 'AI');
            
            if (message.is_user) {
                console.log('⏭️ 跳过用户消息');
                return;
            }
            
            const text = message.mes || '';
            console.log('📝 消息内容长度:', text.length);
            
            const commands = parseAICommands(text);
            
            if (commands.length > 0) {
                console.log('✅ 检测到表格更新指令:', commands);
                executeCommands(commands);
            } else {
                console.log('⏭️ 未检测到表格指令');
            }
        } catch (e) {
            console.error('❌ 处理消息失败:', e);
        }
    }
    
    function onChatChanged() {
        console.log('💬 聊天已切换');
        sheetManager.load();
        setTimeout(injectMemoryToChat, 500);
    }
    
    function onMessageSending() {
        injectMemoryToChat();
    }
    
    // ========== 初始化 ==========
    function init() {
        console.log('📋 初始化中...');
        
        if (typeof $ === 'undefined') {
            console.warn('⚠️ jQuery未加载，500ms后重试');
            setTimeout(init, 500);
            return;
        }
        
        console.log('✅ jQuery已就绪');
        
        sheetManager.load();
        addButtons();
        registerEvents();
        
        setTimeout(() => {
            injectMemoryToChat();
        }, 2000);
        
        console.log('✅ Gaigai表格已就绪');
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
        
        console.log('✅ 按钮已添加');
    }
    
    function registerEvents() {
        const context = sheetManager.getContext();
        if (!context || !context.eventSource) {
            console.warn('⚠️ 事件系统未就绪');
            return;
        }
        
        try {
            // ✅ 使用正确的事件类型
            context.eventSource.on(
                context.event_types.MESSAGE_RECEIVED,
                onMessageReceived
            );
            
            context.eventSource.on(
                context.event_types.CHAT_CHANGED,
                onChatChanged
            );
            
            console.log('✅ 事件已注册');
        } catch (e) {
            console.error('❌ 事件注册失败:', e);
        }
    }
    
    setTimeout(init, 1000);
    
    window.Gaigai = {
        version: VERSION,
        sheetManager: sheetManager,
        showTableViewer: showTableViewer,
        injectMemory: injectMemoryToChat
    };
    
    console.log('📦 Gaigai表格代码已加载');
    
})();





