import { describe, expect, it } from 'vitest';
import { calculate, decodeDraft, emptyDraft, encodeDraft, parseWeight } from './core';
const example = { ...emptyDraft, load: '10', hook: '0.5', rigging: '0.3', extra: '0.2', capacity: '20' };
describe('重量解析與單位', () => {
  it.each([['0',0],['0.001',1],['12.345',12345],[' 1.5 ',1500],['1000000',1000000000]])('%s 公噸轉公斤', (input, expected) => expect(parseWeight(input)).toBe(expected));
  it.each(['', ' ', '-1', 'NaN', 'Infinity', '1e3', '0x10', '1,000', '1.0001', '1000001', 'abc'])('拒絕無效重量 %s', input => expect(() => parseWeight(input)).toThrow());
});
describe('吊重與能力使用率', () => {
  it('加總四項重量並計算使用率', () => expect(calculate(example)).toEqual({ total:11, utilization:55, exceeded:false, atLimit:false }));
  it('精確加總小數重量', () => expect(calculate({...example,load:'0.1',hook:'0.2',rigging:'0',extra:'0',capacity:'0.3'})).toEqual({total:0.3,utilization:100,exceeded:false,atLimit:true}));
  it('允許零吊重但不允許零額定能力', () => {
    expect(calculate({...example,load:'0',hook:'0',rigging:'0',extra:'0'}).utilization).toBe(0);
    expect(() => calculate({...example,capacity:'0'})).toThrow('大於 0');
  });
  it('超載不受顯示四捨五入影響', () => expect(calculate({...example,load:'1000.001',hook:'0',rigging:'0',extra:'0',capacity:'1000'}).exceeded).toBe(true));
  it('可回傳大於 100% 的實際使用率', () => expect(calculate({...example,capacity:'5'}).utilization).toBe(220));
  it.each(['load','hook','rigging','extra','capacity'] as const)('拒絕 %s 的無效數值', key => expect(() => calculate({...example,[key]:'-1'})).toThrow());
  it('來源及設備名稱不影響算術或產生安全核准', () => {
    expect(calculate({...example,brand:'300T',model:'300',confirmed:true,source:'文件',conditions:'條件'})).toEqual(calculate(example));
    expect(calculate(example)).not.toHaveProperty('pass');
  });
});
describe('本機草稿格式', () => {
  it('完整保留所有輸入，包含尚未完成的試算', () => {
    expect(decodeDraft(encodeDraft(example))).toEqual(example);
    expect(decodeDraft(encodeDraft(emptyDraft))).toEqual(emptyDraft);
  });
  it.each(['null','{}','invalid','{"version":2,"draft":{}}','{"version":1,"draft":null}'])('拒絕損毀或未知版本 %s', raw => expect(() => decodeDraft(raw)).toThrow());
  it('拒絕缺少欄位、不正確型別及過長內容', () => {
    for (const d of [{...example,load:4},{...example,confirmed:'true'},{...example,source:'x'.repeat(5001)}]) expect(() => decodeDraft(JSON.stringify({version:1,draft:d}))).toThrow();
    const { model: _, ...missing } = example;
    expect(() => decodeDraft(JSON.stringify({version:1,draft:missing}))).toThrow();
  });
});
