import assert from "node:assert/strict";
import vm from "node:vm";
export async function runAppKeyChecks({createService,LicenseRegistry,...inputs}) {
 const data=new Map();
 const storage={
  async get(key){return structuredClone(data.get(key));},
  async put(key,value){data.set(key,structuredClone(value));},
  async list({prefix}){return new Map([...data].filter(([key])=>key.startsWith(prefix)).map(([key,value])=>[key,structuredClone(value)]));},
  async transaction(fn){return fn(this);}
 };
 const registry=new LicenseRegistry({storage});
 const env={ADMIN_PASSWORD:"test-password-only-000000000000000000",LICENSES:{idFromName:name=>name,get:()=>registry}};
 const service=createService(inputs),origin="https://app-key-tests.example";
 const auth="Basic "+btoa("Showrov:"+env.ADMIN_PASSWORD);
 const headers={Authorization:auth,Origin:origin,"Content-Type":"application/json","X-Showrov-Admin":"1"};
 const request=(path,options={})=>service.fetch(new Request(origin+path,options),env);
 const create=async(app,label="Synthetic user")=>{
  const r=await request("/admin/keys",{method:"POST",headers,body:JSON.stringify({app,label,days:2})});
  assert.equal(r.status,201);return r.json();
 };
 const validate=(key,body)=>request("/validate",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const apps=["youtube","spotify","picsart","alight-motion","truecaller"],keys={};
 const legacy=await create(undefined,"Existing YouTube key");
 const record=data.get("license:"+legacy.license.id);delete record.app;await storage.put("license:"+legacy.license.id,record);
 assert.equal((await validate(legacy.key)).status,200);
 assert.equal((await validate(legacy.key,{})).status,200);
 assert.equal((await request("/youtube.conf?key="+legacy.key)).status,200);
 assert.equal((await validate(legacy.key,{app:"spotify"})).status,403);
 assert(!Object.hasOwn(data.get("license:"+legacy.license.id),"app"),"legacy record must not be migrated");
 for(const app of apps){
  keys[app]=await create(app);
  assert.equal(keys[app].license.app,app);
  for(const requested of apps){
   const r=await validate(keys[app].key,{app:requested});
   assert.equal(r.status,app===requested?200:403,app+" key used for "+requested);
   const body=await r.json();
   assert.equal(body.valid,app===requested);
   if(body.valid){assert.equal(body.app,requested);assert.equal(body.expiresAt,keys[app].license.expiresAt);}
  }
  if(app!=="youtube"){
   assert.equal((await validate(keys[app].key)).status,403);
   for(const path of ["/youtube.conf","/scripts/request.js","/scripts/response.js"])
    assert.equal((await request(path+"?key="+keys[app].key)).status,403);
   assert.equal(keys[app].downloadUrl,undefined);
  }
 }
 for(const app of ["all","",null,{},["spotify"],"constructor","__proto__"]){
  const before=data.size;
  assert.equal((await request("/admin/keys",{method:"POST",headers,body:JSON.stringify({app,label:"Invalid",days:2})})).status,400);
  assert.equal(data.size,before);
  assert.equal((await validate(keys.spotify.key,{app})).status,400);
 }
 for(const body of ["{","[]","null",'"spotify"'," ".repeat(4097)]){
  const r=await request("/validate",{method:"POST",headers:{Authorization:"Bearer "+keys.spotify.key},body});
  assert.equal(r.status,400);
 }
 assert.equal((await request("/admin/revoke",{method:"POST",headers,body:JSON.stringify({id:keys.spotify.license.id})})).status,200);
 assert.equal((await validate(keys.spotify.key,{app:"spotify"})).status,403);
 const expired=data.get("license:"+keys["alight-motion"].license.id);expired.expiresAt=Date.now()-1;await storage.put("license:"+expired.id,expired);
 assert.equal((await validate(keys["alight-motion"].key,{app:"alight-motion"})).status,403);
 assert.equal((await validate(keys.picsart.key,{app:"picsart"})).status,200);
 assert.equal((await validate(keys.truecaller.key,{app:"truecaller"})).status,200);
 const list=await (await request("/admin/keys",{headers:{Authorization:auth}})).json();
 assert.equal(list.licenses.find(x=>x.id===legacy.license.id).app,"youtube");
 for(const key of Object.values(keys).map(x=>x.key).concat(legacy.key)){
  assert(!JSON.stringify(list).includes(key));
  assert(!JSON.stringify([...data.values()]).includes(key));
 }
 assert(!Object.hasOwn(data.get("license:"+legacy.license.id),"app"));

 // Exercise the actual manager script: selected app, raw-key copy, and app labels.
 class Element{
  constructor(){this.value="";this.textContent="";this.children=[];this.handlers={};this.hidden=false;}
  addEventListener(type,fn){this.handlers[type]=fn;}
  setAttribute(){}
  replaceChildren(){this.children=[];}
  append(...nodes){this.children.push(...nodes);}
  querySelector(){return new Element();}
  focus(){}
  select(){}
  set innerHTML(_){throw Error("Unexpected HTML injection");}
 }
 const elements=Object.fromEntries(["message","keys","create","label","app","days","access-key","created","copy","refresh"].map(id=>["#"+id,new Element()]));
 elements["#app"].value="truecaller";elements["#label"].value="UI test";elements["#days"].value="3";
 const copied=[];
 const sandbox={
  document:{querySelector:s=>elements[s],createElement:()=>new Element()},
  navigator:{clipboard:{writeText:async text=>copied.push(text)}},
  fetch:async(path,options={})=>request(path,{...options,headers:{...options.headers,Authorization:auth,Origin:origin}}),
  console,Date
 };
 const script=inputs.adminPage.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInNewContext(script,sandbox);
 await new Promise(resolve=>setImmediate(resolve));
 await elements["#create"].handlers.submit({preventDefault(){},currentTarget:elements["#create"]});
 const raw=elements["#access-key"].value;
 assert.match(raw,/^sr_[A-Za-z0-9_-]{43}$/);
 assert.equal((await validate(raw,{app:"truecaller"})).status,200);
 assert.equal((await validate(raw,{app:"youtube"})).status,403);
 await elements["#copy"].handlers.click();
 assert.equal(copied[0],raw);
 assert(elements["#keys"].children.some(row=>row.children.some(e=>e.textContent.startsWith("Truecaller ·"))));
 assert(!elements["#keys"].children.some(row=>row.children.some(e=>e.textContent.includes(raw))));
 return [
  "Existing unscoped keys remain YouTube-only without rewriting stored records",
  "All 25 app/key combinations enforce exact app matching",
  "Non-YouTube keys cannot download YouTube configurations or scripts",
  "Unknown scopes and malformed validation inputs are rejected",
  "Expiry and revocation remain isolated to each key",
  "Key lists show app ownership and store no raw keys",
  "Manager creates a key for the selected app and copies only the raw key"
 ];
}
