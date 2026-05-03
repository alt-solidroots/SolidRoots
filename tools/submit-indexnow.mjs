/**
 * IndexNow URL Submission Tool
 * Submits all Solid Roots pages to search engines (Bing, Yandex, etc.)
 * via the IndexNow protocol for instant indexing.
 *
 * Usage: node tools/submit-indexnow.mjs
 */

const CONFIG = {
  host: 'solidroots.in',
  key: '94de5482596044cda1b6dd291ef8884b',
  keyLocation: 'https://solidroots.in/94de5482596044cda1b6dd291ef8884b.txt',
  endpoint: 'https://api.indexnow.org/IndexNow',
};

const URLS_TO_SUBMIT = [
  'https://solidroots.in/',
  'https://solidroots.in/index.html',
  'https://solidroots.in/about.html',
  'https://solidroots.in/select-your-path.html',
];

async function submitToIndexNow() {
  console.log('🚀 IndexNow Submission Tool — Solid Roots');
  console.log('==========================================');
  console.log(`Host:    ${CONFIG.host}`);
  console.log(`Key:     ${CONFIG.key}`);
  console.log(`URLs:    ${URLS_TO_SUBMIT.length} pages\n`);

  const payload = {
    host: CONFIG.host,
    key: CONFIG.key,
    keyLocation: CONFIG.keyLocation,
    urlList: URLS_TO_SUBMIT,
  };

  try {
    const response = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload, null, 2),
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    switch (response.status) {
      case 200:
        console.log('✅ SUCCESS: All URLs submitted successfully!');
        console.log('   Search engines will begin crawling shortly.');
        break;
      case 202:
        console.log('✅ ACCEPTED: URLs received and queued for processing.');
        break;
      case 400:
        console.error('❌ BAD REQUEST: Invalid format. Check your URL list.');
        break;
      case 403:
        console.error('❌ FORBIDDEN: Key not valid. Ensure the key file is accessible at:');
        console.error(`   ${CONFIG.keyLocation}`);
        break;
      case 422:
        console.error('❌ UNPROCESSABLE: URLs do not belong to the declared host.');
        break;
      case 429:
        console.warn('⚠️  TOO MANY REQUESTS: Rate limited. Try again later.');
        break;
      default:
        console.warn(`⚠️  UNEXPECTED STATUS: ${response.status}`);
    }

    console.log('\n📋 URLs Submitted:');
    URLS_TO_SUBMIT.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));

  } catch (error) {
    console.error('❌ NETWORK ERROR: Failed to reach IndexNow API.');
    console.error(`   Details: ${error.message}`);
    process.exit(1);
  }
}

submitToIndexNow();
