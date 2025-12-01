// 共通ユーティリティ関数

(function (window) {
    'use strict';

    // ストレージキー
    var STORAGE_KEYS = {
        TODO_DATA: 'everyday_todo_data_v2',
        LOG_DATA: 'everyday_todo_logs_v1',
        CONFIG_DATA: 'everyday_todo_config_v1'
    };

    // 時間帯定義
    var TIME_RANGES = {
        morning: { start: 4, end: 12, label: '朝', greeting: 'おはようございます' },
        afterSchool: { start: 12, end: 19, label: '帰宅後', greeting: 'おかえりなさい' },
        night: { start: 19, end: 4, label: '寝る前', greeting: 'おやすみなさい' }
    };

    // ローカルストレージ操作
    var Storage = {
        get: function (key, defaultValue) {
            try {
                var data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },
        set: function (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        remove: function (key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        }
    };

    // Todo データマネージャー
    var TodoManager = {
        load: function () {
            return Storage.get(STORAGE_KEYS.TODO_DATA, {
                morning: [],
                afterSchool: [],
                night: []
            });
        },
        save: function (data) {
            return Storage.set(STORAGE_KEYS.TODO_DATA, data);
        },
        addTodo: function (period, text) {
            var data = this.load();
            var newTodo = {
                id: Date.now(),
                text: text,
                lastDone: null,
                order: data[period].length,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // すべての曜日で表示
            };
            data[period].push(newTodo);
            this.save(data);
            return newTodo;
        },
        updateTodo: function (period, id, updates) {
            var data = this.load();
            var todo = data[period].find(function (t) { return t.id === id; });
            if (todo) {
                Object.keys(updates).forEach(function (key) {
                    todo[key] = updates[key];
                });
                this.save(data);
                return true;
            }
            return false;
        },
        deleteTodo: function (period, id) {
            var data = this.load();
            data[period] = data[period].filter(function (t) { return t.id !== id; });
            this.save(data);
        },
        reorderTodos: function (period, todos) {
            var data = this.load();
            data[period] = todos;
            this.save(data);
        },
        getTodos: function (period) {
            var data = this.load();
            return data[period] || [];
        }
    };

    // ログマネージャー
    var LogManager = {
        load: function () {
            return Storage.get(STORAGE_KEYS.LOG_DATA, []);
        },
        save: function (logs) {
            // 最新100件のみ保持
            var trimmed = logs.slice(-100);
            return Storage.set(STORAGE_KEYS.LOG_DATA, trimmed);
        },
        addLog: function (todoId, todoText, period, action) {
            var logs = this.load();
            var log = {
                id: Date.now(),
                todoId: todoId,
                todoText: todoText,
                period: period,
                action: action, // 'check' or 'uncheck'
                timestamp: new Date().toISOString()
            };
            logs.push(log);
            this.save(logs);
            return log;
        },
        getLogs: function (limit) {
            var logs = this.load();
            if (limit) {
                return logs.slice(-limit).reverse();
            }
            return logs.slice().reverse();
        },
        clearLogs: function () {
            return Storage.set(STORAGE_KEYS.LOG_DATA, []);
        }
    };

    // 設定マネージャー
    var ConfigManager = {
        load: function () {
            return Storage.get(STORAGE_KEYS.CONFIG_DATA, {
                discordWebhookUrl: '',
                discordUsername: 'Todo Bot'
            });
        },
        save: function (config) {
            return Storage.set(STORAGE_KEYS.CONFIG_DATA, config);
        },
        get: function (key) {
            var config = this.load();
            return config[key];
        },
        set: function (key, value) {
            var config = this.load();
            config[key] = value;
            return this.save(config);
        }
    };

    // Discord通知
    var DiscordNotifier = {
        send: function (message) {
            var webhookUrl = ConfigManager.get('discordWebhookUrl');
            var username = ConfigManager.get('discordUsername');

            if (!webhookUrl) {
                console.warn('Discord webhook URL not configured');
                return Promise.resolve(false);
            }

            var payload = {
                username: username || 'Todo Bot',
                content: message
            };

            return fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(function (response) {
                    if (response.ok || response.status === 204) {
                        console.log('Discord notification sent');
                        return true;
                    } else {
                        console.error('Discord notification failed:', response.status);
                        return false;
                    }
                })
                .catch(function (error) {
                    console.error('Discord notification error:', error);
                    return false;
                });
        },
        sendTodoCheck: function (todoText, period) {
            var periodLabel = TIME_RANGES[period].label;
            var message = '✅ **' + periodLabel + 'のTodo完了**\n' + todoText;
            return this.send(message);
        },
        sendTodoUncheck: function (todoText, period) {
            var periodLabel = TIME_RANGES[period].label;
            var message = '⬜ **' + periodLabel + 'のTodoチェック解除**\n' + todoText;
            return this.send(message);
        }
    };

    // 時間帯判定
    function getCurrentPeriod() {
        var hour = new Date().getHours();
        if (hour >= TIME_RANGES.morning.start && hour < TIME_RANGES.morning.end) {
            return 'morning';
        }
        if (hour >= TIME_RANGES.afterSchool.start && hour < TIME_RANGES.afterSchool.end) {
            return 'afterSchool';
        }
        return 'night';
    }

    // 時間帯のウィンドウ範囲を取得
    function getWindowRange(period, now) {
        now = now || new Date();
        var start = new Date(now);
        var end = new Date(now);
        var range = TIME_RANGES[period];

        if (period === 'night') {
            if (now.getHours() < 4) {
                start.setDate(start.getDate() - 1);
                start.setHours(19, 0, 0, 0);
                end.setHours(4, 0, 0, 0);
            } else {
                start.setHours(19, 0, 0, 0);
                end.setDate(end.getDate() + 1);
                end.setHours(4, 0, 0, 0);
            }
        } else {
            start.setHours(range.start, 0, 0, 0);
            end.setHours(range.end, 0, 0, 0);
        }
        return { start: start.getTime(), end: end.getTime() };
    }

    // Todoが現在のウィンドウで完了済みか判定
    function isTodoDone(todo, period, now) {
        if (!todo.lastDone) return false;
        now = now || new Date();
        var windowRange = getWindowRange(period, now);
        return todo.lastDone >= windowRange.start && todo.lastDone < windowRange.end;
    }

    // Todoが今日表示すべきか判定（曜日設定に基づく）
    function shouldShowToday(todo) {
        if (!todo.daysOfWeek || todo.daysOfWeek.length === 0) {
            return true; // 曜日設定がない場合は常に表示
        }
        var today = new Date().getDay();
        return todo.daysOfWeek.indexOf(today) !== -1;
    }

    // HTML エスケープ
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // 日時フォーマット
    function formatDateTime(dateString) {
        var date = new Date(dateString);
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hour = String(date.getHours()).padStart(2, '0');
        var minute = String(date.getMinutes()).padStart(2, '0');
        var second = String(date.getSeconds()).padStart(2, '0');
        return year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
    }

    // 公開API
    window.TodoApp = {
        Storage: Storage,
        TodoManager: TodoManager,
        LogManager: LogManager,
        ConfigManager: ConfigManager,
        DiscordNotifier: DiscordNotifier,
        TIME_RANGES: TIME_RANGES,
        getCurrentPeriod: getCurrentPeriod,
        getWindowRange: getWindowRange,
        isTodoDone: isTodoDone,
        shouldShowToday: shouldShowToday,
        escapeHtml: escapeHtml,
        formatDateTime: formatDateTime
    };

})(window);
