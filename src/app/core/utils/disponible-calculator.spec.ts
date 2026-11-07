import { addLocalDays, calculateAvailable } from "./disponible-calculator";
describe("FinFlow Disponible", () => {
  const base=[{balance:1200000,currency:"COP",archived:false}];
  it("reserves pending obligations and savings using decimal-safe cent sums",()=>{
    const result=calculateAvailable(base,[
      {amount:300000,status:"pending",dueDate:"2026-11-09"},
      {amount:150000.10,status:"pending",dueDate:"2026-11-15"},
      {amount:999999,status:"done",dueDate:"2026-11-13"},
      {amount:80000,status:"pending",dueDate:"2026-11-30"}],
      200000,"2026-11-22","2026-11-07");
    expect(result?.availableCop).toBe(549999.9);
    expect(result?.pendingCount).toBe(2);
    expect(result?.daysUntilPayday).toBe(15);
  });
  it("does not treat future deposits as present cash and ignores archived/foreign accounts",()=>{
    const result=calculateAvailable([...base,
      {balance:100000,currency:"USD",archived:false},
      {balance:99999,currency:"COP",archived:true}],[],
      0,"2026-11-22","2026-11-07");
    expect(result?.balanceCop).toBe(1200000);
  });
  it("includes overdue pending obligations and ignores ones without due dates",()=>{
    const result=calculateAvailable(base,[
      {amount:15000,status:"pending",dueDate:"2026-11-01"},
      {amount:25000,status:"pending"},
      {amount:35000,status:"cancelled",dueDate:"2026-11-18"}],
      0,"2026-11-22","2026-11-07");
    expect(result?.pendingCop).toBe(15000);
    expect(result?.unplannedCount).toBe(1);
  });
  it("rejects invalid payday dates and reserves",()=>{
    expect(calculateAvailable(base,[],0,"2026-11-07","2026-11-07")).toBeNull();
    expect(calculateAvailable(base,[],-1,"2026-11-22","2026-11-07")).toBeNull();
    expect(calculateAvailable(base,[],0,"2026-02-30","2026-11-07")).toBeNull();
  });
  it("clamps daily allowance to zero when obligations exceed available cash",()=>{
    const result=calculateAvailable(base,[{status:"pending",amount:1500000,dueDate:"2026-11-11"}],0,"2026-11-22","2026-11-07");
    expect(result?.availableCop).toBe(-300000);
    expect(result?.dailyCop).toBe(0);
  });
  it("handles end-of-month boundaries without local timezone drift",()=>{
    expect(addLocalDays("2026-11-30",1)).toBe("2026-12-01");
  });
});
