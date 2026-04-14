import http from 'node:http';
function req(m,p,b){return new Promise(r=>{const u=new URL(p,'http://192.168.10.182:8080');const o={hostname:u.hostname,port:u.port,path:u.pathname,method:m,timeout:10000,headers:{}};if(b){const d=JSON.stringify(b);o.headers['Content-Type']='application/json';o.headers['Content-Length']=Buffer.byteLength(d);}const q=http.request(o,s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({status:s.statusCode,headers:s.headers,body:d}));});q.on('error',e=>r({status:0,body:e.message}));q.on('timeout',()=>{q.destroy();r({status:0,body:'TIMEOUT'});});if(b)q.write(JSON.stringify(b));q.end();})}
async function main(){
  let r;
  r=await req('GET','/api/auth/me');console.log('auth/me:'+r.status);
  r=await req('POST','/api/auth/logout');console.log('logout:'+r.status);
  r=await req('GET','/admin/dashboard');console.log('admin/dash:'+r.status);
  r=await req('GET','/account');console.log('account:'+r.status);
  r=await req('GET','/api/admin/users');console.log('admin/users:'+r.status);
  r=await req('GET','/api/admin/stats');console.log('admin/stats:'+r.status);
  r=await req('GET','/api/admin/access-requests');console.log('admin/access:'+r.status);
  r=await req('GET','/');
  const h=r.headers;
  console.log('csp:'+(h['content-security-policy']?'Y':'N'));
  console.log('xfo:'+(h['x-frame-options']?'Y':'N'));
  console.log('xcto:'+(h['x-content-type-options']?'Y':'N'));
  console.log('rp:'+(h['referrer-policy']?'Y':'N'));
  console.log('pp:'+(h['permissions-policy']?'Y':'N'));
  console.log('hsts:'+(h['strict-transport-security']?'Y':'N'));
}
main();
