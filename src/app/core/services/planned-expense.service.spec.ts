import { TestBed } from '@angular/core/testing';

import { PlannedExpenseService } from './planned-expense.service';

describe('PlannedExpenseService', () => {
  let service: PlannedExpenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlannedExpenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
