import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const W = 1200, H = 1200;
type Color = [number, number, number, number];
const image = new Uint8Array(W * H * 4);
const rgba = (hex: string, alpha = 255): Color => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), alpha];
const mix = (a: Color, b: Color, t: number): Color => a.map((v, i) => Math.round(v + (b[i]! - v) * t)) as Color;
function pixel(x: number, y: number, c: Color) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4, a = c[3] / 255;
  image[i] = Math.round(c[0] * a + image[i]! * (1 - a)); image[i + 1] = Math.round(c[1] * a + image[i + 1]! * (1 - a)); image[i + 2] = Math.round(c[2] * a + image[i + 2]! * (1 - a)); image[i + 3] = 255;
}
function rect(x: number, y: number, w: number, h: number, c: Color) { for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) pixel(xx, yy, c); }
function circle(cx: number, cy: number, r: number, c: Color) { for (let y = Math.floor(cy-r); y <= cy+r; y++) for (let x = Math.floor(cx-r); x <= cx+r; x++) if ((x-cx)**2+(y-cy)**2 <= r*r) pixel(x,y,c); }
function line(x1: number,y1: number,x2: number,y2: number,width: number,c: Color) { const n=Math.ceil(Math.hypot(x2-x1,y2-y1)); for(let i=0;i<=n;i++){const t=n?i/n:0; circle(x1+(x2-x1)*t,y1+(y2-y1)*t,width/2,c);} }
function polygon(points: [number,number][], c: Color) { let minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),maxY=Math.min(H-1,Math.ceil(Math.max(...points.map(p=>p[1])))); for(let y=minY;y<=maxY;y++){const xs:number[]=[]; for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i]!,[xj,yj]=points[j]!; if((yi<=y&&yj>y)||(yj<=y&&yi>y)) xs.push(xi+(y-yi)*(xj-xi)/(yj-yi));} xs.sort((a,b)=>a-b); for(let i=0;i+1<xs.length;i+=2) for(let x=Math.ceil(xs[i]!);x<=xs[i+1]!;x++) pixel(x,y,c); } }
function gradient(top: Color, bottom: Color, stop=1) { for(let y=0;y<H;y++){const c=mix(top,bottom,Math.min(1,y/(H*stop))); for(let x=0;x<W;x++) pixel(x,y,c);} }

const FONT: Record<string,string[]> = {
A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
'.':['00000','00000','00000','00000','00000','00110','00110'],',':['00000','00000','00000','00000','00110','00110','00100'],"'":['00100','00100','00000','00000','00000','00000','00000'],'!':['00100','00100','00100','00100','00100','00000','00100'],'?':['01110','10001','00001','00010','00100','00000','00100'],'$':['00100','01111','10100','01110','00101','11110','00100'],':':['00000','00110','00110','00000','00110','00110','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'(':['00010','00100','01000','01000','01000','00100','00010'],')':['01000','00100','00010','00010','00010','00100','01000'],' ':['00000','00000','00000','00000','00000','00000','00000']
};
function textWidth(s:string,scale:number,spacing=1){return [...s].length*6*scale-spacing*scale;}
function drawText(s:string,x:number,y:number,scale:number,c:Color,spacing=1){let ox=x; for(const ch of s){const rows=FONT[ch]??FONT[' ']; rows!.forEach((row,ry)=>[...row].forEach((bit,rx)=>{if(bit==='1')rect(ox+rx*scale,y+ry*scale,scale,scale,c);}));ox+=6*scale;} }
function centered(s:string,y:number,scale:number,c:Color){drawText(s,(W-textWidth(s,scale))/2,y,scale,c);}
function outlined(s:string,y:number,scale:number){const x=(W-textWidth(s,scale))/2; const black=rgba('#160d24'); for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3]])drawText(s,x+dx,y+dy,scale,black);drawText(s,x,y,scale,rgba('#fff8ee'));}
function star(cx:number,cy:number,r:number,inner:number,c:Color){const p:[number,number][]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*inner:r;p.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}polygon(p,c);}

