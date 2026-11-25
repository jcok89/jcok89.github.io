'use strict';
const assert=require('node:assert/strict');
const {score,recommendation,validSession,columns}=require('./card-training.js');
const cards=[0,14,30,50,21], targets=[0,1,2,3,4];
const test=(mode,answers,scope=targets)=>score(mode,cards,scope,answers);
assert.deepEqual(test('what',[30,50,4]),{
    what:40,where:null,both:null,right:[2,3],missed:[0,1,4],outside:[4],forgotten:[0,14,21],displaced:null
});
assert.deepEqual(test('where',[0,2,null,3,4]),{
    what:null,where:60,both:null,right:[0,3,4],missed:[1,2],outside:[],forgotten:[],displaced:null
});
const mixed=test('both',[14,0,30,19,null]);
assert.deepEqual([mixed.what,mixed.where,mixed.both,mixed.displaced],[60,33,20,2]);
assert.deepEqual(mixed.forgotten,[50,21]);
const permuted=test('both',[14,0,30,50,21]);
assert.deepEqual([permuted.what,permuted.where,permuted.both],[100,60,60]);
assert.equal(test('both',[null,null,null,null,null]).where,null);
const retry=test('both',[null,14,null,30,null],[1,3]);
assert.deepEqual([retry.what,retry.where,retry.both],[50,100,50]);
assert.deepEqual(retry.outside,[]);
assert.equal(test('what',[0,0,0]).what,20);
const cfg={mode:'both',size:5,seconds:30,adaptive:true};
const runs=values=>values.map(primary=>({...cfg,primary}));
assert.equal(recommendation(cfg,runs([90,95,100])).size,6);
assert.equal(recommendation(cfg,runs([90,95,89])),null);
assert.equal(recommendation(cfg,runs([30,60,40])).seconds,45);
assert.equal(recommendation({...cfg,adaptive:false},runs([100,100,100])),null);
assert.equal(recommendation(cfg,[...runs([100,100]),{...cfg,seconds:45,primary:100}]),null);
const sample={version:1,id:'test',cfg,cards,order:targets,targets,cursor:4,answers:[14,0,30,19,null],
    phase:'review',attempt:0,first:{...mixed,n:5,observeMs:8,recallMs:9},observeMs:8,recallMs:9};
sample.latest=sample.first;
assert.equal(validSession(sample),true);
for(const patch of [{latest:{}},{cards:[0,0,30,50,21]},{order:[]},{cursor:8},{recallMs:-1},{answers:[-1]}]){
    assert.equal(validSession({...sample,...patch}),false);
}
console.log('Pass: independent scores, swapped cards, missing cards, scoped retry, adaptive thresholds, invalid checkpoints.');

assert.equal(columns(2),2);
assert.equal(columns(4),4);
assert.equal(columns(6),3);
assert.equal(columns(8),4);
assert.equal(columns(30),5);
for (const [size,next] of [[2,4],[4,6],[6,8],[8,10],[10,15],[15,20],[20,25],[25,30],[30,null]]) {
    const settings={...cfg,size};
    const result=recommendation(settings,[96,94,100].map(primary=>({...settings,primary})));
    assert.equal(result?.size??null,next);
    const ids=Array.from({length:size},(_,i)=>i);
    assert.equal(validSession({...sample,cfg:settings,cards:ids,order:ids,targets:ids,cursor:0,
        answers:ids.map(()=>null),phase:'observe',first:null,latest:null}),true);
}
console.log('Pass: all nine card counts, adaptive sequence, and layout columns.');
