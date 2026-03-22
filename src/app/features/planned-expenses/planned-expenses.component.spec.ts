import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlannedExpensesComponent } from './planned-expenses.component';

describe('PlannedExpensesComponent', () => {
  let component: PlannedExpensesComponent;
  let fixture: ComponentFixture<PlannedExpensesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannedExpensesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlannedExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
