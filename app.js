const $=id=>document.getElementById(id);
let pages={};

function hex(a){return [...a].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase()}
function clean(s){return (s||"").replace(/[^0-9A-Fa-f]/g,"").toUpperCase()}
function uidFormat(h){return h.match(/.{2}/g)?.join(":")||h}

function render(){
  const keys=Object.keys(pages).map(Number).sort((a,b)=>a-b);
  $("count").textContent=`${keys.length}/45`;
  $("pages").innerHTML=keys.length
    ? keys.map(p=>`<div class="page"><div class="p">P${String(p).padStart(2,"0")}</div><div class="v">${pages[p]}</div></div>`).join("")
    : "Nenhum dump carregado.";
}

function extract(text){
  pages={};
  let uid="";
  const lines=text.split(/\r?\n/);

  for(const line of lines){
    let m=line.match(/(?:UID|uid)\s*[:=]\s*([0-9A-Fa-f: -]{8,20})/);
    if(m && !uid) uid=clean(m[1]);

    m=line.match(/P(?:AGE\s*)?0*(\d{1,2})\s*[:=|]\s*([0-9A-Fa-f]{8})/i);
    if(m) pages[Number(m[1])]=m[2].toUpperCase();
  }

  if(!uid){
    const m=text.match(/\b(04[0-9A-Fa-f]{12})\b/);
    if(m) uid=m[1].toUpperCase();
  }

  $("uid").textContent=uid?uidFormat(uid):"—";
  $("uidBytes").textContent=uid?`${uid.length/2} bytes`:"—";
  $("tagType").textContent=pages[0]||pages[3]?"NTAG / NFC-A":"Dump";
  $("techs").innerHTML=["NFC-A","Ultralight/NTAG","Local dump"].map(x=>`<span class="chip">${x}</span>`).join("");

  const printable=text.replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g,"");
  $("text").textContent=printable.trim().slice(0,5000)||"Nenhum texto legível no dump.";

  const pwd=text.match(/PWD\s*(?:conhecida|=|:)\s*([0-9A-Fa-f]{8})/i);
  const pack=text.match(/PACK\s*(?:conhecido|=|:)\s*([0-9A-Fa-f]{4})/i);
  if(pwd){$("pwd").value=pwd[1].toUpperCase();$("auth").textContent="PWD carregada"}
  if(pack){$("pack").value=pack[1].toUpperCase();$("auth").textContent="PWD/PACK carregados"}

  render();
  $("state").textContent="DUMP CARREGADO";
}

async function readFile(file){
  const buf=new Uint8Array(await file.arrayBuffer());
  const textish=buf.every(b=>b===9||b===10||b===13||(b>=32&&b<=126));
  if(textish) extract(new TextDecoder().decode(buf));
  else{
    pages={};
    for(let i=0;i+3<buf.length && i/4<45;i+=4) pages[i/4]=hex(buf.slice(i,i+4));
    $("uid").textContent="—";
    $("uidBytes").textContent="—";
    $("tagType").textContent="Dump binário";
    $("techs").innerHTML='<span class="chip">BIN</span>';
    $("text").textContent="Arquivo binário importado.";
    render();$("state").textContent="BIN CARREGADO";
  }
}

$("openFile").onclick=()=>$("fileInput").click();
$("fileInput").onchange=e=>{const f=e.target.files[0];if(f)readFile(f)};
$("clearBtn").onclick=()=>{pages={};$("uid").textContent="—";$("uidBytes").textContent="—";$("tagType").textContent="—";$("techs").innerHTML="";$("text").textContent="—";$("pwd").value="";$("pack").value="";$("auth").textContent="não informado";render();$("state").textContent="PRONTO"};
$("pasteBtn").onclick=async()=>{
  try{extract(await navigator.clipboard.readText())}
  catch{$("state").textContent="COLE NO CLIPBOARD E TENTE NOVAMENTE"}
};
render();
