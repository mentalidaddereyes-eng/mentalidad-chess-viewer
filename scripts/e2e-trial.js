/**
 * E2E Tests for Trial System - feat(subscriptions)
 * Tests:
 * 1. GET /api/plan → FREE + trial eligible
 * 2. POST /api/analyze (FREE) → uses MODEL_FREE + depth 14
 * 3. POST /api/analyze (FREE trial) → 1st PRO analysis allowed
 * 4. POST /api/analyze (FREE trial) → 2nd PRO analysis blocked (402)
 * 5. POST /api/analyze (FREE) → still works with lite model
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.API_URL || 'http://localhost:5001';

// Helper to reset trial store (for fresh tests)
async function resetTrialStore() {
  const fs = require('fs');
  const path = require('path');
  const trialStorePath = path.join(__dirname, '..', 'attached_assets', 'trial-store.json');
  try {
    if (fs.existsSync(trialStorePath)) {
      fs.unlinkSync(trialStorePath);
      console.log('✓ Trial store reset');
    }
  } catch (e) {
    console.warn('Could not reset trial store:', e.message);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== E2E Trial System Tests ===\n');
  
  // Reset trial store for fresh tests
  await resetTrialStore();
  await sleep(500);

  let passed = 0;
  let failed = 0;

  // TEST 1: GET /api/plan
  console.log('TEST 1: GET /api/plan (should return FREE + trial eligible)');
  try {
    const res = await fetch(`${BASE_URL}/api/plan?plan=free`);
    const data = await res.json();
    
    if (data.plan === 'free' && data.trial && typeof data.trial.eligible === 'boolean') {
      console.log('  ✓ PASS: Plan is FREE, trial info present');
      passed++;
    } else {
      console.log('  ✗ FAIL: Invalid response', data);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL:', error.message);
    failed++;
  }

  // TEST 2: POST /api/analyze (FREE - should use depth 14)
  console.log('\nTEST 2: POST /api/analyze (FREE - should use MODEL_FREE + depth 14)');
  try {
    const res = await fetch(`${BASE_URL}/api/analyze?plan=free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.plan === 'free' && data.depth === 14 && data.model && data.model.includes('lite')) {
      console.log(`  ✓ PASS: FREE uses depth ${data.depth}, model ${data.model}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected depth 14, got ${data.depth}, model: ${data.model}`);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL:', error.message);
    failed++;
  }

  // TEST 3: POST /api/analyze (FREE trial - 1st PRO analysis)
  console.log('\nTEST 3: POST /api/analyze (FREE trial - 1st PRO analysis should be allowed)');
  try {
    const res = await fetch(`${BASE_URL}/api/analyze?plan=free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        depth: 22, // PRO depth
      }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.trialUsed === true && data.depth === 22) {
      console.log(`  ✓ PASS: 1st PRO analysis allowed, trial used, depth ${data.depth}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected trialUsed=true, got ${data.trialUsed}, depth ${data.depth}`);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL:', error.message);
    failed++;
  }

  // TEST 4: POST /api/analyze (FREE trial - 2nd PRO analysis should block)
  console.log('\nTEST 4: POST /api/analyze (FREE trial - 2nd PRO analysis should return 402)');
  try {
    const res = await fetch(`${BASE_URL}/api/analyze?plan=free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        depth: 22, // PRO depth
      }),
    });
    
    if (res.status === 402) {
      const data = await res.json();
      if (data.reason === 'TRIAL_ENDED') {
        console.log('  ✓ PASS: 2nd PRO analysis correctly blocked with 402 TRIAL_ENDED');
        passed++;
      } else {
        console.log(`  ✗ FAIL: Expected reason=TRIAL_ENDED, got ${data.reason}`);
        failed++;
      }
    } else {
      const data = await res.json().catch(() => ({}));
      console.log(`  ✗ FAIL: Expected 402, got ${res.status}`, data);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL:', error.message);
    failed++;
  }

  // TEST 5: POST /api/analyze (FREE still works after trial)
  console.log('\nTEST 5: POST /api/analyze (FREE should still work with lite model + depth 14)');
  try {
    const res = await fetch(`${BASE_URL}/api/analyze?plan=free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        // No depth specified → should use FREE depth (14)
      }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.plan === 'free' && data.depth === 14) {
      console.log(`  ✓ PASS: FREE still works with depth ${data.depth}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: Expected depth 14, got ${data.depth}`);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL:', error.message);
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
