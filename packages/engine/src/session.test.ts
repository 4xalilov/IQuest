import { describe, expect, it } from 'vitest';
import { buildForm } from './generator';
import { answer, isSessionState, newSession, noteBlur, pause, remaining, resumeSection, startPractice, tick } from './session';
import type { SessionState, TestForm } from './types';

const form = buildForm(11);
const T0 = 1_700_000_000_000;

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

describe('session', () => {
  it('starts in intro with contract fields', () => {
    const s = newSession(form, 11);
    expect(s).toMatchObject({ formId: form.id, seed: 11, section: 0, item: 0, phase: 'intro', blurCount: 0, sectionStartedAt: null });
    expect(s.answers.map((r) => r.length)).toEqual([9, 9, 9]);
    expect(s.answers.flat().every((a) => a === null)).toBe(true);
    expect(s.remainingSec).toEqual([300, 300, 300]);
    expect(isSessionState(s)).toBe(true);
  });

  it('flows through all sections immutably, recording answers and rt', () => {
    let s = deepFreeze(newSession(form, 11));
    s = deepFreeze(startPractice(s));
    expect(s.phase).toBe('practice');
    expect(answer(s, 0, T0)).toBe(s); // practice answers are not recorded
    let now = T0;
    for (let sec = 0; sec < 3; sec++) {
      s = deepFreeze(resumeSection(s, now));
      expect(s.phase).toBe('question');
      expect(s.section).toBe(sec);
      for (let i = 0; i < 9; i++) {
        expect(s.item).toBe(i);
        now += 5000 + i;
        const before = JSON.stringify(s);
        const n = answer(s, i === 4 ? null : form.sections[sec].items[i].answer, now);
        expect(JSON.stringify(s)).toBe(before);
        s = deepFreeze(n);
        expect(s.rtMs[sec][i]).toBe(5000 + i);
      }
      expect(s.phase).toBe(sec < 2 ? 'break' : 'finished');
      expect(s.sectionStartedAt).toBeNull();
      if (sec < 2) {
        expect(s.section).toBe(sec + 1);
        expect(s.item).toBe(0);
        now += 60_000; // break time is not counted
      }
    }
    expect(s.answers.flat().filter((a) => a === null)).toHaveLength(3);
    expect(s.remainingSec.every((r) => r > 250 && r <= 300)).toBe(true);
    expect(answer(s, 1, now + 1000)).toBe(s); // finished: no-op
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('tick closes a section when time runs out; unanswered stay null', () => {
    let s = resumeSection(newSession(form, 11), T0);
    s = answer(s, 0, T0 + 3000);
    s = tick(s, T0 + 100_000);
    expect(s.phase).toBe('question');
    expect(s.remainingSec[0]).toBe(200);
    expect(remaining(s, T0 + 100_500)).toBe(200);
    s = tick(s, T0 + 300_000);
    expect(s.phase).toBe('break');
    expect(s.section).toBe(1);
    expect(s.remainingSec[0]).toBe(0);
    expect(s.answers[0].slice(1).every((a) => a === null)).toBe(true);
    expect(s.elapsedMs[0]).toBe(300_000);
  });

  it('a late answer after the deadline closes the section and is discarded', () => {
    let s = resumeSection(newSession(form, 11), T0);
    s = answer(s, 2, T0 + 301_000);
    expect(s.phase).toBe('break');
    expect(s.answers[0][0]).toBeNull();
  });

  it('tick on the last section finishes the test', () => {
    let s = newSession(form, 11);
    for (let sec = 0; sec < 3; sec++) {
      s = resumeSection(s, T0 + sec * 1e6);
      s = tick(s, T0 + sec * 1e6 + 300_000);
    }
    expect(s.phase).toBe('finished');
  });

  it('pause / resume mid-section keeps position and remaining time (survives JSON round-trip)', () => {
    let s = resumeSection(newSession(form, 11), T0);
    s = answer(s, 1, T0 + 10_000);
    s = answer(s, 1, T0 + 20_000);
    s = pause(s, T0 + 30_000);
    expect(s.sectionStartedAt).toBeNull();
    expect(s.remainingSec[0]).toBe(270);
    expect(answer(s, 1, T0 + 31_000)).toBe(s); // paused: ignored
    const restored = JSON.parse(JSON.stringify(s)) as SessionState;
    expect(isSessionState(restored)).toBe(true);
    let r = resumeSection(restored, T0 + 5_000_000); // hours later
    expect(r.phase).toBe('question');
    expect(r.section).toBe(0);
    expect(r.item).toBe(2);
    expect(remaining(r, T0 + 5_000_000)).toBe(270);
    r = answer(r, 3, T0 + 5_004_000);
    expect(r.rtMs[0][2]).toBe(4000);
    expect(r.answers[0][2]).toBe(3);
  });

  it('zero-second section closes immediately on resume', () => {
    const f: TestForm = { ...form, sections: form.sections.map((x) => ({ ...x, seconds: 0 })) };
    const s = resumeSection(newSession(f, 1), T0);
    expect(s.phase).toBe('break');
    expect(s.section).toBe(1);
    expect(s.remainingSec[0]).toBe(0);
  });

  it('ignores invalid answer values and counts blurs', () => {
    let s = resumeSection(newSession(form, 11), T0);
    s = answer(s, -1 as number, T0 + 2000);
    expect(s.answers[0][0]).toBeNull();
    s = noteBlur(noteBlur(s));
    expect(s.blurCount).toBe(2);
  });

  it('isSessionState rejects garbage', () => {
    for (const bad of [null, 1, 'x', [], {}, { ...newSession(form, 1), answers: 'no' }, { ...newSession(form, 1), section: 7 }, { ...newSession(form, 1), phase: 'zzz' }]) {
      expect(isSessionState(bad)).toBe(false);
    }
  });
});
