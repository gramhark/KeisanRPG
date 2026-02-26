class SoundManager {
    constructor() {
        this.bgmBattle = document.getElementById('bgm-battle');
        this.bgmBoss = document.getElementById('bgm-boss');
        this.bgmRare = document.getElementById('bgm-rare');
        this.bgmHeal = document.getElementById('bgm-heal');
        this.bgmClear = document.getElementById('bgm-clear');
        this.bgmGameover = document.getElementById('bgm-gameover');
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
        this.seEquip = document.getElementById('se-equip');
        this.seCrush = document.getElementById('se-crush');
        this.seMiss = document.getElementById('se-miss');
        this.seDodge = document.getElementById('se-dodge');
        this.seSPAttack = document.getElementById('se-spatattack');
        this.bgmBossAngry = document.getElementById('bgm-bossangry');
        this.seNote = document.getElementById('se-note');
        this.bgmSpecial = document.getElementById('bgm-special');
        this.seAtkUp = document.getElementById('se-atkup');
        this.seBuy = document.getElementById('se-buy');
        this.seDefUp = document.getElementById('se-defup');
        this.seThrow = document.getElementById('se-throw');
        this.seMalle = document.getElementById('se-malle');

        // Load sources
        this.bgmBattle.src = 'assets/audio/BGM/battle.webm';
        this.bgmBoss.src = 'assets/audio/BGM/Bossbattle.webm';
        this.bgmRare.src = 'assets/audio/BGM/Rarebattle.webm';
        this.bgmHeal.src = 'assets/audio/BGM/Healbattle.webm';
        this.bgmClear.src = 'assets/audio/BGM/clearBGM.webm';
        this.bgmGameover.src = 'assets/audio/BGM/gameover.webm';
        this.seAttack.src = 'assets/audio/SE/attack.webm';
        this.seCritical.src = 'assets/audio/SE/critical.webm';
        this.seDamage.src = 'assets/audio/SE/damage.webm';
        this.seDefeat.src = 'assets/audio/SE/defeat.webm';
        this.seClear.src = 'assets/audio/SE/clear.webm';
        this.seLastboss.src = 'assets/audio/BGM/lastboss.webm'; // Using as BGM originally
        this.seHeal.src = 'assets/audio/SE/heal.webm';
        this.seMeat.src = 'assets/audio/SE/meat.webm';
        this.seSap.src = 'assets/audio/SE/sap.webm';
        this.seItem.src = 'assets/audio/SE/item.webm';
        this.seSwordAttack.src = 'assets/audio/SE/swordattack.webm';
        this.seSwordCritical.src = 'assets/audio/SE/swordcritical.webm';
        this.seShieldDamage.src = 'assets/audio/SE/shielddamage.webm';
        this.seEquip.src = 'assets/audio/SE/equip.webm';
        this.seCrush.src = 'assets/audio/SE/crush.webm';
        this.seMiss.src = 'assets/audio/SE/miss.webm';
        this.seDodge.src = 'assets/audio/SE/dodge.webm';
        this.seSPAttack.src = 'assets/audio/SE/SPattack.webm';
        this.bgmBossAngry.src = 'assets/audio/BGM/Bossangry.webm';
        this.seNote.src = 'assets/audio/SE/note.webm';
        this.bgmSpecial.src = 'assets/audio/BGM/mrtoisi.webm';
        this.seAtkUp.src = 'assets/audio/SE/ATKup.webm';
        this.seBuy.src = 'assets/audio/SE/buy.webm';
        this.seDefUp.src = 'assets/audio/SE/DEFup.webm';
        this.seThrow.src = 'assets/audio/SE/throw.webm';
        this.seMalle.src = 'assets/audio/SE/malle.webm';

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

    fadeInBgm(bgm, targetVolume = 0.5, durationMs = 500) {
        if (bgm._fadeInterval) clearInterval(bgm._fadeInterval);
        bgm.volume = 0;
        bgm.play().catch(e => console.log('Audio play failed', e));
        let currentVol = 0;
        const stepTime = 50;
        const steps = durationMs / stepTime;
        const volumeStep = targetVolume / steps;
        bgm._fadeInterval = setInterval(() => {
            currentVol += volumeStep;
            if (currentVol < targetVolume) {
                bgm.volume = currentVol;
            } else {
                bgm.volume = targetVolume;
                clearInterval(bgm._fadeInterval);
                bgm._fadeInterval = null;
            }
        }, stepTime);
    }

    playBgm(isBoss, isRare = false, isHeal = false, isSpecial = false) {
        // Stop current if different
        let target = this.bgmBattle;
        if (isBoss) target = this.bgmBoss;
        else if (isRare) target = this.bgmRare;
        else if (isHeal) target = this.bgmHeal;
        else if (isSpecial) target = this.bgmSpecial;
        if (this.currentBgm && this.currentBgm !== target) {
            if (this.currentBgm._fadeInterval) clearInterval(this.currentBgm._fadeInterval);
            this.currentBgm.pause();
            // 通常戦闘BGM以外から切り替えるときは頭出し（通常BGMは途中から再開させるためリセットしない）
            if (this.currentBgm !== this.bgmBattle) {
                this.currentBgm.currentTime = 0;
            }
        }
        if (this.currentBgm !== target || target.paused) {
            this.currentBgm = target;
            if (target === this.bgmRare || target === this.bgmHeal || target === this.bgmSpecial) {
                this.fadeInBgm(target, 0.5, 1000); // Specialは1秒FI
            } else {
                this.currentBgm.volume = 0.5;
                this.currentBgm.play().catch(e => console.log('Audio play failed (user interact needed)', e));
            }
        }
    }

    stopBgm() {
        if (this.currentBgm) {
            if (this.currentBgm._fadeInterval) clearInterval(this.currentBgm._fadeInterval);
            this.currentBgm.pause();
            this.currentBgm = null;
        }

        // 全BGMをリセット（ゲームオーバー/タイトル戻り時用）
        [this.bgmBattle, this.bgmBoss, this.bgmRare, this.bgmHeal, this.bgmClear, this.bgmGameover, this.bgmBossAngry, this.bgmSpecial].forEach(bgm => {
            if (bgm && bgm._fadeInterval) clearInterval(bgm._fadeInterval);
            if (bgm) bgm.pause();
            if (bgm) bgm.currentTime = 0;
        });

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
            case 'equip': se = this.seEquip; break;
            case 'crush': se = this.seCrush; break;
            case 'miss': se = this.seMiss; break;
            case 'dodge': se = this.seDodge; break;
            case 'spatattack': se = this.seSPAttack; break;
            case 'note': se = this.seNote; break;
            case 'atkup': se = this.seAtkUp; break;
            case 'buy': se = this.seBuy; break;
            case 'defup': se = this.seDefUp; break;
            case 'throw': se = this.seThrow; break;
            case 'malle': se = this.seMalle; break;
        }
        if (se) {
            se.currentTime = 0;
            se.play().catch(() => { });
        }
    }

    playBossAngryBgm() {
        // 現在のBGMを一時停止してボスいかりBGMへ差し替え（0.5秒フェードイン）
        if (this.currentBgm) {
            if (this.currentBgm._fadeInterval) clearInterval(this.currentBgm._fadeInterval);
            this.currentBgm.pause();
        }
        this.currentBgm = this.bgmBossAngry;
        this.bgmBossAngry.currentTime = 0;
        this.fadeInBgm(this.bgmBossAngry, 0.5, 500);
    }

    unlockAll() {
        // iOSのオートプレイ制限をAudioContextの無音再生で解除する
        // （個別のaudio要素をplay/pauseする方式はiOSでpauseが間に合わず全音源が鳴るため使用しない）
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const buffer = ctx.createBuffer(1, 1, 22050); // 無音バッファ
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            source.onended = () => {
                ctx.close().catch(() => { });
            };
        } catch (e) {
            // AudioContextが使えない環境は無視
            console.warn('unlockAll: AudioContext not available', e);
        }
    }
}