gradient(rgba('#35134f'),rgba('#ff713b'),0.62);
// Sun and synthwave cutouts.
circle(600,650,192,rgba('#ffe59a'));
rect(408,690,384,16,rgba('#ff8748')); rect(408,727,384,20,rgba('#ff8748')); rect(408,766,384,24,rgba('#ff8748'));
// Distant water and shoreline glow.
rect(0,738,1200,198,rgba('#b34163')); for(let y=748;y<930;y+=24) rect(0,y,1200,2,rgba('#f58a66',90));
// Skyline silhouettes.
const dark=rgba('#211532');
polygon([[0,740],[0,626],[72,626],[72,683],[111,683],[111,598],[170,598],[170,668],[205,668],[205,646],[261,646],[261,712],[312,712],[312,616],[359,616],[359,741]],dark);
polygon([[777,741],[777,687],[817,687],[817,610],[871,610],[871,670],[904,670],[904,580],[969,580],[969,665],[1008,665],[1008,623],[1060,623],[1060,701],[1110,701],[1110,638],[1163,638],[1163,685],[1200,685],[1200,741]],dark);
// Window glints.
for(const [x,y] of [[125,615],[140,615],[125,642],[329,636],[840,631],[930,605],[947,605],[1025,646],[1128,655]]) rect(x,y,8,11,rgba('#ffbd76',180));
// Palm silhouettes: segmented trunks with tapering arcing fronds.
function palm(x:number,y:number,h:number,lean:number){const base=dark;let px=x,py=y;for(let i=1;i<=9;i++){const t=i/9,nx=x+lean*t,ny=y-h*t;line(px,py,nx,ny,Math.max(5,15-0.7*i),base);px=nx;py=ny;}const cx=x+lean,cy=y-h;circle(cx,cy,9,base);for(let i=0;i<6;i++){const a=-Math.PI+ i*Math.PI/5;const ex=cx+Math.cos(a)*h*.30,ey=cy+Math.sin(a)*h*.22+20;line(cx,cy,ex,ey,9,base);line(cx+(ex-cx)*.56,cy+(ey-cy)*.56,ex+(ex-cx)*.11,ey+25,5,base);}}
palm(73,783,292,24); palm(1090,786,260,-18);
// Neon sign, suspended in the open sky above the skyline.
rect(300,282,600,126,rgba('#211532',150)); rect(300,282,600,5,rgba('#fb61bc'));rect(300,403,600,5,rgba('#fb61bc'));
const neon='LEONIDA', nscale=12, nx=(W-textWidth(neon,nscale))/2;
drawText(neon,nx+5,303,nscale,rgba('#062e55',220));drawText(neon,nx,297,nscale,rgba('#55f5ff'));
// Asphalt and curb.
rect(0,930,1200,270,rgba('#171923'));rect(0,930,1200,14,rgba('#8c7182'));rect(0,944,1200,8,rgba('#d7b5a7'));for(let x=40;x<1200;x+=120)rect(x,1110,56,6,rgba('#4b4651'));
// Scale and place the detailed figures on the ground strip.
// Gamer, about 430px tall, seated on the crate with his face clear.
{
  const scale=.77, tx=130, ty=510, y0=614;
  const X=(x:number)=>tx+x*scale, Y=(y:number)=>ty+(y-y0)*scale;
  const R=(x:number,y:number,w:number,h:number,c:Color)=>rect(X(x),Y(y),w*scale,h*scale,c);
  const C=(x:number,y:number,r:number,c:Color)=>circle(X(x),Y(y),r*scale,c);
  const L=(x1:number,y1:number,x2:number,y2:number,w:number,c:Color)=>line(X(x1),Y(y1),X(x2),Y(y2),w*scale,c);
  const P=(pts:[number,number][],c:Color)=>polygon(pts.map(([x,y])=>[X(x),Y(y)]),c);
  R(637,1007,224,132,rgba('#53394b'));R(652,1020,192,95,rgba('#78515b'));R(648,1135,18,58,rgba('#291e2a'));R(833,1135,18,58,rgba('#291e2a'));
  P([[674,967],[805,967],[827,1081],[735,1093],[683,1052]],rgba('#294b73'));
  P([[712,1063],[777,1060],[809,1150],[767,1168],[729,1110],[690,1154],[655,1137]],rgba('#26354a'));
  P([[647,1132],[691,1144],[681,1170],[625,1170],[625,1156]],rgba('#f2c45f'));P([[764,1153],[808,1137],[841,1152],[848,1170],[779,1170]],rgba('#f2c45f'));
  L(783,992,851,1042,29,rgba('#e8a67c'));C(854,1044,17,rgba('#e8a67c'));
  R(718,771,47,56,rgba('#d99a78'));C(733,716,83,rgba('#e8ae88'));C(803,730,16,rgba('#e8ae88'));
  P([[652,690],[674,638],[726,614],[775,632],[802,678],[758,670],[720,664],[678,691]],rgba('#27405e'));P([[682,671],[810,675],[832,695],[707,696]],rgba('#344f6f'));
  L(758,719,781,718,5,rgba('#30243a'));C(788,750,5,rgba('#30243a'));L(779,762,798,762,3,rgba('#8c4752'));
  // Long rounded beard: broad under the chin, flowing past the waist to a soft point.
  P([[686,763],[707,778],[739,783],[768,771],[785,799],[779,851],[770,905],[758,962],[746,1018],[734,1075],[725,1110],[720,1127],[712,1110],[701,1075],[688,1018],[675,962],[664,905],[659,851],[666,800]],rgba('#aaaeb3'));
  P([[692,765],[710,780],[739,785],[765,775],[778,801],[772,852],[763,906],[751,962],[739,1016],[727,1071],[722,1102],[720,1113],[714,1100],[704,1070],[693,1015],[681,961],[670,905],[665,852],[672,804]],rgba('#d9d9d7'));
  L(688,822,707,900,4,rgba('#aaaeb3'));L(761,818,745,904,4,rgba('#aaaeb3'));
}
// Ghost mascot, about 300px tall, standing beside the gamer; sparkle eyes and coin remain.
{
  const scale=1.06, tx=-60, ty=600, y0=762;
  const X=(x:number)=>tx+x*scale, Y=(y:number)=>ty+(y-y0)*scale;
  const C=(x:number,y:number,r:number,c:Color)=>circle(X(x),Y(y),r*scale,c);
  const L=(x1:number,y1:number,x2:number,y2:number,w:number,c:Color)=>line(X(x1),Y(y1),X(x2),Y(y2),w*scale,c);
  const P=(pts:[number,number][],c:Color)=>polygon(pts.map(([x,y])=>[X(x),Y(y)]),c);
  const S=(x:number,y:number,r:number,i:number,c:Color)=>star(X(x),Y(y),r*scale,i,c);
  C(954,916,108,rgba('#ff76d1',45));
  P([[877,1043],[875,854],[881,820],[897,789],[921,771],[951,762],[980,770],[1005,790],[1020,821],[1025,1040],[1008,1027],[992,1044],[973,1028],[953,1045],[934,1028],[914,1044],[895,1028]],rgba('#fffaf2'));
  L(879,1030,879,848,4,rgba('#89eaff'));L(879,848,893,801,4,rgba('#89eaff'));L(893,801,928,774,4,rgba('#89eaff'));L(928,774,964,768,4,rgba('#89eaff'));L(964,768,1002,788,4,rgba('#89eaff'));L(1002,788,1021,829,4,rgba('#89eaff'));
  S(925,851,20,.42,rgba('#171a2c'));S(977,851,20,.42,rgba('#171a2c'));L(939,894,951,901,5,rgba('#171a2c'));L(951,901,965,894,5,rgba('#171a2c'));
  L(892,918,846,963,20,rgba('#fffaf2'));C(846,963,13,rgba('#fffaf2'));
  C(843,969,41,rgba('#ff54bb'));C(843,969,32,rgba('#ff7ccc'));S(843,969,25,.48,rgba('#fff2a4'));
}
// Caption bands, over the sky and lower ground, with safe 64px margins.
rect(42,40,1116,172,rgba('#211532',150));outlined('13 YEARS. 2 DELAYS.',65,9);outlined('1 GREY BEARD.',152,9);
rect(42,1050,1116,124,rgba('#171923',210));outlined('MY AI AGENT SPENT THE WAIT',1060,7);outlined('GETTING PAID ON MAKE.FUN',1125,7);

