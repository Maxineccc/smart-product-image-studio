const $=s=>document.querySelector(s);const canvas=$('#outputCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const fields=['brandName','productName','adHeadline','warningText','productPrice','redEnvelope','newUserMax','packingFee','deliveryFee','deliveryDiscount','finalPrice'];
const state={template:'square',placements:{},source:null,sourceUrl:'',subjectUrl:'',directSubject:false,crop:{x:0,y:0,w:1,h:1},nameCrop:{x:.35,y:.05,w:.55,h:.28},thumb:null,cutout:null,cutoutBusy:false,rawCrop:null,drag:null,canvasDrag:null,exportBytes:0,batch:[],current:-1,batchBusy:false,modelReady:false,lastCutoutEngine:'',detailUpscaler:null,bundleUrl:'',bundleName:''};
const templateDefs={square:{w:800,h:800,name:'方形结算单',file:'方形结算单',hint:'费用明细与到手价展示',exportHint:'JPG，保留完整费用文字'},orderDetail:{w:800,h:800,name:'方形订单费用明细',file:'订单费用明细',hint:'商品与费用逐项展示，内容均可编辑',exportHint:'JPG，订单费用明细视觉'},socialCoupon:{w:800,h:800,name:'朋友圈红包券',file:'朋友圈红包券',hint:'参考朋友圈红包卡片，突出到手优惠',exportHint:'JPG，红包券卡视觉'},socialMinimal:{w:800,h:800,name:'朋友圈留白单品',file:'朋友圈留白单品',hint:'参考朋友圈单品推荐，留白清晰',exportHint:'JPG，留白单品视觉'},socialDeal:{w:800,h:800,name:'朋友圈左右好价',file:'朋友圈左右好价',hint:'参考左右分栏广告，商品与价格并列',exportHint:'JPG，左右好价视觉'},socialDuo:{w:800,h:800,name:'朋友圈双杯下单',file:'朋友圈双杯下单',hint:'参考双商品订单卡，同款双杯陈列',exportHint:'JPG，双杯下单视觉'},socialScene:{w:800,h:800,name:'朋友圈场景种草',file:'朋友圈场景种草',hint:'参考生活方式广告，突出商品氛围',exportHint:'JPG，场景种草视觉'},squareBestseller:{w:800,h:800,name:'方形爆款咖啡',file:'方形爆款咖啡',hint:'参考方形爆款价格卡，标题可自定义',exportHint:'JPG，方形爆款咖啡视觉'},blueIce:{w:800,h:800,name:'方形全冰去冰',file:'方形全冰去冰',hint:'浅蓝圆点视觉，突出冷热选择',exportHint:'JPG，全冰去冰视觉'},blueTop:{w:800,h:800,name:'方形人气TOP',file:'方形人气TOP',hint:'浅蓝圆点视觉，突出人气推荐',exportHint:'JPG，人气TOP视觉'},blueReturn:{w:800,h:800,name:'方形爆款回归',file:'方形爆款回归',hint:'浅蓝圆点视觉，突出爆款回归',exportHint:'JPG，爆款回归视觉'},cafe:{w:1280,h:720,name:'横版咖啡场景',file:'横版咖啡场景',hint:'品牌名称与饮料主体可替换',exportHint:'横版咖啡场景'},landscapeClean:{w:1280,h:720,name:'横版简洁好价',file:'横版简洁好价',hint:'电商横幅、信息简洁醒目',exportHint:'横版白橙促销视觉'},landscapeDark:{w:1280,h:720,name:'横版质感上新',file:'横版质感上新',hint:'深色高级感、适合新品',exportHint:'横版深色质感视觉'}};
const cafeBg=new Image();cafeBg.onload=()=>render();cafeBg.src='./assets/cafe-landscape-bg.webp';
const shangouLogo=new Image();shangouLogo.onload=()=>render();shangouLogo.src='./assets/taobao-shangou-logo.png';
let bgRemovalModulePromise=null;
let u2netSession=null;
const loadedScripts=new Map();
const vals=()=>Object.fromEntries(fields.map(id=>[id,$('#'+id).value]));
const money=v=>{const n=Number(v);return Number.isFinite(n)?(Number.isInteger(n)?String(n):String(Number(n.toFixed(2)))):'0'};
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el.t);el.t=setTimeout(()=>el.classList.remove('show'),2400)}
function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function text(t,x,y,size,weight='600',color='#111a30',align='left'){ctx.save();ctx.font=`${weight} ${size}px "Microsoft YaHei","PingFang SC",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);ctx.restore()}
function fitImage(img,x,y,w,h,contain=true){if(!img)return;const r=contain?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function drawLogo(x,y,w){if(shangouLogo.complete&&shangouLogo.naturalWidth){const h=w*shangouLogo.naturalHeight/shangouLogo.naturalWidth;ctx.drawImage(shangouLogo,x,y,w,h)}else text('淘宝闪购',x,y+18,26,'900','#ff5a12')}
function fillRound(x,y,w,h,r,color){ctx.save();ctx.fillStyle=color;roundedRect(ctx,x,y,w,h,r);ctx.fill();ctx.restore()}
function drawWarning(){const v=vals(),w=canvas.width,h=canvas.height,ox=Number($('#warningOffsetX').value),oy=Number($('#warningOffsetY').value),special=state.template==='landscapeClean',x=(special?250:w/2)+ox,y=h-17+oy,size=w>900?13:w<750?12:11,dark=state.template==='cafe'||state.template==='landscapeDark'||special;ctx.save();ctx.font=`500 ${size}px "Microsoft YaHei","PingFang SC",sans-serif`;ctx.fillStyle=dark?'rgba(255,255,255,.78)':'#737b88';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v.warningText||'仅限新客使用，适用商品/店铺以活动页面显示为准。',x,y,special?430:w-50);ctx.restore()}
const placementDefault={scale:100,x:0,y:0,rotation:0,opacity:100,flip:false,shadow:true},placementPresets={blueIce:{rotation:-7},blueTop:{rotation:-5},blueReturn:{rotation:6}};
function getPlacement(key=state.template){return state.placements[key]||(state.placements[key]={...placementDefault,...(placementPresets[key]||{})})}
function drawSubject(centerX,bottomY,maxW,maxH,placeholder){if(!state.cutout){const dark=state.template==='cafe'||state.template==='landscapeDark';text(state.cutoutBusy?'AI正在生成立体商品主体…':placeholder,centerX,bottomY-maxH/2,18,'600',dark?'rgba(255,255,255,.68)':'#a0a8b6','center');return}const p=getPlacement(),scale=p.scale/100,r=Math.min(maxW*scale/state.cutout.width,maxH*scale/state.cutout.height),w=state.cutout.width*r,h=state.cutout.height*r,rotation=p.rotation*Math.PI/180,opacity=p.opacity/100,flip=p.flip?-1:1,shadow=p.shadow;if(shadow){ctx.save();ctx.filter='blur(12px)';ctx.fillStyle='rgba(25,18,12,.24)';ctx.beginPath();ctx.ellipse(centerX,bottomY+4,Math.max(38,w*.32),Math.max(7,h*.026),0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.save();ctx.translate(centerX,bottomY-h/2);ctx.rotate(rotation);ctx.scale(flip,1);ctx.globalAlpha=opacity;ctx.drawImage(state.cutout,-w/2,-h/2,w,h);ctx.restore()}
function renderSquare(){const v=vals();ctx.save();ctx.fillStyle=$('#whiteBg').checked?'#fff':'#fbfbfb';ctx.fillRect(0,0,800,800);ctx.restore();
  drawLogo(46,31,126);text(v.brandName||'瑞幸咖啡',190,50,27,'800');text('蜂鸟准时达',681,48,18,'700','#f36a1d','center');
  ctx.save();ctx.strokeStyle='#f6d7c7';ctx.lineWidth=1;roundedRect(ctx,620,29,122,36,9);ctx.stroke();ctx.restore();
  ctx.save();roundedRect(ctx,46,79,120,120,14);ctx.clip();ctx.fillStyle='#f1f3f4';ctx.fillRect(46,79,120,120);if(state.thumb)fitImage(state.thumb,58,91,96,96,true);ctx.restore();
  ctx.save();ctx.fillStyle='#ff7318';roundedRect(ctx,43,76,46,25,5);ctx.fill();ctx.restore();text('招牌',66,89,14,'700','#fff','center');
  text(v.productName||'产品名称',187,91,18,'700');
  const left=[['打包费',245],['配送费',316],['店铺活动/券',387],['平台红包',458],['下单返豆',529]];left.forEach(([a,y])=>text(a,48,y,24,'650'));text('合计',48,625,27,'800');text('备注',48,718,24,'800');
  [278,349,420,491,562,669].forEach(y=>{ctx.fillStyle='#eef1f4';ctx.fillRect(47,y,704,1)});ctx.fillStyle='#edf3f6';ctx.fillRect(47,676,704,10);
  drawSubject(410+getPlacement().x,690+getPlacement().y,350,500,'上传透明PNG或点击智能解析');
  text('¥'+money(v.productPrice),714,105,29,'700','#111a30','right');text('¥'+money(v.packingFee),714,246,25,'650','#111a30','right');
  text('减'+money(v.deliveryDiscount)+'元',615,316,22,'700','#ef2d2d');text('¥'+money(v.deliveryFee),714,316,25,'650','#111a30','right');
  ctx.save();ctx.fillStyle='#fff0ee';roundedRect(ctx,548,365,152,34,7);ctx.fill();ctx.restore();text('加群可再领2元',624,382,18,'650','#ef3a30','center');text('›',711,382,28,'400','#8e96a5','center');
  ctx.save();ctx.fillStyle='#f1322f';roundedRect(ctx,563,427,78,36,6);ctx.fill();ctx.restore();text('爆红包',602,445,18,'700','#fff','center');text('-¥'+money(v.redEnvelope),701,445,23,'750','#ef2d2d','right');text('›',716,445,28,'400','#8e96a5','center');text('新人最高'+money(v.newUserMax)+'元红包',563,476,13,'650','#ef2d2d');
  text('含吃货卡奖励等',560,521,20,'650','#ef2d2d');text('¥'+money(v.finalPrice)+'起',714,625,36,'700','#111a30','right');
}
function renderOrderDetail(){const v=vals(),brand=(v.brandName||'品牌').trim(),product=(v.productName||'产品名称').trim(),nameSize=product.length>11?20:product.length>7?24:30,badgeW=Math.min(184,Math.max(112,brand.length*18+30)),deliveryAfter=Math.max(0,Number(v.deliveryFee||0)-Number(v.deliveryDiscount||0));ctx.fillStyle='#fff';ctx.fillRect(0,0,800,800);drawLogo(42,32,165);text(brand,752,54,22,'800','#222936','right');fillRound(38,92,724,218,22,'#fff');ctx.save();ctx.strokeStyle='#eceef2';ctx.lineWidth=2;roundedRect(ctx,38,92,724,218,22);ctx.stroke();ctx.restore();ctx.fillStyle='#fff7f3';ctx.beginPath();ctx.arc(135,196,86,0,Math.PI*2);ctx.fill();drawSubject(135+getPlacement().x,279+getPlacement().y,145,170,'上传商品主体');text(product,240,144,nameSize,'850','#111722');fillRound(240,180,badgeW,34,17,'#fff0e8');text(brand,240+badgeW/2,197,15,'750','#f25a24','center');text('×1',242,248,22,'600','#555d68');text('¥'+money(v.productPrice),730,153,32,'800','#111722','right');text('商品小计',730,226,17,'500','#8a9098','right');text('¥'+money(v.productPrice),730,259,27,'800','#111722','right');ctx.strokeStyle='#e5e7eb';ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(48,344);ctx.lineTo(752,344);ctx.stroke();ctx.setLineDash([]);const row=(label,value,y,color='#be0c18')=>{text(label,55,y,25,'650','#20242b');text(value,742,y,27,'750',color,'right')};row('打包费','¥'+money(v.packingFee),405);row('配送费',deliveryAfter?'¥'+money(deliveryAfter):'免配送费',466,deliveryAfter?'#be0c18':'#18a05e');text('活动配送优惠  -¥'+money(v.deliveryDiscount),56,505,17,'500','#888e96');row('会员券立减','-¥'+money(v.newUserMax),558);row('平台红包','-¥'+money(v.redEnvelope),619);const g=ctx.createLinearGradient(0,0,800,0);g.addColorStop(0,'#ff5c42');g.addColorStop(1,'#f32d3d');ctx.fillStyle=g;roundedRect(ctx,135,672,530,86,43);ctx.fill();text('到手价',230,715,20,'700','#fff','center');text('¥'+money(v.finalPrice)+'起',455,715,45,'900','#fff','center')}
function renderSocialCoupon(){const v=vals(),brand=(v.brandName||'品牌').trim(),g=ctx.createLinearGradient(0,0,800,800);g.addColorStop(0,'#fffdfa');g.addColorStop(1,'#fff1da');ctx.fillStyle=g;ctx.fillRect(0,0,800,800);drawLogo(44,38,170);text(brand,752,58,23,'800','#20263a','right');text('今天就要喝点好的',400,125,34,'800','#22283b','center');text(v.productName||'产品名称',400,170,20,'650','#767b87','center');fillRound(188,210,424,510,26,'#fff');ctx.save();ctx.shadowColor='rgba(205,125,34,.18)';ctx.shadowBlur=26;ctx.strokeStyle='#f6c77d';ctx.lineWidth=3;roundedRect(ctx,188,210,424,510,26);ctx.stroke();ctx.restore();fillRound(224,239,352,44,22,'#fff1dc');text('淘宝闪购专属优惠',400,261,20,'800','#d89032','center');drawSubject(400+getPlacement().x,505+getPlacement().y,190,205,'上传商品主体');text('外卖叠加红包',400,540,23,'700','#b98a51','center');text('¥'+money(v.finalPrice),400,594,55,'900','#9d5521','center');text('原价 ¥'+money(v.productPrice),400,635,18,'500','#9e8a74','center');fillRound(248,660,304,48,24,'#ff9b42');text('立即使用  ›',400,684,21,'800','#fff','center')}
function renderSocialMinimal(){const v=vals(),brand=(v.brandName||'品牌').trim();ctx.fillStyle='#fff';ctx.fillRect(0,0,800,800);drawLogo(44,38,168);text(brand+' · 今日推荐',752,58,23,'800','#20263a','right');text('领券下单更划算',400,132,32,'850','#fa5b20','center');ctx.fillStyle='#fffaf5';ctx.beginPath();ctx.arc(400,390,245,0,Math.PI*2);ctx.fill();drawSubject(400+getPlacement().x,606+getPlacement().y,340,410,'上传商品主体');fillRound(184,642,432,72,12,'#f7f7f8');drawLogo(202,660,112);text('¥'+money(v.finalPrice)+'起',574,669,30,'900','#f2382e','right');text('领取优惠  ›',574,695,17,'650','#6f7787','right');text('淘宝闪购 · 好货即刻到',400,748,17,'500','#9b9faa','center')}
function renderSocialDeal(){const v=vals(),brand=(v.brandName||'品牌').trim();ctx.fillStyle='#f8f8f6';ctx.fillRect(0,0,800,800);fillRound(38,38,724,724,24,'#fff');drawLogo(70,70,155);text(brand,726,88,20,'750','#22293a','right');fillRound(70,142,168,38,19,'#ffeede');text('闪购限时优惠',154,161,17,'800','#f45a1f','center');text(v.productName||'产品名称',72,240,40,'900','#161b27');text('新客专享 · 到手好价',73,290,20,'650','#757b86');ctx.fillStyle='#eceff2';ctx.fillRect(72,326,240,1);text('券后到手',72,375,20,'650','#545c6b');text('¥'+money(v.finalPrice),72,438,64,'900','#ef322d');text('参考价 ¥'+money(v.productPrice),74,488,18,'500','#9298a4');fillRound(72,548,235,58,10,'#ff5a1f');text('立即闪购',190,577,22,'800','#fff','center');ctx.fillStyle='#fff3e8';ctx.beginPath();ctx.arc(552,427,210,0,Math.PI*2);ctx.fill();drawSubject(550+getPlacement().x,684+getPlacement().y,330,500,'上传商品主体');text('淘宝闪购',550,728,18,'700','#ff5a1f','center')}
function renderSocialDuo(){const v=vals(),brand=(v.brandName||'品牌').trim();ctx.fillStyle='#fff';ctx.fillRect(0,0,800,800);drawLogo(42,34,168);text(brand,752,55,22,'800','#202638','right');fillRound(40,104,720,64,6,'#ffd51f');text('确认订单 · 闪购好价',400,136,24,'900','#27200c','center');text(v.productName||'产品名称',400,211,26,'800','#202638','center');drawSubject(304+getPlacement().x,602+getPlacement().y,245,390,'上传商品主体');drawSubject(500+getPlacement().x,602+getPlacement().y,245,390,'上传商品主体');text('双杯分享更快乐',400,625,22,'700','#4a5160','center');text('商品总额',70,654,18,'600','#6d7380');text('¥'+money(v.productPrice),730,654,21,'700','#252b38','right');text('闪购红包',70,693,18,'600','#6d7380');text('-¥'+money(v.redEnvelope),730,693,21,'800','#ef332c','right');fillRound(214,718,372,48,24,'#151b28');text('实付 ¥'+money(v.finalPrice)+' · 立即下单',400,742,20,'800','#fff','center')}
function renderSocialScene(){const v=vals(),brand=(v.brandName||'品牌').trim(),g=ctx.createLinearGradient(0,0,800,800);g.addColorStop(0,'#dff1ff');g.addColorStop(.48,'#fff6e5');g.addColorStop(1,'#ffd8a7');ctx.fillStyle=g;ctx.fillRect(0,0,800,800);ctx.fillStyle='rgba(255,255,255,.58)';ctx.beginPath();ctx.arc(655,155,185,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3a66d';ctx.beginPath();ctx.moveTo(0,620);ctx.quadraticCurveTo(390,535,800,620);ctx.lineTo(800,800);ctx.lineTo(0,800);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(77,128,157,.17)';ctx.fillRect(0,568,800,13);drawLogo(42,37,180);fillRound(44,108,335,44,22,'rgba(255,255,255,.78)');text(brand+' · 今日限定',211,130,19,'800','#24415a','center');text('一口好喝的',48,214,46,'900','#173a57');text('把快乐送到身边',48,271,38,'850','#173a57');text(v.productName||'产品名称',51,329,22,'650','#516778');fillRound(49,374,222,60,14,'#ff5a1f');text('¥'+money(v.finalPrice)+' 起',160,404,31,'900','#fff','center');drawSubject(560+getPlacement().x,716+getPlacement().y,360,560,'上传商品主体');text('淘宝闪购 · 即刻送达',53,740,19,'700','#fff')}
function renderSquareBestseller(){const v=vals(),brand=(v.brandName||'品牌').trim();ctx.fillStyle='#f5f5f2';ctx.fillRect(0,0,800,800);fillRound(30,30,740,740,20,'#fff');drawLogo(58,56,168);text(brand,738,76,21,'800','#222936','right');text(v.adHeadline||'爆款咖啡',65,214,48,'900','#181c27');text('每天喝爆款咖啡',67,275,21,'600','#666d78');text('快来领取优惠券吧~',67,313,21,'600','#666d78');text('优惠价',68,402,23,'700','#232936');text('¥',66,507,24,'650','#1a1e26');text(money(v.finalPrice),100,487,76,'900','#080b12');text('起',282,505,20,'650','#242a36');text('参考价 ¥'+money(v.productPrice),69,553,17,'500','#969ba5');fillRound(65,602,245,60,13,'#ff5a1f');text('淘宝闪购 立即下单',188,632,20,'800','#fff','center');ctx.fillStyle='#fff8ef';ctx.beginPath();ctx.arc(574,408,190,0,Math.PI*2);ctx.fill();drawSubject(570+getPlacement().x,650+getPlacement().y,330,520,'上传商品主体')}
function renderBluePromo(line1,line2,options={}){const v=vals(),headlineSize=options.headlineSize||86,headlineY1=options.headlineY1||246,headlineY2=options.headlineY2||344,priceY=options.priceY||520;ctx.fillStyle='#dceeff';ctx.fillRect(0,0,800,800);ctx.save();ctx.fillStyle='rgba(255,252,220,.72)';[[90,135,30],[255,74,25],[410,160,29],[677,112,31],[735,270,23],[612,390,28],[112,420,24],[380,560,25],[700,620,31],[210,680,22]].forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()});ctx.restore();ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,655);ctx.quadraticCurveTo(390,620,800,660);ctx.lineTo(800,800);ctx.lineTo(0,800);ctx.closePath();ctx.fill();ctx.strokeStyle='#153887';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,654);ctx.quadraticCurveTo(390,619,800,659);ctx.stroke();drawLogo(40,35,180);ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=12;ctx.lineJoin='round';ctx.font=`900 ${headlineSize}px "Microsoft YaHei","PingFang SC",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(line1,592,headlineY1);ctx.strokeText(line2,592,headlineY2);ctx.fillStyle='#173486';ctx.fillText(line1,592,headlineY1);ctx.fillText(line2,592,headlineY2);ctx.restore();if(options.badge){fillRound(488,370,244,54,27,'rgba(255,255,255,.94)');text(options.badge,610,397,25,'900','#ff5a1f','center')}drawSubject(280+getPlacement().x,700+getPlacement().y,370,540,'上传商品主体');fillRound(485,priceY,250,76,38,'#ff5a1f');text(money(v.finalPrice)+'元起',610,priceY+38,35,'900','#fff','center')}
function renderBlueIce(){renderBluePromo('全冰','去冰',{headlineSize:72,headlineY1:225,headlineY2:307,badge:'20元红包放送',priceY:500})}
function renderBlueTop(){renderBluePromo('人气','TOP',{headlineSize:72,headlineY1:225,headlineY2:307,badge:'20元红包放送',priceY:500})}
function renderBlueReturn(){renderBluePromo('爆款','回归',{headlineSize:72,headlineY1:225,headlineY2:307,badge:'20元红包放送',priceY:500})}
function renderCafe(){const v=vals();if(cafeBg.complete&&cafeBg.naturalWidth)ctx.drawImage(cafeBg,0,0,1280,720);else{ctx.fillStyle='#0d4a37';ctx.fillRect(0,0,1280,720)}const brand=(v.brandName||'星巴克').trim();ctx.save();const shade=ctx.createLinearGradient(0,0,720,0);shade.addColorStop(0,'rgba(1,30,21,.2)');shade.addColorStop(.65,'rgba(1,30,21,.08)');shade.addColorStop(1,'rgba(1,30,21,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,720,720);ctx.restore();drawLogo(52,36,205);text(`— ${brand}闪购专属价 —`,132,220,32,'650','#fff6dd');text('淘宝闪购',130,320,78,'900','#fff6dd');ctx.save();ctx.fillStyle='#f05212';ctx.beginPath();ctx.moveTo(106,388);ctx.lineTo(565,388);ctx.lineTo(602,438);ctx.lineTo(565,488);ctx.lineTo(106,488);ctx.lineTo(136,438);ctx.closePath();ctx.fill();ctx.restore();text('点外卖更优惠',354,438,48,'900','#fff','center');drawSubject(845+getPlacement().x,665+getPlacement().y,400,520,'上传透明PNG饮料主体')}
function renderLandscapeClean(){const v=vals(),brand=(v.brandName||'品牌').trim();ctx.fillStyle='#fff';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#ff5a1f';ctx.fillRect(0,0,505,720);ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(65,650,270,0,Math.PI*2);ctx.fill();ctx.restore();drawLogo(545,38,195);text(brand,58,172,28,'700','#ffe4d6');text('闪购好价',56,245,62,'900','#fff');text(v.productName||'产品名称',58,318,32,'700','#fff');fillRound(56,380,325,86,20,'#fff');text('到手价',82,423,24,'700','#ef4b20');text('¥'+money(v.finalPrice)+'起',355,423,45,'900','#d92726','right');text('原价 ¥'+money(v.productPrice),60,511,22,'500','#ffd9c9');text('立即下单  优惠直达',60,558,24,'750','#fff');ctx.fillStyle='#fff3ec';ctx.beginPath();ctx.arc(968,360,310,0,Math.PI*2);ctx.fill();drawSubject(945+getPlacement().x,685+getPlacement().y,520,620,'上传商品主体')}
function renderLandscapeDark(){const v=vals(),brand=(v.brandName||'品牌').trim(),g=ctx.createLinearGradient(0,0,1280,720);g.addColorStop(0,'#071425');g.addColorStop(.55,'#102a3b');g.addColorStop(1,'#061018');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);const glow=ctx.createRadialGradient(905,330,40,905,330,430);glow.addColorStop(0,'rgba(255,180,78,.34)');glow.addColorStop(1,'rgba(255,180,78,0)');ctx.fillStyle=glow;ctx.fillRect(460,0,820,720);drawLogo(52,44,205);text(brand+' · 新品上架',55,192,27,'700','#e7c788');text(v.productName||'产品名称',52,266,54,'900','#fff');text('闪购专属  限时尝鲜',55,334,25,'650','#b9cbd2');ctx.fillStyle='#e7b964';ctx.fillRect(55,382,350,2);text('到手价',56,445,23,'650','#e7c788');text('¥'+money(v.finalPrice)+'起',55,510,54,'900','#fff');fillRound(54,580,245,58,29,'#ff5a1f');text('淘宝闪购 立即购买',177,609,22,'800','#fff','center');drawSubject(900+getPlacement().x,688+getPlacement().y,510,630,'上传商品主体')}
let thumbRefreshTimer=0,thumbRefreshBusy=false;
function scheduleTemplateThumbs(){if(thumbRefreshBusy)return;clearTimeout(thumbRefreshTimer);thumbRefreshTimer=setTimeout(refreshTemplateThumbs,140)}
function refreshTemplateThumbs(){const imgs=[...document.querySelectorAll('.template-thumb[data-template]')];if(!imgs.length)return;thumbRefreshBusy=true;const current=state.template;for(const img of imgs){const key=img.dataset.template;if(!templateDefs[key])continue;state.template=key;render(true);img.src=canvas.toDataURL('image/jpeg',.62)}state.template=current;render(true);thumbRefreshBusy=false}
function render(skipThumbs=false){const def=templateDefs[state.template]||templateDefs.square,w=def.w,h=def.h;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.aspectRatio=`${w}/${h}`}ctx.clearRect(0,0,w,h);({square:renderSquare,orderDetail:renderOrderDetail,socialCoupon:renderSocialCoupon,socialMinimal:renderSocialMinimal,socialDeal:renderSocialDeal,socialDuo:renderSocialDuo,socialScene:renderSocialScene,squareBestseller:renderSquareBestseller,blueIce:renderBlueIce,blueTop:renderBlueTop,blueReturn:renderBlueReturn,cafe:renderCafe,landscapeClean:renderLandscapeClean,landscapeDark:renderLandscapeDark}[state.template]||renderSquare)();drawWarning();if(!skipThumbs)scheduleTemplateThumbs()}
function invalidateBundle(){if(state.bundleUrl)URL.revokeObjectURL(state.bundleUrl);state.bundleUrl='';state.bundleName='';const b=$('#downloadAllBtn');if(b)b.textContent='生成已选模板'}
fields.forEach(id=>$('#'+id).addEventListener('input',()=>{invalidateBundle();render()}));$('#whiteBg').addEventListener('change',()=>{invalidateBundle();render()});
function updateWarningLabels(){$('#warningOffsetXValue').value=$('#warningOffsetX').value;$('#warningOffsetYValue').value=$('#warningOffsetY').value}
['warningOffsetX','warningOffsetY'].forEach(id=>$('#'+id).addEventListener('input',()=>{invalidateBundle();updateWarningLabels();render()}));
$('#resetWarningPlacement').addEventListener('click',()=>{$('#warningOffsetX').value=0;$('#warningOffsetY').value=0;invalidateBundle();updateWarningLabels();render();toast('警示语已恢复底部居中')});updateWarningLabels();
const placementFields=['productScale','productOffsetX','productOffsetY','productRotation','productOpacity'];
function updatePlacementLabels(){$('#productScaleValue').value=$('#productScale').value+'%';$('#productOffsetXValue').value=$('#productOffsetX').value;$('#productOffsetYValue').value=$('#productOffsetY').value;$('#productRotationValue').value=$('#productRotation').value+'°';$('#productOpacityValue').value=$('#productOpacity').value+'%'}
function savePlacementControls(){const p=getPlacement();p.scale=Number($('#productScale').value);p.x=Number($('#productOffsetX').value);p.y=Number($('#productOffsetY').value);p.rotation=Number($('#productRotation').value);p.opacity=Number($('#productOpacity').value);p.shadow=$('#productShadow').checked;p.flip=$('#productFlip').checked}
function loadPlacementControls(){const p=getPlacement();$('#productScale').value=p.scale;$('#productOffsetX').value=p.x;$('#productOffsetY').value=p.y;$('#productRotation').value=p.rotation;$('#productOpacity').value=p.opacity;$('#productShadow').checked=p.shadow;$('#productFlip').checked=p.flip;updatePlacementLabels()}
placementFields.forEach(id=>$('#'+id).addEventListener('input',()=>{savePlacementControls();invalidateBundle();updatePlacementLabels();render()}));
['productShadow','productFlip'].forEach(id=>$('#'+id).addEventListener('change',()=>{savePlacementControls();invalidateBundle();render()}));
$('#resetPlacement').addEventListener('click',()=>{state.placements[state.template]={...placementDefault};loadPlacementControls();invalidateBundle();render();toast('当前模板主体已恢复默认位置')});loadPlacementControls();
function syncTemplate(){const next=$('#templateSelect').value;if(state.template!==next)savePlacementControls();state.template=next;loadPlacementControls();const def=templateDefs[state.template]||templateDefs.square,receipt=state.template==='square'||state.template==='orderDetail';document.querySelectorAll('.receipt-only').forEach(el=>el.hidden=!receipt);$('#templateHint').textContent=def.hint;$('#sizeChip').textContent=`${def.w} × ${def.h}`;$('#exportMeta').textContent=`${def.w}×${def.h} · 当前模板`;$('#exportHint').textContent=def.exportHint;render()}
$('#templateSelect').addEventListener('change',syncTemplate);
const templatePickEls=[...document.querySelectorAll('input[name="templatePick"]')],selectAllTemplates=$('#selectAllTemplates');
const selectedTemplateKeys=()=>templatePickEls.filter(el=>el.checked).map(el=>el.value);
function syncTemplateChecks(){const count=selectedTemplateKeys().length;selectAllTemplates.checked=count===templatePickEls.length;selectAllTemplates.indeterminate=count>0&&count<templatePickEls.length;$('#downloadAllBtn').textContent=count?`生成已选模板（${count}张）`:'请先选择模板'}
templatePickEls.forEach(el=>el.addEventListener('change',()=>{invalidateBundle();if(el.checked){$('#templateSelect').value=el.value;syncTemplate()}syncTemplateChecks()}));
selectAllTemplates.addEventListener('change',()=>{invalidateBundle();templatePickEls.forEach(el=>el.checked=selectAllTemplates.checked);syncTemplateChecks()});syncTemplateChecks();
function hasRealTransparency(img){const sample=document.createElement('canvas'),max=320,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));sample.width=Math.max(1,Math.round(img.naturalWidth*scale));sample.height=Math.max(1,Math.round(img.naturalHeight*scale));const c=sample.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,sample.width,sample.height);const d=c.getImageData(0,0,sample.width,sample.height).data;for(let i=3;i<d.length;i+=4)if(d[i]<250)return true;return false}
const doubaoChromaPrompt='只处理我上传图片中的商品主体，严格保持商品外形、比例、视角、材质、颜色、光影、品牌Logo和所有文字完全不变，不得重绘、改字或更换Logo。生成高清电商棚拍商品图，商品完整居中并悬空展示，四周保留适量空间。背景必须是单一、均匀、纯净的品红色 #FF00FF（RGB 255,0,255），从四角到商品边缘颜色完全一致。商品下方和四周严禁出现接触阴影、投影、地面、渐变、纹理、噪点、光晕、反射、道具、棋盘格、白边、边框、新增文字或视觉水印；画面中除商品本体以外的每一个像素都必须为 #FF00FF。商品自身可以保留原有真实高光与透明材质。输出 1:1 高清 PNG。';
$('#copyChromaPrompt').addEventListener('click',async()=>{let ok=true;try{await navigator.clipboard.writeText(doubaoChromaPrompt)}catch{try{const t=document.createElement('textarea');t.value=doubaoChromaPrompt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();ok=document.execCommand('copy');t.remove()}catch{ok=false}}if(!ok)window.prompt('请复制以下豆包纯色底话术：',doubaoChromaPrompt);toast(ok?'豆包纯品红底话术已复制':'请复制显示的话术')});
$('#subjectInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image(),status=$('#subjectStatus');img.onload=()=>{if(!hasRealTransparency(img)){URL.revokeObjectURL(url);status.classList.add('warn');status.textContent='这张图片没有透明通道；看到的棋盘格是图片内容，请上传真正透明的PNG/WebP';toast('检测到假透明图片：棋盘格已被画进图片');return}if(state.subjectUrl)URL.revokeObjectURL(state.subjectUrl);invalidateBundle();status.classList.remove('warn');state.subjectUrl=url;state.cutout=img;state.thumb=img;state.directSubject=true;state.lastCutoutEngine='original';status.textContent=`已载入 ${file.name} · 已确认真实透明通道，原图直出`;render();toast('透明主体已作为原图图层载入')};img.onerror=()=>{URL.revokeObjectURL(url);toast('主体图片读取失败')};img.src=url;e.target.value=''});
function removeSolidChroma(img){const out=document.createElement('canvas');out.width=img.naturalWidth;out.height=img.naturalHeight;const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);const im=c.getImageData(0,0,out.width,out.height),d=im.data,w=out.width,h=out.height,step=Math.max(1,Math.round(Math.min(w,h)/180)),samples=[];for(let x=0;x<w;x+=step){for(const y of [0,Math.min(3,h-1),Math.max(0,h-4),h-1]){const i=(y*w+x)*4;samples.push([d[i],d[i+1],d[i+2]])}}for(let y=0;y<h;y+=step){for(const x of [0,Math.min(3,w-1),Math.max(0,w-4),w-1]){const i=(y*w+x)*4;samples.push([d[i],d[i+1],d[i+2]])}}const median=k=>{const a=samples.map(v=>v[k]).sort((a,b)=>a-b);return a[a.length>>1]},bg=[median(0),median(1),median(2)],chroma=Math.max(...bg)-Math.min(...bg),distRGB=(r,g,b)=>Math.hypot(r-bg[0],g-bg[1],b-bg[2]),spread=samples.map(v=>distRGB(...v)).sort((a,b)=>a-b),p90=spread[Math.floor(spread.length*.9)];if(chroma<90||p90>55)throw new Error('背景不是均匀的高饱和纯色');const tol=Math.max(42,Math.min(90,p90+36)),seen=new Uint8Array(w*h),q=[];const key=p=>{const i=p*4;return distRGB(d[i],d[i+1],d[i+2])<=tol},seed=p=>{if(!seen[p]&&key(p)){seen[p]=1;q.push(p)}};for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}for(let y=1;y<h-1;y++){seed(y*w);seed(y*w+w-1)}for(let n=0;n<q.length;n++){const p=q[n],x=p%w,y=(p/w)|0;d[p*4+3]=0;if(x)seed(p-1);if(x<w-1)seed(p+1);if(y)seed(p-w);if(y<h-1)seed(p+w)}for(let p=0;p<w*h;p++){if(seen[p])continue;const i=p*4,dd=distRGB(d[i],d[i+1],d[i+2]),x=p%w,y=(p/w)|0,edge=(x&&seen[p-1])||(x<w-1&&seen[p+1])||(y&&seen[p-w])||(y<h-1&&seen[p+w]);if(edge&&dd<tol+110)d[i+3]=Math.round(255*Math.max(0,Math.min(1,(dd-tol)/110)))}c.putImageData(im,0,0);return cleanChromaExtensions(defringeChroma(out,bg,tol))}
$('#chromaInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image(),status=$('#subjectStatus');img.onload=()=>{try{const cutout=removeSolidChroma(img);if(state.subjectUrl)URL.revokeObjectURL(state.subjectUrl);invalidateBundle();state.subjectUrl='';state.cutout=cutout;state.thumb=cutout;state.directSubject=true;state.lastCutoutEngine='chroma';status.classList.remove('warn');status.textContent=`已处理 ${file.name} · 豆包纯色背景已转为真实透明图层`;render();toast('豆包纯色底已自动去除')}catch(err){status.classList.add('warn');status.textContent='未检测到均匀高饱和纯色背景，请按话术重新生成 #FF00FF 品红底图片';toast('纯色底不合格，未进行去除')}finally{URL.revokeObjectURL(url)}};img.onerror=()=>{URL.revokeObjectURL(url);toast('豆包图片读取失败')};img.src=url;e.target.value=''});
canvas.addEventListener('pointerdown',e=>{if(!state.cutout)return;canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');state.canvasDrag={x:e.clientX,y:e.clientY,ox:getPlacement().x,oy:getPlacement().y}});canvas.addEventListener('pointermove',e=>{if(!state.canvasDrag)return;const rect=canvas.getBoundingClientRect(),sx=canvas.width/rect.width,sy=canvas.height/rect.height,x=$('#productOffsetX'),y=$('#productOffsetY');x.value=Math.max(Number(x.min),Math.min(Number(x.max),state.canvasDrag.ox+(e.clientX-state.canvasDrag.x)*sx));y.value=Math.max(Number(y.min),Math.min(Number(y.max),state.canvasDrag.oy+(e.clientY-state.canvasDrag.y)*sy));savePlacementControls();updatePlacementLabels();render()});const endCanvasDrag=()=>{state.canvasDrag=null;canvas.classList.remove('dragging')};canvas.addEventListener('pointerup',endCanvasDrag);canvas.addEventListener('pointercancel',endCanvasDrag);
syncTemplate();
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
function processCrop(){if(!state.source)return;const tmp=cropByNorm(state.crop);state.rawCrop=tmp;const enhanced=enhanceCanvas(tmp);state.thumb=enhanced;state.cutout=null;state.directSubject=false;$('#subjectStatus').textContent='当前使用截图解析模式；上传透明PNG可随时替换';const short=Math.min(tmp.width,tmp.height);$('#parseStatus').textContent=short<180?`选区仅 ${tmp.width}×${tmp.height}，精细模式可2倍增强；高清主图效果更好`:'选区已更新，请点击智能解析生成透明主体'}
function prepareCutoutCanvas(src){const max=Math.max(src.width,src.height),scale=Math.max(1,Math.min(3,1200/max)),o=document.createElement('canvas');o.width=Math.round(src.width*scale);o.height=Math.round(src.height*scale);const c=o.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(src,0,0,o.width,o.height);return o}
function enhanceCanvas(src){const base=prepareCutoutCanvas(src),o=document.createElement('canvas');o.width=base.width;o.height=base.height;const c=o.getContext('2d',{willReadFrequently:true});c.filter='contrast(1.025) saturate(1.025)';c.drawImage(base,0,0);c.filter='none';return sharpenCanvas(o,.06)}
async function aiEnhanceCurrent(){
  if(!state.rawCrop)return false;
  state.cutoutBusy=true;state.cutout=null;render();
  try{
    const mode=$('#qualityMode').value;let source=state.thumb||enhanceCanvas(state.rawCrop);
    if(mode==='detail'){
      $('#parseStatus').textContent='正在整图超分增强（无分块接缝）…';
      try{source=await superResolveWholeCanvas(state.rawCrop)}catch(e){console.warn('Whole-image super resolution fallback',e);source=state.rawCrop}
      $('#parseStatus').textContent='正在精细清除圆底并塑造立体光影…';state.cutout=stylizeCutout(await u2netProductCutout(source),'detail');state.lastCutoutEngine='detail';
    }
    else if(mode==='u2net'){$('#parseStatus').textContent='正在加载 U²-NetP 免费稳定模型…';state.cutout=stylizeCutout(await u2netProductCutout(source),'stable');state.lastCutoutEngine='u2net'}
    else{
      $('#parseStatus').textContent=mode==='detail'?'高精度商品分割中…':(state.modelReady?'轻量模型抠图中…':'正在加载轻量模型…');
      try{state.cutout=stylizeCutout(await aiProductCutout(source,mode),mode);state.lastCutoutEngine=mode}catch(primaryError){console.warn('Primary cutout failed, switching to U2NetP',primaryError);$('#parseStatus').textContent='主模型不可用，自动切换 U²-NetP…';state.cutout=stylizeCutout(await u2netProductCutout(source),mode==='detail'?'detail':'stable');state.lastCutoutEngine='u2net'}
    }
    state.cutoutBusy=false;render();return true;
  }catch(e){console.warn('AI product cutout fallback',e);state.cutoutBusy=false;state.cutout=null;render();$('#parseStatus').textContent='两个本地模型均未完成，请检查网络后重试';return false}
}
function sharpenCanvas(src,amount){const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),s=im.data,out=new Uint8ClampedArray(s),w=src.width,h=src.height;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let k=0;k<3;k++){const sharp=5*s[i+k]-s[i-4+k]-s[i+4+k]-s[i-w*4+k]-s[i+w*4+k];out[i+k]=Math.max(0,Math.min(255,s[i+k]*(1-amount)+sharp*amount))}}im.data.set(out);c.putImageData(im,0,0);return src}
function loadScript(src,id){
  if(loadedScripts.has(id))return loadedScripts.get(id);
  const promise=new Promise((resolve,reject)=>{const existing=document.getElementById(id);if(existing){if(existing.dataset.ready==='1')resolve();else{existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true})}return}const script=document.createElement('script');script.id=id;script.src=src;script.crossOrigin='anonymous';script.onload=()=>{script.dataset.ready='1';resolve()};script.onerror=()=>reject(new Error('组件加载失败: '+id));document.head.appendChild(script)});loadedScripts.set(id,promise);return promise;
}
async function superResolveWholeCanvas(src){
  // Whole-image inference is deliberately limited to small thumbnails. It avoids the tile seams that
  // caused square patches in the old detail mode, while larger originals keep their native pixels.
  if(Math.max(src.width,src.height)>520)return src;
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4/dist/tf.min.js','tfjs-runtime');
  await Promise.all([loadScript('https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/dist/umd/index.min.js','upscaler-model'),loadScript('https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js','upscaler-runtime')]);
  state.detailUpscaler ||= new Upscaler({model:DefaultUpscalerJSModel});
  const data=await state.detailUpscaler.upscale(src),img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=data});
  const out=document.createElement('canvas');out.width=img.naturalWidth;out.height=img.naturalHeight;out.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);return out;
}
function trimOuterWhitespace(src){
  const c=src.getContext('2d',{willReadFrequently:true}),d=c.getImageData(0,0,src.width,src.height).data,w=src.width,h=src.height;
  let x0=w,y0=h,x1=-1,y1=-1,count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b);if(lo<210||hi-lo>38){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++}}
  if(x1<0||count<w*h*.008)return src;
  const pad=Math.max(5,Math.round(Math.min(w,h)*.035));x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;const oc=out.getContext('2d');oc.fillStyle='#fff';oc.fillRect(0,0,out.width,out.height);oc.drawImage(src,x0,y0,out.width,out.height,0,0,out.width,out.height);return out;
}
function upscaleForPoster(src){
  const longest=Math.max(src.width,src.height),scale=Math.max(1,Math.min(2.25,900/longest));if(scale<=1.03)return src;
  const out=document.createElement('canvas');out.width=Math.round(src.width*scale);out.height=Math.round(src.height*scale);const c=out.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(src,0,0,out.width,out.height);return out;
}
function unsharpCanvas(src,amount=.45,radius=1.15){
  const blur=document.createElement('canvas');blur.width=src.width;blur.height=src.height;const bc=blur.getContext('2d',{willReadFrequently:true});bc.filter=`blur(${radius}px)`;bc.drawImage(src,0,0);bc.filter='none';
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),bd=bc.getImageData(0,0,src.width,src.height).data,d=im.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<12)continue;for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,d[i+k]+amount*(d[i+k]-bd[i+k])))}c.putImageData(im,0,0);return src;
}
function addDepthLighting(src){
  const out=document.createElement('canvas');out.width=src.width;out.height=src.height;const c=out.getContext('2d');c.drawImage(src,0,0);
  const layer=document.createElement('canvas');layer.width=src.width;layer.height=src.height;const l=layer.getContext('2d');
  let g=l.createLinearGradient(0,0,src.width,0);g.addColorStop(0,'rgba(255,255,255,.02)');g.addColorStop(.18,'rgba(255,255,255,.22)');g.addColorStop(.48,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,0)');l.fillStyle=g;l.fillRect(0,0,src.width,src.height);l.globalCompositeOperation='destination-in';l.drawImage(src,0,0);c.save();c.globalCompositeOperation='screen';c.drawImage(layer,0,0);c.restore();
  l.clearRect(0,0,src.width,src.height);l.globalCompositeOperation='source-over';g=l.createLinearGradient(0,0,src.width,src.height*.35);g.addColorStop(0,'rgba(30,12,8,0)');g.addColorStop(.62,'rgba(30,12,8,.02)');g.addColorStop(1,'rgba(30,12,8,.18)');l.fillStyle=g;l.fillRect(0,0,src.width,src.height);l.globalCompositeOperation='destination-in';l.drawImage(src,0,0);c.save();c.globalCompositeOperation='multiply';c.drawImage(layer,0,0);c.restore();return out;
}
function stylizeCutout(src,mode='stable'){
  const base=upscaleForPoster(src),out=document.createElement('canvas');out.width=base.width;out.height=base.height;const c=out.getContext('2d',{willReadFrequently:true});c.filter=mode==='detail'?'contrast(1.07) saturate(1.08)':'contrast(1.025) saturate(1.035)';c.drawImage(base,0,0);c.filter='none';
  return addDepthLighting(unsharpCanvas(out,mode==='detail'?.72:.34,mode==='detail'?.95:1.25));
}
function canvasToBlob(src){return new Promise((resolve,reject)=>src.toBlob(blob=>blob?resolve(blob):reject(new Error('图片转换失败')),'image/png',1))}
async function blobToCanvas(blob){const url=URL.createObjectURL(blob),img=new Image();try{await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});const out=document.createElement('canvas');out.width=img.naturalWidth;out.height=img.naturalHeight;out.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);return out}finally{URL.revokeObjectURL(url)}}
function removeFloatingTags(src){
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),d=im.data,w=src.width,h=src.height,tag=new Uint8Array(w*h),seen=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){const k=i*4,r=d[k],g=d[k+1],b=d[k+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(d[k+3]>25&&hi>115&&hi-lo>68&&(b>r*1.16||r>g*1.28&&r>b*1.12||r>175&&g>75&&g<165&&b<90))tag[i]=1}
  for(let start=0;start<tag.length;start++){
    if(!tag[start]||seen[start])continue;const q=[start];seen[start]=1;let x0=w,y0=h,x1=0,y1=0,n=0;
    for(let p=0;p<q.length;p++){const i=q[p],x=i%w,y=(i/w)|0;n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&tag[ni]&&!seen[ni]){seen[ni]=1;q.push(ni)}}
    const bw=x1-x0+1,bh=y1-y0+1,fill=n/(bw*bh),upper=y0<h*.62,outsideProductCenter=x1<w*.43||x0>w*.57,tagShape=outsideProductCenter&&bw>w*.045&&bh>h*.025&&bw<w*.62&&bh<h*.28&&(bw/bh>1.05||fill>.48);
    if(upper&&tagShape){const pad=Math.max(3,Math.round(Math.min(w,h)*.008));for(let y=Math.max(0,y0-pad);y<=Math.min(h-1,y1+pad);y++)for(let x=Math.max(0,x0-pad);x<=Math.min(w-1,x1+pad);x++)d[(y*w+x)*4+3]=0}
  }
  c.putImageData(im,0,0);return trimCanvas(src);
}
async function aiProductCutout(src,mode='fast'){
  bgRemovalModulePromise ||= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
  const {removeBackground}=await bgRemovalModulePromise,input=await canvasToBlob(src),config=backgroundConfig(true,mode);
  let result;try{result=await removeBackground(input,config)}catch(e){if(config.device!=='gpu')throw e;result=await removeBackground(input,{...config,device:'cpu'})}
  state.modelReady=true;
  $('#parseStatus').textContent='正在清理圆形底图、商品标签和离散装饰…';return keepPrimaryProduct(removeEdgeWhite(removeFloatingTags(await blobToCanvas(result))));
}
async function u2netProductCutout(src){
  if(!window.RembgWeb||!window.ort)throw new Error('U²-NetP 运行组件未加载');
  const {rembgConfig,newSession,remove}=window.RembgWeb,modelUrl=new URL('./models/u2netp.onnx',location.href).href;
  rembgConfig.setCustomModelPath('u2netp',modelUrl);
  u2netSession ||= await newSession('u2netp',undefined,{preferWebNN:false,preferWebGPU:false,onProgress:info=>{$('#parseStatus').textContent=`U²-NetP 模型 ${Math.round(info.progress||0)}%`}});
  const result=await remove(await canvasToBlob(src),{session:u2netSession,postProcessMask:true,onProgress:info=>{$('#parseStatus').textContent=`U²-NetP ${info.message||'处理中'} ${Math.round(info.progress||0)}%`}});
  // U²-Net already supplies an object mask. Avoid colour-box deletion here because a coloured logo
  // can legitimately sit near the product edge and must never be erased as a rectangular "tag".
  return keepPrimaryProduct(removeEdgeWhite(await blobToCanvas(result)));
}
function backgroundConfig(showProgress=false,mode='fast'){const detail=mode==='detail';return{model:detail?'medium':'small',device:navigator.gpu?'gpu':'cpu',output:{format:'image/png',quality:1},progress:showProgress?(key,current,total)=>{if(total>0&&key.startsWith('fetch'))$('#parseStatus').textContent=`${detail?'精细':'轻量'}模型 ${Math.round(current/total*100)}%`;else if(key.startsWith('compute'))$('#parseStatus').textContent=detail?'精细分离商品与圆形底图…':'极速分离商品与背景…'}:undefined}}
async function warmupCutoutModel(){try{bgRemovalModulePromise ||= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');const {preload}=await bgRemovalModulePromise;await preload(backgroundConfig(false,'fast'));state.modelReady=true;$('#globalStatus').innerHTML='<i></i> 极速AI已就绪 · 图片不上传'}catch(e){console.warn('AI preload skipped',e)}}
function removeEdgeWhite(src){
  const out=document.createElement('canvas');out.width=src.width;out.height=src.height;
  const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0);
  const im=c.getImageData(0,0,out.width,out.height),d=im.data,w=out.width,h=out.height;
  const seen=new Uint8Array(w*h),protectedPixels=new Uint8Array(w*h),q=new Int32Array(w*h);
  const isBg=i=>{const k=i*4,r=d[k],g=d[k+1],b=d[k+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b),warmNeutral=lo>165&&r>=g-5&&r-g<20&&g>=b-5&&g-b<30,nearWhite=lo>225&&hi-lo<24;return d[k+3]<24||warmNeutral||nearWhite};
  // Grow a silhouette from high-confidence product colours, then close each row between the grown
  // edges. This follows the cup/ice shape closely enough to reject a wider circular card background,
  // while the growth radius preserves pale milk, clear ice and white logos around the coloured core.
  const core=new Uint8Array(w*h),nearCore=new Uint8Array(w*h),distance=new Uint16Array(w*h),growQ=new Int32Array(w*h);let growHead=0,growTail=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4,r=d[k],g=d[k+1],b=d[k+2],lo=Math.min(r,g,b),hi=Math.max(r,g,b);if(d[k+3]>28&&(lo<122||hi-lo>72)){core[i]=1;nearCore[i]=1;growQ[growTail++]=i}}
  const growRadius=Math.max(7,Math.round(Math.min(w,h)*.055));
  while(growHead<growTail){const i=growQ[growHead++],di=distance[i];if(di>=growRadius)continue;const x=i%w,y=(i/w)|0;for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&!nearCore[ni]){nearCore[ni]=1;distance[ni]=di+1;growQ[growTail++]=ni}}
  for(let y=0;y<h;y++){let x0=w,x1=-1;for(let x=0;x<w;x++)if(nearCore[y*w+x]){x0=Math.min(x0,x);x1=x}if(x1>=0)for(let x=x0;x<=x1;x++)protectedPixels[y*w+x]=1}
  let a=0,z=0;const push=i=>{if(!seen[i]&&!protectedPixels[i]&&isBg(i)){seen[i]=1;q[z++]=i}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(a<z){const i=q[a++],x=i%w,y=(i/w)|0;if(x)push(i-1);if(x<w-1)push(i+1);if(y)push(i-w);if(y<h-1)push(i+w)}
  for(let i=0;i<seen.length;i++)if(seen[i])d[i*4+3]=0;
  c.putImageData(im,0,0);return trimCanvas(out);
}
function keepPrimaryProduct(src){
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),d=im.data,w=src.width,h=src.height;
  // Split objects on a one-pixel-eroded high-confidence mask. A faint mask bridge can otherwise
  // glue nearby coffee beans, labels or shadows to the product and make them survive component filtering.
  const solid=new Uint8Array(w*h),core=new Uint8Array(w*h),solidAlpha=160;
  for(let i=0;i<w*h;i++)if(d[i*4+3]>solidAlpha)solid[i]=1;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(solid[i]&&solid[i-1]&&solid[i+1]&&solid[i-w]&&solid[i+w])core[i]=1}
  const seen=new Uint8Array(w*h),components=[];
  for(let start=0;start<w*h;start++){
    if(seen[start]||!core[start])continue;
    const q=[start];seen[start]=1;let n=0,x0=w,y0=h,x1=0,y1=0;
    for(let p=0;p<q.length;p++){
      const i=q[p],x=i%w,y=(i/w)|0;n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&!seen[ni]&&core[ni]){seen[ni]=1;q.push(ni)}
    }
    components.push({pixels:q,n,x0,y0,x1,y1});
  }
  if(!components.length)return src;
  let mainIndex=0;for(let i=1;i<components.length;i++)if(components[i].n>components[mainIndex].n)mainIndex=i;
  const owner=new Int32Array(w*h);owner.fill(-1);const distance=new Uint8Array(w*h),q=[];
  for(let id=0;id<components.length;id++)for(const i of components[id].pixels){owner[i]=id;q.push(i)}
  // Let every solid object reclaim only its own antialiased edge. Competing seeds prevent a nearby
  // bean or label from being absorbed by the largest product even when their soft masks touch.
  const feather=Math.max(3,Math.round(Math.min(w,h)*.016));
  for(let p=0;p<q.length;p++){
    const i=q[p],di=distance[i];if(di>=feather)continue;const x=i%w,y=(i/w)|0;
    for(const ni of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(ni>=0&&owner[ni]<0&&d[ni*4+3]>20){owner[ni]=owner[i];distance[ni]=di+1;q.push(ni)}
  }
  for(let i=0;i<w*h;i++)if(owner[i]!==mainIndex)d[i*4+3]=0;
  c.putImageData(im,0,0);return trimCanvas(src);
}
function defringeChroma(src,bg,tol){
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),d=im.data,w=src.width,h=src.height,n=w*h,dist=(r,g,b)=>Math.hypot(r-bg[0],g-bg[1],b-bg[2]);
  // Remove two background-coloured edge rings left by generated pure-colour backdrops. Only pixels
  // touching transparency are considered, so similarly coloured areas inside the product stay intact.
  for(let pass=0;pass<2;pass++){
    const alpha=new Uint8Array(n);for(let i=0;i<n;i++)alpha[i]=d[i*4+3];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const p=y*w+x,i=p*4,a=alpha[p];if(!a)continue;
      const edge=alpha[p-1]<12||alpha[p+1]<12||alpha[p-w]<12||alpha[p+w]<12||alpha[p-w-1]<12||alpha[p-w+1]<12||alpha[p+w-1]<12||alpha[p+w+1]<12;
      if(!edge)continue;const dd=dist(d[i],d[i+1],d[i+2]);
      if(dd<tol+205)d[i+3]=0;else if(pass===0&&a<245)d[i+3]=Math.round(a*.45);
    }
  }
  c.putImageData(im,0,0);return src;
}
function cleanChromaExtensions(src){
  const c=src.getContext('2d',{willReadFrequently:true}),im=c.getImageData(0,0,src.width,src.height),d=im.data,w=src.width,h=src.height;
  // Estimate the product's normal width from the middle/lower body. A Doubao contact shadow often
  // appears only near the bottom and suddenly stretches beyond that envelope, so it can be removed
  // without testing colour (important for genuinely pink products).
  let bx0=w,by0=h,bx1=0,by1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>30){bx0=Math.min(bx0,x);by0=Math.min(by0,y);bx1=Math.max(bx1,x);by1=Math.max(by1,y)}
  if(bx1<=bx0||by1<=by0)return trimCanvas(src);
  const bh=by1-by0+1,lefts=[],rights=[],rows=[];
  for(let y=Math.round(by0+bh*.45);y<=Math.round(by0+bh*.74);y++){
    let left=w,right=-1;for(let x=bx0;x<=bx1;x++)if(d[(y*w+x)*4+3]>80){left=Math.min(left,x);right=x}
    if(right>left){rows.push(y);lefts.push(left);rights.push(right)}
  }
  if(lefts.length){
    const fit=values=>{let sy=0,sv=0,syy=0,syv=0;for(let i=0;i<rows.length;i++){sy+=rows[i];sv+=values[i];syy+=rows[i]*rows[i];syv+=rows[i]*values[i]}const den=rows.length*syy-sy*sy,slope=den?(rows.length*syv-sy*sv)/den:0;return{slope,offset:(sv-slope*sy)/rows.length}},lf=fit(lefts),rf=fit(rights),centres=lefts.map((v,i)=>(v+rights[i])/2).sort((a,b)=>a-b),ratios=lefts.map((v,i)=>(rights[i]-centres[centres.length>>1])/Math.max(1,centres[centres.length>>1]-v)).filter(v=>v>.65&&v<1.45).sort((a,b)=>a-b),centre=centres[centres.length>>1],ratio=ratios.length?ratios[ratios.length>>1]:1,margin=2,cutY=Math.round(by0+bh*.74);
    for(let y=cutY;y<=by1;y++){let rowLeft=w,rowRight=-1;for(let x=bx0;x<=bx1;x++)if(d[(y*w+x)*4+3]>30){rowLeft=Math.min(rowLeft,x);rowRight=x}let left=lf.offset+lf.slope*y-margin,right=rf.offset+rf.slope*y+margin;if(rowRight>rowLeft){const ld=centre-rowLeft,rd=rowRight-centre;if(rd>ld*ratio+margin)right=Math.min(right,centre+ld*ratio+margin);if(ld>rd/ratio+margin)left=Math.max(left,centre-rd/ratio-margin)}for(let x=bx0;x<=bx1;x++)if(x<left||x>right)d[(y*w+x)*4+3]=0}
  }
  c.putImageData(im,0,0);return trimCanvas(src);
}
function trimCanvas(src){const c=src.getContext('2d'),d=c.getImageData(0,0,src.width,src.height).data;let x0=src.width,y0=src.height,x1=0,y1=0;for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(d[(y*src.width+x)*4+3]>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}if(x1<=x0||y1<=y0)return src;const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(src,x0,y0,o.width,o.height,0,0,o.width,o.height);return o}
async function parseScreenshot(silent=false){
  if(!state.source)return toast('请先上传商品截图');const btn=$('#parseBtn'),status=$('#parseStatus'),item=state.batch[state.current];btn.disabled=true;if(item){item.status='处理中';renderBatch()}
  status.textContent='单次OCR快速识别中…';
  try{
    if(!window.Tesseract)throw new Error('OCR组件未加载');const progress=m=>{if(m.status==='recognizing text')status.textContent=`快速识别文字 ${Math.round(m.progress*100)}%`};
    const ocrCanvas=document.createElement('canvas'),scale=Math.min(1,1200/state.source.naturalWidth);ocrCanvas.width=Math.round(state.source.naturalWidth*scale);ocrCanvas.height=Math.round(state.source.naturalHeight*scale);ocrCanvas.getContext('2d').drawImage(state.source,0,0,ocrCanvas.width,ocrCanvas.height);
    const {data:allData}=await Tesseract.recognize(ocrCanvas,'chi_sim+eng',{logger:progress}),clean=t=>t.replace(/\s+/g,'').replace(/[|丨]/g,'').trim(),blocked=/(月售|折起|选规格|纯抹茶|浓度|红包|配送|打包|到手)/;
    const inNameBox=line=>{const b=line.bbox;if(!b)return false;const cx=(b.x0+b.x1)/2/ocrCanvas.width,cy=(b.y0+b.y1)/2/ocrCanvas.height;return cx>=state.nameCrop.x&&cx<=state.nameCrop.x+state.nameCrop.w&&cy>=state.nameCrop.y&&cy<=state.nameCrop.y+state.nameCrop.h};
    const nameCandidates=(allData.lines||[]).filter(inNameBox).map(x=>clean(x.text)).filter(t=>/[\u4e00-\u9fff]/.test(t)&&t.length>=2&&t.length<=18&&!blocked.test(t)),raw=(allData.text||'').replace(/\s+/g,' '),prices=[...raw.matchAll(/[¥￥]\s*(\d+(?:\.\d+)?)/g)].map(m=>m[1]);
    if(nameCandidates[0])$('#productName').value=nameCandidates.sort((a,b)=>b.length-a.length)[0];if(prices.length)$('#productPrice').value=prices.at(-1);
    processCrop();const cutoutOk=await aiEnhanceCurrent();render();if(item){item.productName=$('#productName').value;item.price=$('#productPrice').value;item.status=cutoutOk?'完成':'抠图失败';renderBatch()}
    if(cutoutOk){const mode=state.lastCutoutEngine||$('#qualityMode').value,label=mode==='detail'?'精细模型':mode==='u2net'?'稳定模型':'轻量模型';status.textContent=`完成 · ${label}商品主体已生成`;if(!silent)toast(label+'处理完成')}else{status.textContent='AI抠图失败，请检查网络后点击重试';if(!silent)toast('AI抠图未完成，请重试')}return cutoutOk;
  }catch(e){console.warn(e);state.cutoutBusy=false;if(item){item.status='需手动校正';renderBatch()}status.textContent='自动识别不可用，请调整选区后重试';if(!silent)toast('识别失败，请调整商品或名称选区');return false}finally{btn.disabled=false;render()}
}
$('#parseBtn').addEventListener('click',()=>parseScreenshot(false));
$('#parseAllBtn').addEventListener('click',async()=>{const b=$('#parseAllBtn');if(!state.batch.length)return;state.batchBusy=true;b.disabled=true;b.textContent='批量处理中…';renderBatch();try{for(let i=0;i<state.batch.length;i++){await openBatch(i);await parseScreenshot(true)}}finally{state.batchBusy=false;b.disabled=false;b.textContent='一键解析并优化全部';renderBatch()}toast('批量任务处理完成')});
async function canvasBlob(q){return new Promise(r=>canvas.toBlob(r,'image/jpeg',q))}
async function optimizedCanvasBlob(){let q=.92,blob=await canvasBlob(q);while(blob.size>520*1024&&q>.48){q-=.07;blob=await canvasBlob(q)}return blob}
function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2500)}
const templateFileLabels={square:'结算单',orderDetail:'订单费用明细',socialCoupon:'红包券卡',socialMinimal:'留白单品',socialDeal:'左右好价',socialDuo:'双杯下单',socialScene:'场景种草',squareBestseller:'爆款咖啡',blueIce:'全冰去冰',blueTop:'人气TOP',blueReturn:'爆款回归',cafe:'咖啡场景',landscapeClean:'简洁好价',landscapeDark:'质感上新'},sequenceFallback=new Map();
function exportDate(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`}
function safeFilePart(v,fallback='品牌'){return String(v||fallback).trim().replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'')||fallback}
function sequencePlan(brand,count=1){const date=exportDate(),key=`smart-product-image-seq:${date}:${encodeURIComponent(brand)}`;let current=0;try{current=Number(localStorage.getItem(key))||0}catch{current=sequenceFallback.get(key)||0}const start=current+1,end=current+count;return{date,start,end,commit(){sequenceFallback.set(key,end);try{localStorage.setItem(key,String(end))}catch{}}}}
function imageExportName(key,date,brand,seq){const label=templateFileLabels[key]||(templateDefs[key]?.file||'模板');return `AI模板-${date}-${brand}-${safeFilePart(label,'模板')}-CST-${String(seq).padStart(2,'0')}.jpg`}
async function download(){clearTimeout(thumbRefreshTimer);render(true);const blob=await optimizedCanvasBlob(),def=templateDefs[state.template]||templateDefs.square,brand=safeFilePart($('#brandName').value),plan=sequencePlan(brand);state.exportBytes=blob.size;$('#exportMeta').textContent=`${canvas.width}×${canvas.height} · ${(blob.size/1024).toFixed(0)} KB`;saveBlob(blob,imageExportName(state.template,plan.date,brand,plan.start));plan.commit();toast(`当前模板已下载 · CST-${String(plan.start).padStart(2,'0')}`)}
async function downloadAll(){const btn=$('#downloadAllBtn');if(state.bundleUrl){const a=document.createElement('a');a.href=state.bundleUrl;a.download=state.bundleName;a.click();setTimeout(()=>URL.revokeObjectURL(state.bundleUrl),2500);state.bundleUrl='';state.bundleName='';syncTemplateChecks();toast('已选模板 ZIP 已下载');return}const keys=selectedTemplateKeys();if(!keys.length)return toast('请至少勾选一个模板');if(!state.cutout)return toast('请先上传豆包处理好的商品图');if(!window.JSZip)return toast('批量打包组件尚未加载，请稍后重试');const current=state.template,select=$('#templateSelect'),zip=new JSZip(),brand=safeFilePart($('#brandName').value),plan=sequencePlan(brand,keys.length);clearTimeout(thumbRefreshTimer);btn.disabled=true;try{let index=0;for(const key of keys){state.template=key;render(true);const blob=await optimizedCanvasBlob(),seq=plan.start+index;zip.file(imageExportName(key,plan.date,brand,seq),blob);index++;btn.textContent=`正在生成 ${index}/${keys.length}`}btn.textContent='正在打包…';const bundle=await zip.generateAsync({type:'blob'});plan.commit();state.bundleUrl=URL.createObjectURL(bundle);state.bundleName=`AI模板-${plan.date}-${brand}-CST-${String(plan.start).padStart(2,'0')}-${String(plan.end).padStart(2,'0')}.zip`;btn.textContent=`已生成${keys.length}张，点击下载`;toast(`已生成 CST-${String(plan.start).padStart(2,'0')} 至 ${String(plan.end).padStart(2,'0')}`)}catch(e){console.warn(e);toast('批量生成失败，请重试')}finally{state.template=current;select.value=current;render();btn.disabled=false;if(!state.bundleUrl)syncTemplateChecks()}}
$('#downloadBtn').addEventListener('click',download);$('#downloadAllBtn').addEventListener('click',downloadAll);window.addEventListener('resize',()=>state.source&&updateCropBoxes());render();
function registerWebMCP(){const mc=document.modelContext;if(!mc?.registerTool)return;try{mc.registerTool({name:'configure_product_poster',title:'设置商品图字段',description:'设置品牌、商品名称、商品价格、红包金额和费用，并同步更新可见预览。',inputSchema:{type:'object',properties:{brandName:{type:'string',maxLength:10},productName:{type:'string',maxLength:16},productPrice:{type:'number',minimum:0},redEnvelope:{type:'number',minimum:0},newUserMax:{type:'number',minimum:0},packingFee:{type:'number',minimum:0},deliveryFee:{type:'number',minimum:0},deliveryDiscount:{type:'number',minimum:0},finalPrice:{type:'number',minimum:0}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('参数必须是对象');for(const [k,v] of Object.entries(input)){if(!fields.includes(k))throw new Error('不支持的字段: '+k);if(k==='productName'||k==='brandName'){const max=k==='brandName'?10:16;if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(k==='brandName'?'品牌名称需为1到10个字符':'产品名称需为1到16个字符')}else if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new Error(k+'必须是非负数字');$('#'+k).value=v}render();return{updated:Object.keys(input),values:vals()}}})}catch(e){console.warn('WebMCP registration unavailable',e)}}registerWebMCP();
