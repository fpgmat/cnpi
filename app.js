/* ============================================================
   CNPI HUB — app.js
   Lógica principal: Quiz, Banco de Questões, IA
   ============================================================ */

// ── Config ───────────────────────────────────────────────────
const IA_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const IA_MODEL    = 'qwen/qwen3.6-plus:free';
const IA_KEY      = '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';

// ── State ────────────────────────────────────────────────────
let allQuestions       = [];
let quizQuestions      = [];
let currentQIndex      = 0;
let selectedOption     = null;
let answered           = false;
let score              = 0;
let timerInterval      = null;
let timerSeconds       = 0;
let generatedQuestions = [];

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();
  renderBanco();
});

// ── Load Questions from JSON ─────────────────────────────────
async function loadQuestions() {
  try {
    const res  = await fetch('./data/capm.json');
    const data = await res.json();
    allQuestions = data.questoes || [];
    document.getElementById('stat-total').textContent   = allQuestions.length;
    document.getElementById('count-capm').textContent   = allQuestions.length + ' questões';
    document.getElementById('qs-total').textContent     = allQuestions.length + ' questões';
  } catch (e) {
    console.error('Erro ao carregar JSON:', e);
  }
}

// ── Navigation ────────────────────────────────────────────────
function showSection(name) {
  document.getElementById('section-quiz').style.display      = 'none';
  document.getElementById('section-banco').style.display     = 'none';
  document.getElementById('section-ia').style.display        = 'none';
  document.getElementById('section-subjects').style.display  = 'block';
  document.getElementById('hero').style.display              = 'block';

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (name === 'quiz') {
    document.getElementById('hero').style.display             = 'none';
    document.getElementById('section-subjects').style.display = 'none';
    document.getElementById('section-quiz').style.display     = 'block';
    document.getElementById('nav-quiz').classList.add('active');
  } else if (name === 'banco') {
    document.getElementById('hero').style.display             = 'none';
    document.getElementById('section-subjects').style.display = 'none';
    document.getElementById('section-banco').style.display    = 'block';
    document.getElementById('nav-banco').classList.add('active');
  } else if (name === 'ia') {
    document.getElementById('hero').style.display             = 'none';
    document.getElementById('section-subjects').style.display = 'none';
    document.getElementById('section-ia').style.display       = 'block';
    document.getElementById('nav-ia').classList.add('active');
  } else {
    document.getElementById('nav-quiz').classList.add('active');
  }
}

function selectSubject(subject) {
  if (subject === 'capm') { showSection('quiz'); showQuizStart(); }
}

// ── Quiz Start ────────────────────────────────────────────────
function startQuiz() { showSection('quiz'); showQuizStart(); }

function showQuizStart() {
  document.getElementById('quiz-start').style.display   = 'flex';
  document.getElementById('quiz-active').style.display  = 'none';
  document.getElementById('quiz-results').style.display = 'none';
}

function beginQuiz() {
  const shuffle  = document.getElementById('opt-shuffle').checked;
  const useTimer = document.getElementById('opt-timer').checked;

  quizQuestions = [...allQuestions];
  if (shuffle) quizQuestions = shuffleArray(quizQuestions);

  currentQIndex = 0;
  score = 0;
  timerSeconds = 0;

  document.getElementById('quiz-start').style.display   = 'none';
  document.getElementById('quiz-active').style.display  = 'block';
  document.getElementById('quiz-results').style.display = 'none';

  const timerEl = document.getElementById('quiz-timer');
  if (useTimer) {
    timerEl.style.display = 'flex';
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerInterval = setInterval(() => {
      timerSeconds++;
      document.getElementById('timer-display').textContent = formatTime(timerSeconds);
    }, 1000);
  } else {
    timerEl.style.display = 'none';
    clearInterval(timerInterval);
  }
  renderQuestion();
}

function abortQuiz() { clearInterval(timerInterval); showQuizStart(); }

