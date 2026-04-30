let currentDate = new Date();
let selectedDate = "";

const ADMIN_PASSWORD = "1234"; // 변경 가능

const workerColors = {
  "미영":"#ffb6c1",
  "선희":"#b0e0e6",
  "지은":"#d8bfd8",
  "수정":"#ffe4b5"
};

const shiftOrder = ["주간","중간","야간"];
const shiftHours = {주간:8, 중간:8, 야간:8};

function checkAdmin(){
  if(adminPw.value===ADMIN_PASSWORD){
    adminBox.style.display='none';
    excelBox.style.display='block';
    alert('관리자 모드 활성화');
  } else alert('비밀번호 오류');
}

excelInput?.addEventListener('change', e=>{
  const r=new FileReader();
  r.onload=ev=>{
    const wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    let schedule={}, workers=new Set();

    rows.forEach(row=>{
      const date=row['날짜'];
      if(!date) return;
      schedule[date]=[];
      shiftOrder.forEach(s=>{
        if(!row[s]){alert(`${date} : ${s} 비어있음`); throw '';}
        schedule[date].push(`${row[s]}-${s}`);
        workers.add(row[s]);
      });
    });

    localStorage.setItem('schedule', JSON.stringify({workers:[...workers], schedule}));
    update(); alert('고정 3교대 적용 완료');
  };
  r.readAsArrayBuffer(e.target.files[0]);
});

async function loadSchedule(){
  return JSON.parse(localStorage.getItem('schedule')||'{"workers":[],"schedule":{}}');
}

function populateFilter(workers){
  workerFilter.innerHTML='<option value="">전체</option>';
  workers.forEach(w=>{let o=document.createElement('option');o.value=o.innerText=w;workerFilter.appendChild(o);});
}

function renderCalendar(data){
  calendar.innerHTML='';
  const y=currentDate.getFullYear(), m=currentDate.getMonth();
  monthTitle.innerText = `${y}년 ${m+1}월`;
  let total=0, sel=workerFilter.value;
  const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++) calendar.innerHTML+='<div></div>';

  for(let d=1; d<=last; d++){
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const shifts=(data.schedule&&data.schedule[ds])||[];
    let html='';

    shiftOrder.forEach(type=>{
      const item=shifts.find(s=>s.endsWith(type));
      if(!item) return;
      const name=item.split('-')[0];
      if(sel && sel!==name) return;
      total+=shiftHours[type];
      html+=`<div class="shift" style="background:${workerColors[name]||'#eee'}">${type} : ${name}</div>`;
    });

    calendar.innerHTML+=`<div class="day" onclick="selectDate('${ds}',this)"><div class="date">${d}</div>${html}</div>`;
  }
  totalHours.innerText = sel ? `총 근무시간: ${total}시간` : '';
}

async function update(){ const d=await loadSchedule(); populateFilter(d.workers||[]); renderCalendar(d); }
function prevMonth(){currentDate.setMonth(currentDate.getMonth()-1); update();}
function nextMonth(){currentDate.setMonth(currentDate.getMonth()+1); update();}
function selectDate(d,e){selectedDate=d; document.querySelectorAll('.day').forEach(x=>x.style.border=''); e.style.border='2px solid #e75480';}

function requestSwap(){
  const w=workerFilter.value;
  if(!w||!selectedDate){alert('이름과 날짜 선택'); return;}
  const msg=`안녕하세요 😊
${selectedDate} ${w} 근무 교체 가능하실까요?`;
  window.open('https://share.kakao.com/?text='+encodeURIComponent(msg),'_blank');
}

function shareKakao(){ window.open('https://share.kakao.com/?url='+encodeURIComponent(location.href),'_blank'); }
function exportPDF(){ html2pdf().from(document.querySelector('.calendar')).save(); }

fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true')
 .then(r=>r.json()).then(d=>weather.innerText=`서울 ${d.current_weather.temperature}℃`);

update();