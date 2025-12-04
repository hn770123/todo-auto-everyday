(function () {
    'use strict';

    var TodoManager = window.TodoApp.TodoManager;
    var LogManager = window.TodoApp.LogManager;
    var ConfigManager = window.TodoApp.ConfigManager;
    var DiscordNotifier = window.TodoApp.DiscordNotifier;
    var loadTimeRanges = window.TodoApp.loadTimeRanges;
    var saveTimeRanges = window.TodoApp.saveTimeRanges;
    var resetTimeRanges = window.TodoApp.resetTimeRanges;
    var escapeHtml = window.TodoApp.escapeHtml;

    // DOM要素
    var elDiscordWebhookUrl, elDiscordUsername, elSaveDiscordBtn, elTestDiscordBtn;
    var elTimeRangesContainer, elSaveTimeRangesBtn, elResetTimeRangesBtn;
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

        // 時間帯設定
        elTimeRangesContainer = document.getElementById('time-ranges-container');
        elSaveTimeRangesBtn = document.getElementById('save-time-ranges-btn');
        elResetTimeRangesBtn = document.getElementById('reset-time-ranges-btn');

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

        elSaveTimeRangesBtn.addEventListener('click', handleSaveTimeRanges);
        elResetTimeRangesBtn.addEventListener('click', handleResetTimeRanges);

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
        renderTimeRanges();
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

    // 時間帯設定をレンダリング
    function renderTimeRanges() {
        var ranges = loadTimeRanges();
        elTimeRangesContainer.innerHTML = '';

        Object.keys(ranges).forEach(function (key) {
            var range = ranges[key];
            var div = document.createElement('div');
            div.className = 'config-group';
            div.style.marginBottom = '1rem';
            div.style.padding = '1rem';
            div.style.background = '#333';
            div.style.borderRadius = '8px';

            var title = document.createElement('h3');
            title.style.marginBottom = '0.5rem';
            title.style.color = 'var(--accent-blue)';
            title.textContent = (range.emoji || '') + ' ' + range.label;
            div.appendChild(title);

            var timeContainer = document.createElement('div');
            timeContainer.style.display = 'flex';
            timeContainer.style.gap = '0.5rem';
            timeContainer.style.alignItems = 'center';
            timeContainer.style.flexWrap = 'wrap';

            var startLabel = document.createElement('label');
            startLabel.textContent = '開始: ';
            startLabel.style.color = 'var(--ink-gray)';
            timeContainer.appendChild(startLabel);

            var startInput = document.createElement('input');
            startInput.type = 'number';
            startInput.min = '0';
            startInput.max = '23';
            startInput.value = range.start;
            startInput.className = 'input';
            startInput.style.width = '80px';
            startInput.setAttribute('data-period', key);
            startInput.setAttribute('data-field', 'start');
            timeContainer.appendChild(startInput);

            var endLabel = document.createElement('label');
            endLabel.textContent = '終了: ';
            endLabel.style.color = 'var(--ink-gray)';
            endLabel.style.marginLeft = '1rem';
            timeContainer.appendChild(endLabel);

            var endInput = document.createElement('input');
            endInput.type = 'number';
            endInput.min = '0';
            endInput.max = '23';
            endInput.value = range.end;
            endInput.className = 'input';
            endInput.style.width = '80px';
            endInput.setAttribute('data-period', key);
            endInput.setAttribute('data-field', 'end');
            timeContainer.appendChild(endInput);

            div.appendChild(timeContainer);
            elTimeRangesContainer.appendChild(div);
        });
    }

    // 時間帯設定を保存
    function handleSaveTimeRanges() {
        var ranges = loadTimeRanges();
        var inputs = elTimeRangesContainer.querySelectorAll('input');

        inputs.forEach(function (input) {
            var period = input.getAttribute('data-period');
            var field = input.getAttribute('data-field');
            var value = parseInt(input.value);

            if (ranges[period] && !isNaN(value) && value >= 0 && value <= 23) {
                ranges[period][field] = value;
            }
        });

        saveTimeRanges(ranges);
        alert('💾 時間帯設定を保存しました');
    }

    // 時間帯設定をリセット
    function handleResetTimeRanges() {
        if (confirm('時間帯設定をデフォルトに戻しますか？')) {
            resetTimeRanges();
            renderTimeRanges();
            alert('✅ 時間帯設定をリセットしました');
        }
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

        // order順にソート
        todos.sort(function (a, b) {
            var orderA = a.order !== undefined ? a.order : 999;
            var orderB = b.order !== undefined ? b.order : 999;
            return orderA - orderB;
        });

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
        text.style.flex = '1';
        header.appendChild(text);

        // 操作ボタングループ
        var actionGroup = document.createElement('div');
        actionGroup.style.display = 'flex';
        actionGroup.style.gap = '0.25rem';
        actionGroup.style.alignItems = 'center';

        // 並び替えボタン（↑↓）
        var upBtn = document.createElement('button');
        upBtn.className = 'icon-btn';
        upBtn.textContent = '↑';
        upBtn.title = '上に移動';
        upBtn.style.fontSize = '1.3rem';
        upBtn.style.padding = '0.5rem';
        upBtn.addEventListener('click', function () {
            handleMoveTodo(period, todo.id, 'up');
        });
        actionGroup.appendChild(upBtn);

        var downBtn = document.createElement('button');
        downBtn.className = 'icon-btn';
        downBtn.textContent = '↓';
        downBtn.title = '下に移動';
        downBtn.style.fontSize = '1.3rem';
        downBtn.style.padding = '0.5rem';
        downBtn.addEventListener('click', function () {
            handleMoveTodo(period, todo.id, 'down');
        });
        actionGroup.appendChild(downBtn);

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
        actionGroup.appendChild(deleteBtn);

        header.appendChild(actionGroup);

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

        // 継続日数設定
        var continueContainer = document.createElement('div');
        continueContainer.style.display = 'flex';
        continueContainer.style.gap = '0.5rem';
        continueContainer.style.alignItems = 'center';
        continueContainer.style.marginTop = '0.25rem';

        var continueLabel = document.createElement('label');
        continueLabel.textContent = '継続日数: ';
        continueLabel.style.color = 'var(--ink-gray)';
        continueLabel.style.fontSize = '0.9rem';
        continueContainer.appendChild(continueLabel);

        var continueInput = document.createElement('input');
        continueInput.type = 'number';
        continueInput.min = '0';
        continueInput.max = '6';
        continueInput.value = todo.continueDays || 0;
        continueInput.className = 'input';
        continueInput.style.width = '60px';
        continueInput.addEventListener('change', function () {
            var days = parseInt(this.value) || 0;
            if (days < 0) days = 0;
            if (days > 6) days = 6;
            this.value = days;
            TodoManager.updateTodo(period, todo.id, { continueDays: days });
        });
        continueContainer.appendChild(continueInput);

        var continueHelp = document.createElement('span');
        continueHelp.textContent = '日 (0=なし)';
        continueHelp.style.color = 'var(--ink-gray)';
        continueHelp.style.fontSize = '0.8rem';
        continueContainer.appendChild(continueHelp);

        container.appendChild(continueContainer);
        li.appendChild(container);

        return li;
    }

    // Todoを上下に移動
    function handleMoveTodo(period, todoId, direction) {
        var todos = TodoManager.getTodos(period);
        var currentIndex = todos.findIndex(function (t) { return t.id === todoId; });

        if (currentIndex === -1) return;

        var targetIndex;
        if (direction === 'up') {
            if (currentIndex === 0) return; // 既に一番上
            targetIndex = currentIndex - 1;
        } else { // down
            if (currentIndex === todos.length - 1) return; // 既に一番下
            targetIndex = currentIndex + 1;
        }

        // 配列内で入れ替え
        var temp = todos[currentIndex];
        todos[currentIndex] = todos[targetIndex];
        todos[targetIndex] = temp;

        // order値を更新
        todos.forEach(function (todo, index) {
            todo.order = index;
        });

        // 保存
        TodoManager.reorderTodos(period, todos);

        // 再レンダリング
        renderTodoList(period,
            period === 'morning' ? elMorningList :
                period === 'afterSchool' ? elAfterSchoolList :
                    elNightList
        );
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
