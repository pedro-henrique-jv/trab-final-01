import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnsweredQuestions } from './answered-questions';

describe('AnsweredQuestions', () => {
  let component: AnsweredQuestions;
  let fixture: ComponentFixture<AnsweredQuestions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnsweredQuestions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnsweredQuestions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
