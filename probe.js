(function() {
    console.log('🔍 探针模块 (UI升级版) 已加载');

    // 🏷️ Token 计算辅助函数 (尝试调用酒馆内部工具，失败则估算)
    function countTokens(text) {
        if (!text) return 0;
        try {
            // 尝试调用酒馆的全局 Tokenizer
            if (window.GPT3Tokenizer) {
                // 这是一个简化的调用，实际情况可能不同，但通常够用
                const tokenizer = new window.GPT3Tokenizer({ type: 'gpt3' }); 
                const encoded = tokenizer.encode(text);
                return encoded.bpe.length;
            }
            // 备用：尝试调用上下文里的 encode
            const ctx = SillyTavern.getContext();
            if (ctx && ctx.encode) {
                return ctx.encode(text).length;
            }
        } catch (e) {
            // console.warn('Token计算降级');
        }
        // 再次备用：简单的字符估算 (中文x1.5, 英文x0.3)
        // return Math.ceil(text.length * 0.7);
        return text.length; // 如果都没有，直接返回字符数，标个 Char
    }

    // 挂载查看器函数
    window.Gaigai.showLastRequest = function() {
        const lastData = window.Gaigai.lastRequestData;
        const UI = window.Gaigai.ui;
        const esc = window.Gaigai.esc;
        const pop = window.Gaigai.pop;

        if (!lastData || !lastData.chat) {
            alert('❌ 暂无记录！\n\n请先去发送一条消息，插件会自动捕获发送内容。');
            return;
        }

        const chat = lastData.chat;
        let totalTokens = 0;
        let listHtml = '';

        // 1. 遍历生成列表
        chat.forEach((msg, idx) => {
            const content = msg.content || '';
            const tokens = countTokens(content);
            totalTokens += tokens;
            
            let roleName = msg.role.toUpperCase();
            let roleColor = '#666';
            let icon = '📄';

            // 角色美化
            if (msg.role === 'system') {
                roleName = 'SYSTEM (系统)';
                roleColor = '#28a745'; // 绿
                icon = '⚙️';
                if (msg.isGaigaiData) { roleName = 'MEMORY (记忆表格)'; roleColor = '#d35400'; icon = '📊'; }
                if (msg.isGaigaiPrompt) { roleName = 'PROMPT (提示词)'; roleColor = '#e67e22'; icon = '📌'; }
            } else if (msg.role === 'user') {
                roleName = 'USER (用户)';
                roleColor = '#2980b9'; // 蓝
                icon = '🧑';
            } else if (msg.role === 'assistant') {
                roleName = 'ASSISTANT (AI)';
                roleColor = '#8e44ad'; // 紫
                icon = '🤖';
            }

            // ✨ 仿酒馆原生风格的折叠卡片
            listHtml += `
            <details style="margin-bottom:8px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; overflow:hidden; background:rgba(255,255,255,0.5);">
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
                <div style="padding:10px; font-size:12px; line-height:1.6; color:#333; border-top:1px solid rgba(0,0,0,0.05); white-space:pre-wrap; font-family:'Segoe UI', monospace; word-break:break-word;">${esc(content)}</div>
            </details>`;
        });

        // 2. 构建整体面板
        const h = `
        <div class="g-p" style="padding:15px; height:100%; display:flex; flex-direction:column;">
            <div style="flex:0 0 auto; background:linear-gradient(135deg, ${UI.c}, #555); color:#fff; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; opacity:0.9;">Total Tokens</div>
                        <div style="font-size:24px; font-weight:bold;">${totalTokens}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px; opacity:0.9;">Messages</div>
                        <div style="font-size:18px; font-weight:bold;">${chat.length} 条</div>
                    </div>
                </div>
                <div style="margin-top:10px; font-size:10px; opacity:0.7; border-top:1px solid rgba(255,255,255,0.2); padding-top:5px;">
                    📅 捕获时间: ${new Date(lastData.timestamp).toLocaleString()}
                </div>
            </div>

            <div style="flex:1; overflow-y:auto; padding-right:5px;">
                ${listHtml}
            </div>
        </div>`;

        pop('🔍 真实发送内容查看器', h, true);
        
        // 自动展开所有 details (可选，如果觉得太长可以去掉这行)
        // $('details').attr('open', ''); 
    };
})();
