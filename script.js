/* ================================================================
   NIXBOX DECORER — script.js  (v2)
   Módulos: ColorMaster · GradientForge · GameGradient ·
            TextStyler · RgbaConverter · Navigation
================================================================ */
'use strict';

// ----------------------------------------------------------------
// UTILIDADES GLOBALES
// ----------------------------------------------------------------

function showToast(msg = '✅ ¡Copiado al portapapeles!') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visible'), 2200);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'),
      { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  showToast();
}

/** HEX → {r,g,b} */
function hexToRgb(hex) {
  const c = hex.replace('#','').slice(0,6);
  const n = parseInt(c.padEnd(6,'0'), 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

/** {r,g,b} → {h,s,l} */
function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){ h=s=0; } else {
    const d=max-min;
    s=l>.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r:h=((g-b)/d+(g<b?6:0))/6;break;
      case g:h=((b-r)/d+2)/6;break;
      case b:h=((r-g)/d+4)/6;break;
    }
  }
  return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
}

/** {h,s,l} → HEX */
function hslToHex(h,s,l){
  s/=100;l/=100;
  const a=s*Math.min(l,1-l);
  const f=n=>{
    const k=(n+h/30)%12;
    return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');
  };
  return`#${f(0)}${f(8)}${f(4)}`;
}

/** Interpola linealmente entre dos colores HEX */
function lerpHex(hex1, hex2, t) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  const r = Math.round(a.r + (b.r-a.r)*t);
  const g = Math.round(a.g + (b.g-a.g)*t);
  const bv= Math.round(a.b + (b.b-a.b)*t);
  return { r, g, b:bv, hex:`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}` };
}

/** Genera un array de N colores interpolados entre varios stops */
function buildGradientColors(stops, count) {
  if(stops.length===0) return [];
  if(stops.length===1) return Array(count).fill(stops[0]);
  const result=[];
  for(let i=0;i<count;i++){
    const t=i/(count-1||1);
    const seg=t*(stops.length-1);
    const idx=Math.min(Math.floor(seg),stops.length-2);
    const lt=seg-idx;
    result.push(lerpHex(stops[idx],stops[idx+1],lt));
  }
  return result;
}

/** n (0-255) a hex de 2 dígitos */
function n2h(n){ return Math.round(Math.max(0,Math.min(255,n))).toString(16).padStart(2,'0'); }

// ================================================================
// SECCIÓN 1 — MAESTRO DE COLOR 🎨
// ================================================================
const ColorMaster = (() => {
  const PALETTES = [
    ['#6C63FF','#FF6584','#43E8D8','#FFD166','#06D6A0'],
    ['#1A1A2E','#16213E','#0F3460','#E94560','#533483'],
    ['#FF9A3C','#FF5733','#C70039','#900C3F','#511845'],
    ['#264653','#2A9D8F','#E9C46A','#F4A261','#E76F51'],
    ['#EF476F','#FFD166','#06D6A0','#118AB2','#073B4C'],
    ['#FFBE0B','#FB5607','#FF006E','#8338EC','#3A86FF'],
  ];
  let currentHex='#6C63FF';
  const picker=document.getElementById('mainColorPicker');
  const swatch=document.getElementById('colorSwatchLarge');
  const sliderH=document.getElementById('sliderH');
  const sliderS=document.getElementById('sliderS');
  const sliderL=document.getElementById('sliderL');
  const hueVal=document.getElementById('hueVal');
  const satVal=document.getElementById('satVal');
  const litVal=document.getElementById('litVal');
  const hexOut=document.getElementById('hexValue');
  const rgbOut=document.getElementById('rgbValue');
  const hslOut=document.getElementById('hslValue');
  const paletteEl=document.getElementById('paletteGrid');
  const tintsEl=document.getElementById('tintsRow');

  function updateFromHex(hex){
    currentHex=hex;
    const{r,g,b}=hexToRgb(hex);
    const{h,s,l}=rgbToHsl(r,g,b);
    swatch.style.background=hex;
    swatch.style.boxShadow=`0 0 40px ${hex}88`;
    picker.value=hex;
    hexOut.textContent=hex.toUpperCase();
    rgbOut.textContent=`rgb(${r}, ${g}, ${b})`;
    hslOut.textContent=`hsl(${h}, ${s}%, ${l}%)`;
    sliderH.value=h; hueVal.textContent=h;
    sliderS.value=s; satVal.textContent=s;
    sliderL.value=l; litVal.textContent=l;
    sliderS.style.background=`linear-gradient(to right,hsl(${h},0%,${l}%),hsl(${h},100%,${l}%))`;
    sliderL.style.background=`linear-gradient(to right,hsl(${h},${s}%,0%),hsl(${h},${s}%,50%),hsl(${h},${s}%,100%))`;
    buildTints(h,s);
  }

  function buildTints(h,s){
    tintsEl.innerHTML='';
    [10,20,30,40,50,60,70,80,90].forEach(l=>{
      const hex=hslToHex(h,s,l);
      const chip=document.createElement('div');
      chip.className='tint-chip';
      chip.style.background=hex;
      chip.title=hex;
      chip.addEventListener('click',()=>updateFromHex(hex));
      tintsEl.appendChild(chip);
    });
  }

  function buildPalette(){
    paletteEl.innerHTML='';
    PALETTES.flat().forEach(hex=>{
      const sw=document.createElement('div');
      sw.className='palette-swatch';
      sw.style.background=hex; sw.title=hex;
      sw.addEventListener('click',()=>updateFromHex(hex));
      paletteEl.appendChild(sw);
    });
  }

  document.querySelectorAll('.copy-btn[data-target]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const el=document.getElementById(btn.dataset.target);
      if(el) copyToClipboard(el.textContent.trim());
    });
  });

  picker.addEventListener('input',e=>updateFromHex(e.target.value));
  [sliderH,sliderS,sliderL].forEach(sl=>{
    sl.addEventListener('input',()=>{
      const h=+sliderH.value,s=+sliderS.value,l=+sliderL.value;
      hueVal.textContent=h; satVal.textContent=s; litVal.textContent=l;
      updateFromHex(hslToHex(h,s,l));
    });
  });

  function init(){ buildPalette(); updateFromHex(currentHex); }
  return{init};
})();


// ================================================================
// SECCIÓN 2 — FORJA DE DEGRADADOS CSS 🔥
// ================================================================
const GradientForge = (() => {
  const PRESETS=[
    {name:'Aurora',    stops:['#6C63FF','#43E8D8'],          angle:135},
    {name:'Atardecer', stops:['#FF6584','#FFD166'],          angle:45 },
    {name:'Medianoche',stops:['#1A1A2E','#6C63FF'],          angle:180},
    {name:'Fuego',     stops:['#FF5733','#FFD166'],          angle:90 },
    {name:'Océano',    stops:['#264653','#43E8D8'],          angle:135},
    {name:'Algodón',   stops:['#EF476F','#FFD166','#06D6A0'],angle:90 },
    {name:'Nebulosa',  stops:['#8338EC','#3A86FF','#06D6A0'],angle:45 },
    {name:'Lava',      stops:['#900C3F','#FF5733','#FFD166'],angle:135},
  ];
  let gradType='linear', angle=135;
  let colorStops=[{color:'#6C63FF',position:0},{color:'#43E8D8',position:100}];
  const previewEl=document.getElementById('gradientPreview');
  const cssOut=document.getElementById('gradientCSS');
  const stopsCont=document.getElementById('colorStops');
  const addBtn=document.getElementById('addStopBtn');
  const angleSlider=document.getElementById('angleSlider');
  const angleDisp=document.getElementById('angleDisplay');
  const angleGroup=document.getElementById('angleGroup');
  const presetGrid=document.getElementById('presetGrid');
  const copyBtn=document.getElementById('copyGradientBtn');
  const toggleBtns=document.querySelectorAll('.toggle-btn[data-type]');

  function buildCSS(){
    const stops=colorStops.slice().sort((a,b)=>a.position-b.position)
      .map(s=>`${s.color} ${s.position}%`).join(', ');
    switch(gradType){
      case'linear':return`linear-gradient(${angle}deg, ${stops})`;
      case'radial': return`radial-gradient(circle, ${stops})`;
      case'conic':  return`conic-gradient(from ${angle}deg, ${stops})`;
    }
  }

  function render(){
    const v=buildCSS();
    previewEl.style.background=v;
    cssOut.textContent=`background: ${v};\n/* Respaldo para navegadores antiguos */\nbackground-color: ${colorStops[0]?.color||'#6C63FF'};`;
    angleGroup.style.display=gradType==='radial'?'none':'flex';
  }

  function renderStops(){
    stopsCont.innerHTML='';
    colorStops.forEach((stop,i)=>{
      const row=document.createElement('div');
      row.className='stop-row';
      const ci=document.createElement('input');
      ci.type='color'; ci.value=stop.color;
      ci.addEventListener('input',e=>{colorStops[i].color=e.target.value;render();});
      const ps=document.createElement('input');
      ps.type='range';ps.min=0;ps.max=100;ps.value=stop.position;ps.className='slider';
      ps.addEventListener('input',e=>{colorStops[i].position=+e.target.value;lbl.textContent=`${ps.value}%`;render();});
      const lbl=document.createElement('span');
      lbl.style.cssText='font-size:.75rem;color:var(--text-dim);width:35px;text-align:right';
      lbl.textContent=`${stop.position}%`;
      const rm=document.createElement('button');
      rm.className='remove-stop';rm.textContent='✕';rm.title='Eliminar';
      rm.disabled=colorStops.length<=2;
      rm.addEventListener('click',()=>{if(colorStops.length>2){colorStops.splice(i,1);renderStops();render();}});
      row.append(ci,ps,lbl,rm);
      stopsCont.appendChild(row);
    });
  }

  function buildPresets(){
    presetGrid.innerHTML='';
    PRESETS.forEach(p=>{
      const chip=document.createElement('div');
      chip.className='preset-chip';chip.title=p.name;
      chip.style.background=`linear-gradient(135deg,${p.stops.join(',')})`;
      chip.addEventListener('click',()=>{
        angle=p.angle;angleSlider.value=angle;angleDisp.textContent=angle;
        const step=100/(p.stops.length-1);
        colorStops=p.stops.map((c,i)=>({color:c,position:Math.round(i*step)}));
        gradType='linear';
        toggleBtns.forEach(b=>b.classList.toggle('active',b.dataset.type==='linear'));
        renderStops();render();
      });
      presetGrid.appendChild(chip);
    });
  }

  toggleBtns.forEach(b=>b.addEventListener('click',()=>{
    toggleBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');gradType=b.dataset.type;render();
  }));
  angleSlider.addEventListener('input',e=>{angle=+e.target.value;angleDisp.textContent=angle;render();});
  addBtn.addEventListener('click',()=>{if(colorStops.length<6){colorStops.push({color:'#ffffff',position:50});renderStops();render();}});
  copyBtn.addEventListener('click',()=>copyToClipboard(cssOut.textContent));

  function init(){buildPresets();renderStops();render();}
  return{init};
})();


