/* ============================================================
   CNPI HUB — app.js
   Lógica principal: Quiz, Banco de Questões, IA
   ============================================================ */

// ── Config ───────────────────────────────────────────────────
// Google Apps Script como proxy para a IA (esconde a chave server-side)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxby9xNxVfon6y-CTT0jAELH8Z8OOAkXAGjLAS0NTJ-WIE5emHw-s8YKNpcatXMfm4b/exec';

// ── State ───────────────────────────────────────────────────
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
  currentQIndex = 0; score = 0; timerSeconds = 0;
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
  var q = quizQuestions[currentQIndex];
  if (!q) return;
  selectedOption = null; answered = false;
  document.getElementById('q-num').textContent      = 'Questão ' + (currentQIndex + 1);
  document.getElementById('q-current').textContent   = currentQIndex + 1;
  document.getElementById('q-total').textContent     = quizQuestions.length;
  document.getElementById('q-text').textContent      = q.enunciado;
  var pct = (currentQIndex / quizQuestions.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  var list = document.getElementById('options-list');
  list.innerHTML = '';
  q.opcoes.forEach(function(opt, i) {
    var letter = opt.charAt(0);
    var text   = opt.slice(3);
    var div    = document.createElement('div');
    div.className = 'option-item';
    div.id        = 'opt-' + i;
    div.onclick   = function() { selectOption(i, letter); };
    div.innerHTML = '<span class="option-letter">' + letter + '</span><span>' + text + '</span>';
    list.appendChild(div);
  });
  var fb = document.getElementById('q-feedback');
  fb.style.display = 'none'; fb.className = 'question-feedback';
  document.getElementById('btn-confirm').style.display = 'inline-flex';
  document.getElementById('btn-confirm').disabled = true;
  document.getElementById('btn-next').style.display = 'none';
  var card = document.getElementById('question-card');
  card.style.animation = 'none'; void card.offsetWidth;
  card.style.animation = 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
}

function selectOption(index, letter) {
  if (answered) return;
  selectedOption = { index, letter };
  document.querySelectorAll('.option-item').forEach(function(el) { el.classList.remove('selected'); });
  document.getElementById('opt-' + index).classList.add('selected');
  document.getElementById('btn-confirm').disabled = false;
}

function confirmAnswer() {
  if (!selectedOption || answered) return;
  answered = true;
  var q = quizQuestions[currentQIndex];
  var isCorrect = selectedOption.letter === q.gabarito;
  if (isCorrect) score++;
  q._userAnswer = selectedOption.letter;
  document.querySelectorAll('.option-item').forEach(function(el) {
    el.classList.add('disabled');
    var letter = el.querySelector('.option-letter').textContent;
    if (letter === q.gabarito) el.classList.add('correct');
    else if (el.id === 'opt-' + selectedOption.index) el.classList.add('wrong');
  });
  var fb = document.getElementById('q-feedback');
  fb.className = 'question-feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
  fb.innerHTML = '<strong>' + (isCorrect ? 'Correto!' : 'Incorreto!') + '</strong><br/>' + q.explicacao;
  fb.style.display = 'block';
  document.getElementById('btn-confirm').style.display = 'none';
  var btnNext = document.getElementById('btn-next');
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
  var total = quizQuestions.length;
  var pct   = Math.round((score / total) * 100);
  document.getElementById('quiz-active').style.display  = 'none';
  document.getElementById('quiz-results').style.display = 'block';
  document.getElementById('review-section').style.display = 'none';
  document.getElementById('score-num').textContent  = score;
  document.getElementById('score-den').textContent  = '/' + total;
  document.getElementById('results-pct').textContent = pct + '% de acertos';
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('results-emoji').textContent = pct >= 80 ? '🏆' : pct >= 60 ? '👏' : pct >= 40 ? '📚' : '💪';
  setTimeout(function() { document.getElementById('results-bar').style.width = pct + '%'; }, 100);
}

function showReview() {
  var revSec = document.getElementById('review-section');
  revSec.style.display = 'block';
  var list = document.getElementById('review-list');
  list.innerHTML = '';
  quizQuestions.forEach(function(q, i) {
    var isCorrect = (q._userAnswer === q.gabarito);
    var div = document.createElement('div');
    div.className = 'review-item ' + (isCorrect ? 'review-correct' : 'review-wrong');
    div.innerHTML = '<span class="review-tag ' + (isCorrect ? 'tag-correct' : 'tag-wrong') + '">'
      + (isCorrect ? '✓ Correto' : '✗ Incorreto') + '</span>'
      + '<div class="review-q">Q' + (i+1) + '. ' + q.enunciado + '</div>'
      + '<div class="review-exp">💡 ' + q.explicacao + '</div>';
    list.appendChild(div);
  });
  revSec.scrollIntoView({ behavior: 'smooth' });
}

// ── Banco de Questões ─────────────────────────────────────────
function renderBanco(questions) {
  var list = document.getElementById('banco-list');
  list.innerHTML = '';
  var qs = questions || allQuestions;
  qs.forEach(function(q, i) {
    var card = document.createElement('div');
    card.className = 'banco-card';
    card.id = 'banco-' + i;
    var opts = q.opcoes.map(function(o) {
      var isGab = o.charAt(0) === q.gabarito;
      return '<div class="banco-option ' + (isGab ? 'gabarito' : '') + '">' + o + (isGab ? ' ✓' : '') + '</div>';
    }).join('');
    card.innerHTML = '<div class="banco-card-header" onclick="toggleBancoCard(' + i + ')">'
      + '<span class="banco-num">#' + (i+1) + '</span>'
      + '<span class="banco-q">' + q.enunciado.slice(0, 100) + (q.enunciado.length > 100 ? '…' : '') + '</span>'
      + '<span class="banco-arrow">▶</span></div>'
      + '<div class="banco-card-body">'
      + '<div style="font-size:0.95rem;margin-bottom:1rem;color:var(--text-primary);">' + q.enunciado + '</div>'
      + '<div class="banco-options">' + opts + '</div>'
      + '<div class="banco-exp">💡 ' + q.explicacao + '</div></div>';
    list.appendChild(card);
  });
}

