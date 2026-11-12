const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ts = require('typescript');
const { IDBFactory } = require('fake-indexeddb');
const compile = s => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const source = name => fs.readFileSync(path.join(__dirname, '../apps/web-studio/src', name), 'utf8');
const storeURL = compile(source('browser-store.ts'));
const transportURL = compile(source('studio-fetch.ts').replace('"./browser-store"', JSON.stringify(storeURL)));
const workspace = { files: { html: '<main>Saved</main>', css: '', js: '' }, past: [], future: [], projectName: 'Example' };
const KEY = 'sk-test-not-a-real-key-12345';
test('browser history survives a new app instance and serializes stale writes', async () => {
 const { createBrowserStore } = await import(storeURL), factory = new IDBFactory();
 const first = createBrowserStore(factory, 'history');
 assert.equal((await first.readHistory()).state, null);
 await first.saveHistory(workspace, 0); await first.close();
 const next = createBrowserStore(factory, 'history');
 assert.deepEqual((await next.readHistory()).state, workspace);
 const outcomes = await Promise.allSettled([next.saveHistory({...workspace, projectName:'A'},1), next.saveHistory({...workspace, projectName:'B'},1)]);
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1); assert.equal(outcomes.find(o=>o.status==='rejected').reason.status,409);
 await next.close();
});
test('browser chat persistence rejects credential fields', async () => {
 const { createBrowserStore } = await import(storeURL), factory=new IDBFactory(), store=createBrowserStore(factory,'chat');
 const messages=[{id:'one',role:'user',text:'Hello',at:new Date().toISOString()}];
 await store.saveMessages(messages); await store.close();
 const reopened=createBrowserStore(factory,'chat'); assert.deepEqual(await reopened.readMessages(),messages);
 await assert.rejects(reopened.saveMessages([{...messages[0],apiKey:KEY}])); await reopened.close();
});
test('each browser transport owns its own ephemeral key and uses only the project API prefix',async()=>{
 const {createStudioRequest}=await import(transportURL),{createBrowserStore}=await import(storeURL);
 const store=createBrowserStore(new IDBFactory(),'transport'), calls=[];
 const transport=createStudioRequest(store,async(url,init)=>{calls.push({url,init});return Response.json({ok:true});});
 await transport('/api/ai/key',{method:'PUT',body:JSON.stringify({key:KEY})});
 const cfg=await(await transport('/api/ai/config')).json(); assert.equal(cfg.configured,true); assert.equal(cfg.oauth.available,false); assert.ok(!JSON.stringify(cfg).includes(KEY));
 await transport('/api/ai/responses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-6.1-sol',authMode:'apiKey'})});
 assert.equal(calls.length,1); assert.equal(calls[0].url,'/ysb5397/web-studio/api/ai/responses'); assert.equal(calls[0].init.headers.get('Authorization'),'Bearer '+KEY);
 assert.ok(!calls[0].init.body.includes(KEY));
 const newTab=createStudioRequest(store); assert.equal((await(await newTab('/api/ai/config')).json()).configured,false);
 assert.equal((await transport('/api/ai/responses',{method:'POST',body:JSON.stringify({authMode:'plan'})})).status,400); assert.equal(calls.length,1);
 await store.close();
});
test('private history never leaves the browser transport',async()=>{
 const {createStudioRequest}=await import(transportURL),{createBrowserStore}=await import(storeURL);
 const store=createBrowserStore(new IDBFactory(),'private'), transport=createStudioRequest(store,()=>{throw Error('Unexpected network');});
 assert.equal((await transport('/api/workspace-history',{method:'PUT',body:JSON.stringify({state:workspace,revision:0})})).status,200);
 assert.deepEqual((await(await transport('/api/workspace-history')).json()).state,workspace); await store.close();
});
test('Worker rejects foreign origins, missing keys and OAuth requests before any API call',async()=>{
 const {handleStudioAPI}=await import('../worker/web-studio.mjs'); const never=()=>{throw Error('Unexpected API call');};
 const make=(body,headers={})=>new Request('https://toy.test/ysb5397/web-studio/api/ai/responses',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://toy.test',Authorization:'Bearer '+KEY,...headers},body:JSON.stringify(body)});
 assert.equal((await handleStudioAPI(make({}, {Origin:'https://evil.example'}),never)).status,403);
 assert.equal((await handleStudioAPI(make({}, {Authorization:''}),never)).status,401);
 assert.equal((await handleStudioAPI(make({authMode:'plan'}),never)).status,400);
 assert.equal(await handleStudioAPI(new Request('https://toy.test/ysb5397/quiz'),never),null);
});
test('Worker fixes upstream endpoint and streams without persisting or echoing the key',async()=>{
 const {handleStudioAPI}=await import('../worker/web-studio.mjs');let captured;
 const request=new Request('https://toy.test/ysb5397/web-studio/api/ai/responses',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://toy.test',Authorization:'Bearer '+KEY},body:JSON.stringify({authMode:'apiKey',model:'gpt-6.1-sol',input:[{role:'user',content:'Hello'}],tools:[],instructions:'Edit',endpoint:'https://evil.example',store:true})});
 const result=await handleStudioAPI(request,async(url,init)=>{captured={url,init};return new Response('data: {"type":"response.completed"}\n\n');});
 assert.equal(await result.text(),'data: {"type":"response.completed"}\n\n');assert.equal(captured.url,'https://api.openai.com/v1/responses');
 const body=JSON.parse(captured.init.body); assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(body.endpoint,undefined);assert.ok(!captured.init.body.includes(KEY));assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('published app and Worker routing stay under the requested author path',()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/ysb5397/web-studio/index.html'),'utf8');
 assert(html.includes('/ysb5397/web-studio/assets/'));assert(html.includes('/shared/theme.css'));assert(!html.includes('C:\\web_dashboard'));assert(!html.includes('localhost:5173'));
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));assert.deepEqual(config.assets.run_worker_first,['/ysb5397/web-studio/api/*']);assert.equal(config.assets.binding,'ASSETS');
 const catalog=require('../scripts/build-catalog.cjs').collect(path.join(root,'public'));assert(catalog.some(p=>p.url==='/ysb5397/web-studio/'&&p.author==='ysb5397'));assert(catalog.some(p=>p.url==='/ggm/prac_circuit'));
});
