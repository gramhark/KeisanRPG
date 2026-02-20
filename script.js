/* Game Constants */
const CONSTANTS = {
    PLAYER_MAX_HP: 10,
    TOTAL_MONSTERS: 10, // Will be updated by calculateTotalMonsters() on load
    TIMER_SECONDS: 10,
    CRITICAL_THRESHOLD: 3.0,
    NORMAL_DAMAGE: 1,
    CRITICAL_DAMAGE: 2,
    FONT_PIXEL: 'DotGothic16, sans-serif'
};

const FORM_CONFIG = {
    ACTION_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSe-dlcdvSBPkMlQ1Zj2S0xV7nmSz-nCK58mp76N7gq4G0PIoQ/formResponse',
    ENTRY_ID: 'entry.2141365113'
};

/* State Management */
const GameState = {
    SETUP: 'setup',
    BATTLE: 'battle',
    INTERVAL: 'interval',
    TRANSITION: 'transition',
    GAME_OVER: 'game_over',
    RESULT: 'result'
};

/* Assets Map (populated dynamically if needed, but here hardcoded matching existing files) */
/* Ideally we'd scan the dir, but in browser we explicitly map or guess. 
   We will rely on simple ID mapping logic since we kept original names.
*/

class SoundManager {
    constructor() {
        this.bgmBattle = document.getElementById('bgm-battle');
        this.bgmBoss = document.getElementById('bgm-boss');
        this.seAttack = document.getElementById('se-attack');
        this.seCritical = document.getElementById('se-critical');
        this.seDamage = document.getElementById('se-damage');
        this.seDefeat = document.getElementById('se-defeat');
        this.seClear = document.getElementById('se-clear');
        this.seLastboss = document.getElementById('se-lastboss');
        this.seHeal = document.getElementById('se-heal');
        this.seMeat = document.getElementById('se-meat');
        this.seSap = document.getElementById('se-sap');
        this.seItem = document.getElementById('se-item');

        // Load sources
        this.bgmBattle.src = 'assets/audio/battle.mp3';
        this.bgmBoss.src = 'assets/audio/Bossbattle.mp3';
        this.seAttack.src = 'assets/audio/attack.mp3';
        this.seCritical.src = 'assets/audio/critical.mp3';
        this.seDamage.src = 'assets/audio/damage.mp3';
        this.seDefeat.src = 'assets/audio/defeat.mp3';
        this.seClear.src = 'assets/audio/clear.mp3';
        this.seLastboss.src = 'assets/audio/lastboss.mp3';
        this.seHeal.src = 'assets/audio/heal.mp3';
        this.seMeat.src = 'assets/audio/meat.mp3';
        this.seSap.src = 'assets/audio/sap.mp3';
        this.seItem.src = 'assets/audio/item.mp3';

        this.currentBgm = null;
        this.isPausedByVisibility = false;
        this._bindVisibilityChange();
    }

    _bindVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.currentBgm && !this.currentBgm.paused) {
                    this.currentBgm.pause();
                    this.isPausedByVisibility = true;
                }
            } else {
                if (this.isPausedByVisibility && this.currentBgm) {
                    this.currentBgm.play().catch(error => {
                        console.warn('BGM resume failed (Autoplay Policy):', error);
                    });
                }
                this.isPausedByVisibility = false;
            }
        });
    }

    playBgm(isBoss) {
        // Stop current if different
        const target = isBoss ? this.bgmBoss : this.bgmBattle;
        if (this.currentBgm && this.currentBgm !== target) {
            this.currentBgm.pause();
            this.currentBgm.currentTime = 0;
        }
        if (this.currentBgm !== target || target.paused) {
            this.currentBgm = target;
            this.currentBgm.volume = 0.5;
            this.currentBgm.play().catch(e => console.log('Audio play failed (user interact needed)', e));
        }
    }

    stopBgm() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm.currentTime = 0;
            this.currentBgm = null;
        }
        this.isPausedByVisibility = false;
    }

    playSe(type) {
        let se = null;
        switch (type) {
            case 'attack': se = this.seAttack; break;
            case 'critical': se = this.seCritical; break;
            case 'damage': se = this.seDamage; break;
            case 'defeat': se = this.seDefeat; break;
            case 'clear': se = this.seClear; break;
            case 'lastboss': se = this.seLastboss; break;
            case 'heal': se = this.seHeal; break;
            case 'meat': se = this.seMeat; break;
            case 'sap': se = this.seSap; break;
            case 'item': se = this.seItem; break;
        }
        if (se) {
            se.currentTime = 0;
            se.play().catch(() => { });
        }
    }
}

class MathProblem {
    constructor(leftDigits, rightDigits, operators) {
        this.leftDigits = parseInt(leftDigits);
        this.rightDigits = parseInt(rightDigits);
        this.operators = operators; // array of strings
        this.left = 0;
        this.right = 0;
        this.operator = '+';
        this.answer = 0;
    }

    _rand(digits) {
        if (digits === 1) return Math.floor(Math.random() * 9) + 1; // 1-9
        return Math.floor(Math.random() * 90) + 10; // 10-99
    }

