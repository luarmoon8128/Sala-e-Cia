(function(){
'use strict';
var KEY='patio.v1', TKEY='patio.theme', SKEY='patio.session';
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4)};
var norm=function(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()};

var PALETTE=['#2563b0','#1b7f45','#c2410c','#b83227','#6d3fc0','#0e7c86','#b7791f','#c2447a'];
var PET_COLORS=['#6bbf8e','#6aa7e8','#f2a65a','#e87fa5','#a98af0','#e8c547'];
var ROLE={aluno:'Aluno',professor:'Professor',gestao:'Gestão'};
var KINDS={sala:'Sala de aula',disciplina:'Disciplina',projeto:'Projeto',gremio:'Grêmio',outro:'Outro'};
var CATS={evento:['Evento','#2563b0'],prova:['Prova','#b83227'],reuniao:['Reunião','#6d3fc0'],prazo:['Prazo','#b7600a'],geral:['Aviso geral','#1b7f45']};
var SUBJECTS=['Português','Matemática','Ciências','História','Geografia','Inglês','Artes','Educação Física'];
var DEFAULT_TAGS={
  sala:[['Aluno','#2563b0'],['Professor','#c2410c'],['Representante','#1b7f45'],['Gestão','#6d3fc0']],
  gremio:[['Presidente','#b83227'],['Diretoria','#c2410c'],['Membro','#2563b0'],['Orientação','#6d3fc0']],
  projeto:[['Coordenação','#6d3fc0'],['Participante','#2563b0']]
};
DEFAULT_TAGS.disciplina=DEFAULT_TAGS.sala; DEFAULT_TAGS.outro=DEFAULT_TAGS.projeto;

