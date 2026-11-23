(() => {
'use strict';
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const suits = ['♠','♥','♦','♣'];
const suitNames = ['스페이드','하트','다이아몬드','클로버'];
const deck = Array.from({length:52}, (_,i)=>i);
const rooms = ['현관','거실','주방','서재'];
const images = ['왕관','백조','삼각대','의자','별','주사위','무지개','안경','풍선','볼링핀','기사','여왕','왕'];
const suitImages = ['삽','하트','보석','클로버'];
const modes = {what:'종류 기억',where:'위치 기억',both:'종류 + 위치'};
const key = 'jake-card-training-v1:';
const validId = id => Number.isInteger(id) && id>=0 && id<52;
const indices = a => a.map((_,i)=>i);
const unique = a => [...new Set(a)];
const percent = (a,b) => b ? Math.round(100*a/b) : null;

function shuffle(items) {
    const a = [...items];
    for(let i=a.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
}

function score(mode, cards, targets, answers) {
    const expected = targets.map(i=>cards[i]);
    const picks = mode==='what' ? answers : targets.map(i=>answers[i]);
    const found = unique(picks.filter(id=>expected.includes(id)));
    const right = targets.filter(i=>mode==='what' ? picks.includes(cards[i]) :
        mode==='where' ? answers[i]===i : answers[i]===cards[i]);
    const n=targets.length;
    return {
        what: mode==='where' ? null : percent(found.length,n),
        where: mode==='what' ? null : mode==='where' ? percent(right.length,n) : percent(right.length,found.length),
        both: mode==='both' ? percent(right.length,n) : null,
        right, missed:targets.filter(i=>!right.includes(i)),
        outside: mode==='where' ? [] : unique(picks.filter(id=>validId(id)&&!cards.includes(id))),
        forgotten: mode==='where' ? [] : expected.filter(id=>!found.includes(id)),
        displaced: mode==='both' ? found.length-right.length : null
    };
}

function recommendation(cfg, history) {
    if(!cfg.adaptive) return null;
    const last=history.filter(r=>r.mode===cfg.mode && r.size===cfg.size && r.seconds===cfg.seconds).slice(0,3);
    if(last.length<3) return null;
    if(last.every(r=>r.primary>=90)){
        const next=[5,10,20].find(n=>n>cfg.size);
        if(next) return {size:next, seconds:cfg.seconds, text:'같은 설정에서 최근 3회 모두 90% 이상입니다. '+next+'장에 도전해 보세요.'};
    }
    if(last.reduce((a,r)=>a+r.primary,0)/3<65){
        const next=[10,5,3].find(n=>n<cfg.size);
        const seconds=cfg.seconds && cfg.seconds<300 ? Math.min(300,cfg.seconds+15) : cfg.seconds;
        if(seconds!==cfg.seconds) return {size:cfg.size, seconds, text:'최근 3회 평균이 65% 미만입니다. 카드 수를 유지하고 관찰 시간을 '+seconds+'초로 늘려 보세요.'};
        if(next) return {size:next,seconds,text:'최근 3회 평균이 65% 미만입니다. '+next+'장으로 줄여 정확도를 먼저 높여 보세요.'};
    }
    return null;
}

function validResult(r,n) {
    return r && Number.isInteger(r.n) && r.n>=1 && r.n<=n &&
        [r.what,r.where,r.both,r.displaced].every(x=>x===null||(Number.isFinite(x)&&x>=0&&x<=100)) &&
        [r.observeMs,r.recallMs].every(x=>Number.isFinite(x)&&x>=0) &&
        Array.isArray(r.right) && Array.isArray(r.missed) &&
        unique([...r.right,...r.missed]).length===r.n && r.right.length+r.missed.length===r.n &&
        [...r.right,...r.missed].every(i=>Number.isInteger(i)&&i>=0&&i<n) &&
        [r.forgotten,r.outside].every(a=>Array.isArray(a)&&a.every(validId));
}

function validSession(s) {
    return s?.version===1 && Object.hasOwn(modes,s.cfg?.mode) && Number.isInteger(s.cfg.size) &&
        s.cfg.size>=3 && s.cfg.size<=20 && Number.isInteger(s.cfg.seconds) && s.cfg.seconds>=0 && s.cfg.seconds<=300 &&
        ['observe','recall','review'].includes(s.phase) && Array.isArray(s.cards) &&
        s.cards.length===s.cfg.size && unique(s.cards).length===s.cards.length && s.cards.every(validId) &&
        Array.isArray(s.order) && s.order.length===s.cards.length && unique(s.order).length===s.cards.length &&
        s.order.every(i=>Number.isInteger(i)&&i>=0&&i<s.cards.length) &&
        Array.isArray(s.targets) && s.targets.length>0 && unique(s.targets).length===s.targets.length &&
        s.targets.every(i=>Number.isInteger(i)&&i>=0&&i<s.cards.length) &&
        Number.isInteger(s.cursor) && s.cursor>=0 && s.cursor<s.targets.length &&
        Array.isArray(s.answers) && s.answers.length<=s.cards.length &&
        Number.isFinite(s.observeMs) && s.observeMs>=0 && Number.isFinite(s.recallMs) && s.recallMs>=0 &&
        (s.cfg.mode==='what' ? s.answers.every(validId) && unique(s.answers).length===s.answers.length && s.answers.length<=s.targets.length :
            s.answers.length===s.cards.length && s.answers.every(id=>id===null || (validId(id) && (s.cfg.mode!=='where'||id<s.cards.length)))) &&
        (!s.first || validResult(s.first,s.cards.length)) &&
        typeof s.id==='string' && Number.isInteger(s.attempt) && s.attempt>=0 &&
        (!s.attempt && s.phase!=='review' || Boolean(s.first)) &&
        (s.phase!=='review' || (validResult(s.latest,s.cards.length) && s.latest.n===s.targets.length));
}

if(typeof module!=='undefined'&&module.exports){ module.exports={score,recommendation,validSession}; return; }

const $=id=>document.getElementById(id);
const board=$('board');
const cardText=id=>validId(id)? ranks[id%13]+suits[Math.floor(id/13)] : '응답 없음';
const cardName=id=>validId(id)?ranks[id%13]+' '+suitNames[Math.floor(id/13)]:'응답 없음';
const red=id=>Math.floor(id/13)===1||Math.floor(id/13)===2;
const fmt=n=>Number.isFinite(n)?n+'%':'측정 안 됨';
const time=ms=>(ms/1000).toFixed(1)+'초';
let session, paused=false, clockAt=null, interval, lastSave=0, pickerRank='', pickerSuit='', pickerKey=null;
function warning(){ $('storage-warning').textContent='브라우저 저장 공간을 사용할 수 없어 기록이나 중단점이 저장되지 않을 수 있습니다.'; }
function read(name,fallback){
    try{const raw=localStorage.getItem(key+name);return raw===null?fallback:JSON.parse(raw);}
    catch{warning();return fallback;}
}
function store(name,value){
    try{localStorage.setItem(key+name,JSON.stringify(value));}
    catch{warning();}
}
let saved=read('session',null);
if(!validSession(saved)) saved=null;
let history=read('history',[]);
if(!Array.isArray(history)) history=[];
history=history.filter(r=>r&&Object.hasOwn(modes,r.mode)&&Number.isFinite(r.primary)&&Number.isFinite(r.date));
let hints=read('hints',{});
if(!hints||typeof hints!=='object'||Array.isArray(hints)) hints={};

function element(tag,text,cls){
    const e=document.createElement(tag);
    if(text!==undefined) e.textContent=text;
    if(cls)e.className=cls;
    return e;
}
function button(text,action,secondary=false){
    const e=element('button',text,secondary?'secondary':'');
    e.type='button';e.addEventListener('click',action);return e;
}
function note(container,text){container.append(element('p',text));}
function stash(){lastSave=performance.now();saved=session;store('session',session);}
function account(){
    if(clockAt===null||!session)return;
    const now=performance.now();
    const field=session.phase==='observe'?'observeMs':'recallMs';
    session[field]+=now-clockAt;
    clockAt=now;
}
function stop(){account();clockAt=null;clearInterval(interval);}
function startClock(){
    stop();
    if(!paused && session.phase!=='review' && !document.hidden){
        clockAt=performance.now();
        interval=setInterval(tick,250);
        tick();
    }
}
function tick(){
    account();
    if(session.phase==='observe'){
        const seconds=session.cfg.seconds;
        if(seconds&&session.observeMs>=seconds*1000){stop();session.observeMs=seconds*1000;hide();return;}
        $('timer').textContent=seconds?Math.ceil(seconds-session.observeMs/1000)+'초 남음':'시간 제한 없음';
    }
    if(performance.now()-lastSave>=1000)stash();
}
function apply(cfg){
    if(!cfg)return;
    document.querySelectorAll('[name=mode]').forEach(r=>{if(r.value===cfg.mode)r.checked=true;});
    for(const id of ['size','seconds']) if(Number.isInteger(cfg[id])) $(id).value=cfg[id];
    for(const id of ['adaptive','chunks','palace']) if(typeof cfg[id]==='boolean') $(id).checked=cfg[id];
}
function config(){
    if(!$('size').reportValidity()||!$('seconds').reportValidity())return null;
    return {mode:document.querySelector('[name=mode]:checked').value,size:Number($('size').value),seconds:Number($('seconds').value),
        adaptive:$('adaptive').checked,chunks:$('chunks').checked,palace:$('palace').checked};
}
function setup(){
    if(session){stop();stash();}
    paused=false;session=null;pickerKey=null;
    $('setup').hidden=false;$('table').hidden=true;$('result').hidden=true;
    $('resume').hidden=!saved;
    $('resume-note').textContent=saved?'저장됨 · '+modes[saved.cfg.mode]+' · '+saved.cards.length+'장 · '+({observe:'관찰',recall:'회상',review:'결과'}[saved.phase]):'';
    drawHistory();
}
function begin(cfg){
    stop();paused=false;pickerKey=null;
    const cards=shuffle(deck).slice(0,cfg.size);
    const order=cfg.chunks?indices(cards):shuffle(indices(cards));
    session={version:1,id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),cfg,cards,order,
        phase:'observe',attempt:0,targets:[...order],cursor:0,answers:blank(cfg.mode,cards.length),
        observeMs:0,recallMs:0,first:null,latest:null};
    store('prefs',cfg);stash();render(true);startClock();
}
function blank(mode,n){return mode==='what'?[]:Array(n).fill(null);}
function hide(){
    if(session.phase!=='observe'||paused)return;
    stop();session.phase='recall';stash();render(true);startClock();
}
function retry(all){
    const targets=all?[...session.order]:session.latest.missed;
    if(!targets.length)return;
    stop();paused=false;pickerKey=null;
    Object.assign(session,{phase:'observe',attempt:session.attempt+1,targets:[...targets],cursor:0,
        answers:blank(session.cfg.mode,session.cards.length),observeMs:0,recallMs:0});
    stash();render(true);startClock();
}
function finish(){
    if(session.phase!=='recall'||paused)return;
    stop();
    const {cfg,cards,targets,answers,observeMs,recallMs}=session;
    const data={...score(cfg.mode,cards,targets,answers),observeMs,recallMs,n:targets.length};
    session.latest=data;
    if(!session.attempt){
        session.first=data;
        const primary=data.both??data.where??data.what;
        if(!history.some(r=>r.id===session.id)){
            history=[{id:session.id,date:Date.now(),mode:cfg.mode,size:cfg.size,seconds:cfg.seconds,primary,
                what:data.what,where:data.where,both:data.both,observeMs,recallMs},...history].slice(0,100);
            store('history',history);
        }
    }
    session.phase='review';stash();render(true);drawHistory();
}

function drawBoard(face, active, current){
    board.replaceChildren();
    const {cards,cfg,targets}=session;
    const set=new Set(targets);
    board.classList.toggle('chunked',cfg.chunks);
    let group=board;
    cards.forEach((id,i)=>{
        if(cfg.chunks&&i%5===0){
            group=element('div',undefined,'zone');
            group.append(element('b',(Math.floor(i/5)+1)+'구역'+(face&&cfg.palace?' · '+rooms[Math.floor(i/5)]:''),'zone-title'));
            board.append(group);
        }
        const show=face&&set.has(i);
        const slot=element(active?'button':'div',undefined,'slot'+(show?(red(id)?' red':''):' back')+(current===i?' current':''));
        slot.setAttribute('aria-label',(i+1)+'번 위치'+(show?', '+cardName(id):''));
        if(active){slot.type='button';slot.addEventListener('click',()=>answer(i));}
        slot.append(element('span',show?ranks[id%13]:String(i+1)));
        if(show){
            slot.append(element('span',suits[Math.floor(id/13)]),element('span',String(i+1),'slot-id'));
            if(cfg.palace){
                const override=hints[id];
                slot.append(element('span',typeof override==='string'&&override?override:images[id%13]+' '+suitImages[Math.floor(id/13)],'slot-note'));
            }
        }
        group.append(slot);
    });
}
function drawHintEditor(panel){
    const details=element('details');
    details.append(element('summary','카드 연상 키워드 바꾸기'));
    const available=session.targets.map(i=>session.cards[i]);
    const select=element('select'), input=element('input');
    available.forEach(id=>{const opt=element('option',cardText(id));opt.value=id;select.append(opt);});
    select.setAttribute('aria-label','연상 키워드를 바꿀 카드');
    input.type='text';input.maxLength=16;input.placeholder='예: 빨간 우산';input.setAttribute('aria-label','내 연상 키워드');
    const refresh=()=>{input.value=typeof hints[select.value]==='string'?hints[select.value]:'';};
    refresh();select.addEventListener('change',refresh);
    details.append(select,input,button('키워드 저장',()=>{
        hints[select.value]=input.value.trim();store('hints',hints);drawBoard(true,false,null);
        $('feedback').textContent='키워드를 저장했습니다.';
    }));
    panel.append(details);
}
function mini(id){return element('span',cardText(id),'mini'+(red(id)?' red':''));}
function answer(id){
    if(paused||session.phase!=='recall')return;
    const {cfg,targets,cursor,answers}=session;
    if(cfg.mode==='what'){
        if(answers.includes(id))return;
        if(answers.length>=targets.length)return;
        answers.push(id);
        pickerRank='';pickerSuit='';stash();render(false,true);
        return;
    }
    answers[targets[cursor]]=id;
    if(cursor+1<targets.length){session.cursor++;stash();render(false,true);}
    else finish();
}

function render(focus=false, pickerFocus=false){
    $('setup').hidden=true;
    $('result').hidden=session.phase!=='review'||paused;
    $('table').hidden=session.phase==='review'&&!paused;
    const action=$('actions'), picker=$('picker'), prompt=$('prompt');
    action.replaceChildren();picker.replaceChildren();prompt.replaceChildren();prompt.hidden=true;
    $('feedback').textContent='';$('timer').textContent='';
    const {cfg,phase,targets,cursor,answers}=session;
    if(paused){
        board.replaceChildren();
        $('phase').textContent='일시정지';
        $('instruction').textContent='진행을 이어가거나 설정으로 돌아갈 수 있습니다.';
        action.append(button('훈련 계속',()=>{paused=false;render(true);startClock();}),button('저장 후 설정',setup,true));
    }else if(phase==='review'){
        board.replaceChildren();
        drawResult();
        if(focus)$('result-title').focus();
        return;
    }else if(phase==='observe'){
        $('phase').textContent=session.attempt?'4. 다시 관찰하기':'1. 배열 관찰하기';
        $('instruction').textContent=session.attempt&&targets.length<session.cards.length?
            '틀린 자리의 카드만 보입니다. 같은 위치를 기억한 뒤 다시 가려 보세요.':
            '카드의 숫자와 무늬를 고정된 자리와 연결하세요. 처음에는 속도보다 정확도를 우선하세요.';
        drawBoard(true,false,null);
        if(cfg.palace){
            const panel=element('div',undefined,'pick-panel');
            note(panel,'입구에서 안쪽으로 걸어간다고 상상하며 각 위치에 카드 이미지를 붙여 보세요.');
            drawHintEditor(panel);picker.append(panel);
        }
        action.append(button('카드 가리기',hide));
    }else{
        const target=targets[cursor];
        const count=cfg.mode==='what'?answers.length:cursor;
        const part=cfg.chunks&&cfg.mode!=='what'?' · '+(Math.floor(target/5)+1)+'구역':'';
        $('phase').textContent=(session.attempt?'5. 다시 회상':'2. 가린 카드 회상')+part;
        $('instruction').textContent=cfg.mode==='what'?
            '본 카드의 숫자와 무늬를 선택하세요. '+count+' / '+targets.length+'장':
            (cursor+1)+' / '+targets.length+' · '+(cfg.mode==='where'?'제시된 카드가 있었던 위치를 누르세요.':target+1+'번 위치에 있었던 카드를 고르세요.');
        drawBoard(false,cfg.mode==='where',cfg.mode==='both'?target:null);
        if(cfg.mode==='where'){
            prompt.tabIndex=-1;prompt.append('찾을 카드 ',mini(session.cards[target]));prompt.hidden=false;
            action.append(button('모르겠어요',()=>answer(null),true));
        }else{
            drawPicker(picker,cfg.mode==='what'?'what':String(target),pickerFocus);
            if(cfg.mode==='what'){
                action.append(button(answers.length===targets.length?'채점하기':'선택한 카드만 채점',finish));
            } else action.append(button('모르겠어요',()=>answer(null),true));
        }
    }
    if(!paused){
        action.append(button('일시정지',()=>{stop();stash();paused=true;render(true);},true),button('저장 후 설정',setup,true));
    }
    if(focus)$('phase').focus();
    else if(pickerFocus&&cfg.mode==='where')$('prompt').focus({preventScroll:true});
}

function drawPicker(container,k,focus){
    if(pickerKey!==k){pickerKey=k;pickerRank='';pickerSuit='';}
    const {cfg,answers,targets}=session;
    const panel=element('div',undefined,'pick-panel'), fields=element('div',undefined,'pick-fields');
    function select(label,options,value,onChange){
        const wrap=element('label',label), el=element('select');
        el.append(element('option','선택'));
        el.options[0].value='';
        options.forEach((title,i)=>{const o=element('option',title);o.value=i;el.append(o);});
        el.value=value;wrap.append(el);fields.append(wrap);
        el.addEventListener('change',()=>{onChange(el.value);toggle();});
        return el;
    }
    const rank=select('숫자',ranks,pickerRank,v=>pickerRank=v);
    select('무늬',suits.map((s,i)=>s+' '+suitNames[i]),pickerSuit,v=>pickerSuit=v);
    const id=()=>Number(pickerSuit)*13+Number(pickerRank);
    const used=()=>answers.includes(id());
    const add=button(cfg.mode==='what'?'카드 추가':'답 확정',()=>answer(id()));
    function toggle(){add.disabled=pickerRank===''||pickerSuit===''||used()||(cfg.mode==='what'&&answers.length>=targets.length);}
    fields.append(add);panel.append(fields);toggle();
    if(cfg.mode==='what'){
        const list=element('div',undefined,'selection');
        answers.forEach(id=>list.append(button(cardText(id)+' ×',()=>{
            session.answers=answers.filter(x=>x!==id);stash();render(false,true);
        },true)));
        panel.append(list);
    }
    container.append(panel);
    if(focus)rank.focus({preventScroll:true});
}

function metrics(container,r){
    const grid=element('div',undefined,'metric-grid');
    for(const [label,value] of [['종류 (What)',r.what],['위치 (Where)',r.where],['종류 + 위치',r.both]]){
        const cell=element('div',label,'metric');cell.append(element('strong',fmt(value)));grid.append(cell);
    }
    container.append(grid);
    note(container,'관찰 '+time(r.observeMs)+' · 회상 '+time(r.recallMs)+' · '+r.n+'문제');
}
function drawResult(){
    const {latest:r,first:f,cfg,cards,targets,attempt,answers}=session;
    $('result-title').textContent=attempt?'재도전 결과 · '+attempt+'회차':'3. 첫 회상 결과';
    const summary=$('summary'), grid=$('review-grid'), actions=$('result-actions');
    summary.replaceChildren();grid.replaceChildren();actions.replaceChildren();
    metrics(summary,r);
    if(attempt){
        const same=targets.length===cards.length;
        note(summary,'첫 회상 ('+f.n+'장): 종류 '+fmt(f.what)+' · 위치 '+fmt(f.where)+' · 완전 일치 '+fmt(f.both));
        if(!same){
            const firstRight=targets.filter(i=>f.right.includes(i)).length;
            note(summary,'같은 '+r.n+'개 문항에서 맞힌 수: 첫 회상 '+firstRight+'개 → 재도전 '+r.right.length+'개. 전체 점수와 분모가 다릅니다.');
        }
    }
    if(r.displaced!==null)note(summary,'기억했지만 다른 자리에 놓음 '+r.displaced+'장 · 이번 출제 카드 중 기억하지 못함 '+r.forgotten.length+'장');
    if(cfg.mode!=='where'){
        if(r.forgotten.length)note(summary,'기억하지 못한 카드: '+r.forgotten.map(cardText).join(', '));
        if(r.outside.length)note(summary,'배치에 없던 카드 선택: '+r.outside.map(cardText).join(', '));
        if(cfg.mode==='what'&&targets.length<cards.length){
            const other=answers.filter(id=>cards.includes(id)&&!targets.some(i=>cards[i]===id));
            if(other.length)note(summary,'원래 배열에는 있지만 이번 재출제 범위에 없는 카드: '+other.map(cardText).join(', '));
        }
    }
    if(r.missed.length){
        grid.append(element('h3','오답 확인'));
        const list=element('ul',undefined,'review-list');
        r.missed.forEach(i=>list.append(element('li',
            (i+1)+'번 · 정답 '+cardText(cards[i])+
            (cfg.mode==='both'?' / 내 답 '+cardText(answers[i]):cfg.mode==='where'?
                ' / 내 답 '+(answers[i]===null?'응답 없음':(answers[i]+1)+'번'):''))));
        grid.append(list);
        actions.append(button('오답만 다시 회상',()=>retry(false)));
    }else note(grid,'이번에 출제된 카드를 모두 맞혔습니다.');
    const preview=element('details',undefined,'guide');
    preview.append(element('summary','전체 정답 배열 보기'));
    const layout=element('ol',undefined,'board review-layout');
    cards.forEach((id,i)=>{
        const missed=r.missed.includes(i);
        const item=element('li',undefined,'review-tile'+(missed?' missed':''));
        item.append(element('small',(i+1)+'번'+(missed?' · 오답':'')),mini(id));
        layout.append(item);
    });
    preview.append(layout);grid.append(preview);
    actions.append(button('전체 배열 다시 회상',()=>retry(true),true),
        button('새 랜덤 훈련',()=>begin(cfg),true),button('훈련 설정',setup,true));
    const next=recommendation(cfg,history);
    if(next&&!attempt){
        note(summary,next.text);
        actions.append(button('추천 설정으로 새 훈련',()=>{const adjusted={...cfg,size:next.size,seconds:next.seconds};apply(adjusted);begin(adjusted);}));
    }
}
function drawHistory(){
    const box=$('history');box.replaceChildren();
    if(!history.length){note(box,'첫 회상을 완료하면 여기에 기록됩니다.');return;}
    note(box,'첫 회상만 저장합니다. 기본 지표는 종류 모드=종류, 위치 모드=위치, 통합 모드=완전 일치입니다.');
    const table=element('table'), wrap=element('div',undefined,'scroll-table'), thead=element('thead'), row=element('tr'), tbody=element('tbody');
    ['날짜','훈련','카드','관찰 설정','첫 점수'].forEach(t=>row.append(element('th',t)));
    thead.append(row);table.append(thead);
    history.slice(0,8).forEach(r=>{
        const tr=element('tr');
        [new Date(r.date).toLocaleDateString('ko-KR'),modes[r.mode],r.size+'장',r.seconds?r.seconds+'초':'제한 없음',fmt(r.primary)].forEach(t=>tr.append(element('td',t)));
        tbody.append(tr);
    });
    table.append(tbody);wrap.append(table);box.append(wrap,element('h3','카드 수별 성취도'));
    const list=element('ul');
    for(const size of unique(history.map(r=>r.size)).sort((a,b)=>a-b)){
        const values=Object.keys(modes).map(mode=>{
            const recent=history.filter(r=>r.size===size&&r.mode===mode).slice(0,5);
            return recent.length?modes[mode]+' '+fmt(percent(recent.reduce((n,r)=>n+r.primary,0),recent.length*100))+' ('+recent.length+'회)':'';
        }).filter(Boolean);
        list.append(element('li',size+'장 · '+values.join(' / ')));
    }
    box.append(list);note(box,'카드 수와 관찰 시간이 같은 기록끼리 비교하세요. 수치는 이 카드 훈련의 성과를 나타냅니다.');
}
$('start').addEventListener('click',()=>{const cfg=config();if(!cfg)return;if(saved&&saved.phase!=='review'&&!confirm('저장된 훈련을 새 배치로 바꿀까요?'))return;begin(cfg);});
$('resume').addEventListener('click',()=>{if(!saved)return;session=saved;pickerKey=null;paused=false;apply(session.cfg);render(true);startClock();});
document.addEventListener('visibilitychange',()=>{
    if(!session||paused||session.phase==='review')return;
    if(document.hidden){stop();stash();}else startClock();
});
window.addEventListener('pagehide',()=>{if(session){stop();stash();}});
window.addEventListener('pageshow',e=>{if(e.persisted&&session&&!paused)startClock();});
apply(read('prefs',null));setup();
})();
