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

        this.currentBgm = null;
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
            // Determine "Divisor" digits (usually smaller) and "Dividend" digits (larger)
            // But we respect the settings as "one is X digits, one is Y digits".
            // We want Dividend / Divisor = Answer.
            // Dividend effectively needs more digits.

            const digitsA = this.leftDigits;
            const digitsB = this.rightDigits;

            // Allow flexibility: Try to use one for divisor, check result for dividend
            // We'll vary which one we use for divisor to cover different problem types?
            // Actually, simpler: Divisor uses Min(digits), Dividend uses Max(digits) often.
            // But if digits equal, doesn't matter.

            // Randomly pick which setting to use for Divisor (usually the smaller one makes sense)
            // If we use the larger one for divisor, the dividend becomes huge (3 digits), might exceed constraints.

            const divisorDigits = Math.min(digitsA, digitsB);
            const expectedDividendDigits = Math.max(digitsA, digitsB);

            const divisor = this._rand(divisorDigits);
            const answer = this._rand(1); // Keep answer simple (1 digit) for now as per original logic? 
            // Original code: answer = this._rand(1);

            const dividend = divisor * answer;

            // Now, check if this problem {dividend, divisor} fits the settings {left, right}
            // in EITHER order (Straight or Swapped).

            // Case 1: Left=Dividend, Right=Divisor
            if (this._checkDigits(dividend, this.leftDigits) && this._checkDigits(divisor, this.rightDigits)) {
                return { left: dividend, right: divisor, answer: answer };
            }

            // Case 2: Left=Divisor, Right=Dividend (Swap visual) -> Not typical for division "Small / Big"
            // Wait, division is usually Big / Small. 
            // If User set Left=1, Right=2, they probably want "2-digit / 1-digit" physically.
            // So we should return Left=Dividend (2-digit), Right=Divisor (1-digit).
            // But the settings says Left=1. 
            // The "Subtraction Logic" implies: If setting is 1 and 2, and we can only make 2/1, then FORCE Left to be 2-digit.
            // effectively ignoring "Left=1" constraint for the Dividend position.

            // So recursion:
            // If I found Dividend (2-digit) and Divisor (1-digit)...
            // And settings are Left=1, Right=2.
            // I should return Left=Dividend, Right=Divisor.

            if (this._checkDigits(dividend, Math.max(this.leftDigits, this.rightDigits)) &&
                this._checkDigits(divisor, Math.min(this.leftDigits, this.rightDigits))) {
                return { left: dividend, right: divisor, answer: answer };
            }
        }
        return { left: 6, right: 3, answer: 2 }; // Fallback
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
        return `${this.left} ${opDisplay} ${this.right} ＝ ？`;
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

        // リセットして自然なサイズとレイアウトフローを取得
        app.style.height = 'auto';
        app.style.width = '100%';
        app.style.transform = 'none';

        // Viewportの取得 (visualViewport API推奨: キーボードやバーの影響を正確に取得)
        const viewport = window.visualViewport;
        const winW = viewport ? viewport.width : window.innerWidth;
        const winH = viewport ? viewport.height : window.innerHeight;

        // コンテンツの実際の高さを計測
        // スクロール可能な高さ(scrollHeight)を基準にするが、
        // 画面切り替え直後はレイアウトが安定していない場合があるため、最低保証値を設定
        let contentHeight = activeScreen.scrollHeight;

        // セットアップ画面と戦闘画面で最低高さを少し変える（UX調整）
        const isSetup = activeScreen.id === 'setup-screen';
        const minSafeHeight = isSetup ? 600 : 800; // 最低でも確保したい高さ
        const targetHeight = Math.max(minSafeHeight, contentHeight + 40); // +40px padding

        // コンテンツ幅（通常は画面幅あるいはmax-width: 500px）
        const contentWidth = app.offsetWidth;

        // スケール比率の計算
        // 1. 縦方向: 画面高さ / コンテンツ高さ
        const scaleH = winH / targetHeight;
        // 2. 横方向: 画面幅 / コンテンツ幅
        const scaleW = winW / contentWidth;

        // 縦横どちらかがはみ出す場合、小さいほうの比率に合わせて全体を縮小
        // ただし、拡大(>1.0)はしない（画質劣化防止・レイアウト維持のため）
        let scale = Math.min(scaleH, scaleW, 1.0);

        if (scale < 1.0) {
            app.style.transform = `scale(${scale})`;
            app.style.transformOrigin = 'top center';
            // スケール適用時、appの高さは「縮小前の高さ」に固定し、
            // 視覚的に縮小されて画面にフィットするようにする
            app.style.height = `${targetHeight}px`;
        } else {
            // スケール不要な場合は通常通り画面いっぱいに
            app.style.height = '100vh';
            app.style.transform = 'none';
        }

        // デバッグ用ログ (必要なければ削除)
        // console.log(`AdjustScale: W=${winW}, H=${winH}, TgtH=${targetHeight}, Scale=${scale}`);
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
        this.defeatTimes = [];

        // Switch Screen
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('battle-screen').classList.add('active');

        // Clear previous progress
        document.getElementById('stage-progress').innerHTML = '';

        this.sound.playBgm(false);
        this.showInterval();

        // Adjust scale for Battle Screen (uses default minHeight)
        this.state = GameState.INTERVAL; // showInterval sets this, but let's be safe
        // レイアウト確定後に計測するため少し遅延
        setTimeout(() => this.adjustScale(), 200);
    }

    showInterval() {
        this.state = GameState.INTERVAL;
        const m = this.monsters[this.currentMonsterIdx];

        // BGM Check (Boss or Normal)
        this.sound.playBgm(m.number === 10);

        let msg = "";
        if (m.isRare) msg = "レアモンスターだ！";
        else if (m.isHeal) msg = "かいふくの チャンスだ！";
        else msg = `${m.name} が あらわれた！`;

        document.getElementById('interval-msg').textContent = msg;
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

            // Type classes
            if (m.isRare) dot.classList.add('rare');
            if (m.isHeal) dot.classList.add('heal');

            // Status classes
            if (index < this.currentMonsterIdx) {
                dot.classList.add('cleared');
            } else if (index === this.currentMonsterIdx) {
                dot.classList.add('current');
            }
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
        const text = this.problem.generate();
        document.getElementById('problem-text').textContent = text;
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

        const m = this.monsters[this.currentMonsterIdx];
        m.takeDamage(damage);
        this._updateMonsterHpUI(m);

        // VFX
        this._flashScreen();
        this._showMessage(isCrit ? `クリティカル！ ${damage}ダメージ！` : `${this.playerName}のこうげき！ ${damage}ダメージ！`, isCrit);
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
        this._showMessage(`ミス！ ${damage}ダメージうけた！`);
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
        document.getElementById('problem-text').textContent = "";
        this.inputBuffer = "";
        this._updateInputUI();

        const totalTime = (Date.now() - this.monsterBattleStart) / 1000;
        this.defeatTimes.push({
            time: totalTime.toFixed(1),
            name: m.name,
            imageSrc: m.imageSrc // Store image for result screen
        });

        this.sound.playSe('defeat');
        this._showMessage(`${m.name} をたおした！`);

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
                <div class="result-img-container">
                    <img src="${item.imageSrc}" class="result-img" alt="${item.name}" loading="lazy">
                </div>
                <div class="result-info">
                    <span class="result-name">${item.name}</span>
                    <span class="${timeClass}">${item.time}秒</span>
                </div>
            `;
            list.appendChild(li);
        });
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
        const app = document.getElementById('app');
        app.classList.remove('shake-effect');
        void app.offsetWidth;
        app.classList.add('shake-effect');
    }

    _showMessage(text, isCrit = false, duration = 1500) {
        const ov = document.getElementById('message-overlay');
        ov.textContent = text;
        ov.classList.remove('show', 'critical');
        if (isCrit) ov.classList.add('critical');

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
});
