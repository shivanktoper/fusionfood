// ====================================================================
// Fusion Food Family Lab - E2E Test Framework
// Zero-dependency test runner, assertions, WCAG contrast calculator,
// Chrome CDP controller, and Cloudflare API mock server
// ====================================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

class AssertionEngine {
  constructor() {
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.failures = [];
  }

  assert(condition, message, context = {}) {
    this.totalAssertions++;
    if (condition) {
      this.passedAssertions++;
      return true;
    } else {
      this.failedAssertions++;
      const err = new Error(`Assertion Failed: ${message}`);
      err.context = context;
      this.failures.push({ message, context, stack: err.stack });
      throw err;
    }
  }

  assertEqual(actual, expected, message, context = {}) {
    const passed = actual === expected;
    return this.assert(
      passed,
      `${message || 'Expected values to be strictly equal'} — Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`,
      { ...context, actual, expected }
    );
  }

  assertNotEqual(actual, expected, message, context = {}) {
    const passed = actual !== expected;
    return this.assert(
      passed,
      `${message || 'Expected values not to be equal'} — Did not expect: ${JSON.stringify(expected)}`,
      { ...context, actual, expected }
    );
  }

  assertDeepEqual(actual, expected, message, context = {}) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    return this.assert(
      actualStr === expectedStr,
      `${message || 'Expected objects to be deep equal'} — Expected: ${expectedStr}, Actual: ${actualStr}`,
      { ...context, actual, expected }
    );
  }

  assertGreaterOrEqual(actual, expected, message, context = {}) {
    return this.assert(
      actual >= expected,
      `${message || 'Expected value to be >= expected'} — Expected: >= ${expected}, Actual: ${actual}`,
      { ...context, actual, expected }
    );
  }

  assertLessOrEqual(actual, expected, message, context = {}) {
    return this.assert(
      actual <= expected,
      `${message || 'Expected value to be <= expected'} — Expected: <= ${expected}, Actual: ${actual}`,
      { ...context, actual, expected }
    );
  }

  assertIncludes(actual, substringOrItem, message, context = {}) {
    let passed = false;
    if (typeof actual === 'string' || Array.isArray(actual)) {
      passed = actual.includes(substringOrItem);
    }
    return this.assert(
      passed,
      `${message || 'Expected collection/string to include item'} — Looking for: ${JSON.stringify(substringOrItem)} in: ${typeof actual === 'string' ? actual.slice(0, 100) + '...' : JSON.stringify(actual)}`,
      { ...context, actual, substringOrItem }
    );
  }

  assertMatches(actual, regex, message, context = {}) {
    const passed = regex.test(String(actual));
    return this.assert(
      passed,
      `${message || 'Expected string to match regex'} — Regex: ${regex}, Actual: "${actual}"`,
      { ...context, actual, regex: regex.toString() }
    );
  }

  assertWCAGContrast(fgHex, bgHex, minRatio = 7.0, message = '') {
    const ratio = ContrastCalculator.getRatio(fgHex, bgHex);
    return this.assert(
      ratio >= minRatio,
      `${message || 'WCAG contrast requirement not met'} — Foreground: ${fgHex}, Background: ${bgHex}, Ratio: ${ratio.toFixed(2)}:1 (Required: >= ${minRatio}:1)`,
      { fgHex, bgHex, ratio, minRatio }
    );
  }
}

