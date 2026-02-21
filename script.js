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
    RESULT: 'result',
    NOTE: 'note' // Monster Note Screen
};

/* Item Data Tables */
const SWORD_DATA = [
    { name: 'ぼう', img: 'sword01.webp', bonus: 0 },
    { name: 'どうのつるぎ', img: 'sword02.webp', bonus: 1 },
    { name: 'てつのつるぎ', img: 'sword03.webp', bonus: 2 },
    { name: 'はがねのつるぎ', img: 'sword04.webp', bonus: 3 },
];

const SHIELD_DATA = [
    null, // level 0 = なし
    { name: 'きのたて', img: 'shield01.webp', reduction: 1, maxDurability: 1 },
    { name: 'どうのたて', img: 'shield02.webp', reduction: 2, maxDurability: 2 },
    { name: 'てつのたて', img: 'shield03.webp', reduction: 3, maxDurability: 3 },
    { name: 'はがねのたて', img: 'shield04.webp', reduction: 4, maxDurability: 4 },
];

// インデックス = 現在の所持レベル → 次レベルのドロップ率
const SWORD_DROP_RATE = [0.5, 0.25, 0.12, 0]; // swordLevel 0=ぼう→50%, 1→25%, 2→12%, 3=最強で抽選なし
const SHIELD_DROP_RATE = [0.3, 0.20, 0.10, 0.05, 0]; // shieldLevel 0=なし→30%, 1→20%, 2→10%, 3→5%, 4=最強で抽選なし

/* Assets Map (populated dynamically if needed, but here hardcoded matching existing files) */
/* Ideally we'd scan the dir, but in browser we explicitly map or guess. 
   We will rely on simple ID mapping logic since we kept original names.
*/

