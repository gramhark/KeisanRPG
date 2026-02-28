/* Main Game Class */
class Game {
    constructor() {
        this.sound = new SoundManager();
        this.state = GameState.TOP;

        // Settings
        this.playerName = '';
        this.leftDigits = parseInt(localStorage.getItem('math_battle_left_digits')) || 1;
        this.rightDigits = parseInt(localStorage.getItem('math_battle_right_digits')) || 1;

        const savedOperators = localStorage.getItem('math_battle_operators');
        try {
            this.operators = savedOperators ? JSON.parse(savedOperators) : ['+'];
            if (!Array.isArray(this.operators) || this.operators.length === 0) {
                this.operators = ['+'];
            }
        } catch (e) {
            this.operators = ['+'];
        }

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
        this.isPlayerTurn = true; // Turn-based state

        this.swordLevel = 0;
        this.shieldLevel = 0;
        this.shieldDurability = 0;
        this.swordBonus = 0; // Special_モンスター撃破による武器補正

        this.dodgeStreak = 0;       // 連続回避カウント (0–3)
        this.specialMoveReady = false; // 必殺技待機フラグ
        this.timers = [];
        this.specialMonstersAppeared = []; // スペシャルモンスター出現済みリスト

        // Gold & Bag
        this.gold = Math.min(parseInt(localStorage.getItem('math_battle_gold')) || 0, CONSTANTS.MAX_GOLD);
        this.bag = this._loadBag(); // { かいふくだま: N, こうげきだま: N, ... }
        this._shopSelectedItemIdx = null;
        this.defenseBonus = 0; // ぼうぎょだまによる防御補正（1バトル中有効）
        // バトル中アイテム使用回数（1バトル通算 or モンスター1体）
        this._battleItemUsage = { こうげきだま: 0, ぼうぎょだま: 0 };
        this._monsterItemUsage = { とげだま: 0, どくだま: false, まひだま: false, せきかだま: false };
        this._battleSelectedItem = null;

        // Auto Scaling
        window.addEventListener('resize', () => this.adjustScale());
        this.adjustScale();

        this._bindEvents();
        this._applySavedSettingsUI();
        this._updateTimerBar(1); // Reset
    }

