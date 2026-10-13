/* ============================================================
   JORDAN — Copperline Legal Group demo chat widget
   Demo sales assistant. Zero external requests. localStorage only.
   ============================================================ */
(function(){
"use strict";

/* ---------- business config (?biz=&tagline=&city=&address=&phone=) ---------- */
var qs = new URLSearchParams(location.search);
var BIZ      = qs.get("biz")      || "Copperline Legal Group";
var TAGLINE  = qs.get("tagline")  || "Personal Injury · DUI Defense · Family Law";
var CITY     = qs.get("city")     || "Denver, CO";
var ADDRESS  = qs.get("addr") || qs.get("address")  || "1420 Wazee St, Suite 210, Denver, CO 80202";
var PHONE    = qs.get("phone")    || "(303) 555-0184";
var HOST     = "Jordan";
var LEAD_KEY = "nmc_legal_leads";
var FAST     = qs.get("fast") === "1";
var refPrefix = BIZ.replace(/^the\s+/i,"").split(/\s+/).filter(function(w){return /^[A-Za-z]/.test(w);}).slice(0,2).map(function(w){return w[0].toUpperCase();}).join("");

/* ---------- page personalization ---------- */
function setText(id, v){ var el = document.getElementById(id); if(el) el.textContent = v; }
setText("nav-biz", BIZ); setText("foot-biz", BIZ); setText("foot-city", CITY);
setText("addr-biz", BIZ);
setText("nav-city", CITY); setText("hero-city", CITY); setText("hero-tagline", TAGLINE);
setText("addr-line", ADDRESS); setText("strip-addr", ADDRESS);
setText("phone-line", PHONE); setText("strip-phone", PHONE);
var sp = document.getElementById("strip-phone"); if(sp) sp.href = "tel:+" + PHONE.replace(/\D/g,"");
var pl = document.getElementById("phone-line");  if(pl) pl.href = "tel:+" + PHONE.replace(/\D/g,"");
setText("maya-name", HOST); setText("maya-avatar-letter", HOST[0]);
setText("maya-credit", BIZ + " · " + CITY);
document.title = BIZ + " — " + TAGLINE + " in " + CITY;

/* ---------- deep personalization: ?services= ?hours= ----------
   services: pipe-separated REAL service names -> rendered into the services grid (max 8).
   hours: pipe-separated "Day(s): time" pairs -> rendered into the hours table (max 6).
   Graceful fallback: the page keeps its built-in fictional content when a param is absent. */
(function () {
  var svc = qs.get("services");
  if (svc) {
    var items = svc.split("|").map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 8);
    var grid = document.querySelector("#services .menu-grid, #practice .menu-grid");
    if (grid && items.length) {
      grid.innerHTML = items.map(function (name) {
        return '<div class="menu-card"><div class="cat">Service</div><h3>' + esc(name) + '</h3>' +
          '<p>Offered at ' + esc(BIZ) + ' &mdash; ask ' + esc(HOST) + ' below for details &amp; pricing.</p></div>';
      }).join("");
    }
  }
  var hrs = qs.get("hours");
  if (hrs) {
    var rows = hrs.split("|").map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 6);
    var table = document.querySelector("table.hours");
    if (table && rows.length) {
      var chatCell = null;
      Array.prototype.forEach.call(table.rows, function (r) {
        if (/chat/i.test(r.textContent) && r.cells[1]) chatCell = r.cells[1].innerHTML;
      });
      var html = rows.map(function (r) {
        var i = r.indexOf(":");
        var day = (i > 0 ? r.slice(0, i) : r).trim();
        var time = (i > 0 ? r.slice(i + 1) : "").trim();
        return "<tr><td>" + esc(day) + "</td><td>" + esc(time) + "</td></tr>";
      }).join("");
      if (chatCell) html += "<tr><td>Chat with " + esc(HOST) + "</td><td>" + chatCell + "</td></tr>";
      table.innerHTML = html;
    }
  }
})();


