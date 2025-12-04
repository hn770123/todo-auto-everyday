// 共通ユーティリティ関数

(function (window) {
    'use strict';

    // ストレージキー
    var STORAGE_KEYS = {
        TODO_DATA: 'everyday_todo_data_v3',
        LOG_DATA: 'everyday_todo_logs_v1',
        CONFIG_DATA: 'everyday_todo_config_v2',
        TIME_PERIODS: 'everyday_todo_time_periods_v1',
        ONETIME_TODOS: 'everyday_todo_onetime_v1'
    };

    // デフォルト時間帯定義（プリセット）
    var DEFAULT_TIME_RANGES = {
        morning: { id: 'morning', start: 4, end: 12, label: '朝', greeting: 'おはようございます', emoji: '🌅' },
        afterSchool: { id: 'afterSchool', start: 12, end: 19, label: '帰宅後', greeting: 'おかえりなさい', emoji: '🏠' },
        night: { id: 'night', start: 19, end: 4, label: '寝る前', greeting: 'おやすみなさい', emoji: '🌙' }
    };

    // 時間帯定義（カスタマイズ可能）
    var TIME_RANGES = null;

    // 時間帯を読み込む
    function loadTimeRanges() {
        if (TIME_RANGES) return TIME_RANGES;
        var stored = Storage.get(STORAGE_KEYS.TIME_PERIODS, null);
        if (stored) {
            TIME_RANGES = stored;
        } else {
            TIME_RANGES = JSON.parse(JSON.stringify(DEFAULT_TIME_RANGES));
        }
        return TIME_RANGES;
    }

    // 時間帯を保存する
    function saveTimeRanges(ranges) {
        TIME_RANGES = ranges;
        return Storage.set(STORAGE_KEYS.TIME_PERIODS, ranges);
    }

    // 時間帯をリセットする
    function resetTimeRanges() {
        TIME_RANGES = JSON.parse(JSON.stringify(DEFAULT_TIME_RANGES));
        return Storage.set(STORAGE_KEYS.TIME_PERIODS, TIME_RANGES);
    }

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
            var ranges = loadTimeRanges();
            var defaultData = {};
            Object.keys(ranges).forEach(function (key) {
                defaultData[key] = [];
            });
            return Storage.get(STORAGE_KEYS.TODO_DATA, defaultData);
        },
        save: function (data) {
            return Storage.set(STORAGE_KEYS.TODO_DATA, data);
        },
        addTodo: function (period, text, continueDays) {
            var data = this.load();
            var newTodo = {
                id: Date.now(),
                text: text,
                lastDone: null,
                order: data[period] ? data[period].length : 0,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // すべての曜日で表示
                continueDays: continueDays || 0 // 継続日数（0=継続なし）
            };
            if (!data[period]) data[period] = [];
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
        var ranges = loadTimeRanges();
        var hour = new Date().getHours();

        // 各時間帯をチェック
        for (var key in ranges) {
            var range = ranges[key];
            if (range.end > range.start) {
                // 通常の範囲（例: 4-12）
                if (hour >= range.start && hour < range.end) {
                    return key;
                }
            } else {
                // 日をまたぐ範囲（例: 19-4）
                if (hour >= range.start || hour < range.end) {
                    return key;
                }
            }
        }

        // デフォルト（最初の時間帯）
        return Object.keys(ranges)[0];
    }

    // 時間帯のウィンドウ範囲を取得
    function getWindowRange(period, now) {
        now = now || new Date();
        var ranges = loadTimeRanges();
        var start = new Date(now);
        var end = new Date(now);
        var range = ranges[period];

        if (!range) return { start: 0, end: 0 };

        if (range.end <= range.start) {
            // 日をまたぐ範囲
            if (now.getHours() < range.end) {
                start.setDate(start.getDate() - 1);
                start.setHours(range.start, 0, 0, 0);
                end.setHours(range.end, 0, 0, 0);
            } else {
                start.setHours(range.start, 0, 0, 0);
                end.setDate(end.getDate() + 1);
                end.setHours(range.end, 0, 0, 0);
            }
        } else {
            start.setHours(range.start, 0, 0, 0);
            end.setHours(range.end, 0, 0, 0);
        }
        return { start: start.getTime(), end: end.getTime() };
    }

    // Todoが現在のウィンドウで完了済みか判定（継続日数対応）
    function isTodoDone(todo, period, now) {
        if (!todo.lastDone) return false;
        now = now || new Date();

        // 継続日数が設定されている場合
        if (todo.continueDays && todo.continueDays > 0) {
            var doneDate = new Date(todo.lastDone);
            var daysDiff = Math.floor((now.getTime() - doneDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= todo.continueDays;
        }

        // 通常の判定
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

    // チェック音再生（Web Audio API使用）
    var AudioPlayer = {
        context: null,

        init: function () {
            if (!this.context) {
                try {
                    var AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.context = new AudioContext();
                } catch (e) {
                    console.warn('Web Audio API not supported');
                }
            }
        },

        playCheckSound: function () {
            this.init();
            if (!this.context) return;

            var ctx = this.context;
            var now = ctx.currentTime;

            // オシレーター1（メイン音）
            var osc1 = ctx.createOscillator();
            var gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.15);
        },

        playUncheckSound: function () {
            this.init();
            if (!this.context) return;

            var ctx = this.context;
            var now = ctx.currentTime;

            // オシレーター（下降音）
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    };

    // 繰り返しではないTodoマネージャー
    var OneTimeTodoManager = {
        load: function () {
            return Storage.get(STORAGE_KEYS.ONETIME_TODOS, []);
        },
        save: function (todos) {
            return Storage.set(STORAGE_KEYS.ONETIME_TODOS, todos);
        },
        addTodo: function (text, startDate, endDate) {
            var todos = this.load();
            var newTodo = {
                id: Date.now(),
                text: text,
                startDate: startDate, // YYYY-MM-DD形式
                endDate: endDate,     // YYYY-MM-DD形式
                completed: false,
                completedAt: null,
                order: todos.length
            };
            todos.push(newTodo);
            this.save(todos);
            return newTodo;
        },
        updateTodo: function (id, updates) {
            var todos = this.load();
            var todo = todos.find(function (t) { return t.id === id; });
            if (todo) {
                Object.keys(updates).forEach(function (key) {
                    todo[key] = updates[key];
                });
                this.save(todos);
                return true;
            }
            return false;
        },
        deleteTodo: function (id) {
            var todos = this.load();
            todos = todos.filter(function (t) { return t.id !== id; });
            this.save(todos);
        },
        getTodos: function () {
            return this.load();
        },
        // 終了日を過ぎたチェック済みTodoを削除
        cleanupExpired: function () {
            var todos = this.load();
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayStr = today.toISOString().split('T')[0];

            var filtered = todos.filter(function (todo) {
                if (todo.completed && todo.endDate < todayStr) {
                    return false; // 削除
                }
                return true; // 保持
            });

            if (filtered.length !== todos.length) {
                this.save(filtered);
                return todos.length - filtered.length; // 削除数
            }
            return 0;
        }
    };

    // 公開API
    window.TodoApp = {
        Storage: Storage,
        TodoManager: TodoManager,
        LogManager: LogManager,
        ConfigManager: ConfigManager,
        DiscordNotifier: DiscordNotifier,
        AudioPlayer: AudioPlayer,
        OneTimeTodoManager: OneTimeTodoManager,
        TIME_RANGES: loadTimeRanges(),
        DEFAULT_TIME_RANGES: DEFAULT_TIME_RANGES,
        loadTimeRanges: loadTimeRanges,
        saveTimeRanges: saveTimeRanges,
        resetTimeRanges: resetTimeRanges,
        getCurrentPeriod: getCurrentPeriod,
        getWindowRange: getWindowRange,
        isTodoDone: isTodoDone,
        shouldShowToday: shouldShowToday,
        escapeHtml: escapeHtml,
        formatDateTime: formatDateTime
    };

})(window);
