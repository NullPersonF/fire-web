import assert from "node:assert/strict";
import test from "node:test";
import { activeYear, createInitialState, expenseBudgetBalance, totalAssets } from "../src/domain.js";

function fundedState() {
  const state = createInitialState();
  state.savings = { initialCash: 10000, stockValue: 2000 };
  state.incomes = [{ month: "2026-05", salary: 1000, fund: 500 }];
  activeYear(state).annualBudget = 12000;
  state.multiYear = [{ id: "travel", amount: 3000, active: true }];
  return state;
}

test("total assets only include savings, stocks and recorded income", () => {
  const state = fundedState();
  state.expenseBalance = 99999;
  assert.equal(expenseBudgetBalance(state), 15000);
  assert.equal(totalAssets(state), 13500);
  activeYear(state).annualBudget = 24000;
  state.multiYear[0].amount = 6000;
  assert.equal(expenseBudgetBalance(state), 30000);
  assert.equal(totalAssets(state), 13500);
});

test("expense account spending and deletion do not affect total assets", () => {
  const state = fundedState();
  const transaction = { amount: 250, account: "expense", target: "multi:travel", active: true };
  state.transactions.push(transaction);
  assert.equal(expenseBudgetBalance(state), 14750);
  assert.equal(totalAssets(state), 13500);
  transaction.active = false;
  assert.equal(expenseBudgetBalance(state), 15000);
  assert.equal(totalAssets(state), 13500);
});

test("savings account spending reduces total assets until deleted", () => {
  const state = fundedState();
  const transaction = { amount: 250, account: "savings", active: true };
  state.transactions.push(transaction);
  assert.equal(totalAssets(state), 13250);
  transaction.active = false;
  assert.equal(totalAssets(state), 13500);
});
