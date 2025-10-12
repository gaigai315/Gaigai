// Gaigai记忆系统 v2.1 - 修复版
(function() {
    'use strict';
    
    const EXTENSION_NAME = 'gaigai-memory';
    
    // 默认配置
    const DEFAULT_CONFIG = {
        enabled: true,
        autoInject: true,
        tables: [
            { name: '主线剧情', columns: ['日期', '时间', '地点', '事件概要', '关键物品', '承诺/约定'] },
            { name: '支线追踪', columns: ['支线名', '日期', '时间', '事件进展', '状态', '关键NPC'] },
            { name: '角色状态', columns: ['角色名', '状态变化', '时间', '原因', '当前位置'] },
            { name: '人物档案', columns: ['姓名', '身份', '年龄', '性格', '对user态度', '关键能力', '当前状态', '备注'] },
            { name: '人物关系', columns: ['角色A', '角色B', '关系变化', '时间', '原因'] },
            { name: '人物情感', columns: ['角色', '对象', '情感变化', '时间', '原因'] },
            { name: '世界设定', columns: ['设定名', '类型', '详细说明', '影响范围'] },
            { name: '物品追踪', columns: ['物品名称', '物品描述', '当前位置', '持有者', '状态', '重要程度', '备注'] }
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
4. 物品追踪:首次出现插入,变化更新,销毁删除`
    };
    
    let config = null;
    let memoryData = null;
    let currentChatId = null;
    let initialized = false;
    
    console.log('🚀 Gaigai记忆系统启动中...');
    
    // 主初始化函数
    function initialize() {
        if (initialized) return;
        
        try {
            // 检查必要的API
            if (typeof jQuery === 'undefined' || typeof $ === 'undefined') {
                console.error('❌ jQuery未加载');
                setTimeout(initialize, 500);
                return;
            }
            
            if (typeof extension_settings === 'undefined') {
                console.error('❌ extension_settings未加载');
                setTimeout(initialize, 500);
                return;
            }
            
            // 加载配置
            loadConfig();
            
            // 加载记忆数据
            loadMemoryData();
            
            // 注册事件监听
            if (typeof eventSource !== 'undefined') {
                eventSource.on('MESSAGE_RECEIVED', handleAIMessage);
                eventSource.on('CHAT_CHANGED', onChatChanged);
            }
            
            // 添加UI（延迟确保DOM加载完成）
            setTimeout(function() {
                addExtensionUI();
            }, 500);
            
            // 注册提示词注入
            if (config.autoInject && typeof setExtensionPrompt === 'function') {
                setExtensionPrompt(EXTENSION_NAME, getMemoryPrompt, 1, 0);
            }
            
            initialized = true;
            console.log('✅ Gaigai记忆系统已就绪');
            
        } catch (error) {
            console.error('❌ Gaigai初始化失败:', error);
            setTimeout(initialize, 1000);
        }
    }
    
    // 加载配置
    function loadConfig() {
        if (!extension_settings[EXTENSION_NAME]) {
            extension_settings[EXTENSION_NAME] = {};
        }
        
        if (!extension_settings[EXTENSION_NAME].config) {
            extension_settings[EXTENSION_NAME].config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
        
        config = extension_settings[EXTENSION_NAME].config;
        console.log('📋 配置已加载');
    }
    
    // 保存配置
    function saveConfig() {
        extension_settings[EXTENSION_NAME].config = config;
        if (typeof saveSettingsDebounced === 'function') {
            saveSettingsDebounced();
        }
    }
    
    // 加载记忆数据
    function loadMemoryData() {
        currentChatId = getCurrentChatId();
        
        if (!extension_settings[EXTENSION_NAME].chats) {
            extension_settings[EXTENSION_NAME].chats = {};
        }
        
        if (currentChatId && extension_settings[EXTENSION_NAME].chats[currentChatId]) {
            memoryData = extension_settings[EXTENSION_NAME].chats[currentChatId];
        } else {
            memoryData = createEmptyMemoryData();
        }
        
        console.log('📂 记忆数据已加载');
    }
    
    // 保存记忆数据
    function saveMemoryData() {
        if (!currentChatId) return;
        
        if (!extension_settings[EXTENSION_NAME].chats) {
            extension_settings[EXTENSION_NAME].chats = {};
        }
        
        extension_settings[EXTENSION_NAME].chats[currentChatId] = memoryData;
        
        if (typeof saveSettingsDebounced === 'function') {
            saveSettingsDebounced();
        }
    }
    
    // 创建空数据
    function createEmptyMemoryData() {
        return {
            tables: config.tables.map(function() { return []; })
        };
    }
    
    // 获取当前聊天ID
    function getCurrentChatId() {
        if (typeof characters === 'undefined' || !characters[this_chid]) {
            return null;
        }
        var chatFile = (typeof chat_metadata !== 'undefined' && chat_metadata.file_name) ? chat_metadata.file_name : 'default';
        return characters[this_chid].name + '_' + chatFile;
    }
    
    // 聊天切换事件
    function onChatChanged() {
        loadMemoryData();
    }
    
    // 处理AI消息
    function handleAIMessage(messageId) {
        if (!config.enabled) return;
        
        try {
            var message = chat[messageId];
            if (!message || message.is_user) return;
            
            var memoryRegex = /<GaigaiMemory>([\s\S]*?)<\/GaigaiMemory>/gi;
            var matches = message.mes.matchAll(memoryRegex);
            var hasUpdate = false;
            
            for (var match of matches) {
                executeMemoryCommands(match[1]);
                message.mes = message.mes.replace(match[0], '');
                hasUpdate = true;
            }
            
            if (hasUpdate) {
                var messageElement = $('#chat .mes[mesid="' + messageId + '"]');
                if (messageElement.length) {
                    messageElement.find('.mes_text').html(message.mes);
                }
                
                saveMemoryData();
                
                if (typeof toastr !== 'undefined') {
                    toastr.success('记忆已更新', '', { timeOut: 2000 });
                }
            }
        } catch (error) {
            console.error('处理AI消息失败:', error);
        }
    }
    
    // 执行记忆命令
    function executeMemoryCommands(commandText) {
        var updateRegex = /updateRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
        var insertRegex = /insertRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*\{([^}]+)\}\s*KATEX_INLINE_CLOSE/g;
        var deleteRegex = /deleteRow\s*KATEX_INLINE_OPEN\s*(\d+)\s*,\s*(\d+)\s*KATEX_INLINE_CLOSE/g;
        
        var match;
        
        while ((match = updateRegex.exec(commandText)) !== null) {
            var tableId = parseInt(match[1]);
            var rowId = parseInt(match[2]);
            var updates = parseObjectLiteral(match[3]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                updateRow(tableId, rowId, updates);
            }
        }
        
        while ((match = insertRegex.exec(commandText)) !== null) {
            var tableId = parseInt(match[1]);
            var rowData = parseObjectLiteral(match[2]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                insertRow(tableId, rowData);
            }
        }
        
        while ((match = deleteRegex.exec(commandText)) !== null) {
            var tableId = parseInt(match[1]);
            var rowId = parseInt(match[2]);
            
            if (tableId >= 0 && tableId < memoryData.tables.length) {
                deleteRow(tableId, rowId);
            }
        }
    }
    
    // 解析对象字面量
    function parseObjectLiteral(str) {
        var obj = {};
        var pairs = str.split(',');
        
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            var colonIndex = pair.indexOf(':');
            if (colonIndex === -1) continue;
            
            var key = pair.substring(0, colonIndex).trim().replace(/['"]/g, '');
            var value = pair.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
            
            obj[key] = value;
        }
        
        return obj;
    }
    
    // 更新行
    function updateRow(tableId, rowId, updates) {
        var table = memoryData.tables[tableId];
        
        while (table.length <= rowId) {
            table.push({});
        }
        
        for (var key in updates) {
            table[rowId][key] = updates[key];
        }
    }
    
    // 插入行
    function insertRow(tableId, rowData) {
        memoryData.tables[tableId].push(rowData);
    }
    
    // 删除行
    function deleteRow(tableId, rowId) {
        var table = memoryData.tables[tableId];
        if (rowId >= 0 && rowId < table.length) {
            table.splice(rowId, 1);
        }
    }
    
    // 获取提示词
    function getMemoryPrompt() {
        if (!config.enabled || !config.autoInject) return '';
        return config.promptTemplate;
    }
    
    // 添加UI
    function addExtensionUI() {
        // 移除旧的（如果存在）
        $('#gaigai-menu, #gaigai-settings').remove();
        
        // 创建按钮
        var menuButton = $('<div id="gaigai-menu" class="list-group-item flex-container flexGap5"><div class="fa-solid fa-book"></div><span>Gaigai记忆</span></div>');
        var settingsButton = $('<div id="gaigai-settings" class="list-group-item flex-container flexGap5"><div class="fa-solid fa-gear"></div><span>记忆设置</span></div>');
        
        // 绑定事件
        menuButton.on('click', showTableViewer);
        settingsButton.on('click', showSettings);
        
        // 添加到菜单
        $('#extensionsMenu').append(menuButton);
        $('#extensionsMenu').append(settingsButton);
        
        console.log('✅ UI按钮已添加');
    }
    
    // 显示表格查看器
    function showTableViewer() {
        var html = generateTableViewerHTML();
        callPopup(html, 'text', '', { wide: true, large: true, okButton: '关闭' });
        setTimeout(function() { bindTableViewerEvents(); }, 100);
    }
    
    // 生成表格查看器HTML
    function generateTableViewerHTML() {
        var tabsHTML = '';
        for (var i = 0; i < config.tables.length; i++) {
            var activeClass = i === 0 ? 'active' : '';
            tabsHTML += '<button class="table-tab ' + activeClass + '" data-table="' + i + '">' + config.tables[i].name + '</button>';
        }
        
        var tablesHTML = '';
        for (var i = 0; i < config.tables.length; i++) {
            tablesHTML += generateSingleTableHTML(i, config.tables[i]);
        }
        
        return '<div class="gaigai-table-viewer">' +
            '<h2>📚 Gaigai记忆档案</h2>' +
            '<div class="table-tabs">' + tabsHTML + '</div>' +
            '<div class="table-toolbar">' +
                '<input type="text" id="table-search" placeholder="搜索..." />' +
                '<button id="add-row-btn" class="toolbar-btn"><i class="fa-solid fa-plus"></i> 添加行</button>' +
                '<button id="export-table-btn" class="toolbar-btn"><i class="fa-solid fa-download"></i> 导出</button>' +
                '<button id="clear-table-btn" class="toolbar-btn danger"><i class="fa-solid fa-trash"></i> 清空</button>' +
            '</div>' +
            '<div class="table-container">' + tablesHTML + '</div>' +
            '</div>';
    }
    
    // 生成单个表格HTML
    function generateSingleTableHTML(tableId, tableConfig) {
        var data = memoryData.tables[tableId];
        var isActive = tableId === 0;
        var activeClass = isActive ? 'active' : '';
        
        var headerHTML = '<th class="row-number">#</th>';
        for (var i = 0; i < tableConfig.columns.length; i++) {
            headerHTML += '<th>' + escapeHtml(tableConfig.columns[i]) + '</th>';
        }
        headerHTML += '<th class="actions-column">操作</th>';
        
        var bodyHTML = '';
        if (data.length === 0) {
            bodyHTML = '<tr class="empty-row"><td colspan="' + (tableConfig.columns.length + 2) + '" style="text-align:center;color:#999;padding:40px;">暂无数据，点击"添加行"开始记录</td></tr>';
        } else {
            for (var rowId = 0; rowId < data.length; rowId++) {
                var row = data[rowId];
                bodyHTML += '<tr data-row="' + rowId + '">';
                bodyHTML += '<td class="row-number">' + rowId + '</td>';
                
                for (var colId = 0; colId < tableConfig.columns.length; colId++) {
                    var value = row[colId] || '';
                    bodyHTML += '<td class="editable-cell" data-row="' + rowId + '" data-col="' + colId + '" contenteditable="true">' + escapeHtml(value) + '</td>';
                }
                
                bodyHTML += '<td class="actions-column"><button class="cell-btn delete-row-btn" data-row="' + rowId + '"><i class="fa-solid fa-trash"></i></button></td>';
                bodyHTML += '</tr>';
            }
        }
        
        return '<div class="table-wrapper ' + activeClass + '" data-table="' + tableId + '">' +
            '<div class="excel-table-container">' +
                '<table class="excel-table">' +
                    '<thead><tr>' + headerHTML + '</tr></thead>' +
                    '<tbody>' + bodyHTML + '</tbody>' +
                '</table>' +
            '</div>' +
            '</div>';
    }
    
    // 绑定表格事件
    function bindTableViewerEvents() {
        $('.table-tab').on('click', function() {
            var tableId = $(this).data('table');
            $('.table-tab').removeClass('active');
            $(this).addClass('active');
            $('.table-wrapper').removeClass('active');
            $('.table-wrapper[data-table="' + tableId + '"]').addClass('active');
        });
        
        $('.editable-cell').on('blur', function() {
            var tableId = parseInt($('.table-tab.active').data('table'));
            var rowId = parseInt($(this).data('row'));
            var colId = parseInt($(this).data('col'));
            var newValue = $(this).text().trim();
            
            var updates = {};
            updates[colId] = newValue;
            updateRow(tableId, rowId, updates);
            saveMemoryData();
        });
        
        $('#table-search').on('input', function() {
            var keyword = $(this).val().toLowerCase();
            $('.excel-table tbody tr:not(.empty-row)').each(function() {
                $(this).toggle($(this).text().toLowerCase().indexOf(keyword) > -1);
            });
        });
        
        $('#add-row-btn').on('click', function() {
            var tableId = parseInt($('.table-tab.active').data('table'));
            var newRow = {};
            for (var i = 0; i < config.tables[tableId].columns.length; i++) {
                newRow[i] = '';
            }
            insertRow(tableId, newRow);
            saveMemoryData();
            showTableViewer();
        });
        
        $('.delete-row-btn').on('click', function() {
            if (!confirm('确定删除这一行吗？')) return;
            var tableId = parseInt($('.table-tab.active').data('table'));
            var rowId = parseInt($(this).data('row'));
            deleteRow(tableId, rowId);
            saveMemoryData();
            showTableViewer();
        });
        
        $('#export-table-btn').on('click', exportAllData);
        
        $('#clear-table-btn').on('click', function() {
            var tableId = parseInt($('.table-tab.active').data('table'));
            var tableName = config.tables[tableId].name;
            if (!confirm('确定清空"' + tableName + '"的所有数据吗？')) return;
            memoryData.tables[tableId] = [];
            saveMemoryData();
            showTableViewer();
        });
    }
    
    // 显示设置
    function showSettings() {
        var html = generateSettingsHTML();
        callPopup(html, 'text', '', { wide: true, large: true });
        setTimeout(function() { bindSettingsEvents(); }, 100);
    }
    
    // 生成设置HTML
    function generateSettingsHTML() {
        var enabledChecked = config.enabled ? 'checked' : '';
        var autoInjectChecked = config.autoInject ? 'checked' : '';
        
        return '<div class="gaigai-settings-panel">' +
            '<h2>⚙️ Gaigai记忆系统设置</h2>' +
            '<div class="settings-section">' +
                '<h3>基础设置</h3>' +
                '<label class="settings-item"><input type="checkbox" id="setting-enabled" ' + enabledChecked + ' /><span>启用记忆系统</span></label>' +
                '<label class="settings-item"><input type="checkbox" id="setting-auto-inject" ' + autoInjectChecked + ' /><span>自动注入提示词到AI上下文</span></label>' +
            '</div>' +
            '<div class="settings-section">' +
                '<h3>提示词模板</h3>' +
                '<textarea id="prompt-template" rows="15" style="width:100%;font-family:monospace;font-size:12px;">' + escapeHtml(config.promptTemplate) + '</textarea>' +
            '</div>' +
            '<div class="settings-actions">' +
                '<button id="save-settings-btn" class="settings-btn primary"><i class="fa-solid fa-save"></i> 保存设置</button>' +
                '<button id="reset-settings-btn" class="settings-btn danger"><i class="fa-solid fa-undo"></i> 恢复默认</button>' +
            '</div>' +
            '</div>';
    }
    
    // 绑定设置事件
    function bindSettingsEvents() {
        $('#save-settings-btn').on('click', function() {
            config.enabled = $('#setting-enabled').is(':checked');
            config.autoInject = $('#setting-auto-inject').is(':checked');
            config.promptTemplate = $('#prompt-template').val();
            saveConfig();
            
            if (typeof toastr !== 'undefined') {
                toastr.success('设置已保存');
            }
        });
        
        $('#reset-settings-btn').on('click', function() {
            if (!confirm('确定恢复默认设置吗？')) return;
            config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            saveConfig();
            showSettings();
            
            if (typeof toastr !== 'undefined') {
                toastr.success('已恢复默认设置');
            }
        });
    }
    
    // 导出数据
    function exportAllData() {
        var exportData = {
            config: config,
            memory: memoryData,
            exportTime: new Date().toISOString()
        };
        
        var json = JSON.stringify(exportData, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'gaigai_memory_' + currentChatId + '_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        if (typeof toastr !== 'undefined') {
            toastr.success('数据已导出');
        }
    }
    
    // HTML转义
    function escapeHtml(text) {
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // 启动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
})();

