/* ═══════════════════════════════════════════
   Shadowing Tool — app.js
═══════════════════════════════════════════ */

// ── State ──────────────────────────────────
const state = {
  audioBlob: null,
  audioUrl: null,
  sentences: [],   // [{ text, start, end }]
  currentStampIdx: 0,
};

// ── Audio elements ────────────────────────
const previewAudio = new Audio();
const stampAudio   = new Audio();
const shadowAudio  = new Audio();

// ── Helpers ───────────────────────────────
function fmt(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setAudioSrc(audioEl, url) {
  audioEl.src = url;
  audioEl.load();
}

// ── Tab navigation ─────────────────────────
document.querySelectorAll('.step-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const step = tab.dataset.step;
    document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${step}`).classList.add('active');
    if (step === 'stamp') renderStampList();
    if (step === 'shadow') renderShadowGrid();
  });
});

function goToStep(step) {
  document.querySelectorAll('.step-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.step === step);
  });
  document.querySelectorAll('.step-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${step}`);
  });
}

// ══════════════════════════════════════════
//  STEP 1 — 설정
// ══════════════════════════════════════════

// ── Audio upload ──────────────────────────
const uploadArea = document.getElementById('audio-upload-area');
const fileInput  = document.getElementById('audio-file-input');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadAudioFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadAudioFile(fileInput.files[0]);
});

function loadAudioFile(file) {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioBlob = file;
  state.audioUrl  = URL.createObjectURL(file);

  setAudioSrc(previewAudio, state.audioUrl);
  setAudioSrc(stampAudio,   state.audioUrl);
  setAudioSrc(shadowAudio,  state.audioUrl);

  document.getElementById('audio-file-name').textContent = file.name;
  document.getElementById('audio-loaded-info').style.display = 'block';
  uploadArea.style.display = 'none';
}

// ── Preview player ─────────────────────────
makePlayer(previewAudio, {
  playBtn:      document.getElementById('preview-play-btn'),
  timeDisplay:  document.getElementById('preview-time'),
  progressFill: document.getElementById('preview-progress-fill'),
  progressWrap: document.getElementById('preview-progress-wrap'),
  speedSlider:  document.getElementById('preview-speed'),
  speedLabel:   document.getElementById('preview-speed-label'),
});

// ── Script parsing ────────────────────────
document.getElementById('parse-btn').addEventListener('click', parseScript);
document.getElementById('clear-script-btn').addEventListener('click', () => {
  document.getElementById('script-input').value = '';
  document.getElementById('parsed-preview-card').style.display = 'none';
  state.sentences = [];
});

function parseScript() {
  const raw = document.getElementById('script-input').value.trim();
  if (!raw) return;

  // Split by newline first, then by sentence-ending punctuation
  let lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let sentences = [];
  lines.forEach(line => {
    // Split on . ! ? followed by space or end
    const parts = line.split(/(?<=[.!?])\s+/);
    parts.forEach(p => {
      const s = p.trim();
      if (s) sentences.push({ text: s, start: null, end: null });
    });
  });

  state.sentences = sentences;
  state.currentStampIdx = 0;
  renderParsedPreview();
}

function renderParsedPreview() {
  const card = document.getElementById('parsed-preview-card');
  const list = document.getElementById('parsed-sentence-list');
  const countLabel = document.getElementById('sentence-count-label');

  card.style.display = 'block';
  countLabel.textContent = `(${state.sentences.length}개)`;
  list.innerHTML = '';

  state.sentences.forEach((s, i) => {
    const item = makeSentenceEditItem(s, i);
    list.appendChild(item);
  });
}

