import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlySeries, rankTools, recordToolClick, taipeiYearMonth } from './usageAnalytics.mjs';

test('Taipei month crosses the UTC year boundary', () => {
  assert.deepEqual(taipeiYearMonth(new Date('2026-12-31T16:01:00Z')), {year: 2027, month: 1});
});
test('monthly chart fills gaps and filters by application', () => {
  const rows = [{month: 1, tool_id: 'a', clicks: 3}, {month: 1, tool_id: 'b', clicks: 2}, {month: 12, tool_id: 'a', clicks: 4}];
  assert.deepEqual(buildMonthlySeries(rows), [5,0,0,0,0,0,0,0,0,0,0,4]);
  assert.equal(buildMonthlySeries(rows, 'b')[0], 2);
});
test('rank includes unused apps and separates monthly and annual totals', () => {
  const rows = [{month: 1, tool_id: 'a', clicks: 3}, {month: 2, tool_id: 'b', clicks: 8}];
  assert.deepEqual(rankTools(rows, [{id:'a',title:'A'},{id:'b',title:'B'},{id:'c',title:'C'}], 2).map(x=>[x.id,x.monthClicks,x.yearClicks]), [['b',8,8],['a',0,3],['c',0,0]]);
});
test('tracking sends one event and safely handles unavailable analytics', async () => {
  let calls = 0;
  const client = {rpc: async (name,args) => {calls++; assert.equal(name,'record_portal_tool_click');assert.equal(args.p_tool_id,'a');assert.ok(args.p_event_id);return {error:null};}};
  assert.equal(await recordToolClick(client,'a'), true);
  assert.equal(calls,1);
  assert.equal(await recordToolClick(null,'a'),false);
  assert.equal(await recordToolClick({rpc:async()=>{throw Error('offline');}},'a'),false);
  assert.equal(await recordToolClick({rpc:async()=>({error:{code:'PGRST202'}})},'a'),false);
});