// ================================================================
// SECCIÓN 3 — DEGRADADO PARA JUEGOS 🎮
// ================================================================
const GameGradient = (() => {

  // Paletas predefinidas para juegos
  const GAME_PRESETS = [
    { name:'🌈 Arcoíris',  colors:['#FF0000','#FF7700','#FFFF00','#00FF00','#0000FF','#8B00FF'] },
    { name:'⛏️ Diamante',  colors:['#5BFFF5','#00B4D8','#48CAE4','#90E0EF'] },
    { name:'🔥 Fuego',     colors:['#FF0000','#FF4500','#FF8C00','#FFD700'] },
    { name:'🌊 Agua',      colors:['#03045E','#0077B6','#00B4D8','#90E0EF','#CAF0F8'] },
    { name:'🌿 Bosque',    colors:['#1B4332','#2D6A4F','#52B788','#B7E4C7'] },
    { name:'💜 Neón',      colors:['#FF006E','#8338EC','#3A86FF','#06FFB4'] },
    { name:'🌅 Amanecer',  colors:['#F72585','#B5179E','#7209B7','#480CA8','#3A0CA3'] },
    { name:'🍬 Candy',     colors:['#FF85A1','#FBB1BD','#FF9E6D','#FFCA3A','#8AC926'] },
    { name:'🎮 Gamer',     colors:['#00FF41','#008F11','#003B00'] },
    { name:'❄️ Hielo',     colors:['#FFFFFF','#A8DADC','#457B9D','#1D3557'] },
  ];

  let gameColors = ['#FF0000','#FF7700','#FFFF00','#00FF00','#0000FF','#8B00FF'];
  let activeStyles = new Set();
  let activeFormat = 'default_hex';

  const gameText   = document.getElementById('gameText');
  const stopsEl    = document.getElementById('gameColorStops');
  const addBtn     = document.getElementById('addGameColor');
  const revBtn     = document.getElementById('reverseGameColors');
  const previewEl  = document.getElementById('gamePreviewText');
  const outputEl   = document.getElementById('gameOutput');
  const copyBtn    = document.getElementById('copyGameOutput');
  const outputLbl  = document.getElementById('gameOutputLabel');
  const fmtBtns    = document.querySelectorAll('#gameFormatBtns .toggle-btn');
  const styleBtns  = document.querySelectorAll('.style-toggle-btn');
  const presetsEl  = document.getElementById('gamePresetsGrid');

  /** Genera el array de colores interpolados para cada carácter */
  function getCharColors(text) {
    const chars = [...text].filter(c => c !== ' ' && c !== '\n');
    if (chars.length === 0) return [];
    return buildGradientColors(gameColors, chars.length);
  }

  /** Actualiza la vista previa visual (solo HTML) */
  function updatePreview() {
    const text = gameText.value || '';
    previewEl.innerHTML = '';
    const chars = [...text];
    const nonSpaceColors = buildGradientColors(gameColors, Math.max(chars.filter(c=>c.trim()).length,1));
    let colorIdx = 0;
    chars.forEach(ch => {
      if (!ch.trim()) {
        previewEl.appendChild(document.createTextNode(ch));
        return;
      }
      const col = nonSpaceColors[colorIdx++] || nonSpaceColors[0];
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.color = col.hex;
      if (activeStyles.has('bold'))      span.style.fontWeight = 'bold';
      if (activeStyles.has('italic'))    span.style.fontStyle  = 'italic';
      if (activeStyles.has('underline')) span.style.textDecoration = (activeStyles.has('strike') ? 'underline line-through' : 'underline');
      else if (activeStyles.has('strike')) span.style.textDecoration = 'line-through';
      previewEl.appendChild(span);
    });
    generateOutput(text, nonSpaceColors);
  }

  /** Genera el código de salida según el formato */
  function generateOutput(text, colorArr) {
    const chars = [...text];
    let out = '';
    let colorIdx = 0;

    const bold  = activeStyles.has('bold');
    const ital  = activeStyles.has('italic');
    const under = activeStyles.has('underline');
    const strike= activeStyles.has('strike');

    // Prefijo de estilos §código para Minecraft
    function mcStylePrefix() {
      let pfx = '';
      if (bold)   pfx += '§l';
      if (ital)   pfx += '§o';
      if (under)  pfx += '§n';
      if (strike) pfx += '§m';
      return pfx;
    }
    // Prefijo de estilos para formato MOTD (\u00A7 en vez de §)
    function motdStylePrefix() {
      let pfx = '';
      if (bold)   pfx += '\\u00A7l';
      if (ital)   pfx += '\\u00A7o';
      if (under)  pfx += '\\u00A7n';
      if (strike) pfx += '\\u00A7m';
      return pfx;
    }
    // Prefijo de estilos para formato Console ($l etc.)
    function consoleStylePrefix() {
      let pfx = '';
      if (bold)   pfx += '$l';
      if (ital)   pfx += '$o';
      if (under)  pfx += '$n';
      if (strike) pfx += '$m';
      return pfx;
    }

    switch(activeFormat) {

      // ── Default &#rrggbb ──────────────────────────────────────
      // Usado por plugins como: EssentialsX, CMI, etc.
      case 'default_hex':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          out += `${mcStylePrefix()}&#${col.hex.slice(1)}${ch}`;
        });
        outputLbl.textContent = '⛏️ Default — &#rrggbb (EssentialsX, CMI...)';
        break;

      // ── Chat <#rrggbb> ────────────────────────────────────────
      // Usado por MiniMessage (Paper, Adventure API)
      case 'chat_hex':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          out += `<${col.hex}>${mcStylePrefix()}${ch}`;
        });
        outputLbl.textContent = '💬 Chat — <#rrggbb> (MiniMessage / Paper API)';
        break;

      // ── Legacy &x&r&r&g&g&b&b ────────────────────────────────
      // Formato § expandido de Bukkit/Spigot antiguo
      case 'legacy_rgb':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          const h = col.hex.slice(1).toUpperCase();
          out += `${mcStylePrefix()}&x&${h[0]}&${h[1]}&${h[2]}&${h[3]}&${h[4]}&${h[5]}${ch}`;
        });
        outputLbl.textContent = '📜 Legacy — &x&r&r&g&g&b&b (Bukkit/Spigot legacy)';
        break;

      // ── Nick &#rrggbb ─────────────────────────────────────────
      // Igual que Default pero con & en vez de § (para comandos /nick)
      case 'nick_hex':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          out += `&#${col.hex.slice(1)}${ch}`;
        });
        outputLbl.textContent = '👤 Nick — &#rrggbb (comando /nick con colores)';
        break;

      // ── Nick Special <#rrggbb> ───────────────────────────────
      // Formato nick con corchetes angulares (algunos plugins de nicks)
      case 'nick_special':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          out += `<#${col.hex.slice(1)}>${ch}`;
        });
        outputLbl.textContent = '✨ Nick Special — <#rrggbb> (plugins de nick con MiniMessage)';
        break;

      // ── Console §x§R§R§G§G§B§B ──────────────────────────────
      // Formato para consola de servidor (BungeeCord, Velocity, etc.)
      // Ejemplo: §x§c§0§0§b§d§6a
      case 'console_rgb':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          const h = col.hex.slice(1).toLowerCase();
          out += `${consoleStylePrefix()}§x§${h[0]}§${h[1]}§${h[2]}§${h[3]}§${h[4]}§${h[5]}${ch}`;
        });
        outputLbl.textContent = '🖥️ Console — §x§r§r§g§g§b§b (BungeeCord / Velocity)';
        break;

      // ── BBCode [COLOR=#rrggbb] ───────────────────────────────
      // Foros, tableros, algunos plugins de chat
      case 'bbcode_color':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          let inner = ch;
          if (bold)   inner = `[B]${inner}[/B]`;
          if (ital)   inner = `[I]${inner}[/I]`;
          if (under)  inner = `[U]${inner}[/U]`;
          if (strike) inner = `[S]${inner}[/S]`;
          out += `[COLOR=${col.hex.toUpperCase()}]${inner}[/COLOR]`;
        });
        outputLbl.textContent = '📋 BBCode — [COLOR=#rrggbb] (foros, Xenforo, SMF...)';
        break;

      // ── MOTD \u00A7x ─────────────────────────────────────────
      // Formato para server.properties MOTD o plugins MOTD
      case 'motd_unicode':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          const h = col.hex.slice(1).toUpperCase();
          // §x seguido de §R§R§G§G§B§B en formato \u00A7
          out += `${motdStylePrefix()}\\u00A7x\\u00A7${h[0]}\\u00A7${h[1]}\\u00A7${h[2]}\\u00A7${h[3]}\\u00A7${h[4]}\\u00A7${h[5]}${ch}`;
        });
        outputLbl.textContent = '📡 MOTD — \u00A7x (server.properties / motd.txt)';
        break;

      // ── HTML spans ───────────────────────────────────────────
      case 'html':
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch === '\n' ? '<br>' : '&nbsp;'; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          let style = `color:${col.hex};`;
          if (bold)   style += 'font-weight:bold;';
          if (ital)   style += 'font-style:italic;';
          const deco = [under&&'underline',strike&&'line-through'].filter(Boolean).join(' ');
          if (deco)   style += `text-decoration:${deco};`;
          out += `<span style="${style}">${ch}</span>`;
        });
        outputLbl.textContent = '🌐 HTML — <span style="color:#rrggbb"> (web)';
        break;

      // ── Discord ANSI ─────────────────────────────────────────
      case 'discord':
        out = '```ansi\n';
        chars.forEach(ch => {
          if (!ch.trim()) { out += ch; return; }
          const col = colorArr[colorIdx++] || colorArr[0];
          const ri = Math.round(col.r/255*5);
          const gi = Math.round(col.g/255*5);
          const bi = Math.round(col.b/255*5);
          const code = 16 + 36*ri + 6*gi + bi;
          out += `\x1b[38;5;${code}m${ch}`;
        });
        out += '\x1b[0m\n```';
        outputLbl.textContent = '🔵 Discord — ANSI color block (Discord Nitro)';
        break;
    }

    outputEl.textContent = out;
  }

  /** Renderiza las paradas de color de juego */
  function renderGameStops() {
    stopsEl.innerHTML = '';
    gameColors.forEach((hex, i) => {
      const item = document.createElement('div');
      item.className = 'game-stop-item';
      item.draggable = true;

      const ci = document.createElement('input');
      ci.type = 'color'; ci.value = hex;
      ci.addEventListener('input', e => { gameColors[i] = e.target.value; hexLbl.textContent = e.target.value.toUpperCase(); updatePreview(); });

      const hexLbl = document.createElement('span');
      hexLbl.className = 'stop-hex';
      hexLbl.textContent = hex.toUpperCase();

      const rm = document.createElement('button');
      rm.className = 'remove-stop';
      rm.textContent = '✕';
      rm.title = 'Eliminar';
      rm.disabled = gameColors.length <= 2;
      rm.addEventListener('click', () => {
        if (gameColors.length > 2) { gameColors.splice(i,1); renderGameStops(); updatePreview(); }
      });

      // Drag & drop reorder
      item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', i); item.classList.add('dragging'); });
      item.addEventListener('dragend',   () => item.classList.remove('dragging'));
      item.addEventListener('dragover',  e => e.preventDefault());
      item.addEventListener('drop', e => {
        e.preventDefault();
        const from = +e.dataTransfer.getData('text/plain');
        if (from !== i) {
          const moved = gameColors.splice(from, 1)[0];
          gameColors.splice(i, 0, moved);
          renderGameStops(); updatePreview();
        }
      });

      item.append(ci, hexLbl, rm);
      stopsEl.appendChild(item);
    });
  }

  /** Construye la cuadrícula de presets */
  function buildGamePresets() {
    presetsEl.innerHTML = '';
    GAME_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'game-preset-chip';
      btn.title = p.name;
      // Texto con degradado como fondo del botón
      btn.style.backgroundImage = `linear-gradient(to right,${p.colors.join(',')})`;
      btn.style.webkitBackgroundClip = 'text';
      btn.style.webkitTextFillColor = 'transparent';
      btn.style.backgroundClip = 'text';
      btn.textContent = p.name;
      btn.addEventListener('click', () => {
        gameColors = [...p.colors];
        renderGameStops();
        updatePreview();
      });
      presetsEl.appendChild(btn);
    });
  }

  // Eventos formato
  fmtBtns.forEach(b => b.addEventListener('click', () => {
    fmtBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    activeFormat = b.dataset.fmt;
    updatePreview();
  }));

  // Eventos estilo
  styleBtns.forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.style;
    b.classList.toggle('active');
    activeStyles.has(s) ? activeStyles.delete(s) : activeStyles.add(s);
    updatePreview();
  }));

  addBtn.addEventListener('click', () => {
    if (gameColors.length < 10) {
      gameColors.push('#FFFFFF');
      renderGameStops(); updatePreview();
    }
  });

  revBtn.addEventListener('click', () => {
    gameColors.reverse();
    renderGameStops(); updatePreview();
  });

  gameText.addEventListener('input', updatePreview);
  copyBtn.addEventListener('click', () => copyToClipboard(outputEl.textContent));

  function init() { buildGamePresets(); renderGameStops(); updatePreview(); }
  return { init };
})();


