/* ========== APP: login, clock, tasks, quiz, confetti, WebAudio ========== */

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const el = sel => document.querySelector(sel);

/* ---------- DOM references ---------- */
const loginPage = $('login-page');
const appPage = $('app-page');
const btnLogin = $('btnLogin');
const loginName = $('loginName');
const loginPass = $('loginPass');

const greeting = $('greeting');
const clockEl = $('clock');
const quoteEl = $('quote');

const taskTitle = $('taskTitle');
const taskCategory = $('taskCategory');
const taskDate = $('taskDate');
const taskTime = $('taskTime');
const btnAdd = $('btnAdd');
const btnClear = $('btnClear');
const taskList = $('taskList');

const streakValue = $('streakValue');
const starsValue = $('starsValue');
const progressFill = $('progressFill');
const progressText = $('progressText');

const quizModal = $('quizModal');
const quizQuestion = $('quizQuestion');
const quizOptions = $('quizOptions');
const quizClose = $('quizClose');

const confettiCanvas = document.getElementById('confetti-canvas');

/* ---------- tiny data stores ---------- */
let tasks = []; // {id,title,cat,date,time,done}
let streak = Number(localStorage.getItem('streak') || 0);
let stars = Number(localStorage.getItem('stars') || 0);

/* ---------- sample quotes and quizzes ---------- */
const quotes = [
  "Small steps every day — big wins later.",
  "Do one thing that scares you today.",
  "Focus on progress, not perfection.",
  "Finish small tasks to build momentum!"
];

const quizzes = [
  { q: "Which planet is known as the Red Planet?", o:["Venus","Mars","Jupiter"], a:"Mars" },
  { q: "HTML stands for?", o:["HighText Machine Lang","HyperText Markup Language","Hyper Tool Multi Lang"], a:"HyperText Markup Language" },
  { q: "What is 5 + 7?", o:["10","11","12"], a:"12" }
];

/* ---------- WebAudio utility (no files) ---------- */
function playTone(type){
  // create audio ctx & simple tone with quick envelope
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  if(type === 'correct'){ o.frequency.value = 880; o.type = 'sine'; }
  else if(type === 'wrong'){ o.frequency.value = 220; o.type = 'sawtooth'; }
  else if(type === 'click'){ o.frequency.value = 600; o.type = 'triangle'; }

  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  o.start(now);
  // stop with fade
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  o.stop(now + 0.4);
}

/* ---------- confetti (simple canvas particles) ---------- */
const C = confettiCanvas;
const ctx = C.getContext('2d');
let confettiParticles = [];
function fitCanvas(){
  C.width = innerWidth; C.height = innerHeight;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function spawnConfettiBurst(){
  const colors = ['#ff476f','#ffa62b','#30e3ca','#7b61ff','#ffd166'];
  for(let i=0;i<110;i++){
    confettiParticles.push({
      x: Math.random()*C.width,
      y: Math.random()*-C.height*0.2,
      vx: (Math.random()-0.5)*6,
      vy: 2 + Math.random()*6,
      rot: Math.random()*360,
      vr: (Math.random()-0.5)*10,
      size: 6 + Math.random()*8,
      color: colors[Math.floor(Math.random()*colors.length)]
    });
  }
  // animate for ~2.5s
  let t0 = performance.now();
  function frame(now){
    ctx.clearRect(0,0,C.width,C.height);
    confettiParticles.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      ctx.restore();
    });
    // remove offscreen particles
    confettiParticles = confettiParticles.filter(p => p.y < C.height + 40);
    if(confettiParticles.length>0) requestAnimationFrame(frame);
    else ctx.clearRect(0,0,C.width,C.height);
  }
  requestAnimationFrame(frame);
}

/* ---------- clock ---------- */
function updateClock(){
  const now = new Date();
  let h = now.getHours(); let m = now.getMinutes(); let s = now.getSeconds();
  const ampm = h>=12 ? 'PM':'AM'; h = h%12||12;
  clockEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
}
setInterval(updateClock,1000);
updateClock();

/* ---------- UI helpers ---------- */
function setQuoteRandom(){ quoteEl.textContent = quotes[Math.floor(Math.random()*quotes.length)]; }
setQuoteRandom();
streakValue.textContent = streak;
starsValue.textContent = stars;

/* ---------- persistence helpers ---------- */
function saveState(){
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('streak', String(streak));
  localStorage.setItem('stars', String(stars));
}
function loadState(){
  const raw = localStorage.getItem('tasks');
  tasks = raw ? JSON.parse(raw) : [];
  const s = localStorage.getItem('streak'); if(s) streak = Number(s);
  const t = localStorage.getItem('stars'); if(t) stars = Number(t);
  streakValue.textContent = streak;
  starsValue.textContent = stars;
}
loadState();

/* ---------- render tasks ---------- */
function formatTime12(t){
  if(!t) return '';
  const [hh,mm] = t.split(':').map(Number);
  const ampm = hh>=12 ? 'PM':'AM';
  let h = hh%12 || 12;
  return `${h}:${String(mm).padStart(2,'0')} ${ampm}`;
}

