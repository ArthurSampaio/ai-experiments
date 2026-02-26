#!/usr/bin/env node

const http = require('http');

const BACKEND = 'http://localhost:8000';
const FRONTEND = 'http://localhost:5173';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let result = '';
      res.on('data', chunk => result += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: result, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=== Qwen TTS API Tests ===\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Health endpoint
  try {
    const health = await httpGet(`${BACKEND}/health`);
    if (health.status === 200) {
      console.log('✓ Health endpoint works');
      passed++;
    } else {
      console.log('✗ Health endpoint failed');
      failed++;
    }
  } catch (e) {
    console.log('✗ Health endpoint error:', e.message);
    failed++;
  }

  // Test 2: Speakers endpoint
  try {
    const speakers = await httpGet(`${BACKEND}/v1/speakers`);
    const data = JSON.parse(speakers.data);
    if (data.speakers && data.speakers.includes('Ryan')) {
      console.log('✓ Speakers endpoint works (contains Ryan)');
      passed++;
    } else {
      console.log('✗ Speakers endpoint missing Ryan');
      failed++;
    }
  } catch (e) {
    console.log('✗ Speakers endpoint error:', e.message);
    failed++;
  }

  // Test 3: Languages endpoint
  try {
    const langs = await httpGet(`${BACKEND}/v1/languages`);
    const data = JSON.parse(langs.data);
    if (data.languages && data.languages.includes('English')) {
      console.log('✓ Languages endpoint works (contains English)');
      passed++;
    } else {
      console.log('✗ Languages endpoint missing English');
      failed++;
    }
  } catch (e) {
    console.log('✗ Languages endpoint error:', e.message);
    failed++;
  }

  // Test 4: TTS generation
  try {
    console.log('Generating speech...');
    const tts = await httpPost(`${BACKEND}/tts`, {
      text: 'Hello world',
      speaker: 'Ryan',
      language: 'English',
      speed: 1.0,
      pitch: 1.0
    });
    if (tts.status === 200 && tts.headers['content-type']?.includes('audio/wav')) {
      console.log('✓ TTS generation works (returns WAV audio)');
      passed++;
    } else {
      console.log('✗ TTS generation failed:', tts.status);
      failed++;
    }
  } catch (e) {
    console.log('✗ TTS generation error:', e.message);
    failed++;
  }

  // Test 5: Frontend loads
  try {
    const frontend = await httpGet(FRONTEND);
    if (frontend.status === 200 && frontend.data.includes('<div id="root">')) {
      console.log('✓ Frontend loads correctly');
      passed++;
    } else {
      console.log('✗ Frontend did not load properly');
      failed++;
    }
  } catch (e) {
    console.log('✗ Frontend error:', e.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
