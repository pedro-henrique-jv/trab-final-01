import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DOCUMENT } from '@angular/common';

enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK'
}

interface Question {
  id: string;
  studyflowId: string;
  type: QuestionType;
  expectedAnswer: string | boolean;
  answers: string | string[];
  question: string;
  answered: boolean;
  tags: string;
  lastReviewedAt: Date | null;
  userAnswer: string | boolean | null;
  isCorrect: boolean;
  submitted: boolean;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatToolbarModule,
    MatRadioModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './questions.html',
  styleUrls: ['./questions.scss']
})
export class QuestionsComponent implements OnInit, OnDestroy {
  QuestionType = QuestionType;
  showTags = false;
  studyflowTitle = '';
  studyflowId: string | null = null;
  questions: Question[] = [];
  isLoading = true;

  private secondsSpent: number = 0;
  private timerInterval: any;
  private visibilityHandler: () => void;
  private beforeUnloadHandler: (ev: BeforeUnloadEvent) => void;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.visibilityHandler = () => {
      try {
        if (this.document.visibilityState === 'hidden') {
          this.sendTimeSpent();
        }
      } catch (e) {
      }
    };

    this.beforeUnloadHandler = (ev: BeforeUnloadEvent) => {
      try {
        this.sendTimeSpent();
      } catch (e) {
      }
    };
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || localStorage.getItem('studyflowId') === null) {
      this.router.navigate(['/home']);
      return;
    }

    this.timerInterval = setInterval(() => {
      this.secondsSpent++;
      console.log('Seconds spent:', this.secondsSpent);
    }, 1000);

    this.studyflowId = localStorage.getItem('studyflowId');

    try {
      this.document.addEventListener('visibilitychange', this.visibilityHandler);

      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    } catch (e) {
      console.warn('Could not attach visibility/beforeunload handlers', e);
    }

    if (this.studyflowId) {
      this.loadQuestions(this.studyflowId);
    } else {
      this.snackBar.open('Studyflow ID not found', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('visibilitychange', this.visibilityHandler);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);

    this.sendTimeSpent();
  }

  private sendTimeSpent(): void {
    const timeSpentMillis = this.secondsSpent * 1000;
    const studyflowId = localStorage.getItem('studyflowId');

    if (!studyflowId) return;

    const payload = {
      millis: timeSpentMillis,
      studyflowId: studyflowId
    };

    const url = 'http://localhost:8080/api/studyflow/time';

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    } catch (e) {
    }
  }

  loadQuestions(studyflowId: string): void {
    const url = `http://localhost:8080/api/studyflow/questions?studyflowId=${studyflowId}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const unanswered = data.filter(q => !q.answered);

        this.questions = unanswered.map(q => {
          let expected: string | boolean = q.expectedAnswer ?? '';
          if (expected === 'true') expected = true;
          else if (expected === 'false') expected = false;

          const mappedQuestion: Question = {
            id: q.id,
            studyflowId: q.studyflowId,
            type: q.type as QuestionType,
            expectedAnswer: expected,
            answers: q.answers ?? '[]',
            question: q.question ?? '',
            answered: q.answered ?? false,
            tags: q.tags ?? '',
            lastReviewedAt: q.lastReviewedAt ? new Date(q.lastReviewedAt) : null,
            userAnswer: null,
            isCorrect: false,
            submitted: false
          };

          if (q.type === 'MULTIPLE_CHOICE') {
            console.log('Multiple choice question:', q.question);
            console.log('Raw answers:', q.answers);
            console.log('Parsed answers:', this.getOptionsDebug(mappedQuestion));
          }

          return mappedQuestion;
        });

        console.log('Processed questions:', this.questions);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load questions:', error);
        this.snackBar.open('Failed to load questions', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onBack(): void {
    this.router.navigate(['/welcome']);
  }

  getOptions(question: Question): string[] {
    try {
      if (question.type === QuestionType.TRUE_FALSE) {
        return ['Verdadeiro', 'Falso'];
      }

      // If answers is already an array
      if (Array.isArray(question.answers)) {
        return question.answers as string[];
      }

      // If answers is string, try to parse as JSON array, else fallback to manual parse
      if (typeof question.answers === 'string') {
        // First try standard JSON parsing
        try {
          const parsed = JSON.parse(question.answers);
          return Array.isArray(parsed) ? parsed : [];
        } catch (jsonError) {
          // Manual parse: remove brackets and split by comma
          const cleaned = question.answers.replace(/^\[|\]$/g, '').trim();
          if (!cleaned) return [];

          const options = cleaned.split(',').map(item => {
            // remove surrounding quotes if present and trim
            return item.replace(/^["']|["']$/g, '').trim();
          });
          return options.filter(opt => opt.length > 0);
        }
      }

      return [];
    } catch (error) {
      console.error('Error parsing options for question:', question.id, error);
      console.log('Answers value:', question.answers);
      return [];
    }
  }

  // Temporary debug method
  getOptionsDebug(question: Question): string[] {
    return this.getOptions(question);
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getTags(question: Question): string[] {
    return question.tags ? question.tags.split(',').map(tag => tag.trim()) : [];
  }

  onSubmitQuestion(question: Question): void {
    // helper: checa vazio estritamente
    const isEmpty = (ans: any) => ans === null || ans === undefined || (typeof ans === 'string' && ans.trim() === '');

    // validação por tipo
    if (question.type === QuestionType.TRUE_FALSE) {
      // para TF, aceitar explicitamente boolean; null/undefined = sem resposta
      if (question.userAnswer === null || question.userAnswer === undefined) {
        this.snackBar.open('Por favor, forneça uma resposta', 'Fechar', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }
    } else {
      // demais tipos: string não vazia
      if (isEmpty(question.userAnswer)) {
        this.snackBar.open('Por favor, forneça uma resposta', 'Fechar', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }
    }

    question.submitted = true;

    // checagem por tipo
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const userLetter = typeof question.userAnswer === 'string' ? (question.userAnswer as string) : '';
      const letterIndex = userLetter ? userLetter.charCodeAt(0) - 65 : -1; // A=0
      const options = this.getOptions(question);
      const selectedAnswer = (letterIndex >= 0 && letterIndex < options.length) ? options[letterIndex] : '';

      const normalizedSelected = selectedAnswer.trim().toLowerCase();
      const normalizedExpected = (typeof question.expectedAnswer === 'string' ? question.expectedAnswer : String(question.expectedAnswer)).trim().toLowerCase();

      question.isCorrect = normalizedSelected === normalizedExpected;
    } else if (question.type === QuestionType.TRUE_FALSE) {
      // expectedAnswer pode ser boolean ou string 'true'/'false' (já normalizamos no loadQuestions, mas tratamos aqui também)
      let user: boolean;
      if (typeof question.userAnswer === 'boolean') {
        user = question.userAnswer;
      } else {
        user = String(question.userAnswer).toLowerCase() === 'true';
      }

      let expected: boolean;
      if (typeof question.expectedAnswer === 'boolean') {
        expected = question.expectedAnswer;
      } else {
        expected = String(question.expectedAnswer).toLowerCase() === 'true';
      }

      question.isCorrect = (user === expected);
    } else { // SHORT_ANSWER e FILL_IN_THE_BLANK
      const normalizedUser = String(question.userAnswer ?? '').trim().toLowerCase();
      const normalizedExpected = (typeof question.expectedAnswer === 'string' ? question.expectedAnswer : String(question.expectedAnswer)).trim().toLowerCase();
      question.isCorrect = normalizedUser === normalizedExpected;
    }

    question.answered = true;
    question.lastReviewedAt = new Date();

    const dto = {
      id: question.id,
      userAnswer: question.userAnswer,
      correct: question.isCorrect
    };

    this.http.patch('http://localhost:8080/api/studyflow/questions', dto)
      .subscribe({
        next: () => {
          const message = question.isCorrect ? 'Correto! Muito bem!' : `Incorreto. A resposta correta é: ${question.expectedAnswer}`;
          const panelClass = question.isCorrect ? 'success-snackbar' : 'error-snackbar';

          this.snackBar.open(message, 'Fechar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: [panelClass]
          });
        },
        error: (err) => {
          console.error('Erro ao enviar resposta:', err);
          this.snackBar.open('Erro ao enviar resposta. Tente novamente.', 'Fechar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  getQuestionIcon(type: QuestionType): string {
    const icons = {
      [QuestionType.MULTIPLE_CHOICE]: 'radio_button_checked',
      [QuestionType.SHORT_ANSWER]: 'edit_note',
      [QuestionType.TRUE_FALSE]: 'check_circle',
      [QuestionType.FILL_IN_THE_BLANK]: 'text_fields'
    };
    return icons[type];
  }

  getQuestionTypeLabel(type: QuestionType): string {
    const labels = {
      [QuestionType.MULTIPLE_CHOICE]: 'Múltipla Escolha',
      [QuestionType.SHORT_ANSWER]: 'Resposta Curta',
      [QuestionType.TRUE_FALSE]: 'Verdadeiro/Falso',
      [QuestionType.FILL_IN_THE_BLANK]: 'Preencher Lacuna'
    };
    return labels[type];
  }
}
