import { loadState, saveState, requestPersistentStorage } from "./storage.js";
import { activeYear, baseFlexible, currentBudgetMonth, createInitialState, fireTarget, formatMoney, id, latestIncome, money, monthKey, monthsForFiscalYear, savingsTotal, signedMoney, totalAssets, fiscalStart } from "./domain.js";

const app = document.querySelector("#app");
let state;
let page = "dashboard";
let storagePersistent = false;

const nav = [
  ["dashboard", "看板", "chart"],
  ["assets", "资产", "assets"],
  ["transactions", "记账", "plus"],
  ["budget", "预算", "calendar"],
  ["settings", "设置", "gear"]
];

const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
const inputMoney = value => value === "" ? null : money(value);
const activeTransactions = () => state.transactions.filter(t => t.active !== false);
const yearProjects = year => (year?.projects || []).filter(project => project.active !== false);

function icon(name) {
  const paths = { chart: "M4 19V5m0 14h16M7 15l3-4 3 2 5-7", assets: "M3 21h18M5 21V5h14v16M8 9h2m-2 4h2m4-4h2m-2 4h2", plus: "M12 5v14M5 12h14", calendar: "M5 4h14v16H5zM8 2v4m8-4v4M5 9h14", gear: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM4 12h2m12 0h2M12 4v2m0 12v2" };
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.plus}"/></svg>`;
}

async function persist() { await saveState(state); toast("已保存到本机"); }
function toast(message) {
  const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 1800);
}

function shell(content) {
  return `<div class="app-shell"><header class="topbar"><div><p class="eyebrow">本地账本</p><h1>FIRE 账本</h1></div><span class="storage-dot ${storagePersistent ? "good" : ""}" title="${storagePersistent ? "已申请持久化存储" : "浏览器本地存储"}"></span></header><section class="page-content">${content}</section><nav class="tabbar">${nav.map(([key, label, symbol]) => `<button class="tab ${page === key ? "selected" : ""}" data-nav="${key}">${icon(symbol)}<span>${label}</span></button>`).join("")}</nav></div>`;
}

function render() {
  if (!state) return;
  const content = page === "dashboard" ? dashboardView() : page === "assets" ? assetsView() : page === "transactions" ? transactionsView() : page === "budget" ? budgetView() : settingsView();
  app.innerHTML = shell(content);
  bindEvents();
}

function sectionTitle(title, action = "") { return `<div class="section-title"><h2>${title}</h2>${action}</div>`; }
function amount(value, className = "") { return `<strong class="amount ${className}">${formatMoney(value)}</strong>`; }

function dashboardView() {
  const target = fireTarget(state), assets = totalAssets(state), gap = target - assets, income = latestIncome(state), monthly = income ? money(income.salary) + money(income.fund) : 0;
  const months = gap > 0 && monthly > 0 ? Math.ceil(gap / monthly) : null;
  const retirement = months ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date(new Date().getFullYear(), new Date().getMonth() + months, 1)) : "";
  return `<div class="hero"><p class="eyebrow">${activeYear(state)?.startMonth || 1} 月起 · 当前财年</p><h2>财务自由看板</h2><p class="muted">所有数据只保存在这台设备上。</p></div>
    <div class="metric primary"><span>当前总资产</span>${amount(assets)}<small>储蓄 ${formatMoney(savingsTotal(state))} · 支出账户 ${formatMoney(state.expenseBalance)}</small></div>
    <div class="grid-two"><div class="metric"><span>FIRE 总目标</span>${amount(target)}</div><div class="metric"><span>资金缺口</span>${gap <= 0 ? "<strong class=\"status-good\">FIRE 已达成</strong>" : amount(gap)} </div></div>
    <div class="panel"><div class="panel-row"><span>还需要工作</span><strong>${gap <= 0 ? "已达成" : months ? `${months} 个月` : "待填写收入"}</strong></div>${retirement ? `<p class="muted">预计将在 ${retirement} 实现财务自由并退休</p>` : ""}<button class="button secondary" data-nav="assets">填写收入与资产</button></div>
    ${sectionTitle("FIRE 目标", `<button class="text-button" data-nav="settings">管理</button>`)}
    <div class="target-summary">${["largeOrPeriodic", "dailyFixed", "dailyFlexible"].map(type => { const rows = state.fireTargets.filter(t => t.type === type); const labels = { largeOrPeriodic: "大额/周期性", dailyFixed: "日常固定", dailyFlexible: "日常弹性" }; return `<div><span>${labels[type]}</span><strong>${formatMoney(rows.reduce((s, t) => s + money(t.amount), 0))}</strong></div>`; }).join("")}</div>`;
}