/* ---------- DOM ---------- */
var bubble = document.getElementById("maya-bubble"),
    panel  = document.getElementById("maya-panel"),
    msgs   = document.getElementById("maya-msgs"),
    chipsEl= document.getElementById("maya-chips"),
    inputEl= document.getElementById("maya-input"),
    sendBtn= document.getElementById("maya-send"),
    closeBtn= document.getElementById("maya-close"),
    unreadEl= document.getElementById("maya-unread");

/* ---------- state ---------- */
var step = { flow:null, i:0, data:{} };   // current guided flow
var leads = [];
try { leads = JSON.parse(localStorage.getItem(LEAD_KEY) || "[]"); } catch(e){ leads = []; }
var hasUnread = false, opened = false;

function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function digits(s){ return String(s||"").replace(/\D/g,""); }

/* ---------- word-start keyword matching (proven standard, 2026-10-03) ----------
   "foreclosure" must not trip the "close"→hours branch, "recall" must not trip the
   human-call branch, "anywhere" must not trip the "where" location branch.
   Prefix keywords like 'schedul'/'injur' still match 'schedule'/'injury';
   phrases keep word-start match. hasWhole() requires a word end too. */
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function has(t){
  var words = Array.prototype.slice.call(arguments, 1);
  return words.some(function(w){ return new RegExp("(^|[^a-z])" + escRe(w)).test(t); });
}
function hasWhole(t){
  var words = Array.prototype.slice.call(arguments, 1);
  return words.some(function(w){ return new RegExp("(^|[^a-z])" + escRe(w) + "([^a-z]|$)").test(t); });
}

/* ---------- lead persistence ---------- */
function saveLead(l){
  l.biz = BIZ; l.at = new Date().toISOString();
  leads.push(l);
  try { localStorage.setItem(LEAD_KEY, JSON.stringify(leads)); } catch(e){}
  renderInbox(); /* keep the prospect-visible inbox panel live */
}

/* ---------- captured-leads inbox preview (prospect-visible panel) ----------
   The after-hours card promises "Saved to your dashboard" — this panel makes
   that claim visible on the page. Reads localStorage only, everything escaped. */
var inboxEls = null;
function inboxDom(){
  if(!inboxEls){
    var p = document.getElementById("inbox-panel"),
        l = document.getElementById("inbox-list"),
        t = document.getElementById("inbox-toggle"),
        c = document.getElementById("inbox-count");
    if(!p || !l || !t) return null;
    inboxEls = { panel:p, list:l, toggle:t, count:c };
  }
  return inboxEls;
}
function fmtLeadTime(iso){
  try {
    var d = new Date(iso);
    if(isNaN(d.getTime())) return iso || "";
    return d.toLocaleString(undefined, { dateStyle:"medium", timeStyle:"short" });
  } catch(e){ return iso || ""; }
}
function renderInbox(){
  var dom = inboxDom();
  if(!dom) return;
  if(dom.count) dom.count.textContent = String(leads.length);
  if(!leads.length){
    dom.list.innerHTML = '<div class="inbox-empty"><b>No leads yet</b> &mdash; try the &#127769; 11:47 PM after-hours flow in the chat &mdash; the captured lead will appear right here.</div>';
    return;
  }
  dom.list.innerHTML = leads.slice().reverse().map(function(l){
    var when = l.at
      ? '<time datetime="'+esc(l.at)+'">'+esc(fmtLeadTime(l.at))+'</time>'
      : '&mdash;';
    var detail = (l.details && l.details !== "—" && l.details !== "-")
      ? '<div class="lead-detail">&ldquo;'+esc(l.details)+'&rdquo;</div>'
      : "";
    return '<div class="lead-row">' +
      '<span class="lead-name">'+esc(l.name || "—")+'</span>' +
      '<span class="lead-tag">'+esc(l.topic || "Lead")+'</span>' +
      '<span class="lead-phone">'+esc(l.phone || "—")+'</span>' +
      '<span class="lead-src">'+esc(l.source || "")+'</span>' +
      '<div class="lead-when">Captured '+when+'</div>' +
      detail +
      '</div>';
  }).join("");
}

