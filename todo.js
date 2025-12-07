(function () {
    'use strict';

    var TodoManager = window.TodoApp.TodoManager;
    var LogManager = window.TodoApp.LogManager;
    var DiscordNotifier = window.TodoApp.DiscordNotifier;
    var AudioPlayer = window.TodoApp.AudioPlayer;
    var TIME_RANGES = window.TodoApp.TIME_RANGES;
    var getCurrentPeriod = window.TodoApp.getCurrentPeriod;
    var isTodoDone = window.TodoApp.isTodoDone;
    var shouldShowToday = window.TodoApp.shouldShowToday;
    var shouldShowNow = window.TodoApp.shouldShowNow;
    var escapeHtml = window.TodoApp.escapeHtml;

    // DOM要素
    var elClock, elGreeting, elCurrentPeriod, elTodoListUnchecked, elTodoListChecked, elEmptyMessage;

    // 状態
    var currentPeriod = null;
    var draggedElement = null;
    var draggedTodo = null;

    // 初期化
    function init() {
        // DOM要素取得
        elClock = document.getElementById('clock');
        elGreeting = document.getElementById('greeting');
        elCurrentPeriod = document.getElementById('current-period');
        elTodoListUnchecked = document.getElementById('todo-list-unchecked');
        elTodoListChecked = document.getElementById('todo-list-checked');
        elEmptyMessage = document.getElementById('empty-message');

        // 時計更新
        updateClock();
        setInterval(updateClock, 1000);

        // 初期レンダリング
        currentPeriod = getCurrentPeriod();
        updatePeriodDisplay();
        renderTodos();
    }

    // 時計更新
    function updateClock() {
        var now = new Date();
        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        // var seconds = String(now.getSeconds()).padStart(2, '0');
        elClock.textContent = hours + ':' + minutes;

        // 時間帯変更チェック
        var newPeriod = getCurrentPeriod();
        if (newPeriod !== currentPeriod) {
            currentPeriod = newPeriod;
            updatePeriodDisplay();
        }

        // 時間が変わったらTodoリストを再レンダリング
        // (各Todoのカスタム時間帯設定に基づいて表示/非表示が切り替わる)
        var currentHour = now.getHours();
        if (!updateClock.lastHour || updateClock.lastHour !== currentHour) {
            updateClock.lastHour = currentHour;
            renderTodos();
        }
    }

    // 時間帯表示更新
    function updatePeriodDisplay() {
        var periodData = TIME_RANGES[currentPeriod];
        elGreeting.textContent = periodData.greeting;
        elCurrentPeriod.textContent = periodData.label;
        document.body.setAttribute('data-period', currentPeriod);
    }

    // Todo一覧レンダリング
    function renderTodos() {
        var now = new Date();
        var allTodos = [];

        // 全てのperiodからTodoを取得
        Object.keys(TIME_RANGES).forEach(function (period) {
            var periodTodos = TodoManager.getTodos(period);
            periodTodos.forEach(function (todo) {
                // periodを保持
                todo._period = period;
                allTodos.push(todo);
            });
        });

        // order順にソート
        allTodos.sort(function (a, b) {
            var orderA = a.order !== undefined ? a.order : 999;
            var orderB = b.order !== undefined ? b.order : 999;
            return orderA - orderB;
        });

        // 曜日と時間帯でフィルタリング
        var visibleTodos = allTodos.filter(function (todo) {
            return shouldShowToday(todo) && shouldShowNow(todo, now);
        });

        // 完了状態で分類
        var uncheckedTodos = [];
        var checkedTodos = [];

        visibleTodos.forEach(function (todo) {
            if (isTodoDone(todo, todo._period, now)) {
                checkedTodos.push(todo);
            } else {
                uncheckedTodos.push(todo);
            }
        });

        // レンダリング
        elTodoListUnchecked.innerHTML = '';
        elTodoListChecked.innerHTML = '';

        uncheckedTodos.forEach(function (todo) {
            var el = createTodoElement(todo, false);
            elTodoListUnchecked.appendChild(el);
        });

        checkedTodos.forEach(function (todo) {
            var el = createTodoElement(todo, true);
            elTodoListChecked.appendChild(el);
        });

        // 空メッセージ表示制御
        if (uncheckedTodos.length === 0 && visibleTodos.length > 0) {
            elEmptyMessage.classList.remove('hidden');
        } else {
            elEmptyMessage.classList.add('hidden');
        }
    }

    // Todo要素作成
    function createTodoElement(todo, isChecked) {
        var div = document.createElement('div');
        div.className = 'todo-item' + (isChecked ? ' checked' : '');
        div.setAttribute('draggable', 'true');
        div.setAttribute('data-todo-id', todo.id);

        // ドラッグハンドル
        var dragHandle = document.createElement('div');
        dragHandle.className = 'todo-drag-handle';
        div.appendChild(dragHandle);

        // チェックボックス
        var checkbox = document.createElement('div');
        checkbox.className = 'todo-checkbox';
        checkbox.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleTodo(todo.id);
        });
        div.appendChild(checkbox);

        // テキスト
        var text = document.createElement('div');
        text.className = 'todo-text';
        text.textContent = todo.text;
        div.appendChild(text);

        // ドラッグイベント
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragleave', handleDragLeave);

        return div;
    }

    // Todo完了状態トグル
    function toggleTodo(todoId) {
        // 全てのperiodからTodoを検索
        var foundTodo = null;
        var foundPeriod = null;

        Object.keys(TIME_RANGES).forEach(function (period) {
            var todos = TodoManager.getTodos(period);
            var todo = todos.find(function (t) { return t.id === todoId; });
            if (todo) {
                foundTodo = todo;
                foundPeriod = period;
            }
        });

        if (!foundTodo) return;

        var now = new Date();
        var wasDone = isTodoDone(foundTodo, foundPeriod, now);

        if (wasDone) {
            // チェック解除
            foundTodo.lastDone = null;
            LogManager.addLog(foundTodo.id, foundTodo.text, foundPeriod, 'uncheck');
            DiscordNotifier.sendTodoUncheck(foundTodo.text, foundPeriod);
            AudioPlayer.playUncheckSound(); // アンチェック音
        } else {
            // チェック
            foundTodo.lastDone = now.getTime();
            LogManager.addLog(foundTodo.id, foundTodo.text, foundPeriod, 'check');
            DiscordNotifier.sendTodoCheck(foundTodo.text, foundPeriod);
            AudioPlayer.playCheckSound(); // チェック音
        }

        TodoManager.updateTodo(foundPeriod, todoId, { lastDone: foundTodo.lastDone });
        renderTodos();
    }

    // ドラッグ&ドロップハンドラー
    function handleDragStart(e) {
        draggedElement = this;
        draggedTodo = parseInt(this.getAttribute('data-todo-id'));
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');

        // すべてのドラッグオーバー状態をクリア
        var items = document.querySelectorAll('.todo-item');
        items.forEach(function (item) {
            item.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
        return false;
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        this.classList.remove('drag-over');

        if (draggedElement !== this) {
            var targetTodoId = parseInt(this.getAttribute('data-todo-id'));
            reorderTodos(draggedTodo, targetTodoId);
        }

        return false;
    }

    // Todo並び替え
    function reorderTodos(draggedId, targetId) {
        // 全てのperiodからTodoを検索
        var draggedTodo = null;
        var draggedPeriod = null;
        var targetTodo = null;
        var targetPeriod = null;

        Object.keys(TIME_RANGES).forEach(function (period) {
            var todos = TodoManager.getTodos(period);
            todos.forEach(function (todo) {
                if (todo.id === draggedId) {
                    draggedTodo = todo;
                    draggedPeriod = period;
                }
                if (todo.id === targetId) {
                    targetTodo = todo;
                    targetPeriod = period;
                }
            });
        });

        if (!draggedTodo || !targetTodo) return;

        // 同じperiod内でのみ並び替えを許可
        if (draggedPeriod !== targetPeriod) return;

        var todos = TodoManager.getTodos(draggedPeriod);
        var draggedIndex = todos.findIndex(function (t) { return t.id === draggedId; });
        var targetIndex = todos.findIndex(function (t) { return t.id === targetId; });

        if (draggedIndex === -1 || targetIndex === -1) return;

        // 配列内で移動
        var draggedItem = todos.splice(draggedIndex, 1)[0];
        todos.splice(targetIndex, 0, draggedItem);

        // 順序を更新
        todos.forEach(function (todo, index) {
            todo.order = index;
        });

        TodoManager.reorderTodos(draggedPeriod, todos);
        renderTodos();
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
