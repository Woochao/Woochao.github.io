let currentDate = new Date();
let selectedDate = "";

const ADMIN_PASSWORD = "1234"; // 필요 시 변경

const workerColors = {
  "미영":"#ffb6c1",
  "선희":"#b0e0e6",
  "지은":"#d8bfd8",
  "수정":"#ffe4b5"
};

const shiftOrder = ["주간", "중간", "야간"];
const shiftHours = { 주간: 8, 중간: 8, 야간: 8 };
const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

// 2026년 한국 기준 주요 공휴일 및 대체공휴일
// 다른 연도 사용 시 해당 연도 공휴일을 추가하면 됩니다.
const koreanHolidays = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-01": "근로자의 날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절"
};

function checkAdmin(){
  if(adminPw.value === ADMIN_PASSWORD){
    adminBox.style.display = 'none';
    excelBox.style.display = 'block';
    alert('관리자 모드 활성화');
  } else {
    alert('비밀번호 오류');
  }
}

function formatDateKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function isEndMarker(value){
  return String(value ?? '').trim().toLowerCase() === 'end';
}

function normalizeDate(value){
  if(value === undefined || value === null || value === '') return '';

  if(typeof value === 'number'){
    const parsed = XLSX.SSF.parse_date_code(value);
    if(parsed){
      return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
    }
  }

  if(value instanceof Date && !isNaN(value)){
    return formatDateKey(value);
  }

  const text = String(value).trim();
  if(!text) return '';

  // 2026-05-01, 2026.5.1, 2026/5/1 허용
  const matched = text.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})/);
  if(matched){
    return `${matched[1]}-${String(matched[2]).padStart(2,'0')}-${String(matched[3]).padStart(2,'0')}`;
  }

  // 5/1, 5.1처럼 연도가 없는 경우 현재 달력 연도 적용
  const shortMatched = text.match(/^(\d{1,2})[-/.\s](\d{1,2})$/);
  if(shortMatched){
    const y = currentDate.getFullYear();
    return `${y}-${String(shortMatched[1]).padStart(2,'0')}-${String(shortMatched[2]).padStart(2,'0')}`;
  }

  return '';
}

function cleanName(value){
  return String(value ?? '').trim();
}

function isBlankRow(row){
  return !cleanName(row['날짜']) && !cleanName(row['주간']) && !cleanName(row['중간']) && !cleanName(row['야간']);
}

excelInput?.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try{
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

      let schedule = {};
      let workers = new Set();
      let importedCount = 0;

      for(let i = 0; i < rows.length; i++){
        const row = rows[i];
        const excelRowNo = i + 2; // 1행은 제목행
        const rawDate = row['날짜'];

        // 날짜 열에 end 입력 시 이후 행은 읽지 않음
        if(isEndMarker(rawDate)) break;

        // 완전 빈 행은 무시
        if(isBlankRow(row)) continue;

        const date = normalizeDate(rawDate);
        if(!date){
          throw new Error(`${excelRowNo}행 : 날짜 값 오류입니다. 날짜 열에는 2026-05-01, 2026/5/1, 2026.5.1 또는 end를 입력해 주세요.`);
        }

        schedule[date] = [];

        for(const shiftType of shiftOrder){
          const name = cleanName(row[shiftType]);
          if(!name){
            throw new Error(`${excelRowNo}행 ${date} : ${shiftType} 근무자 이름이 비어 있습니다.`);
          }
          schedule[date].push({ type: shiftType, name });
          workers.add(name);
        }

        importedCount++;
      }

      if(importedCount === 0){
        throw new Error('가져온 근무표가 없습니다. 엑셀 첫 행 제목이 날짜 / 주간 / 중간 / 야간인지 확인해 주세요.');
      }

      localStorage.setItem('schedule', JSON.stringify({ workers: [...workers].sort(), schedule }));
      update();
      alert(`${importedCount}일치 고정 3교대 일정이 적용되었습니다.`);
    }catch(err){
      alert(err.message || '엑셀 업로드 중 오류가 발생했습니다.');
    }finally{
      e.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
});

async function loadSchedule(){
  return JSON.parse(localStorage.getItem('schedule') || '{"workers":[],"schedule":{}}');
}

