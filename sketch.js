let questions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let gameState = 'start';
let buttonColors = [];
let feedbackTimer = 0;
let lastAnswer = null;
let table = null;
let errorMsg = '';
let allowInput = true;

let results = []; // 每題的紀錄（包含是否答對）
let wrongAnswers = []; // （保留）儲存答錯題目
let fireworks = [];
let fireworksActive = false;
let fwLastSpawn = 0;

function preload() {
    // 同步載入：preload 會等待返回的資源
    table = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
    createCanvas(800, 600);
    textAlign(CENTER, CENTER);
    for (let i = 0; i < 4; i++) buttonColors[i] = color(255);

    // 讀題庫並驗證欄位
    if (table && table.getRowCount && table.getRowCount() > 0) {
        for (let i = 0; i < table.getRowCount(); i++) {
            let q = table.getString(i, '題目') || '';
            let a = table.getString(i, '選項A') || '';
            let b = table.getString(i, '選項B') || '';
            let c = table.getString(i, '選項C') || '';
            let d = table.getString(i, '選項D') || '';
            let ans = (table.getString(i, '正確答案') || '').trim().toUpperCase();
            if (q && a && b && c && d && ans) {
                questions.push({ question: q, options: [a, b, c, d], answer: ans });
            }
        }
    } else {
        errorMsg = '找不到 questions.csv 或檔案為空（請放在同資料夾並用本機伺服器開啟）';
        gameState = 'nodata';
    }

    if (questions.length < 5 && gameState !== 'nodata') {
        errorMsg = `題庫題數不足（目前 ${questions.length} 題），至少需 5 題`;
        gameState = 'nodata';
    }
}

function draw() {
    // 淺藍色背景
    background(200, 230, 255);

    switch (gameState) {
        case 'start': drawStartScreen(); break;
        case 'quiz': drawQuizScreen(); break;
        case 'end': drawEndScreen(); break;
        case 'nodata': drawNoDataScreen(); break;
    }
    if (feedbackTimer > 0) feedbackTimer--;

    // 更新與渲染煙火（若啟動）
    if (fireworksActive) {
        updateFireworks();
        drawFireworks();
    }
}

function drawStartScreen() {
    textSize(40); fill(0); text('選擇題測驗系統', width/2, height/3);
    textSize(24); text('點擊畫面開始測驗', width/2, height/2);
}

function drawQuizScreen() {
    let currentQ = currentQuestions[currentQuestionIndex];
    if (!currentQ) { textSize(24); fill(0); text('題目載入發生錯誤', width/2, height/2); return; }

    textSize(20); fill(0); text(`題目 ${currentQuestionIndex + 1}/5`, width/2, 50);
    textSize(24); text(currentQ.question, width/2, 150);

    let options = ['A','B','C','D'];
    for (let i = 0; i < 4; i++) {
        let y = 250 + i * 70;
        if (mouseY > y && mouseY < y + 50 && mouseX > 200 && mouseX < 600) fill(220); else fill(buttonColors[i]);
        rect(200, y, 400, 50, 10);
        fill(0); text(`${options[i]}. ${currentQ.options[i]}`, width/2, y + 25);
    }

    if (feedbackTimer > 0) {
        textSize(24);
        if (lastAnswer) { fill(0,180,0); text('答對了！', width/2, height - 50); }
        else { fill(180,0,0); text('答錯了！', width/2, height - 50); }
    }
}

function drawEndScreen() {
    textSize(40); fill(0); text('測驗完成！', width/2, 60);
    textSize(32); text(`得分：${score}/5`, width/2, 110);

    // 顯示回饋
    textSize(22);
    let feedback = score === 5 ? '太棒了！完美的表現！' : (score >= 3 ? '做得不錯！還可以更好！' : '再加油！建議重新複習！');
    text(feedback, width/2, 150);

    // 顯示每題（答對綠色、答錯紅色）與正確答案與您選擇
    textSize(16);
    let startY = 190;
    let y = startY;
    let marginX = 40;
    textAlign(LEFT);
    for (let i = 0; i < results.length; i++) {
        let r = results[i];
        // 題目
        if (r.isCorrect) fill(0, 120, 0); else fill(180, 0, 0);
        let qText = `${i+1}. ${r.question}`;
        wrapText(qText, marginX, y, width - marginX * 2, 18);
        // 計算換行高度
        let lines = Math.max(1, Math.ceil(textWidth(qText) / (width - marginX * 2)));
        y += lines * 20;
        // 正確/您的答案（小字）
        fill(80);
        let ansText = `正確：${r.correctLetter}. ${r.correctText}    您選：${r.chosenLetter}. ${r.chosenText}`;
        wrapText(ansText, marginX + 10, y, width - (marginX + 10) * 2, 16);
        let ansLines = Math.max(1, Math.ceil(textWidth(ansText) / (width - (marginX + 10) * 2)));
        y += ansLines * 18 + 8;
        if (y > height - 120) {
            fill(0);
            textAlign(CENTER);
            text('...（更多題目未顯示）', width/2, height - 120);
            break;
        }
    }
    textAlign(CENTER);
    text('點擊畫面重新開始', width/2, height - 40);
}

