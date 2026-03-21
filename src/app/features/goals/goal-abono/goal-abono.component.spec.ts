import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalAbonoComponent } from './goal-abono.component';

describe('GoalAbonoComponent', () => {
  let component: GoalAbonoComponent;
  let fixture: ComponentFixture<GoalAbonoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalAbonoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalAbonoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
