// Run from repository root: node reports/documentation-audit/measure.cjs
// Static example incidence, not execution or correctness coverage.
const fs = require('node:fs'), path = require('node:path');
const ts = require('../../web/node_modules/typescript');
const out = __dirname, src = 'web/src', cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const exports = {};
  new Function('exports', 'require', ts.transpile(fs.readFileSync(`${src}/${name}.ts`, 'utf8'), {module: ts.ModuleKind.CommonJS}))(exports, p => load(p.replace('./', '')));
  return cache[name] = exports;
}
const examples = [
  ...load('examples').EXAMPLES.map(x => ({...x, id: `gallery:${x.id}`, source: 'gallery', location: `${src}/examples.ts#${x.id}`})),
  ...load('helpExamples').CYCLE_EXAMPLES.map(x => ({id: `help-cycle:${x.value}`, title: x.title, text: x.code, category: 'Help cycles', source: 'help-cycle', location: `${src}/helpExamples.ts#${x.value}`})),
  {id: 'default-boot', title: 'Default boot', text: load('defaultExample').DEFAULT_EXAMPLE_TEXT, category: 'Onboarding', source: 'boot', location: `${src}/defaultExample.ts`},
];
const occurrences = new Map();
for (const e of examples) { const n=(occurrences.get(e.id)||0)+1; occurrences.set(e.id,n); if(n>1)e.id+=`#${n}`; }
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const pages = [];
for (const file of walk(`${src}/docs`).filter(x => x.endsWith('.md') && !path.basename(x).startsWith('_'))) {
  const text = fs.readFileSync(file,'utf8'), reference = file.includes('/reference/');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const name = fm?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  if (name && !/^guide:\s*true/m.test(fm[1])) {
    const body = fm[2], ex = body.split(/^##\s+Examples\s*$/m)[1]?.split(/^##\s/m)[0] || '';
    const ids = [...new Set([...(fm[1].match(/^examples:\s*\[([^\]]*)\]/m)?.[1] || '').split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean), ...[...body.matchAll(/\[Run:\s*([\w-]+)\s*\]/g)].map(m=>m[1])])];
    const rich = /\[Run:/.test(body) || /```|\[Run:/.test(ex);
    pages.push({name, file, ids, tier:rich ? 'rich' : (/^references:\s*\n\s*-\s+/m.test(fm[1]) || body.replace(/\s+/g,' ').trim().length >= 500) ? 'reference' : 'stub'});
  }
  let i = 0;
  for (const m of text.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)) {
    i++;
    // Reference syntax/equations are NOT worked examples. Only Examples sections
    // or explicit run fences count there; all guide fences are inventoried.
    const preceding = text.slice(0,m.index);
    const section = [...preceding.matchAll(/^##\s+(.+)$/gm)].at(-1)?.[1];
    const runnable = /^run(?:\s|$)/.test(m[1]);
    if (reference && !runnable && section !== 'Examples') continue;
    examples.push({id:`${path.relative(src,file)}:${i}`, title: [...preceding.matchAll(/^#+\s+(.+)$/gm)].at(-1)?.[1] || path.basename(file), text:m[2], category:reference?'Reference example':'Guide snippet', source:runnable?'guide-run':reference?'reference-fence':'guide-fence', location:`${file}:${preceding.split('\n').length}`, fence:m[1]});
  }
}
const manifest = JSON.parse(fs.readFileSync(`${src}/docs/reference/function-manifest.json`));
const symbols = new Map();
for (const family of ['functions','matrixFunctions','callProcedures','propertyFunctions','components','replCasOps']) for (const item of manifest[family]) {
  const name = typeof item === 'string' ? item : item.name, key = name.toLowerCase();
  if (!symbols.has(key)) symbols.set(key,{name, families:[], aliases:new Set(), domain:item.domain || item.category || ''});
  const s=symbols.get(key);if(!s.families.includes(family))s.families.push(family);for(const a of item.aliases||[])s.aliases.add(a.toLowerCase());
}
for(const name of manifest.materials.functions) {const k=name.toLowerCase();if(!symbols.has(k))symbols.set(k,{name,families:['materials'],aliases:new Set(),domain:'Materials'});}
// Strip comments and strings, then detect calls or component instantiations.
// Does not follow component expansion or prove branch execution; aliases count
// only when explicitly supplied by the committed manifest.
function tokens(text) {const code=text.replace(/\{[^}]*\}|\/\/[^\n]*|'[^'\n]*'|"[^"\n]*"/g,' ');return new Set([...code.matchAll(/\b([a-zA-Z_][\w$#]*)\s*\(/g), ...code.matchAll(/^\s*([a-zA-Z_][\w]*)[ \t]+[a-zA-Z_][\w]*[ \t]*\(/gm)].map(m=>m[1].toLowerCase()));}
for(const e of examples) e.tokens=tokens(e.text);
const strongSources=new Set(['gallery','help-cycle','boot','guide-run']);
const rows=[...symbols.entries()].map(([key,s])=>{
 const names=[key,...s.aliases], hits=examples.filter(e=>names.some(n=>e.tokens.has(n))), page=pages.find(p=>p.name.toLowerCase()===key);
 return {name:s.name,families:s.families.join(';'),domain:s.domain,page:page?.file||'',tier:page?.tier||'missing',boundExamples:page?.ids.join(';')||'',runnableHits:hits.filter(e=>strongSources.has(e.source)).map(e=>e.id).join(';'),allHits:hits.map(e=>e.id).join(';')};
});
function csv(file,rows) {const keys=Object.keys(rows[0] || {name:'',source:'',note:''});fs.writeFileSync(path.join(out,file),[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');}
csv('symbol-coverage.csv',rows);
csv('examples.csv',examples.map(e=>({id:e.id,title:e.title,source:e.source,category:e.category,location:e.location,featured:!!e.featured,symbols:rows.filter(r=>r.allHits.split(';').includes(e.id)).map(r=>r.name).join(';')})));
const fixtures=walk('fixtures/corpus').filter(f=>f.endsWith('.frees')).map(file=>{const used=tokens(fs.readFileSync(file,'utf8'));return {file,golden:fs.existsSync(file.replace('/corpus/','/golden/').replace(/\.frees$/,'.json')),symbols:[...symbols.entries()].filter(([k,s])=>[k,...s.aliases].some(n=>used.has(n))).map(([,s])=>s.name).join(';')};});
csv('fixtures.csv',fixtures);
const rust=fs.readFileSync('crates/frees-core/src/eval.rs','utf8').split('pub const INTRINSICS:')[1].split('pub fn lookup_intrinsic')[0];
const rustNames=[...new Set([...rust.matchAll(/(?:strict|lazy)!\(\s*"([^"]+)"/g)].map(m=>m[1]))];
const known=new Set([...symbols].flatMap(([k,s])=>[k,...s.aliases]));
const extra=rustNames.filter(n=>!known.has(n)).sort();
csv('rust-inventory-gaps.csv',extra.map(name=>({name,source:'crates/frees-core/src/eval.rs',note:'Absent from manifest names and recorded aliases; may be an alias or additional operation'})));
const counts={};for(const e of examples)counts[e.source]=(counts[e.source]||0)+1;
const summary={denominator:rows.length,fixtureCount:fixtures.length,rustIntrinsicNames:rustNames.length,rustNamesAbsentFromManifest:extra.length,counts,pages:pages.length,tiers:Object.fromEntries(['rich','reference','stub'].map(t=>[t,pages.filter(p=>p.tier===t).length])),runnableIncidence:rows.filter(r=>r.runnableHits).length,allFenceIncidence:rows.filter(r=>r.allHits).length,explicitBindings:rows.filter(r=>r.boundExamples).length,byFamily:{},byComponentDomain:{}};
for(const family of [...new Set(rows.flatMap(r=>r.families.split(';')))]) {const rs=rows.filter(r=>r.families.split(';').includes(family));summary.byFamily[family]={total:rs.length,runnable:rs.filter(r=>r.runnableHits).length,all:rs.filter(r=>r.allHits).length};}
for(const domain of [...new Set(rows.filter(r=>r.families==='components').map(r=>r.domain))]) {const rs=rows.filter(r=>r.families==='components'&&r.domain===domain);summary.byComponentDomain[domain]={total:rs.length,runnable:rs.filter(r=>r.runnableHits).length};}
if(new Set(examples.map(e=>e.id)).size !== examples.length)throw Error('Duplicate example identity');
if(rows.length!==manifest.coverage.documentableSurfaceTotal)throw Error('Denominator mismatch');
if(!tokens('x = sin(1) // cos(0)\nPipe P()').has('pipe') || tokens('{ sin(1) }').has('sin'))throw Error('Scanner self-check failed');
fs.writeFileSync(path.join(out,'coverage-summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(out,'run-candidates.json'),JSON.stringify(examples.filter(e=>strongSources.has(e.source)).map(({tokens,...e})=>e)));
console.log(JSON.stringify(summary,null,2));