function makeSentenceEditItem(s, i) {
  const div = document.createElement('div');
  div.className = 'sentence-item';
  div.dataset.idx = i;

  const numSpan = document.createElement('span');
  numSpan.style.cssText = 'color:var(--text2);font-size:12px;min-width:22px;flex-shrink:0;';
  numSpan.textContent = `${i + 1}.`;

  const textSpan = document.createElement('span');
  textSpan.className = 'sentence-text';
  textSpan.contentEditable = 'true';
  textSpan.textContent = s.text;
  textSpan.addEventListener('input', () => { state.sentences[i].text = textSpan.textContent.trim(); });

  const actions = document.createElement('div');
  actions.className = 'sentence-actions';

  // split button
  const splitBtn = document.createElement('button');
  splitBtn.className = 'btn btn-secondary btn-sm';
  splitBtn.title = '여기서 문장 분리';
  splitBtn.textContent = '분리';
  splitBtn.addEventListener('click', () => splitSentence(i, textSpan));

  // merge button (merge with next)
  const mergeBtn = document.createElement('button');
  mergeBtn.className = 'btn btn-secondary btn-sm';
  mergeBtn.title = '다음 문장과 합치기';
  mergeBtn.textContent = '합치기';
  mergeBtn.addEventListener('click', () => mergeSentence(i));

  // delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger btn-sm';
  delBtn.textContent = '삭제';
  delBtn.addEventListener('click', () => {
    state.sentences.splice(i, 1);
    renderParsedPreview();
  });

  actions.appendChild(splitBtn);
  if (i < state.sentences.length - 1) actions.appendChild(mergeBtn);
  actions.appendChild(delBtn);

  div.appendChild(numSpan);
  div.appendChild(textSpan);
  div.appendChild(actions);
  return div;
}

function splitSentence(i, textSpan) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    alert('분리할 위치에 커서를 놓은 후 버튼을 누르세요.');
    return;
  }
  const range = sel.getRangeAt(0);
  // Check if selection is inside this textSpan
  if (!textSpan.contains(range.commonAncestorContainer)) {
    alert('분리할 위치에 커서를 놓은 후 버튼을 누르세요.');
    return;
  }

  const fullText = textSpan.textContent;
  // get cursor offset
  const tempRange = document.createRange();
  tempRange.setStart(textSpan, 0);
  tempRange.setEnd(range.startContainer, range.startOffset);
  const offset = tempRange.toString().length;

  if (offset <= 0 || offset >= fullText.length) {
    alert('문장 중간에 커서를 놓으세요.');
    return;
  }

  const first  = fullText.slice(0, offset).trim();
  const second = fullText.slice(offset).trim();

  if (!first || !second) return;

  state.sentences.splice(i, 1,
    { text: first,  start: null, end: null },
    { text: second, start: null, end: null }
  );
  renderParsedPreview();
}

function mergeSentence(i) {
  if (i >= state.sentences.length - 1) return;
  const merged = state.sentences[i].text + ' ' + state.sentences[i + 1].text;
  state.sentences.splice(i, 2, { text: merged, start: null, end: null });
  renderParsedPreview();
}

document.getElementById('go-stamp-btn').addEventListener('click', () => {
  if (!state.audioUrl) { alert('먼저 음원 파일을 업로드하세요.'); return; }
  if (state.sentences.length === 0) { alert('스크립트를 입력하고 문장 분리를 해주세요.'); return; }
  state.currentStampIdx = 0;
  renderStampList();
  goToStep('stamp');
});


// ══════════════════════════════════════════
//  STEP 2 — 타임스탬프
// ══════════════════════════════════════════

makePlayer(stampAudio, {
  playBtn:      document.getElementById('stamp-play-btn'),
  timeDisplay:  document.getElementById('stamp-time'),
  progressFill: document.getElementById('stamp-progress-fill'),
  progressWrap: document.getElementById('stamp-progress-wrap'),
  speedSlider:  document.getElementById('stamp-speed'),
  speedLabel:   document.getElementById('stamp-speed-label'),
});