function crc32(data:Uint8Array){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);}return(c^0xffffffff)>>>0;}
function u32(n:number){return Uint8Array.of((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);}
function chunk(type:string,data:Uint8Array){const t=new TextEncoder().encode(type), body=new Uint8Array(t.length+data.length);body.set(t);body.set(data,t.length);const out=new Uint8Array(12+data.length);out.set(u32(data.length),0);out.set(body,4);out.set(u32(crc32(body)),8+data.length);return out;}
const raw=new Uint8Array(H*(1+W*4));for(let y=0;y<H;y++)raw.set(image.subarray(y*W*4,(y+1)*W*4),y*(1+W*4)+1);
const ihdr=new Uint8Array(13);ihdr.set(u32(W),0);ihdr.set(u32(H),4);ihdr.set([8,6,0,0,0],8);
const pieces=[Uint8Array.of(137,80,78,71,13,10,26,10),chunk('IHDR',ihdr),chunk('IDAT',new Uint8Array(deflateSync(raw,{level:9}))),chunk('IEND',new Uint8Array())];
const png=new Uint8Array(pieces.reduce((n,p)=>n+p.length,0));let at=0;for(const p of pieces){png.set(p,at);at+=p.length;}
await writeFile(new URL('../meme.png',import.meta.url),png);