function populateFilter(workers){
  const selected = workerFilter.value;
  workerFilter.innerHTML = '<option value="">전체</option>';

  workers.forEach(w => {
    const option = document.createElement('option');
    option.value = w;
    option.innerText = w;
    workerFilter.appendChild(option);
  });

  workerFilter.value = workers.includes(selected) ? selected : '';
}

function isHoliday(dateKey, dayOfWeek){
  // 일요일 또는 한국 공휴일은 빨간색
  return dayOfWeek === 0 || !!koreanHolidays[dateKey];
}

function getShiftInfo(item){
  // 기존 저장 데이터("홍길동-주간")와 신규 저장 데이터({type,name}) 모두 지원
  if(typeof item === 'string'){
    const type = shiftOrder.find(s => item.endsWith(`-${s}`)) || '';
    return { type, name: item.replace(`-${type}`, '') };
  }
  return item || { type: '', name: '' };
}

function renderCalendar(data){
  calendar.innerHTML = '';

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  monthTitle.innerText = `${y}년 ${m+1}월`;

  let total = 0;
  const selectedWorker = workerFilter.value;
  const first = new Date(y, m, 1).getDay();
  const last = new Date(y, m + 1, 0).getDate();

  weekDays.forEach((w, i) => {
    calendar.innerHTML += `<div class="weekday ${i === 0 ? 'holiday-text' : ''}">${w}</div>`;
  });

  for(let i = 0; i < first; i++){
    calendar.innerHTML += '<div class="empty-day"></div>';
  }

  for(let d = 1; d <= last; d++){
    const dateObj = new Date(y, m, d);
    const day = dateObj.getDay();
    const dateKey = formatDateKey(dateObj);
    const shifts = (data.schedule && data.schedule[dateKey]) || [];
    const holiday = isHoliday(dateKey, day);
    const holidayName = koreanHolidays[dateKey] || (day === 0 ? '일요일' : '');
    let html = '';

    shiftOrder.forEach(type => {
      const item = shifts.map(getShiftInfo).find(s => s.type === type);
      if(!item || !item.name) return;
      const name = item.name;
      if(selectedWorker && selectedWorker !== name) return;

      total += shiftHours[type];
      html += `<div class="shift" style="background:${workerColors[name] || '#eee'}"><span class="shift-type">${type}</span><span class="shift-name">${name}</span></div>`;
    });

    calendar.innerHTML += `
      <div class="day ${holiday ? 'holiday' : 'weekday-date'}" onclick="selectDate('${dateKey}', this)">
        <div class="date-row">
          <span class="date">${d}</span>
          ${holidayName ? `<span class="holiday-name">${holidayName}</span>` : ''}
        </div>
        ${html || '<div class="no-shift">근무 없음</div>'}
      </div>`;
  }

  totalHours.innerText = selectedWorker ? `총 근무시간: ${total}시간` : '';
}

async function update(){
  const data = await loadSchedule();
  populateFilter(data.workers || []);
  renderCalendar(data);
}

function prevMonth(){
  currentDate.setMonth(currentDate.getMonth() - 1);
  update();
}

function nextMonth(){
  currentDate.setMonth(currentDate.getMonth() + 1);
  update();
}

function selectDate(dateKey, element){
  selectedDate = dateKey;
  document.querySelectorAll('.day').forEach(x => x.classList.remove('selected'));
  element.classList.add('selected');
}


function exportPDF(){
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth() + 1;
  const element = document.querySelector('.calendar');

  document.body.classList.add('pdf-mode');

  // A4 가로 1장 고정용: 여백 최소화 + 달력 영역 압축
  const option = {
    margin: [4, 4, 4, 4],
    filename: `3교대_근무일정_${y}년_${String(m).padStart(2, '0')}월.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 1.4,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'landscape'
    },
    pagebreak: { mode: ['avoid-all'] }
  };

  html2pdf()
    .set(option)
    .from(element)
    .save()
    .finally(() => document.body.classList.remove('pdf-mode'));
}

fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true')
  .then(r => r.json())
  .then(d => weather.innerText = `서울 ${d.current_weather.temperature}℃`)
  .catch(() => weather.innerText = '서울 날씨 정보를 불러오지 못했습니다.');

update();
