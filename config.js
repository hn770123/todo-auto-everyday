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
    var elWeekdayModal, elCloseModalBtn, elCancelWeekdayBtn, elSaveWeekdayBtn;

    // 状態
    var currentEditingTodo = null;
    var currentEditingPeriod = null;

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

        // モーダル
        elWeekdayModal = document.getElementById('weekday-modal');
        elCloseModalBtn = document.getElementById('close-modal-btn');
        elCancelWeekdayBtn = document.getElementById('cancel-weekday-btn');
        elSaveWeekdayBtn = document.getElementById('save-weekday-btn');

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

        elCloseModalBtn.addEventListener('click', closeWeekdayModal);
        elCancelWeekdayBtn.addEventListener('click', closeWeekdayModal);
        elSaveWeekdayBtn.addEventListener('click', handleSaveWeekdays);

        // モーダルオーバーレイクリック
        var overlay = elWeekdayModal.querySelector('.modal-overlay');
        overlay.addEventListener('click', closeWeekdayModal);

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

        // テキスト
        var text = document.createElement('div');
        text.className = 'todo-config-text';
        text.textContent = todo.text;
        li.appendChild(text);

        // 曜日表示
        var weekdaysText = getWeekdaysText(todo.daysOfWeek);
        var weekdays = document.createElement('div');
        weekdays.className = 'todo-config-weekdays';
        weekdays.textContent = weekdaysText;
        li.appendChild(weekdays);

        // アクションボタン
        var actions = document.createElement('div');
        actions.className = 'todo-config-actions';

        // 曜日編集ボタン
        var editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.textContent = '📅';
        editBtn.title = '曜日設定';
        editBtn.addEventListener('click', function () {
            openWeekdayModal(todo, period);
        });
        actions.appendChild(editBtn);

        // 削除ボタン
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', function () {
            handleDeleteTodo(period, todo.id);
        });
        actions.appendChild(deleteBtn);

        li.appendChild(actions);

        return li;
    }

    // 曜日テキスト取得
    function getWeekdaysText(daysOfWeek) {
        if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.length === 7) {
            return '毎日';
        }
        var dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        var selectedDays = daysOfWeek.map(function (day) {
            return dayNames[day];
        });
        return selectedDays.join(', ');
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

    // 曜日モーダルを開く
    function openWeekdayModal(todo, period) {
        currentEditingTodo = todo;
        currentEditingPeriod = period;

        var title = document.getElementById('modal-title');
        title.textContent = '曜日設定: ' + todo.text;

        // 現在の曜日設定をチェック
        var checkboxes = document.querySelectorAll('.weekday-checkbox');
        checkboxes.forEach(function (checkbox) {
            var day = parseInt(checkbox.value);
            checkbox.checked = todo.daysOfWeek && todo.daysOfWeek.indexOf(day) !== -1;
        });

        elWeekdayModal.classList.remove('hidden');
    }

    // 曜日モーダルを閉じる
    function closeWeekdayModal() {
        elWeekdayModal.classList.add('hidden');
        currentEditingTodo = null;
        currentEditingPeriod = null;
    }

    // 曜日設定を保存
    function handleSaveWeekdays() {
        if (!currentEditingTodo || !currentEditingPeriod) return;

        var checkboxes = document.querySelectorAll('.weekday-checkbox:checked');
        var selectedDays = Array.from(checkboxes).map(function (cb) {
            return parseInt(cb.value);
        });

        // 何も選択されていない場合は全曜日
        if (selectedDays.length === 0) {
            selectedDays = [0, 1, 2, 3, 4, 5, 6];
        }

        selectedDays.sort(function (a, b) { return a - b; });

        TodoManager.updateTodo(currentEditingPeriod, currentEditingTodo.id, {
            daysOfWeek: selectedDays
        });

        renderTodoList(currentEditingPeriod,
            currentEditingPeriod === 'morning' ? elMorningList :
                currentEditingPeriod === 'afterSchool' ? elAfterSchoolList :
                    elNightList
        );

        closeWeekdayModal();
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
