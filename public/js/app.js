import { createSession, summarize, formatDuration, listSessions, toggleCompleted, getLocalDate, lastSevenDays } from './core.js';

const STORAGE_KEY = 'focusboard.sessions.v1';
const today = getLocalDate();
const $ = selector => document.querySelector(selector);
let filter = 'all';
let search = '';
let sessions = loadSessions();

function sampleSessions() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const items = [
    { title: 'გრაფების ალგორითმების გამეორება', subject: 'ალგორითმები', minutes: 60, date: today, completed: true },
    { title: 'DevOps Pipeline-ის აწყობა', subject: 'პროგრამირება', minutes: 90, date: today, completed: false },
    { title: 'Unit Test-ების დაწერა', subject: 'პროგრამირება', minutes: 45, date: today, completed: false },
    { title: 'UML დიაგრამების განხილვა', subject: 'თეორია', minutes: 50, date: getLocalDate(yesterday), completed: true }
  ];
  return items.map((item, i) => ({ ...createSession(item, new Date(Date.now() + i)), completed: item.completed }));
}

function loadSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('Unable to load saved sessions:', error);
  }
  const examples = sampleSessions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(examples));
  return examples;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  render();
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function dateLabel(date) {
  if (date === today) return 'დღეს';
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('ka-GE', { day: 'numeric', month: 'short' }).format(value);
}

function renderSessions() {
  const list = $('#sessionList');
  list.replaceChildren();
  const visible = listSessions(sessions, { filter, query: search });
  $('#sessionCounter').textContent = `${visible.length} სესია`;

  if (!visible.length) {
    const empty = node('div', 'empty-state');
    empty.append(node('div', 'empty-symbol', '☷'), node('strong', '', 'სესიები ვერ მოიძებნა'), node('p', '', 'შეცვალე ფილტრი ან დაამატე ახალი სასწავლო სესია.'));
    list.append(empty);
    return;
  }

  for (const item of visible) {
    const row = node('article', `session-row${item.completed ? ' is-done' : ''}`);
    const check = node('button', `complete-button${item.completed ? ' checked' : ''}`, item.completed ? '✓' : '');
    check.type = 'button';
    check.setAttribute('aria-label', `${item.completed ? 'დაუსრულებლად მონიშვნა:' : 'დასრულებულად მონიშვნა:'} ${item.title}`);
    check.addEventListener('click', () => { sessions = toggleCompleted(sessions, item.id); save(); });

    const info = node('div', 'session-info');
    info.append(node('strong', '', item.title));
    const details = node('div', 'session-details');
    details.append(node('span', 'subject-pill', item.subject), node('span', '', `◷ ${formatDuration(item.minutes)}`), node('span', '', `▦ ${dateLabel(item.date)}`));
    info.append(details);

    const right = node('div', 'session-actions');
    right.append(node('span', `state-label ${item.completed ? 'done' : 'pending'}`, item.completed ? 'დასრულდა' : 'დასაგეგმი'));
    const remove = node('button', 'delete-button', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `წაშლა: ${item.title}`);
    remove.title = 'სესიის წაშლა';
    remove.addEventListener('click', () => { sessions = sessions.filter(session => session.id !== item.id); save(); });
    right.append(remove);
    row.append(check, info, right);
    list.append(row);
  }
}

function renderWeek() {
  const days = lastSevenDays(sessions);
  const max = Math.max(60, ...days.map(item => item.minutes));
  const bars = $('#weekBars');
  bars.replaceChildren();
  for (const day of days) {
    const column = node('div', 'week-column');
    const bar = node('div', `week-bar${day.date === today ? ' today-bar' : ''}`);
    bar.style.height = `${Math.max(6, (day.minutes / max) * 100)}%`;
    bar.title = `${day.minutes} წუთი`;
    column.append(bar, node('span', '', day.weekday));
    bars.append(column);
  }
}

function render() {
  const summary = summarize(sessions, today);
  $('#plannedCount').textContent = summary.planned;
  $('#completedCount').textContent = summary.completed;
  $('#finishedTime').textContent = formatDuration(summary.finishedMinutes);
  $('#progressPercent').textContent = `${summary.completionRate}%`;
  $('#progressDonut').style.setProperty('--progress', summary.completionRate);
  renderSessions();
  renderWeek();
}

function openDialog() {
  $('#sessionForm').reset();
  $('#sessionForm').elements.date.value = today;
  $('#formError').textContent = '';
  $('#sessionDialog').showModal();
  $('#sessionForm').elements.title.focus();
}

$('#openModal').addEventListener('click', openDialog);
$('#closeModal').addEventListener('click', () => $('#sessionDialog').close());
$('#cancelModal').addEventListener('click', () => $('#sessionDialog').close());
$('#sessionDialog').addEventListener('click', event => {
  if (event.target === $('#sessionDialog')) $('#sessionDialog').close();
});
$('#sessionForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const entry = createSession(Object.fromEntries(data));
    sessions = [...sessions, entry];
    save();
    $('#sessionDialog').close();
    filter = 'all';
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('selected', tab.dataset.filter === 'all'));
    $('#searchInput').value = '';
    search = '';
    render();
  } catch (error) {
    $('#formError').textContent = error.message;
  }
});

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  filter = tab.dataset.filter;
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('selected', item === tab));
  renderSessions();
}));
$('#searchInput').addEventListener('input', event => { search = event.target.value; renderSessions(); });

async function checkServer() {
  const element = $('#serverStatus');
  try {
    const response = await fetch('/health', { cache: 'no-store', signal: AbortSignal.timeout(3500) });
    if (!response.ok || (await response.json()).status !== 'ok') throw new Error('not healthy');
    element.className = 'server-status online';
    element.innerHTML = '<i></i> სერვერი მუშაობს';
  } catch {
    element.className = 'server-status offline';
    element.innerHTML = '<i></i> კავშირის შეცდომა';
  }
}

render();
checkServer();
setInterval(checkServer, 45000);