function assetsView() {
  const incomes = [...state.incomes].sort((a, b) => b.month.localeCompare(a.month));
  return `${sectionTitle("资产", `<button class="text-button" data-nav="settings">数据设置</button>`)}
    <div class="panel"><div class="panel-row"><span>储蓄账户当前总额</span>${amount(savingsTotal(state), "brown")}</div><div class="form-grid"><label>初始现金<input id="initialCash" type="number" step="0.01" value="${esc(state.savings.initialCash)}"></label><label>股票账户市值<input id="stockValue" type="number" step="0.01" value="${esc(state.savings.stockValue)}"></label></div><button class="button primary-button" id="saveAssets">保存资产</button></div>
    <div class="panel"><div class="panel-row"><span>支出账户当前余额</span>${amount(state.expenseBalance)}</div><label>直接覆盖余额<input id="expenseBalance" type="number" step="0.01" value="${esc(state.expenseBalance)}"></label><button class="button secondary" id="saveExpenseBalance">保存支出账户余额</button></div>
    ${sectionTitle("月度工资与公积金")}
    <form class="panel" id="incomeForm"><div class="form-grid"><label>月份<input name="month" type="month" value="${monthKey()}"></label><label>净工资<input name="salary" type="number" step="0.01" min="0" placeholder="0"></label><label>公积金<input name="fund" type="number" step="0.01" min="0" placeholder="0"></label></div><button class="button primary-button">保存本月收入</button></form>
    <div class="list">${incomes.length ? incomes.map(row => `<div class="list-row"><div><strong>${esc(row.month)}</strong><small>工资 ${formatMoney(row.salary)} · 公积金 ${formatMoney(row.fund)}</small></div><strong>${formatMoney(money(row.salary) + money(row.fund))}</strong></div>`).join("") : `<div class="empty">尚未填写月度收入</div>`}</div>`;
}

function targetOptions() {
  const year = activeYear(state), projects = yearProjects(year);
  return `<option value="">选择预算目标</option>${projects.map(p => `<option value="project:${p.id}">${esc(p.name)} · ${p.type === "utilities" ? "水电费" : p.type === "interMonth" ? "跨月" : "固定"}</option>`).join("")}<option value="flexible">月度灵活支出</option>${state.multiYear.filter(p => p.active !== false).map(p => `<option value="multi:${p.id}">跨年 · ${esc(p.name)}</option>`).join("")}`;
}