function renderTasks(){
  taskList.innerHTML = '';
  tasks.forEach(task=>{
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done? ' completed':'');
    li.dataset.id = task.id;

    // left
    const left = document.createElement('div'); left.className = 'task-left';
    const badge = document.createElement('div'); badge.className = 'cat-badge'; badge.textContent = categoryIcon(task.cat);
    const meta = document.createElement('div'); meta.className = 'task-meta';
    const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title;
    const sub = document.createElement('div'); sub.className = 'task-sub muted'; sub.textContent = `${task.cat} • ${task.date || ''} ${formatTime12(task.time)}`;
    meta.appendChild(title); meta.appendChild(sub);
    left.appendChild(badge); left.appendChild(meta);

    // actions
    const actions = document.createElement('div'); actions.className = 'task-actions';
    const doneBtn = document.createElement('button'); doneBtn.className='icon-btn'; doneBtn.title='Complete'; doneBtn.innerHTML='✔';
    const delBtn = document.createElement('button'); delBtn.className='icon-btn'; delBtn.title='Delete'; delBtn.innerHTML='🗑';
    actions.appendChild(doneBtn); actions.appendChild(delBtn);

    li.appendChild(left); li.appendChild(actions);
    taskList.appendChild(li);

    // animations
    li.style.opacity = 0; li.style.transform = 'translateY(6px)';
    requestAnimationFrame(()=>{ li.style.transition='all .33s ease'; li.style.opacity=1; li.style.transform='translateY(0)'; });

    // events
    doneBtn.addEventListener('click', ()=>{
      if(task.done) return; // only once
      task.done = true; // mark
      // visual
      li.classList.add('completed');
      // reward: star + maybe quiz
      stars += 1;
      starsValue.textContent = stars;
      saveState();
      playTone('correct'); // WebAudio ding
      // small delay then show quiz for bonus
      setTimeout(()=> showQuizForTask(task.id), 600);
      updateProgress();
    });

    delBtn.addEventListener('click', ()=>{
      // remove smoothly
      li.style.transition = 'all .25s ease'; li.style.opacity=0; li.style.transform='translateX(20px)';
      setTimeout(()=>{
        tasks = tasks.filter(t => t.id !== task.id);
        renderTasks(); saveState(); updateProgress();
        playTone('click');
      },260);
    });
  });

  updateProgress();
}

/* category -> icon (simple mapping) */
function categoryIcon(cat){
  if(!cat) return '📝';
  if(cat==='Study') return '📘';
  if(cat==='Work') return '💼';
  if(cat==='Fitness') return '🏃';
  if(cat==='Personal') return '🌸';
  return '📝';
}

/* ---------- add / clear ---------- */
btnAdd.addEventListener('click', ()=>{
  const title = taskTitle.value.trim();
  const cat = taskCategory.value || 'General';
  const date = taskDate.value || '';
  const time = taskTime.value || '';
  if(!title) { alert('Enter a task title'); return; }

  const newTask = { id: Date.now(), title, cat, date, time, done:false };
  tasks.unshift(newTask); // newest first
  taskTitle.value=''; taskDate.value=''; taskTime.value='';
  playTone('click');
  saveState(); renderTasks();
});

btnClear.addEventListener('click', ()=>{
  if(!confirm('Clear all tasks?')) return;
  tasks = []; saveState(); renderTasks(); playTone('wrong');
});

/* ---------- progress */ 
function updateProgress(){
  const total = tasks.length;
  const done = tasks.filter(t=>t.done).length;
  const pct = total === 0 ? 0 : Math.round((done/total)*100);
  progressFill.style.width = pct + '%';
  progressText.textContent = `${done}/${total}`;
}

/* ---------- quiz flow ---------- */
function showQuizForTask(taskId){
  // pick random quiz
  const q = quizzes[Math.floor(Math.random()*quizzes.length)];
  quizQuestion.textContent = q.q;
  quizOptions.innerHTML = ''; quizModal.classList.remove('hidden');

  q.o.sort(()=>0.5-Math.random()).forEach(opt=>{
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.style.margin = '6px';
    b.textContent = opt;
    b.onclick = ()=>{
      if(opt === q.a){
        // correct
        playTone('correct');
        streak += 1; stars += 1;
        streakValue.textContent = streak; starsValue.textContent = stars;
        saveState();
        spawnConfettiBurst();
        setTimeout(()=> { quizModal.classList.add('hidden'); }, 1500);
      } else {
        // wrong
        playTone('wrong');
        alert('Wrong answer — try again later!');
        quizModal.classList.add('hidden');
      }
    };
    quizOptions.appendChild(b);
  });
}

$('quizClose').addEventListener('click', ()=> quizModal.classList.add('hidden'));

/* ---------- confetti wrapper ---------- */
function spawnConfettiBurst(){ spawnConfettiBurstImpl(); } // alias

// use same function name as earlier but scoped
function spawnConfettiBurstImpl(){ // keep using confettiParticles method but simpler here
  spawnConfettiBurst(); // uses global impl declared above in script (already defined)
}

/* ---------- login flow ---------- */
btnLogin.addEventListener('click', ()=>{
  const name = loginName.value.trim();
  const pass = loginPass.value.trim();
  if(!name || !pass){ alert('Enter name and password (demo)'); return; }
  // welcome
  greeting.textContent = `Hi, ${name}`;
  // swap pages with subtle animation
  loginPage.classList.remove('active');
  loginPage.classList.add('hidden');
  appPage.classList.add('active');
  // show quote
  setQuoteRandom();
  saveState();
  renderTasks();
});

/* ---------- quote & helpers ---------- */
function setQuoteRandom(){ quoteEl.textContent = quotes[Math.floor(Math.random()*quotes.length)]; }

/* ---------- initial render ---------- */
renderTasks();
updateProgress();
setQuoteRandom();

/* ---------- safe confetti function binding if not hoisted ---------- */
/* (The confetti functions were defined near top of this file) */
document.getElementById("quiz-container").style.display = "block";