// Spacebar → stamp
document.addEventListener('keydown', e => {
  const stampPanel = document.getElementById('panel-stamp');
  if (e.code === 'Space' && stampPanel.classList.contains('active')) {
    // Don't intercept if focus is in an input
    if (['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)) return;
    e.preventDefault();
    doStamp();
  }
});

document.getElementById('stamp-mark-btn').addEventListener('click', doStamp);

document.getElementById('stamp-undo-btn').addEventListener('click', () => {
  if (state.currentStampIdx > 0) {
    state.currentStampIdx--;
    state.sentences[state.currentStampIdx].start = null;
    if (state.currentStampIdx > 0) {
      state.sentences[state.currentStampIdx - 1].end = null;
    }
    renderStampList();
  }
});

document.getElementById('stamp-reset-btn').addEventListener('click', () => {
  if (!confirm('타임스탬프를 모두 초기화할까요?')) return;
  state.sentences.forEach(s => { s.start = null; s.end = null; });
  state.currentStampIdx = 0;
  renderStampList();
});

function doStamp() {
  const t = stampAudio.currentTime;
  const i = state.currentStampIdx;
  if (i >= state.sentences.length) return;

  state.sentences[i].start = t;
  if (i > 0 && state.sentences[i - 1].end === null) {
    state.sentences[i - 1].end = t;
  }

  state.currentStampIdx++;

  // If last sentence, set its end when audio ends or just mark it
  if (state.currentStampIdx === state.sentences.length) {
    // end will be set later or when audio ends
  }

  renderStampList();

  // Scroll current into view
  const list = document.getElementById('stamp-sentence-list');
  const current = list.querySelector('.sentence-item.current');
  if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

stampAudio.addEventListener('ended', () => {
  const last = state.sentences[state.sentences.length - 1];
  if (last && last.start !== null && last.end === null) {
    last.end = stampAudio.duration;
    renderStampList();
  }
});

function renderStampList() {
  const list = document.getElementById('stamp-sentence-list');
  const stampedCount = document.getElementById('stamped-count');
  const totalCount   = document.getElementById('total-count');

  const stamped = state.sentences.filter(s => s.start !== null).length;
  stampedCount.textContent = stamped;
  totalCount.textContent   = state.sentences.length;

  list.innerHTML = '';
  state.sentences.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'sentence-item' +
      (i === state.currentStampIdx ? ' current' : '') +
      (s.start !== null ? ' stamped' : '');

    const timeSpan = document.createElement('span');
    timeSpan.className = 'stamp-time' + (s.start === null ? ' empty' : '');
    timeSpan.textContent = s.start !== null ? fmt(s.start) : '--:--';

    const textSpan = document.createElement('span');
    textSpan.className = 'sentence-text';
    textSpan.textContent = s.text;

    const actions = document.createElement('div');
    actions.className = 'sentence-actions';

    // Jump to timestamp
    if (s.start !== null) {
      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'btn btn-secondary btn-sm';
      jumpBtn.textContent = '▶';
      jumpBtn.title = '이 위치로 이동';
      jumpBtn.addEventListener('click', () => {
        stampAudio.currentTime = s.start;
        if (stampAudio.paused) stampAudio.play();
      });
      actions.appendChild(jumpBtn);
    }

    // Edit timestamp manually
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = '수정';
    editBtn.addEventListener('click', () => editTimestamp(i));
    actions.appendChild(editBtn);

    div.appendChild(timeSpan);
    div.appendChild(textSpan);
    div.appendChild(actions);
    list.appendChild(div);
  });
}

function editTimestamp(i) {
  const current = state.sentences[i].start;
  const val = prompt(`문장 ${i + 1} 시작 시간 (초):`, current !== null ? current.toFixed(2) : '');
  if (val === null) return;
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0) {
    state.sentences[i].start = n;
    // If next sentence exists and its start is before this, adjust end
    if (i + 1 < state.sentences.length && state.sentences[i + 1].start !== null) {
      state.sentences[i].end = state.sentences[i + 1].start;
    }
    if (i > 0 && (state.sentences[i - 1].end === null || state.sentences[i - 1].end > n)) {
      state.sentences[i - 1].end = n;
    }
    renderStampList();
  }
}

document.getElementById('go-shadow-btn').addEventListener('click', () => {
  const stamped = state.sentences.filter(s => s.start !== null).length;
  if (stamped === 0) {
    alert('타임스탬프를 먼저 찍어주세요.');
    return;
  }
  // Fill in missing ends
  for (let i = 0; i < state.sentences.length; i++) {
    if (state.sentences[i].start !== null && state.sentences[i].end === null) {
      if (i + 1 < state.sentences.length && state.sentences[i + 1].start !== null) {
        state.sentences[i].end = state.sentences[i + 1].start;
      } else {
        state.sentences[i].end = stampAudio.duration || state.sentences[i].start + 5;
      }
    }
  }
  renderShadowGrid();
  goToStep('shadow');
});


// ══════════════════════════════════════════
//  STEP 3 — 쉐도잉
// ══════════════════════════════════════════

let shadowState = {
  activeSentenceIdx: -1,
  repeatTotal: 3,
  repeatDone: 0,
  gapSec: 1.5,
  speed: 1.0,
  playing: false,
  gapTimer: null,
};

makePlayer(shadowAudio, {
  playBtn:      document.getElementById('shadow-play-btn'),
  timeDisplay:  document.getElementById('shadow-time'),
  progressFill: document.getElementById('shadow-progress-fill'),
  progressWrap: document.getElementById('shadow-progress-wrap'),
  // no speed slider here — we use the custom one below
});