// ================================================================
// SECCIÓN 4 — ESTILIZADOR DE TEXTO ✍️
// ================================================================
const TextStyler = (() => {
  const CHAR_MAPS = {
    normal:      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    bold:        '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    italic:      '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻0123456789',
    boldItalic:  '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛0123456789',
    script:      '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏0123456789',
    doubleStruck:'𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
    fraktur:     '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟0123456789',
    mono:        '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣0123456789',
    circled:     'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⓪①②③④⑤⑥⑦⑧⑨',
    fullwidth:   'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ　ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９',
    boldScript:  '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃0123456789',
    boldFraktur: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟0123456789',
    sansSerif:   '𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓0123456789',
    sansSerifBold:'𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
  };
  const SPECIAL = {
    smallCaps: t=>t.replace(/[a-z]/g,c=>'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'['abcdefghijklmnopqrstuvwxyz'.indexOf(c)]),

    // Small Caps MEDIANO — caracteres IPA/Unicode más altos que tiny pero menores que normal
    smallCapsMid: t=>[...t].map(c=>{
      const map={
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
        k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',
        u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
        A:'ᴀ',B:'ʙ',C:'ᴄ',D:'ᴅ',E:'ᴇ',F:'ꜰ',G:'ɢ',H:'ʜ',I:'ɪ',J:'ᴊ',
        K:'ᴋ',L:'ʟ',M:'ᴍ',N:'ɴ',O:'ᴏ',P:'ᴘ',Q:'ǫ',R:'ʀ',S:'ꜱ',T:'ᴛ',
        U:'ᴜ',V:'ᴠ',W:'ᴡ',X:'x',Y:'ʏ',Z:'ᴢ',' ':' '
      };
      return map[c]||c;
    }).join(''),
    flipped:   t=>[...t.toLowerCase()].reverse().map(c=>({a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',' ':' '}[c]||c)).join(''),
    strikethrough: t=>[...t].map(c=>c===' '?' ':c+'\u0336').join(''),
    underline:     t=>[...t].map(c=>c===' '?' ':c+'\u0332').join(''),
    morse: t=>[...t.toUpperCase()].map(c=>({A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',' ':'/',' ':' '}[c]||c)).join(' '),

    // Superíndice — mapa completo disponible en Unicode
    superscript: t=>[...t].map(c=>{
      const map={
        a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',
        k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',q:'ᑫ',r:'ʳ',s:'ˢ',t:'ᵗ',
        u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ',
        A:'ᴬ',B:'ᴮ',C:'ᶜ',D:'ᴰ',E:'ᴱ',F:'ᶠ',G:'ᴳ',H:'ᴴ',I:'ᴵ',J:'ᴶ',
        K:'ᴷ',L:'ᴸ',M:'ᴹ',N:'ᴺ',O:'ᴼ',P:'ᴾ',Q:'ᑫ',R:'ᴿ',S:'ˢ',T:'ᵀ',
        U:'ᵁ',V:'ᵛ',W:'ᵂ',X:'ˣ',Y:'ʸ',Z:'ᶻ',
        '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
        '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾',' ':' '
      };
      return map[c]||c;
    }).join(''),

    // Subíndice — mapa Unicode disponible
    subscript: t=>[...t].map(c=>{
      const map={
        a:'ₐ',b:'♭',c:'꜀',d:'ᑯ',e:'ₑ',f:'բ',g:'ɡ',h:'ₕ',i:'ᵢ',j:'ⱼ',
        k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',q:'ᑫ',r:'ᵣ',s:'ₛ',t:'ₜ',
        u:'ᵤ',v:'ᵥ',w:'w',x:'ₓ',y:'ᵧ',z:'₂',
        A:'ₐ',B:'₈',C:'꜀',D:'ᑯ',E:'ₑ',F:'բ',G:'ɡ',H:'ₕ',I:'ᵢ',J:'ⱼ',
        K:'ₖ',L:'ₗ',M:'ₘ',N:'ₙ',O:'ₒ',P:'ₚ',Q:'ᑫ',R:'ᵣ',S:'ₛ',T:'ₜ',
        U:'ᵤ',V:'ᵥ',W:'w',X:'ₓ',Y:'ᵧ',Z:'z',
        '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
        '+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',' ':' '
      };
      return map[c]||c;
    }).join(''),

    // Superíndice + Small Caps combinado (ᴬᴸᵀᴼ ᴿᴱᴾᴱᵀᴵᵀᴼ)
    superSmallCaps: t=>[...t].map(c=>{
      const map={
        a:'ᴬ',b:'ᴮ',c:'ᶜ',d:'ᴰ',e:'ᴱ',f:'ᶠ',g:'ᴳ',h:'ᴴ',i:'ᴵ',j:'ᴶ',
        k:'ᴷ',l:'ᴸ',m:'ᴹ',n:'ᴺ',o:'ᴼ',p:'ᴾ',q:'ᑫ',r:'ᴿ',s:'ˢ',t:'ᵀ',
        u:'ᵁ',v:'ᵛ',w:'ᵂ',x:'ˣ',y:'ʸ',z:'ᶻ',
        A:'ᴬ',B:'ᴮ',C:'ᶜ',D:'ᴰ',E:'ᴱ',F:'ᶠ',G:'ᴳ',H:'ᴴ',I:'ᴵ',J:'ᴶ',
        K:'ᴷ',L:'ᴸ',M:'ᴹ',N:'ᴺ',O:'ᴼ',P:'ᴾ',Q:'ᑫ',R:'ᴿ',S:'ˢ',T:'ᵀ',
        U:'ᵁ',V:'ᵛ',W:'ᵂ',X:'ˣ',Y:'ʸ',Z:'ᶻ',
        ' ':' '
      };
      return map[c]||c;
    }).join(''),

    // Subrayado doble
    doubleUnder: t=>[...t].map(c=>c===' '?' ':c+'\u0333').join(''),

    // Texto ondulado
    wavy: t=>[...t].map(c=>c===' '?' ':c+'\u0334').join(''),

    // Mirror (espejo, sin invertir orden)
    mirror: t=>[...t].map(c=>({
      a:'ɒ',b:'d',c:'ɔ',d:'b',e:'ɘ',f:'ʇ',g:'ϱ',h:'ʜ',i:'i',j:'ᒐ',
      k:'ʞ',l:'l',m:'m',n:'n',o:'o',p:'q',q:'p',r:'ɿ',s:'ƨ',t:'ƚ',
      u:'u',v:'v',w:'w',x:'x',y:'y',z:'ƹ',
      A:'A',B:'ᗺ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'ᖷ',G:'ᘜ',H:'H',I:'I',J:'Ⴑ',
      K:'ﻼ',L:'⅃',M:'M',N:'И',O:'O',P:'ꟼ',Q:'Ϙ',R:'Я',S:'Ƨ',T:'T',
      U:'U',V:'V',W:'W',X:'X',Y:'Y',Z:'Ƹ',' ':' '
    }[c]||c)).join(''),

    // Bubble (círculo negro relleno)
    bubble: t=>[...t.toLowerCase()].map(c=>({
      a:'🅐',b:'🅑',c:'🅒',d:'🅓',e:'🅔',f:'🅕',g:'🅖',h:'🅗',i:'🅘',j:'🅙',
      k:'🅚',l:'🅛',m:'🅜',n:'🅝',o:'🅞',p:'🅟',q:'🅠',r:'🅡',s:'🅢',t:'🅣',
      u:'🅤',v:'🅥',w:'🅦',x:'🅧',y:'🅨',z:'🅩',' ':' '
    }[c]||c)).join(''),

    // Bubble blanco (círculo vacío)
    bubbleWhite: t=>[...t.toLowerCase()].map(c=>({
      a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',
      k:'ⓚ',l:'ⓛ',m:'ⓜ',n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',
      u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ',' ':' '
    }[c]||c)).join(''),

    // Square negro (cuadrado relleno)
    squareBlack: t=>[...t.toUpperCase()].map(c=>({
      A:'🅰',B:'🅱',C:'🅲',D:'🅳',E:'🅴',F:'🅵',G:'🅶',H:'🅷',I:'🅸',J:'🅹',
      K:'🅺',L:'🅻',M:'🅼',N:'🅽',O:'🅾',P:'🅿',Q:'🆀',R:'🆁',S:'🆂',T:'🆃',
      U:'🆄',V:'🆅',W:'🆆',X:'🆇',Y:'🆈',Z:'🆉',' ':' '
    }[c]||c)).join(''),

    // Square blanco (cuadrado vacío usando Enclosed Alphanumeric Supplement)
    squareWhite: t=>[...t.toUpperCase()].map(c=>({
      A:'🄰',B:'🄱',C:'🄲',D:'🄳',E:'🄴',F:'🄵',G:'🄶',H:'🄷',I:'🄸',J:'🄹',
      K:'🄺',L:'🄻',M:'🄼',N:'🄽',O:'🄾',P:'🄿',Q:'🅀',R:'🅁',S:'🅂',T:'🅃',
      U:'🅄',V:'🅅',W:'🅆',X:'🅇',Y:'🅈',Z:'🅉',' ':' '
    }[c]||c)).join(''),

    // Serif bold (serif negrita Unicode)
    serifBold: t=>[...t].map(c=>{
      const A=0x1D400, a=0x1D41A, Z=26;
      const cu=c.codePointAt(0);
      if(cu>=65&&cu<=90)  return String.fromCodePoint(A+cu-65);
      if(cu>=97&&cu<=122) return String.fromCodePoint(a+cu-97);
      return c;
    }).join(''),

    // Serif italic
    serifItalic: t=>[...t].map(c=>{
      const A=0x1D434, a=0x1D44E;
      const cu=c.codePointAt(0);
      if(cu>=65&&cu<=90)  return String.fromCodePoint(A+cu-65);
      if(cu>=97&&cu<=122) return String.fromCodePoint(a+cu-97);
      return c;
    }).join(''),

    // Sans-serif italic
    sansSerifItalic: t=>[...t].map(c=>{
      const A=0x1D608, a=0x1D622;
      const cu=c.codePointAt(0);
      if(cu>=65&&cu<=90)  return String.fromCodePoint(A+cu-65);
      if(cu>=97&&cu<=122) return String.fromCodePoint(a+cu-97);
      return c;
    }).join(''),

    // Sans-serif bold italic
    sansSerifBoldItalic: t=>[...t].map(c=>{
      const A=0x1D63C, a=0x1D656;
      const cu=c.codePointAt(0);
      if(cu>=65&&cu<=90)  return String.fromCodePoint(A+cu-65);
      if(cu>=97&&cu<=122) return String.fromCodePoint(a+cu-97);
      return c;
    }).join(''),

    // Invisible ink (carácter de unión de cero + letra invisible visual)
    invisibleInk: t=>[...t].map(c=>c===' '?' ':'\u2063'+c+'\u2063').join(''),

    // Zalgo (texto glitch con diacríticos encima y abajo)
    zalgo: t=>{
      const above=['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F','\u0310','\u0311','\u0312','\u0313','\u0315','\u031A','\u031B','\u033D','\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346','\u034A','\u034B','\u034C','\u0350','\u0351','\u0352','\u0357','\u0358','\u035B','\u035D','\u035E'];
      const below=['\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F','\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F','\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C','\u0345','\u0347','\u0348','\u0349','\u034D','\u034E','\u0353','\u0354','\u0355','\u0356','\u0359','\u035A','\u035F','\u0362'];
      const rnd=(arr)=>arr[Math.floor(Math.random()*arr.length)];
      return[...t].map(c=>{
        if(c===' ')return ' ';
        let r=c;
        const na=Math.floor(Math.random()*4)+1;
        const nb=Math.floor(Math.random()*3)+1;
        for(let i=0;i<na;i++)r+=rnd(above);
        for(let i=0;i<nb;i++)r+=rnd(below);
        return r;
      }).join('');
    },

    // Slash-through (tachado con barra)
    slashthrough: t=>[...t].map(c=>c===' '?' ':c+'\u0338').join(''),

    // Tachado con guion (combinar U+0335)
    strikethroughDash: t=>[...t].map(c=>c===' '?' ':c+'\u0335').join(''),

    // Texto con tildes dobles (tilde overlay)
    tildeOverlay: t=>[...t].map(c=>c===' '?' ':c+'\u0334').join(''),

    // Puntos encima (puntuado)
    dotAbove: t=>[...t].map(c=>c===' '?' ':c+'\u0307').join(''),

    // Puntos abajo
    dotBelow: t=>[...t].map(c=>c===' '?' ':c+'\u0323').join(''),

    // Tilde encima
    tildeAbove: t=>[...t].map(c=>c===' '?' ':c+'\u0303').join(''),

    // Subrayado zigzag
    zigzagUnder: t=>[...t].map(c=>c===' '?' ':c+'\u035C').join(''),

    // Texto retro/estilizado con caracteres Runic-like (estilo antiguo)
    runic: t=>[...t.toUpperCase()].map(c=>({
      A:'ᚨ',B:'ᛒ',C:'ᚲ',D:'ᛞ',E:'ᛖ',F:'ᚠ',G:'ᚷ',H:'ᚺ',I:'ᛁ',J:'ᛃ',
      K:'ᚲ',L:'ᛚ',M:'ᛗ',N:'ᚾ',O:'ᛟ',P:'ᛈ',Q:'ᛩ',R:'ᚱ',S:'ᛊ',T:'ᛏ',
      U:'ᚢ',V:'ᚡ',W:'ᚹ',X:'ᚷᛊ',Y:'ᚤ',Z:'ᛉ',' ':' '
    }[c]||c)).join(''),

    // Texto Elder Futhark (runas)
    elderFuthark: t=>[...t.toUpperCase()].map(c=>({
      A:'ᚫ',B:'ᛒ',C:'ᚳ',D:'ᛞ',E:'ᛖ',F:'ᚠ',G:'ᚸ',H:'ᚻ',I:'ᛁ',J:'ᛄ',
      K:'ᚳ',L:'ᛚ',M:'ᛗ',N:'ᚾ',O:'ᚩ',P:'ᛈ',Q:'ᛩ',R:'ᚱ',S:'ᛋ',T:'ᛏ',
      U:'ᚢ',V:'ᚡ',W:'ᚹ',X:'ᛉ',Y:'ᚣ',Z:'ᛉ',' ':' '
    }[c]||c)).join(''),

    // Texto en estilo ASCII art (Regional Indicator Symbols = :regional_indicator_a:)
    regional: t=>[...t.toUpperCase()].map(c=>{
      const cu=c.codePointAt(0);
      if(cu>=65&&cu<=90) return String.fromCodePoint(0x1F1E0+cu-65)+' ';
      if(c===' ')return '  ';
      return c;
    }).join(''),

    // Texto con sombra (letra + punto)
    shadow: t=>[...t].map(c=>c===' '?' ':c+'̣').join(''),

    // Wide / espaciado
    wide: t=>[...t].map(c=>c===' '?'   ':c+' ').join(''),
  };

  function byMap(text,mapStr){
    const norm=CHAR_MAPS.normal;const tgt=[...mapStr];
    const m=new Map();let ni=0;
    for(const nc of norm){m.set(nc,tgt[ni]||nc);ni++;}
    return[...text].map(c=>m.get(c)||c).join('');
  }

  const STYLES=[
    // ── Tamaño pequeño / tiny ───────────────────────────────────
    {id:'smallCaps',         label:'ᴠᴇʀꜱᴀʟɪᴛᴀꜱ (Small Caps)',    fn:SPECIAL.smallCaps,          group:'pequeño'},
    {id:'smallCapsMid',      label:'ᴍᴇᴅɪᴀɴᴀ (Medium Caps)',       fn:SPECIAL.smallCapsMid,       group:'pequeño'},
    {id:'superscript',       label:'ˢᵘᵖᵉʳíⁿᵈⁱᶜᵉ',                fn:SPECIAL.superscript,        group:'pequeño'},
    {id:'subscript',         label:'ₛᵤᵦíₙdᵢcₑ',                   fn:SPECIAL.subscript,          group:'pequeño'},
    {id:'superSmallCaps',    label:'ᴬᴸᵀᴼ ˢᵁᴾᴱᴿᴵᴼᴿ',               fn:SPECIAL.superSmallCaps,     group:'pequeño'},
    {id:'wide',              label:'W i d e  E s p a c i a d o',   fn:SPECIAL.wide,               group:'pequeño'},
    // ── Estilo Unicode clásico ──────────────────────────────────
    {id:'bold',              label:'𝗡𝗲𝗴𝗿𝗶𝘁𝗮 Sans',               fn:t=>byMap(t,CHAR_MAPS.bold),             group:'estilo'},
    {id:'italic',            label:'𝘊𝘶𝘳𝘴𝘪𝘷𝘢 Sans',               fn:t=>byMap(t,CHAR_MAPS.italic),           group:'estilo'},
    {id:'boldItalic',        label:'𝑵𝒆𝒈𝒓𝒊𝒕𝒂 𝑪𝒖𝒓𝒔𝒊𝒗𝒂',             fn:t=>byMap(t,CHAR_MAPS.boldItalic),       group:'estilo'},
    {id:'serifBold',         label:'𝐒𝐞𝐫𝐢𝐟 𝐍𝐞𝐠𝐫𝐢𝐭𝐚',               fn:SPECIAL.serifBold,          group:'estilo'},
    {id:'serifItalic',       label:'𝑆𝑒𝑟𝑖𝑓 𝐼𝑡𝑎𝑙𝑖𝑐𝑎',               fn:SPECIAL.serifItalic,        group:'estilo'},
    {id:'script',            label:'𝒞𝒶𝓁𝒾𝑔𝓇𝒶𝒻𝓎𝒶',                 fn:t=>byMap(t,CHAR_MAPS.script),           group:'estilo'},
    {id:'boldScript',        label:'𝓝𝓮𝓰𝓻𝓲𝓽𝓪 𝓒𝓪𝓵𝓲𝓰𝓻.',             fn:t=>byMap(t,CHAR_MAPS.boldScript),       group:'estilo'},
    {id:'doubleStruck',      label:'𝔻𝕠𝕓𝕝𝕖 𝕃í𝕟𝕖𝕒 (Outline)',      fn:t=>byMap(t,CHAR_MAPS.doubleStruck),     group:'estilo'},
    {id:'fraktur',           label:'Fraktur Gótico Old English',   fn:t=>byMap(t,CHAR_MAPS.fraktur),          group:'estilo'},
    {id:'boldFraktur',       label:'𝕱𝖗𝖆𝖐𝖙𝖚𝖗 𝕹𝖊𝖌𝖗𝖎𝖙𝖆',            fn:t=>byMap(t,CHAR_MAPS.boldFraktur),      group:'estilo'},
    {id:'sansSerif',         label:'𝖲𝖺𝗇𝗌 𝖲𝖾𝗋𝗂𝖿',                  fn:t=>byMap(t,CHAR_MAPS.sansSerif),        group:'estilo'},
    {id:'sansSerifBold',     label:'𝗦𝗮𝗻𝘀 𝗡𝗲𝗴𝗿𝗶𝘁𝗮',                fn:t=>byMap(t,CHAR_MAPS.sansSerifBold),    group:'estilo'},
    {id:'sansSerifItalic',   label:'𝘚𝘢𝘯𝘴 𝘐𝘵𝘢𝘭𝘪𝘤𝘢',               fn:SPECIAL.sansSerifItalic,    group:'estilo'},
    {id:'sansSerifBoldItalic',label:'𝙎𝙖𝙣𝙨 𝙉𝙚𝙜 𝙄𝙩𝙖𝙡',             fn:SPECIAL.sansSerifBoldItalic,group:'estilo'},
    {id:'mono',              label:'𝙼𝚘𝚗𝚘𝚎𝚜𝚙𝚊𝚌𝚒𝚊𝚍𝚘',               fn:t=>byMap(t,CHAR_MAPS.mono),             group:'estilo'},
    {id:'circled',           label:'Ⓒⓘⓡⓒⓤⓛⓐⓡ',                 fn:t=>byMap(t,CHAR_MAPS.circled),          group:'estilo'},
    {id:'fullwidth',         label:'Ａｎｃｈｏ　Ｃｏｍｐｌｅｔｏ',          fn:t=>byMap(t,CHAR_MAPS.fullwidth),        group:'estilo'},
    // ── Burbuja y Cuadrado ──────────────────────────────────────
    {id:'bubble',            label:'🅑🅤🅑🅑🅛🅔 Negro',             fn:SPECIAL.bubble,             group:'burbuja'},
    {id:'bubbleWhite',       label:'ⓑⓤⓑⓑⓛⓔ Blanco',             fn:SPECIAL.bubbleWhite,        group:'burbuja'},
    {id:'squareBlack',       label:'🅂🄲🅄🄰🅁🄴 Negro',            fn:SPECIAL.squareBlack,        group:'burbuja'},
    {id:'squareWhite',       label:'🄂🄌🄰🄳🄰🄳🄾 Blanco',          fn:SPECIAL.squareWhite,        group:'burbuja'},
    {id:'regional',          label:'🇷 🇪 🇬 🇮 🇴 🇳 🇦 🇱',        fn:SPECIAL.regional,           group:'burbuja'},
    // ── Efectos de overlay / combinando ─────────────────────────
    {id:'strikethrough',     label:'T̶a̶c̶h̶a̶d̶o̶',                    fn:SPECIAL.strikethrough,      group:'efecto'},
    {id:'strikethroughDash', label:'T̵a̵c̵h̵a̵d̵o̵ G̵u̵i̵ó̵n̵',              fn:SPECIAL.strikethroughDash,  group:'efecto'},
    {id:'slashthrough',      label:'S̸l̸a̸s̸h̸ T̸h̸r̸o̸u̸g̸h̸',               fn:SPECIAL.slashthrough,       group:'efecto'},
    {id:'underline',         label:'S̲u̲b̲r̲a̲y̲a̲d̲o̲',                    fn:SPECIAL.underline,          group:'efecto'},
    {id:'doubleUnder',       label:'S̳u̳b̳r̳a̳y̳a̳d̳o̳ ̳D̳o̳b̳l̳e̳',             fn:SPECIAL.doubleUnder,        group:'efecto'},
    {id:'wavy',              label:'W̴a̴v̴y̴ O̴n̴d̴u̴l̴a̴d̴o̴',               fn:SPECIAL.wavy,               group:'efecto'},
    {id:'tildeAbove',        label:'T̃ĩl̃d̃ẽ Ẽñ̃c̃ĩm̃ã',               fn:SPECIAL.tildeAbove,         group:'efecto'},
    {id:'dotAbove',          label:'Ṗu̇n̈ẗȯs Ȧr̈ṙi̊b̈ȧ',              fn:SPECIAL.dotAbove,           group:'efecto'},
    {id:'dotBelow',          label:'Ṗụṇṭọṣ Ạḅạjọ',                fn:SPECIAL.dotBelow,           group:'efecto'},
    {id:'zigzagUnder',       label:'Z͜i͜g͜z͜a͜g͜ S͜u͜b͜r͜a͜y͜a͜d͜o͜',          fn:SPECIAL.zigzagUnder,        group:'efecto'},
    {id:'flipped',           label:'ʇǝxʇo ᴉuʌǝɹʇᴉpo',             fn:SPECIAL.flipped,            group:'efecto'},
    {id:'mirror',            label:'ɿoɿɿiM Eꟼejado',               fn:SPECIAL.mirror,             group:'efecto'},
    {id:'morse',             label:'Código Morse',                  fn:SPECIAL.morse,              group:'efecto'},
    // ── Runas y Alfabetos Antiguos ───────────────────────────────
    {id:'runic',             label:'ᚨ ᛒ ᚲ ᛞ ᛖ Rúnico',            fn:SPECIAL.runic,              group:'antiguo'},
    {id:'elderFuthark',      label:'ᚫ ᛒ ᚳ ᛞ Elder Futhark',       fn:SPECIAL.elderFuthark,       group:'antiguo'},
    // ── Especiales ──────────────────────────────────────────────
    {id:'invisibleInk',      label:'I n v i s i b l e I n k ✦',   fn:SPECIAL.invisibleInk,       group:'especial'},
    {id:'zalgo',             label:'Z̬̞̙̖a̘̝̫l̜͔g͔̙͙o̞̞͕ G͚̙l͔i͕t̮̤c̮̰h̙',            fn:SPECIAL.zalgo,              group:'especial'},
  ];

  let selectedStyle=null;
  const inputText=document.getElementById('inputText');
  const charCount=document.getElementById('charCount');
  const clearBtn=document.getElementById('clearTextBtn');
  const stylesGrid=document.getElementById('stylesGrid');
  const previewArea=document.getElementById('stylePreviewArea');
  const previewText=document.getElementById('stylePreviewText');
  const styleName=document.getElementById('selectedStyleName');
  const copyBtn=document.getElementById('copyStyledText');

  // Grupos de estilos para mostrar encabezados
  const GROUP_LABELS = {
    'pequeño': '🔡 Texto Pequeño / Tiny Text',
    'estilo':  '✨ Estilos Unicode Clásicos',
    'burbuja': '🫧 Burbuja · Cuadrado · Regional',
    'efecto':  '🎨 Efectos Combinados',
    'antiguo': '᚛ Runas y Alfabetos Antiguos',
    'especial':'⚡ Especiales (Invisible Ink · Zalgo)',
  };

  function renderCards(text){
    stylesGrid.innerHTML='';
    let lastGroup = null;
    STYLES.forEach(style=>{
      // Insertar encabezado de grupo si cambia
      if(style.group !== lastGroup){
        lastGroup = style.group;
        const hdr = document.createElement('div');
        hdr.className = 'style-group-header';
        hdr.textContent = GROUP_LABELS[style.group] || style.group;
        stylesGrid.appendChild(hdr);
      }
      const conv=style.fn(text||'Vista previa');
      const card=document.createElement('div');
      card.className='style-card'+(selectedStyle===style.id?' selected':'');
      card.innerHTML=`<div class="style-card-name">${style.label}</div><div class="style-card-preview">${conv||'—'}</div>`;
      card.addEventListener('click',()=>{
        selectedStyle=style.id;
        document.querySelectorAll('.style-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        updatePreview(text);
      });
      stylesGrid.appendChild(card);
    });
  }

  function updatePreview(text){
    if(!selectedStyle)return;
    const style=STYLES.find(s=>s.id===selectedStyle);
    if(!style)return;
    previewText.textContent=style.fn(text||'');
    styleName.textContent=`Estilo: ${style.id}`;
    previewArea.style.display='block';
  }

  function onInput(){
    const t=inputText.value;
    charCount.textContent=[...t].length;
    renderCards(t);
    if(selectedStyle)updatePreview(t);
  }

  inputText.addEventListener('input',onInput);
  clearBtn.addEventListener('click',()=>{inputText.value='';charCount.textContent=0;selectedStyle=null;previewArea.style.display='none';renderCards('');});
  copyBtn.addEventListener('click',()=>{if(previewText.textContent)copyToClipboard(previewText.textContent);});

  function init(){renderCards(inputText.value);charCount.textContent=[...inputText.value].length;}
  return{init};
})();


// ================================================================
// SECCIÓN 5 — CONVERSOR RGBA ↔ HEX 🔄
// ================================================================
const RgbaConverter = (() => {

  const hexInput   = document.getElementById('hexInput');
  const hexMini    = document.getElementById('hexMiniSwatch');
  const hexToBtn   = document.getElementById('hexToRgbaBtn');
  const hexRgbaOut = document.getElementById('hexRgbaOut');
  const hexRgbOut  = document.getElementById('hexRgbOut');
  const hexAlphaOut= document.getElementById('hexAlphaOut');

  const convR      = document.getElementById('convR');
  const convG      = document.getElementById('convG');
  const convB      = document.getElementById('convB');
  const convA      = document.getElementById('convA');
  const alphaSlider= document.getElementById('alphaSlider');
  const alphaDisp  = document.getElementById('alphaDisplay');
  const rgbaToBtn  = document.getElementById('rgbaToHexBtn');
  const rgbaHexOut = document.getElementById('rgbaHexOut');
  const rgbaHex6Out= document.getElementById('rgbaHex6Out');
  const rgbaCssOut = document.getElementById('rgbaCssOut');

  const convSwatch = document.getElementById('convSwatch');
  const convSwatchVal= document.getElementById('convSwatchValue');
  const alphaTable = document.getElementById('alphaTable');

  /** Actualiza el swatch principal de la sección */
  function setConvSwatch(r,g,b,a){
    const hexColor = `#${n2h(r)}${n2h(g)}${n2h(b)}`;
    // Overlay de color sobre el fondo de damero
    convSwatch.style.background = `linear-gradient(rgba(${r},${g},${b},${a}),rgba(${r},${g},${b},${a}))`;
    convSwatchVal.textContent = hexColor.toUpperCase() + ' / α=' + parseFloat(a).toFixed(2);
  }

  /** HEX8 o HEX6 → RGBA */
  function doHexToRgba() {
    let raw = hexInput.value.trim().replace('#','');
    if(raw.length===3) raw=raw.split('').map(c=>c+c).join('');
    if(raw.length===6) raw+='ff';
    if(raw.length!==8 || !/^[0-9a-fA-F]{8}$/.test(raw)){
      hexRgbaOut.textContent='HEX inválido (usa 6 u 8 dígitos)';return;
    }
    const r=parseInt(raw.slice(0,2),16);
    const g=parseInt(raw.slice(2,4),16);
    const b=parseInt(raw.slice(4,6),16);
    const a=parseInt(raw.slice(6,8),16);
    const aNorm=(a/255).toFixed(3);
    const aPct=Math.round(a/255*100);
    hexRgbaOut.textContent  = `rgba(${r}, ${g}, ${b}, ${aNorm})`;
    hexRgbOut.textContent   = `rgb(${r}, ${g}, ${b})`;
    hexAlphaOut.textContent = `${aPct}% (${a}/255 → HEX: ${n2h(a).toUpperCase()})`;
    hexMini.style.background= `rgba(${r},${g},${b},${aNorm})`;
    setConvSwatch(r,g,b,aNorm);
  }

  /** RGBA → HEX8 */
  function doRgbaToHex() {
    const r=Math.round(Math.max(0,Math.min(255,+convR.value)));
    const g=Math.round(Math.max(0,Math.min(255,+convG.value)));
    const b=Math.round(Math.max(0,Math.min(255,+convB.value)));
    const a=Math.max(0,Math.min(1,+convA.value));
    const aHex=n2h(Math.round(a*255));
    rgbaHexOut.textContent  = `#${n2h(r)}${n2h(g)}${n2h(b)}${aHex}`.toUpperCase();
    rgbaHex6Out.textContent = `#${n2h(r)}${n2h(g)}${n2h(b)}`.toUpperCase();
    rgbaCssOut.textContent  = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    setConvSwatch(r,g,b,a);
  }

  // Sincronizar slider alfa con input numérico
  alphaSlider.addEventListener('input',e=>{
    convA.value=e.target.value;
    alphaDisp.textContent=parseFloat(e.target.value).toFixed(2);
  });
  convA.addEventListener('input',e=>{
    alphaSlider.value=e.target.value;
    alphaDisp.textContent=parseFloat(e.target.value||0).toFixed(2);
  });

  // Preview en vivo del HEX input
  hexInput.addEventListener('input',()=>{
    const raw=hexInput.value.trim().replace('#','');
    if(raw.length>=6){
      const r=parseInt(raw.slice(0,2).padEnd(2,'0'),16);
      const g=parseInt(raw.slice(2,4).padEnd(2,'0'),16);
      const b=parseInt(raw.slice(4,6).padEnd(2,'0'),16);
      hexMini.style.background=`rgb(${r},${g},${b})`;
    }
  });

  // Tabla de referencia de alfa
  function buildAlphaTable(){
    alphaTable.innerHTML='';
    const BASE_COLOR='#6C63FF';
    const {r,g,b}=hexToRgb(BASE_COLOR);
    const rows=[
      {pct:100,label:'100% — Opaco'},
      {pct:90, label:'90%'},
      {pct:75, label:'75%'},
      {pct:50, label:'50% — Semi'},
      {pct:25, label:'25%'},
      {pct:10, label:'10%'},
      {pct:5,  label:'5%'},
      {pct:0,  label:'0% — Transparente'},
    ];
    rows.forEach(row=>{
      const a=(row.pct/100);
      const aHex=n2h(Math.round(a*255)).toUpperCase();
      const div=document.createElement('div');
      div.className='alpha-row';
      div.title=`Clic para usar alfa ${row.pct}%`;
      div.innerHTML=`
        <div class="alpha-swatch" style="background:rgba(${r},${g},${b},${a})"></div>
        <div class="alpha-info">
          <span class="alpha-pct">${row.label}</span>
          <span class="alpha-hex">${aHex} / ${a.toFixed(2)}</span>
        </div>`;
      div.addEventListener('click',()=>{
        convA.value=a.toFixed(2);
        alphaSlider.value=a.toFixed(2);
        alphaDisp.textContent=a.toFixed(2);
      });
      alphaTable.appendChild(div);
    });
  }

  // Botones copiar de la sección conversor
  document.querySelectorAll('#rgba-converter .copy-btn[data-target]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const el=document.getElementById(btn.dataset.target);
      if(el&&el.textContent!=='—') copyToClipboard(el.textContent.trim());
    });
  });

  hexToBtn.addEventListener('click', doHexToRgba);
  rgbaToBtn.addEventListener('click', doRgbaToHex);
  hexInput.addEventListener('keydown',e=>{if(e.key==='Enter')doHexToRgba();});

  function init(){
    buildAlphaTable();
    // Estado inicial del swatch
    setConvSwatch(108,99,255,1);
    hexInput.value='#6C63FFff';
    hexMini.style.background='#6C63FF';
    doHexToRgba();
    doRgbaToHex();
  }
  return{init};
})();


// ================================================================
// NAVEGACIÓN
// ================================================================
const Navigation = (() => {
  const header  = document.getElementById('siteHeader');
  const hburg   = document.getElementById('hamburger');
  const nav     = document.getElementById('mainNav');
  const links   = document.querySelectorAll('.nav-link');
  const sections= document.querySelectorAll('.tool-section');

  window.addEventListener('scroll',()=>{
    header.classList.toggle('scrolled',window.scrollY>20);
    let cur='';
    sections.forEach(s=>{if(window.scrollY>=s.offsetTop-140)cur=s.id;});
    links.forEach(l=>l.classList.toggle('active',l.dataset.section===cur));
  });

  hburg.addEventListener('click',()=>{nav.classList.toggle('open');hburg.classList.toggle('active');});
  links.forEach(l=>l.addEventListener('click',()=>{nav.classList.remove('open');hburg.classList.remove('active');}));
})();


// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  ColorMaster.init();
  GradientForge.init();
  GameGradient.init();
  TextStyler.init();
  RgbaConverter.init();
  EmojiLibrary.init();
  console.log('💎 NIXBOX DECORER v3 — iniciado correctamente.');
});

// ================================================================
// SECCIÓN 6 — BIBLIOTECA DE EMOJIS 😀
// ================================================================
const EmojiLibrary = (() => {

  // ── Base de datos de emojis con nombre en español ────────────
  const EMOJI_DB = [
    // Caritas
    {e:'😀',n:'cara sonriente feliz',c:'Caritas'},
    {e:'😁',n:'cara con dientes amplia sonrisa',c:'Caritas'},
    {e:'😂',n:'cara llorando de risa',c:'Caritas'},
    {e:'🤣',n:'cara rodando de risa',c:'Caritas'},
    {e:'😃',n:'cara feliz ojos grandes',c:'Caritas'},
    {e:'😄',n:'cara muy feliz',c:'Caritas'},
    {e:'😅',n:'cara sudor sonrisa',c:'Caritas'},
    {e:'😆',n:'cara muy riéndose',c:'Caritas'},
    {e:'😉',n:'cara guiñando ojo',c:'Caritas'},
    {e:'😊',n:'cara sonrojada feliz',c:'Caritas'},
    {e:'😋',n:'cara saboreando delicioso',c:'Caritas'},
    {e:'😎',n:'cara con lentes genial',c:'Caritas'},
    {e:'😍',n:'cara enamorada corazones ojos',c:'Caritas'},
    {e:'🥰',n:'cara amor corazones',c:'Caritas'},
    {e:'😘',n:'cara mandando beso',c:'Caritas'},
    {e:'😗',n:'cara besando',c:'Caritas'},
    {e:'🤩',n:'cara estrellada emocionada',c:'Caritas'},
    {e:'🥳',n:'cara de fiesta celebración',c:'Caritas'},
    {e:'😏',n:'cara con media sonrisa cómplice',c:'Caritas'},
    {e:'😒',n:'cara aburrida molesta',c:'Caritas'},
    {e:'😞',n:'cara decepcionada triste',c:'Caritas'},
    {e:'😔',n:'cara pensativa melancólica',c:'Caritas'},
    {e:'😟',n:'cara preocupada',c:'Caritas'},
    {e:'😕',n:'cara confundida',c:'Caritas'},
    {e:'🙁',n:'cara levemente triste',c:'Caritas'},
    {e:'☹️',n:'cara triste ceño',c:'Caritas'},
    {e:'😣',n:'cara frustrada esforzándose',c:'Caritas'},
    {e:'😖',n:'cara confundida angustiada',c:'Caritas'},
    {e:'😫',n:'cara cansada exhausta',c:'Caritas'},
    {e:'😩',n:'cara cansada agotada',c:'Caritas'},
    {e:'🥺',n:'cara rogando ojos llorosos',c:'Caritas'},
    {e:'😢',n:'cara llorando una lágrima',c:'Caritas'},
    {e:'😭',n:'cara llorando mucho sollozando',c:'Caritas'},
    {e:'😤',n:'cara echando humo enojada',c:'Caritas'},
    {e:'😠',n:'cara enojada brava',c:'Caritas'},
    {e:'😡',n:'cara muy enojada furiosa roja',c:'Caritas'},
    {e:'🤬',n:'cara blasfemando insultando',c:'Caritas'},
    {e:'🤯',n:'cara explotando mente',c:'Caritas'},
    {e:'😳',n:'cara avergonzada sonrojada',c:'Caritas'},
    {e:'🥵',n:'cara caliente sudando',c:'Caritas'},
    {e:'🥶',n:'cara fría congelada',c:'Caritas'},
    {e:'😱',n:'cara gritando miedo horror',c:'Caritas'},
    {e:'😨',n:'cara asustada temiendo',c:'Caritas'},
    {e:'😰',n:'cara ansiosa sudando frío',c:'Caritas'},
    {e:'😥',n:'cara triste aliviada',c:'Caritas'},
    {e:'😓',n:'cara sudando cansancio estrés',c:'Caritas'},
    {e:'🤗',n:'cara abrazando manos',c:'Caritas'},
    {e:'🤔',n:'cara pensando reflexionando',c:'Caritas'},
    {e:'🫠',n:'cara derritiéndose',c:'Caritas'},
    {e:'🤭',n:'cara tapándose boca sorpresa',c:'Caritas'},
    {e:'🤫',n:'cara haciendo silencio cállate',c:'Caritas'},
    {e:'🤥',n:'cara mintiendo nariz larga',c:'Caritas'},
    {e:'😶',n:'cara sin boca',c:'Caritas'},
    {e:'😐',n:'cara neutral inexpresiva',c:'Caritas'},
    {e:'😑',n:'cara sin expresión aburrida',c:'Caritas'},
    {e:'😬',n:'cara muecas dientes apretados',c:'Caritas'},
    {e:'🙄',n:'cara ojos en blanco',c:'Caritas'},
    {e:'😯',n:'cara sorprendida boca abierta',c:'Caritas'},
    {e:'😦',n:'cara ceño fruncido boca abierta',c:'Caritas'},
    {e:'😧',n:'cara angustiada',c:'Caritas'},
    {e:'😮',n:'cara boca abierta sorprendida',c:'Caritas'},
    {e:'😲',n:'cara muy sorprendida asombrada',c:'Caritas'},
    {e:'🥱',n:'cara bostezando cansada',c:'Caritas'},
    {e:'😴',n:'cara durmiendo zzz',c:'Caritas'},
    {e:'🤤',n:'cara babeando',c:'Caritas'},
    {e:'😪',n:'cara somnolienta',c:'Caritas'},
    {e:'😵',n:'cara mareada aturdida',c:'Caritas'},
    {e:'🤐',n:'cara cerrando boca cremallera',c:'Caritas'},
    {e:'🥴',n:'cara tambaleante borracha',c:'Caritas'},
    {e:'🤢',n:'cara nauseabunda con ganas de vomitar',c:'Caritas'},
    {e:'🤮',n:'cara vomitando',c:'Caritas'},
    {e:'🤧',n:'cara estornudando resfriada',c:'Caritas'},
    {e:'😷',n:'cara con mascarilla enferma',c:'Caritas'},
    {e:'🤒',n:'cara enferma termómetro',c:'Caritas'},
    {e:'🤕',n:'cara herida vendaje',c:'Caritas'},
    {e:'🤑',n:'cara dinero billetes ojos',c:'Caritas'},
    {e:'😈',n:'cara diablito sonriendo',c:'Caritas'},
    {e:'👿',n:'cara diablo enojado',c:'Caritas'},
    {e:'💀',n:'calavera muerte',c:'Caritas'},
    {e:'☠️',n:'calavera huesos muerte',c:'Caritas'},
    {e:'👻',n:'fantasma espectro',c:'Caritas'},
    {e:'💩',n:'caca excremento divertido',c:'Caritas'},
    {e:'🤡',n:'payaso',c:'Caritas'},
    {e:'👹',n:'ogro monstruo',c:'Caritas'},
    {e:'👺',n:'duende goblin japonés',c:'Caritas'},
    {e:'👾',n:'marciano videojuego',c:'Caritas'},
    {e:'🤖',n:'robot androide',c:'Caritas'},
    {e:'😺',n:'gato sonriente cara',c:'Caritas'},
    {e:'😸',n:'gato riendo cara',c:'Caritas'},
    {e:'😹',n:'gato llorando risa cara',c:'Caritas'},
    {e:'😻',n:'gato enamorado corazones cara',c:'Caritas'},
    {e:'😼',n:'gato irónico cara',c:'Caritas'},
    {e:'😽',n:'gato besando cara',c:'Caritas'},
    {e:'🙀',n:'gato asustado cara',c:'Caritas'},
    {e:'😿',n:'gato llorando cara',c:'Caritas'},
    {e:'😾',n:'gato enojado cara',c:'Caritas'},
    // Gestos y manos
    {e:'👍',n:'pulgar arriba aprobación',c:'Manos'},
    {e:'👎',n:'pulgar abajo desaprobación',c:'Manos'},
    {e:'👌',n:'ok perfecto bien',c:'Manos'},
    {e:'🤌',n:'gesto italiano perfección',c:'Manos'},
    {e:'✌️',n:'paz victoria dos dedos',c:'Manos'},
    {e:'🤞',n:'dedos cruzados buena suerte',c:'Manos'},
    {e:'🤟',n:'te quiero mano',c:'Manos'},
    {e:'🤘',n:'cuernos rock metal',c:'Manos'},
    {e:'🤙',n:'llámame shaka ola',c:'Manos'},
    {e:'👈',n:'señalando izquierda',c:'Manos'},
    {e:'👉',n:'señalando derecha',c:'Manos'},
    {e:'👆',n:'señalando arriba',c:'Manos'},
    {e:'👇',n:'señalando abajo',c:'Manos'},
    {e:'☝️',n:'dedo índice arriba',c:'Manos'},
    {e:'✋',n:'mano levantada stop',c:'Manos'},
    {e:'🤚',n:'dorso mano levantada',c:'Manos'},
    {e:'🖐️',n:'mano cinco dedos',c:'Manos'},
    {e:'🖖',n:'saludo vulcano star trek',c:'Manos'},
    {e:'👋',n:'mano saludando hola adiós',c:'Manos'},
    {e:'🤏',n:'pellizco poquito',c:'Manos'},
    {e:'✍️',n:'escribiendo mano pluma',c:'Manos'},
    {e:'🤝',n:'apretón de manos trato',c:'Manos'},
    {e:'🙌',n:'aplausos celebración manos arriba',c:'Manos'},
    {e:'👏',n:'aplausos palmas',c:'Manos'},
    {e:'🤲',n:'palmas unidas rogando',c:'Manos'},
    {e:'🙏',n:'manos juntas rezo gracias',c:'Manos'},
    {e:'💪',n:'músculo brazo fuerte',c:'Manos'},
    {e:'🦾',n:'brazo mecánico robótico',c:'Manos'},
    {e:'🖕',n:'dedo medio insulto',c:'Manos'},
    {e:'🫶',n:'corazón manos amor',c:'Manos'},
    {e:'🫵',n:'señalándote',c:'Manos'},
    // Corazones y amor
    {e:'❤️',n:'corazón rojo amor',c:'Amor'},
    {e:'🧡',n:'corazón naranja',c:'Amor'},
    {e:'💛',n:'corazón amarillo',c:'Amor'},
    {e:'💚',n:'corazón verde',c:'Amor'},
    {e:'💙',n:'corazón azul',c:'Amor'},
    {e:'💜',n:'corazón morado violeta',c:'Amor'},
    {e:'🖤',n:'corazón negro',c:'Amor'},
    {e:'🤍',n:'corazón blanco',c:'Amor'},
    {e:'🤎',n:'corazón marrón café',c:'Amor'},
    {e:'💔',n:'corazón roto desamor',c:'Amor'},
    {e:'❤️‍🔥',n:'corazón en llamas pasión',c:'Amor'},
    {e:'❤️‍🩹',n:'corazón curado herido',c:'Amor'},
    {e:'💕',n:'dos corazones amor',c:'Amor'},
    {e:'💞',n:'corazones girando',c:'Amor'},
    {e:'💓',n:'corazón latiendo',c:'Amor'},
    {e:'💗',n:'corazón creciendo',c:'Amor'},
    {e:'💖',n:'corazón brillante chispa',c:'Amor'},
    {e:'💘',n:'corazón flecha cupido',c:'Amor'},
    {e:'💝',n:'corazón lazo regalo',c:'Amor'},
    {e:'💟',n:'ornamento corazón',c:'Amor'},
    {e:'♥️',n:'palo corazón cartas',c:'Amor'},
    {e:'💌',n:'carta de amor sobre',c:'Amor'},
    {e:'💑',n:'pareja enamorada corazón',c:'Amor'},
    {e:'👫',n:'hombre mujer pareja',c:'Amor'},
    {e:'💏',n:'pareja besándose',c:'Amor'},
    // Animales
    {e:'🐶',n:'perro cara cachorro',c:'Animales'},
    {e:'🐱',n:'gato cara gatito',c:'Animales'},
    {e:'🐭',n:'ratón cara',c:'Animales'},
    {e:'🐹',n:'hámster cara',c:'Animales'},
    {e:'🐰',n:'conejo cara',c:'Animales'},
    {e:'🦊',n:'zorro cara',c:'Animales'},
    {e:'🐻',n:'oso cara',c:'Animales'},
    {e:'🐼',n:'panda cara',c:'Animales'},
    {e:'🐨',n:'koala cara',c:'Animales'},
    {e:'🐯',n:'tigre cara',c:'Animales'},
    {e:'🦁',n:'león cara',c:'Animales'},
    {e:'🐮',n:'vaca cara',c:'Animales'},
    {e:'🐷',n:'cerdo cara cerdito',c:'Animales'},
    {e:'🐸',n:'rana cara',c:'Animales'},
    {e:'🐵',n:'mono cara',c:'Animales'},
    {e:'🙈',n:'mono tapando ojos no ver',c:'Animales'},
    {e:'🙉',n:'mono tapando orejas no oir',c:'Animales'},
    {e:'🙊',n:'mono tapando boca no hablar',c:'Animales'},
    {e:'🐔',n:'pollo gallina',c:'Animales'},
    {e:'🐧',n:'pingüino',c:'Animales'},
    {e:'🐦',n:'pájaro ave',c:'Animales'},
    {e:'🦆',n:'pato',c:'Animales'},
    {e:'🦅',n:'águila',c:'Animales'},
    {e:'🦉',n:'búho lechuza',c:'Animales'},
    {e:'🦇',n:'murciélago',c:'Animales'},
    {e:'🐺',n:'lobo',c:'Animales'},
    {e:'🐗',n:'jabalí cerdo salvaje',c:'Animales'},
    {e:'🐴',n:'caballo cara',c:'Animales'},
    {e:'🦄',n:'unicornio',c:'Animales'},
    {e:'🐝',n:'abeja',c:'Animales'},
    {e:'🪱',n:'gusano',c:'Animales'},
    {e:'🐛',n:'oruga gusano',c:'Animales'},
    {e:'🦋',n:'mariposa',c:'Animales'},
    {e:'🐌',n:'caracol',c:'Animales'},
    {e:'🐞',n:'mariquita',c:'Animales'},
    {e:'🐜',n:'hormiga',c:'Animales'},
    {e:'🦟',n:'mosquito',c:'Animales'},
    {e:'🦗',n:'grillo',c:'Animales'},
    {e:'🕷️',n:'araña',c:'Animales'},
    {e:'🦂',n:'escorpión',c:'Animales'},
    {e:'🐢',n:'tortuga',c:'Animales'},
    {e:'🦎',n:'lagarto',c:'Animales'},
    {e:'🐍',n:'serpiente',c:'Animales'},
    {e:'🦕',n:'dinosaurio brontosaurio',c:'Animales'},
    {e:'🦖',n:'tiranosaurio rex dinosaurio',c:'Animales'},
    {e:'🦕',n:'saurópodo dinosaurio',c:'Animales'},
    {e:'🐳',n:'ballena soplando',c:'Animales'},
    {e:'🐬',n:'delfín',c:'Animales'},
    {e:'🦭',n:'foca',c:'Animales'},
    {e:'🐟',n:'pez',c:'Animales'},
    {e:'🐠',n:'pez tropical',c:'Animales'},
    {e:'🦈',n:'tiburón',c:'Animales'},
    {e:'🐙',n:'pulpo',c:'Animales'},
    {e:'🦑',n:'calamar',c:'Animales'},
    {e:'🦞',n:'langosta',c:'Animales'},
    {e:'🦀',n:'cangrejo',c:'Animales'},
    {e:'🐊',n:'cocodrilo',c:'Animales'},
    {e:'🦓',n:'cebra',c:'Animales'},
    {e:'🦍',n:'gorila',c:'Animales'},
    {e:'🐘',n:'elefante',c:'Animales'},
    {e:'🦛',n:'hipopótamo',c:'Animales'},
    {e:'🦏',n:'rinoceronte',c:'Animales'},
    {e:'🐪',n:'camello',c:'Animales'},
    {e:'🦒',n:'jirafa',c:'Animales'},
    {e:'🦘',n:'canguro',c:'Animales'},
    {e:'🦬',n:'bisonte',c:'Animales'},
    {e:'🐃',n:'búfalo toro',c:'Animales'},
    {e:'🦙',n:'llama alpaca',c:'Animales'},
    {e:'🐑',n:'oveja',c:'Animales'},
    {e:'🐐',n:'cabra',c:'Animales'},
    {e:'🦌',n:'ciervo reno',c:'Animales'},
    {e:'🐕',n:'perro',c:'Animales'},
    {e:'🐈',n:'gato',c:'Animales'},
    {e:'🐓',n:'gallo',c:'Animales'},
    {e:'🦃',n:'pavo',c:'Animales'},
    {e:'🦤',n:'dodo',c:'Animales'},
    {e:'🦚',n:'pavo real',c:'Animales'},
    {e:'🦜',n:'loro papagayo',c:'Animales'},
    {e:'🦢',n:'cisne',c:'Animales'},
    {e:'🦩',n:'flamenco',c:'Animales'},
    {e:'🕊️',n:'paloma paz',c:'Animales'},
    {e:'🐇',n:'conejo',c:'Animales'},
    {e:'🦝',n:'mapache',c:'Animales'},
    {e:'🦨',n:'zorrillo mofeta',c:'Animales'},
    {e:'🦡',n:'tejón',c:'Animales'},
    {e:'🦫',n:'castor',c:'Animales'},
    {e:'🦦',n:'nutria',c:'Animales'},
    {e:'🦥',n:'perezoso',c:'Animales'},
    {e:'🐿️',n:'ardilla',c:'Animales'},
    {e:'🦔',n:'erizo',c:'Animales'},
    {e:'🐾',n:'huellas patas animal',c:'Animales'},
    {e:'🐉',n:'dragón',c:'Animales'},
    {e:'🦕',n:'dinosaurio',c:'Animales'},
    // Comida
    {e:'🍎',n:'manzana roja',c:'Comida'},
    {e:'🍊',n:'naranja mandarina',c:'Comida'},
    {e:'🍋',n:'limón',c:'Comida'},
    {e:'🍇',n:'uvas',c:'Comida'},
    {e:'🍓',n:'fresa',c:'Comida'},
    {e:'🫐',n:'arándanos',c:'Comida'},
    {e:'🍈',n:'melón',c:'Comida'},
    {e:'🍉',n:'sandía',c:'Comida'},
    {e:'🍑',n:'melocotón durazno',c:'Comida'},
    {e:'🍒',n:'cerezas',c:'Comida'},
    {e:'🍍',n:'piña',c:'Comida'},
    {e:'🥭',n:'mango',c:'Comida'},
    {e:'🥥',n:'coco',c:'Comida'},
    {e:'🍌',n:'plátano banana',c:'Comida'},
    {e:'🥝',n:'kiwi',c:'Comida'},
    {e:'🍅',n:'tomate',c:'Comida'},
    {e:'🫒',n:'aceituna oliva',c:'Comida'},
    {e:'🥑',n:'aguacate palta',c:'Comida'},
    {e:'🍆',n:'berenjena',c:'Comida'},
    {e:'🥦',n:'brócoli',c:'Comida'},
    {e:'🥕',n:'zanahoria',c:'Comida'},
    {e:'🌽',n:'maíz choclo',c:'Comida'},
    {e:'🌶️',n:'chile pimiento picante',c:'Comida'},
    {e:'🍕',n:'pizza',c:'Comida'},
    {e:'🍔',n:'hamburguesa',c:'Comida'},
    {e:'🌮',n:'taco',c:'Comida'},
    {e:'🌯',n:'burrito wrap',c:'Comida'},
    {e:'🥙',n:'pita shawarma',c:'Comida'},
    {e:'🍜',n:'ramen fideos',c:'Comida'},
    {e:'🍝',n:'espagueti pasta',c:'Comida'},
    {e:'🍣',n:'sushi',c:'Comida'},
    {e:'🍱',n:'bento box japonés',c:'Comida'},
    {e:'🍛',n:'curry arroz',c:'Comida'},
    {e:'🍚',n:'arroz cocido',c:'Comida'},
    {e:'🥗',n:'ensalada verde',c:'Comida'},
    {e:'🍗',n:'pollo muslo',c:'Comida'},
    {e:'🥓',n:'tocino bacon',c:'Comida'},
    {e:'🍖',n:'carne hueso',c:'Comida'},
    {e:'🌭',n:'perro caliente hot dog',c:'Comida'},
    {e:'🍟',n:'papas fritas',c:'Comida'},
    {e:'🍦',n:'helado cono',c:'Comida'},
    {e:'🍩',n:'dona rosquilla',c:'Comida'},
    {e:'🍪',n:'galleta cookie',c:'Comida'},
    {e:'🎂',n:'pastel cumpleaños torta',c:'Comida'},
    {e:'🍰',n:'pastel rebanada torta',c:'Comida'},
    {e:'🍫',n:'chocolate',c:'Comida'},
    {e:'🍬',n:'caramelo dulce',c:'Comida'},
    {e:'🍭',n:'piruleta paleta',c:'Comida'},
    {e:'☕',n:'café taza caliente',c:'Comida'},
    {e:'🍵',n:'té verde matcha',c:'Comida'},
    {e:'🧃',n:'jugo caja refresco',c:'Comida'},
    {e:'🥤',n:'refresco vaso pajita',c:'Comida'},
    {e:'🧋',n:'bubble tea boba',c:'Comida'},
    {e:'🍺',n:'cerveza jarra',c:'Comida'},
    {e:'🍻',n:'cervezas brindis',c:'Comida'},
    {e:'🥂',n:'copas champán brindis',c:'Comida'},
    {e:'🍷',n:'vino copa rojo',c:'Comida'},
    {e:'🍸',n:'cóctel copa martini',c:'Comida'},
    {e:'🥃',n:'whisky vaso corto',c:'Comida'},
    {e:'🍹',n:'cóctel tropical',c:'Comida'},
    // Naturaleza
    {e:'🌸',n:'flor de cerezo sakura',c:'Naturaleza'},
    {e:'🌺',n:'hibisco flor tropical',c:'Naturaleza'},
    {e:'🌹',n:'rosa flor amor',c:'Naturaleza'},
    {e:'🌻',n:'girasol sol',c:'Naturaleza'},
    {e:'🌼',n:'margarita flor amarilla',c:'Naturaleza'},
    {e:'💐',n:'ramo flores bouquet',c:'Naturaleza'},
    {e:'🌷',n:'tulipán',c:'Naturaleza'},
    {e:'🪷',n:'loto flor',c:'Naturaleza'},
    {e:'🌱',n:'plántula brote semilla',c:'Naturaleza'},
    {e:'🌿',n:'hierbas hoja verde',c:'Naturaleza'},
    {e:'🍀',n:'trébol cuatro hojas suerte',c:'Naturaleza'},
    {e:'🍁',n:'hoja arce otoño',c:'Naturaleza'},
    {e:'🍂',n:'hojas caídas otoño',c:'Naturaleza'},
    {e:'🍃',n:'hojas volando viento',c:'Naturaleza'},
    {e:'🌲',n:'árbol pino',c:'Naturaleza'},
    {e:'🌳',n:'árbol grande',c:'Naturaleza'},
    {e:'🎄',n:'árbol navidad christmas',c:'Naturaleza'},
    {e:'🎋',n:'bambú suerte',c:'Naturaleza'},
    {e:'🌵',n:'cactus desierto',c:'Naturaleza'},
    {e:'🌊',n:'ola mar agua',c:'Naturaleza'},
    {e:'🌈',n:'arcoiris arcoíris',c:'Naturaleza'},
    {e:'⭐',n:'estrella',c:'Naturaleza'},
    {e:'🌟',n:'estrella brillante',c:'Naturaleza'},
    {e:'💫',n:'estrella girando destello',c:'Naturaleza'},
    {e:'⚡',n:'rayo electricidad',c:'Naturaleza'},
    {e:'🔥',n:'fuego llama',c:'Naturaleza'},
    {e:'❄️',n:'copo nieve frío',c:'Naturaleza'},
    {e:'🌙',n:'luna creciente noche',c:'Naturaleza'},
    {e:'☀️',n:'sol calor día',c:'Naturaleza'},
    {e:'🌤️',n:'sol nubes parcial',c:'Naturaleza'},
    {e:'⛅',n:'nubes parcialmente nublado',c:'Naturaleza'},
    {e:'🌧️',n:'lluvia nublado',c:'Naturaleza'},
    {e:'⛈️',n:'tormenta rayos lluvia',c:'Naturaleza'},
    {e:'🌪️',n:'tornado torbellino',c:'Naturaleza'},
    {e:'🌫️',n:'niebla neblina',c:'Naturaleza'},
    {e:'🌊',n:'ola tsunami agua',c:'Naturaleza'},
    {e:'🌋',n:'volcán erupción',c:'Naturaleza'},
    {e:'🏔️',n:'montaña nevada',c:'Naturaleza'},
    {e:'🌍',n:'tierra planeta africa europa',c:'Naturaleza'},
    {e:'🌎',n:'tierra planeta america',c:'Naturaleza'},
    {e:'🌏',n:'tierra planeta asia',c:'Naturaleza'},
    // Objetos y símbolos
    {e:'💎',n:'diamante gema joya',c:'Objetos'},
    {e:'👑',n:'corona rey reina',c:'Objetos'},
    {e:'🏆',n:'trofeo campeón',c:'Objetos'},
    {e:'🥇',n:'medalla oro primer lugar',c:'Objetos'},
    {e:'🥈',n:'medalla plata segundo lugar',c:'Objetos'},
    {e:'🥉',n:'medalla bronce tercer lugar',c:'Objetos'},
    {e:'🎖️',n:'medalla honor',c:'Objetos'},
    {e:'🎗️',n:'cinta lazo conciencia',c:'Objetos'},
    {e:'🎁',n:'regalo paquete sorpresa',c:'Objetos'},
    {e:'🎀',n:'lazo moño regalo',c:'Objetos'},
    {e:'🎊',n:'confeti globo celebración',c:'Objetos'},
    {e:'🎉',n:'fiesta celebración confeti',c:'Objetos'},
    {e:'🎈',n:'globo fiesta',c:'Objetos'},
    {e:'🎆',n:'fuegos artificiales',c:'Objetos'},
    {e:'🎇',n:'bengala fuegos artificiales',c:'Objetos'},
    {e:'✨',n:'destellos brillos estrellas',c:'Objetos'},
    {e:'🌠',n:'estrella fugaz',c:'Objetos'},
    {e:'🎵',n:'nota musical',c:'Objetos'},
    {e:'🎶',n:'notas musicales',c:'Objetos'},
    {e:'🎸',n:'guitarra eléctrica',c:'Objetos'},
    {e:'🎹',n:'piano teclado',c:'Objetos'},
    {e:'🥁',n:'batería tambores',c:'Objetos'},
    {e:'🎺',n:'trompeta',c:'Objetos'},
    {e:'🎻',n:'violín',c:'Objetos'},
    {e:'🎮',n:'videojuego control mando',c:'Objetos'},
    {e:'🕹️',n:'joystick arcade',c:'Objetos'},
    {e:'🎲',n:'dado juego azar',c:'Objetos'},
    {e:'♟️',n:'ajedrez peón',c:'Objetos'},
    {e:'🎯',n:'diana dardo blanco objetivo',c:'Objetos'},
    {e:'🎳',n:'boliche bowling',c:'Objetos'},
    {e:'📱',n:'teléfono móvil celular',c:'Objetos'},
    {e:'💻',n:'laptop computadora portátil',c:'Objetos'},
    {e:'🖥️',n:'monitor computadora desktop',c:'Objetos'},
    {e:'⌨️',n:'teclado',c:'Objetos'},
    {e:'🖨️',n:'impresora',c:'Objetos'},
    {e:'🖱️',n:'ratón mouse',c:'Objetos'},
    {e:'📷',n:'cámara foto',c:'Objetos'},
    {e:'📸',n:'cámara flash foto',c:'Objetos'},
    {e:'🎥',n:'cámara video',c:'Objetos'},
    {e:'📺',n:'televisión tv',c:'Objetos'},
    {e:'📻',n:'radio',c:'Objetos'},
    {e:'🔋',n:'batería carga',c:'Objetos'},
    {e:'🔌',n:'enchufe electricidad',c:'Objetos'},
    {e:'💡',n:'bombilla idea luz',c:'Objetos'},
    {e:'🔦',n:'linterna',c:'Objetos'},
    {e:'🕯️',n:'vela',c:'Objetos'},
    {e:'🗑️',n:'papelera basura',c:'Objetos'},
    {e:'🔑',n:'llave',c:'Objetos'},
    {e:'🗝️',n:'llave antigua',c:'Objetos'},
    {e:'🔒',n:'candado cerrado',c:'Objetos'},
    {e:'🔓',n:'candado abierto',c:'Objetos'},
    {e:'🔨',n:'martillo herramienta',c:'Objetos'},
    {e:'⚙️',n:'engranaje configuración',c:'Objetos'},
    {e:'🔧',n:'llave inglesa herramienta',c:'Objetos'},
    {e:'🧲',n:'imán',c:'Objetos'},
    {e:'💣',n:'bomba explosión',c:'Objetos'},
    {e:'🔫',n:'pistola agua',c:'Objetos'},
    {e:'⚔️',n:'espadas cruzadas combate',c:'Objetos'},
    {e:'🛡️',n:'escudo defensa',c:'Objetos'},
    {e:'🪄',n:'varita mágica',c:'Objetos'},
    {e:'🔮',n:'bola cristal magia',c:'Objetos'},
    {e:'📚',n:'libros lectura',c:'Objetos'},
    {e:'📖',n:'libro abierto leer',c:'Objetos'},
    {e:'✏️',n:'lápiz escribir',c:'Objetos'},
    {e:'🖊️',n:'pluma escribir',c:'Objetos'},
    {e:'📝',n:'bloc notas escribir',c:'Objetos'},
    {e:'📌',n:'chincheta marcador',c:'Objetos'},
    {e:'📎',n:'clip sujetador',c:'Objetos'},
    {e:'✂️',n:'tijeras cortar',c:'Objetos'},
    {e:'🧪',n:'tubo prueba laboratorio',c:'Objetos'},
    {e:'🔬',n:'microscopio ciencia',c:'Objetos'},
    {e:'🔭',n:'telescopio espacio',c:'Objetos'},
    {e:'💊',n:'pastilla medicamento',c:'Objetos'},
    {e:'⏳',n:'reloj arena tiempo espera cargando',c:'Objetos'},
    {e:'⌛',n:'reloj arena lleno tiempo acabando',c:'Objetos'},
    {e:'⏰',n:'reloj despertador alarma',c:'Objetos'},
    {e:'⏱️',n:'cronómetro tiempo récord',c:'Objetos'},
    {e:'⏲️',n:'temporizador cocina tiempo',c:'Objetos'},
    {e:'🕐',n:'reloj una hora 1:00',c:'Objetos'},
    {e:'🕑',n:'reloj dos horas 2:00',c:'Objetos'},
    {e:'🕒',n:'reloj tres horas 3:00',c:'Objetos'},
    {e:'🕓',n:'reloj cuatro horas 4:00',c:'Objetos'},
    {e:'🕔',n:'reloj cinco horas 5:00',c:'Objetos'},
    {e:'🕕',n:'reloj seis horas 6:00',c:'Objetos'},
    {e:'🕖',n:'reloj siete horas 7:00',c:'Objetos'},
    {e:'🕗',n:'reloj ocho horas 8:00',c:'Objetos'},
    {e:'🕘',n:'reloj nueve horas 9:00',c:'Objetos'},
    {e:'🕙',n:'reloj diez horas 10:00',c:'Objetos'},
    {e:'🕚',n:'reloj once horas 11:00',c:'Objetos'},
    {e:'🕛',n:'reloj doce horas 12:00',c:'Objetos'},
    {e:'🕜',n:'reloj una y media 1:30',c:'Objetos'},
    {e:'🕝',n:'reloj dos y media 2:30',c:'Objetos'},
    {e:'🕞',n:'reloj tres y media 3:30',c:'Objetos'},
    {e:'🕟',n:'reloj cuatro y media 4:30',c:'Objetos'},
    {e:'🕠',n:'reloj cinco y media 5:30',c:'Objetos'},
    {e:'🕡',n:'reloj seis y media 6:30',c:'Objetos'},
    {e:'🕢',n:'reloj siete y media 7:30',c:'Objetos'},
    {e:'🕣',n:'reloj ocho y media 8:30',c:'Objetos'},
    {e:'🕤',n:'reloj nueve y media 9:30',c:'Objetos'},
    {e:'🕥',n:'reloj diez y media 10:30',c:'Objetos'},
    {e:'🕦',n:'reloj once y media 11:30',c:'Objetos'},
    {e:'🕧',n:'reloj doce y media 12:30',c:'Objetos'},
    {e:'📅',n:'calendario fecha día evento',c:'Objetos'},
    {e:'📆',n:'calendario arrancable mes',c:'Objetos'},
    {e:'🗓️',n:'calendario espiral planificador',c:'Objetos'},
    {e:'📇',n:'tarjetero índice fichero',c:'Objetos'},
    {e:'🗃️',n:'archivador fichero carpeta',c:'Objetos'},
    {e:'🗄️',n:'gabinete archivos cajones',c:'Objetos'},
    {e:'🗑️',n:'papelera basura borrar',c:'Objetos'},
    {e:'🔒',n:'candado cerrado bloqueo seguridad',c:'Objetos'},
    {e:'🔓',n:'candado abierto desbloqueado',c:'Objetos'},
    {e:'🔐',n:'candado llave cerrado con llave',c:'Objetos'},
    {e:'🔑',n:'llave acceso contraseña',c:'Objetos'},
    {e:'🗝️',n:'llave antigua vieja retro',c:'Objetos'},
    {e:'🔨',n:'martillo herramienta golpe',c:'Objetos'},
    {e:'⚒️',n:'martillo pico minería',c:'Objetos'},
    {e:'🛠️',n:'martillo llave herramientas',c:'Objetos'},
    {e:'⛏️',n:'pico minar minecraft',c:'Objetos'},
    {e:'🪓',n:'hacha cortar leña',c:'Objetos'},
    {e:'🔧',n:'llave inglesa reparar mecánico',c:'Objetos'},
    {e:'🔩',n:'tornillo tuerca herramienta',c:'Objetos'},
    {e:'⚙️',n:'engranaje configuración ajustes',c:'Objetos'},
    {e:'🪤',n:'trampa ratonera cepo',c:'Objetos'},
    {e:'🧲',n:'imán magnético metales',c:'Objetos'},
    {e:'💡',n:'bombilla idea luz',c:'Objetos'},
    {e:'🔦',n:'linterna luz oscuridad',c:'Objetos'},
    {e:'🕯️',n:'vela luz romántica',c:'Objetos'},
    {e:'🪔',n:'lámpara aceite diya',c:'Objetos'},
    {e:'🧯',n:'extintor fuego emergencia',c:'Objetos'},
    {e:'🛢️',n:'barril petróleo aceite',c:'Objetos'},
    {e:'💰',n:'bolsa dinero riqueza',c:'Objetos'},
    {e:'💵',n:'billete dólar dinero',c:'Objetos'},
    {e:'💴',n:'billete yen japón',c:'Objetos'},
    {e:'💶',n:'billete euro europa',c:'Objetos'},
    {e:'💷',n:'billete libra reino unido',c:'Objetos'},
    {e:'💸',n:'dinero volando gasto',c:'Objetos'},
    {e:'💳',n:'tarjeta crédito pago',c:'Objetos'},
    {e:'🪙',n:'moneda dinero oro',c:'Objetos'},
    {e:'📱',n:'teléfono móvil celular smartphone',c:'Objetos'},
    {e:'📲',n:'teléfono flecha llamada',c:'Objetos'},
    {e:'💻',n:'computadora laptop ordenador',c:'Objetos'},
    {e:'🖥️',n:'monitor pantalla escritorio',c:'Objetos'},
    {e:'🖨️',n:'impresora papel imprimir',c:'Objetos'},
    {e:'⌨️',n:'teclado escribir mecanografía',c:'Objetos'},
    {e:'🖱️',n:'ratón mouse computadora',c:'Objetos'},
    {e:'💾',n:'disquete guardar almacenamiento',c:'Objetos'},
    {e:'💿',n:'disco CD música',c:'Objetos'},
    {e:'📀',n:'disco DVD película',c:'Objetos'},
    {e:'🧮',n:'ábaco calculadora contar',c:'Objetos'},
    {e:'📷',n:'cámara foto fotografía',c:'Objetos'},
    {e:'📸',n:'cámara flash fotografía',c:'Objetos'},
    {e:'📹',n:'cámara vídeo grabación',c:'Objetos'},
    {e:'🎥',n:'cámara cine película',c:'Objetos'},
    {e:'📽️',n:'proyector cine película',c:'Objetos'},
    {e:'🎞️',n:'rollo película cine',c:'Objetos'},
    {e:'📞',n:'teléfono auricular llamada',c:'Objetos'},
    {e:'☎️',n:'teléfono antiguo retro',c:'Objetos'},
    {e:'📟',n:'buscapersonas pager',c:'Objetos'},
    {e:'📠',n:'fax máquina documento',c:'Objetos'},
    {e:'📺',n:'televisión TV pantalla',c:'Objetos'},
    {e:'📻',n:'radio música emisora',c:'Objetos'},
    {e:'🧭',n:'brújula dirección norte navegación',c:'Objetos'},
    {e:'⌚',n:'reloj pulsera muñeca hora',c:'Objetos'},
    {e:'🧱',n:'ladrillo construcción muro',c:'Objetos'},
    {e:'🪟',n:'ventana cristal vista',c:'Objetos'},
    {e:'🪞',n:'espejo reflejo vanidad',c:'Objetos'},
    {e:'🛋️',n:'sofá mueble sala estar',c:'Objetos'},
    {e:'🪑',n:'silla mueble sentarse',c:'Objetos'},
    {e:'🚽',n:'inodoro baño servicio',c:'Objetos'},
    {e:'🪠',n:'desatascador fontanería',c:'Objetos'},
    {e:'🚿',n:'ducha baño agua',c:'Objetos'},
    {e:'🛁',n:'bañera baño relajarse',c:'Objetos'},
    {e:'🧴',n:'loción crema jabón botella',c:'Objetos'},
    {e:'🧷',n:'imperdible seguro alfiler',c:'Objetos'},
    {e:'🧹',n:'escoba barrer limpiar',c:'Objetos'},
    {e:'🧺',n:'cesta ropa lavandería',c:'Objetos'},
    {e:'🧻',n:'papel higiénico rollo',c:'Objetos'},
    {e:'🪣',n:'cubo balde agua limpieza',c:'Objetos'},
    {e:'🧼',n:'jabón limpiar higiene',c:'Objetos'},
    {e:'🪥',n:'cepillo dientes dental higiene',c:'Objetos'},
    {e:'🪒',n:'maquinilla afeitar navaja',c:'Objetos'},
    {e:'🧽',n:'esponja limpiar fregar',c:'Objetos'},
    {e:'🧯',n:'extintor fuego seguridad',c:'Objetos'},
    {e:'🛒',n:'carrito compras supermercado',c:'Objetos'},
    {e:'🚪',n:'puerta entrada salida',c:'Objetos'},
    {e:'📦',n:'caja paquete envío',c:'Objetos'},
    {e:'📫',n:'buzón correo cartas',c:'Objetos'},
    {e:'📬',n:'buzón abierto correo',c:'Objetos'},
    {e:'📭',n:'buzón vacío correo',c:'Objetos'},
    {e:'📮',n:'buzón rojo correo',c:'Objetos'},
    {e:'🗳️',n:'urna voto elecciones',c:'Objetos'},
    {e:'✏️',n:'lápiz escribir dibujar',c:'Objetos'},
    {e:'✒️',n:'pluma tinta escribir',c:'Objetos'},
    {e:'🖋️',n:'pluma estilográfica escribir',c:'Objetos'},
    {e:'🖊️',n:'bolígrafo escribir',c:'Objetos'},
    {e:'📝',n:'bloc notas escribir memo',c:'Objetos'},
    {e:'📋',n:'portapapeles lista notas',c:'Objetos'},
    {e:'📁',n:'carpeta archivos directorio',c:'Objetos'},
    {e:'📂',n:'carpeta abierta archivos',c:'Objetos'},
    {e:'🗂️',n:'organizador carpetas índice',c:'Objetos'},
    {e:'🗒️',n:'libreta notas espiral',c:'Objetos'},
    {e:'📓',n:'cuaderno notas libreta',c:'Objetos'},
    {e:'📔',n:'cuaderno decorado diario',c:'Objetos'},
    {e:'📒',n:'libro amarillo notas',c:'Objetos'},
    {e:'📕',n:'libro rojo cerrado lectura',c:'Objetos'},
    {e:'📗',n:'libro verde lectura',c:'Objetos'},
    {e:'📘',n:'libro azul lectura',c:'Objetos'},
    {e:'📙',n:'libro naranja lectura',c:'Objetos'},
    {e:'📚',n:'libros apilados lectura estudiar',c:'Objetos'},
    {e:'📖',n:'libro abierto leer',c:'Objetos'},
    {e:'🔖',n:'marcador señalador libro página',c:'Objetos'},
    {e:'🏷️',n:'etiqueta precio tag',c:'Objetos'},
    {e:'🔬',n:'microscopio ciencia laboratorio',c:'Objetos'},
    {e:'🔭',n:'telescopio astronomía estrellas',c:'Objetos'},
    {e:'🧬',n:'adn genética biología',c:'Objetos'},
    {e:'🩻',n:'rayos x radiografía médico',c:'Objetos'},
    {e:'🩼',n:'muleta lesión recuperación',c:'Objetos'},
    {e:'🩺',n:'estetoscopio médico doctor',c:'Objetos'},
    {e:'🩹',n:'curita vendita herida',c:'Objetos'},
    {e:'💊',n:'pastilla medicina medicamento',c:'Objetos'},
    {e:'🧪',n:'tubo ensayo laboratorio química',c:'Objetos'},
    {e:'🧫',n:'placa petri cultivo laboratorio',c:'Objetos'},
    {e:'🧲',n:'imán magnético laboratorio',c:'Objetos'},
    {e:'🔮',n:'bola cristal magia predicción',c:'Objetos'},
    {e:'🧿',n:'ojo nazar amuleto protección',c:'Objetos'},
    {e:'🪬',n:'hamsa mano protección amuleto',c:'Objetos'},
    {e:'💎',n:'diamante gema joya valiosa',c:'Objetos'},
    {e:'💍',n:'anillo boda compromiso joya',c:'Objetos'},
    {e:'👑',n:'corona rey reina realeza',c:'Objetos'},
    {e:'🎩',n:'sombrero mago copa elegante',c:'Objetos'},
    {e:'🪄',n:'varita mágica magia truco',c:'Objetos'},
    {e:'🎭',n:'máscaras teatro arte drama',c:'Objetos'},
    {e:'🎨',n:'paleta pintura arte colores',c:'Objetos'},
    {e:'🎪',n:'circo carpa espectáculo',c:'Objetos'},
    {e:'🎢',n:'montaña rusa parque diversiones',c:'Objetos'},
    {e:'🎡',n:'noria rueda parque diversiones',c:'Objetos'},
    {e:'🎠',n:'carrusel caballitos parque',c:'Objetos'},
    // Lugares y viajes
    {e:'🏠',n:'casa hogar',c:'Lugares'},
    {e:'🏡',n:'casa jardín',c:'Lugares'},
    {e:'🏢',n:'edificio oficina',c:'Lugares'},
    {e:'🏣',n:'correos',c:'Lugares'},
    {e:'🏥',n:'hospital',c:'Lugares'},
    {e:'🏦',n:'banco',c:'Lugares'},
    {e:'🏨',n:'hotel',c:'Lugares'},
    {e:'🏫',n:'escuela colegio',c:'Lugares'},
    {e:'🏰',n:'castillo',c:'Lugares'},
    {e:'🗼',n:'torre eiffel paris',c:'Lugares'},
    {e:'🗽',n:'estatua libertad nueva york',c:'Lugares'},
    {e:'🗺️',n:'mapa mundo',c:'Lugares'},
    {e:'🧭',n:'brújula norte',c:'Lugares'},
    {e:'🚀',n:'cohete espacio',c:'Lugares'},
    {e:'🛸',n:'ovni platillo volador',c:'Lugares'},
    {e:'✈️',n:'avión vuelo',c:'Lugares'},
    {e:'🚂',n:'tren locomotora',c:'Lugares'},
    {e:'🚗',n:'coche auto carro',c:'Lugares'},
    {e:'🚕',n:'taxi',c:'Lugares'},
    {e:'🚌',n:'autobús bus',c:'Lugares'},
    {e:'🚎',n:'trolebús',c:'Lugares'},
    {e:'🚓',n:'coche patrulla policía',c:'Lugares'},
    {e:'🚑',n:'ambulancia',c:'Lugares'},
    {e:'🚒',n:'camión bomberos',c:'Lugares'},
    {e:'🚲',n:'bicicleta',c:'Lugares'},
    {e:'🛵',n:'scooter moto',c:'Lugares'},
    {e:'🚢',n:'barco crucero',c:'Lugares'},
    {e:'⛵',n:'velero bote',c:'Lugares'},
    {e:'🏖️',n:'playa arena mar',c:'Lugares'},
    {e:'🏝️',n:'isla tropical desierta',c:'Lugares'},
    {e:'🗻',n:'monte fuji montaña',c:'Lugares'},
    {e:'🏜️',n:'desierto arena',c:'Lugares'},
    {e:'🏕️',n:'camping carpa',c:'Lugares'},
    {e:'🌆',n:'ciudad edificios atardecer',c:'Lugares'},
    {e:'🌃',n:'ciudad noche estrellada',c:'Lugares'},
    // Símbolos
    {e:'⭐',n:'estrella estrellado',c:'Símbolos'},
    {e:'🌟',n:'estrella brillante destello',c:'Símbolos'},
    {e:'💥',n:'explosión choque impacto',c:'Símbolos'},
    {e:'💢',n:'enojo símbolo ira',c:'Símbolos'},
    {e:'💦',n:'gotas agua sudor',c:'Símbolos'},
    {e:'💨',n:'viento aire corriente',c:'Símbolos'},
    {e:'🕳️',n:'agujero hoyo',c:'Símbolos'},
    {e:'💬',n:'burbuja texto chat',c:'Símbolos'},
    {e:'💭',n:'burbuja pensamiento',c:'Símbolos'},
    {e:'🗯️',n:'burbuja enojo grito',c:'Símbolos'},
    {e:'♻️',n:'reciclaje reciclar',c:'Símbolos'},
    {e:'✅',n:'check palomita correcto',c:'Símbolos'},
    {e:'❌',n:'equis incorrecto error',c:'Símbolos'},
    {e:'❓',n:'pregunta duda signo',c:'Símbolos'},
    {e:'❗',n:'exclamación importante alerta',c:'Símbolos'},
    {e:'⚠️',n:'advertencia peligro precaución',c:'Símbolos'},
    {e:'🚫',n:'prohibido no permitido',c:'Símbolos'},
    {e:'🔞',n:'mayores 18 adultos',c:'Símbolos'},
    {e:'📵',n:'sin teléfono prohibido',c:'Símbolos'},
    {e:'🔴',n:'círculo rojo',c:'Símbolos'},
    {e:'🟠',n:'círculo naranja',c:'Símbolos'},
    {e:'🟡',n:'círculo amarillo',c:'Símbolos'},
    {e:'🟢',n:'círculo verde',c:'Símbolos'},
    {e:'🔵',n:'círculo azul',c:'Símbolos'},
    {e:'🟣',n:'círculo morado',c:'Símbolos'},
    {e:'⚫',n:'círculo negro',c:'Símbolos'},
    {e:'⚪',n:'círculo blanco',c:'Símbolos'},
    {e:'🟤',n:'círculo marrón café',c:'Símbolos'},
    {e:'🔺',n:'triángulo rojo arriba',c:'Símbolos'},
    {e:'🔻',n:'triángulo rojo abajo',c:'Símbolos'},
    {e:'💠',n:'diamante azul punto',c:'Símbolos'},
    {e:'🔷',n:'diamante azul grande',c:'Símbolos'},
    {e:'🔹',n:'diamante azul pequeño',c:'Símbolos'},
    {e:'▶️',n:'play reproducir',c:'Símbolos'},
    {e:'⏩',n:'avanzar rápido',c:'Símbolos'},
    {e:'⏭️',n:'siguiente pista',c:'Símbolos'},
    {e:'⏸️',n:'pausa',c:'Símbolos'},
    {e:'⏹️',n:'stop detener',c:'Símbolos'},
    {e:'🔁',n:'repetir bucle loop',c:'Símbolos'},
    {e:'🔀',n:'aleatorio shuffle',c:'Símbolos'},
    {e:'🔔',n:'campana notificación',c:'Símbolos'},
    {e:'🔕',n:'campana silenciada',c:'Símbolos'},
    {e:'🔊',n:'altavoz volumen alto',c:'Símbolos'},
    {e:'🔇',n:'silencio mudo',c:'Símbolos'},
    {e:'📣',n:'megáfono anuncio',c:'Símbolos'},
    {e:'📢',n:'altavoz anuncio público',c:'Símbolos'},
    {e:'🏳️',n:'bandera blanca rendición',c:'Símbolos'},
    {e:'🏴',n:'bandera negra',c:'Símbolos'},
    {e:'🚩',n:'bandera roja señal',c:'Símbolos'},
    {e:'🏁',n:'bandera cuadros carrera',c:'Símbolos'},
    {e:'🎌',n:'banderas japón cruzadas',c:'Símbolos'},
    {e:'⚡',n:'rayo voltaje electricidad',c:'Símbolos'},
    {e:'🌀',n:'ciclón espiral',c:'Símbolos'},
    {e:'🌈',n:'arcoiris colores',c:'Símbolos'},
    {e:'☯️',n:'yin yang equilibrio',c:'Símbolos'},
    {e:'☮️',n:'paz símbolo',c:'Símbolos'},
    {e:'✝️',n:'cruz cristiana',c:'Símbolos'},
    {e:'☪️',n:'media luna estrella islam',c:'Símbolos'},
    {e:'🕉️',n:'om hinduismo',c:'Símbolos'},
    {e:'✡️',n:'estrella david judaísmo',c:'Símbolos'},
    {e:'🔯',n:'estrella seis puntas',c:'Símbolos'},
    // Deportes
    {e:'⚽',n:'fútbol soccer pelota',c:'Deportes'},
    {e:'🏀',n:'baloncesto basketball',c:'Deportes'},
    {e:'🏈',n:'fútbol americano',c:'Deportes'},
    {e:'⚾',n:'béisbol pelota',c:'Deportes'},
    {e:'🎾',n:'tenis pelota raqueta',c:'Deportes'},
    {e:'🏐',n:'voleibol',c:'Deportes'},
    {e:'🏉',n:'rugby pelota',c:'Deportes'},
    {e:'🎱',n:'billar bola 8',c:'Deportes'},
    {e:'🏓',n:'ping pong tenis mesa',c:'Deportes'},
    {e:'🏸',n:'bádminton',c:'Deportes'},
    {e:'🥊',n:'guante boxeo',c:'Deportes'},
    {e:'🥋',n:'artes marciales karate',c:'Deportes'},
    {e:'🎽',n:'camiseta deporte atletismo',c:'Deportes'},
    {e:'🛹',n:'skateboard patineta',c:'Deportes'},
    {e:'🛷',n:'trineo',c:'Deportes'},
    {e:'⛸️',n:'patines hielo',c:'Deportes'},
    {e:'🏊',n:'natación nadando',c:'Deportes'},
    {e:'🚴',n:'ciclismo bicicleta',c:'Deportes'},
    {e:'🏋️',n:'levantamiento pesas',c:'Deportes'},
    {e:'🤸',n:'gimnasia acrobacia',c:'Deportes'},
    {e:'🤼',n:'lucha libre',c:'Deportes'},
    {e:'🏇',n:'carreras caballos',c:'Deportes'},
    {e:'⛷️',n:'esquí nieve',c:'Deportes'},
    {e:'🏂',n:'snowboard',c:'Deportes'},
    {e:'🎿',n:'esquís',c:'Deportes'},
    {e:'🥌',n:'curling piedra',c:'Deportes'},
    {e:'🎣',n:'pesca pescar',c:'Deportes'},
    {e:'🏹',n:'arco flecha arquería',c:'Deportes'},
    {e:'⛳',n:'golf hoyo bandera',c:'Deportes'},
    {e:'🎽',n:'atletismo deporte',c:'Deportes'},
    {e:'🏆',n:'trofeo campeón ganador',c:'Deportes'},
  ];

  const ALL_CATS = ['Todos', ...new Set(EMOJI_DB.map(e => e.c))];
  let currentCat = 'Todos';
  let searchQuery = '';

  const searchEl   = document.getElementById('emojiSearch');
  const catsEl     = document.getElementById('emojiCats');
  const gridEl     = document.getElementById('emojiGrid');
  const countEl    = document.getElementById('emojiCountBadge');
  const copyBarEl  = document.getElementById('emojiCopyBar');
  const copyPrevEl = document.getElementById('emojiCopyPreview');

  function buildCats() {
    catsEl.innerHTML = '';
    ALL_CATS.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'emoji-cat-btn' + (cat === currentCat ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        currentCat = cat;
        document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGrid();
      });
      catsEl.appendChild(btn);
    });
  }

  function renderGrid() {
    const q = searchQuery.toLowerCase().trim();
    const filtered = EMOJI_DB.filter(item => {
      const catOk = currentCat === 'Todos' || item.c === currentCat;
      const searchOk = !q || item.n.includes(q) || item.e.includes(q) || item.c.toLowerCase().includes(q);
      return catOk && searchOk;
    });
    countEl.textContent = `${filtered.length} emojis`;
    gridEl.innerHTML = '';
    filtered.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'emoji-item';
      btn.textContent = item.e;
      btn.title = item.n;
      btn.setAttribute('aria-label', item.n);
      btn.addEventListener('click', () => {
        copyToClipboard(item.e);
        copyPrevEl.textContent = item.e;
        copyBarEl.style.display = 'flex';
        clearTimeout(copyBarEl._timer);
        copyBarEl._timer = setTimeout(() => { copyBarEl.style.display = 'none'; }, 1800);
      });
      gridEl.appendChild(btn);
    });
  }

  searchEl.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderGrid();
  });

  function init() {
    buildCats();
    renderGrid();
  }
  return { init };
})();