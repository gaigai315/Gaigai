// Gaigai记忆系统 v2.0 - 完整可视化版本
(function() {
    const EXTENSION_NAME = 'gaigai-memory';
    const EXTENSION_FOLDER = 'third-party/gaigai-extension';
    
    // 默认配置
    const DEFAULT_CONFIG = {
        enabled: true,
        autoInject: true, // 自动注入提示词
        tables: [
            {
                name: '主线剧情',
                columns: ['日期', '时间', '地点', '事件概要', '关键物品', '承诺/约定']
            },
            {
                name: '支线追踪',
                columns: ['支线名', '日期', '时间', '事件进展', '状态', '关键NPC']
            },
            {
                name: '角色状态',
                columns: ['角色名', '状态变化', '时间', '原因', '当前位置']
            },
            {
                name: '人物档案',
                columns: ['姓名', '身份', '年龄', '性格', '对user态度', '关键能力', '当前状态', '备注']
            },
            {
                name: '人物关系',
                columns: ['角色A', '角色B', '关系变化', '时间', '原因']
            },
            {
                name: '人物情感',
                columns: ['角色', '对象', '情感变化', '时间', '原因']
            },
            {
                name: '世界设定',
                columns: ['设定名', '类型', '详细说明', '影响范围']
            },
            {
                name: '物品追踪',
                columns: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注']
            }
        ],
        promptTemplate: `# 【Gaigai记忆系统】

每次对话后在回复末尾输出记忆更新:

<GaigaiMemory>
<!--
updateRow(表格编号, 行号, {列号: "内容"})
insertRow(表格编号, {列0: "内容", 列1: "内容"})
deleteRow(表格编号, 行号)
-->
</GaigaiMemory>

【表格结构】
表0-主线剧情: 列0日期|列1时间|列2地点|列3事件概要|列4关键物品|列5承诺约定
表1-支线追踪: 列0支线名|列1日期|列2时间|列3事件进展|列4状态|列5关键NPC
表2-角色状态: 列0角色名|列1状态变化|列2时间|列3原因|列4当前位置
表3-人物档案: 列0姓名|列1身份|列2年龄|列3性格|列4对user态度|列5关键能力|列6当前状态|列7备注
表4-人物关系: 列0角色A|列1角色B|列2关系变化|列3时间|列4原因
表5-人物情感: 列0角色|列1对象|列2情感变化|列3时间|列4原因
表6-世界设定: 列0设定名|列1类型|列2详细说明|列3影响范围
表7-物品追踪: 列0物品名称|列1物品描述|列2当前位置|列3持有者|列4状态|列5重要程度|列6备注

【记录原则】
1. 全部过去式,仅记录可观察事实
2. 时间精确到分钟
3. 只在有变化时输出
4. 物品追踪:首次出现插入,变化更新,销毁删除
5. 支线状态:进行中/已完结/失败/XX阶段完结`
    };
    
    // 运行时数据
    let config = null;
    let memoryData = null;
    let currentChatId = null;
    
    console.log('🚀 Gaigai记忆系统启动中...');
    
    // ==================== 初始化 ====================
    
    jQuery(async () => {
        await waitForInit();
        
        // 加载配置
        loadConfig();
        
        // 加载当前聊天的记忆数据
        loadMemoryData();
        
        // 注册事件
        eventSource.on('MESSAGE_RECEIVED', handleAIMessage);
        eventSource.on('CHAT_CHANGED', onChatChanged);
        
        // 添加UI
        addExtensionUI();
        
        // 注册提示词注入器
        if (config.autoInject) {
            registerPromptInjector();
        }
        
        console.log('✅ Gaigai记忆系统已就绪');
    });
    
    function waitForInit() {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof chat !== 'undefined' && 
                    typeof eventSource !== 'undefined' &&
                    typeof extension_settings !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }
    
    // ==================== 配置管理 ====================
    
    function loadConfig() {
        if (!extension_settings[EXTENSION_NAME]) {
            extension_settings[EXTENSION_NAME] = {};
        }
        
        if (!extension_settings[EXTENSION_NAME].config) {
            extension_settings[EXTENSION_NAME].config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
        
        config = extension_settings[EXTENSION_NAME].config;
        console.log('📋 配置已加载', config);
    }
    
    function saveConfig() {
        extension_settings[EXTENSION_NAME].config = config;
        saveSettingsDebounced();
        console.log('💾 配置已保存');
    }
    
    // ==================== 记忆数据管理 ====================
    
    function loadMemoryData() {
        currentChatId = getCurrentChatId();
        if (!currentChatId) {
            memoryData = createEmptyMemoryData();
            return;
        }
        
        if (!extension_settings[EXTENSION_NAME].chats) {
            extension_settings[EXTENSION_NAME].chats = {};
        }
        
        if (extension_settings[EXTENSION_NAME].chats[currentChatId]) {
            memoryData = extension_settings[EXTENSION_NAME].chats[currentChatId];
        } else {
            memoryData = createEmptyMemoryData();
        }
        
        console.log('📂 记忆数据已加载', currentChatId);
    }
    
    function saveMemoryData() {
        if (!currentChatId) return;
        
        if (!extension_settings[EXTENSION_NAME].chats) {
            extension_settings[EXTENSION_NAME].chats = {};
        }
        
        extension_settings[EXTENSION_NAME].chats[currentChatId] = memoryData;
        saveSettingsDebounced();
        console.log('💾 记忆数据已保存');
    }
    
    function createEmptyMemoryData() {
        return {
            tables: config.tables.map(() => [])
        };
    }
    
    function getCurrentChatId() {
        if (!characters || !characters[this_chid]) return null;
        return `${characters[this_chid].name}_${chat_metadata?.file_name || 'default'}`;
    }
    
    function onChatChanged() {
        loadMemoryData();
    }
    
    // ==================== AI消息处理 ====================
    
    function handleAIMessage(messageId) {
        if (!config.enabled) return;
        
        const message = chat[messageId];
        if (!message || message.is_user) return;
        
        const memoryRegex = /<GaigaiMemory>([\s\S]*?)<\/GaigaiMemory>/gi;
        const matches = message.mes.matchAll(memoryRegex);
        
        let hasUpdate = false;
        
        for (const match of matches) {
            executeMemoryCommands(match[1]);
            message.mes = message.mes.replace(match[0], '');
            hasUpdate = true;
        }
        
        if (hasUpdate) {
            // 更新显示
            const messageElement = $(`#chat .mes[mesid="${messageId}"]`);
            if (messageElement.length) {
                messageElement.find('.mes_text').html(message.mes);
            }
            
            saveMemoryData();
            toastr.success('记忆已更新', '', { timeOut: 2000 });
        }
    }
    
    function executeMemoryCommands(commandText) {
        const updateRegex = /updateRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
        const insertRegex = /insertRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
        const deleteRegex = /deleteRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*KATEX_INLINE_CLOSE/g;
        
        let match;
        
        // updateRow
        while ((match = updateRegex.exec(commandText)) !== null) {
            const tableId = parseInt(match[1]);
            const rowId = parseInt(match[2]);
            const updates = parseObjectLiteral(match[3]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                updateRow(tableId, rowId, updates);
            }
        }
        
        // insertRow
        while ((match = insertRegex.exec(commandText)) !== null) {
            const tableId = parseInt(match[1]);
            const rowData = parseObjectLiteral(match[2]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                insertRow(tableId, rowData);
            }
        }
        
        // deleteRow
        while ((match = deleteRegex.exec(commandText)) !== null) {
            const tableId = parseInt(match[1]);
            const rowId = parseInt(match[2]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                deleteRow(tableId, rowId);
            }
        }
    }
    
    function parseObjectLiteral(str) {
        const obj = {};
        const pairs = str.split(',');
        
        pairs.forEach(pair => {
            const colonIndex = pair.indexOf(':');
            if (colonIndex === -1) return;
            
            const key = pair.substring(0, colonIndex).trim().replace(/['"]/g, '');
            const value = pair.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
            
            obj[key] = value;
        });
        
        return obj;
    }
    
    function updateRow(tableId, rowId, updates) {
        const table = memoryData.tables[tableId];
        
        // 确保行存在
        while (table.length <= rowId) {
            table.push({});
        }
        
        Object.assign(table[rowId], updates);
        
        console.log(`✏️ 更新 表${tableId} 行${rowId}`, updates);
    }
    
    function insertRow(tableId, rowData) {
        memoryData.tables[tableId].push(rowData);
        console.log(`➕ 插入 表${tableId}`, rowData);
    }
    
    function deleteRow(tableId, rowId) {
        const table = memoryData.tables[tableId];
        if (rowId >= 0 && rowId < table.length) {
            table.splice(rowId, 1);
            console.log(`🗑️ 删除 表${tableId} 行${rowId}`);
        }
    }
    
    // ==================== 提示词注入 ====================
    
    function registerPromptInjector() {
        // 使用 setExtensionPrompt API
        if (typeof setExtensionPrompt === 'function') {
            setExtensionPrompt(EXTENSION_NAME, getMemoryPrompt, 1, 0);
            console.log('✅ 提示词注入器已注册');
        } else {
            console.warn('⚠️ setExtensionPrompt API 不可用');
        }
    }
    
    function getMemoryPrompt() {
        if (!config.enabled || !config.autoInject) return '';
        
        return config.promptTemplate;
    }
    
    // ==================== UI界面 ====================
    
    function addExtensionUI() {
        // 主菜单按钮
        const menuButton = $(`
            <div id="gaigai-menu" class="list-group-item flex-container flexGap5">
                <div class="fa-solid fa-book"></div>
                <span>Gaigai记忆</span>
            </div>
        `);
        
        menuButton.on('click', showTableViewer);
        $('#extensionsMenu').append(menuButton);
        
        // 设置按钮
        const settingsButton = $(`
            <div id="gaigai-settings" class="list-group-item flex-container flexGap5">
                <div class="fa-solid fa-gear"></div>
                <span>记忆设置</span>
            </div>
        `);
        
        settingsButton.on('click', showSettings);
        $('#extensionsMenu').append(settingsButton);
    }
    
    // ==================== 表格查看器 ====================
    
    function showTableViewer() {
        const html = generateTableViewerHTML();
        
        const popup = callPopup(html, 'text', '', { 
            wide: true, 
            large: true,
            okButton: '关闭'
        });
        
        setTimeout(() => {
            bindTableViewerEvents();
        }, 100);
    }
    
    function generateTableViewerHTML() {
        return `
            <div class="gaigai-table-viewer">
                <h2>📚 Gaigai记忆档案</h2>
                
                <div class="table-tabs">
                    ${config.tables.map((table, i) => `
                        <button class="table-tab ${i === 0 ? 'active' : ''}" data-table="${i}">
                            ${table.name}
                        </button>
                    `).join('')}
                </div>
                
                <div class="table-toolbar">
                    <input type="text" id="table-search" placeholder="搜索..." />
                    <button id="add-row-btn" class="toolbar-btn">
                        <i class="fa-solid fa-plus"></i> 添加行
                    </button>
                    <button id="export-table-btn" class="toolbar-btn">
                        <i class="fa-solid fa-download"></i> 导出
                    </button>
                    <button id="import-table-btn" class="toolbar-btn">
                        <i class="fa-solid fa-upload"></i> 导入
                    </button>
                    <button id="clear-table-btn" class="toolbar-btn danger">
                        <i class="fa-solid fa-trash"></i> 清空
                    </button>
                </div>
                
                <div class="table-container">
                    ${config.tables.map((table, i) => 
                        generateSingleTableHTML(i, table)
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    function generateSingleTableHTML(tableId, tableConfig) {
        const data = memoryData.tables[tableId];
        const isActive = tableId === 0;
        
        let html = `
            <div class="table-wrapper ${isActive ? 'active' : ''}" data-table="${tableId}">
                <div class="excel-table-container">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th class="row-number">#</th>
                                ${tableConfig.columns.map(col => 
                                    `<th class="editable-header" contenteditable="false">${col}</th>`
                                ).join('')}
                                <th class="actions-column">操作</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (data.length === 0) {
            html += `
                <tr class="empty-row">
                    <td colspan="${tableConfig.columns.length + 2}" style="text-align:center;color:#999;padding:40px;">
                        暂无数据，点击"添加行"开始记录
                    </td>
                </tr>
            `;
        } else {
            data.forEach((row, rowId) => {
                html += `<tr data-row="${rowId}">`;
                html += `<td class="row-number">${rowId}</td>`;
                
                tableConfig.columns.forEach((col, colId) => {
                    const value = row[colId] || '';
                    html += `
                        <td class="editable-cell" 
                            data-row="${rowId}" 
                            data-col="${colId}"
                            contenteditable="true">
                            ${escapeHtml(value)}
                        </td>
                    `;
                });
                
                html += `
                    <td class="actions-column">
                        <button class="cell-btn delete-row-btn" data-row="${rowId}" title="删除行">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        return html;
    }
    
    function bindTableViewerEvents() {
        // 切换标签
        $('.table-tab').on('click', function() {
            const tableId = $(this).data('table');
            $('.table-tab').removeClass('active');
            $(this).addClass('active');
            $('.table-wrapper').removeClass('active');
            $(`.table-wrapper[data-table="${tableId}"]`).addClass('active');
        });
        
        // 单元格编辑
        $('.editable-cell').on('blur', function() {
            const tableId = parseInt($('.table-tab.active').data('table'));
            const rowId = parseInt($(this).data('row'));
            const colId = parseInt($(this).data('col'));
            const newValue = $(this).text().trim();
            
            updateRow(tableId, rowId, { [colId]: newValue });
            saveMemoryData();
        });
        
        // 搜索
        $('#table-search').on('input', function() {
            const keyword = $(this).val().toLowerCase();
            $('.excel-table tbody tr:not(.empty-row)').each(function() {
                $(this).toggle($(this).text().toLowerCase().includes(keyword));
            });
        });
        
        // 添加行
        $('#add-row-btn').on('click', () => {
            const tableId = parseInt($('.table-tab.active').data('table'));
            const newRow = {};
            config.tables[tableId].columns.forEach((_, i) => {
                newRow[i] = '';
            });
            insertRow(tableId, newRow);
            saveMemoryData();
            showTableViewer();
        });
        
        // 删除行
        $('.delete-row-btn').on('click', function() {
            if (!confirm('确定删除这一行吗？')) return;
            
            const tableId = parseInt($('.table-tab.active').data('table'));
            const rowId = parseInt($(this).data('row'));
            deleteRow(tableId, rowId);
            saveMemoryData();
            showTableViewer();
        });
        
        // 导出
        $('#export-table-btn').on('click', exportAllData);
        
        // 清空
        $('#clear-table-btn').on('click', () => {
            const tableId = parseInt($('.table-tab.active').data('table'));
            const tableName = config.tables[tableId].name;
            
            if (!confirm(`确定清空"${tableName}"的所有数据吗？此操作不可恢复！`)) return;
            
            memoryData.tables[tableId] = [];
            saveMemoryData();
            showTableViewer();
        });
    }
    
    // ==================== 设置界面 ====================
    
    function showSettings() {
        const html = generateSettingsHTML();
        callPopup(html, 'text', '', { wide: true, large: true });
        
        setTimeout(() => {
            bindSettingsEvents();
        }, 100);
    }
    
    function generateSettingsHTML() {
        return `
            <div class="gaigai-settings-panel">
                <h2>⚙️ Gaigai记忆系统设置</h2>
                
                <div class="settings-section">
                    <h3>基础设置</h3>
                    
                    <label class="settings-item">
                        <input type="checkbox" id="setting-enabled" ${config.enabled ? 'checked' : ''} />
                        <span>启用记忆系统</span>
                    </label>
                    
                    <label class="settings-item">
                        <input type="checkbox" id="setting-auto-inject" ${config.autoInject ? 'checked' : ''} />
                        <span>自动注入提示词到AI上下文</span>
                    </label>
                </div>
                
                <div class="settings-section">
                    <h3>提示词模板</h3>
                    <p style="color:#666;font-size:12px;">这段文本会自动添加到AI的提示词中，告诉AI如何输出记忆更新</p>
                    <textarea id="prompt-template" rows="15" style="width:100%;font-family:monospace;font-size:12px;">
${config.promptTemplate}
                    </textarea>
                </div>
                
                <div class="settings-section">
                    <h3>表格结构配置</h3>
                    <p style="color:#666;font-size:12px;">定义8个记忆表格的名称和列名（高级功能，谨慎修改）</p>
                    <div id="table-config-list">
                        ${config.tables.map((table, i) => `
                            <div class="table-config-item">
                                <strong>表${i}：</strong>
                                <input type="text" class="table-name-input" data-table="${i}" 
                                       value="${table.name}" placeholder="表格名称" />
                                <input type="text" class="table-columns-input" data-table="${i}" 
                                       value="${table.columns.join('|')}" placeholder="列名（用|分隔）" 
                                       style="flex:1;" />
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button id="save-settings-btn" class="settings-btn primary">
                        <i class="fa-solid fa-save"></i> 保存设置
                    </button>
                    <button id="reset-settings-btn" class="settings-btn danger">
                        <i class="fa-solid fa-undo"></i> 恢复默认
                    </button>
                </div>
            </div>
        `;
    }
    
    function bindSettingsEvents() {
        $('#save-settings-btn').on('click', () => {
            // 保存基础设置
            config.enabled = $('#setting-enabled').is(':checked');
            config.autoInject = $('#setting-auto-inject').is(':checked');
            
            // 保存提示词
            config.promptTemplate = $('#prompt-template').val();
            
            // 保存表格配置
            config.tables.forEach((table, i) => {
                const name = $(`.table-name-input[data-table="${i}"]`).val();
                const columns = $(`.table-columns-input[data-table="${i}"]`).val().split('|');
                
                config.tables[i].name = name;
                config.tables[i].columns = columns;
            });
            
            saveConfig();
            toastr.success('设置已保存');
            
            // 重新注册提示词注入器
            if (config.autoInject) {
                registerPromptInjector();
            }
        });
        
        $('#reset-settings-btn').on('click', () => {
            if (!confirm('确定恢复默认设置吗？当前设置将丢失！')) return;
            
            config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            saveConfig();
            showSettings();
            toastr.success('已恢复默认设置');
        });
    }
    
    // ==================== 工具函数 ====================
    
    function exportAllData() {
        const exportData = {
            config: config,
            memory: memoryData,
            exportTime: new Date().toISOString()
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gaigai_memory_${currentChatId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toastr.success('数据已导出');
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
})();
