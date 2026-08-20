(function () {
  "use strict";

  const DATA = window.LEARNING_DATA;
  const PAIRS = DATA.pairs;
  const STROKES = DATA.strokes;
  const STORAGE_KEY = "fanti_xuetang_v2";
  const GROUP_SIZE = 10;

  const GROUPS = [];
  for (let i = 0; i < PAIRS.length; i += GROUP_SIZE) {
    GROUPS.push(PAIRS.slice(i, i + GROUP_SIZE));
  }

  function $(selector) { return document.querySelector(selector); }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function pickDistractors(targetSet, sourceChars, count) {
    const result = [];
    const pool = shuffleArray(sourceChars);
    for (let i = 0; i < pool.length && result.length < count; i++) {
      const ch = pool[i];
      if (!targetSet.has(ch) && !result.includes(ch)) result.push(ch);
    }
    return result;
  }

  function defaultState() {
    return { groups: {} };
  }

  function loadState() {
    let state = defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.groups = parsed.groups || {};
      }
    } catch (err) {
      console.warn("读取学习进度失败，已重置。", err);
      state = defaultState();
    }
    return state;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups: state.groups }));
    } catch (err) {
      console.warn("保存学习进度失败。", err);
    }
  }

  let state = loadState();

  function getGroupRecord(id) {
    if (!state.groups[id]) state.groups[id] = { bestScore: null, completed: false };
    return state.groups[id];
  }

  function markGroupCompleted(id, score) {
    const rec = getGroupRecord(id);
    rec.completed = true;
    if (rec.bestScore === null || score > rec.bestScore) rec.bestScore = score;
    saveState();
  }

  function nextGroupId() {
    for (let i = 0; i < GROUPS.length; i++) {
      const rec = state.groups[i];
      if (!rec || !rec.completed) return i;
    }
    return null;
  }

  let session = null;
  let activeWriter = null;

  function showScreen(id) {
    cleanupWriter();
    ["home-screen", "learn-screen"].forEach(function (screenId) {
      $("#" + screenId).classList.toggle("is-active", screenId === id);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    cleanupWriter();
    session = null;
    saveState();
    showScreen("home-screen");
    renderHome();
  }

  function startGroup(groupId) {
    const pairs = GROUPS[groupId];
    if (!pairs) return;

    session = {
      groupId: groupId,
      items: pairs.map(function (pair) { return { pair: pair, firstTry: null }; }),
      queue: [],
      traceQueue: [],
      traceIndex: 0,
      currentTraceDone: false,
      phase: "question",
      score: 0,
      questionCount: 0
    };
    session.queue = shuffleArray(session.items.map(function (_, i) { return i; }));
    showScreen("learn-screen");
    renderNextExercise();
  }

  function startNextGroup() {
    const id = nextGroupId();
    if (id === null) return;
    startGroup(id);
  }

  function groupSize() {
    return session ? session.items.length : 0;
  }

  function updateStatus() {
    const el = $("#learn-status");
    if (!session || !el) {
      if (el) el.textContent = "";
      return;
    }
    const num = session.groupId + 1;
    const size = groupSize();
    if (session.phase === "question") {
      el.textContent = "第 " + num + " 组 · 成绩 " + session.score + "/" + size + " · 还剩 " + session.queue.length + " 题";
    } else if (session.phase === "trace") {
      el.textContent = "第 " + num + " 组 · 临摹 " + (session.traceIndex + 1) + "/" + size;
    } else {
      el.textContent = "第 " + num + " 组 · 已完成";
    }
  }

  function renderNextExercise() {
    cleanupWriter();
    const root = $("#exercise-root");
    root.innerHTML = "";
    $("#next-btn").disabled = true;
    $("#next-btn").querySelector(".btn-label").textContent = "下一个";

    if (!session) return;

    if (session.phase === "question") renderQuestion(root);
    else if (session.phase === "trace") renderTrace(root);
    else if (session.phase === "done") renderDone(root);

    updateStatus();
  }

  function showFeedback(root, correct, message) {
    const fb = document.createElement("div");
    fb.className = "feedback " + (correct ? "good" : "bad");
    const emoji = document.createElement("span");
    emoji.className = "fb-emoji";
    emoji.textContent = correct ? "🎉" : "💪";
    const text = document.createElement("span");
    text.textContent = message;
    fb.appendChild(emoji);
    fb.appendChild(text);
    root.appendChild(fb);
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderQuestion(root) {
    const itemIndex = session.queue.shift();
    if (itemIndex === undefined) {
      startTracePhase();
      return;
    }

    const item = session.items[itemIndex];
    const isReverse = session.questionCount % 2 === 1;
    session.questionCount += 1;

    renderChoice(root, item, itemIndex, isReverse);
  }

  function renderChoice(root, item, itemIndex, isReverse) {
    const pair = item.pair;
    const prompt = isReverse ? "这个简体字对应的繁体字是？" : "这个繁体字对应的简体字是？";
    const bigChar = isReverse ? pair.s : pair.t;
    const correctChar = isReverse ? pair.t : pair.s;

    const card = document.createElement("div");
    card.className = "question-card card";
    const p = document.createElement("p");
    p.className = "question-prompt";
    p.textContent = prompt;
    const ch = document.createElement("div");
    ch.className = "question-char" + (isReverse ? " simplified" : "");
    ch.textContent = bigChar;
    card.appendChild(p);
    card.appendChild(ch);
    root.appendChild(card);

    const targetSet = new Set([correctChar]);
    const sourceChars = isReverse ? PAIRS.map(function (x) { return x.t; }) : PAIRS.map(function (x) { return x.s; });
    const options = shuffleArray([correctChar].concat(pickDistractors(targetSet, sourceChars, 3)));

    const grid = document.createElement("div");
    grid.className = "option-grid";
    options.forEach(function (char) {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = char;
      btn.addEventListener("click", function () {
        if (session.phase !== "question") return;
        if (btn.disabled) return;

        const isCorrect = char === correctChar;
        Array.prototype.forEach.call(grid.querySelectorAll(".option-btn"), function (b) {
          b.disabled = true;
          if (b.textContent === correctChar) b.classList.add("correct");
          else if (b.textContent === char && !isCorrect) b.classList.add("wrong");
          else b.classList.add("muted-option");
        });

        handleChoiceAnswer(itemIndex, isCorrect, correctChar);
      });
      grid.appendChild(btn);
    });
    root.appendChild(grid);
  }

  function handleChoiceAnswer(itemIndex, isCorrect, correctChar) {
    const item = session.items[itemIndex];
    const root = $("#exercise-root");

    if (isCorrect) {
      if (item.firstTry === null) {
        item.firstTry = true;
        session.score += 1;
      }
      showFeedback(root, true, "答对了，继续保持！");
      if (session.queue.length === 0) {
        startTracePhase();
      } else {
        $("#next-btn").disabled = false;
      }
    } else {
      if (item.firstTry === null) item.firstTry = false;
      session.queue.push(itemIndex);
      showFeedback(root, false, "正确字是「" + correctChar + "」，这题等会儿会再出现");
      $("#next-btn").disabled = false;
    }
    updateStatus();
  }

  function startTracePhase() {
    session.phase = "trace";
    session.traceQueue = session.items.map(function (_, i) { return i; });
    session.traceIndex = 0;
    session.currentTraceDone = false;
    renderNextExercise();
  }

  function loadCharData(char, onComplete) {
    const data = STROKES[char];
    if (data) onComplete(data);
    else console.warn("缺少笔顺数据：", char);
  }

  function cleanupWriter() {
    if (activeWriter) {
      try { activeWriter.cancelQuiz(); } catch (err) {}
      activeWriter = null;
    }
  }

  function renderTrace(root) {
    const idx = session.traceQueue[session.traceIndex];
    if (idx === undefined) {
      finishGroup();
      return;
    }
    const pair = session.items[idx].pair;
    session.currentTraceDone = false;

    const card = document.createElement("div");
    card.className = "trace-card card";
    const title = document.createElement("h3");
    title.className = "trace-title";
    title.textContent = "跟着笔顺临摹「" + pair.t + "」";
    const hint = document.createElement("p");
    hint.className = "trace-hint";
    hint.textContent = "在灰色笔画上按顺序描红，写完全部笔画就完成";
    const stage = document.createElement("div");
    stage.className = "trace-stage";
    card.appendChild(title);
    card.appendChild(hint);
    card.appendChild(stage);
    root.appendChild(card);

    const actions = document.createElement("div");
    actions.className = "trace-actions";
    const restartBtn = document.createElement("button");
    restartBtn.className = "btn-mini";
    restartBtn.textContent = "重新开始";
    actions.appendChild(restartBtn);
    root.appendChild(actions);

    function startQuiz() {
      cleanupWriter();
      try {
        stage.innerHTML = "";
        const writer = HanziWriter.create(stage, pair.t, {
          width: 320,
          height: 320,
          padding: 16,
          showCharacter: false,
          showOutline: true,
          strokeColor: "#58cc02",
          radicalColor: "#a568ff",
          outlineColor: "#c9e8cf",
          highlightColor: "#c9e8cf",
          drawingColor: "#1cb0f6",
          drawingWidth: 12,
          charDataLoader: loadCharData
        });
        activeWriter = writer;
        writer.quiz({
          onComplete: function () {
            activeWriter = null;
            session.currentTraceDone = true;
            const hasMore = session.traceIndex + 1 < session.traceQueue.length;
            $("#next-btn").querySelector(".btn-label").textContent = hasMore ? "下一个字" : "查看成绩";
            $("#next-btn").disabled = false;
            showFeedback(root, true, "临摹完成，写得真漂亮！");
            updateStatus();
          },
          onMistake: function () {},
          onCorrectStroke: function () {}
        });
      } catch (err) {
        console.warn("临摹组件启动失败：", err);
        session.currentTraceDone = true;
        const hasMore = session.traceIndex + 1 < session.traceQueue.length;
        $("#next-btn").querySelector(".btn-label").textContent = hasMore ? "下一个字" : "查看成绩";
        $("#next-btn").disabled = false;
        showFeedback(root, true, "已完成临摹");
        updateStatus();
      }
    }

    restartBtn.addEventListener("click", function () {
      if (session.currentTraceDone) return;
      startQuiz();
    });

    startQuiz();
  }

  function finishGroup() {
    session.phase = "done";
    markGroupCompleted(session.groupId, session.score);
    renderDone($("#exercise-root"));
    updateStatus();
  }

  function renderDone(root) {
    const size = groupSize();
    const card = document.createElement("div");
    card.className = "completion-card card";
    const emoji = document.createElement("div");
    emoji.className = "completion-emoji";
    emoji.textContent = "🏅";
    const title = document.createElement("h2");
    title.className = "completion-title";
    title.textContent = "本组完成";
    const score = document.createElement("p");
    score.className = "completion-score";
    score.textContent = "成绩 " + session.score + "/" + size;
    const hint = document.createElement("p");
    hint.className = "completion-hint";
    hint.textContent = "已完成全部临摹，点“返回主页”继续";
    card.appendChild(emoji);
    card.appendChild(title);
    card.appendChild(score);
    card.appendChild(hint);
    root.appendChild(card);

    $("#next-btn").querySelector(".btn-label").textContent = "返回主页";
    $("#next-btn").disabled = false;
  }

  function renderHome() {
    const nextId = nextGroupId();
    const nextBtn = $("#start-next-btn");
    const label = nextBtn.querySelector(".btn-label");

    if (nextId === null) {
      label.textContent = "已学完全部组";
      nextBtn.disabled = true;
    } else {
      label.textContent = "开始第 " + (nextId + 1) + " 组";
      nextBtn.disabled = false;
    }

    const completedCount = GROUPS.filter(function (_, i) {
      const rec = state.groups[i];
      return rec && rec.completed;
    }).length;

    const progress = $("#home-progress");
    progress.textContent = "已完成 " + completedCount + " / " + GROUPS.length + " 组";

    const list = $("#group-list");
    list.innerHTML = "";
    const completedGroups = [];
    for (let i = 0; i < GROUPS.length; i++) {
      const rec = state.groups[i];
      if (rec && rec.completed) completedGroups.push(i);
    }
    completedGroups.reverse();

    const section = $("#group-section");
    if (completedGroups.length === 0) {
      section.classList.add("is-hidden");
    } else {
      section.classList.remove("is-hidden");
      completedGroups.forEach(function (id) {
        const rec = state.groups[id];
        const size = GROUPS[id].length;
        const btn = document.createElement("button");
        btn.className = "group-btn";
        btn.innerHTML = '<span class="group-name">第 ' + (id + 1) + ' 组</span><span class="group-score">成绩 ' + rec.bestScore + "/" + size + "</span>";
        btn.addEventListener("click", function () { startGroup(id); });
        list.appendChild(btn);
      });
    }
  }

  $("#go-home-btn").addEventListener("click", goHome);
  $("#quit-btn").addEventListener("click", goHome);
  $("#start-next-btn").addEventListener("click", startNextGroup);

  $("#next-btn").addEventListener("click", function () {
    if ($("#next-btn").disabled) return;
    if (session && session.phase === "done") {
      goHome();
      return;
    }
    if (session && session.phase === "trace") {
      session.traceIndex += 1;
    }
    renderNextExercise();
  });

  renderHome();
})();