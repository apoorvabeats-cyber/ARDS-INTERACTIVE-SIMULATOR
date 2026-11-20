import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnnouncer, pickFemaleVoice, spokenAlarmText, echoTail } from './alarm-voice.mjs';

function rig(opts = {}) {
  let t = 0; const timers = []; const log = []; const spoken = [];
  const synth = { speak(u) { spoken.push(u); log.push('speak:' + u.text); }, cancel() { log.push('cancel'); } };
  class U { constructor(x) { this.text = x; } }
  const run = (ms) => { const end = t + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const n = timers.find(x => x.at <= end); if (!n) break; timers.splice(timers.indexOf(n), 1); t = n.at; n.fn(); } t = end; };
  const a = createAnnouncer({ synthesis: synth, Utterance: U, getVoices: () => [{ name: 'Microsoft Heera', lang: 'en-IN' }, { name: 'Microsoft Ravi', lang: 'en-IN' }],
    setTimer: (fn, ms) => { const o = { fn, at: t + ms }; timers.push(o); return o; }, clearTimer: o => { const i = timers.indexOf(o); if (i >= 0) timers.splice(i, 1); },
    now: () => t, beforeSpeak: () => log.push('narration-stop'), chime: () => log.push('chime'), afterSpeak: () => log.push('after'), ...opts });
  return { a, run, log, spoken, now: () => t };
}

test('picks a female English voice and never a male one', () => {
  const v = pickFemaleVoice([{ name: 'Microsoft Ravi', lang: 'en-IN' }, { name: 'Google UK English Male', lang: 'en-GB' }, { name: 'Microsoft Heera', lang: 'en-IN' }, { name: 'Alex', lang: 'en-US' }]);
  assert.equal(v.name, 'Microsoft Heera');
  assert.equal(pickFemaleVoice([{ name: 'Microsoft Ravi', lang: 'en-IN' }, { name: 'Daniel', lang: 'en-GB' }]), null);
});

test('reads the red banner as speech', () => {
  assert.equal(spokenAlarmText('Alarm · bed 4 · Arjun Singh: Marked vital abnormality (simulated)'), 'Alarm. Bed 4. Arjun Singh. Marked vital abnormality.');
  assert.match(spokenAlarmText('Bed 5: insulin with K⁺ below 3.5 mmol/L; defer insulin'), /potassium below 3\.5 millimoles per litre/);
  assert.equal(echoTail('Alarm. Bed 4. Marked vital abnormality.'), 'Marked vital abnormality');
});

test('alarm stops narration, chimes, speaks, then echoes the last words quietly', () => {
  const { a, run, log, spoken } = rig();
  a.announce('Alarm · bed 2 · Fatima Begum: Marked vital abnormality (simulated)');
  run(0); assert.deepEqual(log.slice(0, 3), ['narration-stop', 'cancel', 'chime']);
  run(1500); assert.equal(spoken[0].text, 'Alarm. Bed 2. Fatima Begum. Marked vital abnormality.'); assert.equal(spoken[0].voice.name, 'Microsoft Heera');
  spoken[0].onend(); run(400);
  assert.equal(spoken[1].text, 'Marked vital abnormality'); assert.ok(spoken[1].volume < 0.4);
  spoken[1].onend(); assert.ok(log.includes('after')); assert.equal(a.busy(), false);
});

test('second announcement starts at least 15 seconds after the first one began', () => {
  const { a, run, spoken, log, now } = rig();
  a.announce('Alarm one'); run(0); const began = now(); run(1500); spoken[0].onend(); run(400); spoken[1].onend();
  a.announce('Alarm two');
  run(began + 14900 - now()); assert.equal(spoken.length, 2, 'still waiting');
  run(100 + 1600); assert.equal(spoken[2].text, 'Alarm two.');
  assert.ok(log.filter(x => x === 'chime').length === 2);
});

test('queue keeps the newest three and drops duplicates', () => {
  const { a } = rig();
  a.announce('A'); a.announce('A'); a.announce('B'); a.announce('C'); a.announce('D');
  assert.equal(a.pending(), 3);
});

test('a long announcement that did start is not cut off by the watchdog', () => {
  const { a, run, spoken } = rig();
  a.announce('Long one'); run(1500); spoken[0].onstart(); run(20000);
  assert.equal(a.busy(), true); spoken[0].onend(); run(400); assert.equal(spoken.length, 2);
});

test('a speech engine that never starts does not wedge the announcer', () => {
  const failures = [];
  const { a, run, spoken } = rig({ report: m => failures.push(m) });
  a.announce('First'); run(1500); run(7600);  // never fires onstart
  assert.ok(failures.length); assert.equal(a.busy(), false);
  a.announce('Second'); run(16000); assert.ok(spoken.some(s => s.text === 'Second.'));
});
