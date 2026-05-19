// === Nova Quiz API client ===
// Plain JS — loaded before Babel/JSX files, so no JSX syntax here.
(function () {
  var BASE = '/api';

  function getCsrf() {
    var m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function call(method, path, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
    };
    if (body != null) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Server error (' + res.status + ')');
        return data;
      });
    });
  }

  // Backend Quiz → Frontend quiz card shape
  function fromBackendQuiz(q) {
    return {
      id: q.id,
      title: q.title,
      description: q.description || '',
      questions: q.question_count || 0,
      plays: 0,
      avgScore: null,
      lastEdited: q.created_at ? new Date(q.created_at).toLocaleDateString('ru-RU') : '—',
      topic: q.topic,
      status: 'live',
      image: q.image || null,
      creator: { username: q.creator, name: q.creator },
    };
  }

  // Backend Question → Frontend question shape
  function fromBackendQuestion(q) {
    var answers = q.answers || [];
    var isTF = answers.length === 2 &&
      answers.some(function (a) { return a.text.toLowerCase() === 'true'; }) &&
      answers.some(function (a) { return a.text.toLowerCase() === 'false'; });
    var type = q.question_type || (isTF ? 'truefalse' : 'single');
    return {
      id: q.id,
      type: type,
      prompt: q.text || '',
      timeLimit: q.time_limit || 30,
      points: q.points || 100,
      shuffleOptions: q.shuffle_options || false,
      imageUrl: q.image_url || (q.image || ''),
      answer: q.correct_answer || '',
      options: answers.map(function (a) {
        return { id: a.id, text: a.text, correct: a.is_correct };
      }),
    };
  }

  // Backend Session → Frontend session shape
  function fromBackendSession(s) {
    return {
      id: s.id,
      code: s.code,
      quiz: s.quiz_title,
      host: s.host,
      players: s.player_count,
      maxPlayers: s.max_players,
      timePerQuestion: s.time_per_question,
      started: s.has_started,
      ended: s.has_ended,
    };
  }

  var USER_KEY = 'quiz:user';

  function upload(path, formData) {
    return fetch(BASE + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCsrf() },
      body: formData,
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Server error (' + res.status + ')');
        return data;
      });
    });
  }

  window.API = {
    get: function (path) { return call('GET', path); },
    post: function (path, body) { return call('POST', path, body); },
    upload: upload,

    getUser: function () {
      try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
      catch (e) { return null; }
    },
    saveUser: function (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      window.CURRENT_USER = u;
    },
    clearUser: function () {
      localStorage.removeItem(USER_KEY);
    },

    fromBackendQuiz: fromBackendQuiz,
    fromBackendQuestion: fromBackendQuestion,
    fromBackendSession: fromBackendSession,
  };
})();