    adjustScale() {
        const app = document.getElementById('app');

        // Viewport
        const viewport = window.visualViewport;
        const winW = viewport ? viewport.width : window.innerWidth;
        const winH = viewport ? viewport.height : window.innerHeight;

        if (viewport && window.innerHeight - winH > 150) {
            return;
        }

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
        app.style.opacity = '1';
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
        document.getElementById('info-btn').addEventListener('click', () => this._showInfoOverlay());
        document.getElementById('info-close-btn').addEventListener('click', () => this._hideInfoOverlay());

        // Boss cutin buttons (ボスカットイン画面内のボタン)
        document.getElementById('boss-battle-start-btn').addEventListener('click', () => this._onBossCutinBattleStart());
        document.getElementById('boss-info-btn').addEventListener('click', () => this._showInfoOverlay());

        // Restart
        document.getElementById('restart-btn').addEventListener('click', () => location.reload()); // Simple reload

        // Quit battle button
        document.getElementById('quit-battle-btn').addEventListener('click', () => this._onQuitBattleBtnClick());
        document.getElementById('quit-yes-btn').addEventListener('click', () => location.reload());
        document.getElementById('quit-no-btn').addEventListener('click', () => this._resumeFromQuitConfirm());

        // Numpad
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this._handleInput(btn.dataset.key); });
            btn.addEventListener('click', (e) => this._handleInput(btn.dataset.key));
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            // Interval Screen (Fight Start)
            if (this.state === GameState.INTERVAL && e.key === 'Enter') {
                // ボスカットインオーバーレイが表示中の場合は「たたかう」ボタンを使う
                const bossCutin = document.getElementById('boss-cutin-overlay');
                const btnsVisible = document.getElementById('boss-cutin-btns').classList.contains('visible');
                if (bossCutin && bossCutin.classList.contains('active')) {
                    if (btnsVisible) this._onBossCutinBattleStart();
                    return;
                }
                this.startBattle();
                return;
            }

            if (this.state !== GameState.BATTLE) return;
            if (e.key >= '0' && e.key <= '9') this._handleInput(e.key);
            if (e.key === 'Backspace') this._handleInput('DEL');
            if (e.key === 'Enter') this._handleInput('ENTER');
        });

        // Request Form
        document.getElementById('top-request-btn').addEventListener('click', () => {
            document.getElementById('request-overlay').classList.add('active');
        });
        document.getElementById('cancel-request-btn').addEventListener('click', () => {
            document.getElementById('request-overlay').classList.remove('active');
        });
        document.getElementById('submit-request-btn').addEventListener('click', () => this.submitRequest());

        // Top Screen buttons
        document.getElementById('battle-prep-btn').addEventListener('click', () => this.showSetup());
        document.getElementById('top-note-btn').addEventListener('click', () => this.showNote());
        document.getElementById('top-item-note-btn').addEventListener('click', () => this.showItemNote());
        document.getElementById('top-shop-btn').addEventListener('click', () => this.showShop());
        document.getElementById('top-bag-btn').addEventListener('click', () => this.showBag());

        // Setup Screen back button
        document.getElementById('back-to-top-btn').addEventListener('click', () => this.showTop());

        // Phase 1: Monster Note
        document.getElementById('close-note-btn').addEventListener('click', () => {
            this.hideNote();
        });

        // Bag Screen
        document.getElementById('close-bag-btn').addEventListener('click', () => this.hideBag());
        document.getElementById('bag-detail-close-btn').addEventListener('click', () => {
            document.getElementById('bag-detail-overlay').classList.remove('active');
        });

        // Item Note
        document.getElementById('close-item-note-btn').addEventListener('click', () => this.hideItemNote());

        // Shop
        document.getElementById('shop-back-btn').addEventListener('click', () => this.hideShop());
        document.getElementById('shop-buy-yes-btn').addEventListener('click', () => this._purchaseItem());
        document.getElementById('shop-buy-no-btn').addEventListener('click', () => {
            document.getElementById('shop-item-overlay').classList.remove('active');
            this._shopSelectedItemIdx = null;
        });
        // [REMOVED shop-msg-close-btn listener because of auto-close]

        // Kaban Slot (battle) — カバンアイコンをタップでカバンウィンドウを開く
        const kabanSlotImg = document.getElementById('kaban-slot-img');
        if (kabanSlotImg) {
            kabanSlotImg.addEventListener('click', () => this._openBattleBag());
            kabanSlotImg.addEventListener('touchstart', (e) => { e.preventDefault(); this._openBattleBag(); }, { passive: false });
        }

        // Battle Bag Overlay
        document.getElementById('battle-bag-close-btn').addEventListener('click', () => this._closeBattleBag());
        document.getElementById('battle-item-use-btn').addEventListener('click', () => this._executeBattleItemUse());
        document.getElementById('battle-item-cancel-btn').addEventListener('click', () => {
            document.getElementById('battle-item-confirm').style.display = 'none';
            document.querySelectorAll('.battle-bag-card.selected').forEach(c => c.classList.remove('selected'));
            this._battleSelectedItem = null;
        });

        // Phase 2: Backup Feature (JSON)
        document.getElementById('top-save-backup-btn').addEventListener('click', () => this.saveBackup());
        document.getElementById('top-load-backup-btn').addEventListener('click', () => this.loadBackup());
    }

    _updateOperators() {
        const active = Array.from(document.querySelectorAll('#operators-group .checkbox-btn.active')).map(b => b.dataset.op);
        this.operators = active;
    }

    _applySavedSettingsUI() {
        // Left digits
        document.querySelectorAll('#left-digits-group .toggle-btn').forEach(btn => {
            if (parseInt(btn.dataset.value) === this.leftDigits) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Right digits
        document.querySelectorAll('#right-digits-group .toggle-btn').forEach(btn => {
            if (parseInt(btn.dataset.value) === this.rightDigits) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Operators
        document.querySelectorAll('#operators-group .checkbox-btn').forEach(btn => {
            if (this.operators.includes(btn.dataset.op)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /* Game Flow */
    startGame() {
        this.sound.unlockAll(); // ← この1行を追加
        const nameInput = document.getElementById('player-name').value.trim();
        this.playerName = nameInput || 'ゆうしゃ';
        localStorage.setItem('math_battle_player_name', nameInput);
        localStorage.setItem('math_battle_left_digits', this.leftDigits);
        localStorage.setItem('math_battle_right_digits', this.rightDigits);
        localStorage.setItem('math_battle_operators', JSON.stringify(this.operators));

        if (this.operators.length === 0) {
            alert('どの けいさんに するか えらんでね！');
            return;
        }

        // Init Player
        this.playerHp = CONSTANTS.PLAYER_MAX_HP;
        const nameDisplayEl = document.getElementById('player-name-display');
        nameDisplayEl.textContent = this.playerName;
        const nameScale = this.playerName.length > 4 ? 4 / this.playerName.length : 1;
        nameDisplayEl.style.setProperty('--name-scale', nameScale);

        this._updatePlayerHpUI();

        // Init Monsters (初期化は通常モンスターのみ。実際の抽選は _determineMonster でおこなう)
        this.monsters = [];
        const opCount = this.operators.length;
        this.defeatTimes = [];
        this.specialMonstersAppeared = [];
        for (let i = 1; i <= CONSTANTS.TOTAL_MONSTERS; i++) {
            const m = new Monster(i, false, false, opCount, this.leftDigits, this.rightDigits, false);
            this.monsters.push(m);
        }

        this.currentMonsterIdx = 0;
        this._determineMonster(0); // 1体目の抽選
        this.swordBonus = 0; // Special_モンスター撃破による武器補正
        this.swordLevel = 0; // ぼうを最初から持つ
        this.shieldLevel = 0;
        this.shieldDurability = 0;
        this.defenseBonus = 0;
        this.dodgeStreak = 0;
        this.specialMoveReady = false;
        // バトル通算の使用回数リセット
        this._battleItemUsage = { こうげきだま: 0, ぼうぎょだま: 0 };
        this._monsterItemUsage = { とげだま: 0, どくだま: false, まひだま: false, せきかだま: false };
        const swordLabelEl = document.getElementById('sword-label');
        swordLabelEl.src = 'assets/image/equipment/' + SWORD_DATA[0].img;
        swordLabelEl.classList.remove('equip-flash');
        void swordLabelEl.offsetWidth;
        swordLabelEl.classList.add('equip-flash');
        document.getElementById('sword-aura-wrapper').style.display = 'inline-flex';
        this._updateAuraUI();
        document.getElementById('shield-label').style.visibility = 'hidden';
        document.getElementById('shield-label').classList.remove('equip-flash');
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
        // 攻撃エフェクトを初期ロード
        const attackImg = new Image();
        attackImg.src = 'assets/image/other/attack.webp';

        const criticalImg = new Image();
        criticalImg.src = 'assets/image/other/critical.webp';
    }

    /**
     * 2体目以降とボス変身後の画像をバックグラウンドでプリロードする。
     */
    _preloadRemainingImages() {
        // ① 2体目以降のモンスター画像
        const monsterSrcs = this.monsters.slice(1).map(m => m.imageSrc);
        monsterSrcs.push('assets/image/monster/Boss16next_しんのかみダイオウグソクナイト.webp');

        // ② アイテム画像（剣＋盾）
        const itemSrcs = [
            'assets/image/item/sword01.webp',
            'assets/image/item/sword02.webp',
            'assets/image/item/sword03.webp',
            'assets/image/item/sword04.webp',
            'assets/image/item/sword05.webp',
            'assets/image/item/shield01.webp',
            'assets/image/item/shield02.webp',
            'assets/image/item/shield03.webp',
            'assets/image/item/shield04.webp',
            'assets/image/item/shield05.webp'
        ];

        const effectSrcs = [
            'assets/image/other/swordattack.webp',
            'assets/image/other/swordcritical.webp',
            'assets/image/other/SPattack.webp'
        ];

        const allSrcs = [...monsterSrcs, ...itemSrcs, ...effectSrcs];

        // 少し遅らせてバックグラウンドで読み込み
        setTimeout(() => {
            allSrcs.forEach(src => {
                if (!src) return;
                const img = new Image();
                img.src = src;
            });
        }, 500);
    }

    showInterval() {
        this.state = GameState.INTERVAL;
        const m = this.monsters[this.currentMonsterIdx];

        // いかりクラスをリセット
        document.querySelector('.monster-container').classList.remove('angry');

        // BGM Check (Boss or Normal or Rare or Heal or Special)
        this.sound.playBgm(m.number === 10, m.isRare, m.isHeal, m.isSpecial);

        // Fixed 3-line centered message format
        const msgEl = document.getElementById('interval-msg');
        let msgHtml = `${m.name}が<br>あらわれた！`;
        if (m.isHeal) {
            msgHtml += `<br>かいふくの チャンスだ！`;
        }
        msgEl.innerHTML = msgHtml;

        // セリフウィンドウの決定（interval-overlay 内）
        // 優先順: Special固有セリフ → ヤンシリーズ自己紹介 → 非表示
        // ※ボスのセリフはboss-cutin-quoteで処理するためここでは不要
        const quoteEl = document.getElementById('special-quote');
        const isYanMonster = typeof YAN_SERIES_ORDER !== 'undefined' && YAN_SERIES_ORDER.indexOf(m.name) !== -1;

        if (m.isSpecial && m.quote) {
            // Special固有セリフ
            quoteEl.textContent = `「${m.quote}」`;
            quoteEl.style.display = 'block';
        } else if (isYanMonster) {
            // ヤンシリーズは自分の名前を「！」付きで叫ぶ
            quoteEl.textContent = `「${m.name}！」`;
            quoteEl.style.display = 'block';
        } else {
            quoteEl.textContent = '';
            quoteEl.style.display = 'none';
        }

        // Preload Image & Reset Opacity
        const mImg = document.getElementById('monster-img');
        const iImg = document.getElementById('interval-monster-img');
        mImg.src = m.imageSrc;
        mImg.style.opacity = '1';
        document.getElementById('monster-name').style.opacity = '1';
        document.getElementById('monster-hp-container').style.opacity = '1';
        iImg.src = m.imageSrc;

        this._updateMonsterHpUI(m);
        const monsterNameEl = document.getElementById('monster-name');
        monsterNameEl.textContent = m.name;
        // 文字数に応じてフォントスケールを調整（10文字を基準とした縮小）
        const nameScale = m.name.length > 10 ? 10 / m.name.length : 1;
        monsterNameEl.style.setProperty('--monster-name-scale', nameScale);
        this._updateStageProgressUI();

        // ボスの場合はカットインを表示（interval-overlay は使わない）
        if (m.number === 10) {
            this._showBossCutIn(m);
        } else {
            document.getElementById('interval-overlay').classList.add('active');
        }
    }

    _showBossCutIn(m) {
        const overlay = document.getElementById('boss-cutin-overlay');
        const imgEl = document.getElementById('boss-cutin-img');
        const labelEl = overlay.querySelector('.boss-cutin-label');
        const nameEl = document.getElementById('boss-cutin-name');
        const btnsEl = document.getElementById('boss-cutin-btns');
        const quoteEl = document.getElementById('boss-cutin-quote');

        // リセット
        imgEl.src = m.imageSrc;
        nameEl.textContent = m.name;
        imgEl.classList.remove('zoom-up');
        labelEl.classList.remove('fade-out-el');
        nameEl.classList.remove('fade-out-el');
        btnsEl.classList.remove('visible');
        overlay.classList.remove('fade-out');

        // ボスのセリフ（名前を「！」付きで叫ぶ）
        // ヤン系ボスのみ叫ぶ（名前に「ヤン」を含む場合）
        // ※「ぼろぼろのヤンダ」は変身イベントのメッセージで叫んでいるので除外
        if (quoteEl) {
            const isYanBoss = m.name.includes('ヤン') && m.name !== 'ぼろぼろのヤンダ';
            if (isYanBoss) {
                quoteEl.textContent = `「${m.name}！」`;
                quoteEl.style.display = 'block';
            } else {
                quoteEl.style.display = 'none';
            }
        }

        overlay.classList.add('active');

        // 2秒後: ラベル・名前・セリフをフェードアウト + 画像ズームアップ
        setTimeout(() => {
            labelEl.classList.add('fade-out-el');
            nameEl.classList.add('fade-out-el');
            if (quoteEl) quoteEl.style.display = 'none';
            imgEl.classList.add('zoom-up');

            // 0.5秒後: ボタン表示
            setTimeout(() => {
                btnsEl.classList.add('visible');
            }, 500);
        }, 2000);
    }

    _onBossCutinBattleStart() {
        const overlay = document.getElementById('boss-cutin-overlay');
        const imgEl = document.getElementById('boss-cutin-img');
        const labelEl = overlay.querySelector('.boss-cutin-label');
        const nameEl = document.getElementById('boss-cutin-name');
        const btnsEl = document.getElementById('boss-cutin-btns');
        const quoteEl = document.getElementById('boss-cutin-quote');

        // カットインオーバーレイを非表示にしてバトル開始
        overlay.classList.remove('active');
        imgEl.classList.remove('zoom-up');
        labelEl.classList.remove('fade-out-el');
        nameEl.classList.remove('fade-out-el');
        btnsEl.classList.remove('visible');
        if (quoteEl) quoteEl.style.display = 'none';

        this.startBattle();
    }

    _showInfoOverlay() {
        const m = this.monsters[this.currentMonsterIdx];
        const sword = SWORD_DATA[this.swordLevel];
        const shield = SHIELD_DATA[this.shieldLevel];
        const playerAtk = CONSTANTS.NORMAL_DAMAGE + sword.bonus + this.swordBonus;
        const playerDef = shield ? shield.reduction : 0;

        // オーラ段階テキスト
        let auraText, auraHighlight;
        if (this.specialMoveReady) {
            auraText = 'ひっさつ よういOK！';
            auraHighlight = true;
        } else if (this.dodgeStreak >= 3) {
            auraText = 'レベル 3';
        } else if (this.dodgeStreak >= 2) {
            auraText = 'レベル 2';
        } else if (this.dodgeStreak >= 1) {
            auraText = 'レベル 1';
        } else {
            auraText = 'なし';
        }

        const enemyRows = [
            { label: 'なまえ', value: m.name },
            { label: 'たいりょく', value: `${m.hp} / ${m.maxHp}` },
            { label: 'こうげきりょく', value: String(m.attackPower) },
        ];

        const playerRows = [
            { label: 'たいりょく', value: `${this.playerHp} / ${CONSTANTS.PLAYER_MAX_HP}` },
            { label: 'こうげきりょく', value: String(playerAtk) },
            { label: 'ぼうぎょりょく', value: shield ? String(playerDef) : 'なし' },
            { label: 'たてのたいきゅう', value: shield ? `${this.shieldDurability} / ${shield.maxDurability}` : 'なし' },
            { label: 'オーラレベル', value: auraText, highlight: auraHighlight },
        ];

        const renderRows = (el, rows) => {
            el.innerHTML = rows.map(r =>
                `<div class="info-row">
                    <span class="info-label">${r.label}</span>
                    <span class="info-value${r.highlight ? ' sp-ready' : ''}">${r.value}</span>
                </div>`
            ).join('');
        };

        renderRows(document.getElementById('info-enemy-rows'), enemyRows);
        renderRows(document.getElementById('info-player-rows'), playerRows);
        document.getElementById('info-overlay').classList.add('active');
        // 表示後にはみ出しチェック → フォント縮小
        requestAnimationFrame(() => this._fitInfoRows());
    }

    _fitInfoRows() {
        document.querySelectorAll('#info-overlay .info-row').forEach(row => {
            if (row.scrollWidth <= row.clientWidth) return;
            let fs = parseFloat(window.getComputedStyle(row).fontSize);
            while (row.scrollWidth > row.clientWidth && fs > 14) {
                fs -= 1;
                row.style.fontSize = fs + 'px';
            }
        });
    }

    _hideInfoOverlay() {
        document.getElementById('info-overlay').classList.remove('active');
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
        document.getElementById('interval-overlay').classList.remove('active', 'boss-entrance');
        this.state = GameState.TRANSITION; // Block during announcement

        // モンスター1体ごとのアイテム使用回数リセット
        this._monsterItemUsage = { とげだま: 0, どくだま: false, まひだま: false, せきかだま: false };

        // モンスターのステータス状態をリセット
        const bm = this.monsters[this.currentMonsterIdx];
        bm.isPoisoned = false;
        bm.isParalyzed = false;
        bm.isStoned = false;
        this._clearMonsterStatusMask();

        // ★ バトル開始前に問題表示を即座にクリア（前回の問題文の残像防止）
        this._clearProblemDisplay();

        const isBoss = this.monsters[this.currentMonsterIdx].number === 10;
        this.problem = new MathProblem(this.leftDigits, this.rightDigits, this.operators, isBoss);
        this.monsterBattleStart = Date.now();

        // 最初のバトル開始時に きのけん(sword01) をアイテムノートに登録する
        this._updateItemCollection('きのけん');

        this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.state = GameState.TRANSITION;
        this._clearProblemDisplay(); // ★ 新しく追加：画面上の問題を消去
        this._showMessage(`${this.playerName}の こうげき！`, false, 1500, 'text-player-action');
        setTimeout(() => {
            if (this.state !== GameState.RESULT && this.state !== GameState.GAMEOVER) {
                this.nextProblem();
            }
        }, 1500);
    }

    startMonsterTurn() {
        this.isPlayerTurn = false;
        this.state = GameState.TRANSITION;
        const m = this.monsters[this.currentMonsterIdx];
        this._clearProblemDisplay(); // ★ 新しく追加：画面上の問題を消去
        // ★ モンスターの攻撃はダメージ色（赤）に変更
        this._showMessage(`こうげきがくる！\nよけろ！`, false, 1500, 'text-monster-action');
        setTimeout(() => {
            if (this.state !== GameState.RESULT && this.state !== GameState.GAMEOVER) {
                this.nextProblem();
            }
        }, 1500);
    }

    _clearProblemDisplay() {
        this.inputBuffer = "";
        document.getElementById('answer-input').value = "";
        const problemEl = document.getElementById('problem-text');
        // 中身は消さず、レイアウト空間を保ったまま透明にする
        problemEl.style.visibility = 'hidden';

        // ★ 枠の色を元に戻し、タイマーをリセットする
        const problemSection = document.querySelector('.panel-section--problem');
        if (problemSection) {
            problemSection.classList.remove('player-turn', 'monster-turn');
        }
        this._updateTimerBar(1); // タイムゲージを100%に戻す
    }

    nextProblem() {
        this.state = GameState.BATTLE;
        this.problem.generate();
        this.inputBuffer = "";
        this._updateInputUI();

        if (this.isPlayerTurn) {
            // Timer Reset
            document.getElementById('timer-bar').style.visibility = 'visible';
            this.timerStart = Date.now();
            if (this.timerIntervalId) clearInterval(this.timerIntervalId);
            this.timerIntervalId = setInterval(() => this._timerLoop(), 100);
            this._timerLoop(); // immediate update
        } else {
            // Monster turn: タイマーを20秒で起動する
            document.getElementById('timer-bar').style.visibility = 'visible';
            this.timerStart = Date.now();
            if (this.timerIntervalId) clearInterval(this.timerIntervalId);
            this.timerIntervalId = setInterval(() => this._timerLoop(), 100);
            this._timerLoop(); // immediate update
        }
    }

    _timerLoop() {
        if (this.state !== GameState.BATTLE) return;

        const cm = this.monsters[this.currentMonsterIdx];
        const timerSeconds = this.isPlayerTurn
            ? CONSTANTS.TIMER_SECONDS
            : (cm && cm.isParalyzed ? 30 : CONSTANTS.MONSTER_TIMER_SECONDS);

        const elapsed = (Date.now() - this.timerStart) / 1000;
        const remaining = Math.max(0, timerSeconds - elapsed);
        const ratio = remaining / timerSeconds;
        this._updateTimerBar(ratio);

        // ★ モンスターターンでゲージが0になったら被ダメージ
        if (!this.isPlayerTurn && remaining <= 0) {
            // タイマーを止めてから処理（二重発火防止）
            if (this.timerIntervalId) {
                clearInterval(this.timerIntervalId);
                this.timerIntervalId = null;
            }
            this._onTimerExpiredMonsterTurn();
        }
    }

    _onTimerExpiredMonsterTurn() {
        // state が BATTLE のときだけ実行（二重呼び出し対策）
        if (this.state !== GameState.BATTLE) return;

        this.state = GameState.TRANSITION; // 入力をブロック

        // 盾なし時のみ連続回避カウントをリセット（盾あり時はオーラ段階を維持）
        if (this.shieldLevel === 0) {
            this.dodgeStreak = 0;
            this.specialMoveReady = false;
            this._updateAuraUI();
        }

        const m = this.monsters[this.currentMonsterIdx];
        let damage = m.attackPower;

        // シールドによるダメージ軽減処理
        if (this.shieldLevel > 0) {
            const shield = SHIELD_DATA[this.shieldLevel];
            damage = Math.max(0, damage - shield.reduction);
            this.shieldDurability--;

            if (this.shieldDurability <= 0) {
                const shieldName = shield.name;
                this.shieldLevel = 0;
                this.shieldDurability = 0;

                damage = Math.max(0, damage - this.defenseBonus);
                this.playerHp = Math.max(0, this.playerHp - damage);
                this._updatePlayerHpUI();
                this._damageScreen();
                this._shakeScreen();
                this._showMessage(`じかんぎれ！\n${damage}ダメージをうけた！`, false, 800, 'text-monster-action');
                this.sound.playSe('shielddamage');

                setTimeout(() => {
                    document.getElementById('shield-label').style.visibility = 'hidden';
                    this._shakeScreen();
                    this._showMessage(`${shieldName}は\nこわれてしまった！`, false, 2000, 'text-monster-action');
                    this.sound.playSe('crush');

                    if (this.playerHp <= 0) {
                        setTimeout(() => this._onGameOver(), 2000);
                    } else {
                        setTimeout(() => {
                            this._updateInputUI();
                            this._afterMonsterTurnEffects(() => this.startPlayerTurn());
                        }, 2000);
                    }
                }, 1000);

                return;
            }
        }

        // 通常被ダメージ
        damage = Math.max(0, damage - this.defenseBonus);
        this.playerHp = Math.max(0, this.playerHp - damage);
        this._updatePlayerHpUI();

        this._damageScreen();
        this._shakeScreen();
        this._showMessage(`じかんぎれ！\n${damage}ダメージをうけた！`, false, 1500, 'text-monster-action');

        if (this.shieldLevel > 0) {
            this.sound.playSe('shielddamage');
        } else {
            this.sound.playSe('damage');
        }

        if (this.playerHp <= 0) {
            this._onGameOver();
        } else {
            setTimeout(() => {
                this._updateInputUI();
                this._afterMonsterTurnEffects(() => this.startPlayerTurn());
            }, 1500);
        }
    }


    _handleInput(key) {
        if (this.state !== GameState.BATTLE) return;

        if (key === 'DEL') {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        } else if (key === 'ENTER') {
            this._submitAnswer();
            return; // Avoid calling _updateInputUI which clears the visually retained answer
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

        // 非表示状態から復帰させる
        problemEl.style.visibility = 'visible';

        // ★ 問題枠の色変更処理 (問題が表示された瞬間に反映されるようにここで行う)
        const problemSection = document.querySelector('.panel-section--problem');
        if (problemSection) {
            problemSection.classList.remove('player-turn', 'monster-turn');
            if (this.isPlayerTurn) {
                problemSection.classList.add('player-turn');
            } else {
                problemSection.classList.add('monster-turn');
            }
        }

        const displayText = this.problem.displayText || '';
        const answerVal = this.inputBuffer || '';
        const isEmpty = answerVal === '';
        problemEl.innerHTML = `<span class="problem-part">${displayText}</span><span class="answer-part${isEmpty ? ' empty' : ''}">${answerVal}</span>`;

        if (!this.isPlayerTurn) {
            problemEl.classList.add('monster-turn-text');
        } else {
            problemEl.classList.remove('monster-turn-text');
        }

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

        // ★ 解答送信時に即座に枠の色を戻す
        const problemSection = document.querySelector('.panel-section--problem');
        if (problemSection) {
            problemSection.classList.remove('player-turn', 'monster-turn');
        }

        const ans = parseInt(this.inputBuffer);
        if (isNaN(ans)) {
            this.inputBuffer = "";
            this._updateInputUI();
            return;
        }

        const isCorrect = this.problem.check(this.inputBuffer);
        const elapsed = (Date.now() - this.timerStart) / 1000;

        // Save the current input buffer for display before clearing it internally
        const displayedAnswer = this.inputBuffer;
        this.inputBuffer = "";

        // Temporarily display the submitted answer until the next state resets it
        document.getElementById('answer-input').value = displayedAnswer;
        const problemEl = document.getElementById('problem-text');
        const displayText = this.problem.displayText || '';
        problemEl.innerHTML = `<span class="problem-part">${displayText}</span><span class="answer-part">${displayedAnswer}</span>`;

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

        if (!this.isPlayerTurn) {
            // Monster turn: Player dodges
            this._attackScreen(); // ★ モンスターが拡大するアニメーション
            this._showMessage(`こうげきを よけた！`, false, 1500, 'text-player-action');
            this.sound.playSe('dodge'); // ユーザーよけ音

            // 連続回避カウント（必殺技がまだ待機中でなければカウントアップ）
            if (!this.specialMoveReady) {
                this.dodgeStreak++;
                if (this.dodgeStreak >= 4) {
                    this.specialMoveReady = true;
                }
                this._updateAuraUI();
            }

            setTimeout(() => this._afterMonsterTurnEffects(() => this.startPlayerTurn()), 1500);
            return;
        }

        const isCrit = elapsed <= CONSTANTS.CRITICAL_THRESHOLD;

        // 【新ダメージ計算式】 ((基本1 × クリ補正) + けん補正 + Special補正) × 必殺技補正
        const critMult = isCrit ? CONSTANTS.CRITICAL_DAMAGE : CONSTANTS.NORMAL_DAMAGE;
        let damage = (CONSTANTS.NORMAL_DAMAGE * critMult) + SWORD_DATA[this.swordLevel].bonus + this.swordBonus;

        // 必殺技発動
        const isSpecial = this.specialMoveReady;
        if (isSpecial) {
            damage *= 2;
            this.specialMoveReady = false;
            this.dodgeStreak = 0;
            this._updateAuraUI();
        }

        const m = this.monsters[this.currentMonsterIdx];
        m.takeDamage(damage);
        this._updateMonsterHpUI(m);

        // 攻撃エフェクト・SE・メッセージ（必殺技 > クリティカル > 通常 の優先順）
        if (isSpecial) {
            this._showAttackEffect('spatattack');
            this._showLightning();
            this._flashScreen('sp');
            this._showMessage(`ひっさつ！\n${damage}ダメージ！`, true, 1500, 'text-player-action');
            this.sound.playSe('spatattack');
        } else if (this.swordLevel > 0) {
            this._showAttackEffect(isCrit ? 'swordcritical' : 'swordattack');
            this._flashScreen(isCrit ? 'critical' : 'normal');
            if (isCrit) {
                this._showMessage(`クリティカル！\n${damage}ダメージ！`, true, 1500, 'text-player-action');
            } else {
                this._showMessage(`${this.playerName}のこうげき！\n${damage}ダメージ！`, false, 1500, 'text-player-action');
            }
            this.sound.playSe(isCrit ? 'swordcritical' : 'swordattack');
        } else {
            this._showAttackEffect(isCrit ? 'critical' : 'attack');
            this._flashScreen(isCrit ? 'critical' : 'normal');
            if (isCrit) {
                this._showMessage(`クリティカル！\n${damage}ダメージ！`, true, 1500, 'text-player-action');
            } else {
                this._showMessage(`${this.playerName}のこうげき！\n${damage}ダメージ！`, false, 1500, 'text-player-action');
            }
            this.sound.playSe(isCrit ? 'critical' : 'attack');
        }

        // hp=0 でもボスイベントが発火する可能性があるため、常に先にチェックする
        const hasEvent = await this._checkBossEvents(m);
        if (!hasEvent && m.hp <= 0) {
            // イベントなし＋HP0 → 撃破
            if (this.timerIntervalId) clearInterval(this.timerIntervalId);
            setTimeout(() => this._onMonsterDefeated(m), 1500);
        } else if (!hasEvent) {
            // いかりチェック（HP残あり・未いかり・Rare/Heal以外・HP30%未満）
            let angerTriggered = false;
            if (!m.isAngry && m.hp > 0 && m.hpRatio < 0.3 && !m.isRare && !m.isHeal && !m.isSpecial) {
                const angerChance = m.number === 10 ? 0.1 : 0.05;
                if (Math.random() < angerChance) {
                    m.isAngry = true;
                    m.attackPower += m.number === 10 ? 2 : 1;
                    document.querySelector('.monster-container').classList.add('angry');
                    angerTriggered = true;
                    if (m.number === 10) {
                        this.sound.playBossAngryBgm();
                    }
                }
            }

            if (angerTriggered) {
                // 攻撃メッセージが終わってからいかりメッセージを表示
                setTimeout(() => {
                    this._showMessage(`${m.name}は\nいかりくるった！`, false, 1500, 'text-monster-action');
                    setTimeout(() => this.startMonsterTurn(), 1500);
                }, 1500);
            } else {
                // イベントなし＋HP残あり → モンスターターンへ
                setTimeout(() => this.startMonsterTurn(), 1500);
            }
        } else {
            // イベント発火（HP回復済み）→ モンスターターンへ
            this.startMonsterTurn();
        }
    }

    _onWrong() {
        this.state = GameState.TRANSITION; // Block input while processing messages

        if (this.isPlayerTurn) {
            this._dodgeScreen(); // ★ モンスターがよけるアニメーション
            this._showMessage(`ミス！\nあたらなかった！`, false, 1500, 'text-monster-action');
            this.sound.playSe('miss'); // モンスターよけ音
            setTimeout(() => this.startMonsterTurn(), 1500);
            return;
        }

        const m = this.monsters[this.currentMonsterIdx];
        let damage = m.attackPower;

        // 盾なし時のみ連続回避カウントをリセット（盾あり時はオーラ段階を維持）
        if (this.shieldLevel === 0) {
            this.dodgeStreak = 0;
            this.specialMoveReady = false;
            this._updateAuraUI();
        }

        // Shield damage reduction
        if (this.shieldLevel > 0) {
            const shield = SHIELD_DATA[this.shieldLevel];
            damage = Math.max(0, damage - shield.reduction);
            this.shieldDurability--;
            if (this.shieldDurability <= 0) {
                const shieldName = shield.name;
                this.shieldLevel = 0;
                this.shieldDurability = 0;

                damage = Math.max(0, damage - this.defenseBonus);
                this.playerHp = Math.max(0, this.playerHp - damage);
                this._updatePlayerHpUI();
                this._damageScreen(); // ★ モンスターからの攻撃（被弾）アニメーション
                this._shakeScreen();
                this._showMessage(`ミス！\n${damage}ダメージをうけた！`, false, 800, 'text-monster-action');
                this.sound.playSe('shielddamage');

                setTimeout(() => {
                    document.getElementById('shield-label').style.visibility = 'hidden';
                    this._shakeScreen();
                    this._showMessage(`${shieldName}は\nこわれてしまった！`, false, 2000, 'text-monster-action');
                    this.sound.playSe('crush');

                    if (this.playerHp <= 0) {
                        setTimeout(() => this._onGameOver(), 2000);
                    } else {
                        setTimeout(() => {
                            this._updateInputUI(); // Clear the answer display for retry
                            this._afterMonsterTurnEffects(() => this.startPlayerTurn());
                        }, 2000);
                    }
                }, 1000);

                return;
            }
        }

        // 盾なし時のみ連続回避カウントをリセット（盾あり時はオーラ段階を維持）
        if (this.shieldLevel === 0) {
            this.dodgeStreak = 0;
            this.specialMoveReady = false;
            this._updateAuraUI();
        }

        damage = Math.max(0, damage - this.defenseBonus);
        this.playerHp = Math.max(0, this.playerHp - damage);
        this._updatePlayerHpUI();

        this._damageScreen(); // ★ モンスターからの攻撃（被弾）アニメーション
        this._shakeScreen();
        this._showMessage(`ミス！\n${damage}ダメージをうけた！`, false, 1500, 'text-monster-action');

        if (this.shieldLevel > 0) {
            this.sound.playSe('shielddamage');
        } else {
            this.sound.playSe('damage');
        }

        if (this.playerHp <= 0) {
            this._onGameOver();
        } else {
            setTimeout(() => {
                this._updateInputUI(); // Clear the answer display for retry
                this._afterMonsterTurnEffects(() => this.startPlayerTurn());
            }, 1500);
        }
    }

    async _checkBossEvents(m) {
        // Boss 16 Sap（回復を変身より優先）
        // hp=0 を含む hp<=6 かつ未回復の場合に発火
        if (m.bossId === 16 && m.hp <= 6 && !m.hasLickedSap) {
            m.hasLickedSap = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

            this._showMessage("モンスターが じゅえきを なめた！", false, 3000, 'text-monster-action');
            this.sound.playSe('sap');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait while sap sound plays

            m.hp = m.maxHp;
            this._updateMonsterHpUI(m);
            this._showMessage("たいりょくが ぜんかいふくした！", false, 1500, 'text-monster-action');
            this.sound.playSe('heal');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before next problem
            return true;
        }
        // Boss 16 Transform（回復済みの場合のみ、または回復フラグ不要時）
        // hp=0 を含む hp<=4 かつ未変身の場合に発火
        if (m.bossId === 16 && m.hp <= 4 && !m.hasTransformed) {
            m.hasTransformed = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

            m.maxHp = 25; // 真の姿: HP25
            m.hp = 25;
            m.attackPower = 10; // Hard!
            m.imageSrc = 'assets/image/monster/Boss16next_しんのかみダイオウグソクナイト.webp'; // Direct hardcode path
            document.getElementById('monster-img').src = m.imageSrc;
            m.name = "しんのかみ";
            document.getElementById('monster-name').textContent = m.name;
            this._updateMonsterHpUI(m);
            this._showMessage("モンスターが しんのすがたを かいほうした！", false, 3000, 'text-monster-action');
            this.sound.playSe('lastboss');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
        }
        // Boss 15 ヤンチヤントバーン 第一段階：気合の全回復（HP≤5で初回）
        if (m.bossId === 15 && m.name === 'ヤンチヤントバーン' && m.hp <= 5 && !m.hasEatenMeat) {
            m.hasEatenMeat = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // ダメージ演出を待つ

            this._showMessage("ヤンチヤントバーン！", false, 3000, 'text-monster-action');
            this.sound.playSe('heal');
            await new Promise(resolve => setTimeout(resolve, 1500));

            m.hp = m.maxHp;
            this._updateMonsterHpUI(m);
            this._showMessage("たいりょくが ぜんかいふくした！", false, 1500, 'text-monster-action');
            this.sound.playSe('heal');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        }
        // Boss 15 ヤンチヤントバーン 第二段階：弱体化と姿の変化（全回復後、再びHP≤5）
        if (m.bossId === 15 && m.name === 'ヤンチヤントバーン' && m.hp <= 5 && m.hasEatenMeat && !m.hasTransformed) {
            m.hasTransformed = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // ダメージ演出を待つ

            this._showMessage("ヤンダ！", false, 3000, 'text-monster-action');
            this.sound.playSe('lastboss');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 姿を Boss15next に変える
            const boss15nextFile = getMonsterAssets().find(f => f.toLowerCase().startsWith('boss15next_'));
            if (boss15nextFile) {
                m.imageSrc = `assets/image/monster/${boss15nextFile}`;
                let n = boss15nextFile.replace(/\.(webp|png|jpg|jpeg)$/i, '');
                n = n.replace(/^boss\d+next_/i, '');
                m.name = n;
            } else {
                m.imageSrc = 'assets/image/monster/Boss15next_ぼろぼろのヤンダ.webp';
                m.name = 'ぼろぼろのヤンダ';
            }
            document.getElementById('monster-img').src = m.imageSrc;
            document.getElementById('monster-name').textContent = m.name;

            m.hp = m.maxHp;
            m.attackPower = 1;
            this._updateMonsterHpUI(m);
            this._showMessage("たいりょくが ぜんかいふくした！", false, 1500, 'text-monster-action');
            this.sound.playSe('heal');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        }
        // Boss 15 ぼうくんティラノザ：にくを食べる（HP<5で発火）
        if (m.bossId === 15 && m.name === 'ぼうくんティラノザ' && m.hp < 5 && !m.hasEatenMeat) {
            m.hasEatenMeat = true;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for damage visualization

            this._showMessage("モンスターが にくを たべた！", false, 3000, 'text-monster-action');
            this.sound.playSe('meat');
            await new Promise(resolve => setTimeout(resolve, 1500));

            m.hp = m.maxHp;
            this._updateMonsterHpUI(m);
            this._showMessage("たいりょくが ぜんかいふくした！", false, 1500, 'text-monster-action');
            this.sound.playSe('heal');
            await new Promise(resolve => setTimeout(resolve, 1500));
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
        const isNewRecord = this._saveMonsterRecord(m, totalTime);

        this.sound.playSe('defeat');
        this._showMessage(`${m.name}\nをたおした！`, false, 1500, 'text-neutral');

        // Fade out
        document.getElementById('monster-img').style.opacity = '0';
        document.getElementById('monster-name').style.opacity = '0';
        document.getElementById('monster-hp-container').style.opacity = '0';

        // Wait for defeat message, then show bonus
        setTimeout(() => {
            let hasBonus = false;

            // Bonuses
            if (m.isSpecial) {
                if (m.name === 'ミスターといし') {
                    // ドロップなし → 武器補正 +1 → ノート登録
                    this.swordBonus += 1;
                    this.sound.playSe('atkup');
                    this._showAtkUpEffect();
                    hasBonus = true;
                    this._showMessage('けんのつよさが\nあがった！', false, 2000, 'text-player-action');
                } else if (m.name === 'ミスターてっぱん') {
                    // ドロップなし → 盾の耐久度 +1 → ノート登録
                    this.shieldDurability += 1;
                    this.sound.playSe('atkup');  // ミスターといしに準ずるため同じSE
                    this._showDefUpEffect();     // ぼうぎょだま使用時と同じエフェクト
                    hasBonus = true;
                    this._showMessage('たてのたいきゅうが\nあがった！', false, 2000, 'text-player-action');
                }

                setTimeout(() => {
                    if (isNewRecord) {
                        this._showNoteRegistration(m.name, () => this._nextMonster());
                    } else {
                        this._nextMonster();
                    }
                }, 2000);
                return; // Specialは独自フロー
            } else if (m.isRare) {
                // レアモンスターは攻撃バフなし（装備ドロップのみ）
                // hasBonus は false のまま → ドロップ演出まで待機なし
            } else if (m.isHeal) {
                this.playerHp = CONSTANTS.PLAYER_MAX_HP;
                this._updatePlayerHpUI();
                this.sound.playSe('heal');
                hasBonus = true;
                this._showMessage("たいりょくが ぜんかいふくした！", false, 2000, 'text-player-action');
            }

            const delayAfterBonus = hasBonus ? 2000 : 0;

            setTimeout(() => {
                // アイテムドロップ抽選
                let swordDropped = false;
                let shieldDropped = false;

                // ドロップする実際の装備レベル（_doSwordDrop / _doShieldDrop に渡す値）
                let dropSwordLevel = this.swordLevel + 1;   // 通常モンスター用のデフォルト
                let dropShieldLevel = this.shieldLevel + 1; // 通常モンスター用のデフォルト

                // レアモンスターは2段階上、なければ1段階上、それもなければドロップなし
                const calcRareSwordLevel = (current) => {
                    if (current + 2 <= 5) return current + 2;
                    if (current + 1 <= 5) return current + 1;
                    return -1;
                };
                const calcRareShieldLevel = (current) => {
                    if (current + 2 <= 6) return current + 2;
                    if (current + 1 <= 6) return current + 1;
                    return -1;
                };

                const nextSwordLevel = this.swordLevel + 1;
                const nextShieldLevel = this.shieldLevel + 1;

                if (m.isRare) {
                    // レアモンスター: 2段階上を確定ドロップ（なければ1段階上、それもなければなし）
                    const rareSwordLevel = calcRareSwordLevel(this.swordLevel);
                    const rareShieldLevel = calcRareShieldLevel(this.shieldLevel);
                    if (rareSwordLevel !== -1) {
                        swordDropped = true;
                        dropSwordLevel = rareSwordLevel;
                    }
                    if (rareShieldLevel !== -1) {
                        shieldDropped = true;
                        dropShieldLevel = rareShieldLevel;
                    }
                } else if (m.isHeal) {
                    // 回復モンスター: 盾を確定で2段階上をドロップ（なければ1段階上、それもなければなし）
                    const healShieldLevel = calcRareShieldLevel(this.shieldLevel);
                    if (healShieldLevel !== -1) {
                        shieldDropped = true;
                        dropShieldLevel = healShieldLevel;
                    }
                } else if (m.number >= 1 && m.number <= 9) {
                    // 通常モンスター: 確率でドロップ
                    if (nextSwordLevel <= 5 && Math.random() < SWORD_DROP_RATE[this.swordLevel]) {
                        swordDropped = true;
                    }
                    if (nextShieldLevel <= 6 && Math.random() < SHIELD_DROP_RATE[this.shieldLevel]) {
                        shieldDropped = true;
                    }
                    // dropSwordLevel / dropShieldLevel はデフォルトの nextSwordLevel / nextShieldLevel のまま
                }

                // ドロップ後にノート登録メッセージを挟むラッパー
                const afterMalle = () => {
                    if (isNewRecord) {
                        this._showNoteRegistration(m.name, () => this._nextMonster());
                    } else {
                        this._nextMonster();
                    }
                };
                const afterDrop = () => {
                    if (m.number === 10) {
                        this._doMalleDrop(m.bossId, afterMalle);
                    } else if (m.isRare) {
                        this._doMalleDrop(null, afterMalle, 500);
                    } else {
                        afterMalle();
                    }
                };

                if (swordDropped && shieldDropped) {
                    // 剣→盾の順でシーケンス実行
                    this._doSwordDrop(dropSwordLevel, () => {
                        this._doShieldDrop(dropShieldLevel, () => afterDrop(), 0);
                    }, 500);
                } else if (swordDropped) {
                    this._doSwordDrop(dropSwordLevel, () => afterDrop(), 500);
                } else if (shieldDropped) {
                    this._doShieldDrop(dropShieldLevel, () => afterDrop(), 500);
                } else {
                    setTimeout(() => afterDrop(), 1500);
                }
            }, delayAfterBonus);

        }, 1500);
    }

    _doSwordDrop(level, onComplete, initialDelay = 1500) {
        const sword = SWORD_DATA[level];
        setTimeout(() => {
            const monsterContainer = document.querySelector('.monster-container');
            const swordImg = document.createElement('img');
            swordImg.src = 'assets/image/equipment/' + sword.img;
            swordImg.className = 'sword-drop-img';
            monsterContainer.appendChild(swordImg);

            this.sound.playSe('item');
            this._updateItemCollection(sword.name);
            this._showMessage(`${sword.name}を\nてにいれた！`, false, 4500, 'text-neutral');

            setTimeout(() => {
                this.swordLevel = level;
                const swordLabelEl = document.getElementById('sword-label');
                swordLabelEl.src = 'assets/image/equipment/' + sword.img;
                swordLabelEl.classList.remove('equip-flash');
                void swordLabelEl.offsetWidth;
                swordLabelEl.classList.add('equip-flash');
                document.getElementById('sword-aura-wrapper').style.display = 'inline-flex';
                this.sound.playSe('equip');
                this._showMessage(`${sword.name}を\nそうびした！`, false, 2000, 'text-neutral');

                setTimeout(() => {
                    swordImg.remove();
                    onComplete();
                }, 2000);
            }, 2000);
        }, initialDelay);
    }

    _doShieldDrop(level, onComplete, initialDelay = 1500) {
        const shield = SHIELD_DATA[level];
        setTimeout(() => {
            const monsterContainer = document.querySelector('.monster-container');
            const shieldImg = document.createElement('img');
            shieldImg.src = 'assets/image/equipment/' + shield.img;
            shieldImg.className = 'sword-drop-img';
            monsterContainer.appendChild(shieldImg);

            this.sound.playSe('item');
            this._updateItemCollection(shield.name);
            this._showMessage(`${shield.name}を\nてにいれた！`, false, 4500, 'text-neutral');

            setTimeout(() => {
                this.shieldLevel = level;
                this.shieldDurability = shield.maxDurability;
                const shieldLabelEl = document.getElementById('shield-label');
                shieldLabelEl.src = 'assets/image/equipment/' + shield.img;
                shieldLabelEl.style.visibility = 'visible';
                shieldLabelEl.classList.remove('equip-flash');
                void shieldLabelEl.offsetWidth;
                shieldLabelEl.classList.add('equip-flash');
                this.sound.playSe('equip');
                this._showMessage(`${shield.name}を\nそうびした！`, false, 2000, 'text-neutral');

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

        this._determineMonster(this.currentMonsterIdx);

        document.getElementById('monster-img').style.opacity = '1'; // Reset fade
        this.showInterval();
    }

    _onGameOver() {
        clearInterval(this.timerIntervalId);
        this.state = GameState.GAME_OVER;
        this.sound.stopBgm();

        if (this.sound.bgmGameover) {
            this.sound.currentBgm = this.sound.bgmGameover;
            this.sound.fadeInBgm(this.sound.bgmGameover, 0.5, 500);
        }

        this._showMessage("ゲームオーバー...", true);
        setTimeout(() => {
            alert("ゲームオーバー！ つぎはまけないぞ！");
            location.reload();
        }, 2000);
    }

    /**
     * モンスターの抽選をおこなう
     * 判定優先順位： 1. Rare 2. Special 3. Heal 4. Normal or Boss
     * 安全装置： HPが6割を下回っている場合、RareおよびSpecial判定は行わない。
     */
    _determineMonster(idx) {
        const m = this.monsters[idx];

        // ボス（最後のモンスター）は抽選対象外
        if (m.number === CONSTANTS.TOTAL_MONSTERS) {
            return;
        }

        // 安全装置判定（HPが6割を下回っているか）
        const isLowHp = this.playerHp < (CONSTANTS.PLAYER_MAX_HP * 0.6);

        // 第1優先：Rare判定
        if (!isLowHp && Math.random() < 0.02) {
            this.monsters[idx] = new Monster(m.number, true, false, m.opCount, m.leftDigits, m.rightDigits, false);
            return;
        }

        // 第2優先：Special判定（一度出たらもう出ない）
        if (!isLowHp) {
            // Find which specials haven't appeared yet
            const availableSpecials = ['ミスターといし', 'ミスターてっぱん'].filter(name => !this.specialMonstersAppeared.includes(name));
            if (availableSpecials.length > 0 && Math.random() < 0.05) {
                // Pick one randomly
                const chosenSpecial = availableSpecials[Math.floor(Math.random() * availableSpecials.length)];
                this.specialMonstersAppeared.push(chosenSpecial);
                this.monsters[idx] = new Monster(m.number, false, false, m.opCount, m.leftDigits, m.rightDigits, chosenSpecial);
                return;
            }
        }

        // 第3優先：回復キャラ判定
        const HEAL_RATE_BY_HP = [0, 0.40, 0.35, 0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0.03, 0.00];
        const healRate = HEAL_RATE_BY_HP[this.playerHp] ?? 0;
        if (Math.random() < healRate) {
            this.monsters[idx] = new Monster(m.number, false, true, m.opCount, m.leftDigits, m.rightDigits, false);
            return;
        }

        // 第4優先：通常（すでに通常なので何もしない）
    }

    _onGameClear() {
        this.state = GameState.RESULT;
        this.sound.stopBgm();
        this.sound.playSe('clear');

        // Play clearBGM after 2.0 seconds
        setTimeout(() => {
            if (this.state === GameState.RESULT && this.sound.bgmClear) {
                this.sound.currentBgm = this.sound.bgmClear;
                this.sound.fadeInBgm(this.sound.bgmClear, 0.5, 500);
            }
        }, 2000);

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

    _openImageModal(src, name, record = null, isItem = false) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('image-modal-img');
        const captionText = document.getElementById('caption');
        modal.classList.add('active');
        modalImg.src = src;

        // Apply yellow glow for items, otherwise default (monster) glow
        if (isItem) {
            modalImg.classList.add('item-zoom-glow');
        } else {
            modalImg.classList.remove('item-zoom-glow');
        }

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

    /**
     * 連続回避カウントに応じてオーラ画像を更新する
     */
    _updateAuraUI() {
        const auraEl = document.getElementById('aura-img');
        if (!auraEl) return;

        let auraFile = null;
        let animDuration = '1.5s'; // 基準
        if (this.specialMoveReady) {
            auraFile = 'ora04.webp';
            animDuration = '0.5s';
        } else if (this.dodgeStreak >= 3) {
            auraFile = 'ora03.webp';
            animDuration = '1.5s';
        } else if (this.dodgeStreak >= 2) {
            auraFile = 'ora02.webp';
            animDuration = '2.5s';
        } else if (this.dodgeStreak >= 1) {
            auraFile = 'ora01.webp';
            animDuration = '3.5s';
        }

        if (auraFile) {
            auraEl.src = `assets/image/other/${auraFile}`;
            auraEl.style.animationDuration = animDuration;
            auraEl.style.display = 'block';
        } else {
            auraEl.style.display = 'none';
        }
    }

    /**
     * 攻撃エフェクト画像をモンスターの上にアニメーション表示する
     * @param {'attack'|'critical'|'swordattack'|'swordcritical'|'spatattack'} type
     */
    _showAttackEffect(type) {
        const el = document.getElementById('attack-effect-img');
        if (!el) return;

        // クラスとsrcをリセット（reflow強制で前回のアニメを確実に終了）
        el.className = 'attack-effect-img';
        el.src = '';
        void el.offsetWidth;

        // typeに応じてファイル名とアニメクラスを決定
        // ファイル名がtypeと異なる場合はマップで変換
        const fileNameMap = { 'spatattack': 'SPattack' };
        const fileName = fileNameMap[type] || type;
        const src = `assets/image/other/${fileName}.webp`;
        let animClass = '';

        if (type === 'spatattack') {
            animClass = 'anim-sp-attack';
        } else if (type === 'swordcritical') {
            animClass = 'anim-crescent';  // 変更: 右上から左下への斬撃
        } else if (type === 'swordattack') {
            animClass = 'anim-slash';     // 変更: 旧クリティカルの三日月
        } else if (type === 'critical') {
            animClass = 'anim-critical-hit'; // 変更: 爆発（クリティカル用1.5倍）
        } else {
            animClass = 'anim-hit';       // 爆発（白黒・カラー共通）：中央でドン
        }

        el.src = src;
        el.classList.add(animClass);

        // アニメーション終了後にクリーンアップ
        el.addEventListener('animationend', () => {
            el.className = 'attack-effect-img';
            el.src = '';
        }, { once: true });
    }

    // -------------------------------------------------------
    // バトル離脱（一時停止 → 確認 → TOP遷移）
    // -------------------------------------------------------
    _onQuitBattleBtnClick() {
        // もしすでに確認画面が出ていたら何もしない
        if (document.getElementById('quit-confirm-overlay').classList.contains('active')) return;

        // ゲームオーバーやリザルト画面では受け付けない
        if (this.state === GameState.GAME_OVER || this.state === GameState.RESULT) return;

        // タイマーを停止
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
        // 一時停止前の状態と経過時間を保存
        this._pausedState = this.state;
        this._pausedElapsed = this.timerStart ? Date.now() - this.timerStart : 0;
        this.state = GameState.TRANSITION;

        document.getElementById('quit-confirm-overlay').classList.add('active');
    }

    _resumeFromQuitConfirm() {
        document.getElementById('quit-confirm-overlay').classList.remove('active');

        // 一時停止前の状態から再開（BATTLE状態だった場合のみタイマーを経過時間分ずらして再起動）
        this.state = this._pausedState || GameState.BATTLE;
        if (this.state === GameState.BATTLE) {
            this.timerStart = Date.now() - (this._pausedElapsed || 0);
            this.timerIntervalId = setInterval(() => this._timerLoop(), 100);
            this._timerLoop();
        }

        this._pausedState = null;
        this._pausedElapsed = 0;
    }

    /**
     * @param {'normal'|'critical'|'sp'} type
     */
    _flashScreen(type = 'normal') {
        const monsterImg = document.getElementById('monster-img');
        const container = document.querySelector('.monster-container');

        // モンスター画像: 点滅（opacity アニメ）
        monsterImg.classList.remove('flash-effect', 'flash-critical', 'flash-sp', 'dodge-effect', 'attack-effect');
        void monsterImg.offsetWidth;
        if (type === 'sp') {
            monsterImg.classList.add('flash-sp');
        } else if (type === 'critical') {
            monsterImg.classList.add('flash-critical');
        } else {
            monsterImg.classList.add('flash-effect');
        }

        // モンスターコンテナ: 揺れ（transform アニメ）
        if (container && type !== 'normal') {
            container.classList.remove('shake-critical-monster', 'shake-sp-monster');
            void container.offsetWidth;
            const shakeClass = type === 'sp' ? 'shake-sp-monster' : 'shake-critical-monster';
            container.classList.add(shakeClass);
            container.addEventListener('animationend', () => {
                container.classList.remove(shakeClass);
            }, { once: true });
        }
    }

    /**
     * 必殺技時にフラクタル雷ボルトをcanvasで描画する
     */
    _showLightning() {
        const container = document.querySelector('.monster-container');
        if (!container) return;

        const canvas = document.createElement('canvas');
        const w = container.offsetWidth || 300;
        const h = container.offsetHeight || 400;
        canvas.width = w;
        canvas.height = h;
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:12;';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const cx = w / 2;
        const cy = h * 0.38;

        // フラクタル分岐で雷ボルトを描画
        function drawBolt(x1, y1, x2, y2, depth) {
            if (depth <= 0) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                return;
            }
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const offset = (Math.random() - 0.5) * len * 0.45;
            const nx = mx + (-dy / len) * offset;
            const ny = my + (dx / len) * offset;
            drawBolt(x1, y1, nx, ny, depth - 1);
            drawBolt(nx, ny, x2, y2, depth - 1);
        }

        let frame = 0;
        const totalFrames = 26;
        const numBolts = 9;
        const angles = Array.from({ length: numBolts }, (_, i) =>
            (i / numBolts) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
        );
        const lengths = Array.from({ length: numBolts }, () => 75 + Math.random() * 75);

        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            if (frame >= totalFrames) {
                container.removeChild(canvas);
                return;
            }
            const alpha = frame < 5
                ? frame / 5
                : Math.max(0, 1 - (frame - 5) / (totalFrames - 5));

            angles.forEach((angle, i) => {
                const len = lengths[i] * (0.75 + Math.random() * 0.5);
                const ex = cx + Math.cos(angle) * len;
                const ey = cy + Math.sin(angle) * len;

                // 外側グロウ（橙）
                ctx.strokeStyle = `rgba(255, 160, 0, ${alpha * 0.55})`;
                ctx.lineWidth = 5;
                ctx.shadowColor = '#ff8c00';
                ctx.shadowBlur = 22;
                drawBolt(cx, cy, ex, ey, 3);

                // 本体（黄）
                ctx.strokeStyle = `rgba(255, 230, 30, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ffe000';
                ctx.shadowBlur = 10;
                drawBolt(cx, cy, ex, ey, 3);

                // コア（白）
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
                ctx.lineWidth = 0.8;
                ctx.shadowBlur = 4;
                drawBolt(cx, cy, ex, ey, 2);
            });

            frame++;
            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Special_モンスター撃破時: 青いグラデーションを下から上に走らせるエフェクト
     */
    _showAtkUpEffect() {
        // ユーザー名があるウィンドウ（ステータスウィンドウ）だけにグラデーションを適用する
        const statusPanel = document.querySelector('.panel-section--status');
        if (!statusPanel) return;

        // 既存のクリップコンテナを除去
        const oldClip = statusPanel.querySelector('.atkup-clip');
        if (oldClip) oldClip.remove();

        // ステータスウィンドウは position:static の場合があるので relative に変更
        const prevPosition = statusPanel.style.position;
        statusPanel.style.position = 'relative';

        // 絶対配置のクリップコンテナ経由でoverflow:hiddenを実現する
        // （statusPanel本体にoverflow:hiddenを当てるとflexレイアウトが崩れるため）
        const clipDiv = document.createElement('div');
        clipDiv.className = 'atkup-clip';
        clipDiv.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:25;';
        statusPanel.appendChild(clipDiv);

        const el = document.createElement('div');
        el.className = 'atkup-effect';
        clipDiv.appendChild(el);

        // アニメーション終了後にクリップコンテナごと削除し、position を元に戻す
        el.addEventListener('animationend', () => {
            clipDiv.remove();
            statusPanel.style.position = prevPosition;
        }, { once: true });
    }

    /**
     * ぼうぎょだま使用時: 黄金グラデーションを下から上に走らせるエフェクト
     */
    _showDefUpEffect() {
        const statusPanel = document.querySelector('.panel-section--status');
        if (!statusPanel) return;

        const oldClip = statusPanel.querySelector('.defup-clip');
        if (oldClip) oldClip.remove();

        const prevPosition = statusPanel.style.position;
        statusPanel.style.position = 'relative';

        const clipDiv = document.createElement('div');
        clipDiv.className = 'defup-clip';
        clipDiv.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:25;';
        statusPanel.appendChild(clipDiv);

        const el = document.createElement('div');
        el.className = 'defup-effect';
        clipDiv.appendChild(el);

        el.addEventListener('animationend', () => {
            clipDiv.remove();
            statusPanel.style.position = prevPosition;
        }, { once: true });
    }

    _shakeScreen() {
        const target = document.querySelector('.screen.active');
        if (!target) return;

        target.classList.remove('shake-effect');
        void target.offsetWidth;
        target.classList.add('shake-effect');
    }

    _dodgeScreen() {
        const monsterImg = document.getElementById('monster-img');
        monsterImg.classList.remove('flash-effect', 'dodge-effect', 'attack-effect', 'damage-effect');
        void monsterImg.offsetWidth; // trigger reflow
        monsterImg.classList.add('dodge-effect');
    }

    _attackScreen() {
        const monsterImg = document.getElementById('monster-img');
        monsterImg.classList.remove('flash-effect', 'dodge-effect', 'attack-effect', 'damage-effect');
        void monsterImg.offsetWidth; // trigger reflow
        monsterImg.classList.add('attack-effect');
    }

    _damageScreen() {
        const monsterImg = document.getElementById('monster-img');
        monsterImg.classList.remove('flash-effect', 'dodge-effect', 'attack-effect', 'damage-effect');
        void monsterImg.offsetWidth; // trigger reflow
        monsterImg.classList.add('damage-effect');
    }

    _showMessage(text, isCrit = false, duration = 1500, extraClass = null) {
        const ov = document.getElementById('message-overlay');
        ov.textContent = text;
        ov.classList.remove('show', 'critical', 'text-player-action', 'text-monster-action', 'text-neutral');
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
        name = name.replace(/^(rare_|heal_|special_|boss\d+next_|boss\d+_|\d+_|lastboss_)/i, '');
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

        if (!monsterName) return false; // 画像なし → 登録スキップ

        const isNew = !collection[monsterName];
        if (isNew) {
            collection[monsterName] = {
                defeated: true,
                fastestTime: time,
                count: 1
            };
        } else {
            const rec = collection[monsterName];
            rec.count = (rec.count || 0) + 1;
            if (time < rec.fastestTime) {
                rec.fastestTime = time;
            }
            // 不要なプロパティを削除（クリーンアップ）
            if (rec.imageSrc) delete rec.imageSrc;
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
        } catch (e) {
            console.warn("Storage write failed", e);
        }
        return isNew;
    }

    _showNoteRegistration(monsterName, onComplete) {
        this.sound.playSe('note');
        this._showMessage(`${monsterName}が\nノートにとうろくされた！`, false, 2000, 'text-neutral');
        setTimeout(onComplete, 2000);
    }

    /* ============================================================
       画面遷移
       ============================================================ */
    showTop() {
        this.state = GameState.TOP;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('top-screen').classList.add('active');
        this.adjustScale();
    }

    showSetup() {
        this.state = GameState.SETUP;
        document.getElementById('top-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.add('active');
        this.adjustScale();
    }

    showNote() {
        this.state = GameState.NOTE;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('note-screen').classList.add('active');
        this.adjustScale();
        this._renderNoteGrid();
    }

    hideNote() {
        this.state = GameState.TOP;
        document.getElementById('note-screen').classList.remove('active');
        document.getElementById('top-screen').classList.add('active');
        this.adjustScale();
    }

    showItemNote() {
        this.state = GameState.ITEM_NOTE;
        document.getElementById('top-screen').classList.remove('active');
        document.getElementById('item-note-screen').classList.add('active');
        this.adjustScale();
        this._renderItemNoteGrid();
    }

    hideItemNote() {
        this.state = GameState.TOP;
        document.getElementById('item-note-screen').classList.remove('active');
        document.getElementById('top-screen').classList.add('active');
        this.adjustScale();
    }

    showShop() {
        this.sound.unlockAll();
        this.state = GameState.SHOP;
        document.getElementById('top-screen').classList.remove('active');
        document.getElementById('shop-screen').classList.add('active');
        this._updateShopGoldDisplay();
        this._renderShopItems();
        this._updateShopClerkSay('enter');
        setTimeout(() => {
            if (this.state === GameState.SHOP) this._updateShopClerkSay('waiting');
        }, 2000);
        this.sound.playShopBgm();
        this.adjustScale();
    }

    hideShop() {
        this._updateShopClerkSay('leave');
        document.getElementById('shop-item-overlay').classList.remove('active');
        setTimeout(() => {
            this.sound.stopBgm();
            this.state = GameState.TOP;
            document.getElementById('shop-screen').classList.remove('active');
            document.getElementById('top-screen').classList.add('active');
            this.adjustScale();
        }, 800);
    }

    /* ============================================================
       ショップ
       ============================================================ */
    _updateShopGoldDisplay() {
        const el = document.getElementById('shop-gold-text');
        if (el) el.textContent = `${this.gold}マール`;
    }

    _updateShopClerkSay(mode) {
        const el = document.getElementById('shop-clerk-quote');
        if (!el) return;
        el.style.display = 'block';
        if (mode === 'enter') {
            el.innerHTML = 'いらっしゃい';
        } else if (mode === 'waiting') {
            el.innerHTML = 'じぶんの こうげきの ときに<br>カバンから つかうんじゃ';
        } else if (mode === 'leave') {
            el.innerHTML = 'またおいで';
        }
    }

    _renderShopItems() {
        const container = document.getElementById('shop-items');
        if (!container) return;
        container.innerHTML = '';
        ITEM_DATA.forEach((item, idx) => {
            const btn = document.createElement('button');
            btn.className = 'shop-item-btn';
            btn.innerHTML = `
                <img src="assets/image/item/${item.img}" alt="${item.name}" class="shop-item-img">
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-price">${item.price}マール</div>
            `;
            btn.addEventListener('click', () => this._openShopItemDetail(idx));
            container.appendChild(btn);
        });
    }

    _openShopItemDetail(idx) {
        this._shopSelectedItemIdx = idx;
        const item = ITEM_DATA[idx];
        document.getElementById('shop-item-detail-img').src = `assets/image/item/${item.img}`;
        document.getElementById('shop-item-detail-name').textContent = item.name;
        document.getElementById('shop-item-detail-desc').textContent = item.desc;
        document.getElementById('shop-item-detail-price').textContent = `${item.price}マール`;
        document.getElementById('shop-item-overlay').classList.add('active');
    }

    _purchaseItem() {
        const idx = this._shopSelectedItemIdx;
        if (idx === null || idx === undefined) return;
        const item = ITEM_DATA[idx];

        const currentCount = this.bag[item.name] || 0;
        if (currentCount >= CONSTANTS.MAX_ITEM) {
            this._showShopMsg('もう もてないぞ！');
            return;
        }
        if (this.gold < item.price) {
            this._showShopMsg('マールが\nたりないよ！');
            return;
        }

        // 購入成功
        this.gold -= item.price;
        this.bag[item.name] = currentCount + 1;
        this._saveBag();
        localStorage.setItem('math_battle_gold', this.gold);
        this._updateItemCollection(item.name);
        this.sound.playSe('buy');
        this._updateShopGoldDisplay();
        this._renderShopItems(); // 個数表示を更新
        this._shopSelectedItemIdx = null;
        document.getElementById('shop-item-overlay').classList.remove('active');
        this._showShopMsg(`${item.name}を\nかった！`);
    }

    _showShopMsg(msg) {
        const ov = document.getElementById('shop-msg-overlay');
        document.getElementById('shop-msg-text').textContent = msg;
        ov.classList.add('active');

        // 1秒後に自動で消える
        if (this._shopMsgTimeout) clearTimeout(this._shopMsgTimeout);
        this._shopMsgTimeout = setTimeout(() => {
            ov.classList.remove('active');
        }, 1000);
    }

    _updateItemCollection(itemName) {
        const STORAGE_KEY = 'math_battle_item_collection_v1';
        let collection = {};
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) collection = JSON.parse(stored);
        } catch (e) { }
        collection[itemName] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    }

    /* ============================================================
       アイテムノート
       ============================================================ */
    _renderItemNoteGrid() {
        const grid = document.getElementById('item-note-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const STORAGE_KEY = 'math_battle_item_collection_v1';
        let collection = {};
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) collection = JSON.parse(stored);
        } catch (e) { }

        const categories = [
            {
                label: 'けん',
                items: SWORD_DATA.filter(Boolean).map(d => ({ name: d.name, img: d.img, dir: 'equipment' }))
            },
            {
                label: 'たて',
                items: SHIELD_DATA.filter(Boolean).map(d => ({ name: d.name, img: d.img, dir: 'equipment' }))
            },
            {
                label: 'どうぐ',
                items: ITEM_DATA.map(d => ({ name: d.name, img: d.img, dir: 'item' }))
            },
        ];

        categories.forEach(cat => {
            const header = document.createElement('div');
            header.className = 'note-category-header';
            header.textContent = cat.label;
            grid.appendChild(header);

            cat.items.forEach(item => {
                const isRegistered = !!collection[item.name];
                const card = document.createElement('div');
                card.className = 'note-card';

                const imgContainer = document.createElement('div');
                imgContainer.className = 'note-img-container';

                const imgEl = document.createElement('img');
                imgEl.src = `assets/image/${item.dir}/${item.img}`;
                imgEl.className = 'note-img';

                const nameEl = document.createElement('div');
                nameEl.className = 'note-name';

                if (!isRegistered) {
                    card.classList.add('undefeated');
                    imgEl.classList.add('silhouette');
                    nameEl.textContent = '？？？';
                } else {
                    imgEl.classList.add('item-note-glow');
                    nameEl.textContent = item.name;
                    card.addEventListener('click', () => {
                        this._openImageModal(`assets/image/${item.dir}/${item.img}`, item.name, null, true);
                    });
                }

                imgContainer.appendChild(imgEl);
                card.appendChild(imgContainer);
                card.appendChild(nameEl);
                grid.appendChild(card);
            });
        });
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
            } else if (filename.toLowerCase().startsWith('special')) {
                category = 'とくべつ';
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
            imgEl.src = `assets/image/monster/${filename}`;
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
                    this._openImageModal(`assets/image/monster/${filename}`, displayName, record);
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

    /* ============================================================
       カバン (バトル中アイテム使用)
       ============================================================ */

    /** バッグデータをlocalStorageから読み込む */
    _loadBag() {
        try {
            const stored = JSON.parse(localStorage.getItem('math_battle_bag') || '{}');
            const bag = {};
            ITEM_DATA.forEach(item => {
                bag[item.name] = Math.max(0, Math.min(CONSTANTS.MAX_ITEM,
                    parseInt(stored[item.name]) || 0));
            });
            return bag;
        } catch (e) {
            const bag = {};
            ITEM_DATA.forEach(item => { bag[item.name] = 0; });
            return bag;
        }
    }

    /** バッグデータをlocalStorageに保存する */
    _saveBag() {
        localStorage.setItem('math_battle_bag', JSON.stringify(this.bag));
    }

    /** カバンを開く（TOPから） */
    showBag() {
        this.state = GameState.BAG;
        document.getElementById('top-screen').classList.remove('active');
        document.getElementById('bag-screen').classList.add('active');
        this.adjustScale();
        this._renderBagGrid();
    }

    hideBag() {
        document.getElementById('bag-detail-overlay').classList.remove('active');
        this.state = GameState.TOP;
        document.getElementById('bag-screen').classList.remove('active');
        document.getElementById('top-screen').classList.add('active');
        this.adjustScale();
    }

    /** カバン画面のアイテムグリッドを描画する */
    _renderBagGrid() {
        const grid = document.getElementById('bag-grid');
        if (!grid) return;
        grid.innerHTML = '';
        ITEM_DATA.forEach(item => {
            const count = this.bag[item.name] || 0;
            const card = document.createElement('div');
            card.className = 'bag-card' + (count === 0 ? ' bag-card--empty' : '');

            const imgEl = document.createElement('img');
            imgEl.src = 'assets/image/item/' + item.img;
            imgEl.className = 'bag-item-img';
            if (count === 0) imgEl.classList.add('bag-img--empty');

            const countEl = document.createElement('div');
            countEl.className = 'bag-item-count';
            countEl.textContent = `×${count}`;

            const nameEl = document.createElement('div');
            nameEl.className = 'bag-item-name';
            nameEl.textContent = item.name;

            card.appendChild(imgEl);
            card.appendChild(countEl);
            card.appendChild(nameEl);

            card.addEventListener('click', () => this._showBagItemDetail(item, count));
            grid.appendChild(card);
        });
    }

    /** カバン画面：アイテム詳細を表示する */
    _showBagItemDetail(item, count) {
        document.getElementById('bag-detail-img').src = 'assets/image/item/' + item.img;
        document.getElementById('bag-detail-name').textContent = item.name;
        document.getElementById('bag-detail-desc').textContent = item.desc;
        document.getElementById('bag-detail-limit').textContent = this._getItemLimitText(item.name);
        document.getElementById('bag-detail-count').textContent = `${count} / ${CONSTANTS.MAX_ITEM}`;
        document.getElementById('bag-detail-overlay').classList.add('active');
    }

    /** アイテムの戦闘中使用制限テキストを返す */
    _getItemLimitText(itemName) {
        switch (itemName) {
            case 'かいふくだま': return 'つかえるかず: なんこでも';
            case 'こうげきだま': return 'つかえるかず: 2こ';
            case 'ぼうぎょだま': return 'つかえるかず: 2こ';
            case 'とげだま': return 'つかえるかず: 1かいのバトルで 3こ';
            case 'どくだま': return 'つかえるかず: 1たいに 1こ';
            case 'まひだま': return 'つかえるかず: 1たいに 1こ';
            case 'せきかだま': return 'つかえるかず: 1たいに 1こ\nボスには つかえない';
            default: return '';
        }
    }

    /** 戦闘中カバンウィンドウを開く */
    _openBattleBag() {
        if (this.state !== GameState.BATTLE || !this.isPlayerTurn) return;
        // タイマーを一時停止
        clearInterval(this.timerIntervalId);
        this.timerIntervalId = null;
        this._pausedElapsed = Date.now() - this.timerStart;
        this.state = GameState.TRANSITION;

        this._battleSelectedItem = null;
        this._renderBattleBagGrid();
        document.getElementById('battle-item-confirm').style.display = 'none';
        document.getElementById('battle-bag-overlay').classList.add('active');
    }

    /** 戦闘中カバンウィンドウを閉じ、バトルを再開する */
    _closeBattleBag() {
        document.getElementById('battle-bag-overlay').classList.remove('active');
        document.getElementById('battle-item-confirm').style.display = 'none';
        this._battleSelectedItem = null;
        // タイマー再開
        this.timerStart = Date.now() - this._pausedElapsed;
        this.state = GameState.BATTLE;
        this.timerIntervalId = setInterval(() => this._timerLoop(), 100);
        this._timerLoop();
    }

    /** 戦闘中カバンのアイテムグリッドを描画する */
    _renderBattleBagGrid() {
        const grid = document.getElementById('battle-bag-grid');
        if (!grid) return;
        grid.innerHTML = '';
        ITEM_DATA.forEach(item => {
            const count = this.bag[item.name] || 0;
            const card = document.createElement('div');
            card.className = 'battle-bag-card' + (count === 0 ? ' battle-bag-card--empty' : '');

            const imgEl = document.createElement('img');
            imgEl.src = 'assets/image/item/' + item.img;
            imgEl.className = 'battle-bag-item-img';
            if (count === 0) imgEl.classList.add('bag-img--empty');

            const countEl = document.createElement('div');
            countEl.className = 'battle-bag-item-count';
            countEl.textContent = `×${count}`;

            const nameEl = document.createElement('div');
            nameEl.className = 'battle-bag-item-name';
            nameEl.textContent = item.name;

            card.appendChild(imgEl);
            card.appendChild(countEl);
            card.appendChild(nameEl);

            if (count > 0) {
                card.addEventListener('click', () => this._onBattleBagItemTap(item.name, card));
            }

            grid.appendChild(card);
        });
    }

    /** 戦闘中カバンでアイテムをタップしたとき */
    _onBattleBagItemTap(itemName, card) {
        // せきかだまはボスには使えない
        if (itemName === 'せきかだま') {
            const sm = this.monsters[this.currentMonsterIdx];
            if (sm.number === 10) {
                this._showBossBlockMsg();
                return;
            }
        }
        if (!this._canUseItem(itemName)) {
            // 使用制限に達している
            this._showItemLimitMsg();
            return;
        }
        // 選択中のカードをハイライト
        document.querySelectorAll('.battle-bag-card.selected').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._battleSelectedItem = itemName;
        document.getElementById('battle-item-confirm').style.display = 'flex';
    }

    /** アイテムが使用可能かチェックする */
    _canUseItem(itemName) {
        if ((this.bag[itemName] || 0) <= 0) return false;
        switch (itemName) {
            case 'かいふくだま': return this.playerHp < CONSTANTS.PLAYER_MAX_HP;
            case 'こうげきだま': return (this._battleItemUsage.こうげきだま || 0) < 2;
            case 'ぼうぎょだま': return (this._battleItemUsage.ぼうぎょだま || 0) < 2;
            case 'とげだま': return (this._monsterItemUsage.とげだま || 0) < 3;
            case 'どくだま': return !this._monsterItemUsage.どくだま;
            case 'まひだま': return !this._monsterItemUsage.まひだま;
            case 'せきかだま': return !this._monsterItemUsage.せきかだま;
            default: return false;
        }
    }

    /** 戦闘中 つかう を実行する */
    _executeBattleItemUse() {
        const itemName = this._battleSelectedItem;
        if (!itemName) return;

        // 念のため再チェック
        if (!this._canUseItem(itemName)) {
            this._showItemLimitMsg();
            document.getElementById('battle-item-confirm').style.display = 'none';
            this._battleSelectedItem = null;
            document.querySelectorAll('.battle-bag-card.selected').forEach(c => c.classList.remove('selected'));
            return;
        }

        // バッグから消費
        this.bag[itemName]--;
        this._saveBag();

        // 使用回数をカウント
        if (itemName === 'こうげきだま') this._battleItemUsage.こうげきだま = (this._battleItemUsage.こうげきだま || 0) + 1;
        if (itemName === 'ぼうぎょだま') this._battleItemUsage.ぼうぎょだま = (this._battleItemUsage.ぼうぎょだま || 0) + 1;
        if (itemName === 'とげだま') this._monsterItemUsage.とげだま = (this._monsterItemUsage.とげだま || 0) + 1;
        if (itemName === 'どくだま') this._monsterItemUsage.どくだま = true;
        if (itemName === 'まひだま') this._monsterItemUsage.まひだま = true;
        if (itemName === 'せきかだま') this._monsterItemUsage.せきかだま = true;

        // 確認パネルと選択状態をリセット
        document.getElementById('battle-item-confirm').style.display = 'none';
        document.querySelectorAll('.battle-bag-card.selected').forEach(c => c.classList.remove('selected'));
        this._battleSelectedItem = null;

        // カバンウィンドウを一時的に隠してアイテム使用演出
        document.getElementById('battle-bag-overlay').classList.remove('active');

        const item = ITEM_DATA.find(i => i.name === itemName);
        this._useItemEffect(item);
    }

    /** アイテム使用演出（カバンウィンドウを閉じた後に実行） */
    _useItemEffect(item) {
        const useImg = document.getElementById('item-use-img');
        useImg.src = 'assets/image/item/' + item.img;
        useImg.classList.remove('item-use-anim');
        void useImg.offsetWidth;
        useImg.classList.add('item-use-anim');
        useImg.style.display = '';

        const m = this.monsters[this.currentMonsterIdx];
        let message = '';
        let thornKill = false;

        switch (item.name) {
            case 'かいふくだま':
                this.playerHp = Math.min(CONSTANTS.PLAYER_MAX_HP, this.playerHp + 5);
                this._updatePlayerHpUI();
                this.sound.playSe('heal');
                message = 'たいりょくが\nかいふくした！';
                break;
            case 'こうげきだま':
                this.swordBonus += 1;
                this.sound.playSe('atkup');
                this._showAtkUpEffect();
                message = 'こうげきりょくが\nあがった！';
                break;
            case 'ぼうぎょだま':
                this.defenseBonus += 1;
                this.sound.playSe('defup');
                this._showDefUpEffect();
                message = 'ぼうぎょりょくが\nあがった！';
                break;
            case 'とげだま': {
                const thornDamage = 3;
                m.hp = Math.max(0, m.hp - thornDamage);
                this._updateMonsterHpUI(m);
                this._flashScreen('hit');
                this.sound.playSe('throw');
                message = `モンスターに\n${thornDamage}ダメージ！`;
                thornKill = m.hp <= 0;
                break;
            }
            case 'どくだま':
                m.isPoisoned = true;
                this._applyMonsterStatusMask('poison');
                this.sound.playSe('doku');
                message = `${m.name}は\nどくになった！`;
                break;
            case 'まひだま':
                m.isParalyzed = true;
                this._applyMonsterStatusMask('paralyzed');
                this.sound.playSe('mahi');
                message = `${m.name}は\nまひした！`;
                break;
            case 'せきかだま':
                m.isStoned = true;
                this.sound.playSe('sekka');
                message = `せきかだまを\nなげた！`;
                break;
        }

        this._showMessage(message, false, 2000, 'text-player-action');

        setTimeout(() => {
            useImg.style.display = 'none';
            useImg.classList.remove('item-use-anim');
            if (thornKill) {
                // とげだまでモンスターを倒した
                this._onMonsterDefeated(m);
            } else {
                // カバンウィンドウを再表示
                this._renderBattleBagGrid();
                document.getElementById('battle-item-confirm').style.display = 'none';
                document.getElementById('battle-bag-overlay').classList.add('active');
            }
        }, 2000);
    }

    /** つかえないよ！メッセージを1.5秒表示する */
    _showItemLimitMsg() {
        const overlay = document.getElementById('item-limit-overlay');
        overlay.classList.add('active');
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 1500);
    }

    /** ボスには きかない！メッセージを1.5秒表示する */
    _showBossBlockMsg() {
        const overlay = document.getElementById('item-limit-overlay');
        const textEl = document.querySelector('.item-limit-text');
        const origText = textEl ? textEl.textContent : '';
        if (textEl) textEl.textContent = 'ボスには きかない！';
        overlay.classList.add('active');
        setTimeout(() => {
            overlay.classList.remove('active');
            if (textEl) textEl.textContent = origText;
        }, 1500);
    }

    /**
     * モンスターに状態異常カラーフィルターをかける。
     * #monster-img の CSS filter を上書きすることで
     * PNG 透明部分を自然に無視してモンスターの形にのみ適用される。
     */
    _applyMonsterStatusMask(type) {
        this._monsterStatusStackCount = (this._monsterStatusStackCount || 0) + 1;
        this._activeStatusVisual = type;
        const monsterImg = document.getElementById('monster-img');
        if (!monsterImg) return;
        const filterMap = {
            poison: 'drop-shadow(0 0 2px rgba(220,100,255,0.9)) drop-shadow(0 0 8px rgba(140,0,255,0.7)) sepia(1) saturate(6) hue-rotate(260deg) brightness(0.72)',
            paralyzed: 'drop-shadow(0 0 2px rgba(255,255,120,0.9)) drop-shadow(0 0 8px rgba(255,210,0,0.8)) sepia(1) saturate(7) hue-rotate(18deg) brightness(1.05)',
            stone: 'drop-shadow(0 0 2px rgba(160,160,160,0.6)) grayscale(1) brightness(0.52) contrast(0.85)'
        };
        monsterImg.style.filter = filterMap[type] || '';
    }

    /** モンスターのステータスカラーフィルターをクリアする */
    _clearMonsterStatusMask() {
        this._activeStatusVisual = null;
        this._monsterStatusStackCount = 0;
        const monsterImg = document.getElementById('monster-img');
        if (monsterImg) monsterImg.style.filter = '';
    }

    /**
     * モンスターターン終了後の状態異常効果を処理する。
     * せきかだま（石化20%）→ どくだま（毒1ダメージ）の順で処理し、
     * 終了後に nextAction() を呼ぶ。
     */
    _afterMonsterTurnEffects(nextAction) {
        const m = this.monsters[this.currentMonsterIdx];
        if (!m || m.hp <= 0) {
            nextAction();
            return;
        }

        // せきかだま: 20%の確率で即死
        if (m.isStoned) {
            if (Math.random() < 0.2) {
                m.hp = 0;
                this._updateMonsterHpUI(m);
                this._applyMonsterStatusMask('stone');
                this._showMessage(`${m.name}は\nいしになった！`, false, 2000, 'text-neutral');
                setTimeout(() => {
                    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
                    this._onMonsterDefeated(m);
                }, 2000);
                return;
            }
        }

        // どくだま: モンスターに1ダメージ
        if (m.isPoisoned) {
            m.hp = Math.max(0, m.hp - 1);
            this._updateMonsterHpUI(m);
            this._showAttackEffect('attack');
            this._showMessage('どくのダメージを\nうけた！', false, 1500, 'text-monster-action');
            this.sound.playSe('attack');
            if (m.hp <= 0) {
                setTimeout(() => {
                    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
                    this._onMonsterDefeated(m);
                }, 1500);
                return;
            }
            setTimeout(() => nextAction(), 1500);
            return;
        }

        nextAction();
    }

    _doMalleDrop(bossId, onComplete, directAmount = null) {
        const amount = directAmount !== null ? directAmount : (BOSS_MALLE_DROP[bossId] || 0);
        if (amount <= 0) {
            onComplete();
            return;
        }

        this.gold = Math.min(this.gold + amount, CONSTANTS.MAX_GOLD);
        localStorage.setItem('math_battle_gold', this.gold);

        // マール画像をモンスターコンテナに表示
        const monsterContainer = document.querySelector('.monster-container');
        const malleImg = document.createElement('img');
        malleImg.src = 'assets/image/item/malle.webp';
        malleImg.className = 'malle-drop-img';
        monsterContainer.appendChild(malleImg);

        this.sound.playSe('malle');
        this._showMessage(`${amount}マールを\nてにいれた！`, false, 3000, 'text-neutral');

        setTimeout(() => {
            malleImg.remove();
            onComplete();
        }, 3000);
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

        // チェックサム追加（同時に不要なデータを削除したコピーを作成）
        const dataToSave = {};
        keys.forEach(k => {
            const entry = { ...collection[k] };
            delete entry.imageSrc;
            dataToSave[k] = entry;
        });

        // 追加データ（ゴールド・カバン・アイテムコレクション）
        dataToSave['_money'] = this.gold;
        dataToSave['_bag'] = { ...this.bag };
        try {
            dataToSave['_item_collection'] = JSON.parse(localStorage.getItem('math_battle_item_collection_v1') || '{}');
        } catch (e) { dataToSave['_item_collection'] = {}; }

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

                // 追加データを取り出す（後方互換: なければデフォルト値）
                const loadedMoney = typeof dataWithoutChecksum['_money'] === 'number' ? dataWithoutChecksum['_money'] : 0;
                const loadedBagRaw = (dataWithoutChecksum['_bag'] && typeof dataWithoutChecksum['_bag'] === 'object')
                    ? dataWithoutChecksum['_bag'] : {};
                const loadedItemCollection = (dataWithoutChecksum['_item_collection'] && typeof dataWithoutChecksum['_item_collection'] === 'object')
                    ? dataWithoutChecksum['_item_collection'] : {};

                // モンスターコレクション以外のキーを除外してクリーンアップ
                // _equippedItemは旧バックアップ互換のため含める
                const EXTRA_KEYS = ['_money', '_bag', '_equippedItem', '_item_collection'];
                EXTRA_KEYS.forEach(k => delete dataWithoutChecksum[k]);
                Object.keys(dataWithoutChecksum).forEach(k => {
                    if (dataWithoutChecksum[k] && dataWithoutChecksum[k].imageSrc) delete dataWithoutChecksum[k].imageSrc;
                });

                // localStorageに上書き保存（_checksumは除外）
                const STORAGE_KEY = 'math_battle_collection_v1';
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithoutChecksum));

                    // ゴールド復元
                    this.gold = Math.min(loadedMoney, CONSTANTS.MAX_GOLD);
                    localStorage.setItem('math_battle_gold', this.gold);

                    // カバン（アイテム個数）復元
                    const restoredBag = {};
                    ITEM_DATA.forEach(item => {
                        restoredBag[item.name] = Math.max(0, Math.min(CONSTANTS.MAX_ITEM,
                            parseInt(loadedBagRaw[item.name]) || 0));
                    });
                    this.bag = restoredBag;
                    this._saveBag();

                    // アイテムコレクション復元
                    localStorage.setItem('math_battle_item_collection_v1', JSON.stringify(loadedItemCollection));

                    alert('セーブデータを よみこんだよ！');
                    if (this.state === GameState.NOTE) {
                        this._renderNoteGrid();
                    }
                    if (this.state === GameState.SHOP) {
                        this._updateShopGoldDisplay();
                        this._renderShopItems();
                    }
                    if (this.state === GameState.BAG) {
                        this._renderBagGrid();
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
