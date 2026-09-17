const $=s=>document.querySelector(s);const canvas=$('#outputCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const fields=['productName','productPrice','redEnvelope','newUserMax','packingFee','deliveryFee','deliveryDiscount','finalPrice'];
const state={source:null,sourceUrl:'',crop:{x:0,y:0,w:1,h:1},nameCrop:{x:.35,y:.05,w:.55,h:.28},thumb:null,cutout:null,cutoutBusy:false,rawCrop:null,drag:null,exportBytes:0,batch:[],current:-1,upscaler:null,batchBusy:false};
let bgRemovalModulePromise=null;
const vals=()=>Object.fromEntries(fields.map(id=>[id,$('#'+id).value]));
const money=v=>{const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):String(Number(n.toFixed(2)))):'0'};
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el.t);el.t=setTimeout(()=>el.classList.remove('show'),2400)}
function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function text(t,x,y,size,weight='600',color='#111a30',align='left'){ctx.save();ctx.font=`${weight} ${size}px "Microsoft YaHei","PingFang SC",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);ctx.restore()}
function fitImage(img,x,y,w,h,contain=true){if(!img)return;const r=contain?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function render(){const v=vals();ctx.save();ctx.fillStyle=$('#whiteBg').checked?'#fff':'#fbfbfb';ctx.fillRect(0,0,800,800);ctx.restore();
  text('闪购',46,48,28,'900','#f05a1e');text('瑞幸咖啡',111,48,28,'800');text('蜂鸟准时达',681,48,18,'700','#f36a1d','center');
  ctx.save();ctx.strokeStyle='#f6d7c7';ctx.lineWidth=1;roundedRect(ctx,620,29,122,36,9);ctx.stroke();ctx.restore();
  ctx.save();roundedRect(ctx,46,79,120,120,14);ctx.clip();ctx.fillStyle='#f1f3f4';ctx.fillRect(46,79,120,120);if(state.thumb)fitImage(state.thumb,46,79,120,120,false);ctx.restore();
  ctx.save();ctx.fillStyle='#ff7318';roundedRect(ctx,43,76,46,25,5);ctx.fill();ctx.restore();text('招牌',66,89,14,'700','#fff','center');
  text(v.productName||'产品名称',187,91,18,'700');
  const left=[['打包费',245],['配送费',316],['店铺活动/券',387],['平台红包',458],['下单返豆',529]];left.forEach(([a,y])=>text(a,48,y,24,'650'));text('合计',48,625,27,'800');text('备注',48,718,24,'800');
  [278,349,420,491,562,669].forEach(y=>{ctx.fillStyle='#eef1f4';ctx.fillRect(47,y,704,1)});ctx.fillStyle='#edf3f6';ctx.fillRect(47,676,704,10);
  if(state.cutout){const maxW=420,maxH=570,r=Math.min(maxW/state.cutout.width,maxH/state.cutout.height),w=state.cutout.width*r,h=state.cutout.height*r;ctx.save();ctx.shadowColor='rgba(35,26,18,.24)';ctx.shadowBlur=18;ctx.shadowOffsetY=10;ctx.drawImage(state.cutout,250+(420-w)/2,112+(570-h),w,h);ctx.restore()}else{text(state.cutoutBusy?'AI正在生成立体商品主体…':'上传截图后自动生成商品抠图',460,390,17,'500','#a0a8b6','center')}
  text('¥'+money(v.productPrice),714,105,29,'700','#111a30','right');text('¥'+money(v.packingFee),714,246,25,'650','#111a30','right');
  text('减'+money(v.deliveryDiscount)+'元',592,316,22,'700','#ef2d2d');text('¥3',665,316,20,'500','#8a91a0');text('¥'+money(v.deliveryFee),714,316,25,'650','#111a30','right');
  ctx.save();ctx.fillStyle='#fff0ee';roundedRect(ctx,560,365,128,34,7);ctx.fill();ctx.restore();text('群可再领2元',624,382,18,'650','#ef3a30','center');text('›',711,382,28,'400','#8e96a5','center');
  ctx.save();ctx.fillStyle='#f1322f';roundedRect(ctx,563,427,78,36,6);ctx.fill();ctx.restore();text('爆红包',602,445,18,'700','#fff','center');text('-¥'+money(v.redEnvelope),701,445,23,'750','#ef2d2d','right');text('›',716,445,28,'400','#8e96a5','center');text('新人最高'+money(v.newUserMax)+'元红包',563,476,13,'650','#ef2d2d');
  text('含吃货卡奖励等',560,521,20,'650','#ef2d2d');text('¥21',534,625,23,'700','#ef2d2d','right');text('¥'+money(v.finalPrice)+'起',714,625,36,'700','#111a30','right');
  text('仅限首次在淘宝闪购下单的新用户参与',289,716,12,'400','#555d6c');text('用户领取淘宝闪购频道专属权益后下单可享优惠，活动详情请见淘宝APP',289,739,12,'400','#555d6c');
}
fields.forEach(id=>$('#'+id).addEventListener('input',render));$('#whiteBg').addEventListener('change',render);
function addFiles(list){const files=[...list].filter(f=>f.type.startsWith('image/'));if(!files.length)return toast('请选择图片文件');for(const file of files){const url=URL.createObjectURL(file);state.batch.push({file,url,name:file.name,status:'待处理',productName:'',price:''})}$('#batchCard').hidden=false;renderBatch();openBatch(state.batch.length-files.length);toast(`已加入 ${files.length} 张截图`)}
function renderBatch(){
  const el=$('#batchList');
  $('#batchCount').textContent=state.batch.length+' 张';
  el.innerHTML='';
  state.batch.forEach((it,i)=>{
    const entry=document.createElement('div');
    entry.className='batch-entry';
    const b=document.createElement('button');
    b.type='button';
    b.className='batch-item '+(i===state.current?'active ':'')+(it.status==='完成'?'done':it.status==='处理中'?'working':'');
    b.innerHTML=`<img src="${it.url}" alt=""><b>${it.productName||it.name}</b><small>${it.status}${it.price?' · ¥'+it.price:''}</small>`;
    b.onclick=()=>openBatch(i);
    const del=document.createElement('button');
    del.type='button';
    del.className='batch-delete';
    del.textContent='×';
    del.title='删除这张图片';
    del.setAttribute('aria-label','删除 '+(it.productName||it.name));
    del.disabled=state.batchBusy;
    del.onclick=e=>{e.stopPropagation();removeBatch(i)};
    entry.append(b,del);
    el.appendChild(entry);
  });
}
function clearCurrent(){
  state.current=-1;state.source=null;state.sourceUrl='';state.thumb=null;state.cutout=null;state.cutoutBusy=false;state.rawCrop=null;
  $('#sourceImage').removeAttribute('src');$('#sourceWrap').hidden=true;$('#batchCard').hidden=true;render();
}
function removeBatch(i){
  if(state.batchBusy)return toast('批量处理中，完成后再删除');
  const wasCurrent=i===state.current,it=state.batch[i];if(!it)return;
  URL.revokeObjectURL(it.url);state.batch.splice(i,1);
  if(!state.batch.length){renderBatch();clearCurrent();return toast('图片已删除')}
  if(i<state.current)state.current--;
  renderBatch();
  if(wasCurrent)openBatch(Math.min(i,state.batch.length-1));
  toast('图片已删除');
}
function openBatch(i){return new Promise((resolve,reject)=>{const it=state.batch[i];if(!it)return reject(new Error('任务不存在'));const img=new Image();img.onload=()=>{state.current=i;state.sourceUrl=it.url;state.source=img;$('#sourceImage').src=it.url;$('#sourceWrap').hidden=false;if(it.productName)$('#productName').value=it.productName;if(it.price)$('#productPrice').value=it.price;renderBatch();requestAnimationFrame(()=>{autoCrop();processCrop();render();resolve()})};img.onerror=reject;img.src=it.url})}
$('#fileInput').addEventListener('change',e=>addFiles(e.target.files));const dz=$('#dropzone');['dragenter','dragover'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
function imageRect(){const img=$('#sourceImage'),stage=$('#cropStage'),ir=img.getBoundingClientRect(),sr=stage.getBoundingClientRect();return{x:ir.left-sr.left,y:ir.top-sr.top,w:ir.width,h:ir.height}}
function detectProductRegion(){const s=state.source,maxW=500,scale=Math.min(1,maxW/s.naturalWidth),w=Math.max(1,Math.round(s.naturalWidth*scale)),h=Math.max(1,Math.round(s.naturalHeight*scale)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(s,0,0,w,h);const d=c.getImageData(0,0,w,h).data,corner=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]],bg=corner.reduce((a,[x,y])=>{const i=(y*w+x)*4;return[a[0]+d[i],a[1]+d[i+1],a[2]+d[i+2]]},[0,0,0]).map(v=>v/4),seen=new Uint8Array(w*h),limit=Math.round(w*.58);let best=null;const fg=i=>{const k=i*4,r=d[k],g=d[k+1],b=d[k+2],dif=Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),Math.abs(b-bg[2])),sat=Math.max(r,g,b)-Math.min(r,g,b),lum=(r+g+b)/3;return dif>24&&(sat>18||lum<218)};for(let y=1;y<h-1;y++)for(let x=1;x<limit;x++){const start=y*w+x;if(seen[start]||!fg(start))continue;const q=[start];seen[start]=1;let n=0,x0=x,x1=x,y0=y,y1=y;for(let p=0;p<q.length;p++){const i=q[p],px=i%w,py=(i/w)|0;n++;x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);for(const ni of [i-1,i+1,i-w,i+w])if(ni>0&&ni<w*h&&!seen[ni]&&fg(ni)){seen[ni]=1;q.push(ni)}}const bw=x1-x0+1,bh=y1-y0+1,score=n*(1+Math.min(1,bh/Math.max(1,bw))*.35);if(n>24&&(!best||score>best.score))best={x0,x1,y0,y1,score}}if(!best)return null;const px=Math.max(5,(best.x1-best.x0)*.18),py=Math.max(5,(best.y1-best.y0)*.12),x0=Math.max(0,best.x0-px),y0=Math.max(0,best.y0-py),x1=Math.min(w,best.x1+px),y1=Math.min(h,best.y1+py);return{x:x0/w,y:y0/h,w:(x1-x0)/w,h:(y1-y0)/h}}
function autoCrop(){if(!state.source)return;const portrait=state.source.width<state.source.height*1.15,detected=detectProductRegion();state.crop=detected&&detected.w>.07&&detected.h>.12?detected:(portrait?{x:.08,y:.05,w:.84,h:.9}:{x:.03,y:.06,w:.23,h:.86});const nx=Math.min(.94,state.crop.x+state.crop.w+.025),ny=Math.max(.01,state.crop.y-.03);state.nameCrop={x:nx,y:ny,w:Math.max(.05,Math.min(.94-nx,.52)),h:Math.max(.12,Math.min(.3,state.crop.h*.34))};updateCropBoxes()}
function placeBox(box,c){const ir=imageRect();box.style.left=(ir.x+c.x*ir.w)+'px';box.style.top=(ir.y+c.y*ir.h)+'px';box.style.width=(c.w*ir.w)+'px';box.style.height=(c.h*ir.h)+'px'}
function updateCropBoxes(){placeBox($('#cropBox'),state.crop);placeBox($('#nameCropBox'),state.nameCrop)}
function pointerToNorm(e){const ir=imageRect();return{x:(e.clientX-ir.x)/ir.w,y:(e.clientY-ir.y)/ir.h}}
function setupCropInteraction(selector,key,after){const box=$(selector);box.addEventListener('pointerdown',e=>{e.preventDefault();box.setPointerCapture(e.pointerId);const p=pointerToNorm(e);state.drag={key,mode:e.target.classList.contains('handle')?'resize':'move',p,c:{...state[key]}}});box.addEventListener('pointermove',e=>{if(!state.drag||state.drag.key!==key)return;const p=pointerToNorm(e),d=state.drag,c=state[key];if(d.mode==='move'){c.x=Math.max(0,Math.min(1-d.c.w,d.c.x+p.x-d.p.x));c.y=Math.max(0,Math.min(1-d.c.h,d.c.y+p.y-d.p.y))}else{c.w=Math.max(.05,Math.min(1-d.c.x,d.c.w+p.x-d.p.x));c.h=Math.max(.07,Math.min(1-d.c.y,d.c.h+p.y-d.p.y))}updateCropBoxes()});box.addEventListener('pointerup',()=>{state.drag=null;if(after)after()})}
setupCropInteraction('#cropBox','crop',()=>{processCrop();render()});setupCropInteraction('#nameCropBox','nameCrop',null);$('#autoCropBtn').addEventListener('click',()=>{autoCrop();processCrop();render()});
function cropByNorm(c){const s=state.source,sw=Math.max(1,Math.round(c.w*s.naturalWidth)),sh=Math.max(1,Math.round(c.h*s.naturalHeight)),sx=Math.round(c.x*s.naturalWidth),sy=Math.round(c.y*s.naturalHeight),tmp=document.createElement('canvas');tmp.width=sw;tmp.height=sh;tmp.getContext('2d',{willReadFrequently:true}).drawImage(s,sx,sy,sw,sh,0,0,sw,sh);return tmp}
function processCrop(){if(!state.source)return;const tmp=cropByNorm(state.crop);state.rawCrop=tmp;const enhanced=enhanceCanvas(tmp);state.thumb=enhanced;state.cutout=trimOuterWhitespace(enhanced);const short=Math.min(tmp.width,tmp.height);$('#parseStatus').textContent=short<180?'原图较小，将使用AI超分增强':'已精确选图，商品内部细节将完整保留'}
function enhanceCanvas(src){const max=Math.max(src.width,src.height),scale=Math.max(1,Math.min(5,1100/max)),o=document.createElement('canvas');o.width=Math.round(src.width*scale);o.height=Math.round(src.height*scale);const c=o.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.filter='contrast(1.08) saturate(1.08)';c.drawImage(src,0,0,o.width,o.height);c.filter='none';return sharpenCanvas(o,.22)}
async function aiEnhanceCurrent(){
  if(!state.rawCrop)return false;
  state.cutoutBusy=true;state.cutout=null;render();
  let enhanced=false;
  if(window.Upscaler&&window.DefaultUpscalerJSModel)try{
    $('#parseStatus').textContent='AI超分辨率增强中…';state.upscaler ||= new Upscaler({model:DefaultUpscalerJSModel});
    const src=await state.upscaler.upscale(state.rawCrop,{patchSize:64,padding:4}),img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=src});
    const cv=document.createElement('canvas'),scale=Math.max(1,Math.min(4,1100/Math.max(img.width,img.height)));cv.width=Math.round(img.width*scale);cv.height=Math.round(img.height*scale);const c=cv.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(img,0,0,cv.width,cv.height);state.thumb=sharpenCanvas(cv,.18);enhanced=true;
  }catch(e){console.warn('AI upscale fallback',e)}
  try{
    state.cutout=stylizeCutout(await aiProductCutout(state.thumb||enhanceCanvas(state.rawCrop)));state.cutoutBusy=false;render();return true;
  }catch(e){console.warn('AI product cutout fallback',e);state.cutoutBusy=false;state.cutout=null;render();$('#parseStatus').textContent='AI商品抠图失败，请检查网络后重试';return false}
}
function sharpenCanvas(src,amount){const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),s=im.data,out=new Uint8ClampedArray(s),w=src.width,h=src.height;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let k=0;k<3;k++){const sharp=5*s[i+k]-s[i-4+k]-s[i+4+k]-s[i-w*4+k]-s[i+w*4+k];out[i+k]=Math.max(0,Math.min(255,s[i+k]*(1-amount)+sharp*amount))}}im.data.set(out);c.putImageData(im,0,0);return src}
function trimOuterWhitespace(src){
  const c=src.getContext('2d',{willReadFrequently:true}),d=c.getImageData(0,0,src.width,src.height).data,w=src.width,h=src.height;
  let x0=w,y0=h,x1=-1,y1=-1,count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b);if(lo<210||hi-lo>38){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++}}
  if(x1<0||count<w*h*.008)return src;
  const pad=Math.max(5,Math.round(Math.min(w,h)*.035));x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;const oc=out.getContext('2d');oc.fillStyle='#fff';oc.fillRect(0,0,out.width,out.height);oc.drawImage(src,x0,y0,out.width,out.height,0,0,out.width,out.height);return out;
}
function stylizeCutout(src){const out=document.createElement('canvas');out.width=src.width;out.height=src.height;const c=out.getContext('2d',{willReadFrequently:true});c.filter='contrast(1.1) saturate(1.06)';c.drawImage(src,0,0);c.filter='none';return sharpenCanvas(out,.14)}
function canvasToBlob(src){return new Promise((resolve,reject)=>src.toBlob(blob=>blob?resolve(blob):reject(new Error('图片转换失败')),'image/png',1))}
async function blobToCanvas(blob){const url=URL.createObjectURL(blob),img=new Image();try{await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});const out=document.createElement('canvas');out.width=img.naturalWidth;out.height=img.naturalHeight;out.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);return out}finally{URL.revokeObjectURL(url)}}
function removeFloatingTags(src){
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),d=im.data,w=src.width,h=src.height,tag=new Uint8Array(w*h),seen=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){const k=i*4,r=d[k],g=d[k+1],b=d[k+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(d[k+3]>25&&hi>115&&hi-lo>68&&(b>r*1.16||r>g*1.28&&r>b*1.12||r>175&&g>75&&g<165&&b<90))tag[i]=1}
  for(let start=0;start<tag.length;start++){
    if(!tag[start]||seen[start])continue;const q=[start];seen[start]=1;let x0=w,y0=h,x1=0,y1=0,n=0;
    for(let p=0;p<q.length;p++){const i=q[p],x=i%w,y=(i/w)|0;n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&tag[ni]&&!seen[ni]){seen[ni]=1;q.push(ni)}}
    const bw=x1-x0+1,bh=y1-y0+1,fill=n/(bw*bh),upper=y0<h*.62,tagShape=bw>w*.045&&bh>h*.025&&bw<w*.62&&bh<h*.28&&(bw/bh>1.05||fill>.48);
    if(upper&&tagShape){const pad=Math.max(3,Math.round(Math.min(w,h)*.008));for(let y=Math.max(0,y0-pad);y<=Math.min(h-1,y1+pad);y++)for(let x=Math.max(0,x0-pad);x<=Math.min(w-1,x1+pad);x++)d[(y*w+x)*4+3]=0}
  }
  c.putImageData(im,0,0);return trimCanvas(src);
}
async function aiProductCutout(src){
  $('#parseStatus').textContent='首次使用需加载AI商品模型，请稍候…';
  bgRemovalModulePromise ||= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
  const {removeBackground}=await bgRemovalModulePromise,input=await canvasToBlob(src);
  const config={model:'small',device:navigator.gpu?'gpu':'cpu',output:{format:'image/png',quality:1},progress:(key,current,total)=>{if(total>0&&key.startsWith('fetch'))$('#parseStatus').textContent=`加载AI商品模型 ${Math.round(current/total*100)}%（首次约30–90秒）`;else if(key.startsWith('compute'))$('#parseStatus').textContent='AI正在分离商品与背景，请勿关闭页面…'}};
  let result;try{result=await removeBackground(input,config)}catch(e){if(config.device!=='gpu')throw e;result=await removeBackground(input,{...config,device:'cpu'})}
  $('#parseStatus').textContent='正在清理圆形底图和商品标签…';return removeFloatingTags(await blobToCanvas(result));
}
function removeEdgeWhite(src){
  const out=document.createElement('canvas');out.width=src.width;out.height=src.height;
  const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0);
  const im=c.getImageData(0,0,out.width,out.height),d=im.data,w=out.width,h=out.height;
  const seen=new Uint8Array(w*h),protectedPixels=new Uint8Array(w*h),q=new Int32Array(w*h);
  const isBg=i=>{const k=i*4,r=d[k],g=d[k+1],b=d[k+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b);return lo>212&&hi-lo<34};
  // Protect light logos, ice and cup highlights that sit close to definite product colours.
  const radius=Math.max(8,Math.round(Math.min(w,h)*.025)),protectQ=new Int32Array(w*h),dist=new Uint16Array(w*h);let ph=0,pt=0;
  for(let i=0;i<w*h;i++){const k=i*4,r=d[k],g=d[k+1],b=d[k+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b);if(lo<188||hi-lo>52){protectedPixels[i]=1;protectQ[pt++]=i}}
  while(ph<pt){const i=protectQ[ph++],di=dist[i];if(di>=radius)continue;const x=i%w,y=(i/w)|0;for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&!protectedPixels[ni]){protectedPixels[ni]=1;dist[ni]=di+1;protectQ[pt++]=ni}}
  let a=0,z=0;const push=i=>{if(!seen[i]&&!protectedPixels[i]&&isBg(i)){seen[i]=1;q[z++]=i}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(a<z){const i=q[a++],x=i%w,y=(i/w)|0;if(x)push(i-1);if(x<w-1)push(i+1);if(y)push(i-w);if(y<h-1)push(i+w)}
  for(let i=0;i<seen.length;i++)if(seen[i])d[i*4+3]=0;
  c.putImageData(im,0,0);return trimCanvas(out);
}
function trimCanvas(src){const c=src.getContext('2d'),d=c.getImageData(0,0,src.width,src.height).data;let x0=src.width,y0=src.height,x1=0,y1=0;for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(d[(y*src.width+x)*4+3]>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}if(x1<=x0||y1<=y0)return src;const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(src,x0,y0,o.width,o.height,0,0,o.width,o.height);return o}
async function parseScreenshot(silent=false){if(!state.source)return toast('请先上传商品截图');const btn=$('#parseBtn'),status=$('#parseStatus'),item=state.batch[state.current];btn.disabled=true;if(item){item.status='处理中';renderBatch()}status.textContent='正在读取紫色名称选区…';try{if(!window.Tesseract)throw new Error('OCR组件未加载');const progress=m=>{if(m.status==='recognizing text')status.textContent=`识别文字 ${Math.round(m.progress*100)}%`};const nameCanvas=cropByNorm(state.nameCrop);const [{data:nameData},{data:allData}]=await Promise.all([Tesseract.recognize(nameCanvas,'chi_sim+eng',{logger:progress}),Tesseract.recognize(state.source,'chi_sim+eng')]);const clean=t=>t.replace(/\s+/g,'').replace(/[|丨]/g,'').trim(),blocked=/(月售|折起|选规格|纯抹茶|浓度|红包|配送|打包|到手)/,nameCandidates=(nameData.lines||[]).map(x=>clean(x.text)).filter(t=>/[\u4e00-\u9fff]/.test(t)&&t.length>=2&&t.length<=18&&!blocked.test(t));if(!nameCandidates.length){const fallback=clean(nameData.text||'');if(/[\u4e00-\u9fff]/.test(fallback)&&fallback.length<=18)nameCandidates.push(fallback)}const raw=(allData.text||'').replace(/\s+/g,' '),prices=[...raw.matchAll(/[¥￥]\s*(\d+(?:\.\d+)?)/g)].map(m=>m[1]);if(nameCandidates[0])$('#productName').value=nameCandidates.sort((a,b)=>b.length-a.length)[0];if(prices.length)$('#productPrice').value=prices.at(-1);processCrop();const cutoutOk=await aiEnhanceCurrent();render();if(item){item.productName=$('#productName').value;item.price=$('#productPrice').value;item.status=cutoutOk?'完成':'抠图失败';renderBatch()}if(cutoutOk){status.textContent='识别完成 · 立体商品主体已生成';if(!silent)toast('已生成透明立体商品主体')}else{status.textContent='AI抠图失败，请检查网络后点击重试';if(!silent)toast('AI抠图未完成，请重试')}return cutoutOk}catch(e){console.warn(e);state.cutoutBusy=false;if(item){item.status='需手动校正';renderBatch()}status.textContent='自动识别不可用，请调整选区后重试';if(!silent)toast('识别失败，请调整商品或名称选区');return false}finally{btn.disabled=false;render()}}
$('#parseBtn').addEventListener('click',()=>parseScreenshot(false));
$('#parseAllBtn').addEventListener('click',async()=>{const b=$('#parseAllBtn');if(!state.batch.length)return;state.batchBusy=true;b.disabled=true;b.textContent='批量处理中…';renderBatch();try{for(let i=0;i<state.batch.length;i++){await openBatch(i);await parseScreenshot(true)}}finally{state.batchBusy=false;b.disabled=false;b.textContent='一键解析并优化全部';renderBatch()}toast('批量任务处理完成')});
async function canvasBlob(q){return new Promise(r=>canvas.toBlob(r,'image/jpeg',q))}async function download(){render();let q=.92,blob=await canvasBlob(q);while(blob.size>400*1024&&q>.45){q-=.07;blob=await canvasBlob(q)}state.exportBytes=blob.size;$('#exportMeta').textContent=`800×800 · ${(blob.size/1024).toFixed(0)} KB`;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(($('#productName').value||'商品图').replace(/[\\/:*?"<>|]/g,'_'))+'-800x800.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast('成品图已下载')}
$('#downloadBtn').addEventListener('click',download);window.addEventListener('resize',()=>state.source&&updateCropBoxes());render();
function registerWebMCP(){const mc=document.modelContext;if(!mc?.registerTool)return;try{mc.registerTool({name:'configure_product_poster',title:'设置商品图字段',description:'设置商品名称、商品价格、红包金额和费用，并同步更新可见预览。',inputSchema:{type:'object',properties:{productName:{type:'string',maxLength:16},productPrice:{type:'number',minimum:0},redEnvelope:{type:'number',minimum:0},newUserMax:{type:'number',minimum:0},packingFee:{type:'number',minimum:0},deliveryFee:{type:'number',minimum:0},deliveryDiscount:{type:'number',minimum:0},finalPrice:{type:'number',minimum:0}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('参数必须是对象');for(const [k,v] of Object.entries(input)){if(!fields.includes(k))throw new Error('不支持的字段: '+k);if(k==='productName'){if(typeof v!=='string'||!v.trim()||v.length>16)throw new Error('产品名称需为1到16个字符')}else if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new Error(k+'必须是非负数字');$('#'+k).value=v}render();return{updated:Object.keys(input),values:vals()}}})}catch(e){console.warn('WebMCP registration unavailable',e)}}registerWebMCP();
