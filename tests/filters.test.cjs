const test=require('node:test'),assert=require('node:assert/strict'),F=require('../public/catalog-filters.js'),{metadata}=require('../scripts/build-catalog.cjs');
const projects=[
 {title:'회로 실험실',description:'게이트 동작',author:'ggm',tags:['학습'],cover:'circuit'},
 {title:'시퀀스 회로',description:'릴레이 자기유지',author:'ggm',tags:[],cover:'sequence'},
 {title:'PICK+O',description:'로또 번호와 통계',author:'ysb5397',tags:['번호 추출'],cover:'lotto'},
 {title:'카르노 맵 퀴즈',description:'진리표 연습',author:'ysb5397',tags:[],cover:'grid'},
];
test('categories are automatic and can be overridden per HTML without changing the homepage',()=>{
 assert.deepEqual(F.categories(projects).map(c=>[c.name,c.count]),[['번호·통계',1],['퀴즈',1],['회로 실습',2]]);
 assert.equal(metadata('<title>새 도구</title><meta name="toy:category" content="생산성">','dev/tool.html').category,'생산성');
 assert.equal(F.categoryOf({title:'새 게임',cover:'code'}),'게임');
 assert.equal(F.categoryOf({title:'날짜 계산',cover:'code'}),'도구');
 assert.equal(F.categoryOf({title:'알 수 없는 앱',cover:'code'}),'기타');
});
test('search matches titles, descriptions, authors, tags and categories, including multiple terms',()=>{
 assert.equal(F.filter(projects,{query:'  PICKo  '})[0].title,'PICK+O');
 assert.equal(F.filter(projects,{query:'ｐｉｃｋｏ'})[0].title,'PICK+O');
 assert.equal(F.filter(projects,{query:'회로실험실'}).length,1);
 assert.equal(F.filter(projects,{query:'GGm'}).length,2);
 assert.equal(F.filter(projects,{query:'ysb5397 로또'}).length,1);
 assert.equal(F.filter(projects,{query:'학습'})[0].author,'ggm');
 assert.equal(F.filter(projects,{query:'회로 실습'}).length,2);
 assert.equal(F.filter(projects,{query:'자기유지'}).length,1);
 assert.equal(F.filter(projects,{query:'없는 검색어'}).length,0);
 assert.equal(F.filter(projects,{query:'   '}).length,4);
});
test('category and search intersect, and filtering leaves the source catalog intact',()=>{
 const before=JSON.stringify(projects);
 assert.equal(F.filter(projects,{category:'회로 실습'}).length,2);
 assert.equal(F.filter(projects,{category:'회로 실습',query:'자기유지'}).length,1);
 assert.equal(F.filter(projects,{category:'회로 실습',query:'ysb5397'}).length,0);
 assert.equal(F.filter(projects,{category:'생산성'}).length,0);
 assert.equal(JSON.stringify(projects),before);
});
