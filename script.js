/* Game Constants */
const CONSTANTS = {
    PLAYER_MAX_HP: 10,
    TOTAL_MONSTERS: 10,
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

        // Load sources
        this.bgmBattle.src = 'assets/audio/battle.mp3';
        this.bgmBoss.src = 'assets/audio/Bossbattle.mp3';
        this.seAttack.src = 'assets/audio/attack.wav';
        this.seCritical.src = 'assets/audio/critical.wav';
        this.seDamage.src = 'assets/audio/damage.wav';
        this.seDefeat.src = 'assets/audio/defeat.wav';
        this.seClear.src = 'assets/audio/clear.wav';

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
            const right = this._rand(this.rightDigits);
            const answer = this._rand(1); // Answer is 1 digit
            const left = right * answer;

            // Check left digits constraint
            if (this.leftDigits === 1 && (left < 1 || left > 9)) continue;
            if (this.leftDigits === 2 && (left < 10 || left > 99)) {
                // Relaxed: 1-99 allow if 2 digit requested? No strict to 10-99 usually
                if (left < 1 || left > 99) continue;
            }
            return { left, right, answer };
        }
        return { left: 6, right: 3, answer: 2 }; // Fallback
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

    get isBoss05() {
        return this.number === 10 && this.opCount === 4 && this.leftDigits === 2 && !this.isBoss06;
    }

    get isBoss06() {
        return this.number === 10 && this.opCount === 4 && this.leftDigits === 2 && this.rightDigits === 2;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    get hpRatio() {
        return this.maxHp > 0 ? this.hp / this.maxHp : 0;
    }
}

/* Monster File List (From previous list_dir) */
const MONSTER_FILES = [
    "01_うんちぼうや.webp", "01_ざっそうだま.webp", "01_もちもち.webp",
    "02_いもむしくん.webp", "02_こにゃんにゃん.webp", "02_びくびくねずみ.webp",
    "03_もえろう.webp", "03_わんこぞう.webp", "03_オレンジュー.webp",
    "04_おばけん.webp", "04_カメゴンス.webp", "04_カルボーン.webp",
    "05_ちょうちょふじん.webp", "05_もふもふがふじん.webp",
    "06_あんさつかまきり.webp", "06_はちのじょおう.webp", "06_ばさばさどり.webp",
    "07_あかとげがに.webp", "07_くませんし.webp", "07_ラフレッシア.webp",
    "08_ガブドリア.webp", "08_ブラックタイガー.webp", "08_プテライリュウ.webp",
    "09_おばけむかで.webp", "09_ドラゴーン.webp", "09_ペラペラポトス.webp",
    "Boss01_よるをしはいするもの.webp", "Boss02_いかりのドラゴーン.webp", "Boss03_はかいのマシーン.webp",
    "Boss04_インセクトキング.webp", "Boss05_ぼうくんティラノザウルス.webp", "Boss06_こうてつカブトサムライ.webp",
    "Heal_かいふくぐさ.webp", "Heal_ペロキャン.webp", "Lastboss_しんのかみダイオウグソクナイト.webp",
    "Rare_ダイアゴーレム.webp", "Rare_宝箱.webp"
];