function transactionsView() {
  const rows = [...activeTransactions()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return `${sectionTitle("记账", `<span class="count">${rows.length} 笔</span>`)}<form class="panel" id="transactionForm"><div class="form-grid"><label>金额<input name="amount" type="number" step="0.01" min="0.01" required></label><label>发生日期<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label>账户<select name="account"><option value="expense">支出账户</option><option value="savings">储蓄账户</option></select></label><label>预算目标<select name="target">${targetOptions()}</select></label><label class="wide">灵活支出分类<input name="flexibleName" placeholder="仅选择灵活支出时填写"></label><label class="wide">备注<input name="memo" placeholder="可选"></label></div><button class="button primary-button">保存支出</button></form>
    ${sectionTitle("流水")}<div class="list">${rows.length ? rows.map(t => `<div class="list-row"><div><strong>${esc(t.category)}</strong><small>${esc(t.occurredAt)} · ${t.account === "expense" ? "支出账户" : "储蓄账户"}${t.memo ? ` · ${esc(t.memo)}` : ""}</small></div><div class="row-end"><strong>-${formatMoney(t.amount)}</strong><button class="icon-button" data-delete-transaction="${t.id}" aria-label="删除">×</button></div></div>`).join("") : `<div class="empty">还没有支出流水</div>`}</div>`;
}

function budgetView() {
  const year = activeYear(state), projects = yearProjects(year), month = currentBudgetMonth(state, year), base = baseFlexible(state, year);
  return `${sectionTitle("当前财年", `<button class="text-button" data-nav="settings">财年设置</button>`)}<div class="panel"><div class="panel-row"><span>周期</span><strong>${fiscalPeriodLabel(year)}</strong></div><label>年度总预算<input id="annualBudget" type="number" step="0.01" placeholder="未填写" value="${year.annualBudget ?? ""}"></label><button class="button secondary" id="saveAnnual">保存年度预算</button></div>
    ${sectionTitle("预算项目", `<button class="text-button" id="addProject">新增</button>`)}<div class="list">${projects.length ? projects.map(p => `<div class="list-row"><div><strong>${esc(p.name)}</strong><small>${p.type === "interMonth" ? "跨月预算" : p.type === "utilities" ? "水电费" : "月度固定支出"}</small></div><div class="row-end"><input class="inline-input" data-project-amount="${p.id}" type="number" step="0.01" value="${p.amount ?? ""}" placeholder="未填写"><button class="icon-button" data-delete-project="${p.id}">×</button></div></div>`).join("") : `<div class="empty">还没有预算项目</div>`}</div>
    <div class="panel"><div class="panel-row"><span>基础月度灵活支出</span><strong>${base === null ? "待填写预算" : formatMoney(base)}</strong></div>${month?.flexible ? `<div class="panel-row"><span>本月剩余</span><strong class="${month.flexible.closing < 0 ? "negative" : ""}">${signedMoney(month.flexible.closing)}</strong></div>` : ""}<p class="muted">固定项目和灵活支出的正负结余会在统一结算时结转到下月。</p><button class="button primary-button" id="settle">统一结算至当前月</button></div>
    ${sectionTitle("跨年预算", `<button class="text-button" id="addMulti">新增</button>`)}<div class="list">${state.multiYear.filter(p => p.active !== false).map(p => `<div class="list-row"><div><strong>${esc(p.name)}</strong><small>跨年资金池</small></div><div class="row-end"><strong>${formatMoney(p.amount)}</strong><button class="icon-button" data-delete-multi="${p.id}">×</button></div></div>`).join("") || `<div class="empty">还没有跨年预算</div>`}</div>`;
}

function fiscalPeriodLabel(year) {
  const storedYear = Number(String(year.startDate || "").slice(0, 4)) || new Date().getFullYear();
  const start = new Date(Date.UTC(storedYear, year.startMonth - 1, 1));
  const end = new Date(Date.UTC(storedYear, year.startMonth - 1 + 11, 1));
  const key = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${key(start)} 至 ${key(end)}`;
}

function settingsView() {
  return `${sectionTitle("设置")}<div class="panel"><h3>财年</h3><label>起始月份<select id="fiscalStart">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${state.settings.fiscalStartMonth === i + 1 ? "selected" : ""}>${i + 1} 月</option>`).join("")}</select></label><button class="button secondary" id="resetFiscal">确认并进入新财年</button><p class="muted">旧财年会封存，新财年保留项目名称但清空金额和流水。</p></div>
    <div class="panel"><h3>数据备份</h3><p class="muted">JSON 备份包含全部资产、预算、流水、结算和 FIRE 目标，可在本机恢复。</p><div class="button-row"><button class="button primary-button" id="exportJSON">导出 JSON</button><button class="button secondary" id="importJSON">恢复 JSON</button><input id="jsonFile" type="file" accept="application/json" hidden></div><p class="muted">${storagePersistent ? "浏览器已申请持久化存储。" : "当前使用浏览器本地存储，请定期导出备份。"}</p></div>
    <div class="panel"><h3>FIRE 目标</h3><form id="fireForm" class="form-grid"><label>类型<select name="type"><option value="largeOrPeriodic">大额/周期性支出</option><option value="dailyFixed">日常固定支出</option><option value="dailyFlexible">日常弹性消费</option></select></label><label>名称<input name="name" required></label><label>总金额<input name="amount" type="number" min="0" step="0.01" required></label><button class="button secondary">新增目标</button></form><div class="compact-list">${state.fireTargets.map(t => `<div><span>${esc(t.name)}</span><strong>${formatMoney(t.amount)}</strong></div>`).join("") || "暂无目标"}</div></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(node => node.addEventListener("click", () => { page = node.dataset.nav; render(); }));
  document.querySelector("#saveAssets")?.addEventListener("click", async () => { state.savings.initialCash = inputMoney(document.querySelector("#initialCash").value) || 0; state.savings.stockValue = inputMoney(document.querySelector("#stockValue").value) || 0; await persist(); render(); });
  document.querySelector("#saveExpenseBalance")?.addEventListener("click", async () => { state.expenseBalance = inputMoney(document.querySelector("#expenseBalance").value) || 0; await persist(); render(); });
  document.querySelector("#incomeForm")?.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(event.currentTarget); const row = { month: data.get("month"), salary: inputMoney(data.get("salary")) || 0, fund: inputMoney(data.get("fund")) || 0 }; const old = state.incomes.find(item => item.month === row.month); if (old) Object.assign(old, row); else state.incomes.push(row); await persist(); render(); });
  document.querySelector("#transactionForm")?.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(event.currentTarget); const amountValue = inputMoney(data.get("amount")); if (!amountValue || amountValue <= 0) return toast("金额必须大于 0"); const target = data.get("target"); if (data.get("account") === "expense" && !target) return toast("请选择预算目标"); const category = target === "flexible" ? data.get("flexibleName") || "灵活支出" : target?.startsWith("project:") ? yearProjects(activeYear(state)).find(p => p.id === target.slice(8))?.name : target?.startsWith("multi:") ? state.multiYear.find(p => p.id === target.slice(6))?.name : "储蓄账户支出"; const tx = { id: id(), amount: amountValue, category, memo: data.get("memo") || "", occurredAt: data.get("date") || monthKey(), account: data.get("account"), active: true, target, month: currentBudgetMonth(state)?.key || monthKey() }; state.transactions.push(tx); if (tx.account === "expense") state.expenseBalance -= amountValue; await persist(); render(); });
  document.querySelectorAll("[data-delete-transaction]").forEach(node => node.addEventListener("click", async () => { const tx = state.transactions.find(item => item.id === node.dataset.deleteTransaction); if (!tx || !confirm("删除这笔流水？预算会生成返还影响。")) return; tx.active = false; if (tx.account === "expense") state.expenseBalance += money(tx.amount); await persist(); render(); }));
  document.querySelector("#saveAnnual")?.addEventListener("click", async () => { activeYear(state).annualBudget = inputMoney(document.querySelector("#annualBudget").value); await persist(); render(); });
  document.querySelectorAll("[data-project-amount]").forEach(node => node.addEventListener("change", async () => { const p = activeYear(state).projects.find(item => item.id === node.dataset.projectAmount); p.amount = inputMoney(node.value); await persist(); render(); }));
  document.querySelector("#addProject")?.addEventListener("click", async () => { const name = prompt("项目名称"); if (!name?.trim()) return; const type = prompt("类型：interMonth / monthlyFixed / utilities", "monthlyFixed"); if (!["interMonth", "monthlyFixed", "utilities"].includes(type)) return toast("类型不正确"); activeYear(state).projects.push({ id: id(), name: name.trim(), type, amount: null, active: true }); await persist(); render(); });
  document.querySelectorAll("[data-delete-project]").forEach(node => node.addEventListener("click", async () => { const p = activeYear(state).projects.find(item => item.id === node.dataset.deleteProject); if (!p || !confirm("删除预算项目？有关联流水时不能删除。")) return; if (activeTransactions().some(t => t.target === `project:${p.id}`)) return toast("该项目仍有关联流水，请先删除流水"); p.active = false; await persist(); render(); }));
  document.querySelector("#settle")?.addEventListener("click", async () => { try { settle(); await persist(); render(); toast("已结算到当前月"); } catch (error) { toast(error.message); } });
  document.querySelector("#addMulti")?.addEventListener("click", async () => { const name = prompt("跨年项目名称"); if (!name?.trim()) return; const value = inputMoney(prompt("预算总额", "0")); state.multiYear.push({ id: id(), name: name.trim(), amount: value || 0, active: true }); await persist(); render(); });
  document.querySelectorAll("[data-delete-multi]").forEach(node => node.addEventListener("click", async () => { const p = state.multiYear.find(item => item.id === node.dataset.deleteMulti); if (!p || !confirm("删除跨年预算？")) return; if (activeTransactions().some(t => t.target === `multi:${p.id}`)) return toast("该项目仍有关联流水，请先删除流水"); p.active = false; await persist(); render(); }));
  document.querySelector("#resetFiscal")?.addEventListener("click", async () => { const startMonth = Number(document.querySelector("#fiscalStart").value); if (startMonth === state.settings.fiscalStartMonth) return toast("起始月份没有变化"); if (!confirm("当前财年将封存，确认进入新财年？")) return; const old = activeYear(state); old.status = "archived"; old.months.forEach(m => m.status = "archived"); const start = fiscalStart(startMonth); state.settings.fiscalStartMonth = startMonth; state.fiscalYears.push({ id: id(), startMonth, startDate: start.toISOString(), status: "active", annualBudget: null, projects: yearProjects(old).map(p => ({ ...p, id: id(), amount: null })), months: monthsForFiscalYear(start) }); await persist(); page = "budget"; render(); });
  document.querySelector("#exportJSON")?.addEventListener("click", exportJSON);
  document.querySelector("#importJSON")?.addEventListener("click", () => document.querySelector("#jsonFile").click());
  document.querySelector("#jsonFile")?.addEventListener("change", importJSON);
  document.querySelector("#fireForm")?.addEventListener("submit", async event => { event.preventDefault(); const data = new FormData(event.currentTarget); state.fireTargets.push({ id: id(), type: data.get("type"), name: data.get("name"), amount: inputMoney(data.get("amount")) || 0 }); await persist(); render(); });
}

function settle() {
  const year = activeYear(state), base = baseFlexible(state, year);
  if (base === null) throw new Error("请先填写年度总预算和所有预算项目金额");
  let utilityCarry = 0, flexibleCarry = 0;
  const current = monthKey();
  year.months.forEach(month => {
    if (month.key > current) return;
    let fixedCarry = 0;
    yearProjects(year).filter(p => ["monthlyFixed", "utilities"].includes(p.type)).forEach(project => {
      const previous = month.sequence > 1 ? year.months[month.sequence - 2].fixed[project.id]?.closing || 0 : 0;
      const carry = project.type === "utilities" ? utilityCarry : 0;
      const spent = activeTransactions().filter(t => t.month === month.key && t.target === `project:${project.id}`).reduce((s, t) => s + money(t.amount), 0);
      const available = money(project.amount) + carry;
      const closing = available - spent;
      month.fixed[project.id] = { available, spent, closing };
      if (project.type === "utilities") utilityCarry = closing; else fixedCarry += closing;
    });
    const flexibleSpent = activeTransactions().filter(t => t.month === month.key && t.target === "flexible").reduce((s, t) => s + money(t.amount), 0);
    const available = base + fixedCarry + flexibleCarry;
    month.flexible = { available, spent: flexibleSpent, closing: available - flexibleSpent };
    flexibleCarry = month.flexible.closing;
    month.status = "settled";
  });
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `fire-backup-${monthKey()}.json`; link.click(); URL.revokeObjectURL(url); toast("JSON 备份已导出");
}

async function importJSON(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try { const parsed = JSON.parse(await file.text()); if (!parsed || parsed.version !== 1 || !parsed.settings || !Array.isArray(parsed.transactions)) throw new Error("不是有效的 FIRE 账本备份"); if (!confirm("恢复备份会覆盖当前本地数据，确认继续？")) return; state = parsed; await persist(); render(); toast("JSON 备份已恢复"); } catch (error) { toast(`恢复失败：${error.message}`); } event.target.value = "";
}

async function boot() {
  state = await loadState(createInitialState());
  storagePersistent = await requestPersistentStorage();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  render();
}

boot().catch(error => { app.innerHTML = `<div class="fatal">无法加载本地数据：${esc(error.message)}</div>`; });