class ContrastCalculator {
  static getLuminance(hex) {
    hex = String(hex).trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255.0;
    const g = parseInt(hex.substring(2, 4), 16) / 255.0;
    const b = parseInt(hex.substring(4, 6), 16) / 255.0;

    const toLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const R = toLinear(r);
    const G = toLinear(g);
    const B = toLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  static getRatio(hex1, hex2) {
    const l1 = this.getLuminance(hex1);
    const l2 = this.getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  }
}

class MockCloudflareServer {
  constructor(port = 8787) {
    this.port = port;
    this.server = null;
    this.state = {
      profiles: {
        kid: {
          id: 'kid',
          name: 'Maya',
          role: 'student',
          avatar: '🎒',
          xp: 270,
          streak: 3,
          bests_json: JSON.stringify({ hotPotato: 10, trivia: 8, buildDish: 4, pronunciation: 5, scienceSpins: 6 }),
          badges_json: JSON.stringify(['seedling', 'spice_scout'])
        },
        parent: {
          id: 'parent',
          name: 'Chef Priya',
          role: 'parent',
          avatar: '👩‍🍳',
          xp: 450,
          streak: 5,
          bests_json: JSON.stringify({ hotPotato: 20, trivia: 9, buildDish: 6, pronunciation: 7, scienceSpins: 8 }),
          badges_json: JSON.stringify(['sous_chef', 'flame_keeper'])
        }
      },
      leaderboard: [
        { id: 1, user_id: 'parent', user_name: 'Chef Priya', avatar: '👩‍🍳', role: 'parent', game_type: 'overall', score: 450, xp: 450, rank: 1 },
        { id: 2, user_id: 'kid', user_name: 'Maya', avatar: '🎒', role: 'student', game_type: 'overall', score: 270, xp: 270, rank: 2 },
        { id: 3, user_id: 'chef_arjun', user_name: 'Arjun (Mumbai)', avatar: '🌶️', role: 'student', game_type: 'overall', score: 520, xp: 520, rank: 3 },
        { id: 4, user_id: 'chef_elena', user_name: 'Elena (Lima)', avatar: '🥑', role: 'student', game_type: 'overall', score: 390, xp: 390, rank: 4 }
      ]
    };
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
        const pathname = url.pathname.replace(/\/+$/, '');

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Connection', 'close');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            if (pathname === '/api/profile' && req.method === 'GET') {
              const id = url.searchParams.get('id') || 'kid';
              const profile = this.state.profiles[id];
              if (!profile) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Profile not found' }));
                return;
              }
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, profile }));
            } else if (pathname === '/api/profile' && req.method === 'POST') {
              const parsed = JSON.parse(body || '{}');
              if (!parsed.id || !parsed.name) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing required profile fields' }));
                return;
              }
              this.state.profiles[parsed.id] = { ...this.state.profiles[parsed.id], ...parsed };
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, profile: this.state.profiles[parsed.id] }));
            } else if (pathname === '/api/sync' && req.method === 'POST') {
              const parsed = JSON.parse(body || '{}');
              if (!parsed.id || parsed.xp === undefined || parsed.xp < 0 || parsed.streak < 0) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid sync payload' }));
                return;
              }
              const p = this.state.profiles[parsed.id] || { id: parsed.id, name: 'Anonymous', xp: 0, streak: 0 };
              p.xp = parsed.xp;
              p.streak = parsed.streak;
              this.state.profiles[parsed.id] = p;
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, synced: { xp: p.xp, streak: p.streak } }));
            } else if (pathname === '/api/leaderboard' && req.method === 'GET') {
              const filter = url.searchParams.get('filter') || 'overall';
              let limit = parseInt(url.searchParams.get('limit') || '25', 10);
              if (isNaN(limit) || limit <= 0) limit = 25;
              if (limit > 100) limit = 100;

              let rows = this.state.leaderboard.slice();
              if (filter !== 'all' && filter !== 'overall') {
                rows = rows.filter(r => r.game_type === filter);
              }
              rows.sort((a, b) => b.score - a.score);
              rows = rows.slice(0, limit);
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, leaderboard: rows, filter, count: rows.length }));
            } else if (pathname === '/api/submit-score' && req.method === 'POST') {
              const parsed = JSON.parse(body || '{}');
              if (!parsed.user_id || parsed.score === undefined || parsed.score < 0) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid score submission payload' }));
                return;
              }
              const entry = {
                id: this.state.leaderboard.length + 1,
                user_id: parsed.user_id,
                user_name: parsed.user_name || 'Chef',
                avatar: parsed.avatar || '🎒',
                role: parsed.role || 'student',
                game_type: parsed.game_type || 'overall',
                score: parsed.score,
                xp: parsed.xp || parsed.score,
                rank: 1
              };
              this.state.leaderboard.push(entry);
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, entry }));
            } else {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'Route not found' }));
            }
          } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${this.port}`);
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

class ChromeCDPRunner {
  constructor(chromePath, port = 9223) {
    this.chromePath = chromePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.port = port;
    this.chromeProcess = null;
    this.ws = null;
    this.messageId = 1;
    this.pendingCallbacks = new Map();
    this.consoleErrors = [];
    this.runtimeExceptions = [];
  }

  async launch(targetUrl, width = 390, height = 844) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(this.chromePath)) {
          return reject(new Error(`Chrome executable not found at: ${this.chromePath}`));
        }

        const tempUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusion_chrome_'));
        this.chromeProcess = spawn(this.chromePath, [
          '--headless=new',
          `--remote-debugging-port=${this.port}`,
          `--user-data-dir=${tempUserDir}`,
          '--disable-gpu',
          '--no-sandbox',
          `--window-size=${width},${height}`,
          '--mute-audio',
          targetUrl
        ]);

        let started = false;
        let attempts = 0;
        const checkReady = () => {
          attempts++;
          http.get(`http://127.0.0.1:${this.port}/json/list`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
              try {
                const targets = JSON.parse(data);
                const target = targets.find(t => t.url && t.url.includes('index.html') && t.webSocketDebuggerUrl) ||
                  (attempts > 5 ? targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) : null);
                if (target && target.webSocketDebuggerUrl) {
                  started = true;
                  await this.connectWebSocket(target.webSocketDebuggerUrl);
                  resolve(true);
                } else {
                  setTimeout(checkReady, 250);
                }
              } catch (e) {
                setTimeout(checkReady, 250);
              }
            });
          }).on('error', () => {
            if (!started) setTimeout(checkReady, 250);
          });
        };

        setTimeout(checkReady, 500);

        setTimeout(() => {
          if (!started) {
            this.kill();
            reject(new Error('Chrome CDP launch timed out'));
          }
        }, 15000);
      } catch (e) {
        reject(e);
      }
    });
  }

  connectWebSocket(wsUrl) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        await this.sendCommand('Runtime.enable');
        await this.sendCommand('Log.enable');
        await this.sendCommand('Page.enable');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pendingCallbacks.has(msg.id)) {
            const cb = this.pendingCallbacks.get(msg.id);
            this.pendingCallbacks.delete(msg.id);
            cb(msg);
          }

          if (msg.method === 'Runtime.exceptionThrown') {
            this.runtimeExceptions.push(msg.params);
          }
          if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
            this.consoleErrors.push(msg.params.entry);
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      this.ws.onerror = (err) => reject(err);
    });
  }

  sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }
      const id = this.messageId++;
      this.pendingCallbacks.set(id, (msg) => {
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      console.error('[CDP EVAL EXCEPTION]', result.exceptionDetails);
    }
    return result.result ? result.result.value : undefined;
  }

  async setViewport(width, height, deviceScaleFactor = 1, mobile = false) {
    return this.sendCommand('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      screenOrientation: width > height ? { angle: 90, type: 'landscapePrimary' } : { angle: 0, type: 'portraitPrimary' }
    });
  }

  kill() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.chromeProcess) {
      try { this.chromeProcess.kill(); } catch (e) {}
    }
  }
}

