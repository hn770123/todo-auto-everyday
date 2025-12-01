(function () {
    'use strict';

    var TodoManager = window.TodoApp.TodoManager;
    var LogManager = window.TodoApp.LogManager;
    var DiscordNotifier = window.TodoApp.DiscordNotifier;
    var TIME_RANGES = window.TodoApp.TIME_RANGES;
    var getCurrentPeriod = window.TodoApp.getCurrentPeriod;
    var isTodoDone = window.TodoApp.isTodoDone;
    var shouldShowToday = window.TodoApp.shouldShowToday;
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
        var seconds = String(now.getSeconds()).padStart(2, '0');
        elClock.textContent = hours + ':' + minutes + ':' + seconds;

        // 時間帯変更チェック
        var newPeriod = getCurrentPeriod();
        if (newPeriod !== currentPeriod) {
            currentPeriod = newPeriod;
            updatePeriodDisplay();
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
        var todos = TodoManager.getTodos(currentPeriod);
        var now = new Date();

        // 曜日フィルタリング
        var visibleTodos = todos.filter(function (todo) {
            return shouldShowToday(todo);
        });

        // 完了状態で分類
        var uncheckedTodos = [];
        var checkedTodos = [];

        visibleTodos.forEach(function (todo) {
            if (isTodoDone(todo, currentPeriod, now)) {
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
        var todos = TodoManager.getTodos(currentPeriod);
        var todo = todos.find(function (t) { return t.id === todoId; });

        if (!todo) return;

        var now = new Date();
        var wasDone = isTodoDone(todo, currentPeriod, now);

        if (wasDone) {
            // チェック解除
            todo.lastDone = null;
            LogManager.addLog(todo.id, todo.text, currentPeriod, 'uncheck');
            DiscordNotifier.sendTodoUncheck(todo.text, currentPeriod);
        } else {
            // チェック
            todo.lastDone = now.getTime();
            LogManager.addLog(todo.id, todo.text, currentPeriod, 'check');
            DiscordNotifier.sendTodoCheck(todo.text, currentPeriod);
        }

        TodoManager.updateTodo(currentPeriod, todoId, { lastDone: todo.lastDone });
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
        var todos = TodoManager.getTodos(currentPeriod);
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

        TodoManager.reorderTodos(currentPeriod, todos);
        renderTodos();
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