function findMonsterImage(monster) {
    let candidates = [];

    if (monster.isRare) {
        candidates = MONSTER_FILES.filter(f => f.toLowerCase().startsWith('rare_'));
    } else if (monster.isHeal) {
        candidates = MONSTER_FILES.filter(f => f.toLowerCase().startsWith('heal_'));
    } else if (monster.number === 10) {
        // Boss Logic
        let prefix = `boss${String(monster.opCount).padStart(2, '0')}_`;
        if (monster.isBoss06) prefix = "boss06_";
        else if (monster.isBoss05) prefix = "boss05_";

        // 1. Exact match boss prefix
        candidates = MONSTER_FILES.filter(f => f.toLowerCase().startsWith(prefix.toLowerCase()));
    } else {
        // Normal
        let prefix = String(monster.number).padStart(2, '0');
        candidates = MONSTER_FILES.filter(f => f.startsWith(prefix));
    }

    if (candidates.length === 0) return ''; // fallback?
    const choice = candidates[Math.floor(Math.random() * candidates.length)];

    // Update name from filename (Simple parsing: remove prefix, remove extension)
    // E.g. 01_もちもち.webp -> もちもち
    let name = choice.replace('.webp', '');
    // Remove prefixes
    name = name.replace(/^(rare_|heal_|boss\d+_|\d+_|lastboss_)/i, '');
    monster.name = name; // Update name in place

    return `assets/img/${choice}`;
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
        // Base logic: Ensure content fits in height.
        // Assumed safe design height ~750px (Title + Setup inputs)
        const minHeight = 750;
        const winH = window.innerHeight;
        const app = document.getElementById('app');

        if (winH < minHeight) {
            const scale = winH / minHeight;
            app.style.transform = `scale(${scale})`;
            app.style.transformOrigin = 'top center';
            // Adjust height to occupy full space visually even when scaled
            app.style.height = `${minHeight}px`;
        } else {
            app.style.transform = 'none';
            app.style.height = '100vh';
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
            alert('演算子を少なくとも1つ選んでください');
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

        this.sound.playBgm(false);
        this.showInterval();
    }

    showInterval() {
        this.state = GameState.INTERVAL;
        const m = this.monsters[this.currentMonsterIdx];

        // BGM Check (Boss or Normal)
        this.sound.playBgm(m.number === 10);

        let msg = "";
        if (m.isRare) msg = "珍しいモンスターだ！";
        else if (m.isHeal) msg = "回復のチャンスだ！";
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
                // Event triggered, delay next problem
                setTimeout(() => this.nextProblem(), 2000);
            } else {
                setTimeout(() => this.nextProblem(), 500); // slight delay to see msg
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
        // Boss 6 Transform
        if (m.isBoss06 && m.hp <= 4 && !m.hasTransformed) {
            m.hasTransformed = true;
            m.hp = 10;
            m.attackPower = 10; // Hard!
            m.imageSrc = 'assets/img/Lastboss_しんのかみダイオウグソクナイト.webp'; // Direct hardcode path
            document.getElementById('monster-img').src = m.imageSrc;
            m.name = "しんのかみ";
            document.getElementById('monster-name').textContent = m.name;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが真の姿を解放した！", true);
            this.sound.playSe('critical');
            return true;
        }
        // Boss 6 Sap
        if (m.isBoss06 && m.hp <= 6 && !m.hasLickedSap) {
            m.hasLickedSap = true;
            m.hp = 10;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが樹液を舐めた！(HP全回復)", false);
            return true;
        }
        // Boss 5 Meat
        if (m.isBoss05 && m.hp < 5 && !m.hasEatenMeat) {
            m.hasEatenMeat = true;
            m.hp = 10;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが肉を食べた！(HP全回復)", false);
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
        this.defeatTimes.push(totalTime.toFixed(1));

        this.sound.playSe('defeat');
        this._showMessage(`${m.name} をたおした！`);

        // Fade out
        document.getElementById('monster-img').style.opacity = '0';

        // Bonuses
        if (m.isRare) {
            this.rareBuff = true;
            setTimeout(() => this._showMessage("攻撃力が上がった！"), 1000);
        }
        if (m.isHeal) {
            this.playerHp = CONSTANTS.PLAYER_MAX_HP;
            this._updatePlayerHpUI();
            setTimeout(() => this._showMessage("HPが全回復した！"), 1000);
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
            alert("ゲームオーバー！ タイトルに戻ります。");
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

        const list = document.getElementById('time-list');
        list.innerHTML = '';
        this.defeatTimes.forEach((t, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>モンスター ${i + 1}</span><span>${t}秒</span>`;
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

    _showMessage(text, isCrit = false) {
        const ov = document.getElementById('message-overlay');
        ov.textContent = text;
        ov.classList.remove('show', 'critical');
        if (isCrit) ov.classList.add('critical');

        void ov.offsetWidth;
        ov.classList.add('show');

        // Auto hide after 1.5s
        setTimeout(() => {
            ov.classList.remove('show');
        }, 1500);
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
