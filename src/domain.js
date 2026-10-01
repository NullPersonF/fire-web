export const money = value => Number(value || 0);
export const id = () => crypto.randomUUID();

export function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fiscalStart(startMonth, date = new Date()) {
  const current = new Date(date);
  const year = current.getMonth() + 1 >= startMonth ? current.getFullYear() : current.getFullYear() - 1;
  // Use the middle of the month so converting to ISO does not cross a timezone boundary.
  return new Date(year, startMonth - 1, 15);
}

export function monthsForFiscalYear(start) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return { key: monthKey(date), sequence: index + 1, status: "draft", fixed: {}, flexible: null };
  });
}

export function createInitialState() {
  const startMonth = 1;
  return {
    version: 1,
    settings: { fiscalStartMonth: startMonth, currency: "CNY" },
    savings: { initialCash: 0, stockValue: 0 },
    expenseBalance: 0,
    incomes: [],
    transactions: [],
    fiscalYears: [{ id: id(), startMonth, startDate: fiscalStart(startMonth).toISOString(), status: "active", annualBudget: null, projects: [], months: monthsForFiscalYear(fiscalStart(startMonth)) }],
    multiYear: [],
    fireTargets: []
  };
}

export function activeYear(state) { return state.fiscalYears.find(year => year.status === "active"); }
export function latestIncome(state) { return [...state.incomes].sort((a, b) => a.month.localeCompare(b.month)).at(-1); }

export function savingsTotal(state) {
  const income = state.incomes.reduce((sum, row) => sum + money(row.salary) + money(row.fund), 0);
  const spending = state.transactions.filter(t => t.active !== false && t.account === "savings").reduce((sum, t) => sum + money(t.amount), 0);
  return money(state.savings.initialCash) + money(state.savings.stockValue) + income - spending;
}

export function fireTarget(state) { return state.fireTargets.reduce((sum, row) => sum + money(row.amount), 0); }
export function totalAssets(state) { return savingsTotal(state) + money(state.expenseBalance); }
export function baseFlexible(state, year = activeYear(state)) {
  if (!year || year.annualBudget === null || year.projects.some(p => p.active !== false && p.amount === null)) return null;
  const interMonth = year.projects.filter(p => p.active !== false && p.type === "interMonth").reduce((sum, p) => sum + money(p.amount), 0);
  const fixed = year.projects.filter(p => p.active !== false && ["monthlyFixed", "utilities"].includes(p.type)).reduce((sum, p) => sum + money(p.amount), 0);
  return (money(year.annualBudget) - interMonth - fixed * 12) / 12;
}

export function currentBudgetMonth(state, year = activeYear(state)) {
  return year?.months.find(m => m.key === monthKey()) || year?.months[0];
}

export function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 2 }).format(money(value));
}

export function signedMoney(value) { return `${money(value) >= 0 ? "+" : ""}${formatMoney(value)}`; }
