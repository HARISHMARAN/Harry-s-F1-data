import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { buildRaceSummary } from '../buildSummary.js';

const payload = {
  session: {
    sessionKey: 123,
    sessionName: 'Bahrain Grand Prix',
    meetingName: 'Bahrain GP',
    countryName: 'Bahrain',
    circuitShortName: 'Bahrain',
    dateStart: '2026-03-08T14:00:00Z',
    dateEnd: '2026-03-08T16:00:00Z',
    year: 2026,
  },
  generatedAt: '2026-03-08T16:30:00Z',
  podium: [
    { position: 1, driverNumber: 1, driverCode: 'VER', fullName: 'Max Verstappen', teamName: 'Red Bull' },
    { position: 2, driverNumber: 16, driverCode: 'LEC', fullName: 'Charles Leclerc', teamName: 'Ferrari' },
    { position: 3, driverNumber: 44, driverCode: 'HAM', fullName: 'Lewis Hamilton', teamName: 'Ferrari' },
  ],
  topFinishers: [
    { position: 1, driverNumber: 1, driverCode: 'VER', fullName: 'Max Verstappen', teamName: 'Red Bull' },
  ],
  fastestLap: {
    driverNumber: 1,
    driverCode: 'VER',
    fullName: 'Max Verstappen',
    lapNumber: 52,
    lapTimeSeconds: 90.1,
  },
  notableFacts: ['Race session completed successfully'],
};

const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

async function testSuccessSummary() {
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'test-model';

  const originalCreate = OpenAI.prototype.responses?.create;
  OpenAI.prototype.responses = {
    create: async () => ({ output_text: 'Bahrain Grand Prix: VER won from LEC and HAM. Fastest lap by VER.' }),
  };

  const result = await buildRaceSummary(payload);
  assert.equal(result.summary.includes('Bahrain Grand Prix'), true);
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.model, 'test-model');

  OpenAI.prototype.responses = { create: originalCreate };
}

async function testFallbackMissingConfig() {
  delete process.env.OPENAI_API_KEY;
  const result = await buildRaceSummary(payload);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.model, null);
  assert.ok(result.summary.includes('Bahrain Grand Prix'));
}

async function testFallbackOnError() {
  process.env.OPENAI_API_KEY = 'test-key';
  delete process.env.OPENAI_MODEL;

  const originalCreate = OpenAI.prototype.responses?.create;
  OpenAI.prototype.responses = {
    create: async () => {
      throw new Error('boom');
    },
  };

  const result = await buildRaceSummary(payload);
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.summary.includes('Bahrain Grand Prix'));

  OpenAI.prototype.responses = { create: originalCreate };
}

async function testGroundedSummary() {
  delete process.env.OPENAI_API_KEY;
  const result = await buildRaceSummary(payload);
  assert.ok(result.summary.includes('Bahrain Grand Prix'));
  assert.ok(result.summary.includes('Podium'));
}

(async () => {
  await testSuccessSummary();
  await testFallbackMissingConfig();
  await testFallbackOnError();
  await testGroundedSummary();

  process.env.OPENAI_API_KEY = originalApiKey;
  process.env.OPENAI_MODEL = originalModel;

  console.log('buildSummary tests passed');
})();