// ── Render Question ───────────────────────────────────────────
function renderQuestion() {
  const q = quizQuestions[currentQIndex];
  if (!q) return;
  selectedOption = null;
  answered = false;

  document.getElementById('q-num').textContent      = 'Questão ' + (currentQIndex + 1);
  document.getElementById('q-current').textContent   = currentQIndex + 1;
  document.getElementById('q-total').textContent     = quizQuestions.length;
  document.getElementById('q-text').textContent      = q.enunciado;

  const pct = (currentQIndex / quizQuestions.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';

  const list = document.getElementById('options-list');
  list.innerHTML = '';
  q.opcoes.forEach((opt, i) => {
    const letter = opt.charAt(0);
    const text   = opt.slice(3);
    const div    = document.createElement('div');
    div.className = 'option-item';
    div.id        = 'opt-' + i;
    div.onclick   = () => selectOption(i, letter);
    div.innerHTML = '<span class="option-letter">' + letter + '</span><span>' + text + '</span>';
    list.appendChild(div);
  });

  const fb = document.getElementById('q-feedback');
  fb.style.display = 'none';
  fb.className = 'question-feedback';

  document.getElementById('btn-confirm').style.display = 'inline-flex';
  document.getElementById('btn-confirm').disabled = true;
  document.getElementById('btn-next').style.display = 'none';

  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
}

function selectOption(index, letter) {
  if (answered) return;
  selectedOption = { index, letter };
  document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('opt-' + index).classList.add('selected');
  document.getElementById('btn-confirm').disabled = false;
}

function confirmAnswer() {
  if (!selectedOption || answered) return;
  answered = true;
  const q = quizQuestions[currentQIndex];
  const isCorrect = selectedOption.letter === q.gabarito;
  if (isCorrect) score++;
  q._userAnswer = selectedOption.letter;

  document.querySelectorAll('.option-item').forEach(el => {
    el.classList.add('disabled');
    const letter = el.querySelector('.option-letter').textContent;
    if (letter === q.gabarito) el.classList.add('correct');
    else if (el.id === 'opt-' + selectedOption.index) el.classList.add('wrong');
  });

  const fb = document.getElementById('q-feedback');
  fb.className = 'question-feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
  fb.innerHTML = '<strong>' + (isCorrect ? 'Correto!' : 'Incorreto!') + '</strong><br/>' + q.explicacao;
  fb.style.display = 'block';

  document.getElementById('btn-confirm').style.display = 'none';
  const btnNext = document.getElementById('btn-next');
  btnNext.style.display = 'inline-flex';
  btnNext.textContent = currentQIndex < quizQuestions.length - 1 ? 'Próxima →' : 'Ver Resultado';
}

function nextQuestion() {
  currentQIndex++;
  if (currentQIndex >= quizQuestions.length) finishQuiz();
  else renderQuestion();
}

// ── Quiz Results ──────────────────────────────────────────────
function finishQuiz() {
  clearInterval(timerInterval);
  const total = quizQuestions.length;
  const pct   = Math.round((score / total) * 100);

  document.getElementById('quiz-active').style.display  = 'none';
  document.getElementById('quiz-results').style.display = 'block';
  document.getElementById('review-section').style.display = 'none';

  document.getElementById('score-num').textContent  = score;
  document.getElementById('score-den').textContent  = '/' + total;
  document.getElementById('results-pct').textContent = pct + '% de acertos';
  document.getElementById('progress-bar').style.width = '100%';

  document.getElementById('results-emoji').textContent = pct >= 80 ? '' : pct >= 60 ? '' : pct >= 40 ? '' : '';

  setTimeout(() => { document.getElementById('results-bar').style.width = pct + '%'; }, 100);
}

function showReview() {
  const revSec = document.getElementById('review-section');
  revSec.style.display = 'block';
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  quizQuestions.forEach((q, i) => {
    const isCorrect = (q._userAnswer === q.gabarito);
    const div = document.createElement('div');
    div.className = 'review-item ' + (isCorrect ? 'review-correct' : 'review-wrong');
    div.innerHTML = '<span class="review-tag ' + (isCorrect ? 'tag-correct' : 'tag-wrong') + '">'
      + (isCorrect ? 'Correto' : 'Incorreto') + '</span>'
      + '<div class="review-q">Q' + (i+1) + '. ' + q.enunciado + '</div>'
      + '<div class="review-exp"> ' + q.explicacao.replace(/</g,'&lt;') + '</div>';
    list.appendChild(div);
  });
  revSec.scrollIntoView({ behavior: 'smooth' });
}

// ── Banco de Questões ─────────────────────────────────────────
function renderBanco(questions) {
  const list = document.getElementById('banco-list');
  list.innerHTML = '';
  const qs = questions || allQuestions;
  qs.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'banco-card';
    card.id = 'banco-' + i;
    const opts = q.opcoes.map(o => {
      const isGab = o.charAt(0) === q.gabarito;
      return '<div class="banco-option ' + (isGab ? 'gabarito' : '') + '">' + o + (isGab ? ' ✓' : '') + '</div>';
    }).join('');
    card.innerHTML = '<div class="banco-card-header" onclick="toggleBancoCard(' + i + ')">'
      + '<span class="banco-num">#' + (i+1) + '</span>'
      + '<span class="banco-q">' + q.enunciado.slice(0, 100) + (q.enunciado.length > 100 ? '…' : '') + '</span>'
      + '<span class="banco-arrow">▶</span></div>'
      + '<div class="banco-card-body">'
      + '<div style="font-size:0.95rem;margin-bottom:1rem;color:var(--text-primary);">' + q.enunciado + '</div>'
      + '<div class="banco-options">' + opts + '</div>'
      + '<div class="banco-exp"> ' + q.explicacao + '</div></div>';
    list.appendChild(card);
  });
}

function toggleBancoCard(i) { document.getElementById('banco-' + i).classList.toggle('open'); }

function filterQuestions() {
  const term = document.getElementById('search-input').value.toLowerCase();
  const filtered = allQuestions.filter(q =>
    q.enunciado.toLowerCase().includes(term) ||
    q.opcoes.some(o => o.toLowerCase().includes(term)) ||
    q.explicacao.toLowerCase().includes(term)
  );
  renderBanco(filtered);
}