var IC={
  plus:'<path d="M12 5v14M5 12h14"/>',
  send:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  pin:'<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit:'<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  out:'<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon:'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  bell:'<path d="M6 17v-6a6 6 0 0112 0v6l2 2H4zM10 21h4"/>',
  cap:'<path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>'
};
var ico=function(n,c){return '<svg class="ico '+(c||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>'};

/* ---------- estado ---------- */
var S=null, session=null, memStore=null;
function curTri(){var m=new Date().getMonth();return m<=3?1:(m<=7?2:3)}
var ui={view:'mural',gid:null,tab:'chat',mFilter:'all',tri:curTri(),draft:'',img:null,m:'list',authTab:'login',pat:null};

function load(){try{var r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}return memStore}
function save(){memStore=S;try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch(e){toast('O armazenamento do navegador está cheio. Apague algumas imagens e tente de novo.','bad');return false}}
function setSession(id){session=id}

var user=function(id){return S.users.find(function(u){return u.id===id})};
var me=function(){return session?user(session):null};
var isStaff=function(u){return u&&u.role!=='aluno'};
var myGroups=function(){return S.groups.filter(function(g){return g.members.some(function(m){return m.userId===session})})};
var memberOf=function(g,id){return g.members.find(function(m){return m.userId===id})};
function canManage(g,u){return !!(u&&memberOf(g,u.id)&&(isStaff(u)||g.ownerId===u.id))}
function mTags(g,id){var m=memberOf(g,id);return m?m.tags.map(function(t){return g.tags.find(function(x){return x.id===t})}).filter(Boolean):[]}
function autoTag(g,u){var want=u.role==='aluno'?'aluno':(u.role==='professor'?'professor':'gestao');var t=g.tags.find(function(x){return norm(x.name)===want});return t?[t.id]:[]}
function currentGroup(){return S.groups.find(function(g){return g.id===ui.gid&&memberOf(g,session)})||null}
var initials=function(n){return n.split(' ').filter(Boolean).slice(0,2).map(function(w){return w[0]}).join('').toUpperCase()};
function hue(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return h}
var avatar=function(u,sm){return '<span class="av'+(sm?' sm':'')+'" style="background:hsl('+hue(u.id)+' 42% 36%)" aria-hidden="true">'+esc(initials(u.name))+'</span>'};
var roleChip=function(u){return '<span class="chip r-'+u.role+'">'+ROLE[u.role]+'</span>'};
var tagChip=function(t){return '<span class="tag" style="--tc:'+esc(t.color)+'"><i></i>'+esc(t.name)+'</span>'};
var firstName=function(n){return n.split(' ')[0]};
var avgFmt=function(n){return n.toFixed(1).replace('.',',')};

/* ---------- datas ---------- */
var DAY=864e5;
var sod=function(t){var d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
function relDay(ts){var n=Math.round((sod(ts)-sod(Date.now()))/DAY);if(n===0)return 'hoje';if(n===1)return 'amanhã';if(n===-1)return 'ontem';return n>0?'em '+n+' dias':'há '+(-n)+' dias'}
function ago(ts){var s=(Date.now()-ts)/1000;if(s<60)return 'agora';if(s<3600)return 'há '+Math.floor(s/60)+' min';if(s<86400)return 'há '+Math.floor(s/3600)+' h';return 'há '+Math.floor(s/86400)+' d'}
var fmtTime=function(ts){return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
var fmtWhen=function(ts){return new Date(ts).toLocaleString('pt-BR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})};
function dayLabel(ts){var n=Math.round((sod(ts)-sod(Date.now()))/DAY);if(n===0)return 'Hoje';if(n===-1)return 'Ontem';return new Date(ts).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}

/* ---------- dados de exemplo ---------- */
function seed(){
  var now=Date.now(), at=function(d,h,m){var x=new Date();x.setDate(x.getDate()+d);x.setHours(h,m,0,0);return x.getTime()};
  var U=function(id,name,email,role){return {id:id,name:name,email:email,role:role}};
  var users=[U('u_marina','Marina Duarte','marina@escola.demo','professor'),U('u_carlos','Carlos Menezes','carlos@escola.demo','gestao'),
    U('u_lucas','Lucas Ferreira','lucas@escola.demo','aluno'),U('u_bia','Beatriz Alves','bia@escola.demo','aluno'),U('u_rafa','Rafael Lima','rafa@escola.demo','aluno')];
  var mkTags=function(kind){return DEFAULT_TAGS[kind].map(function(t,i){return {id:'t'+i+kind[0],name:t[0],color:t[1]}})};
  var g1={id:'g_8b',name:'8º B — 2026',kind:'sala',desc:'Turma do 8º ano B. Avisos de prova, tarefas e conversa da sala.',color:'#2563b0',code:'8B2026',ownerId:'u_marina',tags:mkTags('sala'),createdAt:now-30*DAY};
  g1.members=[{userId:'u_marina',tags:['t1s']},{userId:'u_carlos',tags:['t3s']},{userId:'u_lucas',tags:['t0s']},{userId:'u_bia',tags:['t0s','t2s']},{userId:'u_rafa',tags:['t0s']}];
  var g2={id:'g_gremio',name:'Grêmio Estudantil',kind:'gremio',desc:'Representação dos estudantes: assembleias, campanhas e eventos.',color:'#c2410c',code:'GREMIO7',ownerId:'u_bia',tags:mkTags('gremio'),createdAt:now-20*DAY};
  g2.members=[{userId:'u_bia',tags:['t0g']},{userId:'u_lucas',tags:['t1g']},{userId:'u_rafa',tags:['t2g']},{userId:'u_carlos',tags:['t3g']}];
  var g3={id:'g_feira',name:'Feira de Ciências',kind:'projeto',desc:'Grupo dos projetos da feira de ciências do 3º trimestre.',color:'#1b7f45',code:'FEIRA26',ownerId:'u_marina',tags:mkTags('projeto'),createdAt:now-12*DAY};
  g3.members=[{userId:'u_marina',tags:['t0p']},{userId:'u_lucas',tags:['t1p']},{userId:'u_rafa',tags:['t1p']}];
  var M=function(g,u,t,min){return {id:uid(),groupId:g,userId:u,text:t,img:null,ts:now-min*60000}};
  var messages=[
    M('g_8b','u_marina','Bom dia, turma! Lembrando que a prova de Matemática é na próxima semana. Revisem os capítulos 7 e 8.',300),
    M('g_8b','u_bia','Professora, vai cair equação do 2º grau?',280),
    M('g_8b','u_marina','Vai sim, e também sistemas de equações. Trago uma lista de exercícios amanhã.',270),
    M('g_8b','u_lucas','Valeu, professora! Alguém quer estudar junto na biblioteca na quinta?',40),
    M('g_8b','u_rafa','Eu vou! Pode ser depois da aula.',25),
    M('g_gremio','u_bia','Pessoal, a pauta da assembleia está fechada: uniforme de educação física, horário do intervalo e festa junina.',180),
    M('g_gremio','u_lucas','Posso apresentar a proposta do intervalo?',150),
    M('g_gremio','u_bia','Pode! Você entra depois do ponto do uniforme.',140),
    M('g_feira','u_marina','Cada dupla precisa entregar o resumo do projeto até o dia 24. Dúvidas por aqui.',600)
  ];
  var N=function(g,u,title,cat,date,body,pinned,ago){return {id:uid(),groupId:g,userId:u,title:title,cat:cat,date:date,body:body,pinned:!!pinned,ts:now-ago*60000}};
  var notices=[
    N('g_8b','u_marina','Prova de Matemática','prova',at(3,7,30),'Conteúdo: equações do 2º grau e sistemas de equações. Traga calculadora simples, lápis e borracha.',true,320),
    N('g_8b','u_carlos','Reunião de pais e mestres','reuniao',at(9,18,30),'Entrega dos boletins do 3º trimestre no auditório. A presença dos responsáveis é importante.',false,200),
    N('g_gremio','u_carlos','Assembleia geral do Grêmio','evento',at(2,13,10),'Sala 12, logo após o intervalo. Cada turma indica dois representantes com direito a voto.',true,170),
    N('g_feira','u_marina','Entrega dos resumos dos projetos','prazo',at(14,23,59),'Resumo de uma página com objetivo, materiais e resultado esperado.',false,590),
    N('g_8b','u_carlos','Semana de provas finais','geral',null,'O calendário completo será divulgado na secretaria. Fiquem atentos aos avisos do mural.',false,1500)
  ];
  var G=function(s,sub,v,tri,by){return {id:uid(),studentId:s,subject:sub,value:v,tri:tri,by:by,ts:now-tri*DAY}};
  var grades=[
    G('u_lucas','Português',8,3,'u_lucas'),G('u_lucas','Matemática',6.5,3,'u_marina'),G('u_lucas','Ciências',9,3,'u_lucas'),G('u_lucas','História',7.5,3,'u_lucas'),
    G('u_lucas','Português',7,2,'u_lucas'),G('u_lucas','Matemática',5.5,2,'u_marina'),G('u_lucas','Ciências',8,2,'u_lucas'),
    G('u_lucas','Português',6,1,'u_lucas'),G('u_lucas','Matemática',4.5,1,'u_marina'),
    G('u_bia','Português',9.5,3,'u_bia'),G('u_bia','Matemática',9,3,'u_bia'),G('u_bia','Ciências',9.2,3,'u_bia')
  ];
  return {users:users,groups:[g1,g2,g3],messages:messages,notices:notices,grades:grades,pets:{u_lucas:{name:'Bolota',color:'#6bbf8e'}}};
}

/* ---------- toasts e modais ---------- */
function toast(msg,kind){var el=document.createElement('div');el.className='toast'+(kind==='bad'?' bad':'');el.textContent=msg;$('#toasts').appendChild(el);setTimeout(function(){el.remove()},3200)}
function closeModal(){$('#modalRoot').innerHTML=''}
function fieldHTML(f){
  var id='f_'+f.id,v=f.value==null?'':f.value,req=f.required?' required':'';
  if(f.type==='textarea')return '<div class="field"><label for="'+id+'">'+f.label+'</label><textarea id="'+id+'" name="'+f.id+'" maxlength="'+(f.max||600)+'" placeholder="'+esc(f.ph||'')+'">'+esc(v)+'</textarea></div>';
  if(f.type==='select')return '<div class="field"><label for="'+id+'">'+f.label+'</label><select id="'+id+'" name="'+f.id+'">'+f.options.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(v)?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')+'</select></div>';
  if(f.type==='checkbox')return '<label class="check"><input type="checkbox" id="'+id+'" name="'+f.id+'"'+(v?' checked':'')+'> '+f.label+'</label>';
  if(f.type==='swatches')return '<div class="field"><span class="lbl">'+f.label+'</span><div class="swatches" role="radiogroup">'+f.options.map(function(c,i){return '<label><input type="radio" name="'+f.id+'" value="'+c+'"'+((v?c===v:i===0)?' checked':'')+' aria-label="Cor '+(i+1)+'"><span style="--sw:'+c+'"></span></label>'}).join('')+'</div></div>';
  if(f.type==='checks')return '<div class="field"><span class="lbl">'+f.label+'</span>'+(f.options.length?f.options.map(function(o){return '<label class="check"><input type="checkbox" name="'+f.id+'" value="'+esc(o[0])+'"'+(f.value.indexOf(o[0])>-1?' checked':'')+'> '+o[1]+'</label>'}).join(''):'<p class="hint">Este grupo ainda não tem tags.</p>')+'</div>';
  return '<div class="field"><label for="'+id+'">'+f.label+'</label><input id="'+id+'" name="'+f.id+'" type="'+(f.type||'text')+'" value="'+esc(v)+'" placeholder="'+esc(f.ph||'')+'" maxlength="'+(f.max||80)+'"'+(f.list?' list="'+f.list+'"':'')+(f.mode?' inputmode="'+f.mode+'"':'')+req+' autocomplete="off"></div>';
}
function readForm(form,fields){
  var out={};
  fields.forEach(function(f){
    if(f.type==='checkbox')out[f.id]=form.elements[f.id].checked;
    else if(f.type==='checks')out[f.id]=Array.prototype.slice.call(form.querySelectorAll('input[name="'+f.id+'"]:checked')).map(function(i){return i.value});
    else if(f.type==='swatches'){var c=form.querySelector('input[name="'+f.id+'"]:checked');out[f.id]=c?c.value:''}
    else out[f.id]=String(form.elements[f.id].value).trim();
  });
  return out;
}
function openModal(o){
  var fields=o.fields||[];
  $('#modalRoot').innerHTML='<div class="overlay"><form class="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle" id="mform" novalidate><h2 id="mtitle">'+esc(o.title)+'</h2>'+(o.desc?'<p class="hint" style="margin-bottom:10px">'+esc(o.desc)+'</p>':'')+fields.map(fieldHTML).join('')+'<p class="err" id="merr" role="alert" hidden></p><div class="mactions"><button type="button" class="btn ghost" data-act="closemodal">Cancelar</button><button class="btn '+(o.danger?'danger':'accent')+'" type="submit">'+esc(o.submit||'Salvar')+'</button></div></form></div>';
  var form=$('#mform');
  var first=form.querySelector('input:not([type=radio]):not([type=checkbox]),textarea,select');
  if(first)setTimeout(function(){try{first.focus()}catch(e){}},30);
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var r=o.onSubmit(readForm(form,fields));
    if(typeof r==='string'){var er=$('#merr');er.textContent=r;er.hidden=false;return}
    if(r!==false)closeModal();
  });
}
function confirmBox(title,desc,label,cb){openModal({title:title,desc:desc,submit:label,danger:true,onSubmit:function(){cb()}})}

/* ---------- autenticação (API) ---------- */
var API=window.PatioAPI;
var PERFIL_NOME={cliente:'Cliente',profissional:'Profissional',admin:'Administrador'};
var PAPEL_NOME={aluno:'Aluno',professor:'Professor',gestao:'Gestão'};
var isAdminUI=function(u){return !!(u&&(u.perfil==='admin'||u.perfil==='profissional'))};

// Leva o usuário vindo da API para o estado local do app (os grupos e mensagens ainda são locais até a Fase 5c).
function syncUser(a){
  var id='a'+a.id,u=user(id);
  if(!u){u={id:id};S.users.push(u)}
  u.name=a.nome;u.email=a.email||'';u.role=a.papel||'aluno';u.perfil=a.perfil;
  if(u.role==='aluno'&&!S.pets[id])S.pets[id]={name:'Bolota',color:PET_COLORS[0]};
  save();
  return id;
}

function fieldErr(name){return '<p class="err fe" data-for="'+name+'" role="alert" hidden></p>'}
function showErr(form,msg){var p=form.querySelector('.err.form-err');p.textContent=msg;p.hidden=false}
function clearErrs(form){Array.prototype.forEach.call(form.querySelectorAll('.err'),function(p){p.hidden=true;p.textContent=''});Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'),function(i){i.removeAttribute('aria-invalid')})}
// Mostra o erro de cada campo ao lado dele; o que não tiver campo vai para a mensagem geral.
function showFieldErrors(form,campos,geral){
  var first=null,rest=[];
  Object.keys(campos||{}).forEach(function(k){
    var p=form.querySelector('.fe[data-for="'+k+'"]');
    if(p){p.textContent=campos[k];p.hidden=false;var i=form.elements[k];if(i&&i.setAttribute){i.setAttribute('aria-invalid','true');if(!first)first=i}}
    else rest.push(campos[k]);
  });
  if(rest.length||!first)showErr(form,rest.join(' ')||geral||'Confira os dados informados.');
  if(first&&first.focus)first.focus();
}
function setBusy(form,busy,label){
  var b=form.querySelector('button[type=submit]');if(!b)return;
  if(busy){b.dataset.t=b.textContent;b.textContent=label;b.disabled=true;form.setAttribute('aria-busy','true')}
  else{b.textContent=b.dataset.t||b.textContent;b.disabled=false;form.removeAttribute('aria-busy')}
}
function authField(id,label,attrs,extra){return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" '+attrs+'>'+(extra||'')+'</div>'}

function renderAuth(){
  var t=ui.authTab,tabs=t==='login'||t==='signup';
  var left='<section class="auth-l"><a class="brand" href="/" aria-label="Pátio Escolar, página inicial"><i>'+ico('cap')+'</i>Pátio</a><h1>Todo mundo da escola na mesma conversa.</h1><p class="lead">Grupos por sala e projeto, mural de avisos da gestão e conversa com a turma.</p><ul class="chalk"><li>Grupos de sala, grêmio e projetos</li><li>Avisos de professores e gestão</li><li>Entre num grupo com um código</li></ul></section>';
  var seg=tabs?'<div class="seg" role="tablist"><button type="button" role="tab" data-act="authtab" data-t="login" class="'+(t==='login'?'on':'')+'" aria-selected="'+(t==='login')+'">Entrar</button><button type="button" role="tab" data-act="authtab" data-t="signup" class="'+(t==='signup'?'on':'')+'" aria-selected="'+(t==='signup')+'">Criar conta</button></div>':'';
  var form='';
  if(t==='login'){
    form='<form id="loginForm" novalidate><h2 class="fh">Entrar</h2>'+
      authField('li_id','E-mail ou telefone','name="login" type="text" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required')+
      authField('li_pass','Senha','name="senha" type="password" autocomplete="current-password" required')+
      '<p class="err form-err" role="alert" hidden></p><button class="btn accent block" type="submit">Entrar</button>'+
      '<p class="hint" style="margin-top:14px"><button type="button" class="linkbtn" data-act="authtab" data-t="forgot">Esqueci minha senha</button></p></form>';
  }else if(t==='signup'){
    form='<form id="signupForm" novalidate><h2 class="fh">Criar conta</h2>'+
      authField('su_nome','Nome completo','name="nome" autocomplete="name" maxlength="80" required',fieldErr('nome'))+
      authField('su_email','E-mail','name="email" type="email" autocomplete="email" autocapitalize="none" maxlength="254"',fieldErr('email'))+
      authField('su_tel','Telefone com DDD (opcional se informar o e-mail)','name="telefone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="(11) 91234-5678"',fieldErr('telefone'))+
      authField('su_pass','Senha (mínimo 8 caracteres)','name="senha" type="password" autocomplete="new-password" minlength="8" maxlength="72" required',fieldErr('senha'))+
      authField('su_pass2','Confirmar senha','name="confirmarSenha" type="password" autocomplete="new-password" maxlength="72" required',fieldErr('confirmarSenha'))+
      '<span class="lbl">Você é</span><div class="roles" style="margin-top:6px"><label><input type="radio" name="papel" value="aluno" checked><span>Aluno</span></label><label><input type="radio" name="papel" value="professor"><span>Professor</span></label><label><input type="radio" name="papel" value="gestao"><span>Gestão</span></label></div>'+fieldErr('papel')+
      '<label class="check" style="align-items:flex-start;font-weight:500"><input type="checkbox" name="aceitoPolitica" style="margin-top:2px"><span>Li e aceito a <a href="/privacidade.html" target="_blank" rel="noopener">política de privacidade</a>.</span></label>'+fieldErr('aceitoPolitica')+
      '<p class="err form-err" role="alert" hidden></p><button class="btn accent block" type="submit">Criar conta</button></form>';
  }else if(t==='forgot'){
    form='<form id="forgotForm" novalidate><h2 class="fh">Recuperar senha</h2><p class="hint" style="margin-bottom:12px">Informe o e-mail da conta. Se ele estiver cadastrado, enviamos um link para criar uma nova senha.</p>'+
      authField('fg_email','E-mail','name="email" type="email" autocomplete="email" autocapitalize="none" required')+
      '<p class="err form-err" role="alert" hidden></p><p class="ok-msg" role="status" hidden></p><button class="btn accent block" type="submit">Enviar link</button>'+
      '<p class="hint" style="margin-top:14px"><button type="button" class="linkbtn" data-act="authtab" data-t="login">Voltar para Entrar</button></p></form>';
  }else{
    form='<form id="resetForm" novalidate><h2 class="fh">Criar nova senha</h2><p class="hint" style="margin-bottom:12px">Escolha uma senha com pelo menos 8 caracteres.</p>'+
      authField('rs_pass','Nova senha','name="novaSenha" type="password" autocomplete="new-password" minlength="8" maxlength="72" required',fieldErr('novaSenha'))+
      authField('rs_pass2','Confirmar nova senha','name="confirmarSenha" type="password" autocomplete="new-password" maxlength="72" required',fieldErr('confirmarSenha'))+
      '<p class="err form-err" role="alert" hidden></p><button class="btn accent block" type="submit">Salvar nova senha</button>'+
      '<p class="hint" style="margin-top:14px"><button type="button" class="linkbtn" data-act="authtab" data-t="forgot">Pedir outro link</button></p></form>';
  }
  $('#root').innerHTML='<div class="auth">'+left+'<section class="auth-r"><div class="auth-card">'+seg+form+(ui.authMsg?'<p class="ok-msg" role="status">'+esc(ui.authMsg)+'</p>':'')+'<p class="hint" style="margin-top:22px"><a href="/privacidade.html">Política de privacidade</a> · <a href="/">Voltar ao início</a></p></div></section></div>';
  ui.authMsg='';
  var f=$('#root form input:not([type=radio]):not([type=checkbox])');if(f&&!/^(reset|forgot)$/.test(t)&&matchMedia('(min-width:900px)').matches)f.focus();
}

function startSession(id,view){setSession(id);ui.view=view||'mural';ui.gid=null;ui.tab='chat';ui.m='list';render()}

function entrarComApi(r,view){
  var id=syncUser(r.usuario);startSession(id,view);
}

async function doLogin(form){
  clearErrs(form);
  var login=form.elements.login.value.trim(),senha=form.elements.senha.value;
  if(!login||!senha)return showErr(form,'Informe e-mail e senha.');
  setBusy(form,true,'Entrando…');
  try{entrarComApi(await API.entrar({login:login,senha:senha}))}
  catch(e){setBusy(form,false);showErr(form,e.message);form.elements.senha.value='';form.elements.senha.focus()}
}

async function doSignup(form){
  clearErrs(form);
  var el=form.elements,d={
    nome:el.nome.value.trim(),email:el.email.value.trim(),telefone:el.telefone.value.trim(),
    senha:el.senha.value,confirmarSenha:el.confirmarSenha.value,
    papel:form.querySelector('input[name=papel]:checked').value,aceitoPolitica:el.aceitoPolitica.checked
  };
  if(!d.email)delete d.email;
  if(!d.telefone)delete d.telefone;
  // Conferência rápida para poupar uma ida ao servidor; quem manda de verdade é o back-end.
  var c={};
  if(d.senha.length<8)c.senha='A senha precisa ter pelo menos 8 caracteres.';
  else if(d.senha!==d.confirmarSenha)c.confirmarSenha='A confirmação não é igual à senha.';
  if(!d.aceitoPolitica)c.aceitoPolitica='Para criar a conta é preciso aceitar a política de privacidade.';
  if(Object.keys(c).length)return showFieldErrors(form,c);
  setBusy(form,true,'Criando conta…');
  try{
    await API.registrar(d);
    var r=await API.entrar({login:d.email||d.telefone,senha:d.senha});
    toast('Conta criada. Bem-vindo(a), '+firstName(d.nome)+'!');
    entrarComApi(r,'groups');
  }catch(e){
    setBusy(form,false);
    if(e.status===409)showFieldErrors(form,{email:e.message});
    else if(e.campos)showFieldErrors(form,e.campos,e.message);
    else showErr(form,e.message);
  }
}

async function doForgot(form){
  clearErrs(form);
  var email=form.elements.email.value.trim();
  if(!email)return showErr(form,'Informe o e-mail da conta.');
  setBusy(form,true,'Enviando…');
  try{
    var r=await API.esqueciSenha(email);
    var p=form.querySelector('.ok-msg');p.textContent=r.mensagem;p.hidden=false;
    setBusy(form,false);
  }catch(e){setBusy(form,false);showErr(form,e.message)}
}

async function doReset(form){
  clearErrs(form);
  var d={codigo:ui.resetCode||'',novaSenha:form.elements.novaSenha.value,confirmarSenha:form.elements.confirmarSenha.value};
  var c={};
  if(d.novaSenha.length<8)c.novaSenha='A senha precisa ter pelo menos 8 caracteres.';
  else if(d.novaSenha!==d.confirmarSenha)c.confirmarSenha='A confirmação não é igual à senha.';
  if(Object.keys(c).length)return showFieldErrors(form,c);
  setBusy(form,true,'Salvando…');
  try{
    var r=await API.redefinirSenha(d);
    ui.resetCode='';ui.authTab='login';ui.authMsg=r.mensagem;renderAuth();
  }catch(e){
    setBusy(form,false);
    if(e.campos)showFieldErrors(form,e.campos,e.message);else showErr(form,e.message);
  }
}

// Endereços como /app.html#cadastro, #entrar ou #redefinir=CODIGO (link do e-mail). O código sai da barra de endereço logo ao ler.
function lerHash(){
  var h=location.hash||'';if(!h)return;
  var m=/^#redefinir=(.+)$/.exec(h);
  if(m){try{ui.resetCode=decodeURIComponent(m[1])}catch(e){ui.resetCode=m[1]}ui.authTab='reset'}
  else if(h==='#cadastro')ui.authTab='signup';
  else if(h==='#entrar')ui.authTab='login';
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
}

function sairDoApp(msg){
  setSession(null);ui.draft='';ui.img=null;ui.authTab='login';ui.authMsg=msg||'';ui.adm=null;render();
}

/* ---------- painel administrativo (Fase 5d) ---------- */
function renderAdmin(){
  var u=me();
  if(!isAdminUI(u)){ui.view='mural';renderView();return}
  if(!ui.adm)ui.adm={busca:'',pagina:1,porPagina:10,itens:[],total:0,carregando:true,erro:''};
  var a=ui.adm,canEdit=u.perfil==='admin';
  var h='<div class="phead"><div><h1>Painel administrativo</h1><p class="hint">'+(canEdit?'Cadastre usuários, mude perfis e desative contas.':'Você pode consultar os usuários. Só administradores alteram cadastros.')+'</p></div>'+(canEdit?'<button type="button" class="btn accent" data-act="admnew">'+ico('plus')+'Novo usuário</button>':'')+'</div>'+
    '<form class="filters" id="admSearch" role="search" novalidate><div class="field" style="margin:0;flex:1;min-width:200px;max-width:420px"><label for="adm_q" class="sr">Buscar usuário</label><input id="adm_q" name="q" type="search" placeholder="Buscar por nome, e-mail ou telefone" value="'+esc(a.busca)+'" maxlength="80"></div><button class="btn ghost" type="submit">Buscar</button></form>'+
    '<div class="panel" id="admBody" aria-live="polite"></div>';
  $('#main').innerHTML=h;
  fillAdminBody();
  if(a.carregando)carregarAdmin();
}
function fillAdminBody(){
  var b=$('#admBody'),a=ui.adm;if(!b||!a)return;
  var canEdit=me().perfil==='admin';
  if(a.carregando){b.innerHTML='<p class="hint" role="status">Carregando usuários…</p>';return}
  if(a.erro){b.innerHTML='<p class="err">'+esc(a.erro)+'</p><button type="button" class="btn ghost sm" data-act="admreload" style="margin-top:10px">Tentar de novo</button>';return}
  if(!a.itens.length){b.innerHTML='<div class="empty" style="border:0"><h3>Nenhum usuário encontrado</h3><p>'+(a.busca?'Tente outro nome, e-mail ou telefone.':'Os cadastros aparecem aqui.')+'</p></div>';return}
  var paginas=Math.max(1,Math.ceil(a.total/a.porPagina));
  b.innerHTML='<ul class="mlist" style="margin:0">'+a.itens.map(function(x){
    var fake={id:'a'+x.id,name:x.nome};
    return '<li class="mrow">'+avatar(fake)+'<div class="mi"><div class="nm">'+esc(x.nome)+'<span class="chip">'+esc(PERFIL_NOME[x.perfil]||x.perfil)+'</span><span class="chip r-'+esc(x.papel)+'">'+esc(PAPEL_NOME[x.papel]||x.papel)+'</span>'+(x.ativo?'':'<span class="chip" style="--cc:var(--bad)">Inativo</span>')+'</div><span class="hint">'+esc([x.email,x.telefone].filter(Boolean).join(' · '))+'</span></div>'+
      (canEdit?'<div class="ac"><button type="button" class="btn ghost sm" data-act="admedit" data-id="'+x.id+'">'+ico('edit')+'Editar</button></div>':'')+'</li>';
  }).join('')+'</ul><div class="row2" style="margin-top:12px"><span class="hint">'+a.total+' usuário'+(a.total===1?'':'s')+' · página '+a.pagina+' de '+paginas+'</span><div style="display:flex;gap:8px"><button type="button" class="btn ghost sm" data-act="admprev"'+(a.pagina<=1?' disabled':'')+'>Anterior</button><button type="button" class="btn ghost sm" data-act="admnext"'+(a.pagina>=paginas?' disabled':'')+'>Próxima</button></div></div>';
}
function carregarAdmin(){
  var a=ui.adm;a.carregando=true;a.erro='';fillAdminBody();
  API.admin.listar({pagina:a.pagina,porPagina:a.porPagina,busca:a.busca}).then(function(r){
    if(ui.adm!==a)return;
    a.itens=r.itens;a.total=r.total;a.carregando=false;fillAdminBody();
  }).catch(function(e){if(ui.adm!==a)return;a.carregando=false;a.erro=e.message;fillAdminBody()});
}
function userAdminModal(x){
  var novo=!x,fields=[{id:'nome',label:'Nome completo',value:x?x.nome:'',max:80,required:true}];
  if(novo)fields.push({id:'email',label:'E-mail',type:'email',max:254},{id:'telefone',label:'Telefone com DDD (opcional)',type:'tel',max:20},{id:'senha',label:'Senha inicial (mínimo 8 caracteres)',type:'password',max:72,required:true});
  fields.push({id:'perfil',label:'Perfil de acesso',type:'select',value:x?x.perfil:'cliente',options:[['cliente','Cliente'],['profissional','Profissional'],['admin','Administrador']]},
    {id:'papel',label:'Papel na escola',type:'select',value:x?x.papel:'aluno',options:[['aluno','Aluno'],['professor','Professor'],['gestao','Gestão']]});
  if(!novo)fields.push({id:'ativo',label:'Conta ativa',type:'checkbox',value:x.ativo});
  openModal({title:novo?'Novo usuário':'Editar '+x.nome,desc:novo?'A pessoa entra com o e-mail ou telefone e a senha que você definir aqui.':'Mudar o perfil ou desativar encerra as sessões abertas dessa pessoa.',fields:fields,submit:novo?'Criar usuário':'Salvar',onSubmit:function(v){
    var btn=document.querySelector('#mform button[type=submit]'),er=$('#merr');
    var body=novo?{nome:v.nome,email:v.email||undefined,telefone:v.telefone||undefined,senha:v.senha,perfil:v.perfil,papel:v.papel}:{nome:v.nome,perfil:v.perfil,papel:v.papel,ativo:v.ativo};
    btn.disabled=true;
    (novo?API.admin.criar(body):API.admin.atualizar(x.id,body)).then(function(){
      closeModal();toast(novo?'Usuário criado.':'Alterações salvas.');ui.adm.carregando=true;renderAdmin();
    }).catch(function(e){
      btn.disabled=false;er.textContent=e.campos?Object.keys(e.campos).map(function(k){return e.campos[k]}).join(' '):e.message;er.hidden=false;
    });
    return false;
  }});
}

/* ---------- estrutura do app ---------- */
function render(){
  var u=me();
  if(!u){renderAuth();return}
  var nav=[['mural','Mural'],['groups','Grupos'],['pet','Mascote']];
  if(isAdminUI(u))nav.push(['admin','Painel']);
  $('#root').innerHTML='<header class="top"><div class="wrap top-in"><div class="brand"><i>'+ico('cap')+'</i>Pátio</div><nav class="nav" aria-label="Seções">'+nav.map(function(n){return '<button type="button" data-act="nav" data-v="'+n[0]+'">'+n[1]+'</button>'}).join('')+'</nav><div class="who"><button type="button" class="iconbtn" data-act="theme" aria-label="Alternar tema claro e escuro">'+ico(effectiveTheme()==='dark'?'sun':'moon')+'</button>'+avatar(u,true)+'<div class="nm"><b>'+esc(firstName(u.name))+'</b><span>'+ROLE[u.role]+'</span></div><button type="button" class="iconbtn" data-act="logout" aria-label="Sair">'+ico('out')+'</button></div></div></header><main class="wrap main" id="main"></main>';
  renderView();
}
function renderView(){
  var main=$('#main');if(!main)return;
  Array.prototype.forEach.call(document.querySelectorAll('.nav button'),function(b){if(b.dataset.v===ui.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(ui.view==='groups')renderGroups();else if(ui.view==='pet')renderPet();else if(ui.view==='admin')renderAdmin();else renderMural();
}

/* ---------- avisos ---------- */
function noticeCard(n,opts){
  var g=S.groups.find(function(x){return x.id===n.groupId}),a=user(n.userId),u=me(),cat=CATS[n.cat]||CATS.geral;
  var tile=n.date?'<div class="ntile" aria-hidden="true"><b>'+new Date(n.date).getDate()+'</b><span>'+new Date(n.date).toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()+'</span></div>':'<div class="ntile" aria-hidden="true">'+ico('bell')+'</div>';
  var canEdit=g&&u&&(n.userId===u.id||canManage(g,u));
  return '<article class="notice'+(n.pinned?' pinned':'')+'" style="--cc:'+cat[1]+'">'+tile+'<div class="nbody"><div class="nmeta"><span class="chip" style="--cc:'+cat[1]+'">'+cat[0]+'</span>'+(opts.showGroup&&g?'<span class="chip" style="--cc:'+esc(g.color)+'"><i></i>'+esc(g.name)+'</span>':'')+(n.pinned?'<span class="chip" style="--cc:var(--accent)">'+ico('pin','')+'Fixado</span>':'')+'</div><h3>'+esc(n.title)+'</h3>'+(n.date?'<p class="when">'+esc(fmtWhen(n.date))+' · '+relDay(n.date)+'</p>':'')+(n.body?'<p class="ntext">'+esc(n.body)+'</p>':'')+'<div class="nfoot"><span>'+(a?esc(a.name):'Usuário removido')+' · '+(a?ROLE[a.role]:'')+' · '+ago(n.ts)+'</span><span class="sp"></span>'+(canEdit?'<button type="button" class="mini" data-act="pinnotice" data-id="'+n.id+'" aria-label="'+(n.pinned?'Desafixar':'Fixar')+' aviso" title="'+(n.pinned?'Desafixar':'Fixar')+'">'+ico('pin')+'</button><button type="button" class="mini" data-act="delnotice" data-id="'+n.id+'" aria-label="Apagar aviso" title="Apagar">'+ico('trash')+'</button>':'')+'</div></div></article>';
}
function sortNotices(list){
  var today=sod(Date.now());
  var up=list.filter(function(n){return n.pinned||!n.date||n.date>=today});
  var past=list.filter(function(n){return !n.pinned&&n.date&&n.date<today}).sort(function(a,b){return b.date-a.date});
  up.sort(function(a,b){
    if(a.pinned!==b.pinned)return a.pinned?-1:1;
    if(a.date&&b.date)return a.date-b.date;
    if(a.date)return -1;if(b.date)return 1;return b.ts-a.ts;
  });
  return {up:up,past:past};
}
function noticeModal(gid){
  var u=me(),gs=myGroups().filter(function(g){return isStaff(u)&&memberOf(g,u.id)});
  if(!gs.length){toast('Entre em um grupo para publicar avisos.','bad');return}
  var fields=[];
  if(!gid)fields.push({id:'gid',label:'Grupo',type:'select',options:gs.map(function(g){return [g.id,g.name]})});
  fields.push({id:'title',label:'Título',max:80,ph:'Ex.: Prova de Ciências',required:true},
    {id:'cat',label:'Categoria',type:'select',options:Object.keys(CATS).map(function(k){return [k,CATS[k][0]]})},
    {id:'date',label:'Data e hora do evento (opcional)',type:'datetime-local'},
    {id:'body',label:'Detalhes',type:'textarea',max:800,ph:'O que os alunos precisam saber?'},
    {id:'pinned',label:'Fixar no topo do mural',type:'checkbox'});
  openModal({title:'Novo aviso',fields:fields,submit:'Publicar',onSubmit:function(v){
    if(!v.title)return 'Dê um título ao aviso.';
    var g=S.groups.find(function(x){return x.id===(gid||v.gid)});if(!g)return 'Escolha um grupo.';
    var n={id:uid(),groupId:g.id,userId:u.id,title:v.title,cat:v.cat,date:v.date?new Date(v.date).getTime():null,body:v.body,pinned:v.pinned,ts:Date.now()};
    S.notices.push(n);if(!save()){S.notices.pop();return false}
    toast('Aviso publicado em '+g.name+'.');
    if(ui.view==='groups'&&ui.tab==='avisos')renderTabBody();else if(ui.view==='mural')renderMural();
  }});
}
function renderMural(){
  var u=me(),gs=myGroups(),ids=ui.mFilter==='all'?gs.map(function(g){return g.id}):[ui.mFilter];
  if(ui.mFilter!=='all'&&!gs.some(function(g){return g.id===ui.mFilter}))ui.mFilter='all';
  var s=sortNotices(S.notices.filter(function(n){return ids.indexOf(n.groupId)>-1}));
  var h='<div class="phead"><div><h1>Mural de avisos</h1><p class="hint">Avisos de professores e gestão para os seus grupos.</p></div>'+(isStaff(u)&&gs.length?'<button type="button" class="btn accent" data-act="newnotice">'+ico('plus')+'Novo aviso</button>':'')+'</div>';
  if(!gs.length){$('#main').innerHTML=h+'<div class="empty"><h3>Você ainda não está em nenhum grupo</h3><p>Entre com o código de um grupo ou crie o seu para receber avisos aqui.</p><button type="button" class="btn" data-act="gotogroups">Ir para Grupos</button></div>';return}
  h+='<div class="filters" role="group" aria-label="Filtrar por grupo"><button type="button" class="fchip" data-act="mfilter" data-id="all" aria-pressed="'+(ui.mFilter==='all')+'">Todos</button>'+gs.map(function(g){return '<button type="button" class="fchip" style="--gc:'+esc(g.color)+'" data-act="mfilter" data-id="'+g.id+'" aria-pressed="'+(ui.mFilter===g.id)+'"><i></i>'+esc(g.name)+'</button>'}).join('')+'</div>';
  if(!s.up.length&&!s.past.length)h+='<div class="empty"><h3>Nenhum aviso por aqui</h3><p>'+(isStaff(u)?'Publique o primeiro aviso para os alunos.':'Quando professores ou a gestão publicarem algo, aparece aqui.')+'</p></div>';
  if(s.up.length)h+='<h2 class="sect">Hoje e próximos</h2><div class="grid">'+s.up.map(function(n){return noticeCard(n,{showGroup:true})}).join('')+'</div>';
  if(s.past.length)h+='<h2 class="sect">Anteriores</h2><div class="grid">'+s.past.map(function(n){return noticeCard(n,{showGroup:true})}).join('')+'</div>';
  $('#main').innerHTML=h;
}

/* ---------- grupos ---------- */
function renderGroups(){
  var gs=myGroups();
  if(!gs.some(function(g){return g.id===ui.gid}))ui.gid=gs.length?gs[0].id:null;
  $('#main').innerHTML='<div class="glayout" id="glayout" data-m="'+ui.m+'"><aside class="glist" id="glist" aria-label="Meus grupos"></aside><section class="gdetail" id="gdetail"></section></div>';
  renderGroupList();renderDetail();
}
function lastMsg(g){var l=null;S.messages.forEach(function(m){if(m.groupId===g.id&&(!l||m.ts>l.ts))l=m});return l}
function renderGroupList(){
  var el=$('#glist');if(!el)return;
  var gs=myGroups();
  var h='<div class="gh"><h2>Meus grupos</h2><div style="display:flex;gap:6px"><button type="button" class="btn ghost sm" data-act="joingroup">Entrar</button><button type="button" class="btn sm" data-act="newgroup">'+ico('plus')+'Novo</button></div></div>';
  if(!gs.length)h+='<div class="empty" style="padding:22px 12px"><h3>Nenhum grupo ainda</h3><p>Crie um grupo para sua sala ou projeto, ou entre com um código.</p></div>';
  h+=gs.map(function(g){var l=lastMsg(g);return '<button type="button" class="gitem" data-act="pick" data-id="'+g.id+'" aria-current="'+(g.id===ui.gid)+'"><span class="gtile" style="--gc:'+esc(g.color)+'">'+esc(initials(g.name.replace(/[^\p{L}\p{N} ]/gu,'')||'G'))+'</span><span class="t"><b>'+esc(g.name)+'</b><span>'+(l?esc(firstName(user(l.userId)?user(l.userId).name:'')+': '+(l.text||'Imagem')):KINDS[g.kind]+' · sem mensagens')+'</span></span></button>'}).join('');
  el.innerHTML=h;
}
function renderDetail(){
  var el=$('#gdetail');if(!el)return;
  var g=currentGroup(),u=me();
  if(!g){el.className='gdetail blank';el.innerHTML='<div class="empty" style="border:0"><h3>Escolha um grupo</h3><p>As conversas, avisos e membros aparecem aqui.</p></div>';return}
  el.className='gdetail';
  var tabs=[['chat','Conversa'],['avisos','Avisos'],['membros','Membros e tags']];
  el.innerHTML='<div class="ghead"><button type="button" class="iconbtn backbtn" data-act="back" aria-label="Voltar para a lista de grupos">'+ico('back')+'</button><span class="gtile" style="--gc:'+esc(g.color)+'">'+esc(initials(g.name.replace(/[^\p{L}\p{N} ]/gu,'')||'G'))+'</span><div class="gt"><h2>'+esc(g.name)+'</h2><div class="sub"><span>'+KINDS[g.kind]+'</span><span>·</span><span>'+g.members.length+' membros</span><span>·</span><span class="code">'+esc(g.code)+'<button type="button" class="mini" data-act="copycode" aria-label="Copiar código do grupo" title="Copiar código">'+ico('copy')+'</button></span></div></div>'+(canManage(g,u)?'<button type="button" class="btn ghost sm" data-act="editgroup">'+ico('edit')+'Editar</button>':'')+'</div><div class="tabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-act="tab" data-t="'+t[0]+'" aria-selected="'+(ui.tab===t[0])+'">'+t[1]+'</button>'}).join('')+'</div><div class="gbody" id="gbody"></div>';
  renderTabBody();
}
function renderTabBody(){
  var g=currentGroup(),b=$('#gbody');if(!g||!b)return;
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'),function(x){x.setAttribute('aria-selected',String(x.dataset.t===ui.tab))});
  if(ui.tab==='avisos')tabAvisos(g,b);else if(ui.tab==='membros')tabMembros(g,b);else tabChat(g,b);
}

/* conversa */
function tabChat(g,b){
  b.innerHTML='<div class="msgs" id="msgList" aria-live="polite"></div><div class="composer"><div id="imgPrev"></div><div class="crow"><button type="button" class="iconbtn" data-act="attach" aria-label="Anexar imagem" title="Anexar imagem">'+ico('img')+'</button><input type="file" id="fileIn" accept="image/*" hidden><textarea id="msgIn" rows="1" placeholder="Escreva uma mensagem em '+esc(g.name)+'" aria-label="Mensagem"></textarea><button type="button" class="btn accent" data-act="send" aria-label="Enviar mensagem">'+ico('send')+'</button></div></div>';
  $('#msgIn').value=ui.draft;autosize($('#msgIn'));
  renderPreview();renderMessages(true);
}
function renderMessages(force){
  var list=$('#msgList'),g=currentGroup();if(!list||!g)return;
  var near=list.scrollHeight-list.scrollTop-list.clientHeight<80;
  var ms=S.messages.filter(function(m){return m.groupId===g.id}).sort(function(a,b){return a.ts-b.ts});
  if(!ms.length){list.innerHTML='<div class="empty" style="margin:auto;border:0"><h3>Comece a conversa</h3><p>Escreva a primeira mensagem ou envie uma imagem.</p></div>';return}
  var h='',lastDay='';
  ms.forEach(function(m){
    var d=dayLabel(m.ts);if(d!==lastDay){h+='<div class="day">'+esc(d)+'</div>';lastDay=d}
    var a=user(m.userId)||{id:'x',name:'Usuário removido',role:'aluno'},mine=m.userId===session;
    h+='<div class="msg'+(mine?' mine':'')+'">'+(mine?'':avatar(a,true))+'<div class="mbub">'+(mine?'':'<div class="mhead"><b>'+esc(a.name)+'</b>'+roleChip(a)+mTags(g,a.id).slice(0,2).map(tagChip).join('')+'</div>')+(m.text?'<p>'+esc(m.text)+'</p>':'')+(m.img?'<img class="mimg" src="'+esc(m.img)+'" alt="Imagem enviada por '+esc(a.name)+'" data-act="zoom">':'')+'<time>'+fmtTime(m.ts)+(mine?' <button type="button" class="mini" data-act="delmsg" data-id="'+m.id+'" aria-label="Apagar mensagem" title="Apagar">'+ico('trash')+'</button>':'')+'</time></div></div>';
  });
  list.innerHTML=h;
  if(force||near)list.scrollTop=list.scrollHeight;
}
function renderPreview(){var el=$('#imgPrev');if(!el)return;el.innerHTML=ui.img?'<div class="prev"><img src="'+esc(ui.img)+'" alt="Imagem a enviar"><button type="button" class="btn ghost sm" data-act="rmimg">'+ico('x')+'Remover</button></div>':''}
function autosize(t){if(!t)return;t.style.height='auto';t.style.height=Math.min(t.scrollHeight,140)+'px'}
function sendMessage(){
  var g=currentGroup();if(!g)return;
  var inp=$('#msgIn'),text=inp.value.trim();
  if(!text&&!ui.img)return;
  var m={id:uid(),groupId:g.id,userId:session,text:text,img:ui.img||null,ts:Date.now()};
  S.messages.push(m);
  if(!save()){S.messages.pop();return}
  inp.value='';ui.draft='';ui.img=null;autosize(inp);renderPreview();renderMessages(true);renderGroupList();
}
function fileToDataURL(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      var max=1100,k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
      var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
      URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.78));
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error('img'))};
    im.src=url;
  });
}
async function handleFile(file){
  if(!file)return;
  if(!/^image\//.test(file.type))return toast('Escolha um arquivo de imagem (JPG, PNG, GIF ou WebP).','bad');
  if(file.size>20*1024*1024)return toast('A imagem passa de 20 MB.','bad');
  try{ui.img=await fileToDataURL(file);renderPreview()}catch(e){toast('Não foi possível ler essa imagem.','bad')}
}

/* avisos do grupo */
function tabAvisos(g,b){
  var u=me(),s=sortNotices(S.notices.filter(function(n){return n.groupId===g.id})),can=isStaff(u);
  var h='<div class="scroll"><div class="row2"><p class="hint" style="max-width:52ch">'+(can?'Os avisos publicados aqui aparecem para todos os membros de '+esc(g.name)+'.':'Somente professores e gestão publicam avisos. Você recebe tudo aqui e no Mural.')+'</p>'+(can?'<button type="button" class="btn accent" data-act="newnotice" data-gid="'+g.id+'">'+ico('plus')+'Novo aviso</button>':'')+'</div>';
  if(!s.up.length&&!s.past.length)h+='<div class="empty"><h3>Sem avisos neste grupo</h3><p>'+(can?'Publique o primeiro aviso sobre uma prova, reunião ou evento.':'Quando houver um aviso, ele aparece aqui.')+'</p></div>';
  if(s.up.length)h+='<div class="grid">'+s.up.map(function(n){return noticeCard(n,{})}).join('')+'</div>';
  if(s.past.length)h+='<h3 class="sect" style="margin:6px 0 0">Anteriores</h3><div class="grid">'+s.past.map(function(n){return noticeCard(n,{})}).join('')+'</div>';
  b.innerHTML=h+'</div>';
}

/* membros e tags */
function tabMembros(g,b){
  var u=me(),mg=canManage(g,u);
  var h='<div class="scroll"><section class="panel"><div class="row2"><h3>Tags do grupo</h3>'+(mg?'<button type="button" class="btn sm" data-act="newtag">'+ico('plus')+'Nova tag</button>':'')+'</div><p class="hint" style="margin-top:4px">Cada grupo tem a sua própria lista. As tags aparecem no perfil de cada membro e ao lado do nome nas mensagens.</p><div class="taglist">'+
  (g.tags.length?g.tags.map(function(t){return mg?'<span class="tagedit">'+tagChip(t)+'<button type="button" class="mini" data-act="edittag" data-id="'+t.id+'" aria-label="Editar tag '+esc(t.name)+'" title="Editar">'+ico('edit')+'</button><button type="button" class="mini" data-act="deltag" data-id="'+t.id+'" aria-label="Apagar tag '+esc(t.name)+'" title="Apagar">'+ico('trash')+'</button></span>':tagChip(t)}).join(''):'<p class="hint">Nenhuma tag criada.</p>')+'</div></section>'+
  '<section class="panel"><h3>Membros ('+g.members.length+')</h3><ul class="mlist">'+g.members.map(function(m){
    var a=user(m.userId);if(!a)return '';
    var tg=mTags(g,a.id);
    return '<li class="mrow">'+avatar(a)+'<div class="mi"><div class="nm">'+esc(a.name)+(a.id===u.id?' <span class="hint">(você)</span>':'')+roleChip(a)+(g.ownerId===a.id?'<span class="chip" style="--cc:var(--accent)">Criador</span>':'')+'</div><div class="tg">'+(tg.length?tg.map(tagChip).join(''):'<span class="hint">Sem tags</span>')+'</div></div><div class="ac">'+(mg?'<button type="button" class="btn ghost sm" data-act="membertags" data-id="'+a.id+'">'+ico('tag','')+'Editar tags</button>':'')+(isStaff(u)&&a.role==='aluno'?'<button type="button" class="btn ghost sm" data-act="givegrade" data-id="'+a.id+'">Lançar nota</button>':'')+'</div></li>';
  }).join('')+'</ul></section>'+
  '<section class="panel"><div class="row2"><div><h3>'+(g.ownerId===u.id?'Excluir grupo':'Sair do grupo')+'</h3><p class="hint">'+(g.ownerId===u.id?'Apaga o grupo, as mensagens e os avisos para todos.':'Você deixa de receber mensagens e avisos deste grupo.')+'</p></div><button type="button" class="btn danger sm" data-act="'+(g.ownerId===u.id?'delgroup':'leavegroup')+'">'+(g.ownerId===u.id?'Excluir':'Sair')+'</button></div></section></div>';
  b.innerHTML=h;
}
IC.tag='<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>';

function tagModal(g,t){
  openModal({title:t?'Editar tag':'Nova tag',desc:'A tag vale só para o grupo '+g.name+'.',fields:[{id:'name',label:'Nome da tag',value:t?t.name:'',max:24,required:true,ph:'Ex.: Monitor'},{id:'color',label:'Cor',type:'swatches',options:PALETTE,value:t?t.color:''}],submit:t?'Salvar':'Criar tag',onSubmit:function(v){
    if(!v.name)return 'Dê um nome à tag.';
    if(g.tags.some(function(x){return norm(x.name)===norm(v.name)&&(!t||x.id!==t.id)}))return 'Já existe uma tag com esse nome neste grupo.';
    var snap=JSON.stringify(g.tags);
    if(t){t.name=v.name;t.color=v.color}else g.tags.push({id:uid(),name:v.name,color:v.color});
    if(!save()){g.tags=JSON.parse(snap);return false}
    renderTabBody();
  }});
}
function memberTagsModal(g,uid2){
  var a=user(uid2),m=memberOf(g,uid2);if(!a||!m)return;
  openModal({title:'Tags de '+firstName(a.name),desc:'Escolha as tags que aparecem no perfil de '+a.name+' neste grupo.',fields:[{id:'tags',label:'Tags',type:'checks',options:g.tags.map(function(t){return [t.id,tagChip(t)]}),value:m.tags}],submit:'Salvar',onSubmit:function(v){
    var old=m.tags;m.tags=v.tags;if(!save()){m.tags=old;return false}renderTabBody();
  }});
}
function groupModal(g){
  openModal({title:g?'Editar grupo':'Novo grupo',desc:g?'':'Você será o criador e poderá gerenciar tags. Compartilhe o código para outras pessoas entrarem.',fields:[{id:'name',label:'Nome do grupo',value:g?g.name:'',max:50,required:true,ph:'Ex.: 9º A, Grêmio, Feira de Ciências'},{id:'kind',label:'Tipo',type:'select',options:Object.keys(KINDS).map(function(k){return [k,KINDS[k]]}),value:g?g.kind:'sala'},{id:'desc',label:'Descrição (opcional)',type:'textarea',max:240,value:g?g.desc:'',ph:'Para que serve este grupo?'},{id:'color',label:'Cor do grupo',type:'swatches',options:PALETTE,value:g?g.color:''}],submit:g?'Salvar':'Criar grupo',onSubmit:function(v){
    if(!v.name)return 'Dê um nome ao grupo.';
    if(g){var old=JSON.stringify([g.name,g.kind,g.desc,g.color]);g.name=v.name;g.kind=v.kind;g.desc=v.desc;g.color=v.color;if(!save()){var o=JSON.parse(old);g.name=o[0];g.kind=o[1];g.desc=o[2];g.color=o[3];return false}renderGroupList();renderDetail();return}
    var u=me(),code,codes=S.groups.map(function(x){return x.code}),al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do{code='';for(var i=0;i<6;i++)code+=al[Math.floor(Math.random()*al.length)]}while(codes.indexOf(code)>-1);
    var ng={id:uid(),name:v.name,kind:v.kind,desc:v.desc,color:v.color,code:code,ownerId:u.id,createdAt:Date.now(),
      tags:DEFAULT_TAGS[v.kind].map(function(t){return {id:uid(),name:t[0],color:t[1]}}),members:[]};
    ng.members.push({userId:u.id,tags:autoTag(ng,u)});
    S.groups.push(ng);if(!save()){S.groups.pop();return false}
    ui.gid=ng.id;ui.tab='chat';ui.m='detail';renderGroups();toast('Grupo criado. Código de entrada: '+ng.code);
  }});
}
function joinModal(){
  openModal({title:'Entrar em um grupo',desc:'Peça o código ao professor ou ao criador do grupo.',fields:[{id:'code',label:'Código do grupo',max:12,required:true,ph:'Ex.: 8B2026'}],submit:'Entrar',onSubmit:function(v){
    var c=v.code.toUpperCase().replace(/\s/g,''),g=S.groups.find(function(x){return x.code===c}),u=me();
    if(!g)return 'Nenhum grupo com esse código. Confira e tente de novo.';
    if(memberOf(g,u.id)){ui.gid=g.id;ui.m='detail';renderGroups();toast('Você já está neste grupo.');return}
    var m={userId:u.id,tags:autoTag(g,u)};g.members.push(m);
    if(!save()){g.members.pop();return false}
    ui.gid=g.id;ui.tab='chat';ui.m='detail';renderGroups();toast('Você entrou em '+g.name+'.');
  }});
}

/* ---------- mascote ---------- */
function levelOf(avg){return avg==null?-1:(avg<5?0:(avg<7?1:(avg<9?2:3)))}
var LEVEL_NAME=['Abatido','Tranquilo','Feliz','Radiante'];
var SAYS={'-1':['…tem alguém aí?','Lance uma nota para me chocar!'],0:['Hoje não estou bem…','Será que dá para estudar um pouquinho?'],1:['Estou de boa!','Dá para melhorar, né?'],2:['Que dia bom!','Vamos manter o ritmo!'],3:['Sou o bichinho mais feliz da escola!','Que notas incríveis!']};
function star(cx,cy,R){var r=R*.45,p=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p.push((cx+Math.cos(a)*rr).toFixed(1)+','+(cy+Math.sin(a)*rr).toFixed(1))}return p.join(' ')}
function petSVG(lvl,c,name){
  var ink='#1d1d1f',ln='rgba(0,0,0,.3)',sh='<ellipse cx="100" cy="182" rx="56" ry="8" fill="rgba(0,0,0,.14)"/>';
  if(lvl<0)return '<svg class="pet" data-act="pat" viewBox="0 0 200 200" role="img" aria-label="Ovo de '+esc(name)+', esperando a primeira nota">'+sh+'<g class="wobble"><path d="M100 22C140 22 166 80 166 122c0 33-30 56-66 56s-66-23-66-56C34 80 60 22 100 22Z" fill="'+c+'" stroke="'+ln+'" stroke-width="3"/><circle cx="76" cy="108" r="11" fill="rgba(255,255,255,.4)"/><circle cx="122" cy="80" r="8" fill="rgba(255,255,255,.4)"/><circle cx="124" cy="134" r="13" fill="rgba(255,255,255,.4)"/><circle cx="92" cy="60" r="5" fill="rgba(255,255,255,.4)"/></g></svg>';
  var sc=[.88,.95,1,1.06][lvl],eyes,mouth,extra='',cheeks='<circle cx="58" cy="120" r="9" fill="rgba(255,110,140,.4)"/><circle cx="142" cy="120" r="9" fill="rgba(255,110,140,.4)"/>';
  var openMouth='<path d="M84 122Q100 148 116 122Z" fill="#7a2e3a" stroke="'+ink+'" stroke-width="3.5" stroke-linejoin="round"/><path d="M92 135Q100 130 108 135Q100 142 92 135Z" fill="#ff8fa3"/>';
  if(lvl===0){
    eyes='<circle cx="76" cy="102" r="6.5" fill="'+ink+'"/><circle cx="124" cy="102" r="6.5" fill="'+ink+'"/><circle cx="78" cy="100" r="2" fill="#fff"/><circle cx="126" cy="100" r="2" fill="#fff"/><path d="M64 90L88 84M136 90L112 84" stroke="'+ink+'" stroke-width="4" stroke-linecap="round"/>';
    mouth='<path d="M86 134Q100 122 114 134" fill="none" stroke="'+ink+'" stroke-width="4.5" stroke-linecap="round"/>';cheeks='';
    extra='<path d="M82 112q-6 10 0 14 6-4 0-14z" fill="#6fb7ff"/><path d="M158 56q-6 10 0 14 6-4 0-14z" fill="#6fb7ff"/>';
  }else if(lvl===1){
    eyes='<circle cx="76" cy="100" r="6.5" fill="'+ink+'"/><circle cx="124" cy="100" r="6.5" fill="'+ink+'"/><circle cx="78" cy="98" r="2" fill="#fff"/><circle cx="126" cy="98" r="2" fill="#fff"/>';
    mouth='<path d="M88 126Q100 134 112 126" fill="none" stroke="'+ink+'" stroke-width="4.5" stroke-linecap="round"/>';cheeks='';
  }else if(lvl===2){
    eyes='<path d="M66 102Q76 88 86 102M114 102Q124 88 134 102" fill="none" stroke="'+ink+'" stroke-width="5" stroke-linecap="round"/>';
    mouth=openMouth;
    extra='<path d="M100 40Q100 28 102 18" stroke="#3b8f4f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M102 20Q120 6 132 18Q118 30 102 20Z" fill="#4cae63" stroke="rgba(0,0,0,.25)" stroke-width="2"/><path d="M100 26Q84 14 72 24Q86 36 100 26Z" fill="#5cc473" stroke="rgba(0,0,0,.25)" stroke-width="2"/>';
  }else{
    eyes='<polygon points="'+star(76,98,14)+'" fill="#f2b705" stroke="'+ink+'" stroke-width="2.5" stroke-linejoin="round"/><polygon points="'+star(124,98,14)+'" fill="#f2b705" stroke="'+ink+'" stroke-width="2.5" stroke-linejoin="round"/>';
    mouth=openMouth;
    extra='<path d="M72 46L78 20L92 36L100 14L108 36L122 20L128 46Z" fill="#f2b705" stroke="rgba(0,0,0,.35)" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="22" r="3.5" fill="#e0453a"/>'+
      '<polygon class="tw" points="'+star(28,60,9)+'" fill="#f2b705"/><polygon class="tw" style="animation-delay:.5s" points="'+star(174,70,7)+'" fill="#f2b705"/><polygon class="tw" style="animation-delay:1s" points="'+star(162,22,8)+'" fill="#f2b705"/>';
  }
  var rotL=lvl===0?' transform="rotate(-30 62 58)"':'',rotR=lvl===0?' transform="rotate(30 138 58)"':'';
  var armL=lvl===3?'rotate(-35 34 130)':'',armR=lvl===3?'rotate(35 166 130)':'';
  return '<svg class="pet'+(lvl===0?' sad':'')+'" data-act="pat" viewBox="0 0 200 200" role="img" aria-label="'+esc(name)+', mascote '+LEVEL_NAME[lvl].toLowerCase()+'">'+sh+'<g transform="translate(100 178) scale('+sc+') translate(-100 -178)"><g class="bob">'+
    '<g'+rotL+'><path d="M56 62L46 20L88 44Z" fill="'+c+'" stroke="'+ln+'" stroke-width="3" stroke-linejoin="round"/><path d="M58 52L53 31L74 44Z" fill="rgba(255,170,190,.75)"/></g>'+
    '<g'+rotR+'><path d="M144 62L154 20L112 44Z" fill="'+c+'" stroke="'+ln+'" stroke-width="3" stroke-linejoin="round"/><path d="M142 52L147 31L126 44Z" fill="rgba(255,170,190,.75)"/></g>'+
    '<ellipse cx="30" cy="130" rx="12" ry="19" fill="'+c+'" stroke="'+ln+'" stroke-width="3" transform="'+armL+'"/><ellipse cx="170" cy="130" rx="12" ry="19" fill="'+c+'" stroke="'+ln+'" stroke-width="3" transform="'+armR+'"/>'+
    '<ellipse cx="74" cy="178" rx="18" ry="9" fill="'+c+'" stroke="'+ln+'" stroke-width="3"/><ellipse cx="126" cy="178" rx="18" ry="9" fill="'+c+'" stroke="'+ln+'" stroke-width="3"/>'+
    '<path d="M100 38C146 38 172 84 170 126C168 160 138 178 100 178C62 178 32 160 30 126C28 84 54 38 100 38Z" fill="'+c+'" stroke="'+ln+'" stroke-width="3"/><ellipse cx="100" cy="148" rx="40" ry="24" fill="rgba(255,255,255,.35)"/>'+
    cheeks+eyes+mouth+extra+'</g></g></svg>';
}
function renderPet(){
  var u=me(),main=$('#main');
  if(u.role!=='aluno'){
    main.innerHTML='<div class="phead"><div><h1>Mascote</h1></div></div><div class="empty"><h3>O mascote é dos alunos</h3><p>Cada aluno cuida de um bichinho que evolui com as notas do trimestre. Para ajudar, abra um grupo, vá em Membros e tags e use Lançar nota no perfil do aluno.</p><button type="button" class="btn" data-act="gotogroups">Ir para Grupos</button></div>';
    return;
  }
  var pet=S.pets[u.id]||{name:'Bolota',color:PET_COLORS[0]};
  var all=S.grades.filter(function(g){return g.studentId===u.id});
  var avgOf=function(t){var l=all.filter(function(g){return g.tri===t});return l.length?l.reduce(function(s,g){return s+g.value},0)/l.length:null};
  var gs=all.filter(function(g){return g.tri===ui.tri}).sort(function(a,b){return b.ts-a.ts});
  var avg=avgOf(ui.tri),lvl=levelOf(avg);
  var health=avg==null?0:Math.round(avg*10),joy=gs.length?Math.round(gs.filter(function(g){return g.value>=7}).length/gs.length*100):0;
  var th=[5,7,9],evo=lvl<0?0:(lvl===3?100:Math.round(((avg-(lvl===0?0:th[lvl-1]))/(th[lvl]-(lvl===0?0:th[lvl-1])))*100));
  var next=lvl<0?'Lance a primeira nota do trimestre para chocar o ovo.':(lvl===3?'Seu mascote está no nível máximo. Continue assim!':'Faltam '+avgFmt(th[lvl]-avg)+' ponto'+((th[lvl]-avg)>=1.05?'s':'')+' de média para evoluir para '+LEVEL_NAME[lvl+1].toLowerCase()+'.');
  var bar=function(l,v,col){return '<div class="bar"><span>'+l+'</span><div class="tr" role="progressbar" aria-valuenow="'+v+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+l+'"><i style="width:'+v+'%;--bc:'+col+'"></i></div><output>'+v+'%</output></div>'};
  var say=SAYS[lvl][ui.pat==null?0:ui.pat%SAYS[lvl].length];
  var h='<div class="phead"><div><h1>Mascote</h1><p class="hint">Ele muda de humor e evolui conforme a média das notas em cada trimestre.</p></div></div><div class="pgrid"><section><div class="petbox" id="petbox"><div class="speech" id="speech" role="status">'+esc(say)+'</div>'+petSVG(lvl,pet.color,pet.name)+'</div><div class="petinfo"><div class="petname"><h2>'+esc(pet.name)+'</h2><span class="chip" style="--cc:'+(lvl<0?'var(--ink-2)':(lvl===0?'var(--bad)':(lvl===1?'#b7791f':'var(--ok)')))+'">'+(lvl<0?'Ovo':LEVEL_NAME[lvl])+'</span><span class="sp" style="flex:1"></span><button type="button" class="btn ghost sm" data-act="pat">Fazer carinho</button><button type="button" class="btn ghost sm" data-act="editpet">'+ico('edit')+'Personalizar</button></div><div class="bars">'+bar('Saúde',health,'var(--ok)')+bar('Felicidade',joy,'#e0a41a')+bar('Evolução',evo,'var(--c-aluno)')+'</div><p class="hint">'+next+'</p></div></section>'+
  '<section><div class="tris" role="group" aria-label="Escolher trimestre">'+[1,2,3].map(function(t){var a=avgOf(t),l=levelOf(a);return '<button type="button" class="tri" data-act="tri" data-t="'+t+'" aria-pressed="'+(ui.tri===t)+'"><b>'+t+'º trimestre</b><span class="av2">'+(a==null?'—':avgFmt(a))+'</span><span>'+(l<0?'Sem notas':LEVEL_NAME[l])+'</span></button>'}).join('')+'</div>'+
  '<div class="panel"><div class="row2" style="margin-bottom:10px"><h3>Notas do '+ui.tri+'º trimestre</h3><span class="hint">Média: <b>'+(avg==null?'—':avgFmt(avg))+'</b></span></div><form id="gradeForm" class="gform" novalidate><div class="field"><label for="gr_sub">Matéria</label><input id="gr_sub" name="subject" list="subjects" maxlength="30" autocomplete="off" placeholder="Ex.: Matemática"></div><div class="field"><label for="gr_val">Nota</label><input id="gr_val" name="value" inputmode="decimal" maxlength="4" placeholder="0 a 10" autocomplete="off"></div><button class="btn" type="submit">'+ico('plus')+'Adicionar</button></form><p class="err" id="gradeErr" role="alert" hidden></p>'+
  (gs.length?gs.map(function(g){var by=user(g.by),own=g.by===u.id;return '<div class="grow"><div class="sj"><b>'+esc(g.subject)+'</b><span>'+(own?'Lançada por você':'Lançada por '+esc(by?by.name:'professor'))+'</span></div><span class="gv '+(g.value>=7?'hi':(g.value>=5?'mid':'lo'))+'">'+avgFmt(g.value)+'</span>'+(own?'<button type="button" class="mini" data-act="delgrade" data-id="'+g.id+'" aria-label="Apagar nota de '+esc(g.subject)+'" title="Apagar">'+ico('trash')+'</button>':'')+'</div>'}).join(''):'<p class="hint" style="padding:8px 0">Nenhuma nota neste trimestre. Adicione a sua ou peça para um professor lançar.</p>')+'</div></section></div>';
  main.innerHTML=h;
}
function addGrade(studentId,subject,valueStr,tri){
  var v=parseFloat(String(valueStr).replace(',','.'));
  if(!subject)return 'Informe a matéria.';
  if(isNaN(v)||v<0||v>10)return 'A nota precisa estar entre 0 e 10.';
  v=Math.round(v*10)/10;
  var g={id:uid(),studentId:studentId,subject:subject,value:v,tri:tri,by:session,ts:Date.now()};
  S.grades.push(g);if(!save()){S.grades.pop();return 'save'}
  return null;
}
function patPet(){
  var box=$('#petbox');if(!box)return;
  ui.pat=(ui.pat==null?0:ui.pat)+1;
  var u=me(),all=S.grades.filter(function(g){return g.studentId===u.id&&g.tri===ui.tri}),lvl=levelOf(all.length?all.reduce(function(s,g){return s+g.value},0)/all.length:null);
  var sp=$('#speech');if(sp)sp.textContent=SAYS[lvl][ui.pat%SAYS[lvl].length];
  for(var i=0;i<4;i++){var hrt=document.createElement('span');hrt.className='heart';hrt.textContent=lvl===0?'💧':'♥';hrt.style.cssText='left:'+(38+Math.random()*24)+'%;top:'+(40+Math.random()*16)+'%;color:#e0536f;animation-delay:'+(i*.12)+'s';box.appendChild(hrt);setTimeout(function(el){el.remove()},1400,hrt)}
}

/* ---------- tema ---------- */
function effectiveTheme(){var t=null;try{t=localStorage.getItem(TKEY)}catch(e){}return t||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
function applyTheme(){var t=null;try{t=localStorage.getItem(TKEY)}catch(e){}if(t)document.documentElement.setAttribute('data-theme',t)}
function toggleTheme(){var n=effectiveTheme()==='dark'?'light':'dark';try{localStorage.setItem(TKEY,n)}catch(e){}document.documentElement.setAttribute('data-theme',n);var b=document.querySelector('[data-act=theme]');if(b)b.innerHTML=ico(n==='dark'?'sun':'moon')}

/* ---------- ações ---------- */
var ACT={
  authtab:function(t){ui.authTab=t.dataset.t;renderAuth()},
  logout:function(){API.sair();sairDoApp('')},
  admnew:function(){userAdminModal(null)},
  admedit:function(t){var x=ui.adm&&ui.adm.itens.find(function(i){return String(i.id)===t.dataset.id});if(x)userAdminModal(x)},
  admreload:function(){carregarAdmin()},
  admprev:function(){if(ui.adm&&ui.adm.pagina>1){ui.adm.pagina--;carregarAdmin()}},
  admnext:function(){if(ui.adm){ui.adm.pagina++;carregarAdmin()}},
  theme:toggleTheme,
  nav:function(t){ui.view=t.dataset.v;renderView()},
  gotogroups:function(){ui.view='groups';renderView()},
  mfilter:function(t){ui.mFilter=t.dataset.id;renderMural()},
  newnotice:function(t){noticeModal(t.dataset.gid||null)},
  delnotice:function(t){var n=S.notices.find(function(x){return x.id===t.dataset.id});if(!n)return;confirmBox('Apagar este aviso?','“'+n.title+'” some para todos os membros do grupo.','Apagar',function(){S.notices=S.notices.filter(function(x){return x.id!==n.id});save();ui.view==='groups'?renderTabBody():renderMural()})},
  pinnotice:function(t){var n=S.notices.find(function(x){return x.id===t.dataset.id});if(!n)return;n.pinned=!n.pinned;save();ui.view==='groups'?renderTabBody():renderMural()},
  pick:function(t){ui.gid=t.dataset.id;ui.tab='chat';ui.m='detail';ui.draft='';ui.img=null;var l=$('#glayout');if(l)l.dataset.m='detail';renderGroupList();renderDetail()},
  back:function(){ui.m='list';var l=$('#glayout');if(l)l.dataset.m='list'},
  newgroup:function(){groupModal(null)},
  joingroup:joinModal,
  editgroup:function(){var g=currentGroup();if(g)groupModal(g)},
  copycode:function(){var g=currentGroup();if(!g)return;var done=function(){toast('Código '+g.code+' copiado.')},fail=function(){toast('Código do grupo: '+g.code)};try{navigator.clipboard.writeText(g.code).then(done,fail)}catch(e){fail()}},
  tab:function(t){ui.tab=t.dataset.t;renderTabBody()},
  send:sendMessage,
  attach:function(){var f=$('#fileIn');if(f)f.click()},
  rmimg:function(){ui.img=null;renderPreview()},
  zoom:function(t){var lb=$('#lightbox');lb.querySelector('img').src=t.getAttribute('src');lb.hidden=false},
  closelb:function(){$('#lightbox').hidden=true},
  closemodal:closeModal,
  delmsg:function(t){var i=S.messages.findIndex(function(m){return m.id===t.dataset.id&&m.userId===session});if(i<0)return;S.messages.splice(i,1);save();renderMessages();renderGroupList()},
  newtag:function(){var g=currentGroup();if(g&&canManage(g,me()))tagModal(g,null)},
  edittag:function(t){var g=currentGroup();if(!g||!canManage(g,me()))return;var tg=g.tags.find(function(x){return x.id===t.dataset.id});if(tg)tagModal(g,tg)},
  deltag:function(t){var g=currentGroup();if(!g||!canManage(g,me()))return;var tg=g.tags.find(function(x){return x.id===t.dataset.id});if(!tg)return;confirmBox('Apagar a tag “'+tg.name+'”?','Ela será removida do perfil de todos os membros deste grupo.','Apagar tag',function(){g.tags=g.tags.filter(function(x){return x.id!==tg.id});g.members.forEach(function(m){m.tags=m.tags.filter(function(x){return x!==tg.id})});save();renderTabBody()})},
  membertags:function(t){var g=currentGroup();if(g&&canManage(g,me()))memberTagsModal(g,t.dataset.id)},
  givegrade:function(t){
    var a=user(t.dataset.id);if(!a||!isStaff(me()))return;
    openModal({title:'Lançar nota para '+firstName(a.name),fields:[{id:'subject',label:'Matéria',list:'subjects',max:30,required:true,ph:'Ex.: Matemática'},{id:'value',label:'Nota (0 a 10)',mode:'decimal',max:4,ph:'Ex.: 8,5'},{id:'tri',label:'Trimestre',type:'select',options:[[1,'1º trimestre'],[2,'2º trimestre'],[3,'3º trimestre']],value:curTri()}],submit:'Lançar nota',onSubmit:function(v){
      var r=addGrade(a.id,v.subject,v.value,parseInt(v.tri,10));if(r==='save')return false;if(r)return r;toast('Nota lançada para '+firstName(a.name)+'.');
    }});
  },
  leavegroup:function(){var g=currentGroup();if(!g)return;confirmBox('Sair de '+g.name+'?','Você deixa de receber mensagens e avisos deste grupo.','Sair',function(){g.members=g.members.filter(function(m){return m.userId!==session});save();ui.gid=null;ui.m='list';renderGroups()})},
  delgroup:function(){var g=currentGroup();if(!g||g.ownerId!==session)return;confirmBox('Excluir '+g.name+'?','O grupo, as mensagens e os avisos serão apagados para todos. Não dá para desfazer.','Excluir grupo',function(){S.groups=S.groups.filter(function(x){return x.id!==g.id});S.messages=S.messages.filter(function(m){return m.groupId!==g.id});S.notices=S.notices.filter(function(n){return n.groupId!==g.id});save();ui.gid=null;ui.m='list';renderGroups()})},
  tri:function(t){ui.tri=parseInt(t.dataset.t,10);ui.pat=null;renderPet()},
  pat:patPet,
  delgrade:function(t){var i=S.grades.findIndex(function(g){return g.id===t.dataset.id&&g.by===session});if(i<0)return;S.grades.splice(i,1);save();renderPet()},
  editpet:function(){
    var u=me(),p=S.pets[u.id]||{name:'Bolota',color:PET_COLORS[0]};
    openModal({title:'Personalizar mascote',fields:[{id:'name',label:'Nome',value:p.name,max:16,required:true},{id:'color',label:'Cor',type:'swatches',options:PET_COLORS,value:p.color}],submit:'Salvar',onSubmit:function(v){
      if(!v.name)return 'Dê um nome ao mascote.';var old=S.pets[u.id];S.pets[u.id]={name:v.name,color:v.color};if(!save()){S.pets[u.id]=old;return false}renderPet();
    }});
  }
};
document.addEventListener('click',function(e){
  if(e.target.classList&&e.target.classList.contains('overlay')){closeModal();return}
  var t=e.target.closest('[data-act]');if(!t)return;
  var fn=ACT[t.dataset.act];if(fn){if(t.tagName!=='IMG'&&t.tagName!=='svg')e.preventDefault();fn(t,e)}
});
document.addEventListener('submit',function(e){
  var f=e.target;
  if(f.id==='loginForm'){e.preventDefault();doLogin(f)}
  else if(f.id==='signupForm'){e.preventDefault();doSignup(f)}
  else if(f.id==='forgotForm'){e.preventDefault();doForgot(f)}
  else if(f.id==='resetForm'){e.preventDefault();doReset(f)}
  else if(f.id==='admSearch'){e.preventDefault();ui.adm.busca=f.elements.q.value.trim();ui.adm.pagina=1;carregarAdmin()}
  else if(f.id==='gradeForm'){
    e.preventDefault();
    var r=addGrade(session,f.elements.subject.value.trim(),f.elements.value.value,ui.tri);
    if(r&&r!=='save'){var p=$('#gradeErr');p.textContent=r;p.hidden=false;return}
    if(!r){ui.pat=null;renderPet()}
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeModal();$('#lightbox').hidden=true}
  if(e.target&&e.target.id==='msgIn'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage()}
});
document.addEventListener('input',function(e){if(e.target&&e.target.id==='msgIn'){ui.draft=e.target.value;autosize(e.target)}});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='fileIn'){handleFile(e.target.files[0]);e.target.value=''}});
document.addEventListener('paste',function(e){
  if(!e.target||e.target.id!=='msgIn'||!e.clipboardData)return;
  var f=Array.prototype.slice.call(e.clipboardData.files).find(function(x){return /^image\//.test(x.type)});
  if(f){e.preventDefault();handleFile(f)}
});
window.addEventListener('storage',function(e){
  if(e.key!==KEY)return;
  var n=null;try{n=JSON.parse(e.newValue)}catch(x){}
  if(!n)return;S=n;
  if(!me()){render();return}
  if(ui.view==='groups'&&$('#glist')){
    renderGroupList();
    if(!currentGroup()){renderDetail()}
    else if(ui.tab==='chat')renderMessages();else renderTabBody();
  }else if($('#main'))renderView();
});

async function init(){
  S=load();
  if(!S||!S.users){S=seed();save()}
  var dl=$('#subjects');dl.innerHTML=SUBJECTS.map(function(x){return '<option value="'+x+'">'}).join('');
  applyTheme();lerHash();
  window.addEventListener('patio:expirou',function(){if(session)sairDoApp('Sua sessão expirou. Entre novamente.')});
  window.addEventListener('hashchange',function(){if(!session){lerHash();renderAuth()}});
  if(API.getToken()&&ui.authTab!=='reset'){
    $('#root').innerHTML='<p class="hint" style="padding:40px 16px;text-align:center" role="status">Carregando…</p>';
    try{var r=await API.eu();session=syncUser(r.usuario);render();return}
    catch(e){if(e.status===0){ui.authMsg=e.message}}
  }
  render();
}
init();
})();
