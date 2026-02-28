/* ============================================================
   モンスター HP・攻撃力テーブル
   ============================================================ */
// インデックス = ステージ番号（1〜9）
const NORMAL_HP = [0, 1, 3, 4, 5, 7, 8, 9, 11, 12];
const NORMAL_ATK = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4];

// インデックス = bossId（1〜16）
const BOSS_HP = [0, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20];
const BOSS_ATK = [0, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7];

/* ============================================================
   Special シリーズ 固有セリフ定義
   Specialモンスターを追加するときはここにセリフを追加する
   ============================================================ */
const SPECIAL_MONSTER_DATA = {
    'ミスターといし': {
        quote: 'ぶきをつよくしてやろうか・・？'
    },
    'ミスターてっぱん': {
        quote: 'たてをつよくしてやろう'
    }
};

class Monster {
    constructor(number, isRare, isHeal, opCount, leftDigits, rightDigits, isSpecial = false) {
        this.number = number;
        this.isRare = isRare;
        this.isHeal = isHeal;
        this.isSpecial = isSpecial; // {boolean}
        this.specialName = (typeof isSpecial === 'string') ? isSpecial : null; // Special monster specific name identifier
        if (this.specialName) this.isSpecial = true;
        this.opCount = opCount;
        this.leftDigits = leftDigits;
        this.rightDigits = rightDigits; // needed for boss06 check logic

        this.hasEatenMeat = false;
        this.hasLickedSap = false;
        this.hasTransformed = false;
        this.isAngry = false;

        // HP
        if (isRare || isHeal || isSpecial) {
            this.maxHp = 1;
        } else if (number === 10) {
            const bId = this.bossId;
            this.maxHp = BOSS_HP[bId] || 10;
        } else {
            this.maxHp = NORMAL_HP[number] || 1;
        }

        // 攻撃力（Rare/Heal/Special はステージ番号に対応する値を使用）
        if (isSpecial) {
            this.attackPower = 1;
        } else if (number === 10) {
            const bId = this.bossId;
            this.attackPower = BOSS_ATK[bId] || 4;
        } else {
            this.attackPower = NORMAL_ATK[number] || 1;
        }

        this.hp = this.maxHp;
        this.name = this._getName();
        this.imageSrc = this._getImageSrc();
    }

    _getName() {
        if (this.isRare) return "レアモンスター";
        if (this.isHeal) return "回復モンスター";
        if (this.isSpecial) return "スペシャルモンスター";
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

/* ============================================================
   ヤン系モンスター 段階的出現制限
   ============================================================ */
// 出現順序リスト（インデックス i のモンスターは 0〜i-1 が図鑑登録済みである必要がある）
const YAN_SERIES_ORDER = [
    'ヤンダ',           // index 0: 前提なし
    'ヤンピ',           // index 1: ヤンダが必要
    'ヤンチ',           // index 2: ヤンダ・ヤンピが必要
    'ヤント',           // index 3: ヤンダ〜ヤンチが必要
    'ヤンダバーン',     // index 4: ヤンダ〜ヤントが必要
    'ヤンピバーン',     // index 5: ヤンダ〜ヤンダバーンが必要
    'ヤンチバーン',     // index 6: ヤンダ〜ヤンピバーンが必要
    'ヤントバーン',     // index 7: ヤンダ〜ヤンチバーンが必要
    'ヤンチヤントバーン', // index 8: ヤンダ〜ヤントバーンが必要
];

/**
 * ヤン系モンスターが出現可能かどうかを判定する。
 * ヤン系以外のモンスターは常に true を返す。
 * @param {string} monsterName - プレフィックス・拡張子を除いたモンスター名
 * @param {Object} collection  - localStorage から読み込んだ図鑑データ
 * @returns {boolean}
 */
function isYanMonsterUnlocked(monsterName, collection) {
    const idx = YAN_SERIES_ORDER.indexOf(monsterName);
    if (idx === -1) return true; // ヤン系ではない → 常に出現可
    // 自分より前の全ヤン系が図鑑に登録済みであることを確認
    for (let i = 0; i < idx; i++) {
        const rec = collection[YAN_SERIES_ORDER[i]];
        if (!rec || !rec.defeated) return false;
    }
    return true;
}

function findMonsterImage(monster) {
    const assets = getMonsterAssets();
    if (assets.length === 0) return '';

    let candidates = [];

    if (monster.isRare) {
        candidates = assets.filter(f => f.toLowerCase().startsWith('rare_'));
    } else if (monster.isHeal) {
        candidates = assets.filter(f => f.toLowerCase().startsWith('heal_'));
    } else if (monster.isSpecial) {
        if (monster.specialName) {
            candidates = assets.filter(f => f.toLowerCase().startsWith(`special_${monster.specialName}.`));
        } else {
            candidates = assets.filter(f => f.toLowerCase().startsWith('special_'));
        }
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

    // ヤン系モンスターの出現制限チェック（Rare・Heal・Special は対象外）
    let collection = {};
    if (!monster.isRare && !monster.isHeal && !monster.isSpecial) {
        try {
            const stored = localStorage.getItem('math_battle_collection_v1');
            if (stored) collection = JSON.parse(stored);
        } catch (e) { }
        candidates = candidates.filter(f => {
            let n = f.replace(/\.(webp|png|jpg|jpeg)$/i, '');
            n = n.replace(/^(rare_|heal_|boss\d+next_|boss\d+_|\d+_|lastboss_)/i, '');
            return isYanMonsterUnlocked(n, collection);
        });
    }

    if (candidates.length === 0) return '';

    // 重み付き抽選：出現条件OK かつ ノート未登録のヤン系は重み 10.0、それ以外は 1.0
    const weights = candidates.map(f => {
        let n = f.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        n = n.replace(/^(rare_|heal_|boss\d+next_|boss\d+_|\d+_|lastboss_)/i, '');
        const isYan = YAN_SERIES_ORDER.indexOf(n) !== -1;
        const inCollection = collection[n] && collection[n].defeated;
        return (isYan && !inCollection) ? 10.0 : 1.0;
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * totalWeight;
    let choice = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { choice = candidates[i]; break; }
    }

    // Update name from filename (Simple parsing: remove prefix, remove extension)
    // E.g. 01_もちもち.webp -> もちもち
    let name = choice.replace(/\.(webp|png|jpg|jpeg)$/i, '');
    // Remove prefixes
    name = name.replace(/^(rare_|heal_|special_|boss\d+next_|boss\d+_|\d+_|lastboss_)/i, '');
    monster.name = name; // Update name in place
    // Special: セリフを設定する
    if (monster.isSpecial) {
        const specialData = SPECIAL_MONSTER_DATA[name];
        monster.quote = specialData ? specialData.quote : '';
    }

    return `assets/image/monster/${choice}`;
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
