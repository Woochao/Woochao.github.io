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
const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

// 한국 공휴일: 양력 고정일은 자동 처리, 음력/대체공휴일은 연도별로 필요 시 추가
// 2026년 기준 주요 공휴일 반영
const koreanHolidays = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "삼일절 대체공휴일",
  "2026-05-01": "근로자의 날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "부처님오신날 대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "광복절 대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "개천절 대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절"
};

function checkAdmin(){
  if(adminPw.value===ADMIN_PASSWORD){
    adminBox.style.display='none';
    excelBox.style.display='block';
    alert('관리자 모드 활성화');
  } else alert('비밀번호 오류');
}

function formatDateKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function normalizeDate(value){
  if(value === undefined || value === null || value === '') return '';

  // 엑셀 날짜가 숫자 serial로 들어오는 경우
  if(typeof value === 'number'){
    const parsed = XLSX.SSF.parse_date_code(value);
    if(parsed){
      return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
    }
  }

  // JS Date 객체로 들어오는 경우
  if(value instanceof Date && !isNaN(value)){
    return formatDateKey(value);
  }

  const text = String(value).trim();

  // 2026-05-01, 2026.5.1, 2026/5/1 모두 허용
  const matched = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if(matched){
    return `${matched[1]}-${String(matched[2]).padStart(2,'0')}-${String(matched[3]).padStart(2,'0')}`;
  }

  return text;
}

function cleanName(value){
  return String(value ?? '').trim();
}

excelInput?.addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;

  const r=new FileReader();
  r.onload=ev=>{
    try{
      const wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array', cellDates:true});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      let schedule={}, workers=new Set();

      rows.forEach((row, index)=>{
        const date=normalizeDate(row['날짜']);
        if(!date) return;

        schedule[date]=[];
        shiftOrder.forEach(s=>{
          const name=cleanName(row[s]);
          if(!name){
            throw new Error(`${index+2}행 ${date} : ${s} 근무자 이름이 비어있습니다.`);
          }
          schedule[date].push({type:s, name});
          workers.add(name);
        });
      });

      localStorage.setItem('schedule', JSON.stringify({workers:[...workers].sort(), schedule}));
      update();
      alert('고정 3교대 적용 완료');
    }catch(err){
      alert(err.message || '엑셀 업로드 중 오류가 발생했습니다. 날짜/주간/중간/야간 열 제목을 확인해 주세요.');
    }
  };
  r.readAsArrayBuffer(file);
});

async function loadSchedule(){
  return JSON.parse(localStorage.getItem('schedule')||'{"workers":[],"schedule":{}}');
}

function populateFilter(workers){
  const selected = workerFilter.value;
  workerFilter.innerHTML='<option value="">전체</option>';
  workers.forEach(w=>{
    let o=document.createElement('option');
    o.value=w;
    o.innerText=w;
    workerFilter.appendChild(o);
  });
  workerFilter.value = workers.includes(selected) ? selected : '';
}

function isHoliday(dateKey, dayOfWeek){
  return dayOfWeek === 0 || !!koreanHolidays[dateKey];
}

function getShiftInfo(item){
  // 기존 저장 데이터("홍길동-주간")와 신규 저장 데이터({type,name})를 모두 지원
  if(typeof item === 'string'){
    const type = shiftOrder.find(s=>item.endsWith(`-${s}`)) || '';
    return {type, name:item.replace(`-${type}`, '')};
  }
  return item || {type:'', name:''};
}

function renderCalendar(data){
  calendar.innerHTML='';
  const y=currentDate.getFullYear(), m=currentDate.getMonth();
  monthTitle.innerText = `${y}년 ${m+1}월`;
  let total=0, sel=workerFilter.value;
  const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();

  weekDays.forEach((w, i)=>{
    calendar.innerHTML += `<div class="weekday ${i===0 ? 'holiday-text' : ''}">${w}</div>`;
  });

  for(let i=0;i<first;i++) calendar.innerHTML+='<div class="empty-day"></div>';

  for(let d=1; d<=last; d++){
    const dateObj = new Date(y, m, d);
    const day = dateObj.getDay();
    const ds=formatDateKey(dateObj);
    const shifts=(data.schedule&&data.schedule[ds])||[];
    const holiday = isHoliday(ds, day);
    const holidayName = koreanHolidays[ds] || (day === 0 ? '일요일' : '');
    let html='';

    shiftOrder.forEach(type=>{
      const item=shifts.map(getShiftInfo).find(s=>s.type===type);
      if(!item || !item.name) return;
      const name=item.name;
      if(sel && sel!==name) return;
      total+=shiftHours[type];
      html+=`<div class="shift" style="background:${workerColors[name]||'#eee'}"><span class="shift-type">${type}</span><span class="shift-name">${name}</span></div>`;
    });

    calendar.innerHTML+=`
      <div class="day ${holiday ? 'holiday' : 'weekday-date'}" onclick="selectDate('${ds}',this)">
        <div class="date-row">
          <span class="date">${d}</span>
          ${holidayName ? `<span class="holiday-name">${holidayName}</span>` : ''}
        </div>
        ${html || '<div class="no-shift">근무 없음</div>'}
      </div>`;
  }
  totalHours.innerText = sel ? `총 근무시간: ${total}시간` : '';
}

async function update(){
  const d=await loadSchedule();
  populateFilter(d.workers||[]);
  renderCalendar(d);
}
function prevMonth(){currentDate.setMonth(currentDate.getMonth()-1); update();}
function nextMonth(){currentDate.setMonth(currentDate.getMonth()+1); update();}
function selectDate(d,e){selectedDate=d; document.querySelectorAll('.day').forEach(x=>x.classList.remove('selected')); e.classList.add('selected');}

function requestSwap(){
  const w=workerFilter.value;
  if(!w||!selectedDate){alert('이름과 날짜 선택'); return;}
  const msg=`안녕하세요 😊\n${selectedDate} ${w} 근무 교체 가능하실까요?`;
  window.open('https://share.kakao.com/?text='+encodeURIComponent(msg),'_blank');
}

function shareKakao(){ window.open('https://share.kakao.com/?url='+encodeURIComponent(location.href),'_blank'); }
function exportPDF(){ html2pdf().from(document.querySelector('.calendar')).save(); }

fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true')
 .then(r=>r.json()).then(d=>weather.innerText=`서울 ${d.current_weather.temperature}℃`)
 .catch(()=>weather.innerText='서울 날씨 정보를 불러오지 못했습니다.');

update();
