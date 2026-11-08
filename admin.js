const $ = id => document.getElementById(id);
let token = "";
$("load").onclick = loadOrders;
async function api(url, options={}) {
  return fetch(url, { ...options, headers: { ...(options.headers||{}), Authorization: "Bearer " + token, "Content-Type":"application/json" } });
}
async function loadOrders() {
  token = $("password").value;
  $("adminMsg").textContent = "ऑर्डर लोड होत आहेत...";
  const r = await api("/api/admin/orders");
  const data = await r.json();
  if (!r.ok) { $("adminMsg").textContent = data.error || "प्रवेश नाकारला."; return; }
  $("adminMsg").textContent = `${data.length} ऑर्डर`;
  $("orders").innerHTML = "";
  data.forEach(o => {
    const card = document.createElement("article"); card.className = "panel"; card.style.marginTop = "16px";
    const title = document.createElement("h3"); title.textContent = `${o.id} — ${o.name} (${o.phone})`; card.append(title);
    const info = document.createElement("p"); info.textContent = `${new Date(o.createdAt).toLocaleString("mr-IN")} | ${o.printType} | प्रती: ${o.copies} | पेमेंट: ${o.payment} | स्थिती: ${o.status}`; card.append(info);
    const files = document.createElement("ul");
    o.files.forEach(f => { const li=document.createElement("li"); const a=document.createElement("a"); a.href="#"; a.textContent=f.originalName; a.onclick=async e=>{e.preventDefault();const fr=await api(`/api/admin/file/${o.id}/${encodeURIComponent(f.storedName)}`);const blob=await fr.blob();const u=URL.createObjectURL(blob);const link=document.createElement("a");link.href=u;link.download=f.originalName;link.click();URL.revokeObjectURL(u)};li.append(a);files.append(li); });
    card.append(files);
    const select=document.createElement("select");
    ["नवीन ऑर्डर — तपासणी बाकी","तपासली — प्रिंटसाठी मंजूर","प्रिंट पूर्ण","ऑर्डर रद्द"].forEach(s=>{const op=document.createElement("option");op.value=s;op.textContent=s;select.append(op)});
    select.value=o.status; const btn=document.createElement("button");btn.textContent="स्थिती जतन करा";btn.onclick=async()=>{const rr=await api(`/api/admin/orders/${o.id}`,{method:"PATCH",body:JSON.stringify({status:select.value})});$("adminMsg").textContent=rr.ok?"स्थिती जतन झाली.":"स्थिती जतन करता आली नाही.";};
    card.append(select,btn); $("orders").append(card);
  });
}