    _generateDivision() {
        // Try to generate clean division
        for (let i = 0; i < 200; i++) {
            // Determine Constraints
            const leftMin = this.leftDigits === 1 ? 1 : 10;
            const leftMax = this.leftDigits === 1 ? 9 : 99;
            const rightMin = this.rightDigits === 1 ? 1 : 10;
            const rightMax = this.rightDigits === 1 ? 9 : 99;

            // Strategy: Pick Answer first, then Divisor, then check Dividend
            // Answer range: Must be >= 2 (user request)
            // Max possible answer = leftMax / rightMin
            const maxAnswer = Math.floor(leftMax / rightMin);

            if (maxAnswer < 2) {
                // Impossible to satisfy Left/Right constraints with Answer >= 2
                // Example: Left=1 (max 9), Right=2 (min 10) -> 9/10 < 1.
                // In this case, we must relax constraints or swap. 
                // Let's assume user wants valid division, so we swap implicitly or just return fallback for now?
                // Actually, if user sets Left=1, Right=2, they probably mean "Small / Big" which is < 1.
                // But this game is integer math. 
                // So we must assume they mean "Big / Small" regardless of UI order, OR
                // we strictly follow UI. If UI says Left=1, Right=2, it's impossible for integer result >= 1.
                // So we'll trigger fallback logic below.
                continue;
            }

            // Pick Answer
            // We want answer to be 2..maxAnswer, but cap at 99 (2 digits max)
            const effectiveMaxAnswer = Math.min(99, maxAnswer);
            const answer = Math.floor(Math.random() * (effectiveMaxAnswer - 1)) + 2;

            // Pick Divisor (Right)
            // Divisor must be in [rightMin, rightMax]
            // AND Divisor * Answer <= leftMax
            // So Divisor <= leftMax / answer
            const maxDivisor = Math.min(rightMax, Math.floor(leftMax / answer));

            if (maxDivisor < rightMin) continue; // No valid divisor found

            const divisor = Math.floor(Math.random() * (maxDivisor - rightMin + 1)) + rightMin;
            const dividend = divisor * answer;

            // Final check (Dividend must be >= leftMin)
            if (dividend >= leftMin) {
                return { left: dividend, right: divisor, answer: answer };
            }
        }

        // Fallback if strict constraints fail (e.g. Left=1, Right=2)
        // We will generate a valid "2-digit / 1-digit" or similar reasonable fallback
        // matching at least one constraint if possible.
        // If user set Left=2, Right=2, we should have found one (e.g. 90/45=2).
        // If we really can't, return a simple valid one.
        const fallbackLeft = this.leftDigits === 1 ? 8 : 24;
        const fallbackRight = this.rightDigits === 1 ? 2 : 12;
        // Ensure valid division
        if (fallbackLeft >= fallbackRight && fallbackLeft % fallbackRight === 0) {
            return { left: fallbackLeft, right: fallbackRight, answer: fallbackLeft / fallbackRight };
        }
        return { left: 6, right: 3, answer: 2 };
    }

    _checkDigits(num, digits) {
        if (digits === 1) return num >= 1 && num <= 9;
        if (digits === 2) return num >= 1 && num <= 99; // permissive 1-99 for "2 digits" setting
        return true;
    }

    generate() {
        this.operator = this.operators[Math.floor(Math.random() * this.operators.length)];

        if (this.operator === '/') {
            const div = this._generateDivision();
            this.left = div.left;
            this.right = div.right;
            this.answer = div.answer;
        } else {
            this.left = this._rand(this.leftDigits);
            this.right = this._rand(this.rightDigits);

            if (this.operator === '+') {
                this.answer = this.left + this.right;
            } else if (this.operator === '-') {
                if (this.left < this.right) {
                    [this.left, this.right] = [this.right, this.left];
                }
                this.answer = this.left - this.right;
            } else if (this.operator === '*') {
                this.answer = this.left * this.right;
            }
        }

        const opDisplay = { '+': '＋', '-': '－', '*': '×', '/': '÷' }[this.operator];
        this.displayText = `${this.left} ${opDisplay} ${this.right} ＝ `;
        return this.displayText;
    }

    check(val) {
        return parseInt(val) === this.answer;
    }
}

class Monster {
    constructor(number, isRare, isHeal, opCount, leftDigits, rightDigits) {
        this.number = number;
        this.isRare = isRare;
        this.isHeal = isHeal;
        this.opCount = opCount;
        this.leftDigits = leftDigits;
        this.rightDigits = rightDigits; // needed for boss06 check logic

        this.hasEatenMeat = false;
        this.hasLickedSap = false;
        this.hasTransformed = false;

        // Stats
        if (number <= 4) this.attackPower = 1;
        else if (number <= 7) this.attackPower = 2;
        else if (number <= 9) this.attackPower = 3;
        else if (number == 10) this.attackPower = 4;

        if (isRare || isHeal) this.maxHp = 1;
        else this.maxHp = number;

        this.hp = this.maxHp;
        this.name = this._getName();
        this.imageSrc = this._getImageSrc();
    }

