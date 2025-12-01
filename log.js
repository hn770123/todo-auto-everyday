(function () {
    'use strict';

    var LogManager = window.TodoApp.LogManager;
    var TIME_RANGES = window.TodoApp.TIME_RANGES;
    var formatDateTime = window.TodoApp.formatDateTime;
    var escapeHtml = window.TodoApp.escapeHtml;

    // DOM要素
    var elLogContainer, elEmptyMessage, elClearLogsBtn;

    // 初期化
    function init() {
        elLogContainer = document.getElementById('log-container');
        elEmptyMessage = document.getElementById('empty-log-message');
        elClearLogsBtn = document.getElementById('clear-logs-btn');

        // イベントリスナー
        elClearLogsBtn.addEventListener('click', handleClearLogs);

        // ログ表示
        renderLogs();
    }

    // ログ一覧レンダリング
    function renderLogs() {
        var logs = LogManager.getLogs(100); // 最新100件

        elLogContainer.innerHTML = '';

        if (logs.length === 0) {
            elEmptyMessage.classList.remove('hidden');
            elClearLogsBtn.disabled = true;
            return;
        }

        elEmptyMessage.classList.add('hidden');
        elClearLogsBtn.disabled = false;

        logs.forEach(function (log) {
            var el = createLogElement(log);
            elLogContainer.appendChild(el);
        });
    }

    // ログ要素作成
    function createLogElement(log) {
        var div = document.createElement('div');
        div.className = 'log-item action-' + log.action;

        // ヘッダー部分
        var header = document.createElement('div');
        header.className = 'log-header';

        // アクション表示
        var action = document.createElement('div');
        action.className = 'log-action';

        var actionIcon = document.createElement('span');
        actionIcon.className = 'log-action-icon';
        actionIcon.textContent = log.action === 'check' ? '✅' : '⬜';
        action.appendChild(actionIcon);

        var actionText = document.createElement('span');
        actionText.textContent = log.action === 'check' ? 'チェック' : 'チェック解除';
        action.appendChild(actionText);

        // 時間帯バッジ
        var periodBadge = document.createElement('span');
        periodBadge.className = 'log-period period-' + log.period;
        periodBadge.textContent = TIME_RANGES[log.period].label;
        action.appendChild(periodBadge);

        header.appendChild(action);

        // タイムスタンプ
        var timestamp = document.createElement('div');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = formatDateTime(log.timestamp);
        header.appendChild(timestamp);

        div.appendChild(header);

        // Todoテキスト
        var text = document.createElement('div');
        text.className = 'log-text';
        text.textContent = log.todoText;
        div.appendChild(text);

        return div;
    }

    // ログクリア処理
    function handleClearLogs() {
        if (confirm('本当にすべてのログを削除しますか？\nこの操作は取り消せません。')) {
            LogManager.clearLogs();
            renderLogs();
        }
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
