// Quiz.Topic (from quiz/models.py)
const TOPICS = [
  { code: 'GK', label: 'General Knowledge', hue: 200 },
  { code: 'MV', label: 'Movies & TV',       hue: 0   },
  { code: 'VG', label: 'Video Games',       hue: 270 },
  { code: 'MU', label: 'Music',             hue: 320 },
  { code: 'SC', label: 'Science & Nature',  hue: 145 },
  { code: 'HS', label: 'History & Culture', hue: 35  },
  { code: 'IN', label: 'Internet & Pop',    hue: 290 },
  { code: 'SP', label: 'Sports',            hue: 120 },
  { code: 'LT', label: 'Literature',        hue: 50  },
  { code: 'LG', label: 'Logic & Riddles',   hue: 230 },
  { code: 'AN', label: 'Anime',             hue: 340 },
  { code: 'CT', label: 'Cartoons',          hue: 80  },
];

const TOPIC_BY_CODE = Object.fromEntries(TOPICS.map(t => [t.code, t]));
const POINTS_PER_CORRECT = 5; // backend: 5 credits per correct answer
const FIRST_ANSWER_BONUS  = 1; // backend: +1 if you were first

// Current user — loaded from localStorage (set by api.js on login/register)
const CURRENT_USER = (window.API && window.API.getUser()) || {
  username: 'guest',
  name: 'Guest',
  email: '',
  credits: 0,
  permission: 'user',
  description: '',
  birthday: '',
};

// useLang hook is defined in i18n.js (loaded before React) and available as window.useLang.

Object.assign(window, {
  TOPICS, TOPIC_BY_CODE, CURRENT_USER,
  POINTS_PER_CORRECT, FIRST_ANSWER_BONUS,
});