    _getName() {
        if (this.isRare) return "レアモンスター";
        if (this.isHeal) return "回復モンスター";
        return `モンスター #${this.number}`;
    }

    /* 
       Simplified Image Logic for Web:
       Instead of file system search, we will try to construct likely paths.
       We should list the files we have (passed from agent data) into a const list or just try generic mapping.
       Since we didn't rename files, we have to support the existing naming schema.
       
       Hack: We will use a known list of files hardcoded here for simplicity and robustness in this specific generated code.
    */
    _getImageSrc() {
        // Helper to find match in a virtual list (simulated)
        // Since we cannot "browse" directory in JS, we must know filenames.
        // I will embed the filenames I saw earlier into a const list at the top of file later or here.
        // For now, let's assume we pass the file list to the Game class or global.

        // ... Logic to pick from global file list ...
        // We'll call a global helper: findMonsterImage(monsterInstance)
        return findMonsterImage(this);
    }

    get bossId() {
        if (this.number !== 10) return 0;

        // Based on Difficulty: Left Digits (1 or 2), Right Digits (1 or 2), Op Count (1-4)
        // Table Mapping:
        // L=1, R=1 -> Boss01-04
        // L=1, R=2 -> Boss05-08
        // L=2, R=1 -> Boss09-12
        // L=2, R=2 -> Boss13-16

        // Base Offset Calculation
        let base = 0;
        if (this.leftDigits === 1 && this.rightDigits === 1) base = 0;
        else if (this.leftDigits === 1 && this.rightDigits === 2) base = 4;
        else if (this.leftDigits === 2 && this.rightDigits === 1) base = 8;
        else if (this.leftDigits === 2 && this.rightDigits === 2) base = 12;

        // Add opCount (1-4)
        // If opCount exceeds 4, cap at 4? Or assume valid 1-4.
        const add = Math.min(4, Math.max(1, this.opCount));

        return base + add;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    get hpRatio() {
        return this.maxHp > 0 ? this.hp / this.maxHp : 0;
    }
}

/* Monster File List */
/* 
   We now use window.MONSTER_ASSETS (loaded from assets/monster_list.js) if available.
   Fallback to empty if not found (or handle gracefully).
*/

function getMonsterAssets() {
    return window.MONSTER_ASSETS || [];
}

function findMonsterImage(monster) {
    const assets = getMonsterAssets();
    if (assets.length === 0) return '';

    let candidates = [];

    if (monster.isRare) {
        candidates = assets.filter(f => f.toLowerCase().startsWith('rare_'));
    } else if (monster.isHeal) {
        candidates = assets.filter(f => f.toLowerCase().startsWith('heal_'));
    } else {
        // Try specific Boss prefix first if it's the boss stage (10)
        if (monster.number === 10) {
            let bossPrefix = `boss${String(monster.bossId).padStart(2, '0')}_`;
            candidates = assets.filter(f => f.toLowerCase().startsWith(bossPrefix.toLowerCase()));
        }

        // Fallback: If no boss-specific image found (or not a boss), try generic number prefix (e.g. "10_" or "01_")
        if (candidates.length === 0) {
            let prefix = String(monster.number).padStart(2, '0') + "_";
            candidates = assets.filter(f => f.startsWith(prefix));
        }
    }

    if (candidates.length === 0) return '';
    const choice = candidates[Math.floor(Math.random() * candidates.length)];

    // Update name from filename (Simple parsing: remove prefix, remove extension)
    // E.g. 01_もちもち.webp -> もちもち
    let name = choice.replace(/\.(webp|png|jpg|jpeg)$/i, '');
    // Remove prefixes
    name = name.replace(/^(rare_|heal_|boss\d+_|\d+_|lastboss_)/i, '');
    monster.name = name; // Update name in place

    return `assets/img/${choice}`;
}

function calculateTotalMonsters() {
    const assets = getMonsterAssets();
    let maxNum = 10; // default to 10 to be safe, or start at 0 and calculate

    if (assets.length > 0) {
        maxNum = 0;
        // Find highest number prefix (e.g. "12_...")
        const numbers = assets.map(f => {
            const match = f.match(/^(\d+)_/);
            return match ? parseInt(match[1]) : 0;
        });
        maxNum = Math.max(...numbers);

        // Check for Boss files (implies Stage 10 exists)
        const hasBoss = assets.some(f => f.toLowerCase().startsWith('boss'));
        if (hasBoss && maxNum < 10) {
            maxNum = 10;
        }

        // Final fallback if something is weird, though 0 is possible if no files.
        // But we want at least 10 if we fall back to existing behavior?
        // Actually if user deletes all files, game might break.
        // Let's ensure minimum 10 if we have the standard set.
        if (maxNum === 0) maxNum = 10;
    }
    return maxNum;
}


/* Main Game Class */
class Game {
    constructor() {
        this.sound = new SoundManager();
        this.state = GameState.SETUP;

        // Settings
        this.playerName = '';
        this.leftDigits = 1;
        this.rightDigits = 1;
        this.operators = ['+'];

        // Runtime
        this.playerHp = 10;
        this.monsters = [];
        this.currentMonsterIdx = 0;
        this.problem = null;
        this.timerStart = 0;
        this.timerIntervalId = null;
        this.defeatTimes = [];
        this.monsterBattleStart = 0;
        this.inputBuffer = "";

        this.rareBuff = false;
        this.hasSword = false;

        // Auto Scaling
        window.addEventListener('resize', () => this.adjustScale());
        this.adjustScale();

        this._bindEvents();
        this._updateTimerBar(1); // Reset
    }

