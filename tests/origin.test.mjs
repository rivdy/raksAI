import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin} from '../lib/http.ts';
const req=(origin,host='127.0.0.1:3000',extra={})=>new Request('http://localhost:3000/api/auth',{headers:{host,...(origin?{origin}:{}),...extra}});
test('browser origin follows the actual loopback Host even when Next uses localhost internally',()=>{
 for(const host of ['localhost:3000','127.0.0.1:3000','[::1]:3000'])assert.doesNotThrow(()=>sameOrigin(req('http://'+host,host,{'sec-fetch-site':'same-origin'})));
});
test('foreign origins, mismatched ports/schemes, rebinding hosts and forwarded headers are rejected',()=>{
 for(const origin of ['http://evil.example','null','http://127.0.0.1:3001','https://127.0.0.1:3000','http://localhost:3000','http://127.0.0.1:3000/path'])
  assert.throws(()=>sameOrigin(req(origin)),e=>e.status===403);
 assert.throws(()=>sameOrigin(req('http://evil.example','evil.example')),e=>e.status===403);
 assert.throws(()=>sameOrigin(req('http://evil.example','127.0.0.1:3000',{'x-forwarded-host':'evil.example'})),e=>e.status===403);
 assert.throws(()=>sameOrigin(req('http://127.0.0.1:3000','127.0.0.1:3000',{'sec-fetch-site':'cross-site'})),e=>e.status===403);
});
test('non-browser requests and same-origin requests without explicit Host remain supported',()=>{
 assert.doesNotThrow(()=>sameOrigin(req(null)));
 assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3000/api/auth',{headers:{origin:'http://localhost:3000'}})));
});