// Speed for shadow
const shadowSpeedSlider = document.getElementById('shadow-speed');
const shadowSpeedLabel  = document.getElementById('shadow-speed-label');
shadowSpeedSlider.addEventListener('input', () => {
  shadowState.speed = parseFloat(shadowSpeedSlider.value);
  shadowSpeedLabel.textContent = shadowState.speed.toFixed(1) + 'x';
  shadowAudio.playbackRate = shadowState.speed;
});

function renderShadowGrid() {
  const grid = document.getElementById('shadow-sentence-grid');
  grid.innerHTML = '';
  state.sentences.forEach((s, i) => {
    if (s.start === null) return;
    const div = document.createElement('div');
    div.className = 'sentence-grid-item';
    div.dataset.idx = i;
    const idx = document.createElement('div');
    idx.className = 'idx';
    idx.textContent = `#${i + 1}  ${fmt(s.start)}`;
    const txt = document.createElement('div');
    txt.textContent = s.text;
    div.appendChild(idx);
    div.appendChild(txt);
    div.addEventListener('click', () => startShadowing(i));
    grid.appendChild(div);
  });
}

function startShadowing(idx) {
  clearTimeout(shadowState.gapTimer);
  shadowAudio.pause();

  shadowState.activeSentenceIdx = idx;
  shadowState.repeatTotal = parseInt(document.getElementById('repeat-count').value) || 3;
  shadowState.gapSec      = parseFloat(document.getElementById('repeat-gap').value) || 1.5;
  shadowState.speed       = parseFloat(shadowSpeedSlider.value);
  shadowState.repeatDone  = 0;
  shadowState.playing     = true;

  // Highlight grid item
  document.querySelectorAll('.sentence-grid-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.idx) === idx);
  });

  updateShadowDisplay();
  playOnce();
}

function playOnce() {
  const s = state.sentences[shadowState.activeSentenceIdx];
  if (!s) return;

  shadowAudio.playbackRate = shadowState.speed;
  shadowAudio.currentTime  = s.start;
  shadowAudio.play();

  document.getElementById('shadow-current-text').classList.add('playing');

  // Stop at sentence end
  const checkEnd = () => {
    if (shadowAudio.currentTime >= s.end) {
      shadowAudio.pause();
      shadowAudio.removeEventListener('timeupdate', checkEnd);
      onRepeatDone();
    }
  };
  shadowAudio.addEventListener('timeupdate', checkEnd);
}

function onRepeatDone() {
  shadowState.repeatDone++;
  updateDots();
  document.getElementById('shadow-current-text').classList.remove('playing');

  if (shadowState.repeatDone < shadowState.repeatTotal) {
    shadowState.gapTimer = setTimeout(playOnce, shadowState.gapSec * 1000);
  } else {
    shadowState.playing = false;
  }
}

function updateShadowDisplay() {
  const s = state.sentences[shadowState.activeSentenceIdx];
  document.getElementById('shadow-current-text').textContent = s ? s.text : '문장을 선택하세요';
  updateDots();
}

function updateDots() {
  const container = document.getElementById('repeat-dots');
  container.innerHTML = '';
  for (let i = 0; i < shadowState.repeatTotal; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' +
      (i < shadowState.repeatDone ? ' done' : '') +
      (i === shadowState.repeatDone && shadowState.playing ? ' current' : '');
    container.appendChild(dot);
  }
}


// ══════════════════════════════════════════
//  Generic Player Factory
// ══════════════════════════════════════════

function makePlayer(audio, { playBtn, timeDisplay, progressFill, progressWrap, speedSlider, speedLabel }) {
  playBtn.addEventListener('click', () => {
    if (audio.paused) audio.play();
    else audio.pause();
  });

  audio.addEventListener('play',  () => { playBtn.textContent = '⏸'; });
  audio.addEventListener('pause', () => { playBtn.textContent = '▶'; });
  audio.addEventListener('ended', () => { playBtn.textContent = '▶'; });

  audio.addEventListener('timeupdate', () => {
    if (!isFinite(audio.duration)) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    timeDisplay.textContent  = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  });

  progressWrap.addEventListener('click', e => {
    const rect = progressWrap.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  if (speedSlider && speedLabel) {
    speedSlider.addEventListener('input', () => {
      audio.playbackRate = parseFloat(speedSlider.value);
      speedLabel.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
    });
  }
}
