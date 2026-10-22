import 'dotenv/config';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api/v1/fabrication';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_12345';
const validToken = jwt.sign({ id: '6ad99dc54cdb435c61aad162', email: 'qa_tester@fabtec.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    results.push({ test: description, status: 'PASS', details });
    console.log(`[PASS] ${description} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.push({ test: description, status: 'FAIL', details });
    console.error(`[FAIL] ${description} ${details ? '(' + details + ')' : ''}`);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.noAuth ? {} : { 'Authorization': `Bearer ${validToken}` }),
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function runQATests() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE FABRICATION QA TEST SUITE  ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SUITE 1: AUTHENTICATION & SECURITY
  // ----------------------------------------------------
  console.log('--- SUITE 1: Authentication & Security ---');
  {
    const resNoAuth = await api('/terms', { noAuth: true });
    assert('Reject unauthenticated GET /terms', resNoAuth.status === 401, `Status: ${resNoAuth.status}`);

    const resBadToken = await api('/materials', { headers: { 'Authorization': 'Bearer invalid_token_xyz' }, noAuth: true });
    assert('Reject invalid JWT on GET /materials', resBadToken.status === 401, `Status: ${resBadToken.status}`);

    const resAuth = await api('/terms');
    assert('Accept valid JWT on GET /terms', resAuth.status === 200, `Status: ${resAuth.status}`);
  }

  // ----------------------------------------------------
  // SUITE 2: TERMS & CONDITIONS CRUD
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: Terms & Conditions CRUD ---');
  let createdTermId = null;
  {
    const listRes = await api('/terms');
    assert('List quotation terms returns 200 & array', listRes.status === 200 && Array.isArray(listRes.data?.data), `Count: ${listRes.data?.data?.length}`);

    // Create
    const createRes = await api('/terms', {
      method: 'POST',
      body: JSON.stringify({ text: 'QA Test Clause: Payment within 7 days', enabled: true })
    });
    createdTermId = createRes.data?.data?._id;
    assert('Create new quotation term', createRes.status === 201 && createdTermId, `ID: ${createdTermId}`);

    // Update
    const updateRes = await api(`/terms/${createdTermId}`, {
      method: 'PUT',
      body: JSON.stringify({ text: 'QA Test Clause: Updated Payment', enabled: false })
    });
    assert('Update quotation term text and toggle enabled', updateRes.status === 200 && updateRes.data?.data?.enabled === false, `Updated text: ${updateRes.data?.data?.text}`);

    // Delete
    const delRes = await api(`/terms/${createdTermId}`, { method: 'DELETE' });
    assert('Delete quotation term', delRes.status === 200, delRes.data?.message);

    // Verify gone
    const verifyRes = await api('/terms');
    const stillExists = verifyRes.data?.data?.some(t => t._id === createdTermId);
    assert('Verify deleted term no longer in list', !stillExists);
  }

  // ----------------------------------------------------
  // SUITE 3: RAW MATERIALS CRUD
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: Raw Materials CRUD ---');
  let createdMatId = null;
  {
    const listRes = await api('/materials');
    assert('List materials returns 200 & array', listRes.status === 200 && Array.isArray(listRes.data?.data), `Count: ${listRes.data?.data?.length}`);

    // Create
    const createRes = await api('/materials', {
      method: 'POST',
      body: JSON.stringify({ name: 'QA Test Brass Grade C360', density: 8.5 })
    });
    createdMatId = createRes.data?.data?._id;
    assert('Create raw material', createRes.status === 201 && createdMatId, `Name: ${createRes.data?.data?.name}`);

    // Duplicate prevention
    const dupRes = await api('/materials', {
      method: 'POST',
      body: JSON.stringify({ name: 'QA Test Brass Grade C360' })
    });
    assert('Deduplicate material creation', dupRes.status === 200 && dupRes.data?.message?.includes('already exists'));

    // Update
    const updateRes = await api(`/materials/${createdMatId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'QA Test Brass Grade C360 Updated' })
    });
    assert('Update raw material', updateRes.status === 200 && updateRes.data?.data?.name === 'QA Test Brass Grade C360 Updated');

    // Delete
    const delRes = await api(`/materials/${createdMatId}`, { method: 'DELETE' });
    assert('Delete raw material', delRes.status === 200);
  }

  // ----------------------------------------------------
  // SUITE 4: WORK SCOPE TEMPLATES CRUD
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: Work Scope Templates CRUD ---');
  let createdScopeId = null;
  {
    const listRes = await api('/work-scopes');
    assert('List work scopes returns 200 & array', listRes.status === 200 && Array.isArray(listRes.data?.data), `Count: ${listRes.data?.data?.length}`);

    // Create
    const createRes = await api('/work-scopes', {
      method: 'POST',
      body: JSON.stringify({ title: 'QA Test Canopy Roof Structure', defaultUnit: 'Sq.Ft', category: 'Roofing' })
    });
    createdScopeId = createRes.data?.data?._id;
    assert('Create work scope template', createRes.status === 201 && createdScopeId, `Title: ${createRes.data?.data?.title}`);

    // Update
    const updateRes = await api(`/work-scopes/${createdScopeId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'QA Test Canopy Roof Structure (Modified)' })
    });
    assert('Update work scope template', updateRes.status === 200 && updateRes.data?.data?.title?.includes('Modified'));

    // Delete
    const delRes = await api(`/work-scopes/${createdScopeId}`, { method: 'DELETE' });
    assert('Delete work scope template', delRes.status === 200);
  }

  // ----------------------------------------------------
  // SUITE 5: PURCHASE ITEM PRESETS CRUD
  // ----------------------------------------------------
  console.log('\n--- SUITE 5: Purchase Item Presets CRUD ---');
  let createdPresetId = null;
  {
    const listRes = await api('/item-presets');
    assert('List item presets returns 200 & array', listRes.status === 200 && Array.isArray(listRes.data?.data), `Count: ${listRes.data?.data?.length}`);

    // Create
    const createRes = await api('/item-presets', {
      method: 'POST',
      body: JSON.stringify({ description: 'QA Test Argon Gas Refill 47L', category: 'Industrial Gas', defaultUnit: 'Nos' })
    });
    createdPresetId = createRes.data?.data?._id;
    assert('Create purchase item preset', createRes.status === 201 && createdPresetId);

    // Update
    const updateRes = await api(`/item-presets/${createdPresetId}`, {
      method: 'PUT',
      body: JSON.stringify({ description: 'QA Test Argon Gas Refill 47L (Pure)' })
    });
    assert('Update purchase item preset', updateRes.status === 200 && updateRes.data?.data?.description?.includes('Pure'));

    // Delete
    const delRes = await api(`/item-presets/${createdPresetId}`, { method: 'DELETE' });
    assert('Delete purchase item preset', delRes.status === 200);
  }

  // ----------------------------------------------------
  // SUITE 6: VENDORS & EXPENSE CATEGORIES
  // ----------------------------------------------------
  console.log('\n--- SUITE 6: Vendors & Expense Categories ---');
  {
    const venRes = await api('/vendors');
    assert('List fabrication vendors returns 200', venRes.status === 200 && Array.isArray(venRes.data?.data));

    const catRes = await api('/expense-categories');
    assert('List expense categories returns 200', catRes.status === 200 && Array.isArray(catRes.data?.data));

    // Create vendor test
    const createVen = await api('/vendors', {
      method: 'POST',
      body: JSON.stringify({ name: 'QA Test Steel Mills Ltd', phone: '9845099999', notes: 'QA verification supplier' })
    });
    assert('Create fabrication vendor in MongoDB', createVen.status === 201 || (createVen.status === 200 && createVen.data?.success));
  }

  // ----------------------------------------------------
  // SUITE 7: DATA ISOLATION & INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- SUITE 7: Data Isolation & Job List Integrity ---');
  {
    const jobsRes = await api('/jobs');
    const jobs = jobsRes.data?.data?.jobs || [];
    const hasConfigDocInJobs = jobs.some(j => j.jobId === 'FAB-GLOBAL-CONFIG' || j.jobId === 'FAB-CONFIG-MASTER');
    assert('FAB-GLOBAL-CONFIG is strictly excluded from job list', !hasConfigDocInJobs, `Returned ${jobs.length} customer jobs`);

    // Verify search does not leak config doc
    const searchRes = await api('/jobs?search=GLOBAL-CONFIG');
    const searchJobs = searchRes.data?.data?.jobs || [];
    assert('Search does not expose FAB-GLOBAL-CONFIG', searchJobs.length === 0);
  }

  // ----------------------------------------------------
  // SUITE 8: VALIDATION & ERROR HANDLING
  // ----------------------------------------------------
  console.log('\n--- SUITE 8: Validation & Error Handling ---');
  {
    // Empty text
    const emptyTerm = await api('/terms', { method: 'POST', body: JSON.stringify({ text: '' }) });
    assert('Reject empty term with 400', emptyTerm.status === 400);

    const emptyMat = await api('/materials', { method: 'POST', body: JSON.stringify({ name: '   ' }) });
    assert('Reject empty material with 400', emptyMat.status === 400);

    // Non-existent ID
    const badId = '507f1f77bcf86cd799439011';
    const putNotFound = await api(`/terms/${badId}`, { method: 'PUT', body: JSON.stringify({ text: 'Valid text' }) });
    assert('Return 404 for non-existent term ID', putNotFound.status === 404);

    const delNotFound = await api(`/materials/${badId}`, { method: 'DELETE' });
    assert('Return 404 for non-existent material ID', delNotFound.status === 404);
  }

  console.log('\n====================================================');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  console.log(`  QA SUMMARY: ${passes} PASSED, ${fails} FAILED out of ${results.length} tests`);
  console.log('====================================================');
}

runQATests().catch(console.error);