function exportJSON() {
  const data = { assunto: 'CAPM', questoes: allQuestions };
  downloadJSON(data, 'cnpi-capm-questoes.json');
}

// ── IA — Gerar Questões ──────────────────────────────────────
async function gerarQuestoes() {
  const assunto    = document.getElementById('ia-assunto').value.trim() || 'CAPM';
  const quantidade = parseInt(document.getElementById('ia-quantidade').value);
  const nivel      = document.getElementById('ia-nivel').value;
  const contexto   = document.getElementById('ia-contexto').value.trim();

  const btnText = document.getElementById('btn-gerar-text');
  const btn     = document.getElementById('btn-gerar');
  btn.disabled  = true;
  btnText.textContent = 'Gerando…';

  document.getElementById('ia-loading').style.display  = 'block';
  document.getElementById('ia-results').style.display  = 'none';
  document.getElementById('ia-error').style.display    = 'none';

  const prompt = buildPrompt(assunto, quantidade, nivel, contexto);

  try {
    const res = await fetch(IA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + IA_KEY,
        'HTTP-Referer': window.location.href
      },
      body: JSON.stringify({
        model: IA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'HTTP ' + res.status);
    }

    const data = await res.json();
    let raw    = data.choices?.[0]?.message?.content || '';
    // Remove markdown code fences se existirem
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(raw);
    generatedQuestions = Array.isArray(parsed) ? parsed : parsed.questoes || [];

    renderIAResults(generatedQuestions, assunto);

  } catch (e) {
    const errDiv = document.getElementById('ia-error');
    errDiv.textContent = 'Erro ao gerar questões: ' + e.message;
    errDiv.style.display = 'block';
    console.error(e);
  } finally {
    document.getElementById('ia-loading').style.display = 'none';
    btn.disabled  = false;
    btnText.textContent = ' Gerar Questões';
  }
}

function buildPrompt(assunto, quantidade, nivel, contexto) {
  return 'Você é um especialista em finanças e mercado de capitais, preparador para o exame CNPI (Certificação Nacional do Profissional de Investimento) da APIMEC.\n\n'
    + 'Gere exatamente ' + quantidade + ' questão(ões) de nível ' + nivel + ' sobre o assunto: "' + assunto + '".\n'
    + (contexto ? 'Contexto adicional: ' + contexto + '\n' : '')
    + '\nREGRAS OBRIGATÓRIAS:\n'
    + '- Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)\n'
    + '- Estilo de prova de certificação profissional (CNPI/CFA)\n'
    + '- Gabarito correto apenas em UMA alternativa\n'
    + '- Explicação técnica detalhada do gabarito\n'
    + '- As questões devem abordar conceitos diferentes entre si\n\n'
    + 'Retorne APENAS um JSON válido, sem markdown, no seguinte formato:\n'
    + '[\n  {\n    "id": 1,\n    "assunto": "' + assunto + '",\n'
    + '    "enunciado": "texto da questão",\n'
    + '    "opcoes": ["A) texto", "B) texto", "C) texto", "D) texto", "E) texto"],\n'
    + '    "gabarito": "A",\n'
    + '    "explicacao": "explicação detalhada"\n  }\n]';
}

function renderIAResults(questions, assunto) {
  const container = document.getElementById('ia-questions-list');
  container.innerHTML = '';
  questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'ia-question-card';
    const opts = (q.opcoes || []).map(o => {
      const isGab = o.charAt(0) === q.gabarito;
      return '<div class="ia-opt ' + (isGab ? 'correct' : '') + '">' + o + (isGab ? ' ✓' : '') + '</div>';
    }).join('');
    card.innerHTML = '<div class="ia-q-text">' + (i+1) + '. ' + q.enunciado + '</div>'
      + '<div class="ia-opts">' + opts + '</div>'
      + '<div class="ia-exp"> ' + q.explicacao + '</div>';
    container.appendChild(card);
  });
  document.getElementById('ia-results').style.display = 'block';
  document.getElementById('ia-results').scrollIntoView({ behavior: 'smooth' });
}

function addToBank() {
  const startId = allQuestions.length + 1;
  generatedQuestions.forEach((q, i) => {
    allQuestions.push({ ...q, id: startId + i, _fromIA: true });
  });
  document.getElementById('stat-total').textContent = allQuestions.length;
  document.getElementById('count-capm').textContent = allQuestions.length + ' questões';
  document.getElementById('qs-total').textContent   = allQuestions.length + ' questões';
  renderBanco();
  showToast(generatedQuestions.length + ' questão(ões) adicionada(s) ao banco!');
}

function exportGeneratedJSON() {
  const data = { assunto: document.getElementById('ia-assunto').value, questoes: generatedQuestions };
  downloadJSON(data, 'cnpi-ia-' + Date.now() + '.json');
}

// ── Utilities ──────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(secs) {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;font-weight:600;padding:12px 24px;border-radius:999px;box-shadow:0 4px 20px rgba(34,197,94,0.4);z-index:9999;animation:fadeIn 0.3s ease;font-family:var(--font);font-size:0.9rem;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
