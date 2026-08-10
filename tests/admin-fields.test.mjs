// Checks the admin dashboard's field extractors against real submit payloads.
// The form (public/js/flow-config.js) uses different answer keys per property
// type, so the table columns depend on these fallbacks staying correct.
import assert from 'assert'
import fs from 'fs'
import path from 'path'

const html = fs.readFileSync(path.resolve('public/admin.html'), 'utf8')

// Pull the pure helpers straight out of the page so the test can't drift from it.
const NAMES = ['LOCATION_KEYS', 'BUDGET_KEYS', 'parseAnswers', 'pick', 'getName',
  'getProperty', 'getLocation', 'getBudget', 'getPhone', 'getEmail', 'isUrl', 'hasFiles']

function extract(name) {
  const re = new RegExp(`^(?:const ${name} = |function ${name}\\()`, 'm')
  const start = html.search(re)
  assert.ok(start !== -1, `admin.html no longer defines ${name}`)
  const open = name === name.toUpperCase() ? '[' : '{'
  const close = open === '[' ? ']' : '}'
  let i = html.indexOf(open, start)
  let depth = 0
  for (; i < html.length; i++) {
    if (html[i] === open) depth++
    else if (html[i] === close && --depth === 0) break
  }
  return html.slice(start, i + 1) + (open === '[' ? ';' : '')
}

const src = NAMES.map(extract).join('\n')
const ctx = new Function(`${src}; return { ${NAMES.join(', ')} };`)()

// Payloads exactly as flow.js builds them for each branch.
const buyPlot = ctx.parseAnswers(JSON.stringify({
  'What are you looking to buy?': 'Residential Plot', Name: 'Ramesh Kumar',
  'Preferred Size': '200 sq yards', 'Society Name / City': 'Sector 21, Sonipat',
  'Budget (approx)': '50 Lakhs', 'Phone Number': '9876543210',
}))
const sellLand = ctx.parseAnswers(JSON.stringify({
  'What are you looking to sell?': 'Land', Name: 'Suresh Yadav', Contact: '9812345678',
  'Total Land in Acre': '5 Acres', Category: 'Agriculture', 'Demand per Acre': '20 Lakhs',
  'Upload Sijra / Map': 'https://res.cloudinary.com/x/image/upload/v1/map.jpg',
}))
const buyGeneric = ctx.parseAnswers(JSON.stringify({
  'What are you looking to buy?': 'Land',
  'Which city or area are you looking in?': 'Sonipat',
  "What's your budget range?": '80 Lakhs',
}))

// Name / property / location / budget resolve across differing key sets.
assert.strictEqual(ctx.getName(buyPlot), 'Ramesh Kumar')
assert.strictEqual(ctx.getProperty(buyPlot), 'Residential Plot')
assert.strictEqual(ctx.getProperty(sellLand), 'Land')
assert.strictEqual(ctx.getLocation(buyPlot), 'Sector 21, Sonipat')
assert.strictEqual(ctx.getLocation(buyGeneric), 'Sonipat')
assert.strictEqual(ctx.getBudget(buyPlot), '50 Lakhs')
assert.strictEqual(ctx.getBudget(sellLand), '20 Lakhs')
assert.strictEqual(ctx.getBudget(buyGeneric), '80 Lakhs')

// Phone falls back through the sub-form keys when the column is empty.
assert.strictEqual(ctx.getPhone({ phone: '', _answers: buyPlot }), '9876543210')
assert.strictEqual(ctx.getPhone({ phone: '', _answers: sellLand }), '9812345678')
assert.strictEqual(ctx.getPhone({ phone: '9000000000', _answers: buyPlot }), '9000000000')

// Uploads must be detected so the drawer renders them as files, not text.
assert.strictEqual(ctx.hasFiles(sellLand), true)
assert.strictEqual(ctx.hasFiles(buyPlot), false)
assert.strictEqual(ctx.isUrl('https://x/y.jpg'), true)
assert.strictEqual(ctx.isUrl('50 Lakhs'), false)

// Malformed/legacy answers must not throw (older rows stored arrays or plain text).
assert.deepStrictEqual(ctx.parseAnswers('["a","b"]'), { 'Response 1': 'a', 'Response 2': 'b' })
assert.deepStrictEqual(ctx.parseAnswers('not json'), { Answer: 'not json' })
assert.deepStrictEqual(ctx.parseAnswers(''), {})
assert.strictEqual(ctx.getName(ctx.parseAnswers('')), '')

console.log('admin-fields: all assertions passed')
