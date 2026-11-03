import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTitle, createSession, summarize, formatDuration,
  listSessions, toggleCompleted, getLocalDate, lastSevenDays
} from '../public/js/core.js';

const TODAY = '2026-11-03';
const NOW = new Date('2026-11-03T09:00:00Z');
const make = (overrides = {}) => ({
  id: 'one', title: 'Unit tests', subject: 'პროგრამირება',
  minutes: 45, date: TODAY, completed: false, createdAt: NOW.toISOString(), ...overrides
});

test('removes extra spaces from a session title', () => {
  assert.equal(cleanTitle('   Test   the   app   '), 'Test the app');
});

test('creates a valid session with normalized title and duration', () => {
  const result = createSession({ title: '  DevOps   practice ', subject: 'პროგრამირება', minutes: '60', date: TODAY }, NOW);
  assert.equal(result.title, 'DevOps practice');
  assert.equal(result.minutes, 60);
  assert.equal(result.completed, false);
  assert.equal(result.date, TODAY);
});

test('rejects sessions with an invalid duration', () => {
  assert.throws(() => createSession({ title: 'Valid title', subject: 'თეორია', minutes: 5, date: TODAY }, NOW), /15-დან 240/);
  assert.throws(() => createSession({ title: 'Valid title', subject: 'თეორია', minutes: 31.5, date: TODAY }, NOW), /15-დან 240/);
});

test('rejects an invalid date or category', () => {
  assert.throws(() => createSession({ title: 'Valid title', subject: 'unknown', minutes: 60, date: TODAY }, NOW), /კატეგორია/);
  assert.throws(() => createSession({ title: 'Valid title', subject: 'თეორია', minutes: 60, date: '2026-02-30' }, NOW), /თარიღი/);
});

test('calculates daily completed minutes and percent correctly', () => {
  const result = summarize([
    make({ completed: true, minutes: 30 }),
    make({ id: 'two', minutes: 90 }),
    make({ id: 'three', date: '2026-11-02', completed: true, minutes: 120 })
  ], TODAY);
  assert.deepEqual(result, { planned: 2, completed: 1, plannedMinutes: 120, finishedMinutes: 30, completionRate: 25 });
});

test('returns zero progress when there are no sessions today', () => {
  assert.equal(summarize([], TODAY).completionRate, 0);
});

test('formats durations under and over one hour', () => {
  assert.equal(formatDuration(45), '45 წთ');
  assert.equal(formatDuration(60), '1 სთ');
  assert.equal(formatDuration(135), '2 სთ 15 წთ');
});

test('filters completed sessions and matches text case-insensitively', () => {
  const items = [make({ title: 'BFS exercises', completed: true }), make({ id: 'two', title: 'CI Pipeline' })];
  assert.equal(listSessions(items, { filter: 'completed' }).length, 1);
  assert.equal(listSessions(items, { query: 'pipeline' })[0].title, 'CI Pipeline');
});

test('toggles only the selected item without mutating the original list', () => {
  const original = [make(), make({ id: 'two' })];
  const next = toggleCompleted(original, 'two');
  assert.equal(next[0].completed, false);
  assert.equal(next[1].completed, true);
  assert.equal(original[1].completed, false);
});

test('creates dates using local calendar fields', () => {
  assert.equal(getLocalDate(new Date(2026, 10, 3)), TODAY);
});

test('weekly chart counts only completed sessions', () => {
  const result = lastSevenDays([make({ completed: true }), make({ id: 'two', minutes: 20 })], new Date(2026, 10, 3));
  assert.equal(result.length, 7);
  assert.equal(result.at(-1).minutes, 45);
});
