/* Shared by the static catalog generator, the homepage and its tests. */
(function(root){
  'use strict';
  function normalize(text){return String(text??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  function categoryOf(project){
    if(typeof project.category==='string'&&project.category.trim())return project.category.trim().normalize('NFKC');
    const covers={circuit:'회로 실습',sequence:'회로 실습',grid:'퀴즈',lotto:'번호·통계'};
    if(Object.hasOwn(covers,project.cover))return covers[project.cover];
    const text=String(project.title??'')+' '+String(project.description??'');
    if(/게임|game/i.test(text))return '게임';
    if(/계산|변환|도구|converter|calculator|tool/i.test(text))return '도구';
    return '기타';
  }
  function categories(projects){
    const counts=new Map();for(const p of projects){const name=categoryOf(p);counts.set(name,(counts.get(name)||0)+1);}
    return [...counts].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  }
  function filter(projects,{query='',category=''}={}){
    const terms=String(query).trim().split(/\s+/u).map(normalize).filter(Boolean);
    return projects.filter(p=>{
      if(category&&categoryOf(p)!==category)return false;
      const haystack=normalize([p.title,p.description,p.author,...(Array.isArray(p.tags)?p.tags:[]),categoryOf(p)].join(' '));
      return terms.every(term=>haystack.includes(term));
    });
  }
  const api={normalize,categoryOf,categories,filter};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CatalogFilters=api;
})(globalThis);
