(function () {
  'use strict';

  const QUESTIONS = window.QUESTIONS || [];
  const SOURCES = window.SOURCES || [];
  const EXPLANATIONS = window.EXPLANATIONS || {};
  const ERAS = ['전체', '선사·초기 국가', '삼국·가야·남북국', '고려', '조선 전기', '조선 후기', '개항기·대한 제국', '일제강점기', '현대', '문화', '문화유산'];
  const HERITAGE_QUESTION_IDS = new Set([
    '26H-08', '26H-20', '26H-29',
    '27H-04', '27H-06', '27H-08', '27H-15', '27H-21', '27H-29',
    '28H-09', '28H-10', '28H-15', '28H-37',
    '29H-09', '29H-16', '29H-30',
    '30H-10', '30H-28',
    '31H-08', '31H-10', '31H-13', '31H-18', '31H-28', '31H-39',
    '32H-06', '32H-07', '32H-12', '32H-19',
    '33H-09', '33H-22', '33H-40',
    '34H-04', '34H-07', '34H-16', '34H-24',
    '51S-04', '51S-08', '51S-09', '51S-20',
    '52S-05', '52S-06', '52S-14', '52S-17',
    '54S-05', '54S-09', '54S-16',
    '56S-04', '56S-16', '56S-33',
    '58S-08', '58S-16',
    '62S-05', '62S-12', '62S-13', '62S-27', '62S-48',
    '70S-05', '70S-22', '70S-31',
    '71S-07', '71S-16', '71S-33',
    '72S-10', '72S-17', '72S-50',
    '75S-03', '75S-04', '75S-18',
    '76S-04', '76S-16', '76S-17', '76S-46',
    '77S-04', '77S-13', '77S-27'
  ]);
  const STORE_KEY = 'hanneungQuizProgress.v1';
  const SYNC_CONFIG_KEY = 'hanneungQuizSync.v1';
  const CLIENT_KEY = 'hanneungQuizClient.v1';
  const SYNC_FILE = 'hanneung-progress.json';
  const AUTO_SYNC_DELAY = 1400;
  const LIST_STEP = 350;

  const el = {
    stats: document.getElementById('stats'),
    search: document.getElementById('searchInput'),
    level: document.getElementById('levelFilter'),
    round: document.getElementById('roundFilter'),
    status: document.getElementById('statusFilter'),
    setSize: document.getElementById('setSizeFilter'),
    studySummary: document.getElementById('studySummary'),
    eraChips: document.getElementById('eraChips'),
    wrongOnlyBtn: document.getElementById('wrongOnlyBtn'),
    randomBtn: document.getElementById('randomBtn'),
    unsolvedSetBtn: document.getElementById('unsolvedSetBtn'),
    reviewSetBtn: document.getElementById('reviewSetBtn'),
    clearRandomBtn: document.getElementById('clearRandomBtn'),
    resetFilters: document.getElementById('resetFilters'),
    clearStatusFiltered: document.getElementById('clearStatusFiltered'),
    clearStatusAll: document.getElementById('clearStatusAll'),
    sessionStrip: document.getElementById('sessionStrip'),
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
    copyQuestion: document.getElementById('copyQuestionBtn'),
    saveQuestion: document.getElementById('saveQuestionBtn'),
    previewQuestion: document.getElementById('previewQuestionBtn'),
    shareStatus: document.getElementById('shareStatus'),
    shareDebugPanel: document.getElementById('shareDebugPanel'),
    shareDebug: document.getElementById('shareDebug'),
    pageOpen: document.getElementById('pageOpenLink'),
    cropWrap: document.getElementById('cropWrap'),
    pageWrap: document.getElementById('pageWrap'),
    textPanel: document.getElementById('textPanel'),
    questionText: document.getElementById('questionText'),
    choices: document.getElementById('choiceButtons'),
    clearChoice: document.getElementById('clearChoiceBtn'),
    answerStatus: document.getElementById('answerStatus'),
    correctAnswer: document.getElementById('correctAnswer'),
    explanationBox: document.getElementById('explanationBox'),
    explanationText: document.getElementById('explanationText'),
    note: document.getElementById('noteInput'),
    prev: document.getElementById('prevBtn'),
    nextUnsolved: document.getElementById('nextUnsolvedBtn'),
    next: document.getElementById('nextBtn'),
    downloadProgress: document.getElementById('downloadProgress'),
    importProgress: document.getElementById('importProgress'),
    syncToken: document.getElementById('syncToken'),
    syncGistId: document.getElementById('syncGistId'),
    syncAuto: document.getElementById('syncAuto'),
    syncCreate: document.getElementById('syncCreateBtn'),
    syncPull: document.getElementById('syncPullBtn'),
    syncPush: document.getElementById('syncPushBtn'),
    syncForget: document.getElementById('syncForgetBtn'),
    syncStatus: document.getElementById('syncStatus')
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
  let activeSetLabel = '';
  let visibleCount = LIST_STEP;
  let currentMode = 'crop';
  let syncConfig = loadSyncConfig();
  let syncTimer = null;
  let syncBusy = false;
  let pendingSync = false;
  let shareStatusTimer = null;
  let previewObjectUrl = null;

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeProgress(parsed);
    } catch (e) {
      return {};
    }
  }

  function loadSyncConfig() {
    try {
      const raw = localStorage.getItem(SYNC_CONFIG_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        token: parsed.token || '',
        gistId: parsed.gistId || '',
        auto: !!parsed.auto
      };
    } catch (e) {
      return { token: '', gistId: '', auto: false };
    }
  }

  function saveSyncConfig() {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(syncConfig));
  }

  function normalizeProgress(obj) {
    const out = {};
    for (const [id, rec] of Object.entries(obj || {})) {
      if (!rec || typeof rec !== 'object') continue;
      const next = {
        choice: rec.choice === undefined ? null : rec.choice,
        note: rec.note || '',
        star: !!rec.star,
        updatedAt: rec.updatedAt || null
      };
      if (next.choice !== null) next.choice = Number(next.choice);
      if (rec.cleared && next.choice === null && !next.note && !next.star) next.cleared = true;
      if (next.choice === null && !next.note && !next.star && !next.cleared) continue;
      out[id] = next;
    }
    return out;
  }

  function saveProgress(options = {}) {
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    renderStats();
    if (!options.skipSync) queueAutoSync();
  }

  function recordFor(id) {
    if (!progress[id]) progress[id] = { choice: null, note: '', star: false, updatedAt: null };
    return progress[id];
  }

  function hasChoice(rec) {
    return rec && rec.choice !== null && rec.choice !== undefined;
  }

  function hasGradingStatus(rec) {
    return hasChoice(rec);
  }

  function resetGradingStatus(id) {
    const rec = progress[id];
    if (!rec || !hasGradingStatus(rec)) return false;
    rec.choice = null;
    rec.updatedAt = Date.now();
    markRecordState(rec);
    return true;
  }

  function markRecordState(rec) {
    if (!rec) return;
    if (hasChoice(rec) || rec.note || rec.star) {
      delete rec.cleared;
      return;
    }
    rec.cleared = true;
  }

  function choiceSymbol(n) {
    const symbols = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤' };
    return symbols[Number(n)] || '-';
  }

  function markFor(q, rec) {
    if (!hasChoice(rec)) return 'unset';
    if (!q || !q.answer) return 'unknown';
    return Number(rec.choice) === Number(q.answer) ? 'correct' : 'wrong';
  }

  function initFilters() {
    el.level.innerHTML = ['전체', ...Array.from(new Set(QUESTIONS.map(q => q.level))).sort()].map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    const rounds = Array.from(new Set(QUESTIONS.map(q => q.round))).sort((a, b) => b - a);
    el.round.innerHTML = `<option value="전체">전체</option>` + rounds.map(r => `<option value="${r}">${r}회</option>`).join('');
    el.eraChips.innerHTML = ERAS.map(era => `<button class="era-chip${era === '전체' ? ' active' : ''}" data-era="${escapeHtml(era)}">${escapeHtml(era)}</button>`).join('');
  }

  function matchesEra(q, era) {
    if (era === '전체') return true;
    if (era === '문화') return q.era === '문화' || q.era === '종합·문화사';
    if (era === '문화유산') return isHeritageQuestion(q);
    return q.era === era;
  }

  function isHeritageQuestion(q) {
    return q.era === '문화유산' || HERITAGE_QUESTION_IDS.has(q.id);
  }

  function matchesBaseFilters(q, term = normalize(filters.search)) {
    if (!matchesEra(q, filters.era)) return false;
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
      const hay = normalize(`${q.id} ${q.round}회 ${q.level} ${q.question}번 ${q.era} ${q.source} ${q.textSnippet || ''} ${explanationFor(q)}`);
      if (!hay.includes(term)) return false;
    }
    return true;
  }

  function baseFilteredQuestions() {
    const term = normalize(filters.search);
    return QUESTIONS.filter(q => matchesBaseFilters(q, term));
  }

  function applyFilters() {
    let pool = baseFilteredQuestions();
    if (randomSet) {
      const set = new Set(randomSet);
      const order = new Map(randomSet.map((id, index) => [id, index]));
      pool = pool
        .filter(q => set.has(q.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    filtered = pool;
    if (el.wrongOnlyBtn) el.wrongOnlyBtn.classList.toggle('active', filters.status === 'wrong');
    if (!filtered.some(q => q.id === selectedId)) selectedId = filtered[0]?.id || null;
    renderStats();
    renderSessionStrip();
    renderList();
    renderSelected();
  }

  function renderSessionStrip() {
    if (!el.sessionStrip) return;
    if (!randomSet) {
      el.sessionStrip.hidden = true;
      el.sessionStrip.innerHTML = '';
      return;
    }
    const metrics = metricFor(filtered);
    el.sessionStrip.hidden = false;
    el.sessionStrip.innerHTML = `
      <strong>${escapeHtml(activeSetLabel || '학습 세트')}</strong>
      <span>${metrics.answered.toLocaleString('ko-KR')} / ${metrics.total.toLocaleString('ko-KR')} 풀이</span>
      <span>정답률 ${metrics.accuracy}%</span>`;
  }

  function normalize(str) {
    return String(str || '').replace(/\s+/g, '').toLowerCase();
  }

  function renderStats() {
    const global = metricFor(QUESTIONS);
    const current = metricFor(filtered);
    el.stats.innerHTML = [
      ['전체 문항', global.total.toLocaleString('ko-KR')],
      ['현재 표시', current.total.toLocaleString('ko-KR')],
      ['풀이 완료', global.answered.toLocaleString('ko-KR')],
      ['정답률', `${global.accuracy}%`],
      ['정답 / 오답', `${global.correct.toLocaleString('ko-KR')} / ${global.wrong.toLocaleString('ko-KR')}`],
      ['누적 점수', `${global.score.toLocaleString('ko-KR')} / ${global.maxScore.toLocaleString('ko-KR')}`],
      ['오늘 풀이', global.todayAnswered.toLocaleString('ko-KR')],
      ['즐겨찾기', global.starred.toLocaleString('ko-KR')]
    ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
    renderStudySummary(current);
  }

  function metricFor(items) {
    const metrics = {
      total: items.length,
      answered: 0,
      wrong: 0,
      correct: 0,
      starred: 0,
      score: 0,
      maxScore: 0,
      todayAnswered: 0,
      remaining: 0,
      accuracy: 0,
      completion: 0
    };
    const todayStart = startOfToday();
    for (const q of items) {
      metrics.maxScore += Number(q.points || 0);
      const rec = progress[q.id];
      if (!rec) continue;
      if (hasChoice(rec)) {
        metrics.answered += 1;
        if ((Number(rec.updatedAt) || 0) >= todayStart) metrics.todayAnswered += 1;
      }
      const mark = markFor(q, rec);
      if (mark === 'wrong') metrics.wrong += 1;
      if (mark === 'correct') {
        metrics.correct += 1;
        metrics.score += Number(q.points || 0);
      }
      if (rec.star) metrics.starred += 1;
    }
    metrics.remaining = Math.max(0, metrics.total - metrics.answered);
    metrics.accuracy = metrics.answered ? Math.round((metrics.correct / metrics.answered) * 100) : 0;
    metrics.completion = metrics.total ? Math.round((metrics.answered / metrics.total) * 100) : 0;
    return metrics;
  }

  function renderStudySummary(metrics = metricFor(filtered)) {
    if (!el.studySummary) return;
    const range = filterLabel();
    const weakEra = weakEraFor(filtered);
    const score = `${metrics.score.toLocaleString('ko-KR')} / ${metrics.maxScore.toLocaleString('ko-KR')}점`;
    el.studySummary.innerHTML = `
      <div class="summary-main">
        <span>${escapeHtml(range)}</span>
        <strong>${metrics.completion}% 완료</strong>
        <em>${metrics.answered.toLocaleString('ko-KR')} / ${metrics.total.toLocaleString('ko-KR')}문항</em>
      </div>
      <div class="summary-meter" aria-hidden="true"><span style="width:${metrics.completion}%"></span></div>
      <div class="summary-pills">
        <span>정답률 ${metrics.accuracy}%</span>
        <span>남은 문항 ${metrics.remaining.toLocaleString('ko-KR')}</span>
        <span>오답 ${metrics.wrong.toLocaleString('ko-KR')}</span>
        <span>점수 ${score}</span>
        <span>${escapeHtml(weakEra)}</span>
      </div>`;
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  function filterLabel() {
    const labels = [];
    if (filters.era !== '전체') labels.push(filters.era);
    if (filters.level !== '전체') labels.push(filters.level);
    if (filters.round !== '전체') labels.push(`${filters.round}회`);
    if (filters.status !== 'all') labels.push(statusLabel(filters.status));
    if (filters.search) labels.push(`검색: ${filters.search}`);
    return labels.length ? labels.join(' · ') : '전체 범위';
  }

  function statusLabel(value) {
    return {
      unsolved: '미풀이',
      answered: '풀이 완료',
      correct: '정답',
      wrong: '오답',
      bookmarked: '즐겨찾기'
    }[value] || '전체';
  }

  function weakEraFor(items) {
    const counts = new Map();
    for (const q of items) {
      if (markFor(q, progress[q.id]) !== 'wrong') continue;
      counts.set(q.era, (counts.get(q.era) || 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? `오답 집중 ${top[0]} ${top[1].toLocaleString('ko-KR')}문항` : '오답 없음';
  }

  function statusBadges(q) {
    const rec = progress[q.id];
    const out = [];
    if (hasChoice(rec)) out.push(`<span class="badge">선택 ${choiceSymbol(rec.choice)}</span>`);
    const mark = markFor(q, rec);
    if (mark === 'correct') out.push(`<span class="badge correct">정답 +${q.points || 0}</span>`);
    if (mark === 'wrong') out.push(`<span class="badge wrong">오답</span>`);
    if (hasExplanation(q)) out.push('<span class="badge">해설</span>');
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
    const rec = progress[q.id] || { choice: null, note: '', star: false, updatedAt: null };
    el.empty.hidden = true;
    el.view.hidden = false;
    el.meta.textContent = `${q.year || ''} · 제${q.round}회 · ${q.level} · ${q.source} · ${q.page}쪽 · 분류: ${q.era}`;
    el.title.textContent = `${q.question}번`;
    el.bookmark.textContent = rec.star ? '즐겨찾기 해제' : '즐겨찾기';
    el.bookmark.classList.toggle('active', !!rec.star);
    el.pageOpen.href = q.image;
    renderChoices(q, rec);
    renderAnswerPanel(q, rec);
    renderExplanationPanel(q, rec);
    el.note.value = rec.note || '';
    renderImage(q);
    renderQuestionText(q);
    renderList();
    updateNavButtons();
  }

  function renderChoices(q, rec) {
    el.choices.innerHTML = [1, 2, 3, 4, 5].map(n => {
      const classes = [];
      if (Number(rec.choice) === n) classes.push('active');
      if (hasChoice(rec) && q.answer && n === Number(q.answer)) classes.push('correct-choice');
      if (hasChoice(rec) && q.answer && Number(rec.choice) === n && n !== Number(q.answer)) classes.push('wrong-choice');
      const label = choiceSymbol(n);
      return `<button class="${classes.join(' ')}" data-choice="${n}" aria-pressed="${Number(rec.choice) === n}">${label}</button>`;
    }).join('');
  }

  function renderAnswerPanel(q, rec) {
    if (!el.answerStatus || !el.correctAnswer) return;
    if (el.clearChoice) el.clearChoice.disabled = !hasChoice(rec);
    const mark = markFor(q, rec);
    el.answerStatus.className = `answer-status ${mark === 'unknown' ? 'unset' : mark}`;
    if (!hasChoice(rec)) {
      el.answerStatus.textContent = '선택지를 누르면 즉시 자동 채점됩니다.';
      el.correctAnswer.textContent = `배점 ${q.points || 0}점 · 정답은 선택 후 표시`;
    } else if (!q.answer) {
      el.answerStatus.textContent = '정답 정보가 없어 자동 채점할 수 없습니다.';
      el.correctAnswer.textContent = `내 선택 ${choiceSymbol(rec.choice)} · 배점 ${q.points || 0}점`;
    } else if (mark === 'correct') {
      el.answerStatus.textContent = `정답 · ${q.points || 0}점 획득`;
      el.correctAnswer.textContent = `정답 ${choiceSymbol(q.answer)}`;
    } else {
      el.answerStatus.textContent = '오답';
      el.correctAnswer.textContent = `내 선택 ${choiceSymbol(rec.choice)} · 정답 ${choiceSymbol(q.answer)} · 배점 ${q.points || 0}점`;
    }
  }

  function explanationFor(q) {
    if (!q) return '';
    const direct = q.explanation;
    const mapped = EXPLANATIONS[q.id];
    const value = mapped === undefined ? direct : mapped;
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
      return String(value.explanation || value.text || '').trim();
    }
    return '';
  }

  function hasExplanation(q) {
    return !!explanationFor(q);
  }

  function renderExplanationPanel(q, rec) {
    if (!el.explanationBox || !el.explanationText) return;
    const text = explanationFor(q);
    el.explanationBox.classList.toggle('empty', !text);
    if (!text) {
      el.explanationText.textContent = '등록된 해설이 없습니다. data/explanations.js에 문항 ID별 해설을 추가하면 여기에 표시됩니다.';
    } else if (!hasChoice(rec)) {
      el.explanationText.textContent = '선택지를 누르면 해설이 표시됩니다.';
    } else {
      el.explanationText.textContent = text;
    }
  }

  function renderQuestionText(q) {
    if (!el.textPanel || !el.questionText) return;
    const text = String(q.textSnippet || '').trim();
    el.textPanel.hidden = !text;
    if (el.textPanel.dataset.questionId !== q.id) el.textPanel.open = false;
    el.textPanel.dataset.questionId = q.id;
    el.questionText.textContent = text;
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

  function setShareStatus(message, state = 'idle', autoHide = false) {
    if (!el.shareStatus) return;
    clearTimeout(shareStatusTimer);
    el.shareStatus.hidden = !message;
    el.shareStatus.textContent = message || '';
    el.shareStatus.dataset.state = state;
    if (message && autoHide) {
      shareStatusTimer = setTimeout(() => {
        el.shareStatus.hidden = true;
        el.shareStatus.textContent = '';
        el.shareStatus.dataset.state = 'idle';
      }, 3600);
    }
  }

  function questionShareTitle(q) {
    return `제${q.round}회 ${q.level} ${q.question}번`;
  }

  function questionShareText(q) {
    const parts = [
      '이 문항 풀이를 도와줘.',
      questionShareTitle(q),
      `${q.year || ''} · ${q.era} · ${q.points || 0}점`,
      String(q.textSnippet || '').trim()
    ].filter(Boolean);
    return parts.join('\n');
  }

  function questionFileName(q) {
    return `hanneung-${q.id}.png`;
  }

  function shareDebugLines(q, extra = {}) {
    return [
      `time: ${new Date().toLocaleString('ko-KR')}`,
      `question: ${q ? q.id : '-'}`,
      `image: ${q?.image || '-'}`,
      `crop: ${q?.crop ? q.crop.join(', ') : '-'}`,
      `page: ${q?.pageW || '-'} x ${q?.pageH || '-'}`,
      `location: ${location.protocol}//${location.host || '(local file)'}`,
      `secureContext: ${window.isSecureContext ? 'yes' : 'no'}`,
      `clipboardWrite: ${navigator.clipboard?.write ? 'yes' : 'no'}`,
      `clipboardItem: ${typeof ClipboardItem === 'function' ? 'yes' : 'no'}`,
      `webShare: ${navigator.share ? 'yes' : 'no'}`,
      `fileShare: ${navigator.canShare ? 'maybe' : 'no canShare API'}`,
      `userAgent: ${navigator.userAgent}`,
      ...Object.entries(extra).map(([key, value]) => `${key}: ${value}`)
    ].join('\n');
  }

  function renderShareDebug(q, extra = {}, options = {}) {
    if (!el.shareDebug || !el.shareDebugPanel) return;
    el.shareDebugPanel.hidden = false;
    if (options.open !== false) {
      el.shareDebugPanel.open = true;
    }
    el.shareDebug.textContent = shareDebugLines(q, extra);
  }

  function createQuestionBlob(q) {
    return new Promise((resolve, reject) => {
      if (!q?.image || !Array.isArray(q.crop)) {
        reject(new Error('문항 이미지 정보가 없습니다.'));
        return;
      }
      const [x, y, w, h] = q.crop.map(Number);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
        reject(new Error('문항 영역 정보가 올바르지 않습니다.'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w);
          canvas.height = Math.round(h);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('이미지 캔버스를 만들 수 없습니다.');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('문항 이미지를 만들 수 없습니다.'));
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('문항 이미지를 불러오지 못했습니다.'));
      img.src = q.image;
    });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function setExportBusy(isBusy) {
    if (el.copyQuestion) el.copyQuestion.disabled = isBusy;
    if (el.saveQuestion) el.saveQuestion.disabled = isBusy;
    if (el.previewQuestion) el.previewQuestion.disabled = isBusy;
  }

  function explainClipboardBlocker(err) {
    if (location.protocol === 'file:') {
      return 'file://로 열면 브라우저가 로컬 이미지 잘라내기를 막습니다. serve-local.cmd로 연 http://127.0.0.1 주소에서 다시 눌러주세요.';
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem !== 'function') {
      return '이 브라우저는 이미지 클립보드 복사를 지원하지 않습니다. Windows에서는 Edge/Chrome에서 http://127.0.0.1 주소로 열어주세요.';
    }
    if (!window.isSecureContext) {
      return '클립보드 복사는 보안 컨텍스트에서만 됩니다. http://127.0.0.1 또는 https 주소로 열어주세요.';
    }
    return err?.message || String(err);
  }

  async function copySelectedQuestion() {
    const q = QUESTIONS.find(item => item.id === selectedId);
    if (!q) return;
    setExportBusy(true);
    setShareStatus('클립보드에 복사 중...', 'working');
    renderShareDebug(q, { action: 'copy started' }, { open: false });
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem !== 'function') {
        throw new Error('Image clipboard API is not available.');
      }
      const blob = await createQuestionBlob(q);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setShareStatus('클립보드에 복사했습니다. 바로 붙여넣기 하세요.', 'ok');
      renderShareDebug(q, {
        action: 'copy ok',
        blobType: blob.type || '(none)',
        blobSize: `${blob.size.toLocaleString('ko-KR')} bytes`
      }, { open: false });
    } catch (err) {
      const message = explainClipboardBlocker(err);
      setShareStatus(`클립보드 복사 실패: ${message}`, 'error');
      renderShareDebug(q, {
        action: 'copy failed',
        errorName: err?.name || '(none)',
        errorMessage: err?.message || String(err),
        fix: message
      }, { open: false });
    } finally {
      setExportBusy(false);
    }
  }

  async function saveSelectedQuestion() {
    const q = QUESTIONS.find(item => item.id === selectedId);
    if (!q) return;
    setExportBusy(true);
    setShareStatus('PNG 만드는 중...', 'working');
    renderShareDebug(q, { action: 'save started' });
    try {
      const blob = await createQuestionBlob(q);
      const fileName = questionFileName(q);
      downloadBlob(blob, fileName);
      setShareStatus(`${fileName} 저장을 시작했습니다.`, 'ok');
      renderShareDebug(q, {
        action: 'save ok',
        fileName,
        blobType: blob.type || '(none)',
        blobSize: `${blob.size.toLocaleString('ko-KR')} bytes`
      });
    } catch (err) {
      setShareStatus(`PNG 저장 실패: ${err.message || err}`, 'error');
      renderShareDebug(q, {
        action: 'save failed',
        errorName: err?.name || '(none)',
        errorMessage: err?.message || String(err)
      });
    } finally {
      setExportBusy(false);
    }
  }

  async function previewSelectedQuestion() {
    const q = QUESTIONS.find(item => item.id === selectedId);
    if (!q) return;
    const previewWindow = window.open('', '_blank');
    setExportBusy(true);
    setShareStatus('미리보기 만드는 중...', 'working');
    renderShareDebug(q, { action: 'preview started' });
    try {
      const blob = await createQuestionBlob(q);
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = URL.createObjectURL(blob);
      const fileName = questionFileName(q);
      if (previewWindow) {
        previewWindow.document.title = questionShareTitle(q);
        previewWindow.document.body.innerHTML = `
          <style>
            body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #f4f6f8; color: #182033; }
            img { display: block; max-width: 100%; height: auto; background: white; border: 1px solid #d8dee8; }
            a { display: inline-block; margin: 0 0 12px; color: #214d8f; }
            pre { white-space: pre-wrap; color: #606a7c; }
          </style>
          <a href="${previewObjectUrl}" download="${fileName}">PNG 저장</a>
          <img src="${previewObjectUrl}" alt="${fileName}">
          <pre>${escapeHtml(questionShareText(q))}</pre>`;
      } else {
        downloadBlob(blob, fileName);
      }
      setShareStatus(previewWindow ? '새 탭에 PNG 미리보기를 열었습니다.' : '팝업이 막혀 PNG 저장으로 처리했습니다.', 'ok');
      renderShareDebug(q, {
        action: 'preview ok',
        fileName,
        blobType: blob.type || '(none)',
        blobSize: `${blob.size.toLocaleString('ko-KR')} bytes`,
        popup: previewWindow ? 'opened' : 'blocked'
      });
    } catch (err) {
      if (previewWindow) previewWindow.close();
      setShareStatus(`미리보기 실패: ${err.message || err}`, 'error');
      renderShareDebug(q, {
        action: 'preview failed',
        errorName: err?.name || '(none)',
        errorMessage: err?.message || String(err)
      });
    } finally {
      setExportBusy(false);
    }
  }

  async function shareSelectedQuestion() {
    const q = QUESTIONS.find(item => item.id === selectedId);
    if (!q) return;
    setExportBusy(true);
    setShareStatus('공유 가능한지 확인 중...', 'working');
    renderShareDebug(q, { action: 'share started' });
    try {
      const blob = await createQuestionBlob(q);
      const fileName = questionFileName(q);
      const title = questionShareTitle(q);
      const text = questionShareText(q);

      if (navigator.share && typeof File === 'function') {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = { title, text, files: [file] };
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setShareStatus('공유 메뉴로 보냈습니다.', 'ok');
          renderShareDebug(q, { action: 'share ok', fileName, blobSize: `${blob.size.toLocaleString('ko-KR')} bytes` });
          return;
        }
      }

      downloadBlob(blob, fileName);
      setShareStatus('이 브라우저는 파일 공유가 안 되어 PNG 저장으로 처리했습니다.', 'ok');
      renderShareDebug(q, { action: 'share fallback save', fileName, blobSize: `${blob.size.toLocaleString('ko-KR')} bytes` });
    } catch (err) {
      if (err?.name === 'AbortError') {
        setShareStatus('공유를 취소했습니다.', 'idle');
      } else {
        setShareStatus(`공유 실패: ${err.message || err}`, 'error');
        renderShareDebug(q, {
          action: 'share failed',
          errorName: err?.name || '(none)',
          errorMessage: err?.message || String(err)
        });
      }
    } finally {
      setExportBusy(false);
    }
  }

  function updateNavButtons() {
    const idx = filtered.findIndex(q => q.id === selectedId);
    el.prev.disabled = idx <= 0;
    el.next.disabled = idx < 0 || idx >= filtered.length - 1;
    if (el.nextUnsolved) {
      el.nextUnsolved.disabled = !filtered.some((q, index) => index !== idx && !hasChoice(progress[q.id]));
    }
  }

  function chooseQuestion(id) {
    selectedId = id;
    renderSelected();
    if (window.matchMedia('(max-width: 980px)').matches) {
      document.querySelector('.viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setStatusFilter(value) {
    filters.status = value;
    el.status.value = value;
    visibleCount = LIST_STEP;
    applyFilters();
  }

  function initSyncPanel() {
    if (!el.syncStatus) return;
    el.syncToken.value = syncConfig.token || '';
    el.syncGistId.value = syncConfig.gistId || '';
    el.syncAuto.checked = !!syncConfig.auto;
    renderSyncStatus(syncConfig.auto ? '자동 동기화 대기 중' : '동기화 꺼짐', 'idle');
  }

  function readSyncPanel() {
    syncConfig = {
      token: (el.syncToken?.value || '').trim(),
      gistId: (el.syncGistId?.value || '').trim(),
      auto: !!el.syncAuto?.checked
    };
    saveSyncConfig();
  }

  function renderSyncStatus(message, state = 'idle') {
    if (!el.syncStatus) return;
    el.syncStatus.textContent = message;
    el.syncStatus.dataset.state = state;
  }

  function setSyncBusy(isBusy) {
    syncBusy = isBusy;
    for (const btn of [el.syncCreate, el.syncPull, el.syncPush, el.syncForget]) {
      if (btn) btn.disabled = isBusy;
    }
  }

  function isSyncReady(requireGist = true) {
    if (!syncConfig.token) {
      renderSyncStatus('GitHub 토큰이 필요합니다.', 'error');
      return false;
    }
    if (requireGist && !syncConfig.gistId) {
      renderSyncStatus('Gist ID가 필요합니다.', 'error');
      return false;
    }
    return true;
  }

  function queueAutoSync(delay = AUTO_SYNC_DELAY) {
    if (!syncConfig.auto || !syncConfig.token || !syncConfig.gistId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncPush({ silent: true }), delay);
  }

  async function syncCreateGist() {
    readSyncPanel();
    if (!isSyncReady(false)) return;
    setSyncBusy(true);
    renderSyncStatus('새 동기화 파일을 만드는 중...', 'working');
    try {
      const gist = await githubJson('/gists', {
        method: 'POST',
        body: {
          description: '한국사 기출 풀이 진행도',
          public: false,
          files: {
            [SYNC_FILE]: { content: progressPayload() }
          }
        }
      });
      syncConfig.gistId = gist.id;
      if (el.syncGistId) el.syncGistId.value = gist.id;
      saveSyncConfig();
      renderSyncStatus(`새 파일 생성 완료 · ${formatTime(new Date())}`, 'ok');
    } catch (err) {
      renderSyncStatus(`생성 실패: ${err.message}`, 'error');
    } finally {
      setSyncBusy(false);
    }
  }

  async function syncPull(options = {}) {
    readSyncPanel();
    if (!isSyncReady(true)) return;
    if (syncBusy) {
      pendingSync = true;
      return;
    }
    setSyncBusy(true);
    if (!options.silent) renderSyncStatus('진행도를 불러오는 중...', 'working');
    try {
      const gist = await githubJson(`/gists/${encodeURIComponent(syncConfig.gistId)}`);
      const remoteProgress = await readGistProgress(gist);
      const merged = mergeProgress(progress, remoteProgress);
      const shouldPushMerged = JSON.stringify(merged) !== JSON.stringify(remoteProgress);
      progress = merged;
      saveProgress({ skipSync: true });
      applyFilters();
      renderSyncStatus(`불러오기 완료 · ${formatTime(new Date())}`, 'ok');
      if (syncConfig.auto && shouldPushMerged) queueAutoSync(250);
    } catch (err) {
      renderSyncStatus(`불러오기 실패: ${err.message}`, 'error');
    } finally {
      setSyncBusy(false);
      flushPendingSync();
    }
  }

  async function syncPush(options = {}) {
    readSyncPanel();
    if (!isSyncReady(true)) return;
    if (syncBusy) {
      pendingSync = true;
      return;
    }
    setSyncBusy(true);
    if (!options.silent) renderSyncStatus('진행도를 저장하는 중...', 'working');
    try {
      await githubJson(`/gists/${encodeURIComponent(syncConfig.gistId)}`, {
        method: 'PATCH',
        body: {
          files: {
            [SYNC_FILE]: { content: progressPayload() }
          }
        }
      });
      renderSyncStatus(`저장 완료 · ${formatTime(new Date())}`, 'ok');
    } catch (err) {
      renderSyncStatus(`저장 실패: ${err.message}`, 'error');
    } finally {
      setSyncBusy(false);
      flushPendingSync();
    }
  }

  function flushPendingSync() {
    if (!pendingSync) return;
    pendingSync = false;
    queueAutoSync(250);
  }

  async function githubJson(path, options = {}) {
    const init = {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${syncConfig.token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (options.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(`https://api.github.com${path}`, init);
    if (!res.ok) {
      let message = `GitHub API ${res.status}`;
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch (e) {
        message = res.statusText || message;
      }
      throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
  }

  async function readGistProgress(gist) {
    const file = gist?.files?.[SYNC_FILE];
    if (!file) return {};
    let content = file.content || '';
    if (file.truncated && file.raw_url) {
      const res = await fetch(file.raw_url);
      if (!res.ok) throw new Error('동기화 파일 내용을 읽을 수 없습니다.');
      content = await res.text();
    }
    try {
      const parsed = JSON.parse(content || '{}');
      return normalizeProgress(parsed.progress || parsed);
    } catch (err) {
      throw new Error('동기화 파일 형식이 올바르지 않습니다.');
    }
  }

  function progressPayload() {
    return JSON.stringify({
      app: STORE_KEY,
      file: SYNC_FILE,
      version: 1,
      updatedAt: new Date().toISOString(),
      clientId: getClientId(),
      progress
    }, null, 2);
  }

  function mergeProgress(local, remote) {
    const merged = normalizeProgress(local);
    for (const [id, remoteRec] of Object.entries(normalizeProgress(remote))) {
      const localRec = merged[id];
      if (!localRec || recordTime(remoteRec) > recordTime(localRec)) {
        merged[id] = remoteRec;
      }
    }
    return normalizeProgress(merged);
  }

  function recordTime(rec) {
    const raw = rec?.updatedAt;
    if (!raw) return 0;
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getClientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function formatTime(date) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function practiceSize() {
    return Math.max(1, Number(el.setSize?.value || 20));
  }

  function clearPracticeSet(shouldApply = true) {
    randomSet = null;
    activeSetLabel = '';
    if (shouldApply) applyFilters();
  }

  function createPracticeSet(type) {
    const base = baseFilteredQuestions();
    const size = practiceSize();
    let candidates = base;
    let label = `랜덤 ${size}문항`;

    if (type === 'unsolved') {
      candidates = base.filter(q => !hasChoice(progress[q.id]));
      label = `미풀이 ${size}문항`;
    } else if (type === 'review') {
      candidates = base.filter(q => markFor(q, progress[q.id]) === 'wrong' || progress[q.id]?.star);
      label = `복습 ${size}문항`;
    }

    if (!candidates.length) {
      alert('현재 조건에 맞는 문항이 없습니다.');
      return;
    }

    const picked = type === 'review'
      ? orderReviewQuestions(candidates).slice(0, Math.min(size, candidates.length))
      : shuffle(candidates).slice(0, Math.min(size, candidates.length));

    randomSet = picked.map(q => q.id);
    activeSetLabel = `${label} · ${randomSet.length.toLocaleString('ko-KR')}문항`;
    visibleCount = LIST_STEP;
    selectedId = randomSet[0] || null;
    applyFilters();
  }

  function orderReviewQuestions(items) {
    return items.slice().sort((a, b) => {
      const aRec = progress[a.id];
      const bRec = progress[b.id];
      const aRank = markFor(a, aRec) === 'wrong' ? 0 : 1;
      const bRank = markFor(b, bRec) === 'wrong' ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return (Number(aRec?.updatedAt) || 0) - (Number(bRec?.updatedAt) || 0);
    });
  }

  function exposeProgressReport() {
    window.hanneungProgressReport = function (era = '') {
      const rows = QUESTIONS
        .filter(q => (!era || q.era === era) && hasChoice(progress[q.id]))
        .map(q => {
          const rec = progress[q.id];
          const updatedAt = rec?.updatedAt ? new Date(rec.updatedAt).toLocaleString('ko-KR') : '';
          return {
            id: q.id,
            era: q.era,
            round: q.round,
            question: q.question,
            choice: rec.choice,
            answer: q.answer,
            result: markFor(q, rec),
            updatedAt,
            snippet: String(q.textSnippet || '').slice(0, 80)
          };
        });
      console.table(rows);
      return rows;
    };
  }

  function attachEvents() {
    el.search.addEventListener('input', debounce(() => {
      filters.search = el.search.value.trim();
      visibleCount = LIST_STEP;
      clearPracticeSet(false);
      applyFilters();
    }, 140));
    el.level.addEventListener('change', () => { filters.level = el.level.value; visibleCount = LIST_STEP; clearPracticeSet(false); applyFilters(); });
    el.round.addEventListener('change', () => { filters.round = el.round.value; visibleCount = LIST_STEP; clearPracticeSet(false); applyFilters(); });
    el.status.addEventListener('change', () => { filters.status = el.status.value; visibleCount = LIST_STEP; applyFilters(); });
    el.wrongOnlyBtn.addEventListener('click', () => setStatusFilter(filters.status === 'wrong' ? 'all' : 'wrong'));
    el.eraChips.addEventListener('click', e => {
      const btn = e.target.closest('button[data-era]');
      if (!btn) return;
      filters.era = btn.dataset.era;
      clearPracticeSet(false);
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
      clearPracticeSet(false);
      visibleCount = LIST_STEP;
      el.search.value = '';
      el.level.value = '전체';
      el.round.value = '전체';
      el.status.value = 'all';
      el.eraChips.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.era === '전체'));
      applyFilters();
    });
    el.randomBtn.addEventListener('click', () => createPracticeSet('random'));
    el.unsolvedSetBtn.addEventListener('click', () => createPracticeSet('unsolved'));
    el.reviewSetBtn.addEventListener('click', () => createPracticeSet('review'));
    el.clearRandomBtn.addEventListener('click', () => clearPracticeSet());
    el.clearStatusFiltered.addEventListener('click', () => clearGradingStatus('filtered'));
    el.clearStatusAll.addEventListener('click', () => clearGradingStatus('all'));
    el.bookmark.addEventListener('click', () => {
      if (!selectedId) return;
      const rec = recordFor(selectedId);
      rec.star = !rec.star;
      rec.updatedAt = Date.now();
      markRecordState(rec);
      saveProgress();
      applyFilters();
    });
    el.cropMode.addEventListener('click', () => setMode('crop'));
    el.pageMode.addEventListener('click', () => setMode('page'));
    if (el.copyQuestion) el.copyQuestion.addEventListener('click', copySelectedQuestion);
    if (el.saveQuestion) el.saveQuestion.addEventListener('click', saveSelectedQuestion);
    if (el.previewQuestion) el.previewQuestion.addEventListener('click', previewSelectedQuestion);
    el.choices.addEventListener('click', e => {
      const btn = e.target.closest('button[data-choice]');
      if (!btn || !selectedId) return;
      const rec = recordFor(selectedId);
      const choice = Number(btn.dataset.choice);
      rec.choice = rec.choice === choice ? null : choice;
      rec.updatedAt = Date.now();
      markRecordState(rec);
      saveProgress();
      applyFilters();
    });
    el.clearChoice.addEventListener('click', () => {
      if (!selectedId) return;
      if (!resetGradingStatus(selectedId)) return;
      saveProgress();
      applyFilters();
    });
    el.note.addEventListener('input', debounce(() => {
      if (!selectedId) return;
      const rec = recordFor(selectedId);
      rec.note = el.note.value;
      rec.updatedAt = Date.now();
      markRecordState(rec);
      saveProgress();
    }, 250));
    el.prev.addEventListener('click', () => moveSelection(-1));
    el.nextUnsolved.addEventListener('click', () => moveToNextBy(q => !hasChoice(progress[q.id]), '현재 목록에 미풀이 문항이 없습니다.'));
    el.next.addEventListener('click', () => moveSelection(1));
    el.downloadProgress.addEventListener('click', exportProgress);
    el.importProgress.addEventListener('change', importProgress);
    if (el.syncToken) {
      const saveSyncFromInputs = debounce(() => {
        readSyncPanel();
        renderSyncStatus(syncConfig.auto ? '자동 동기화 대기 중' : '동기화 설정 저장됨', 'idle');
      }, 180);
      el.syncToken.addEventListener('input', saveSyncFromInputs);
      el.syncGistId.addEventListener('input', saveSyncFromInputs);
      el.syncAuto.addEventListener('change', () => {
        readSyncPanel();
        renderSyncStatus(syncConfig.auto ? '자동 동기화 켜짐' : '자동 동기화 꺼짐', 'idle');
        if (syncConfig.auto && syncConfig.token && syncConfig.gistId) syncPull({ silent: true });
      });
      el.syncCreate.addEventListener('click', syncCreateGist);
      el.syncPull.addEventListener('click', () => syncPull());
      el.syncPush.addEventListener('click', () => syncPush());
      el.syncForget.addEventListener('click', () => {
        clearTimeout(syncTimer);
        syncConfig = { token: '', gistId: '', auto: false };
        localStorage.removeItem(SYNC_CONFIG_KEY);
        initSyncPanel();
      });
    }
    window.addEventListener('resize', debounce(() => {
      const q = QUESTIONS.find(item => item.id === selectedId);
      if (q) layoutCrop(q);
    }, 120));
    document.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (/^[1-5]$/.test(e.key) && selectedId) {
        const rec = recordFor(selectedId);
        const choice = Number(e.key);
        rec.choice = rec.choice === choice ? null : choice;
        rec.updatedAt = Date.now();
        markRecordState(rec);
        saveProgress();
        applyFilters();
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

  function moveToNextBy(predicate, emptyMessage) {
    if (!filtered.length) return;
    const start = Math.max(0, filtered.findIndex(q => q.id === selectedId));
    for (let step = 1; step <= filtered.length; step++) {
      const q = filtered[(start + step) % filtered.length];
      if (predicate(q)) {
        chooseQuestion(q.id);
        return;
      }
    }
    alert(emptyMessage);
  }

  function clearGradingStatus(scope) {
    const targets = scope === 'all' ? QUESTIONS : filtered;
    if (!targets.length) {
      alert('해제할 문항이 없습니다.');
      return;
    }
    const affectedBefore = targets.filter(q => hasGradingStatus(progress[q.id])).length;
    const scopeLabel = scope === 'all' ? '전체 문항' : '현재 필터에 표시된 문항';
    const message = `${scopeLabel} ${targets.length.toLocaleString('ko-KR')}개 중 채점현황 ${affectedBefore.toLocaleString('ko-KR')}개를 해제합니다.\n\n선택 번호만 지우고, 메모와 즐겨찾기는 유지합니다.`;
    if (!window.confirm(message)) return;
    let changed = 0;
    for (const q of targets) {
      if (resetGradingStatus(q.id)) changed += 1;
    }
    saveProgress();
    applyFilters();
    alert(`채점현황 ${changed.toLocaleString('ko-KR')}개를 해제했습니다.`);
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
        const incoming = normalizeProgress(parsed.progress || parsed);
        progress = mergeProgress(progress, incoming);
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
  initSyncPanel();
  exposeProgressReport();
  attachEvents();
  filtered = QUESTIONS.slice();
  selectedId = QUESTIONS[0]?.id || null;
  applyFilters();
  if (syncConfig.auto && syncConfig.token && syncConfig.gistId) {
    setTimeout(() => syncPull({ silent: true }), 300);
  }
})();
