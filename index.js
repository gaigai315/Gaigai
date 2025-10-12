// Gaigai扩展
(function() {
    console.log('✅ Gaigai扩展加载成功了！');
    
    // 等待页面加载完成
    jQuery(async () => {
        // 创建一个按钮
        const myButton = $(`
            <div id="gaigai-button" class="list-group-item flex-container flexGap5">
                <div class="fa-solid fa-star"></div>
                <span>Gaigai扩展</span>
            </div>
        `);
        
        // 点击按钮时显示消息
        myButton.on('click', () => {
            toastr.success('你点击了Gaigai扩展！');
            console.log('Gaigai按钮被点击了');
        });
        
        // 把按钮添加到扩展菜单
        $('#extensionsMenu').append(myButton);
        
        console.log('✅ Gaigai扩展按钮已添加');
    });
})();