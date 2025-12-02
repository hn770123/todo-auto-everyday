(function () {
    'use strict';

    var TodoManager = window.TodoApp.TodoManager;
    var LogManager = window.TodoApp.LogManager;
    var ConfigManager = window.TodoApp.ConfigManager;
    var DiscordNotifier = window.TodoApp.DiscordNotifier;
    var escapeHtml = window.TodoApp.escapeHtml;

    // DOM要素
    var elDiscordWebhookUrl, elDiscordUsername, elSaveDiscordBtn, elTestDiscordBtn;
    var elMorningList, elAfterSchoolList, elNightList;
    var elNewMorningTodo, elNewAfterSchoolTodo, elNewNightTodo;
    var elAddMorningBtn, elAddAfterSchoolBtn, elAddNightBtn;
    var elResetAllBtn;

    // 初期化
    function init() {
        // Discord設定
        elDiscordWebhookUrl = document.getElementById('discord-webhook-url');
        elDiscordUsername = document.getElementById('discord-username');
        elSaveDiscordBtn = document.getElementById('save-discord-btn');
        elTestDiscordBtn = document.getElementById('test-discord-btn');

        // Todo管理
        elMorningList = document.getElementById('morning-todo-list');
        elAfterSchoolList = document.getElementById('afterSchool-todo-list');
        elNightList = document.getElementById('night-todo-list');

        elNewMorningTodo = document.getElementById('new-morning-todo');
        elNewAfterSchoolTodo = document.getElementById('new-afterSchool-todo');
        elNewNightTodo = document.getElementById('new-night-todo');

        elAddMorningBtn = document.getElementById('add-morning-btn');
        elAddAfterSchoolBtn = document.getElementById('add-afterSchool-btn');
        elAddNightBtn = document.getElementById('add-night-btn');

        // データ管理
        elResetAllBtn = document.getElementById('reset-all-btn');

        // イベントリスナー
        elSaveDiscordBtn.addEventListener('click', handleSaveDiscordConfig);
        elTestDiscordBtn.addEventListener('click', handleTestDiscord);

        elAddMorningBtn.addEventListener('click', function () { handleAddTodo('morning'); });
        elAddAfterSchoolBtn.addEventListener('click', function () { handleAddTodo('afterSchool'); });
        elAddNightBtn.addEventListener('click', function () { handleAddTodo('night'); });

        elNewMorningTodo.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddTodo('morning');
        });
        elNewAfterSchoolTodo.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddTodo('afterSchool');
        });
        elNewNightTodo.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleAddTodo('night');
        });

        elResetAllBtn.addEventListener('click', handleResetAll);

        // 初期表示
        loadDiscordConfig();
        renderAllTodos();
    }

    // Discord設定読み込み
    function loadDiscordConfig() {
        var config = ConfigManager.load();
        elDiscordWebhookUrl.value = config.discordWebhookUrl || '';
        elDiscordUsername.value = config.discordUsername || 'Todo Bot';
    }

    // Discord設定保存
    function handleSaveDiscordConfig() {
        var config = {
            discordWebhookUrl: elDiscordWebhookUrl.value.trim(),
            discordUsername: elDiscordUsername.value.trim() || 'Todo Bot'
        };
        ConfigManager.save(config);
        alert('💾 Discord設定を保存しました');
    }

    // Discordテスト送信
    function handleTestDiscord() {
        var message = '🧪 テストメッセージです\nTodoアプリからの通知が正常に動作しています！';
        elTestDiscordBtn.disabled = true;
        elTestDiscordBtn.textContent = '送信中...';

        DiscordNotifier.send(message)
            .then(function (success) {
                elTestDiscordBtn.disabled = false;
                elTestDiscordBtn.textContent = '🧪 テスト送信';
                if (success) {
                    alert('✅ テストメッセージを送信しました');
                } else {
                    alert('❌ 送信に失敗しました。Webhook URLを確認してください。');
                }
            });
    }

    // すべてのTodoリストをレンダリング
    function renderAllTodos() {
        renderTodoList('morning', elMorningList);
        renderTodoList('afterSchool', elAfterSchoolList);
        renderTodoList('night', elNightList);
    }

    // Todoリストレンダリング
    function renderTodoList(period, listElement) {
        var todos = TodoManager.getTodos(period);
        listElement.innerHTML = '';

        if (todos.length === 0) {
            var empty = document.createElement('li');
            empty.style.textAlign = 'center';
            empty.style.color = 'var(--ink-gray)';
            empty.style.padding = 'var(--spacing-md)';
            empty.textContent = 'タスクがありません';
            listElement.appendChild(empty);
            return;
        }

        todos.forEach(function (todo) {
            var li = createTodoConfigItem(todo, period);
            listElement.appendChild(li);
        });
    }

    // Todo設定アイテム作成
    function createTodoConfigItem(todo, period) {
        var li = document.createElement('li');
        li.className = 'todo-config-item';

        // コンテナを作成して縦並びにする（モバイル対応）
        var container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.width = '100%';
        container.style.gap = '0.5rem';

        // 上部：テキストと削除ボタン
        var header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.width = '100%';

        // テキスト
        var text = document.createElement('div');
        text.className = 'todo-config-text';
        text.textContent = todo.text;
        text.style.fontWeight = 'bold';
        text.style.fontSize = '1.1rem';
        header.appendChild(text);

        // 削除ボタン
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = '削除';
        deleteBtn.style.fontSize = '1.2rem';
        deleteBtn.style.padding = '0.5rem';
        deleteBtn.addEventListener('click', function () {
            handleDeleteTodo(period, todo.id);
        });
        header.appendChild(deleteBtn);

        container.appendChild(header);

        // 下部：曜日選択（インライン）
        var weekdayContainer = document.createElement('div');
        weekdayContainer.className = 'weekday-inline-selector';
        weekdayContainer.style.display = 'flex';
        weekdayContainer.style.gap = '0.25rem';
        weekdayContainer.style.justifyContent = 'flex-start';
        weekdayContainer.style.flexWrap = 'wrap';

        var dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        var currentDays = todo.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]; // デフォルトは毎日

        dayNames.forEach(function (dayName, index) {
            var dayBtn = document.createElement('button');
            dayBtn.type = 'button';
            dayBtn.textContent = dayName;
            dayBtn.className = 'weekday-btn';

            // スタイル設定
            dayBtn.style.width = '2.5rem';
            dayBtn.style.height = '2.5rem';
            dayBtn.style.borderRadius = '50%';
            dayBtn.style.border = '2px solid var(--ink-light)';
            dayBtn.style.background = 'transparent';
            dayBtn.style.color = 'var(--ink-gray)';
            dayBtn.style.fontWeight = 'bold';
            dayBtn.style.cursor = 'pointer';
            dayBtn.style.fontSize = '1rem';
            dayBtn.style.transition = 'all 0.2s';

            // 選択状態のスタイル
            var isSelected = currentDays.indexOf(index) !== -1;
            if (isSelected) {
                dayBtn.style.background = 'var(--accent-blue)';
                dayBtn.style.color = 'white';
                dayBtn.style.borderColor = 'var(--accent-blue)';
                dayBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }

            // クリックイベント
            dayBtn.addEventListener('click', function () {
                toggleWeekday(todo, period, index);
            });

            weekdayContainer.appendChild(dayBtn);
        });

        container.appendChild(weekdayContainer);
        li.appendChild(container);

        return li;
    }

    // 曜日トグル処理
    function toggleWeekday(todo, period, dayIndex) {
        var currentDays = todo.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
        var newDays;

        var index = currentDays.indexOf(dayIndex);
        if (index === -1) {
            // 追加
            newDays = currentDays.concat([dayIndex]);
        } else {
            // 削除
            newDays = currentDays.filter(function (d) { return d !== dayIndex; });
        }

        // 少なくとも1日は選択されている必要がある（空の場合は全選択に戻すか、警告するか。ここでは空を許可しない）
        if (newDays.length === 0) {
            alert('少なくとも1つの曜日を選択してください');
            return;
        }

        newDays.sort(function (a, b) { return a - b; });

        // 更新
        TodoManager.updateTodo(period, todo.id, {
            daysOfWeek: newDays
        });

        // 再レンダリング（全体ではなく、このアイテムだけ更新するのが理想だが、簡単のためリスト全体を更新）
        renderTodoList(period,
            period === 'morning' ? elMorningList :
                period === 'afterSchool' ? elAfterSchoolList :
                    elNightList
        );
    }

    // Todo追加
    function handleAddTodo(period) {
        var input = period === 'morning' ? elNewMorningTodo :
            period === 'afterSchool' ? elNewAfterSchoolTodo :
                elNewNightTodo;

        var text = input.value.trim();
        if (!text) {
            alert('タスクを入力してください');
            return;
        }

        TodoManager.addTodo(period, text);
        input.value = '';
        renderTodoList(period,
            period === 'morning' ? elMorningList :
                period === 'afterSchool' ? elAfterSchoolList :
                    elNightList
        );
    }

    // Todo削除
    function handleDeleteTodo(period, todoId) {
        if (confirm('このタスクを削除しますか？')) {
            TodoManager.deleteTodo(period, todoId);
            renderTodoList(period,
                period === 'morning' ? elMorningList :
                    period === 'afterSchool' ? elAfterSchoolList :
                        elNightList
            );
        }
    }

    // すべてのデータをリセット
    function handleResetAll() {
        var confirmed = confirm(
            'すべてのデータをリセットしますか？\n\n' +
            '以下のデータが削除されます：\n' +
            '• すべてのTodo\n' +
            '• すべてのログ\n' +
            '• Discord設定\n\n' +
            'この操作は取り消せません。'
        );

        if (!confirmed) return;

        var doubleConfirm = confirm('本当によろしいですか？');
        if (!doubleConfirm) return;

        // すべてのストレージをクリア
        localStorage.clear();

        alert('✅ すべてのデータをリセットしました。ページを再読み込みします。');
        window.location.href = 'todo.html';
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
