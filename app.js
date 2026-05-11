(function () {
  'use strict';

  const QUESTIONS = window.QUESTIONS || [];
  const SOURCES = window.SOURCES || [];
  const ERAS = ['전체', '선사·초기 국가', '삼국·가야·남북국', '고려', '조선 전기', '조선 후기', '개항기·대한 제국', '일제강점기', '현대', '종합·문화사'];
  const STORE_KEY = 'hanneungQuizProgress.v1';
  const LIST_STEP = 350;

  const el = {
    stats: document.getElementById('stats'),
    search: document.getElementById('searchInput'),
    level: document.getElementById('levelFilter'),
    round: document.getElementById('roundFilter'),
    status: document.getElementById('statusFilter'),
    eraChips: document.getElementById('eraChips'),
    randomBtn: document.getElementById('randomBtn'),
    clearRandomBtn: document.getElementById('clearRandomBtn'),
    resetFilters: document.getElementById('resetFilters'),
    listCount: document.getElementById('listCount'),
    showMore: document.getElementById('showMore'),
    list: document.getElementById('questionList'),
    empty: document.getElementById('emptyState'),
    view: document.getElementById('questionView'),
    meta: document.getElementById('questionMeta'),
    title: document.getElementById('questionTitle'),
    bookmark: document.getElementById('bookmarkBtn'),
    cropMode: document.getElementById('cropModeBtn'),
    pageMode: document.getElementById('pageModeBtn'),
    pageOpen: document.getElementById('pageOpenLink'),
    cropWrap: document.getElementById('cropWrap'),
    pageWrap: document.getElementById('pageWrap'),
    choices: document.getElementById('choiceButtons'),
    marks: document.getElementById('markButtons'),
    answerStatus: document.getElementById('answerStatus'),
    correctAnswer: document.getElementById('correctAnswer'),
    note: document.getElementById('noteInput'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    downloadProgress: document.getElementById('downloadProgress'),
    importProgress: document.getElementById('importProgress')
  };

  let filters = {
    era: '전체',
    level: '전체',
    round: '전체',
    status: 'all',
    search: ''
  };
  let progress = loadProgress();
  let selectedId = null;
  let filtered = [];
  let randomSet = null;
  let visibleCount = LIST_STEP;
  let currentMode = 'crop';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress() {
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    renderStats();
  }

  function recordFor(id) {
    if (!progress[id]) progress[id] = { choice: null, mark: 'unset', note: '', star: false, updatedAt: null };
    return progress[id];
  }

  function hasChoice(rec) {
    return rec && rec.choice !== null && rec.choice !== undefined;
  }

  function choiceSymbol(n) {
    const symbols = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤' };
    return symbols[Number(n)] || '-';
  }

  function markFor(q, rec) {
    if (!hasChoice(rec)) return 'unset';
    if (q && q.answer) return Number(rec.choice) === Number(q.answer) ? 'correct' : 'wrong';
    return rec.mark || 'unset';
  }

  function syncAutoMark(q, rec) {
    if (!rec) return;
    if (!hasChoice(rec)) {
      rec.mark = 'unset';
    } else if (q && q.answer) {
      rec.mark = Number(rec.choice) === Number(q.answer) ? 'correct' : 'wrong';
    }
  }

  function initFilters() {
    el.level.innerHTML = ['전체', ...Array.from(new Set(QUESTIONS.map(q => q.level))).sort()].map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    const rounds = Array.from(new Set(QUESTIONS.map(q => q.round))).sort((a, b) => b - a);
    el.round.innerHTML = `<option value="전체">전체</option>` + rounds.map(r => `<option value="${r}">${r}회</option>`).join('');
    el.eraChips.innerHTML = ERAS.map(era => `<button class="era-chip${era === '전체' ? ' active' : ''}" data-era="${escapeHtml(era)}">${escapeHtml(era)}</button>`).join('');
  }

  function applyFilters() {
    const term = normalize(filters.search);
    let pool = QUESTIONS.filter(q => {
      if (filters.era !== '전체' && q.era !== filters.era) return false;
      if (filters.level !== '전체' && q.level !== filters.level) return false;
      if (filters.round !== '전체' && String(q.round) !== String(filters.round)) return false;
      const rec = progress[q.id];
      const mark = markFor(q, rec);
      if (filters.status === 'unsolved' && hasChoice(rec)) return false;
      if (filters.status === 'answered' && !hasChoice(rec)) return false;
      if (filters.status === 'correct' && mark !== 'correct') return false;
      if (filters.status === 'wrong' && mark !== 'wrong') return false;
      if (filters.status === 'bookmarked' && !rec?.star) return false;
      if (term) {
        const hay = normalize(`${q.id} ${q.round}회 ${q.level} ${q.question}번 ${q.era} ${q.source} ${q.textSnippet || ''}`);
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (randomSet) {
      const set = new Set(randomSet);
      pool = pool.filter(q => set.has(q.id));
    }
    filtered = pool;
    if (!filtered.some(q => q.id === selectedId)) selectedId = filtered[0]?.id || null;
    renderStats();
    renderList();
    renderSelected();
  }

  function normalize(str) {
    return String(str || '').replace(/\s+/g, '').toLowerCase();
  }

  function renderStats() {
    const total = QUESTIONS.length;
    let answered = 0, wrong = 0, correct = 0, starred = 0, score = 0, maxScore = 0;
    for (const q of QUESTIONS) {
      maxScore += Number(q.points || 0);
      const rec = progress[q.id];
      if (!rec) continue;
      if (hasChoice(rec)) answered += 1;
      const mark = markFor(q, rec);
      if (mark === 'wrong') wrong += 1;
      if (mark === 'correct') {
        correct += 1;
        score += Number(q.points || 0);
      }
      if (rec.star) starred += 1;
    }
    const sourceCount = SOURCES.length || new Set(QUESTIONS.map(q => q.source)).size;
    el.stats.innerHTML = [
      ['전체 문항', total.toLocaleString('ko-KR')],
      ['현재 표시', filtered.length.toLocaleString('ko-KR')],
      ['선택 완료', answered.toLocaleString('ko-KR')],
      ['맞음 / 틀림', `${correct.toLocaleString('ko-KR')} / ${wrong.toLocaleString('ko-KR')}`],
      ['누적 점수', `${score.toLocaleString('ko-KR')} / ${maxScore.toLocaleString('ko-KR')}`],
      ['소스 PDF', sourceCount.toLocaleString('ko-KR')]
    ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  function statusBadges(q) {
    const rec = progress[q.id];
    const out = [];
    if (hasChoice(rec)) out.push(`<span class="badge">선택 ${choiceSymbol(rec.choice)}</span>`);
    const mark = markFor(q, rec);
    if (mark === 'correct') out.push(`<span class="badge correct">맞음 +${q.points || 0}</span>`);
    if (mark === 'wrong') out.push(`<span class="badge wrong">틀림</span>`);
    if (rec?.star) out.push('<span class="badge star">즐겨찾기</span>');
    if (!out.length) out.push(`<span class="badge">미풀이 · ${q.points || 0}점</span>`);
    return out.join('');
  }

  function renderList() {
    el.listCount.textContent = `${filtered.length.toLocaleString('ko-KR')}문항`;
    const slice = filtered.slice(0, visibleCount);
    el.showMore.hidden = visibleCount >= filtered.length;
    el.list.innerHTML = slice.map(q => {
      const active = q.id === selectedId ? ' active' : '';
      const snippet = q.textSnippet ? `<p class="q-snippet">${escapeHtml(q.textSnippet)}</p>` : '';
      return `<button class="q-card${active}" data-id="${q.id}">
        <div class="row"><span class="q-title">${q.round}회 ${q.level} ${q.question}번</span><span class="badge">${escapeHtml(q.era)}</span></div>
        <div class="row" style="margin-top:.45rem"><span class="badge">${q.year || ''}</span><span>${statusBadges(q)}</span></div>
        ${snippet}
      </button>`;
    }).join('');
  }

  function renderSelected() {
    const q = QUESTIONS.find(item => item.id === selectedId);
    if (!q) {
      el.empty.hidden = false;
      el.view.hidden = true;
      return;
    }
    const rec = recordFor(q.id);
    el.empty.hidden = true;
    el.view.hidden = false;
    el.meta.textContent = `${q.year || ''} · 제${q.round}회 · ${q.level} · ${q.source} · ${q.page}쪽 · 분류: ${q.era}`;
    el.title.textContent = `${q.question}번`;
    el.bookmark.textContent = rec.star ? '즐겨찾기 해제' : '즐겨찾기';
    el.bookmark.classList.toggle('active', !!rec.star);
    el.pageOpen.href = q.image;
    renderChoices(q, rec);
    renderAnswerPanel(q, rec);
    el.note.value = rec.note || '';
    renderImage(q);
    renderList();
    updateNavButtons();
  }

  function renderChoices(q, rec) {
    const mark = markFor(q, rec);
    el.choices.innerHTML = [1, 2, 3, 4, 5].map(n => {
      const classes = [];
      if (Number(rec.choice) === n) classes.push('active');
      if (hasChoice(rec) && q.answer && n === Number(q.answer)) classes.push('correct-choice');
      if (hasChoice(rec) && q.answer && Number(rec.choice) === n && n !== Number(q.answer)) classes.push('wrong-choice');
      const label = choiceSymbol(n);
      return `<button class="${classes.join(' ')}" data-choice="${n}" aria-pressed="${Number(rec.choice) === n}">${label}</button>`;
    }).join('');
    el.choices.dataset.mark = mark;
  }

  function renderAnswerPanel(q, rec) {
    if (!el.answerStatus || !el.correctAnswer) {
      renderMarks(rec);
      return;
    }
    if (q.answer) {
      el.marks.hidden = true;
      const mark = markFor(q, rec);
      el.answerStatus.className = `answer-status ${mark}`;
      if (!hasChoice(rec)) {
        el.answerStatus.textContent = '선택지를 누르면 즉시 자동 채점됩니다.';
        el.correctAnswer.textContent = `배점 ${q.points || 0}점 · 정답은 선택 후 표시`;
      } else if (mark === 'correct') {
        el.answerStatus.textContent = `맞음 · ${q.points || 0}점 획득`;
        el.correctAnswer.textContent = `정답 ${choiceSymbol(q.answer)}`;
      } else {
        el.answerStatus.textContent = '틀림';
        el.correctAnswer.textContent = `내 선택 ${choiceSymbol(rec.choice)} · 정답 ${choiceSymbol(q.answer)} · 배점 ${q.points || 0}점`;
      }
      return;
    }
    el.marks.hidden = false;
    el.answerStatus.className = 'answer-status unset';
    el.answerStatus.textContent = '정답 정보 없음 · 자가채점 모드';
    el.correctAnswer.textContent = '';
    renderMarks(rec);
  }

  function renderMarks(rec) {
    el.marks.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mark === (rec.mark || 'unset'));
    });
  }

  function renderImage(q) {
    el.cropWrap.innerHTML = `<img alt="제${q.round}회 ${q.question}번 문항 이미지" src="${q.image}">`;
    el.pageWrap.innerHTML = `<img alt="제${q.round}회 ${q.page}쪽 전체 이미지" src="${q.image}">`;
    setMode(currentMode);
    const img = el.cropWrap.querySelector('img');
    img.addEventListener('load', () => layoutCrop(q), { once: true });
    requestAnimationFrame(() => layoutCrop(q));
  }

  function layoutCrop(q) {
    if (!q || !el.cropWrap.querySelector('img')) return;
    const parentWidth = Math.max(260, el.cropWrap.parentElement.clientWidth - 4);
    const [x, y, w, h] = q.crop;
    const scale = Math.min(parentWidth / w, 1.25);
    const img = el.cropWrap.querySelector('img');
    el.cropWrap.style.width = `${Math.round(w * scale)}px`;
    el.cropWrap.style.height = `${Math.round(h * scale)}px`;
    img.style.width = `${Math.round(q.pageW * scale)}px`;
    img.style.height = `${Math.round(q.pageH * scale)}px`;
    img.style.left = `${Math.round(-x * scale)}px`;
    img.style.top = `${Math.round(-y * scale)}px`;
  }

  function setMode(mode) {
    currentMode = mode;
    el.cropWrap.hidden = mode !== 'crop';
    el.pageWrap.hidden = mode !== 'page';
    el.cropMode.classList.toggle('active', mode === 'crop');
    el.pageMode.classList.toggle('active', mode === 'page');
  }

  function updateNavButtons() {
    const idx = filtered.findIndex(q => q.id === selectedId);
    el.prev.disabled = idx <= 0;
    el.next.disabled = idx < 0 || idx >= filtered.length - 1;
  }

  function chooseQuestion(id) {
    selectedId = id;
    renderSelected();
    if (window.matchMedia('(max-width: 980px)').matches) {
      document.querySelector('.viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function attachEvents() {
    el.search.addEventListener('input', debounce(() => {
      filters.search = el.search.value.trim();
      visibleCount = LIST_STEP;
      randomSet = null;
      applyFilters();
    }, 140));
    el.level.addEventListener('change', () => { filters.level = el.level.value; visibleCount = LIST_STEP; randomSet = null; applyFilters(); });
    el.round.addEventListener('change', () => { filters.round = el.round.value; visibleCount = LIST_STEP; randomSet = null; applyFilters(); });
    el.status.addEventListener('change', () => { filters.status = el.status.value; visibleCount = LIST_STEP; applyFilters(); });
    el.eraChips.addEventListener('click', e => {
      const btn = e.target.closest('button[data-era]');
      if (!btn) return;
      filters.era = btn.dataset.era;
      randomSet = null;
      visibleCount = LIST_STEP;
      el.eraChips.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      applyFilters();
    });
    el.list.addEventListener('click', e => {
      const card = e.target.closest('.q-card');
      if (card) chooseQuestion(card.dataset.id);
    });
    el.showMore.addEventListener('click', () => { visibleCount += LIST_STEP; renderList(); });
    el.resetFilters.addEventListener('click', () => {
      filters = { era: '전체', level: '전체', round: '전체', status: 'all', search: '' };
      randomSet = null;
      visibleCount = LIST_STEP;
      el.search.value = '';
      el.level.value = '전체';
      el.round.value = '전체';
      el.status.value = 'all';
      el.eraChips.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.era === '전체'));
      applyFilters();
    });
    el.randomBtn.addEventListener('click', () => {
      const base = filtered.length ? filtered : QUESTIONS;
      randomSet = shuffle(base.map(q => q.id)).slice(0, Math.min(20, base.length));
      visibleCount = LIST_STEP;
      selectedId = randomSet[0] || null;
      applyFilters();
    });
    el.clearRandomBtn.addEventListener('click', () => { randomSet = null; applyFilters(); });
    el.bookmark.addEventListener('click', () => {
      if (!selectedId) return;
      const rec = recordFor(selectedId);
      rec.star = !rec.star;
      rec.updatedAt = Date.now();
      saveProgress();
      renderSelected();
    });
    el.cropMode.addEventListener('click', () => setMode('crop'));
    el.pageMode.addEventListener('click', () => setMode('page'));
    el.choices.addEventListener('click', e => {
      const btn = e.target.closest('button[data-choice]');
      if (!btn || !selectedId) return;
      const q = QUESTIONS.find(item => item.id === selectedId);
      const rec = recordFor(selectedId);
      const choice = Number(btn.dataset.choice);
      rec.choice = rec.choice === choice ? null : choice;
      syncAutoMark(q, rec);
      rec.updatedAt = Date.now();
      saveProgress();
      renderSelected();
    });
    el.marks.addEventListener('click', e => {
      const btn = e.target.closest('button[data-mark]');
      if (!btn || !selectedId) return;
      const q = QUESTIONS.find(item => item.id === selectedId);
      if (q && q.answer) return;
      const rec = recordFor(selectedId);
      rec.mark = btn.dataset.mark;
      rec.updatedAt = Date.now();
      saveProgress();
      renderMarks(rec);
      renderList();
    });
    el.note.addEventListener('input', debounce(() => {
      if (!selectedId) return;
      const rec = recordFor(selectedId);
      rec.note = el.note.value;
      rec.updatedAt = Date.now();
      saveProgress();
    }, 250));
    el.prev.addEventListener('click', () => moveSelection(-1));
    el.next.addEventListener('click', () => moveSelection(1));
    el.downloadProgress.addEventListener('click', exportProgress);
    el.importProgress.addEventListener('change', importProgress);
    window.addEventListener('resize', debounce(() => {
      const q = QUESTIONS.find(item => item.id === selectedId);
      if (q) layoutCrop(q);
    }, 120));
    document.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (/^[1-5]$/.test(e.key) && selectedId) {
        const q = QUESTIONS.find(item => item.id === selectedId);
        const rec = recordFor(selectedId);
        rec.choice = Number(e.key);
        syncAutoMark(q, rec);
        rec.updatedAt = Date.now();
        saveProgress();
        renderSelected();
      } else if (e.key === 'ArrowLeft') moveSelection(-1);
      else if (e.key === 'ArrowRight') moveSelection(1);
      else if (e.key.toLowerCase() === 'b' && selectedId) el.bookmark.click();
    });
  }

  function moveSelection(delta) {
    const idx = filtered.findIndex(q => q.id === selectedId);
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < filtered.length) chooseQuestion(filtered[nextIdx].id);
  }

  function exportProgress() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'hanneungQuizProgress.v1',
      progress
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanneung-progress-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importProgress(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = parsed.progress || parsed;
        progress = { ...progress, ...incoming };
        saveProgress();
        applyFilters();
      } catch (err) {
        alert('진도 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  initFilters();
  attachEvents();
  filtered = QUESTIONS.slice();
  selectedId = QUESTIONS[0]?.id || null;
  applyFilters();
})();
