// Functions in this file do not depend on the browser, so we can unit-test them.
export const CATEGORIES = Object.freeze(['ალგორითმები', 'პროგრამირება', 'თეორია', 'სხვა']);

export function cleanTitle(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function createSession({ title, subject, minutes, date }, now = new Date()) {
  const finalTitle = cleanTitle(title);
  const duration = Number(minutes);
  const day = String(date ?? '');

  if (finalTitle.length < 3 || finalTitle.length > 70) {
    throw new Error('სათაური უნდა შეიცავდეს 3-დან 70 სიმბოლომდე.');
  }
  if (!CATEGORIES.includes(subject)) {
    throw new Error('აირჩიე სწორი კატეგორია.');
  }
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    throw new Error('ხანგრძლივობა უნდა იყოს 15-დან 240 წუთამდე.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T12:00:00Z`)) ||
      new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error('თარიღი არასწორია.');
  }

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now.getTime()}`,
    title: finalTitle,
    subject,
    minutes: duration,
    date: day,
    completed: false,
    createdAt: now.toISOString()
  };
}

export function summarize(sessions, today) {
  const todaySessions = sessions.filter(item => item.date === today);
  const finished = todaySessions.filter(item => item.completed);
  const plannedMinutes = todaySessions.reduce((total, item) => total + item.minutes, 0);
  const finishedMinutes = finished.reduce((total, item) => total + item.minutes, 0);
  return {
    planned: todaySessions.length,
    completed: finished.length,
    plannedMinutes,
    finishedMinutes,
    completionRate: plannedMinutes ? Math.round((finishedMinutes / plannedMinutes) * 100) : 0
  };
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} წთ`;
  return rest ? `${hours} სთ ${rest} წთ` : `${hours} სთ`;
}

export function listSessions(sessions, { filter = 'all', query = '' } = {}) {
  const search = cleanTitle(query).toLocaleLowerCase('ka');
  return sessions
    .filter(item => filter === 'all' || (filter === 'completed' ? item.completed : !item.completed))
    .filter(item => !search || `${item.title} ${item.subject}`.toLocaleLowerCase('ka').includes(search))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.completed) - Number(b.completed) || a.createdAt.localeCompare(b.createdAt));
}

export function toggleCompleted(sessions, id) {
  return sessions.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
}

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function lastSevenDays(sessions, today = new Date()) {
  const result = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = getLocalDate(day);
    result.push({
      date: key,
      weekday: new Intl.DateTimeFormat('ka-GE', { weekday: 'short' }).format(day),
      minutes: sessions.filter(item => item.date === key && item.completed)
        .reduce((sum, item) => sum + item.minutes, 0)
    });
  }
  return result;
}
