javascript:(async()=>{
if(document.getElementById("point-ui"))return;

const box=document.createElement("div");
box.id="point-ui";
box.style="position:fixed;top:20px;right:20px;width:440px;background:#fff;padding:14px;border-radius:12px;z-index:99999;font-family:Arial;box-shadow:0 8px 24px rgba(0,0,0,.18)";
box.innerHTML=`
<div style="font-weight:700;font-size:16px">
  🎓 Tra cứu điểm
  <span id="close" style="float:right;cursor:pointer">✖</span>
</div>

<input id="msv" placeholder="Mã sinh viên" style="width:100%;padding:9px;margin-top:8px">

<div style="position:relative">
  <input id="courseSearch" placeholder="Tìm môn học..." style="width:100%;padding:9px;margin-top:6px">
  <div id="courseList" style="position:absolute;top:42px;width:100%;max-height:160px;overflow:auto;background:#fff;border:1px solid #ccc;border-radius:8px;display:none;z-index:2"></div>
</div>

<select id="ky" style="width:100%;padding:9px;margin-top:6px"></select>

<button id="btn" style="width:100%;padding:10px;margin-top:10px;background:#1976d2;color:#fff;border:0;border-radius:8px">
  Tra cứu
</button>

<div id="content" style="margin-top:10px"></div>
`;

document.body.appendChild(box);
box.querySelector("#close").onclick=()=>box.remove();

/* ===== KỲ ===== */
const kySel=box.querySelector("#ky");
for(let y=25;y>=22;y--){
  kySel.add(new Option(`Kỳ 2 năm 20${y}-20${y+1}`,`${y}2`));
  kySel.add(new Option(`Kỳ 1 năm 20${y}-20${y+1}`,`${y}1`));
  kySel.add(new Option(`Kỳ hè năm 20${y-1}-20${y}`,`${y-1}3`));
}

/* ===== TOKEN ===== */
const token=localStorage.getItem("accessToken");
const content=box.querySelector("#content");
if(!token){
  content.innerHTML="❌ Chưa đăng nhập StudentHub";
  return;
}

/* ===== LẤY DANH SÁCH MÔN ===== */
let res;
try{
  res=await fetch("https://studenthub.uet.edu.vn/api/student/program",{
    headers:{Authorization:"Bearer "+token}
  });
}catch(e){
  content.innerHTML="❌ Không gọi được API chương trình đào tạo";
  return;
}
if(!res.ok){
  content.innerHTML="❌ Token hết hạn hoặc 403";
  return;
}

const data=(await res.json()).data||{};
const courses=[];
Object.values(data.groupedCourses||{}).forEach(g=>{
  (g.courses||[]).forEach(c=>{
    courses.push({code:c.courseCode,name:c.name});
  });
});

/* ===== SEARCH ===== */
const courseSearch=box.querySelector("#courseSearch");
const list=box.querySelector("#courseList");

courseSearch.oninput=()=>{
  const q=courseSearch.value.toLowerCase();
  list.innerHTML="";
  if(!q){list.style.display="none";return;}
  courses
    .filter(c=>c.code.toLowerCase().includes(q)||c.name.toLowerCase().includes(q))
    .slice(0,20)
    .forEach(c=>{
      const d=document.createElement("div");
      d.style="padding:6px;cursor:pointer";
      d.textContent=`${c.code} - ${c.name}`;
      d.onclick=()=>{
        courseSearch.value=c.code;
        list.style.display="none";
      };
      list.appendChild(d);
    });
  list.style.display="block";
};

document.addEventListener("click",e=>{
  if(!box.contains(e.target)) list.style.display="none";
});

/* ===== TRA CỨU ===== */
box.querySelector("#btn").onclick=async()=>{
  const msv=box.querySelector("#msv").value.trim();
  const courseCode=courseSearch.value.trim();
  const ky=kySel.value;

  if(!msv||!courseCode||!ky){
    content.innerHTML="⚠️ Nhập đủ MSV, môn và kỳ";
    return;
  }

  const pointCode=`${msv}_${courseCode}_${ky}`;
  content.innerHTML="⏳ Đang tra cứu...";

  const r=await fetch(
    "https://studenthub.uet.edu.vn/api/student/point/detail/point-code",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:"Bearer "+token
      },
      body:JSON.stringify({pointCode})
    }
  );

  const j=await r.json();

  if(!j.data||!j.data.length){
    content.innerHTML="⚠️ Chưa có điểm / Chọn sai học kỳ";
    return;
  }

  const d=j.data[0];
  const row=(label,value)=>`
    <div style="display:flex;justify-content:space-between;margin:4px 0">
      <span style="color:#555">${label}</span>
      <b>${value ?? "—"}</b>
    </div>
  `;

  content.innerHTML=`
    ${row("📘 Tên môn học",d.name)}
    ${row("🆔 Mã môn",d.courseCode)}
    ${row("📊 Số tín chỉ",d.courseCredit)}
    <hr>
    ${row("🎯 Điểm hệ 4",d.point4)}
    ${row("📈 Điểm hệ 10",d.point10)}
    ${row("📝 Giữa kỳ",d.pointMidTerm)}
    ${row("🧪 Cuối kỳ",d.pointFinalTerm)}
  `;
};
})();
