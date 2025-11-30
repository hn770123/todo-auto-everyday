(function () {
    'use strict';

    // --- Configuration ---
    var STORAGE_KEY = 'everyday_todo_data_v1';
    var TIME_RANGES = {
        morning: { start: 4, end: 12, label: 'Morning', greeting: 'Good Morning' },
        afterSchool: { start: 12, end: 19, label: 'After School', greeting: 'Welcome Back' },
        night: { start: 19, end: 4, label: 'Night', greeting: 'Good Night' } // Ends next day 4am
    };

    var DEFAULT_DATA = {
        todos: {
            morning: [
                { id: 1, text: '顔を洗う', lastDone: null },
                { id: 2, text: '朝ごはんを食べる', lastDone: null },
                { id: 3, text: '歯磨き', lastDone: null }
            ],
            afterSchool: [
                { id: 4, text: '宿題をする', lastDone: null },
                { id: 5, text: '明日の準備', lastDone: null }
            ],
            night: [
                { id: 6, text: 'お風呂に入る', lastDone: null },
                { id: 7, text: 'ストレッチ', lastDone: null },
                { id: 8, text: '早く寝る', lastDone: null }
            ]
        }
    };

    // --- State ---
    var state = loadData();
    var currentPeriod = null;

    // --- DOM Elements ---
    var elApp, elGreeting, elClock, elTodoList, elSettingsBtn, elSettingsModal, elCloseSettingsBtn, elResetDataBtn;

    // --- Initialization ---
    function init() {
        console.log('Initializing app...');

        elApp = document.getElementById('app');
        elGreeting = document.getElementById('time-greeting');
        elClock = document.getElementById('clock');
        function loadData() {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    console.error('Failed to parse data', e);
                    return JSON.parse(JSON.stringify(DEFAULT_DATA));
                }
            }
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }

        function saveData() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }

        function resetData() {
            if (confirm('本当にデータをリセットしますか？')) {
                state = JSON.parse(JSON.stringify(DEFAULT_DATA));
                saveData();
                renderSettings();
                renderTodos();
                closeSettings();
            }
        }

        function getPeriod(date) {
            var h = date.getHours();
            // Morning: 4 <= h < 12
            if (h >= TIME_RANGES.morning.start && h < TIME_RANGES.morning.end) {
                return 'morning';
            }
            // AfterSchool: 12 <= h < 19
            if (h >= TIME_RANGES.afterSchool.start && h < TIME_RANGES.afterSchool.end) {
                return 'afterSchool';
            }
            // Night: 19 <= h or h < 4
            return 'night';
        }

        function getWindowRange(period, now) {
            var start = new Date(now);
            var end = new Date(now);

            var range = TIME_RANGES[period];

            if (period === 'night') {
                // If currently 00:00-04:00, start was yesterday 19:00
                if (now.getHours() < 4) {
                    start.setDate(start.getDate() - 1);
                    start.setHours(19, 0, 0, 0);
                    end.setHours(4, 0, 0, 0);
                } else {
                    // If currently 19:00-23:59, start is today 19:00, end is tomorrow 04:00
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

        function updateTime() {
            var now = new Date();
            var hours = String(now.getHours()).padStart(2, '0');
            var minutes = String(now.getMinutes()).padStart(2, '0');
            var seconds = String(now.getSeconds()).padStart(2, '0');
            elClock.textContent = hours + ':' + minutes + ':' + seconds;

            var newPeriod = getPeriod(now);
            if (newPeriod !== currentPeriod) {
                currentPeriod = newPeriod;
                updateTheme();
                renderTodos();
            }
        }

        function updateTheme() {
            document.body.className = 'theme-' + currentPeriod;
            elGreeting.textContent = TIME_RANGES[currentPeriod].greeting;
        }

        function isDone(lastDone, now) {
            if (!lastDone) return false;
            var windowRange = getWindowRange(currentPeriod, now);
            return lastDone >= windowRange.start && lastDone < windowRange.end;
        }

        // --- Rendering ---

        function renderTodos() {
            var now = new Date();
            var list = state.todos[currentPeriod];
            elTodoList.innerHTML = '';

            if (list.length === 0) {
                elTodoList.innerHTML = '<div style="text-align:center; opacity:0.7;">タスクがありません</div>';
                return;
            }

            list.forEach(function (todo) {
                var done = isDone(todo.lastDone, now);
                var el = document.createElement('div');
                el.className = 'todo-item' + (done ? ' completed' : '');
                el.onclick = function () { toggleTodo(todo.id); };

                var html = '';
                html += '<div class="checkbox"></div>';
                html += '<div class="todo-content">' + escapeHtml(todo.text) + '</div>';

                el.innerHTML = html;
                elTodoList.appendChild(el);
            });
        }

        function renderSettings() {
            ['morning', 'afterSchool', 'night'].forEach(function (p) {
                var ul = document.getElementById('settings-' + p + '-list');
                ul.innerHTML = '';
                state.todos[p].forEach(function (todo) {
                    var li = document.createElement('li');
                    li.className = 'settings-item';
                    li.innerHTML = '<span>' + escapeHtml(todo.text) + '</span>' +
                        '<button class="delete-btn" onclick="app.deleteTodo(\'' + p + '\', ' + todo.id + ')">削除</button>';
                    ul.appendChild(li);
                });
            });
        }

        // --- Actions ---

        function toggleTodo(id) {
            var list = state.todos[currentPeriod];
            var todo = null;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    todo = list[i];
                    break;
                }
            }

            if (todo) {
                var now = new Date();
                var done = isDone(todo.lastDone, now);

                if (!done) {
                    // Mark as done
                    todo.lastDone = now.getTime();

                    // Add animation class to the clicked element
                    // We need to find the element again or pass it. 
                    // Since we re-render immediately, the animation might be lost if we don't handle it carefully.
                    // Actually, re-rendering immediately removes the element.
                    // Let's delay re-rendering slightly or animate the new element?
                    // Better: Don't re-render the whole list immediately for the "check" action, just update DOM.
                    // But my render logic is simple. Let's just play sound and confetti.
                    // The user asked for "Flashy effect". Confetti is flashy.

                    playSuccessSound();
                    showConfetti();
                } else {
                    // Uncheck
                    todo.lastDone = null;
                }
                saveData();
                renderTodos(); // This re-renders everything.
            }
        }

        function addTodo(period) {
            var input = document.getElementById('new-' + period + '-todo');
            var text = input.value.trim();
            if (text) {
                state.todos[period].push({
                    id: Date.now(),
                    text: text,
                    lastDone: null
                });
                saveData();
                input.value = '';
                renderSettings();
                if (currentPeriod === period) renderTodos();
            }
        }

        function deleteTodo(period, id) {
            if (confirm('削除しますか？')) {
                state.todos[period] = state.todos[period].filter(function (t) { return t.id !== id; });
                saveData();
                renderSettings();
                if (currentPeriod === period) renderTodos();
            }
        }

        // --- UI/UX ---

        function openSettings() {
            renderSettings();
            elSettingsModal.classList.remove('hidden');
        }

        function closeSettings() {
            elSettingsModal.classList.add('hidden');
        }

        function escapeHtml(text) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function (m) { return map[m]; });
        }

        // --- Effects ---

        var audioCtx = null;

        function initAudio() {
            if (audioCtx) return;
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }

        // Unlock audio on first interaction
        document.addEventListener('touchstart', function () {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }, true);
        document.addEventListener('click', function () {
            if (!audioCtx) initAudio();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }, true);

        function playSuccessSound() {
            if (!audioCtx) initAudio();
            if (!audioCtx) return;

            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();

            osc.type = 'triangle'; // More pleasant than sine
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.1); // C6
            osc.frequency.exponentialRampToValueAtTime(1396.9, audioCtx.currentTime + 0.3); // F6

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }

        function showConfetti() {
            var colors = ['#ffeb3b', '#ff5722', '#4caf50', '#2196f3', '#e91e63'];
            var container = document.getElementById('confetti-container');

            for (var i = 0; i < 30; i++) {
                var el = document.createElement('div');
                el.className = 'confetti';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                el.style.opacity = Math.random();
                container.appendChild(el);

                // Cleanup
                (function (element) {
                    setTimeout(function () {
                        if (element.parentNode) element.parentNode.removeChild(element);
                    }, 3000);
                })(el);
            }
        }

        // Start
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

    }) ();
