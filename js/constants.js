/* Game Constants */
const CONSTANTS = {
    PLAYER_MAX_HP: 10,
    TOTAL_MONSTERS: 10, // Will be updated by calculateTotalMonsters() on load
    TIMER_SECONDS: 10,
    MONSTER_TIMER_SECONDS: 20,  // ★追加：モンスターターンのタイマー（20秒）
    CRITICAL_THRESHOLD: 3.0,
    NORMAL_DAMAGE: 1,
    CRITICAL_DAMAGE: 2,
    FONT_PIXEL: 'DotGothic16, sans-serif',
    MAX_GOLD: 99999,
    MAX_ITEM: 10       // 各アイテムの最大所持数
};

const FORM_CONFIG = {
    ACTION_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSe-dlcdvSBPkMlQ1Zj2S0xV7nmSz-nCK58mp76N7gq4G0PIoQ/formResponse',
    ENTRY_ID: 'entry.2141365113'
};



/* State Management */
const GameState = {
    TOP: 'top',        // ポータル画面（起動時）
    SETUP: 'setup',
    BATTLE: 'battle',
    INTERVAL: 'interval',
    TRANSITION: 'transition',
    GAME_OVER: 'game_over',
    RESULT: 'result',
    NOTE: 'note',       // モンスターノート
    ITEM_NOTE: 'item_note', // アイテムノート
    SHOP: 'shop',       // ショップ
    BAG: 'bag'          // カバン
};

/* Item Data Tables */
const SWORD_DATA = [
    { name: 'きのけん', img: 'sword01.webp', bonus: 0 },
    { name: 'どうのけん', img: 'sword02.webp', bonus: 1 },
    { name: 'てつのけん', img: 'sword03.webp', bonus: 2 },
    { name: 'はがねのけん', img: 'sword04.webp', bonus: 3 },
    { name: 'きんのけん', img: 'sword05.webp', bonus: 4 },
];

const SHIELD_DATA = [
    null, // level 0 = なし
    { name: 'きのたて', img: 'shield01.webp', reduction: 1, maxDurability: 1 },
    { name: 'どうのたて', img: 'shield02.webp', reduction: 2, maxDurability: 2 },
    { name: 'てつのたて', img: 'shield03.webp', reduction: 3, maxDurability: 3 },
    { name: 'はがねのたて', img: 'shield04.webp', reduction: 4, maxDurability: 4 },
    { name: 'きんのたて', img: 'shield05.webp', reduction: 5, maxDurability: 5 },
];

// インデックス = 現在の所持レベル → 次レベルのドロップ率
const SWORD_DROP_RATE = [0.60, 0.40, 0.20, 0.10, 0.04, 0];
const SHIELD_DROP_RATE = [0.40, 0.25, 0.15, 0.07, 0.03, 0];

/* Shop Item Data */
const ITEM_DATA = [
    { name: 'かいふくだま', price: 600, desc: 'たいりょくを かいふくする', img: 'kaihukuDama.webp' },
    { name: 'こうげきだま', price: 1000, desc: 'こうげきりょくを あげる', img: 'kougekiDama.webp' },
    { name: 'ぼうぎょだま', price: 800, desc: 'ぼうぎょりょくを あげる', img: 'bougyoDama.webp' },
    { name: 'とげだま', price: 300, desc: 'モンスターに なげる', img: 'togeDama.webp' },
];

/* Boss Malle Drop Amounts (indexed by bossId 1–16; index 0 unused) */
const BOSS_MALLE_DROP = [0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 1000, 1000];