function drawNoDataScreen() {
    textSize(24); fill(0); text('無法啟動測驗', width/2, height/3);
    textSize(18); fill(120); text(errorMsg, width/2, height/2);
    text('請確認 questions.csv 在同一資料夾並使用本機伺服器（例如 VSCode Live Server）開啟。', width/2, height/2 + 40);
}

function mousePressed() {
    if (gameState === 'start') startQuiz();
    else if (gameState === 'quiz') { if (allowInput) checkAnswer(); }
    else if (gameState === 'end') { resetQuiz(); }
}

function startQuiz() {
    currentQuestions = [];
    results = [];
    wrongAnswers = [];
    let temp = [...questions];
    for (let i = 0; i < 5; i++) {
        let idx = floor(random(temp.length));
        currentQuestions.push(temp[idx]);
        temp.splice(idx,1);
    }
    currentQuestionIndex = 0; score = 0; gameState = 'quiz'; allowInput = true;
    fireworksActive = false;
    fireworks = [];
}

function checkAnswer() {
    allowInput = false;
    let currentQ = currentQuestions[currentQuestionIndex];
    let options = ['A','B','C','D'];
    for (let i = 0; i < 4; i++) {
        let y = 250 + i * 70;
        if (mouseY > y && mouseY < y + 50 && mouseX > 200 && mouseX < 600) {
            let chosenLetter = options[i];
            let chosenText = currentQ.options[i];
            let correctIdx = letterToIndex(currentQ.answer);
            let correctLetter = currentQ.answer;
            let correctText = currentQ.options[correctIdx];
            let isCorrect = (chosenLetter === correctLetter);
            lastAnswer = isCorrect;
            if (isCorrect) score++;
            else {
                wrongAnswers.push({
                    question: currentQ.question,
                    chosenLetter: chosenLetter,
                    chosenText: chosenText,
                    correctLetter: correctLetter,
                    correctText: correctText
                });
            }
            // 記錄每題結果（用於結束畫面顯示）
            results.push({
                question: currentQ.question,
                chosenLetter: chosenLetter,
                chosenText: chosenText,
                correctLetter: correctLetter,
                correctText: correctText,
                isCorrect: isCorrect
            });

            feedbackTimer = 45;
            setTimeout(() => {
                currentQuestionIndex++;
                if (currentQuestionIndex >= 5) {
                    gameState = 'end';
                    startFireworks();
                } else allowInput = true;
            }, 800);
            break;
        }
    }
}

function resetQuiz() {
    gameState = 'start';
    score = 0;
    wrongAnswers = [];
    results = [];
    fireworksActive = false;
    fireworks = [];
}

function letterToIndex(letter) {
    if (!letter) return 0;
    return Math.max(0, Math.min(3, letter.charCodeAt(0) - 65));
}

// 簡單文字換行繪製
function wrapText(str, x, y, maxWidth, lineHeight) {
    let words = str.split(' ');
    let line = '';
    textSize(lineHeight);
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        if (textWidth(testLine) > maxWidth && n > 0) {
            text(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    text(line, x, y);
}

// ---------------- 煙火系統 ----------------
class Particle {
    constructor(x, y, col) {
        this.pos = createVector(x, y);
        let angle = random(TWO_PI);
        let speed = random(1, 6);
        this.vel = p5.Vector.fromAngle(angle).mult(speed);
        this.acc = createVector(0, 0.02);
        this.lifespan = 255;
        this.col = col;
    }
    update() {
        this.vel.mult(0.99);
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.lifespan -= 4;
    }
    finished() {
        return this.lifespan <= 0;
    }
    show() {
        noStroke();
        fill(this.col.levels[0], this.col.levels[1], this.col.levels[2], this.lifespan);
        ellipse(this.pos.x, this.pos.y, 4);
    }
}

class Explosion {
    constructor(x, y) {
        this.particles = [];
        let c = color(random(50,255), random(50,255), random(50,255)); // 彩色
        let count = floor(random(20, 40));
        for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, c));
    }
    update() {
        for (let p of this.particles) p.update();
        this.particles = this.particles.filter(p => !p.finished());
    }
    done() {
        return this.particles.length === 0;
    }
    show() {
        for (let p of this.particles) p.show();
    }
}

function startFireworks() {
    fireworksActive = true;
    fireworks = [];
    fwLastSpawn = millis();
    // 立即產生幾個煙火
    for (let i = 0; i < 4; i++) fireworks.push(new Explosion(random(80, width-80), random(80, height/2)));
}

function updateFireworks() {
    // 週期性新增煙火
    if (millis() - fwLastSpawn > 600) {
        fireworks.push(new Explosion(random(80, width-80), random(80, height/2)));
        fwLastSpawn = millis();
    }
    for (let f of fireworks) f.update();
    fireworks = fireworks.filter(f => !f.done());
    // 若超過一段時間且沒有煙火就停
    if (fireworks.length === 0 && millis() - fwLastSpawn > 1200) fireworksActive = false;
}

function drawFireworks() {
    push();
    blendMode(ADD);
    for (let f of fireworks) f.show();
    pop();
}