function toggleBancoCard(i) { document.getElementById('banco-' + i).classList.toggle('open'); }

function filterQuestions() {
  var term = document.getElementById('search-input').value.toLowerCase();
  var filtered = allQuestions.filter(function(q) {
    return q.enunciado.toLowerCase().includes(term)
      || q.opcoes.some(function(o) { return o.toLowerCase().includes(term); })
      || q.explicacao.toLowerCase().includes(term);
  });
  renderBanco(filtered);
}

function exportJSON() {
  downloadJSON({ assunto: 'CAPM', questoes: allQuestions }, 'cnpi-capm-questoes.json');
}

// ── IA — Gerar Questões (via Google Apps Script proxy) ───────
async function gerarQuestoes() {
  var assunto    = document.getElementById('ia-assunto').value.trim() || 'CAPM';
  var quantidade = parseInt(document.getElementById('ia-quantidade').value);
  var nivel      = document.getElementById('ia-nivel').value;
  var contexto   = document.getElementById('ia-contexto').value.trim();

  var btnText = document.getElementById('btn-gerar-text');
  var btn     = document.getElementById('btn-gerar');
  btn.disabled  = true;
  btnText.textContent = 'Gerando...';

  document.getElementById('ia-loading').style.display  = 'block';
  document.getElementById('ia-results').style.display  = 'none';
  document.getElementById('ia-error').style.display    = 'none';

  var prompt = buildPrompt(assunto, quantidade, nivel, contexto);

  try {
    // O Apps Script faz o redirect 302 para /exec. O fetch segue.
    var firstRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ prompt: prompt })
    });

    var data;
    if (firstRes.ok) {
      data = await firstRes.json();
    } else {
      // Fallback: GET com prompt na URL (workaround para alguns navegadores)
      var encoded = encodeURIComponent(prompt);
      var res2 = await fetch(APPS_SCRIPT_URL + '?prompt=' + encoded);
      data = await res2.json();
    }

    if (data && data.error) {
      throw new Error(data.error);
    }
    if (!data || !data.questoes || !data.questoes.length) {
      throw new Error('A IA não retornou questões. Tente outro prompt.');
    }

    generatedQuestions = data.questoes;
    renderIAResults(generatedQuestions, assunto);

  } catch (e) {
    var errDiv = document.getElementById('ia-error');
    errDiv.textContent = 'Erro: ' + e.message;
    errDiv.style.display = 'block';
    console.error(e);
  } finally {
    document.getElementById('ia-loading').style.display = 'none';
    btn.disabled  = false;
    btnText.textContent = '⚡ Gerar Questões';
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
    + 'Retorne SOMENTE um JSON array válido, sem markdown, sem texto antes ou depois, no formato:\n'
    + '[{"id":1,"assunto":"X","enunciado":"texto","opcoes":["A) texto","B) texto","C) texto","D) texto","E) texto"],"gabarito":"A","explicacao":"explicação detalhada"}]';
}

function renderIAResults(questions, assunto) {
  var container = document.getElementById('ia-questions-list');
  container.innerHTML = '';
  questions.forEach(function(q, i) {
    var card = document.createElement('div');
    card.className = 'ia-question-card';
    var opts = (q.opcoes || []).map(function(o) {
      var isGab = o.charAt(0) === q.gabarito;
      return '<div class="ia-opt ' + (isGab ? 'correct' : '') + '">' + o + (isGab ? ' ✓' : '') + '</div>';
    }).join('');
    card.innerHTML = '<div class="ia-q-text">' + (i+1) + '. ' + q.enunciado + '</div>'
      + '<div class="ia-opts">' + opts + '</div>'
      + '<div class="ia-exp">💡 ' + q.explicacao + '</div>';
    container.appendChild(card);
  });
  document.getElementById('ia-results').style.display = 'block';
  document.getElementById('ia-results').scrollIntoView({ behavior: 'smooth' });
}

function addToBank() {
  var startId = allQuestions.length + 1;
  generatedQuestions.forEach(function(q, i) {
    allQuestions.push({ ...q, id: startId + i, _fromIA: true });
  });
  document.getElementById('stat-total').textContent = allQuestions.length;
  document.getElementById('count-capm').textContent = allQuestions.length + ' questões';
  document.getElementById('qs-total').textContent   = allQuestions.length + ' questões';
  renderBanco();
  showToast('✅ ' + generatedQuestions.length + ' questão(ões) adicionada(s) ao banco!');
}

function exportGeneratedJSON() {
  downloadJSON({ assunto: document.getElementById('ia-assunto').value, questoes: generatedQuestions }, 'cnpi-ia-' + Date.now() + '.json');
}

// ── Utilities ────────────────────────────────────────────────
function shuffleArray(arr) {
  var a = [...arr];
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(secs) {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

function downloadJSON(data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg) {
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;font-weight:600;padding:12px 24px;border-radius:999px;box-shadow:0 4px 20px rgba(34,197,94,0.4);z-index:9999;font-size:0.9rem;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}
