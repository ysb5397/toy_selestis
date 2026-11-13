/* A bounded evidence engine for the fixed, JDK-verified case bank. No eval or Java interpreter. */
(() => {
'use strict';
const {javaRelease,topics}=window.JavaInspectorData;
const rules=topics.flatMap(t=>t.rules.map(([title,text],i)=>({id:t.ruleIds[i],topic:t.id,title,text})));
const ruleFor=id=>rules.find(r=>r.id===id);
const fingerprint=c=>JSON.stringify([2,javaRelease,c.id,c.code,c.claim,c.actualOutput,c.kind,c.expectedStatus,c.comparison,c.comparison.ruleIds.map(id=>ruleFor(id))]);
function documentFor(c,id){
 if(id==='claim')return {id,label:'신청 내용',text:c.claim};
 const match=/^code:([1-9]\d*)$/.exec(id||'');if(!match)return null;
 const line=Number(match[1]),text=c.code.split('\n')[line-1];
 return text===undefined?null:{id,label:`제출 자료 ${line}행`,text,line};
}
function compare(c,documentId,ruleId){
 const doc=documentFor(c,documentId),rule=ruleFor(ruleId);
 if(!doc||!rule)return {status:'unrelated',message:'서류 항목과 규정 조항을 각각 하나씩 선택하십시오.'};
 if(!c.comparison.ruleIds.includes(ruleId)||(doc.line&&!c.comparison.lines.includes(doc.line)))return {status:'unrelated',message:'선택한 항목과 규정만으로는 신청 내용을 검증할 수 없습니다. 자료의 다른 행이나 다른 규정을 대조하십시오.'};
 const status=c.claim===c.actualOutput?'match':'contradiction';
 return {status,caseId:c.id,documentId,ruleId,documentLabel:doc.label,documentText:doc.text,ruleTitle:rule.title,actualOutput:c.actualOutput,claimedOutput:c.claim,explanation:c.explanation,fingerprint:fingerprint(c)};
}
function restore(c,input){
 if(!input||input.fingerprint!==fingerprint(c))return {caseId:c.id,fingerprint:fingerprint(c),documentId:null,ruleId:null,checked:false};
 const restored={caseId:c.id,fingerprint:fingerprint(c),documentId:documentFor(c,input.documentId)?input.documentId:null,ruleId:ruleFor(input.ruleId)?input.ruleId:null,checked:input.checked===true,proof:null};
 if(input.proof&&compare(c,input.proof.documentId,input.proof.ruleId).status==='contradiction')restored.proof={documentId:input.proof.documentId,ruleId:input.proof.ruleId};
 return restored;
}
function evidence(c,input){const restored=restore(c,input);if(!restored.proof)return null;return compare(c,restored.proof.documentId,restored.proof.ruleId);}
window.JavaComparison={rules,ruleFor,documentFor,compare,fingerprint,restore,evidence};
})();
