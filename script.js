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
    } else if (monster.number === 10) {
        // Boss Logic
        let prefix = `boss${String(monster.opCount).padStart(2, '0')}_`;
        if (monster.isBoss06) prefix = "boss06_";
        else if (monster.isBoss05) prefix = "boss05_";

        // 1. Exact match boss prefix
        candidates = assets.filter(f => f.toLowerCase().startsWith(prefix.toLowerCase()));
    } else {
        // Normal
        let prefix = String(monster.number).padStart(2, '0') + "_";
        candidates = assets.filter(f => f.startsWith(prefix));
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

        // Reset to measure natural height
        app.style.height = 'auto';
        app.style.transform = 'none';

        // Measure content
        // Math.max(1000, ...) ensures we don't zoom in too much on small content (like Battle screen)
        // keeping the "just right" feel the user liked.
        // We add a buffer (50px) to ensure margins aren't cut off.
        const contentHeight = activeScreen.scrollHeight;
        const targetHeight = Math.max(900, contentHeight + 50);

        const winH = window.innerHeight;

        if (winH < targetHeight) {
            const scale = winH / targetHeight;
            app.style.transform = `scale(${scale})`;
            app.style.transformOrigin = 'top center';
            // Force app height to match target so background fills covering scaling
            app.style.height = `${targetHeight}px`;
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

        // Adjust scale for Battle Screen (uses default minHeight)
        this.state = GameState.INTERVAL; // showInterval sets this, but let's be safe
        this.adjustScale();
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
        // Boss 6 Transform
        if (m.isBoss06 && m.hp <= 4 && !m.hasTransformed) {
            m.hasTransformed = true;
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
        // Boss 6 Sap
        if (m.isBoss06 && m.hp <= 6 && !m.hasLickedSap) {
            m.hasLickedSap = true;
            m.hp = 10;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが じゅえきを なめた！(HP全回復)", false, 3000);
            this.sound.playSe('sap'); // New SE
            return true;
        }
        // Boss 5 Meat
        if (m.isBoss05 && m.hp < 5 && !m.hasEatenMeat) {
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
        this.defeatTimes.push(totalTime.toFixed(1));

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