    adjustScale() {
        const app = document.getElementById('app');
        const activeScreen = document.querySelector('.screen.active');

        if (!activeScreen) return;

        // Portrait Mode → Disable JS Scaling, Rely on CSS Sandwich Layout (dvh + flex)
        const isPortrait = window.innerHeight > window.innerWidth;

        if (isPortrait) {
            // Reset styles to allow CSS to take over
            app.style.transform = '';
            app.style.transformOrigin = '';
            app.style.width = '';
            app.style.height = '';

            // Add portrait class for specific overrides if needed
            app.classList.add('portrait-mode');
            app.classList.remove('landscape-mode');
            return;
        }

        // Landscape Mode - Keep existing Logic
        app.classList.add('landscape-mode');
        app.classList.remove('portrait-mode');

        // Reset to acquire natural size for calculation
        app.style.height = 'auto';
        app.style.width = '100%';
        app.style.transform = 'none';

        // Viewport
        const viewport = window.visualViewport;
        const winW = viewport ? viewport.width : window.innerWidth;
        const winH = viewport ? viewport.height : window.innerHeight;

        // Measure content
        let contentHeight = activeScreen.scrollHeight;
        const isSetup = activeScreen.id === 'setup-screen';
        const minSafeHeight = isSetup ? 600 : 800;
        const targetHeight = Math.max(minSafeHeight, contentHeight + 40);
        const contentWidth = app.offsetWidth;

        // Calculate Scale
        const scaleH = winH / targetHeight;
        const scaleW = winW / contentWidth;
        let scale = Math.min(scaleH, scaleW, 1.0);

        if (scale < 1.0) {
            app.style.transform = `scale(${scale})`;
            app.style.transformOrigin = 'top center';
            app.style.height = `${targetHeight}px`;
        } else {
            app.style.height = '100vh';
            app.style.transform = 'none';
        }
    }