/* ---------- rendering ---------- */
function scrollDown(){ msgs.scrollTop = msgs.scrollHeight; }
function botRow(inner, cls){
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble '+(cls||"")+'">'+inner+'</div>';
  msgs.appendChild(row); scrollDown(); return row;
}
function userRow(text){
  var row = document.createElement("div"); row.className = "mrow user";
  row.innerHTML = '<div class="bubble">'+esc(text)+'</div>';
  msgs.appendChild(row); scrollDown();
}
function typingRow(){
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble typing"><i></i><i></i><i></i></div>';
  msgs.appendChild(row); scrollDown(); return row;
}
function say(html, cb, cls){
  var t = FAST ? 0 : 320 + Math.random()*380;
  var tr = typingRow();
  setTimeout(function(){ tr.remove(); botRow(html, cls); if(cb) cb(); }, t);
}
function sayMany(parts, done, cls){
  var i = 0;
  (function next(){ if(i >= parts.length){ if(done) done(); return; } say(parts[i++], next, cls); })();
}
function setChips(list){
  chipsEl.innerHTML = "";
  (list||[]).forEach(function(c){
    var b = document.createElement("button");
    b.className = "chip"; b.textContent = c.label;
    b.onclick = function(){ userSays(c.value || c.label, c.silent); };
    chipsEl.appendChild(b);
  });
}
function setStars(cb){
  chipsEl.innerHTML = "";
  var wrap = document.createElement("div"); wrap.className = "stars-row";
  for(var i=1;i<=5;i++){
    (function(n){
      var s = document.createElement("button"); s.className = "star-btn"; s.textContent = "⭐";
      s.onmouseenter = function(){ paint(n); };
      s.onclick = function(){ setChips([]); userRow(n + " stars"); cb(n); };
      wrap.appendChild(s);
    })(i);
  }
  function paint(n){ Array.prototype.forEach.call(wrap.children, function(s,idx){ s.classList.toggle("lit", idx < n); }); }
  chipsEl.appendChild(wrap);
}
function noticeRow(html){ var row = document.createElement("div"); row.className = "mrow bot"; row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="notice">'+html+'</div>'; msgs.appendChild(row); scrollDown(); }
function dashcard(rows){
  var html = '<div class="dashcard"><div class="dl-head">📥 New lead — owner dashboard</div>';
  rows.forEach(function(r){ html += '<div class="dl-row"><span>'+esc(r[0])+':</span> <b>'+esc(r[1])+'</b></div>'; });
  html += '</div>';
  var row = document.createElement("div"); row.className = "mrow bot";
  row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div>'+html;
  msgs.appendChild(row); scrollDown();
}
function markUnread(){ if(opened) return; hasUnread = true; unreadEl.classList.remove("hidden"); }

/* ---------- panel open/close ---------- */
function openPanel(){ panel.classList.add("open"); bubble.classList.add("hidden"); opened = true; hasUnread = false; unreadEl.classList.add("hidden"); setTimeout(function(){ inputEl.focus(); }, 300); }
function closePanel(){ panel.classList.remove("open"); bubble.classList.remove("hidden"); }
bubble.addEventListener("click", openPanel);
closeBtn.addEventListener("click", closePanel);

/* ---------- content builders ---------- */
function hoursHtml(){
  return "Our office hours at <b>"+esc(BIZ)+"</b>:<br>Mon–Fri · <b>8:30 AM – 6 PM</b><br>Saturday · by appointment<br>Sunday · closed<br><br>But the hotline never closes — I'm here 24/7, and urgent matters get flagged immediately. 🚨";
}
function injuryHtml(){
  return "If you were hurt in a crash, a fall, or any accident that wasn't your fault — here's the deal: consultations are <b>free</b>, and injury cases are handled on <b>contingency</b>.<br><br>That means <b>you pay nothing unless we win</b>. No retainer, no hourly meter running. 📋<br><br>Want the free 15-minute case evaluation, or book a consultation?";
}
function duiHtml(){
  return "Arrested for DUI? Three things, right now:<br><br>1️⃣ <b>Stay calm and polite</b> — but don't answer questions about drinking without an attorney.<br>2️⃣ <b>Don't refuse</b> the chemical test without understanding your state's express-consent consequences — ask us first.<br>3️⃣ <b>Call us before you say anything else</b> — the first consultation is free, 24/7.<br><br>The clock on your license hearing starts ticking fast. Want me to flag this as urgent?";
}
function familyHtml(){
  return "Divorce, custody, child support — the hardest conversation deserves a clear plan. We lay out your options in plain English: what it costs, how long it takes, and what custody realistically looks like.<br><br>First consultation is <b>free</b>. Want to book one, or tell me what's going on?";
}
function estateHtml(){
  return "A will from <b>$750</b>, flat fee in writing — no mystery bill. Trusts and full estate plans are quoted upfront too, after a free consultation about what you actually need.<br><br>Most people are surprised how simple it is once someone explains it plainly. Want to book the free consult?";
}
function feesHtml(){
  return "Here's our fee promise, in plain English:<br><br>⚖️ <b>Consultations — always free.</b> Every practice area.<br>💰 <b>Injury cases — contingency.</b> No fee unless we win.<br>📝 <b>Wills &amp; flat-fee work — from $750</b>, quoted in writing before anything starts.<br>🚫 <b>No hourly surprises.</b> You'll never get a bill you didn't agree to.<br><br>Which area is yours — injury, DUI, family, or estate?";
}

function practiceHtml(){
  return "Here's what we handle at <b>"+esc(BIZ)+"</b>:<br><br>💥 <b>Personal Injury</b> — crashes, falls, dog bites · no fee unless we win<br>🚔 <b>DUI Defense</b> — arrested? first call free, 24/7<br>👨‍👩‍👧 <b>Family Law</b> — divorce, custody, support, in plain English<br>📜 <b>Estate Planning</b> — wills from $750, flat fees in writing<br><br>Which one is yours?";
}

/* ============================================================
   FLOW 1 — consultation booking
   ============================================================ */
var MATTERS = ["Personal injury","DUI defense","Family law","Estate planning","Something else"];
var DAYS = ["Tomorrow","Thursday","Friday","Saturday"];
var TIMES = ["9:00 AM","11:30 AM","2:00 PM","4:30 PM"];
function startBooking(prefill){
  step = { flow:"booking", i:0, data:{} };
  if(prefill){ step.data.matter = prefill; step.i = 1; askName(); return; }
  say("Of course — the consultation is free, and there's zero obligation. 👍", function(){
    say("What's it about?", function(){
      setChips(MATTERS.map(function(r){ return {label:r, value:r}; }));
    });
  });
}
function askName(){
  step.i = 1;
  say("And your name?", function(){ setChips([]); });
}
function askPhone(){
  step.i = 2;
  say("Nice to meet you, <b>"+esc(step.data.name)+"</b>. Want a text reminder before your consultation? Drop your number — or skip it.", function(){
    setChips([{label:"Skip", value:"__skip", silent:true}]);
  });
}
function askDay(){
  step.i = 3;
  say("Perfect. Which day works for the consultation?", function(){
    setChips(DAYS.map(function(d){ return {label:d, value:d}; }));
  });
}
function askTime(){
  step.i = 4;
  say("And a time on <b>"+esc(step.data.day)+"</b>?", function(){
    setChips(TIMES.map(function(t){ return {label:t, value:t}; }));
  });
}
function confirmBooking(){
  var ref = refPrefix + "-" + Math.floor(1000 + Math.random()*9000);
  step.data.ref = ref;
  sayMany([
    "✅ <b>You're booked!</b>",
    "⚖️ <b>Free consultation</b> — "+esc(step.data.matter)+"<br>📅 "+esc(step.data.day)+" at "+esc(step.data.time)+"<br>👤 "+esc(step.data.name)+"<br>🔖 Ref: <span class='ref'>"+ref+"</span>"
  ], function(){
    var extra = step.data.phone ? "We'll text <b>"+esc(step.data.phone)+"</b> a reminder before your slot. " : "";
    say(extra + "Bring anything relevant — police report, photos, paperwork. And remember: free means free. See you soon! 😊", function(){
      setChips([{label:"Book another", value:"book another"}]);
      step = { flow:null, i:0, data:{} };
    });
  });
}
function bookingStep(text){
  var d = step.data;
  if(step.i === 0){
    var t = text.toLowerCase(), matter = null;
    if(has(t,"injur","hurt","crash","accident","slip","fall","bite")) matter = "Personal injury";
    else if(has(t,"dui","dwi","drunk","driv","arrest")) matter = "DUI defense";
    else if(has(t,"divorce","custod","family","child","support","alimony")) matter = "Family law";
    else if(has(t,"trust","estate","probate")) matter = "Estate planning";
    else if(has(t,"else","other","not sure")) matter = "Something else";
    if(!matter){ say("I can book for: <b>"+MATTERS.join("</b>, <b>")+"</b> — which one is closest?", function(){ setChips(MATTERS.map(function(r){return {label:r,value:r};})); }); return; }
    d.matter = matter; askName(); return;
  }
  if(step.i === 1){
    var nm = text.trim();
    if(!nm || nm.length > 40){ say("Just your name is fine — 2 to 40 characters 🙂"); return; }
    d.name = nm; askPhone(); return;
  }
  if(step.i === 2){
    if(text !== "__skip"){
      var dg = digits(text);
      if(dg.length < 7){ say("Hmm, that doesn't look like a real number — could you double-check it? Or tap Skip below."); return; }
      d.phone = text.trim();
    }
    askDay(); return;
  }
  if(step.i === 3){ d.day = text; askTime(); return; }
  if(step.i === 4){ d.time = text; confirmBooking(); return; }
}

/* ============================================================
   FLOW 2 — after-hours urgent intake (with urgency flag)
   ============================================================ */
function startAfterHours(){
  step = { flow:"afterhours", i:0, data:{ urgency:"Priority" } };
  noticeRow("🚨 <b>It's 11:47 PM</b> — the office is dark, but the hotline isn't.<br>I'm <b>"+esc(HOST)+"</b>, "+esc(BIZ)+"'s client coordinator, here 24/7. Arrests and accidents don't keep office hours, so neither do I.");
  setTimeout(function(){
    say("What's happening?", function(){
      setChips([
        {label:"Just arrested — DUI", value:"Just arrested — DUI"},
        {label:"Car accident tonight", value:"Car accident tonight"},
        {label:"Someone's in custody", value:"Someone's in custody"},
        {label:"Other urgent matter", value:"Other urgent matter"}
      ]);
    });
  }, FAST ? 0 : 600);
}
function afterHoursStep(text){
  var d = step.data;
  if(step.i === 0){
    d.issue = text;
    d.urgency = has(text.toLowerCase(),"arrest","dui","custody","jail") ? "HIGH — in custody / just arrested" : "Priority";
    step.i = 1;
    say(d.urgency.indexOf("HIGH") === 0
        ? "Understood — flagged as <b>HIGH urgency</b>. The on-call attorney gets paged right now. Who should they ask for?"
        : "Got it — <b>"+esc(text)+"</b>. Flagged for priority follow-up first thing. Who should we contact?",
      function(){ setChips([]); });
    return;
  }
  if(step.i === 1){
    var nm = text.trim();
    if(!nm || nm.length > 40 || /\d/.test(nm)){ say("Just the name for the page — letters are fine 🙂"); return; }
    d.name = nm; step.i = 2;
    say("Thanks, <b>"+esc(nm)+"</b>. What's the best number to reach you on right now?", function(){ setChips([]); });
    return;
  }
  if(step.i === 2){
    var dg = digits(text);
    if(dg.length < 7){ say("That doesn't look like a real number — and tonight I really need to reach you. Could you check it?"); return; }
    d.phone = text.trim(); step.i = 3;
    say("One more — in a sentence or two, what happened?", function(){ setChips([]); });
    return;
  }
  if(step.i === 3){
    d.summary = text.trim();
    saveLead({ name:d.name, phone:d.phone, issue:d.issue, urgency:d.urgency, summary:d.summary, captured:"11:47 PM (after hours)", kind:"urgent-intake",
      topic:d.issue, details:d.summary, source:"after-hours 11:47 PM" });
    sayMany([
      "✅ <b>You're on the board.</b> The on-call attorney is paged and will call <b>"+esc(d.phone)+"</b> within the hour — not in the morning, <i>now</i>. ⚖️",
    ], function(){
      dashcard([["New lead", d.name],["Phone", d.phone],["Issue", d.issue],["Urgency", d.urgency],["Captured", "11:47 PM (after hours)"]]);
      setTimeout(function(){
        say("See that card? That's what the firm wakes up to — <i>every midnight call becomes a morning consultation, not a client lost to the firm with the 24/7 line.</i> 💪", function(){
          setChips([{label:"Back to chat", value:"hi"}]);
          step = { flow:null, i:0, data:{} };
        });
      }, FAST ? 0 : 700);
    });
    return;
  }
}

/* ============================================================
   FLOW 3 — case evaluation intake
   ============================================================ */
function startEval(){
  step = { flow:"caseeval", i:0, data:{} };
  say("Love it — let's do the 2-minute intake. 📝<br>What's the matter about?", function(){
    setChips(MATTERS.map(function(r){ return {label:r, value:r}; }));
  });
}
function evalStep(text){
  var d = step.data;
  if(step.i === 0){ d.matter = text; step.i = 1;
    say("When did it happen?", function(){
      setChips(["Today / yesterday","This week","This month","Longer ago"].map(function(a){ return {label:a, value:a}; }));
    });
    return;
  }
  if(step.i === 1){ d.when = text; step.i = 2;
    say("Were you (or someone involved) injured?", function(){
      setChips(["Yes — injured","No injuries","Not sure"].map(function(a){ return {label:a, value:a}; }));
    });
    return;
  }
  if(step.i === 2){ d.injured = text; step.i = 3;
    say("In a sentence or two — what happened?", function(){ setChips([]); });
    return;
  }
  if(step.i === 3){
    d.summary = text.trim(); step.i = 4;
    say("Thanks — and your name?", function(){ setChips([]); });
    return;
  }
  if(step.i === 4){
    var nm = text.trim();
    if(!nm || nm.length > 40){ say("Just your name is fine — 2 to 40 characters 🙂"); return; }
    d.name = nm; step.i = 5;
    say("And the best number to reach you?", function(){ setChips([]); });
    return;
  }
  if(step.i === 5){
    var dg = digits(text);
    if(dg.length < 7){ say("Hmm, that doesn't look like a real number — could you double-check it?"); return; }
    d.phone = text.trim();
    saveLead({ name:d.name, phone:d.phone, matter:d.matter, when:d.when, injured:d.injured, summary:d.summary, kind:"case-eval" });
    sayMany([
      "✅ <b>Intake received.</b>",
      "⚖️ <b>"+esc(d.matter)+"</b> · "+esc(d.when)+"<br>📝 "+esc(d.summary)
    ], function(){
      say("A licensed attorney will review this — <b>usually within one business day</b> — and we'll call <b>"+esc(d.phone)+"</b> with an honest answer: do you have a case, and is it worth pursuing.<br><br>The review is free. Talk soon, "+esc(d.name)+"! 😊", function(){
        setChips([{label:"Book a consultation", value:"book"}]);
        step = { flow:null, i:0, data:{} };
      });
    });
    return;
  }
}

/* ============================================================
   FLOW 4 — review request
   ============================================================ */
function startReview(){
  step = { flow:"review", i:0, data:{} };
  say("We'd value your feedback! How many stars for "+esc(BIZ)+"?", function(){ setStars(function(n){ reviewStep(n); }); });
}
function reviewStep(n){
  if(step.i === 0){
    step.i = 1;
    step.data.rating = n;
    if(n === 5){
      say("That's wonderful — thank you! 🙏 Would you mind sharing it on Google? It helps neighbors in a tough spot find us.", function(){
        var row = document.createElement("div"); row.className = "mrow bot";
        row.innerHTML = '<div class="mavatar">'+esc(HOST[0])+'</div><div class="bubble"><a class="gbtn" href="#" onclick="return false">⭐ Leave a Google review</a></div>';
        msgs.appendChild(row); scrollDown();
        setTimeout(function(){ say("Either way — thank you for trusting "+esc(BIZ)+". We're here if you ever need us. ⚖️", function(){ step = {flow:null,i:0,data:{}}; setChips([]); }); }, FAST?0:800);
      });
      return;
    }
    say("Thank you for being honest — "+n+" stars tells us something needs fixing. What could we have done better?", function(){ setChips([]); });
    return;
  }
  if(step.i === 1){
    saveLead({ name:"(review feedback)", phone:"—", topic:"Private feedback", details:text0(), source:"review routing",
      kind:"review-feedback", rating:step.data.rating, feedback:text0(), note:"private, not posted" });
    say("Noted — and I'm sorry we fell short. 🙏 Our managing partner will <b>personally follow up</b> within one business day to make this right.<br><br>Thank you for giving us the chance to fix it.", function(){
      step = { flow:null, i:0, data:{} }; setChips([]);
    });
    return;
  }
}
function text0(){ return lastUserText; }
var lastUserText = "";

/* ============================================================
   router — word-start keyword matching (proven standard, 2026-10-03)
   ============================================================ */
function route(text){
  var t = text.toLowerCase();
  if(step.flow === "booking")    { bookingStep(text); return; }
  if(step.flow === "afterhours"){ afterHoursStep(text); return; }
  if(step.flow === "caseeval")  { evalStep(text); return; }
  if(step.flow === "review")    { reviewStep(parseInt(text,10) || 0); return; }

  /* urgent after-hours intake — "dui defense"-style info requests carve out to the DUI answer branch */
  if(has(t,"emergency","midnight","after hour","closed right now","11:47","arrested","in custody","jail","accident tonight","crash tonight") ||
     (has(t,"dui","dwi","drunk") && !has(t,"defense","lawyer","attorney","info","cost","fee","price"))){ startAfterHours(); return; }
  if(has(t,"do i have a case","case eval","evaluate","evaluation","intake")){ startEval(); return; }
  if(/book another/.test(t)){ startBooking(); return; }
  if(has(t,"book","consult","appoint","schedul","free consultation")){ startBooking(); return; }
  if(has(t,"review","rate us","stars","feedback")){ startReview(); return; }
  if(has(t,"injur","hurt","crash","accident","slip","fall","dog bite","contingency")){ say(injuryHtml(), function(){ setChips([{label:"Do I have a case?", value:"evaluate"},{label:"Free consultation", value:"book"}]); }); return; }
  if(has(t,"dui","dwi","drunk","driving under")){ say(duiHtml(), function(){ setChips([{label:"🚨 Flag as urgent", value:"emergency"},{label:"Free consultation", value:"book"}]); }); return; }
  if(has(t,"divorce","custod","family","child support","alimony")){ say(familyHtml(), function(){ setChips([{label:"Free consultation", value:"book"},{label:"Tell me more", value:"family law details"}]); }); return; }
  /* "will" only routes to estate with estate context — "I will call" must not land here */
  if(has(t,"trust","estate","probate","wills") || (hasWhole(t,"will") && has(t,"draft","sign","document","last","testament","plan","power"))){ say(estateHtml(), function(){ setChips([{label:"Free consultation", value:"book"}]); }); return; }
  if(has(t,"practice area","what do you handle") || t.trim() === "services"){ say(practiceHtml(), function(){ setChips([{label:"Personal injury",value:"personal injury"},{label:"DUI defense",value:"dui defense"},{label:"Family law",value:"family law"},{label:"Estate planning",value:"estate planning"}]); }); return; }
  if(has(t,"fee","cost","price","how much","pricing","contingency")){ say(feesHtml(), function(){ setChips([{label:"Do I have a case?", value:"evaluate"}]); }); return; }
  if(has(t,"hour","open","close") || (has(t,"when") && has(t,"open","close"))){ say(hoursHtml()); return; }
  if(has(t,"where","location","address","park","direction","office")){ say("You'll find us at <b>"+esc(ADDRESS)+"</b> 📍 — right in the heart of "+esc(CITY)+". Free parking validation for consultations. Prefer to start from your couch? The chat intake takes 2 minutes.", function(){ setChips([{label:"Free consultation", value:"book"}]); }); return; }
  if(has(t,"human","real person","attorney","speak","talk to someone","lawyer","call")){ say("You can reach a human anytime at <b>"+esc(PHONE)+"</b> 📞 — 24/7 urgent line. Or I can keep helping right here — what's going on?"); return; }
  if(has(t,"thank","thx")){ say("Anytime! 😊 Anything else — a free consultation, the case intake, or practice-area questions?"); return; }
  if(has(t,"bye","goodbye","good night")){ say("Take care — and remember, the consultation is always free. ⚖️ I'll be here whenever you need "+esc(BIZ)+"."); setChips([]); step={flow:null,i:0,data:{}}; return; }
  if(has(t,"hello","hey") || hasWhole(t,"hi") || t.trim() === "yo"){ say("Hey! 👋 What can I do for you — a free consultation, the 2-minute case intake, or practice-area questions?", function(){ setChips([{label:"Free consultation",value:"book"},{label:"Do I have a case?",value:"evaluate"},{label:"🚨 Urgent help",value:"emergency"}]); }); return; }

  /* graceful fallback */
  say("Hmm, I want to make sure I get this right — I'm best with <b>free consultations</b>, the <b>2-minute case intake</b>, <b>practice areas &amp; fees</b>, and <b>urgent after-hours help</b>. Which one is it? 🤔", function(){
    setChips([{label:"Free consultation",value:"book"},{label:"Do I have a case?",value:"evaluate"},{label:"Practice areas",value:"practice areas"},{label:"🚨 Urgent help",value:"emergency"}]);
  });
}

function userSays(text, silent){
  if(!silent) userRow(text);
  lastUserText = text;
  if(FAST){ route(text); return; }
  var t = 250 + Math.random()*300;
  setTimeout(function(){ route(text); }, t);
}

/* ---------- input wiring ---------- */
function sendInput(){ var v = inputEl.value.trim(); if(!v) return; inputEl.value = ""; userSays(v); }
sendBtn.addEventListener("click", sendInput);
inputEl.addEventListener("keydown", function(e){ if(e.key === "Enter") sendInput(); });

/* ---------- CTA buttons on the page ---------- */
document.querySelectorAll("[data-action]").forEach(function(el){
  el.addEventListener("click", function(e){
    e.preventDefault();
    var a = el.getAttribute("data-action");
    openPanel();
    if(a === "book") startBooking();
    else if(a === "evaluate") startEval();
    else if(a === "emergency") startAfterHours();
  });
});

/* ---------- captured-leads inbox toggle (prospect-visible "Saved to your dashboard") ---------- */
var idom = inboxDom();
if(idom){
  renderInbox();
  idom.toggle.addEventListener("click", function(){
    var isHidden = idom.panel.hasAttribute("hidden");
    if(isHidden){ idom.panel.removeAttribute("hidden"); renderInbox(); }
    else { idom.panel.setAttribute("hidden", ""); }
    idom.toggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });
}

/* ---------- greeting ---------- */
function greet(){
  sayMany([
    "Hi there! ⚖️ I'm <b>"+esc(HOST)+"</b>, the client coordinator at <b>"+esc(BIZ)+"</b>.",
    "I can book your <b>free consultation</b>, run the 2-minute case intake, answer fee questions — and if it's midnight and urgent, I'm still here. 🚨<br><br>How can I help?"
  ], function(){
    setChips([{label:"Free consultation",value:"book"},{label:"Do I have a case?",value:"evaluate"},{label:"Practice areas",value:"practice areas"},{label:"🚨 Urgent help",value:"emergency"}]);
  });
  setTimeout(function(){ markUnread(); }, FAST ? 100 : 2500);
}
setTimeout(greet, FAST ? 50 : 900);

/* ---------- test hooks ---------- */
window.__maya = {
  open: openPanel, close: closePanel, say: userSays, send: userSays,
  state: function(){ return { step: step, leads: leads }; },
  saveLead: saveLead, renderInbox: renderInbox,
  getLeads: function(){ return leads; },
  clearLeads: function(){ leads = []; try{ localStorage.removeItem(LEAD_KEY); }catch(e){} renderInbox(); },
  leadKey: LEAD_KEY, host: HOST, biz: BIZ
};
window.__clearLeads = function(){ leads = []; try{ localStorage.removeItem(LEAD_KEY); }catch(e){} renderInbox(); };

})();

