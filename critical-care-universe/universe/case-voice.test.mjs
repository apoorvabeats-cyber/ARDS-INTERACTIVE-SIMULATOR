import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCaseVoice } from './case-voice.mjs';

function setup() {
  const spoken = [];
  const failures = [];
  const synth = {
    paused: false, speaking: false, pending: false, cancellations: 0,
    speak(utterance) { spoken.push(utterance); },
    cancel() { this.cancellations++; },
    resume() { this.paused = false; }
  };
  class Utterance { constructor(text) { this.text = text; } }
  return { synth, spoken, failures, voice: createCaseVoice(synth, Utterance, reason => failures.push(reason)) };
}

test('prepares speech on a gesture and narrates the first case after travel', () => {
  const { voice, spoken, failures } = setup();
  voice.prime();
  assert.equal(spoken[0].volume, 0);
  spoken[0].onend();
  voice.prime();
  assert.equal(spoken.length, 1);
  voice.speak('First case');
  assert.equal(spoken[1].text, 'First case');
  spoken[1].onstart();
  spoken[1].onend();
  assert.deepEqual(failures, []);
});

test('reports a blocked or stalled voice and permits a replay', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { voice, spoken, failures } = setup();
  voice.speak('First case');
  t.mock.timers.tick(3000);
  assert.deepEqual(failures, ['speech did not start']);
  voice.speak('First case');
  spoken[1].onstart();
  t.mock.timers.tick(3000);
  assert.equal(failures.length, 1);
  spoken[1].onend();
});

test('ignores callbacks from cancelled speech when changing cases', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { voice, spoken, failures } = setup();
  voice.speak('First case');
  voice.stop();
  voice.speak('Second case');
  spoken[0].onerror({ error: 'interrupted' });
  spoken[1].onstart();
  t.mock.timers.tick(3000);
  assert.deepEqual(failures, []);
  spoken[1].onend();
});

test('does not mark an interrupted prime as complete', () => {
  const { synth, voice, spoken } = setup();
  synth.cancel = () => spoken[0].onend();
  voice.prime();
  voice.stop();
  voice.prime();
  assert.equal(spoken.length, 2);
});

test('surfaces synthesis errors instead of failing silently', () => {
  const { voice, spoken, failures } = setup();
  voice.speak('First case');
  spoken[0].onerror({ error: 'not-allowed' });
  assert.deepEqual(failures, ['not-allowed']);
});

test('reports speech ending without a start event', () => {
  const { voice, spoken, failures } = setup();
  voice.speak('First case');
  spoken[0].onend();
  assert.deepEqual(failures, ['speech ended without starting']);
});
