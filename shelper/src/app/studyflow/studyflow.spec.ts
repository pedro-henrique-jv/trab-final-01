import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Studyflow } from './studyflow';

describe('Studyflow', () => {
  let component: Studyflow;
  let fixture: ComponentFixture<Studyflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Studyflow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Studyflow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
