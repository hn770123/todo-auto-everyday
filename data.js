(function () {
    'use strict';

    var Storage = window.TodoApp.Storage;
    var TodoManager = window.TodoApp.TodoManager;
    var LogManager = window.TodoApp.LogManager;
    var ConfigManager = window.TodoApp.ConfigManager;
    var OneTimeTodoManager = window.TodoApp.OneTimeTodoManager;
    var loadTimeRanges = window.TodoApp.loadTimeRanges;
    var saveTimeRanges = window.TodoApp.saveTimeRanges;

    // DOM要素
    var elExportBtn, elCopyJsonBtn, elExportTextarea;
    var elImportBtn, elValidateBtn, elImportTextarea;
    var elFileInput, elSelectFileBtn;

    // 初期化
    function init() {
        elExportBtn = document.getElementById('export-btn');
        elCopyJsonBtn = document.getElementById('copy-json-btn');
        elExportTextarea = document.getElementById('export-textarea');

        elImportBtn = document.getElementById('import-btn');
        elValidateBtn = document.getElementById('validate-btn');
        elImportTextarea = document.getElementById('import-textarea');

        elFileInput = document.getElementById('file-input');
        elSelectFileBtn = document.getElementById('select-file-btn');

        // イベントリスナー
        elExportBtn.addEventListener('click', handleExport);
        elCopyJsonBtn.addEventListener('click', handleCopyJson);
        elImportBtn.addEventListener('click', handleImport);
        elValidateBtn.addEventListener('click', handleValidate);
        elSelectFileBtn.addEventListener('click', function () {
            elFileInput.click();
        });
        elFileInput.addEventListener('change', handleFileSelect);

        // 初期表示
        updateExportTextarea();
    }

    // エクスポートデータを生成
    function generateExportData() {
        return {
            version: '3.0',
            exportedAt: new Date().toISOString(),
            todos: TodoManager.load(),
            oneTimeTodos: OneTimeTodoManager.load(),
            logs: LogManager.load(),
            config: ConfigManager.load(),
            timeRanges: loadTimeRanges()
        };
    }

    // エクスポートテキストエリアを更新
    function updateExportTextarea() {
        var data = generateExportData();
        elExportTextarea.value = JSON.stringify(data, null, 2);
    }

    // エクスポート処理
    function handleExport() {
        var data = generateExportData();
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'everyday-todo-backup-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ JSONファイルをダウンロードしました');
    }

    // JSONをコピー
    function handleCopyJson() {
        elExportTextarea.select();
        try {
            document.execCommand('copy');
            alert('✅ JSONをクリップボードにコピーしました');
        } catch (e) {
            alert('❌ コピーに失敗しました');
        }
    }

    // インポート処理
    function handleImport() {
        var json = elImportTextarea.value.trim();
        if (!json) {
            alert('❌ インポートするJSONを入力してください');
            return;
        }

        var data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            alert('❌ JSONの形式が正しくありません: ' + e.message);
            return;
        }

        if (!validateImportData(data)) {
            return;
        }

        var confirmed = confirm(
            '現在のデータを上書きしてインポートしますか？\n\n' +
            'この操作は取り消せません。'
        );

        if (!confirmed) return;

        // インポート実行
        try {
            if (data.todos) {
                TodoManager.save(data.todos);
            }
            if (data.oneTimeTodos) {
                OneTimeTodoManager.save(data.oneTimeTodos);
            }
            if (data.logs) {
                LogManager.save(data.logs);
            }
            if (data.config) {
                ConfigManager.save(data.config);
            }
            if (data.timeRanges) {
                saveTimeRanges(data.timeRanges);
            }

            alert('✅ インポートが完了しました。ページを再読み込みします。');
            window.location.href = 'todo.html';
        } catch (e) {
            alert('❌ インポートに失敗しました: ' + e.message);
        }
    }

    // 検証のみ
    function handleValidate() {
        var json = elImportTextarea.value.trim();
        if (!json) {
            alert('❌ 検証するJSONを入力してください');
            return;
        }

        var data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            alert('❌ JSONの形式が正しくありません: ' + e.message);
            return;
        }

        if (validateImportData(data, true)) {
            alert('✅ JSONの形式は正しいです');
        }
    }

    // インポートデータの検証
    function validateImportData(data, showDetails) {
        var errors = [];

        if (typeof data !== 'object' || data === null) {
            errors.push('データがオブジェクトではありません');
        }

        if (data.todos && typeof data.todos !== 'object') {
            errors.push('todosの形式が正しくありません');
        }

        if (data.oneTimeTodos && !Array.isArray(data.oneTimeTodos)) {
            errors.push('oneTimeTodosの形式が正しくありません');
        }

        if (data.logs && !Array.isArray(data.logs)) {
            errors.push('logsの形式が正しくありません');
        }

        if (data.config && typeof data.config !== 'object') {
            errors.push('configの形式が正しくありません');
        }

        if (data.timeRanges && typeof data.timeRanges !== 'object') {
            errors.push('timeRangesの形式が正しくありません');
        }

        if (errors.length > 0) {
            alert('❌ データの検証に失敗しました:\n\n' + errors.join('\n'));
            return false;
        }

        if (showDetails) {
            var details = [];
            if (data.todos) {
                var todoCount = 0;
                Object.keys(data.todos).forEach(function (key) {
                    todoCount += data.todos[key].length;
                });
                details.push('繰り返しTodo: ' + todoCount + '件');
            }
            if (data.oneTimeTodos) {
                details.push('単発Todo: ' + data.oneTimeTodos.length + '件');
            }
            if (data.logs) {
                details.push('ログ: ' + data.logs.length + '件');
            }
            if (data.timeRanges) {
                details.push('時間帯: ' + Object.keys(data.timeRanges).length + '個');
            }
            if (details.length > 0) {
                alert('✅ データ内容:\n\n' + details.join('\n'));
            }
        }

        return true;
    }

    // ファイル選択処理
    function handleFileSelect(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (event) {
            elImportTextarea.value = event.target.result;
            alert('✅ ファイルを読み込みました。「インポート実行」ボタンを押してください。');
        };
        reader.onerror = function () {
            alert('❌ ファイルの読み込みに失敗しました');
        };
        reader.readAsText(file);
    }

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
