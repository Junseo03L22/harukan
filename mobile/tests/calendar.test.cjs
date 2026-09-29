const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/calendar/model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('exports','module',code)(m.exports,m);const model=m.exports;
test('calendar respects leap years, week starts and year boundaries',()=>{
 const sept=model.monthCells(2026,8);assert.equal(sept[2],'2026-09-01');assert.equal(sept.filter(Boolean).length,30);assert.equal(sept.length%7,0);
 assert.equal(model.monthCells(2024,1).filter(Boolean).length,29);assert.equal(model.monthCells(2025,1).filter(Boolean).length,28);
 assert.equal(model.monthCells(2026,12).find(Boolean),'2027-01-01');
});
test('photo placement and reversible mask survive storage round trip',()=>{
 const a=model.emptyAlbum();const piece={id:'test',kind:'photo',source:'test.jpg',width:100,height:200,x:.5,y:.5,size:.7,rotation:20,cutout:{outline:[{x:0,y:0},{x:500,y:0},{x:500,y:800}],strokes:[{points:[{x:100,y:100}],width:45,restore:false},{points:[{x:110,y:110}],width:20,restore:true}]}};
 a.days['2026-09-22']=[piece];a.shelf=[piece];assert.deepEqual(model.parseAlbum(JSON.stringify(a)),a);assert.deepEqual(model.fitBox(100,200,80),{width:40,height:80});
});
test('corrupt or unsupported saved data is rejected rather than erased',()=>{
 assert.deepEqual(model.parseAlbum(null),model.emptyAlbum());for(const raw of ['{bad','null','{}',JSON.stringify({...model.emptyAlbum(),version:2})])assert.throws(()=>model.parseAlbum(raw));
 const a=model.emptyAlbum();a.shelf=[{id:'bad',kind:'photo',source:'x',width:0,height:2,x:.5,y:.5,size:.5,rotation:0}];assert.throws(()=>model.parseAlbum(JSON.stringify(a)));
});
test('short video and animated GIF metadata survive reload alongside existing photos',()=>{
 const a=model.emptyAlbum();const base={id:'clip',source:'media:test',width:1920,height:1080,x:.5,y:.5,size:.78,rotation:0};
 a.days['2026-09-22']=[{...base,kind:'video',duration:4,poster:'data:image/jpeg;base64,test'},{...base,id:'gif',kind:'gif',source:'wave.gif'}];
 assert.deepEqual(model.parseAlbum(JSON.stringify(a)),a);
 for(const duration of [0,-1,NaN,Infinity,5.2,10])assert.throws(()=>model.validateVideoDuration(duration));
 for(const duration of [.5,3,5])assert.doesNotThrow(()=>model.validateVideoDuration(duration));
 a.days['2026-09-22'][0].duration=10;assert.throws(()=>model.parseAlbum(JSON.stringify(a)));
});
test('corner resize preserves aspect ratio and opposite corner for rotated photos',()=>{
 const base={id:'p',kind:'photo',source:'p.jpg',width:200,height:100,x:.5,y:.5,size:.5,rotation:0};
 const r=model.resizePiece(base,400,1,1,40,20);assert.ok(Math.abs(r.size-.6)<1e-9);assert.ok(Math.abs(r.x-.55)<1e-9);assert.ok(Math.abs(r.y-.525)<1e-9);
 const rotated=model.resizePiece({...base,rotation:90},400,1,1,-20,40);assert.ok(Math.abs(rotated.size-.6)<1e-9);assert.ok(Math.abs(rotated.x-.475)<1e-9);assert.ok(Math.abs(rotated.y-.55)<1e-9);
 assert.equal(model.resizePiece(base,400,1,1,-999,-999).size,.2);assert.equal(model.resizePiece(base,400,1,1,999,999).size,1);
});
test('pinch scales proportionally and guards limits and invalid touch distances',()=>{
 assert.equal(model.pinchSize(.5,100,150),.75);assert.equal(model.pinchSize(.5,100,50),.25);
 assert.equal(model.pinchSize(.5,100,10),.2);assert.equal(model.pinchSize(.5,100,400),1);
 assert.equal(model.pinchSize(.5,0,100),.5);assert.equal(model.pinchSize(.5,100,NaN),.5);
});
test('four-photo templates and nondestructive tones restore and reject malformed drafts',()=>{
 const a=model.emptyAlbum();const f={source:'p.jpg',width:200,height:100};const p={id:'four',kind:'collage',source:'collage',frames:[f,f,f,f],layout:'strip',frameColor:'#FFFDF8',width:300,height:900,x:.5,y:.5,size:.9,rotation:0,tone:'warm',intensity:.5};a.days['2026-09-23']=[p];assert.deepEqual(model.parseAlbum(JSON.stringify(a)),a);
 p.frames=[f,f,f];assert.throws(()=>model.parseAlbum(JSON.stringify(a)));p.frames=[f,f,f,f];p.intensity=2;assert.throws(()=>model.parseAlbum(JSON.stringify(a)));
});
test('schedules preserve older albums and validate title and 24-hour time',()=>{
 const old=model.emptyAlbum();assert.deepEqual(model.parseAlbum(JSON.stringify(old)),old);
 const event={id:'e',title:'약속',time:'14:30',note:'메모'};const a={...old,events:{'2026-09-23':[event]}};assert.deepEqual(model.parseAlbum(JSON.stringify(a)),a);
 for(const time of ['24:00','12:60','9:30','bad'])assert.throws(()=>model.validateSchedule({...event,time}));
 assert.doesNotThrow(()=>model.validateSchedule({...event,time:null}));assert.throws(()=>model.validateSchedule({...event,title:' '}));
 assert.throws(()=>model.parseAlbum(JSON.stringify({...old,events:{'2026-09-23':[{}]}})));
});
test('diary decorations, monthly margins, papers and event styles survive reload',()=>{
 const base={id:'d',source:'text',width:400,height:120,x:.5,y:.5,size:.5,rotation:0};
 const pieces=[{...base,kind:'text',text:'9월 기록',font:'hand',color:'#876675'},{...base,id:'t',kind:'tape',pattern:'dots',color:'#D68792'},{...base,id:'s',kind:'stamp',text:'여행'},{...base,id:'p',kind:'photo',source:'p.jpg',frame:'polaroid',caption:'바다'},{...base,id:'draw',kind:'doodle',drawing:[{points:[{x:10,y:20},{x:50,y:90}],width:8,color:'#876675'}]}];
 const a={...model.emptyAlbum(),days:{'2026-09-23':pieces},papers:{'2026-09-23':'grid'},months:{'2026-09:top':{pieces,paper:'kraft'}},events:{'2026-09-23':[{id:'e',title:'생일',time:null,note:'',style:'label',done:true}]}};
 assert.deepEqual(model.parseAlbum(JSON.stringify(a)),a);
 assert.throws(()=>model.parseAlbum(JSON.stringify({...a,months:{bad:{paper:'unknown',pieces:[]}}})));
 assert.throws(()=>model.parseAlbum(JSON.stringify({...a,papers:{bad:'unknown'}})));
 assert.throws(()=>model.validateSchedule({id:'e',title:'x',time:null,note:'',done:'yes'}));
 pieces[4].drawing[0].points[0].x=NaN;assert.throws(()=>model.parseAlbum(JSON.stringify(a)));
});
