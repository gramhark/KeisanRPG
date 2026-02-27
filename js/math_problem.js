class MathProblem {
    constructor(leftDigits, rightDigits, operators, isBoss = false) {
        this.leftDigits = parseInt(leftDigits);
        this.rightDigits = parseInt(rightDigits);
        this.operators = operators; // array of strings
        this.isBoss = isBoss;
        this.left = 0;
        this.right = 0;
        this.operator = '+';
        this.answer = 0;
    }

    _rand(digits) {
        if (this.isBoss) {
            // ボス時：掛け算用に数値下限を引き上げる
            if (digits === 1) return Math.floor(Math.random() * 4) + 6;  // 6-9
            return Math.floor(Math.random() * 50) + 50;                  // 50-99
        }
        if (digits === 1) return Math.floor(Math.random() * 9) + 1; // 1-9
        return Math.floor(Math.random() * 90) + 10; // 10-99
    }

    // 通常範囲の乱数（ボスの＋－抽選用）
    _randNormal(digits) {
        if (digits === 1) return Math.floor(Math.random() * 9) + 1;  // 1-9
        return Math.floor(Math.random() * 90) + 10;  // 10-99
    }

    // 繰り上がり・繰り下がり判定
    _hasBorrow(left, right, op) {
        if (op === '+') {
            // 一の位の合計が10以上 → 繰り上がりあり
            return (left % 10) + (right % 10) >= 10;
        }
        if (op === '-') {
            // 一の位が引けない → 繰り下がりあり
            return (left % 10) < (right % 10);
        }
        return false;
    }

    _generateDivision() {
        // 被除数（左辺）は除数（右辺）より桁数が少ないと整数商≥2が作れないため、
        // 割り算に限り左辺の桁数を右辺の桁数以上に揃える
        const effectiveLeftDigits = Math.max(this.leftDigits, this.rightDigits);

        // Try to generate clean division
        for (let i = 0; i < 200; i++) {
            // Determine Constraints
            const leftMin = effectiveLeftDigits === 1 ? 1 : 10;
            const leftMax = effectiveLeftDigits === 1 ? 9 : 99;
            const rightMin = this.rightDigits === 1 ? 2 : 10;
            const rightMax = this.rightDigits === 1 ? 9 : 99;

            // Strategy: Pick Answer first, then Divisor, then check Dividend
            // Answer range: Must be >= 2 (user request)
            // Max possible answer = leftMax / rightMin
            const maxAnswer = Math.floor(leftMax / rightMin);

            if (maxAnswer < 2) continue;

            // Pick Answer
            // We want answer to be 2..maxAnswer, but cap at 99 (2 digits max)
            const effectiveMaxAnswer = Math.min(99, maxAnswer);
            const minAnswer = (this.isBoss) ? 5 : 2;
            if (effectiveMaxAnswer < minAnswer) continue;
            const answer = Math.floor(Math.random() * (effectiveMaxAnswer - minAnswer + 1)) + minAnswer;

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

        // Fallback
        const fallbackLeft = effectiveLeftDigits === 1 ? 8 : 24;
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

        // 左1桁・右2桁の場合、引き算・割り算は左2桁・右1桁として生成する
        const origLeft = this.leftDigits;
        const origRight = this.rightDigits;
        if (this.leftDigits === 1 && this.rightDigits === 2 &&
            (this.operator === '-' || this.operator === '/')) {
            this.leftDigits = 2;
            this.rightDigits = 1;
        }

        if (this.operator === '/') {
            const div = this._generateDivision();
            this.left = div.left;
            this.right = div.right;
            this.answer = div.answer;
        } else {
            if (this.isBoss && (this.operator === '+' || this.operator === '-')) {
                // ★ボス専用：繰り上がり・繰り下がり保証ロジック
                let attempts = 0;
                do {
                    this.left = this._randNormal(this.leftDigits);
                    this.right = this._randNormal(this.rightDigits);
                    if (this.operator === '-' && this.left < this.right) {
                        [this.left, this.right] = [this.right, this.left];
                    }
                    attempts++;
                } while (!this._hasBorrow(this.left, this.right, this.operator) && attempts < 100);

                // 100回試みても見つからない場合はそのまま使用（フォールバック）
                if (this.operator === '+') {
                    this.answer = this.left + this.right;
                } else {
                    this.answer = this.left - this.right;
                }
            } else {
                // 通常（または×）
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
        }

        // 桁数設定を元に戻す
        this.leftDigits = origLeft;
        this.rightDigits = origRight;

        const opDisplay = { '+': '＋', '-': '－', '*': '×', '/': '÷' }[this.operator];
        this.displayText = `${this.left} ${opDisplay} ${this.right} ＝ `;
        return this.displayText;
    }

    check(val) {
        return parseInt(val) === this.answer;
    }
}