class SoundManager {
    constructor() {
        this.bgmBattle = document.getElementById('bgm-battle');
        this.bgmBoss = document.getElementById('bgm-boss');
        this.bgmRare = document.getElementById('bgm-rare');
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
        this.seSwordAttack = document.getElementById('se-swordattack');
        this.seSwordCritical = document.getElementById('se-swordcritical');
        this.seShieldDamage = document.getElementById('se-shielddamage');

        // Load sources
        this.bgmBattle.src = 'assets/audio/battle.mp3';
        this.bgmBoss.src = 'assets/audio/Bossbattle.mp3';
        this.bgmRare.src = 'assets/audio/Rarebattle.mp3';
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
        this.seSwordAttack.src = 'assets/audio/swordattack.mp3';
        this.seSwordCritical.src = 'assets/audio/swordcritical.mp3';
        this.seShieldDamage.src = 'assets/audio/shielddamage.mp3';

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

    playBgm(isBoss, isRare = false) {
        // Stop current if different
        let target = this.bgmBattle;
        if (isBoss) target = this.bgmBoss;
        else if (isRare) target = this.bgmRare;
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
            case 'swordattack': se = this.seSwordAttack; break;
            case 'swordcritical': se = this.seSwordCritical; break;
            case 'shielddamage': se = this.seShieldDamage; break;
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
            const rightMin = this.rightDigits === 1 ? 2 : 10;
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
        else if (number === 10) {
            const bId = this.bossId;
            if (bId >= 13) this.maxHp = 16;
            else if (bId >= 9) this.maxHp = 14;
            else if (bId >= 5) this.maxHp = 12;
            else this.maxHp = 10;
        }
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
        this.swordLevel = 0;
        this.shieldLevel = 0;
        this.shieldDurability = 0;

        // Auto Scaling
        window.addEventListener('resize', () => this.adjustScale());
        this.adjustScale();

        this._bindEvents();
        this._updateTimerBar(1); // Reset
    }

    adjustScale() {
        const app = document.getElementById('app');

        // Viewport
        const viewport = window.visualViewport;
        const winW = viewport ? viewport.width : window.innerWidth;
        const winH = viewport ? viewport.height : window.innerHeight;

        const isPortrait = winH > winW;

        // ターゲット仮想解像度
        const baseW = isPortrait ? 800 : 1200;
        const baseH = isPortrait ? 1600 : 800;

        if (isPortrait) {
            app.classList.add('portrait-mode');
            app.classList.remove('landscape-mode');
        } else {
            app.classList.add('landscape-mode');
            app.classList.remove('portrait-mode');
        }

        // Calculate Scale to fit
        const scale = Math.min(winW / baseW, winH / baseH);

        // Apply CSS
        app.style.width = baseW + 'px';
        app.style.height = baseH + 'px';
        app.style.position = 'absolute';
        app.style.left = '50%';
        app.style.top = '50%';
        app.style.transform = `translate(-50%, -50%) scale(${scale})`;
        app.style.transformOrigin = 'center center';
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

        // Phase 1: Monster Note
        document.getElementById('note-btn').addEventListener('click', () => {
            this.showNote();
        });
        document.getElementById('close-note-btn').addEventListener('click', () => {
            this.hideNote();
        });

        // Phase 2: Backup Feature (JSON)
        document.getElementById('save-backup-btn').addEventListener('click', () => this.saveBackup());
        document.getElementById('load-backup-btn').addEventListener('click', () => this.loadBackup());

        // Note Warning
        document.getElementById('note-warning-btn').addEventListener('click', () => {
            document.getElementById('note-warning-modal').classList.add('active');
        });
        document.getElementById('close-note-warning-modal').addEventListener('click', () => {
            document.getElementById('note-warning-modal').classList.remove('active');
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
        this.swordLevel = 0; // ぼうを最初から持つ
        this.shieldLevel = 0;
        this.shieldDurability = 0;
        const swordLabelEl = document.getElementById('sword-label');
        swordLabelEl.src = 'assets/otherimg/' + SWORD_DATA[0].img;
        swordLabelEl.style.display = 'inline-block';
        document.getElementById('shield-label').style.display = 'none';
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

        // BGM Check (Boss or Normal or Rare)
        this.sound.playBgm(m.number === 10, m.isRare);

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
        this.state = GameState.BATTLE;
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

        // Auto-shrink letter-spacing if content overflows
        problemEl.style.letterSpacing = '';  // reset to CSS default
        problemEl.style.whiteSpace = 'nowrap';
        const maxWidth = problemEl.parentElement.clientWidth;
        let currentSpacing = 4;  // starting letter-spacing in px
        const minSpacing = -10;  // minimum letter spacing
        while (problemEl.scrollWidth > maxWidth && currentSpacing > minSpacing) {
            currentSpacing -= 0.5;
            problemEl.style.letterSpacing = currentSpacing + 'px';
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

    async _onCorrect(elapsed) {
        this.state = GameState.TRANSITION; // Block input while processing
        const isCrit = elapsed <= CONSTANTS.CRITICAL_THRESHOLD;
        let damage = isCrit ? CONSTANTS.CRITICAL_DAMAGE : CONSTANTS.NORMAL_DAMAGE;
        if (this.rareBuff) damage *= 2;
        damage += SWORD_DATA[this.swordLevel].bonus; // lv0(ぼう)は+0

        const m = this.monsters[this.currentMonsterIdx];
        m.takeDamage(damage);
        this._updateMonsterHpUI(m);

        // VFX
        this._flashScreen();
        this._showMessage(isCrit ? `クリティカル！\n${damage}ダメージ！` : `${this.playerName}のこうげき！\n${damage}ダメージ！`, isCrit);

        // Sound Selection based on sword level
        if (this.swordLevel > 0) {
            this.sound.playSe(isCrit ? 'swordcritical' : 'swordattack');
        } else {
            this.sound.playSe(isCrit ? 'critical' : 'attack');
        }

        if (m.hp <= 0) {
            // Defeated: Stop timer immediately
            clearInterval(this.timerIntervalId);

            // Show damage message first, then defeat sequence
            setTimeout(() => {
                this._onMonsterDefeated(m);
            }, 1500);
        } else {
            // Boss Logic Check
            const hasEvent = await this._checkBossEvents(m);
            if (!hasEvent) {
                setTimeout(() => this.nextProblem(), 1000); // delay increased to 1s for better pacing
            } else {
                this.nextProblem();
            }
        }
    }

    _onWrong() {
        const m = this.monsters[this.currentMonsterIdx];
        let damage = m.attackPower;

        // Shield damage reduction
        if (this.shieldLevel > 0) {
            const shield = SHIELD_DATA[this.shieldLevel];
            damage = Math.max(0, damage - shield.reduction);
            this.shieldDurability--;
            if (this.shieldDurability <= 0) {
                const shieldName = shield.name;
                this.shieldLevel = 0;
                this.shieldDurability = 0;
                document.getElementById('shield-label').style.display = 'none';
                this.playerHp = Math.max(0, this.playerHp - damage);
                this._updatePlayerHpUI();
                this._shakeScreen();
                this._showMessage(`ミス！\n${damage}ダメージうけた！\n${shieldName}は\nこわれてしまった！`, false, 2500, 'damage');
                this.sound.playSe('shielddamage');
                if (this.playerHp <= 0) {
                    this._onGameOver();
                }
                return;
            }
        }

        this.playerHp = Math.max(0, this.playerHp - damage);
        this._updatePlayerHpUI();

        this._shakeScreen();
        this._showMessage(`ミス！
${damage}ダメージうけた！`, false, 1500, 'damage');

        if (this.shieldLevel > 0) {
            this.sound.playSe('shielddamage');
        } else {
            this.sound.playSe('damage');
        }

        if (this.playerHp <= 0) {
            this._onGameOver();
        }
    }

    async _checkBossEvents(m) {
        // Boss 16 Transform (was Boss 06)
        if (m.bossId === 16 && m.hp <= 4 && !m.hasTransformed) {
            m.hasTransformed = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

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
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
        }
        // Boss 16 Sap (was Boss 06)
        if (m.bossId === 16 && m.hp <= 6 && !m.hasLickedSap) {
            m.hasLickedSap = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

            this._showMessage("モンスターが じゅえきを なめた！", false, 3000);
            this.sound.playSe('sap'); // New SE
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait while sap sound plays

            m.hp = 16;
            this._updateMonsterHpUI(m);
            this._showMessage("HPが ぜんかいふくした！", false, 1500);
            this.sound.playSe('heal'); // Added heal SE
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before next problem
            return true;
        }
        // Boss 15 Meat (was Boss 05)
        if (m.bossId === 15 && m.hp < 5 && !m.hasEatenMeat) {
            m.hasEatenMeat = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

            this._showMessage("モンスターが にくを たべた！", false, 3000);
            this.sound.playSe('meat'); // New SE
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait while meat sound plays

            m.hp = 16;
            this._updateMonsterHpUI(m);
            this._showMessage("HPが ぜんかいふくした！", false, 1500);
            this.sound.playSe('heal'); // Added heal SE
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before next problem
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

        // Save to Monster Note
        this._saveMonsterRecord(m, totalTime);

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

        // アイテムドロップ抽選（剣・盾を独立して同時抽選）
        const canDropItem = !m.isRare && !m.isHeal && m.number >= 1 && m.number <= 9;
        let swordDropped = false;
        let shieldDropped = false;

        // 剣のアップグレード抽選
        const nextSwordLevel = this.swordLevel + 1;
        if (canDropItem && nextSwordLevel <= 3) {
            if (Math.random() < SWORD_DROP_RATE[this.swordLevel]) {
                swordDropped = true;
            }
        }

        // 盾のアップグレード抽選（剣と独立）
        const nextShieldLevel = this.shieldLevel + 1;
        if (canDropItem && nextShieldLevel <= 4) {
            if (Math.random() < SHIELD_DROP_RATE[this.shieldLevel]) {
                shieldDropped = true;
            }
        }

        if (swordDropped && shieldDropped) {
            // 剣→盾の順でシーケンス実行
            this._doSwordDrop(nextSwordLevel, () => {
                this._doShieldDrop(nextShieldLevel, () => this._nextMonster(), 0);
            });
        } else if (swordDropped) {
            this._doSwordDrop(nextSwordLevel, () => this._nextMonster());
        } else if (shieldDropped) {
            this._doShieldDrop(nextShieldLevel, () => this._nextMonster());
        } else {
            setTimeout(() => this._nextMonster(), 3000);
        }
    }

    _doSwordDrop(level, onComplete) {
        const sword = SWORD_DATA[level];
        setTimeout(() => {
            const monsterContainer = document.querySelector('.monster-container');
            const swordImg = document.createElement('img');
            swordImg.src = 'assets/otherimg/' + sword.img;
            swordImg.className = 'sword-drop-img';
            monsterContainer.appendChild(swordImg);

            this.sound.playSe('item');
            this._showMessage(`${sword.name}を\nてにいれた！`, false, 4500);

            setTimeout(() => {
                this.swordLevel = level;
                const swordLabelEl = document.getElementById('sword-label');
                swordLabelEl.src = 'assets/otherimg/' + sword.img;
                swordLabelEl.style.display = 'inline-block';
                this._showMessage(`${sword.name}を\nそうびした！`, false, 2000);

                setTimeout(() => {
                    swordImg.remove();
                    onComplete();
                }, 2000);
            }, 2000);
        }, 1500);
    }

    _doShieldDrop(level, onComplete, initialDelay = 1500) {
        const shield = SHIELD_DATA[level];
        setTimeout(() => {
            const monsterContainer = document.querySelector('.monster-container');
            const shieldImg = document.createElement('img');
            shieldImg.src = 'assets/otherimg/' + shield.img;
            shieldImg.className = 'sword-drop-img';
            monsterContainer.appendChild(shieldImg);

            this.sound.playSe('item');
            this._showMessage(`${shield.name}を\nてにいれた！`, false, 4500);

            setTimeout(() => {
                this.shieldLevel = level;
                this.shieldDurability = shield.maxDurability;
                const shieldLabelEl = document.getElementById('shield-label');
                shieldLabelEl.src = 'assets/otherimg/' + shield.img;
                shieldLabelEl.style.display = 'inline-block';
                this._showMessage(`${shield.name}を\nそうびした！`, false, 2000);

                setTimeout(() => {
                    shieldImg.remove();
                    onComplete();
                }, 2000);
            }, 2000);
        }, initialDelay);
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
            if (Math.random() < 0.2) {
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

    _openImageModal(src, name, record = null) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('image-modal-img');
        const captionText = document.getElementById('caption');
        modal.classList.add('active');
        modalImg.src = src;

        let captionHTML = `<span class="modal-name">${name}</span>`;
        if (record) {
            const time = typeof record.fastestTime === 'number'
                ? record.fastestTime.toFixed(1)
                : '?';
            const count = record.count || 0;
            captionHTML += `<span class="modal-stats">★さいそくタイム: ${time}秒&nbsp;&nbsp;&nbsp;${count}回たおした</span>`;
        }
        captionText.innerHTML = captionHTML;
    }

    /* UI Helpers */
    _updatePlayerHpUI() {
        const bar = document.getElementById('player-hp-bar');
        const text = document.getElementById('player-hp-text');
        const ratio = this.playerHp / CONSTANTS.PLAYER_MAX_HP;

        bar.style.width = `${ratio * 100}%`;
        if (ratio > 0.75) bar.style.backgroundColor = 'var(--success-color)';
        else if (ratio > 0.3) bar.style.backgroundColor = 'var(--accent-color)';
        else bar.style.backgroundColor = 'var(--danger-color)';
        text.textContent = `HP ${this.playerHp}/${CONSTANTS.PLAYER_MAX_HP}`;
    }

    _updateMonsterHpUI(m) {
        const bar = document.getElementById('monster-hp-bar');
        const ratio = m.hpRatio;
        bar.style.width = `${ratio * 100}%`;
        if (ratio > 0.75) bar.style.backgroundColor = 'var(--success-color)';
        else if (ratio > 0.3) bar.style.backgroundColor = 'var(--accent-color)';
        else bar.style.backgroundColor = 'var(--danger-color)';
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

    /* ============================================================
       Phase 1: Monster Note (図鑑)
       ============================================================ */
    _getMonsterName(filename) {
        let name = filename.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        name = name.replace(/^(rare_|heal_|boss\d+_|\d+_|lastboss_)/i, '');
        return name;
    }

    _saveMonsterRecord(m, time) {
        const STORAGE_KEY = 'math_battle_collection_v1';
        let collection = {};
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) collection = JSON.parse(stored);
        } catch (e) {
            console.warn("Storage read failed", e);
        }

        // ファイル名の番号配変に対応するため、モンスター名をキーに使用
        const parts = m.imageSrc.split('/');
        const filename = parts[parts.length - 1];
        const monsterName = this._getMonsterName(filename);

        if (!collection[monsterName]) {
            collection[monsterName] = {
                defeated: true,
                fastestTime: time,
                count: 1,
                imageSrc: m.imageSrc  // 画像パスも保存
            };
        } else {
            const rec = collection[monsterName];
            rec.count = (rec.count || 0) + 1;
            if (time < rec.fastestTime) {
                rec.fastestTime = time;
            }
            rec.imageSrc = m.imageSrc;  // 画像パスを更新
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
        } catch (e) {
            console.warn("Storage write failed", e);
        }
    }

    showNote() {
        this.state = GameState.NOTE;
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('note-screen').classList.add('active');
        this.adjustScale();
        this._renderNoteGrid();
    }

    hideNote() {
        this.state = GameState.SETUP;
        document.getElementById('note-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.add('active');
        this.adjustScale();
    }

    _renderNoteGrid() {
        const grid = document.getElementById('note-grid');
        grid.innerHTML = '';

        const STORAGE_KEY = 'math_battle_collection_v1';
        let collection = {};
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) collection = JSON.parse(stored);
        } catch (e) { }

        const assets = getMonsterAssets();
        const sortedAssets = [...assets]; // Keep original order from monster_list.js
        let currentCategory = '';

        sortedAssets.forEach(filename => {
            let category = 'その他';
            if (filename.toLowerCase().startsWith('boss') || filename.toLowerCase().startsWith('lastboss')) {
                category = 'ボス';
            } else if (filename.toLowerCase().startsWith('heal')) {
                category = 'かいふく';
            } else if (filename.toLowerCase().startsWith('rare')) {
                category = 'レア';
            } else {
                const match = filename.match(/^(\d+)_/);
                if (match) {
                    category = `${parseInt(match[1], 10)}ばん`;
                }
            }

            if (category !== currentCategory) {
                currentCategory = category;
                const header = document.createElement('div');
                header.className = 'note-category-header';
                header.textContent = category;
                grid.appendChild(header);
            }

            const displayName = this._getMonsterName(filename);
            const record = collection[displayName];
            const isDefeated = !!(record && record.defeated);

            const card = document.createElement('div');
            card.className = 'note-card';

            const imgContainer = document.createElement('div');
            imgContainer.className = 'note-img-container';

            const imgEl = document.createElement('img');
            imgEl.src = `assets/img/${filename}`;
            imgEl.className = 'note-img';

            const nameEl = document.createElement('div');
            nameEl.className = 'note-name';

            if (!isDefeated) {
                card.classList.add('undefeated');
                imgEl.classList.add('silhouette');
                nameEl.textContent = '？？？';
            } else {
                nameEl.textContent = displayName;
                card.addEventListener('click', () => {
                    this._openImageModal(`assets/img/${filename}`, displayName, record);
                });
            }

            imgContainer.appendChild(imgEl);
            card.appendChild(imgContainer);
            card.appendChild(nameEl);
            grid.appendChild(card);
        });
    }

    /* ============================================================
       Phase 2: Backup Feature (JSONダウンロード/アップロード)
       ============================================================ */
    _generateChecksum(collection) {
        // _checksumキーを除いたデータをキーソートしてJSON文字列化
        const keys = Object.keys(collection).filter(k => k !== '_checksum').sort();
        let str = '{';
        keys.forEach((k, i) => {
            str += JSON.stringify(k) + ':' + JSON.stringify(collection[k]);
            if (i < keys.length - 1) str += ',';
        });
        str += '}';
        // charCodeAt()の合計、6進敗8桁文字列に変換
        let sum = 0;
        for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
        return (sum >>> 0).toString(16).padStart(8, '0');
    }

    saveBackup() {
        const STORAGE_KEY = 'math_battle_collection_v1';
        let collection = {};
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) collection = JSON.parse(stored);
        } catch (e) { }

        // データがない場合は中断
        const keys = Object.keys(collection).filter(k => k !== '_checksum');
        if (keys.length === 0) {
            alert('まだ データが ないよ！ モンスターを たおしてから ほぞんしてね！');
            return;
        }

        // チェックサム追加
        const dataToSave = {};
        keys.forEach(k => { dataToSave[k] = collection[k]; });
        dataToSave['_checksum'] = this._generateChecksum(dataToSave);

        const json = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'massbattler_save.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        document.body.appendChild(input);

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) { document.body.removeChild(input); return; }

            const reader = new FileReader();
            reader.onload = (ev) => {
                document.body.removeChild(input);
                let parsed;
                try {
                    parsed = JSON.parse(ev.target.result);
                } catch (err) {
                    alert('この ファイルは よみとれなかったよ。 ただしい ファイルを つかってね。');
                    return;
                }

                // チェックサム検証
                const savedChecksum = parsed['_checksum'];
                const dataWithoutChecksum = {};
                Object.keys(parsed).filter(k => k !== '_checksum').forEach(k => {
                    dataWithoutChecksum[k] = parsed[k];
                });
                const expectedChecksum = this._generateChecksum(dataWithoutChecksum);

                if (!savedChecksum || savedChecksum !== expectedChecksum) {
                    alert('このファイルは かいざんされているかも！ よみこめないよ！');
                    return;
                }

                // localStorageに上書き保存（_checksumは除外）
                const STORAGE_KEY = 'math_battle_collection_v1';
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithoutChecksum));
                    alert('セーブデータを よみこんだよ！');
                    if (this.state === GameState.NOTE) {
                        this._renderNoteGrid();
                    }
                } catch (err) {
                    alert('エラーが おきました。');
                }
            };
            reader.readAsText(file);
        });

        input.click();
    }

} // end class Game

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