    /* Event Binding */
    _bindEvents() {
        // Setup Toggles
        document.querySelectorAll('#left-digits-group .toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#left-digits-group .toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.leftDigits = parseInt(e.target.dataset.value);
            });
        });
        document.querySelectorAll('#right-digits-group .toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#right-digits-group .toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.rightDigits = parseInt(e.target.dataset.value);
            });
        });
        document.querySelectorAll('#operators-group .checkbox-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                this._updateOperators();
            });
        });

        // Start Game
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());

        // Interval Button
        document.getElementById('battle-start-btn').addEventListener('click', () => this.startBattle());

        // Restart
        document.getElementById('restart-btn').addEventListener('click', () => location.reload()); // Simple reload

        // Numpad
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this._handleInput(btn.dataset.key); });
            btn.addEventListener('click', (e) => this._handleInput(btn.dataset.key));
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            // Interval Screen (Fight Start)
            if (this.state === GameState.INTERVAL && e.key === 'Enter') {
                this.startBattle();
                return;
            }

            if (this.state !== GameState.BATTLE) return;
            if (e.key >= '0' && e.key <= '9') this._handleInput(e.key);
            if (e.key === 'Backspace') this._handleInput('DEL');
            if (e.key === 'Enter') this._handleInput('ENTER');
        });

        // Request Form
        document.getElementById('open-request-btn').addEventListener('click', () => {
            document.getElementById('request-overlay').classList.add('active');
        });
        document.getElementById('cancel-request-btn').addEventListener('click', () => {
            document.getElementById('request-overlay').classList.remove('active');
        });
        document.getElementById('submit-request-btn').addEventListener('click', () => this.submitRequest());
    }

    _updateOperators() {
        const active = Array.from(document.querySelectorAll('#operators-group .checkbox-btn.active')).map(b => b.dataset.op);
        this.operators = active;
    }

    /* Game Flow */
    startGame() {
        const nameInput = document.getElementById('player-name').value.trim();
        this.playerName = nameInput || 'ゆうしゃ';
        if (this.operators.length === 0) {
            alert('どの けいさんに するか えらんでね！');
            return;
        }

        // Init Player
        this.playerHp = CONSTANTS.PLAYER_MAX_HP;
        document.getElementById('player-name-display').textContent = this.playerName;
        this._updatePlayerHpUI();

        // Init Monsters
        this.monsters = [];
        const opCount = this.operators.length;
        for (let i = 1; i <= CONSTANTS.TOTAL_MONSTERS; i++) {
            let isRare = false;
            if (i !== CONSTANTS.TOTAL_MONSTERS) {
                isRare = Math.random() < 0.02;
            }
            const m = new Monster(i, isRare, false, opCount, this.leftDigits, this.rightDigits);
            this.monsters.push(m);
        }

        this.currentMonsterIdx = 0;
        this.rareBuff = false;
        this.hasSword = false;
        document.getElementById('sword-label').style.display = 'none';
        this.defeatTimes = [];

        // Switch Screen
        // 1体目の画像のロード完了後に登場画面を表示する
        // 画面遷移はロード完了後に行う
        this._startWithPreload();
    }

    async submitRequest() {
        const textEl = document.getElementById('request-text');
        const submitBtn = document.getElementById('submit-request-btn');
        const text = textEl.value.trim();

        if (!text) {
            return;
        }

        // Disable UI
        submitBtn.disabled = true;
        submitBtn.textContent = 'おくっています...';

        const formData = new FormData();
        formData.append(FORM_CONFIG.ENTRY_ID, text);

        try {
            await fetch(FORM_CONFIG.ACTION_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });

            // Success (no-cors means we assume success if no error)
            textEl.value = 'おくりました！ありがとう！';
            submitBtn.textContent = 'おくりました！';

            setTimeout(() => {
                document.getElementById('request-overlay').classList.remove('active');
                textEl.value = ''; // Reset
                submitBtn.disabled = false;
                submitBtn.textContent = 'おくる';
            }, 2000);

        } catch (e) {
            console.error(e);
            alert('おくれませんでした...');
            submitBtn.disabled = false;
            submitBtn.textContent = 'おくる';
        }
    }

    /**
     * 1体目のモンスター画像をプリロードし、完了したら登場画面を表示する。
     * その後、残りの画像をバックグラウンドで先読みする。
     */
    _startWithPreload() {
        const firstMonster = this.monsters[0];
        const firstSrc = firstMonster.imageSrc;

        const img = new Image();
        const onLoaded = () => {
            // 画面遷移
            document.getElementById('setup-screen').classList.remove('active');
            document.getElementById('battle-screen').classList.add('active');
            document.getElementById('stage-progress').innerHTML = '';

            this.sound.playBgm(false);
            this.state = GameState.INTERVAL;

            setTimeout(() => this.adjustScale(), 200);

            this.showInterval();
            // 1体目の表示後、残りをバックグラウンドでプリロード
            this._preloadRemainingImages();
        };

        img.onload = onLoaded;
        img.onerror = onLoaded; // 失敗しても画面は進める
        img.src = firstSrc;
    }

    /**
     * 2体目以降とボス変身後の画像をバックグラウンドでプリロードする。
     */
    _preloadRemainingImages() {
        const srcs = this.monsters.slice(1).map(m => m.imageSrc);
        // ボスの変身後画像も先読みしておく
        srcs.push('assets/img/Lastboss_しんのかみダイオウグソクナイト.webp');

        // 少し遅延させて1体目の表示を妨げない
        setTimeout(() => {
            srcs.forEach(src => {
                if (!src) return;
                const img = new Image();
                img.src = src;
            });
        }, 500);
    }

    showInterval() {
        this.state = GameState.INTERVAL;
        const m = this.monsters[this.currentMonsterIdx];

        // BGM Check (Boss or Normal)
        this.sound.playBgm(m.number === 10);

        // Fixed 3-line centered message format
        const msgEl = document.getElementById('interval-msg');
        msgEl.innerHTML = `${m.name}が<br>あらわれた！`;

        document.getElementById('interval-overlay').classList.add('active');

        // Preload Image
        const mImg = document.getElementById('monster-img');
        const iImg = document.getElementById('interval-monster-img');
        mImg.src = m.imageSrc;
        iImg.src = m.imageSrc;

        this._updateMonsterHpUI(m);
        document.getElementById('monster-name').textContent = m.name;
        this._updateStageProgressUI();
    }
    _updateStageProgressUI() {
        const container = document.getElementById('stage-progress');
        if (!container) return;

        // Create dots if empty (first run)
        if (container.children.length === 0) {
            for (let i = 0; i < CONSTANTS.TOTAL_MONSTERS; i++) {
                const dot = document.createElement('div');
                dot.className = 'stage-dot';
                // Boss marker
                if (i === CONSTANTS.TOTAL_MONSTERS - 1) {
                    dot.classList.add('boss');
                }
                container.appendChild(dot);
            }
        }

        // Update states
        const dots = container.querySelectorAll('.stage-dot');
        dots.forEach((dot, index) => {
            const m = this.monsters[index];

            // Reset classes (keep base and boss)
            dot.className = 'stage-dot';
            if (index === CONSTANTS.TOTAL_MONSTERS - 1) dot.classList.add('boss');

            // Status classes
            if (index < this.currentMonsterIdx) {
                dot.classList.add('cleared');
                // Type classes only shown AFTER battle (cleared)
                if (m.isRare) dot.classList.add('rare');
                if (m.isHeal) dot.classList.add('heal');
            } else if (index === this.currentMonsterIdx) {
                dot.classList.add('current');
            }
            // Future monsters: stay as default white dot (no type class)
        });
    }
    startBattle() {
        document.getElementById('interval-overlay').classList.remove('active');
        this.state = GameState.BATTLE;

        this.problem = new MathProblem(this.leftDigits, this.rightDigits, this.operators);
        this.monsterBattleStart = Date.now(); // reset on defeat, accumulate? No, standard is per monster total time.
        // Wait, requirements said "defeat time per monster".
        // If we fail a question, time continues? spec says 'no penalty on time, problem continues'.

        this.nextProblem();
    }

    nextProblem() {
        this.problem.generate();
        this.inputBuffer = "";
        this._updateInputUI();

        // Timer Reset
        this.timerStart = Date.now();
        if (this.timerIntervalId) clearInterval(this.timerIntervalId);
        this.timerIntervalId = setInterval(() => this._timerLoop(), 100);
        this._timerLoop(); // immediate update
    }

    _timerLoop() {
        if (this.state !== GameState.BATTLE) return;
        const elapsed = (Date.now() - this.timerStart) / 1000;
        const remaining = Math.max(0, CONSTANTS.TIMER_SECONDS - elapsed);
        const ratio = remaining / CONSTANTS.TIMER_SECONDS;
        this._updateTimerBar(ratio);
    }

    _handleInput(key) {
        if (this.state !== GameState.BATTLE) return;

        if (key === 'DEL') {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        } else if (key === 'ENTER') {
            this._submitAnswer();
        } else {
            if (this.inputBuffer.length < 6) {
                this.inputBuffer += key;
            }
        }
        this._updateInputUI();
    }

    _updateInputUI() {
        document.getElementById('answer-input').value = this.inputBuffer;
        // Render single-line problem: 12＋5＝[answer]
        const problemEl = document.getElementById('problem-text');
        const displayText = this.problem.displayText || '';
        const answerVal = this.inputBuffer || '';
        const isEmpty = answerVal === '';
        problemEl.innerHTML = `<span class="problem-part">${displayText}</span><span class="answer-part${isEmpty ? ' empty' : ''}">${answerVal}</span>`;

        // Auto-shrink font if content overflows (prevent 2-line wrapping)
        problemEl.style.fontSize = '';  // reset to CSS default
        const maxWidth = problemEl.parentElement.clientWidth;
        let currentSize = parseFloat(getComputedStyle(problemEl).fontSize);
        const minSize = 14;  // minimum font size in px
        while (problemEl.scrollWidth > maxWidth && currentSize > minSize) {
            currentSize -= 2;
            problemEl.style.fontSize = currentSize + 'px';
        }
    }
    _submitAnswer() {
        if (!this.inputBuffer) return;

        const ans = parseInt(this.inputBuffer);
        if (isNaN(ans)) {
            this.inputBuffer = "";
            this._updateInputUI();
            return;
        }

        const isCorrect = this.problem.check(this.inputBuffer);
        const elapsed = (Date.now() - this.timerStart) / 1000;
        this.inputBuffer = "";
        this._updateInputUI();

        // Stop timer visually for a moment? No, keep it running or reset immediately?
        // Spec: "Remaining time < 0, Problem continues".

        if (isCorrect) {
            this._onCorrect(elapsed);
        } else {
            this._onWrong();
        }
    }

    _onCorrect(elapsed) {
        const isCrit = elapsed <= CONSTANTS.CRITICAL_THRESHOLD;
        let damage = isCrit ? CONSTANTS.CRITICAL_DAMAGE : CONSTANTS.NORMAL_DAMAGE;
        if (this.rareBuff) damage *= 2;
        if (this.hasSword) damage += 1;

        const m = this.monsters[this.currentMonsterIdx];
        m.takeDamage(damage);
        this._updateMonsterHpUI(m);

        // VFX
        this._flashScreen();
        this._showMessage(isCrit ? `クリティカル！
${damage}ダメージ！` : `${this.playerName}のこうげき！
${damage}ダメージ！`, isCrit);
        this.sound.playSe(isCrit ? 'critical' : 'attack');

        if (m.hp <= 0) {
            // Defeated: Block input and stop timer immediately
            this.state = GameState.TRANSITION;
            clearInterval(this.timerIntervalId);

            // Show damage message first, then defeat sequence
            setTimeout(() => {
                this._onMonsterDefeated(m);
            }, 1500);
        } else {
            // Boss Logic Check
            if (this._checkBossEvents(m)) {
                // Event triggered, delay next problem (increased to 3s for user to see boss msg)
                setTimeout(() => this.nextProblem(), 3000);
            } else {
                setTimeout(() => this.nextProblem(), 1000); // delay increased to 1s for better pacing
            }
        }
    }

    _onWrong() {
        const m = this.monsters[this.currentMonsterIdx];
        const damage = m.attackPower;

        this.playerHp = Math.max(0, this.playerHp - damage);
        this._updatePlayerHpUI();

        this._shakeScreen();
        this._showMessage(`ミス！
${damage}ダメージうけた！`, false, 1500, 'damage');
        this.sound.playSe('damage');

        if (this.playerHp <= 0) {
            this._onGameOver();
        }
    }

    _checkBossEvents(m) {
        // Boss 16 Transform (was Boss 06)
        if (m.bossId === 16 && m.hp <= 4 && !m.hasTransformed) {
            m.hasTransformed = true;
            m.maxHp = 20; // Update maxHp for gauge scaling
            m.hp = 20; // HP buffed to 20
            m.attackPower = 10; // Hard!
            m.imageSrc = 'assets/img/Lastboss_しんのかみダイオウグソクナイト.webp'; // Direct hardcode path
            document.getElementById('monster-img').src = m.imageSrc;
            m.name = "しんのかみ";
            document.getElementById('monster-name').textContent = m.name;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが しんの すがたを かいほうした！", true, 3000);
            this.sound.playSe('lastboss'); // New SE
            return true;
        }
        // Boss 16 Sap (was Boss 06)
        if (m.bossId === 16 && m.hp <= 6 && !m.hasLickedSap) {
            m.hasLickedSap = true;
            m.hp = 10;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが じゅえきを なめた！(HP全回復)", false, 3000);
            this.sound.playSe('sap'); // New SE
            return true;
        }
        // Boss 15 Meat (was Boss 05)
        if (m.bossId === 15 && m.hp < 5 && !m.hasEatenMeat) {
            m.hasEatenMeat = true;
            m.hp = 10;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが にくを たべた！(HP全回復)", false, 3000);
            this.sound.playSe('meat'); // New SE
            return true;
        }
        return false;
    }

    _onMonsterDefeated(m) {
        clearInterval(this.timerIntervalId);
        this.state = GameState.TRANSITION; // Block input

        // Clear problem and input
        // document.getElementById('problem-text').innerHTML = ""; // Don't clear problem text on defeat
        this.inputBuffer = "";
        document.getElementById('answer-input').value = "";

        const totalTime = (Date.now() - this.monsterBattleStart) / 1000;
        this.defeatTimes.push({
            time: totalTime.toFixed(1),
            name: m.name,
            imageSrc: m.imageSrc // Store image for result screen
        });

        this.sound.playSe('defeat');
        this._showMessage(`${m.name}
をたおした！`);

        // Fade out
        document.getElementById('monster-img').style.opacity = '0';

        // Bonuses
        if (m.isRare) {
            this.rareBuff = true;
            setTimeout(() => this._showMessage("こうげきりょくが あがった！", false, 2500), 1000);
        }
        if (m.isHeal) {
            this.playerHp = CONSTANTS.PLAYER_MAX_HP;
            this._updatePlayerHpUI();
            this.sound.playSe('heal'); // New SE
            setTimeout(() => this._showMessage("HPが ぜんかいふくした！", false, 2500), 1000);
        }

        // Sword Drop Event (1/10 chance, monsters 1-9, not Rare/Heal, once per battle)
        const canDropSword = !this.hasSword && !m.isRare && !m.isHeal && m.number >= 1 && m.number <= 9;
        if (canDropSword && Math.random() < 0.1) {
            // Sword drop sequence
            setTimeout(() => {
                // Show sword image in monster container
                const monsterContainer = document.querySelector('.monster-container');
                const swordImg = document.createElement('img');
                swordImg.src = 'assets/otherimg/sword.webp';
                swordImg.className = 'sword-drop-img';
                monsterContainer.appendChild(swordImg);

                // Play item SE
                this.sound.playSe('item');

                // Show "obtained" message
                this._showMessage("はがねのけんを\nてにいれた！", false, 4500);

                // After 2 seconds, show "equipped" message
                setTimeout(() => {
                    this.hasSword = true;
                    this._showMessage("はがねのけんを\nそうびした！", false, 2000);

                    // Show sword label under player name
                    document.getElementById('sword-label').style.display = 'block';

                    // Remove sword image and proceed after 2 more seconds
                    setTimeout(() => {
                        swordImg.remove();
                        this._nextMonster();
                    }, 2000);
                }, 2000);
            }, 1500); // Start after defeat message
            return; // Don't proceed to normal _nextMonster timeout
        }

        setTimeout(() => {
            this._nextMonster();
        }, 3000);
    }

    _nextMonster() {
        this.currentMonsterIdx++;
        if (this.currentMonsterIdx >= CONSTANTS.TOTAL_MONSTERS) {
            this._onGameClear();
            return;
        }

        // Heal Opportunity Logic (from python code)
        // If HP <= half, not rare, not boss(10), 10% chance -> Heal Monster
        const nextM = this.monsters[this.currentMonsterIdx];
        if (this.playerHp / CONSTANTS.PLAYER_MAX_HP <= 0.5 && !nextM.isRare && nextM.number !== 10) {
            if (Math.random() < 0.1) {
                // convert to heal
                const newM = new Monster(nextM.number, false, true, nextM.opCount, nextM.leftDigits, nextM.rightDigits);
                this.monsters[this.currentMonsterIdx] = newM;
            }
        }

        document.getElementById('monster-img').style.opacity = '1'; // Reset fade
        this.showInterval();
    }

    _onGameOver() {
        clearInterval(this.timerIntervalId);
        this.state = GameState.GAME_OVER;
        this.sound.stopBgm();
        this._showMessage("ゲームオーバー...", true);
        setTimeout(() => {
            alert("ゲームオーバー！ つぎはまけないぞ！");
            location.reload();
        }, 2000);
    }

    _onGameClear() {
        this.state = GameState.RESULT;
        this.sound.stopBgm();
        this.sound.playSe('clear');

        // Show result screen
        document.getElementById('battle-screen').classList.remove('active');
        document.getElementById('result-screen').classList.add('active');

        // Adjust scale for result screen content
        this.adjustScale();

        const list = document.getElementById('time-list');
        list.innerHTML = '';

        // Calculate Total
        const times = this.defeatTimes.map(item => parseFloat(item.time));
        const totalTime = times.reduce((a, b) => a + b, 0).toFixed(1);
        document.getElementById('total-time-display').textContent = `${totalTime}秒`;

        // Display Settings
        const opDisplay = this.operators.map(op => {
            return { '+': '＋', '-': '－', '*': '×', '/': '÷' }[op];
        }).join(' ');
        const settingsText = `ひだり:${this.leftDigits}けた  みぎ:${this.rightDigits}けた  (${opDisplay})`;
        document.getElementById('result-settings-text').textContent = settingsText;

        // Find Min/Max for highlighting
        // Note: multiple items can be min or max
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        this.defeatTimes.forEach((item, i) => {
            const val = parseFloat(item.time);
            const li = document.createElement('li');
            li.className = 'result-card'; // Add class for styling

            let timeClass = 'result-time';
            if (val === minTime) timeClass += ' time-fastest';
            else if (val === maxTime) timeClass += ' time-slowest';

            // Construct Inner HTML with Image
            li.innerHTML = `
                <div class="result-img-container" data-src="${item.imageSrc}" data-name="${item.name}">
                    <img src="${item.imageSrc}" class="result-img" alt="${item.name}" loading="lazy">
                </div>
                <div class="result-info">
                    <span class="result-name">${item.name}</span>
                    <span class="${timeClass}">${item.time}秒</span>
                </div>
            `;
            list.appendChild(li);

            // Click event for zoom
            // Bind to the whole card (li) for better UX
            li.addEventListener('click', (e) => {
                const src = item.imageSrc; // Use item directly instead of DOM read
                const name = item.name;
                this._openImageModal(src, name);
            });
        });
    }

    _openImageModal(src, name) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('image-modal-img');
        const captionText = document.getElementById('caption');
        modal.classList.add('active');
        modalImg.src = src;
        captionText.innerHTML = name;
    }

    /* UI Helpers */
    _updatePlayerHpUI() {
        const bar = document.getElementById('player-hp-bar');
        const text = document.getElementById('player-hp-text');
        const ratio = this.playerHp / CONSTANTS.PLAYER_MAX_HP;

        bar.style.width = `${ratio * 100}%`;
        bar.style.backgroundColor = ratio > 0.3 ? 'var(--success-color)' : 'var(--danger-color)';
        text.textContent = `HP ${this.playerHp}/${CONSTANTS.PLAYER_MAX_HP}`;
    }

    _updateMonsterHpUI(m) {
        const bar = document.getElementById('monster-hp-bar');
        const ratio = m.hpRatio;
        bar.style.width = `${ratio * 100}%`;
    }

    _updateTimerBar(ratio) {
        const bar = document.getElementById('timer-bar');
        bar.style.width = `${ratio * 100}%`;
        if (ratio > 0.7) bar.style.backgroundColor = 'var(--success-color)';
        else if (ratio > 0.3) bar.style.backgroundColor = 'var(--accent-color)';
        else bar.style.backgroundColor = 'var(--danger-color)';
    }

    _flashScreen() {
        const monsterImg = document.getElementById('monster-img');
        monsterImg.classList.remove('flash-effect');
        void monsterImg.offsetWidth; // trigger reflow
        monsterImg.classList.add('flash-effect');
    }

    _shakeScreen() {
        const target = document.querySelector('.screen.active');
        if (!target) return;

        target.classList.remove('shake-effect');
        void target.offsetWidth;
        target.classList.add('shake-effect');
    }

    _showMessage(text, isCrit = false, duration = 1500, extraClass = null) {
        const ov = document.getElementById('message-overlay');
        ov.textContent = text;
        ov.classList.remove('show', 'critical', 'damage');
        if (isCrit) ov.classList.add('critical');
        if (extraClass) ov.classList.add(extraClass);

        void ov.offsetWidth;
        ov.classList.add('show');

        // Auto hide after specified duration
        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            ov.classList.remove('show');
        }, duration);
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    // Dynamic Monster Count
    if (typeof calculateTotalMonsters === 'function') {
        CONSTANTS.TOTAL_MONSTERS = calculateTotalMonsters();
        console.log("Total Monsters set to:", CONSTANTS.TOTAL_MONSTERS);
    }
    new Game();

    // Modal Close Event
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
});
