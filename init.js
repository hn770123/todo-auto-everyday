// 初期データセットアップスクリプト
// 初回起動時にサンプルデータを作成

(function () {
    'use strict';

    var STORAGE_KEY = 'everyday_todo_data_v2';
    var INIT_FLAG_KEY = 'everyday_todo_initialized';

    // 初期化済みかチェック
    var isInitialized = localStorage.getItem(INIT_FLAG_KEY);

    if (!isInitialized) {
        console.log('初回起動: サンプルデータを作成します');

        // サンプルTodoデータ
        var sampleData = {
            morning: [
                {
                    id: Date.now() + 1,
                    text: '顔を洗う',
                    lastDone: null,
                    order: 0,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 2,
                    text: '朝ごはんを食べる',
                    lastDone: null,
                    order: 1,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 3,
                    text: '歯磨き',
                    lastDone: null,
                    order: 2,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 4,
                    text: '着替える',
                    lastDone: null,
                    order: 3,
                    daysOfWeek: [1, 2, 3, 4, 5] // 平日のみ
                }
            ],
            afterSchool: [
                {
                    id: Date.now() + 5,
                    text: '手洗い・うがい',
                    lastDone: null,
                    order: 0,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 6,
                    text: '宿題をする',
                    lastDone: null,
                    order: 1,
                    daysOfWeek: [1, 2, 3, 4, 5] // 平日のみ
                },
                {
                    id: Date.now() + 7,
                    text: '明日の準備',
                    lastDone: null,
                    order: 2,
                    daysOfWeek: [0, 1, 2, 3, 4, 5] // 日曜〜金曜
                }
            ],
            night: [
                {
                    id: Date.now() + 8,
                    text: 'お風呂に入る',
                    lastDone: null,
                    order: 0,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 9,
                    text: 'ストレッチ',
                    lastDone: null,
                    order: 1,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 10,
                    text: '歯磨き',
                    lastDone: null,
                    order: 2,
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
                },
                {
                    id: Date.now() + 11,
                    text: '早く寝る',
                    lastDone: null,
                    order: 3,
                    daysOfWeek: [0, 1, 2, 3, 4] // 日曜〜木曜
                }
            ]
        };

        // ローカルストレージに保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
        localStorage.setItem(INIT_FLAG_KEY, 'true');

        console.log('サンプルデータの作成完了');
    } else {
        console.log('既に初期化済みです');
    }

    // 期限切れの単発Todoを自動削除
    if (window.TodoApp && window.TodoApp.OneTimeTodoManager) {
        var deletedCount = window.TodoApp.OneTimeTodoManager.cleanupExpired();
        if (deletedCount > 0) {
            console.log('期限切れのTodoを' + deletedCount + '件削除しました');
        }
    }

})();