class TestReporter {
  constructor() {
    this.suiteResults = [];
    this.startTime = Date.now();
  }

  record(tier, featureId, testName, passed, error = null, durationMs = 0) {
    this.suiteResults.push({
      tier,
      featureId,
      testName,
      passed,
      error: error ? error.message : null,
      durationMs
    });
  }

  printSummary(assertionEngine) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const totalTests = this.suiteResults.length;
    const passedTests = this.suiteResults.filter(r => r.passed).length;
    const failedTests = this.suiteResults.filter(r => !r.passed).length;

    console.log('\n' + '='.repeat(80));
    console.log('       FUSION FOOD FAMILY LAB — OPAQUE-BOX E2E TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Execution Time: ${elapsed}s | Test Suites: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log(`Total Assertions Evaluated: ${assertionEngine.totalAssertions}`);
    console.log(`Assertions Passed: ${assertionEngine.passedAssertions} | Assertions Failed: ${assertionEngine.failedAssertions}`);
    console.log('-'.repeat(80));

    // Tier Breakdown
    const tiers = [1, 2, 3, 4];
    console.log('\n--- TIER BREAKDOWN ---');
    tiers.forEach(t => {
      const tierTests = this.suiteResults.filter(r => r.tier === t);
      const passed = tierTests.filter(r => r.passed).length;
      console.log(`  Tier ${t}: ${passed}/${tierTests.length} tests passed (${((passed / (tierTests.length || 1)) * 100).toFixed(1)}%)`);
    });

    // Feature Coverage Breakdown (F1 - F15)
    console.log('\n--- FEATURE COVERAGE MATRIX (F1 - F15) ---');
    console.log(' Feature | Name                                | T1 Tests | T2 Tests | T3 Tests | Status ');
    console.log('---------+-------------------------------------+----------+----------+----------+--------');
    
    const featureNames = {
      F1: 'Scrolltide Landing Showcase',
      F2: 'Scroll-Driven Lab Animations',
      F3: 'WCAG AAA Contrast Conformance',
      F4: 'Responsive Viewport & Nav Docking',
      F5: 'Three.js Setup & Canvas Lifecycle',
      F6: '3D Tumbling Golden Potato',
      F7: '3D Glowing Tandoor Coals',
      F8: '3D Vegetarian Ingredients',
      F9: '3D Molecular Spice Models',
      F10: 'Cloudflare D1 Backend & REST API',
      F11: 'Leaderboard Local/Global Toggle',
      F12: '100% Stack Code Parity',
      F13: 'Programmatic Viewport Verification',
      F14: 'Screen Recordings Generation',
      F15: 'Zero Console Errors / Exceptions'
    };

    for (let i = 1; i <= 15; i++) {
      const fid = `F${i}`;
      const name = (featureNames[fid] || fid).padEnd(35).slice(0, 35);
      const t1 = this.suiteResults.filter(r => r.tier === 1 && r.featureId === fid);
      const t2 = this.suiteResults.filter(r => r.tier === 2 && r.featureId === fid);
      const t3 = this.suiteResults.filter(r => r.tier === 3 && (r.featureId === fid || (r.testName && r.testName.includes(fid))));
      
      const t1Passed = t1.filter(r => r.passed).length;
      const t2Passed = t2.filter(r => r.passed).length;
      const t3Passed = t3.filter(r => r.passed).length;
      
      const allPassed = (t1.length === 0 || t1Passed === t1.length) && (t2.length === 0 || t2Passed === t2.length);
      const status = allPassed ? 'PASS' : 'FAIL';
      
      console.log(` ${fid.padEnd(7)} | ${name} | ${String(t1Passed).padStart(2)}/${String(t1.length).padEnd(5)} | ${String(t2Passed).padStart(2)}/${String(t2.length).padEnd(5)} | ${String(t3Passed).padStart(2)}/${String(t3.length).padEnd(5)} | ${status.padEnd(6)}`);
    }

    if (failedTests > 0) {
      console.log('\n--- FAILED TEST DETAILS ---');
      this.suiteResults.filter(r => !r.passed).forEach((r, idx) => {
        console.log(`  ${idx + 1}. [Tier ${r.tier}][${r.featureId}] ${r.testName}`);
        console.log(`     Error: ${r.error}`);
      });
    }

    console.log('='.repeat(80) + '\n');
    return failedTests === 0;
  }
}

module.exports = {
  AssertionEngine,
  ContrastCalculator,
  MockCloudflareServer,
  ChromeCDPRunner,
  TestReporter
};
