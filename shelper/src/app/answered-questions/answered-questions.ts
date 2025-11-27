import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-review-questions',
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
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './answered-questions.html',
  styleUrls: ['./answered-questions.scss']
})
export class AnsweredQuestionsComponent implements OnInit {
  QuestionType = QuestionType;
  showTags = false;
  studyflowTitle = '';
  studyflowId: string | null = null;
  questions: Question[] = [];
  isLoading = true;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.studyflowId = localStorage.getItem('studyflowId');

    if (!this.studyflowId) {
      this.router.navigate(['/home']);
      return;
    }

    this.loadQuestions(this.studyflowId);
  }

  loadQuestions(studyflowId: string): void {
    const url = `http://localhost:8080/api/studyflow/questions?studyflowId=${studyflowId}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Raw API response:', data);
        // Filtra apenas questões respondidas
        const answeredQuestions = data.filter(q => q.answered === true);

        this.questions = answeredQuestions.map(q => {
          let expected: string | boolean = q.expectedAnswer ?? '';
          if (expected === 'true') expected = true;
          else if (expected === 'false') expected = false;

          // Normaliza userAnswer se for true/false string
          let userAns = q.userAnswer;
          if (userAns === 'true') userAns = true;
          else if (userAns === 'false') userAns = false;

          // Tenta pegar isCorrect da API, senão calcula
          const isCorrect = q.isCorrect ?? q.correct ?? this.calculateIsCorrect(expected, userAns, q.type);

          return {
            id: q.id,
            studyflowId: q.studyflowId,
            type: q.type as QuestionType,
            expectedAnswer: expected,
            answers: q.answers ?? '[]',
            question: q.question ?? '',
            answered: q.answered ?? false,
            tags: q.tags ?? '',
            lastReviewedAt: q.lastReviewedAt ? new Date(q.lastReviewedAt) : null,
            userAnswer: userAns,
            isCorrect: isCorrect
          };
        });

        console.log('Answered questions:', this.questions);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load questions:', error);
        this.snackBar.open('Erro ao carregar questões', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calculateIsCorrect(expected: string | boolean, userAnswer: string | boolean | null, type: QuestionType): boolean {
    if (userAnswer === null || userAnswer === undefined) return false;

    const normalizeAnswer = (val: string | boolean): string => {
      return String(val).trim().toLowerCase();
    };

    return normalizeAnswer(expected) === normalizeAnswer(userAnswer);
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  getOptions(question: Question): string[] {
    try {
      if (question.type === QuestionType.TRUE_FALSE) {
        return ['Verdadeiro', 'Falso'];
      }

      if (Array.isArray(question.answers)) {
        return question.answers as string[];
      }

      if (typeof question.answers === 'string') {
        try {
          const parsed = JSON.parse(question.answers);
          return Array.isArray(parsed) ? parsed : [];
        } catch (jsonError) {
          const cleaned = question.answers.replace(/^\[|\]$/g, '').trim();
          if (!cleaned) return [];

          const options = cleaned.split(',').map(item => {
            return item.replace(/^["']|["']$/g, '').trim();
          });
          return options.filter(opt => opt.length > 0);
        }
      }

      return [];
    } catch (error) {
      console.error('Error parsing options:', error);
      return [];
    }
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getTags(question: Question): string[] {
    return question.tags ? question.tags.split(',').map(tag => tag.trim()) : [];
  }

  // Checa se a opção é a resposta do usuário
  isUserAnswer(question: Question, option: string, index: number): boolean {
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const userLetter = typeof question.userAnswer === 'string' ? question.userAnswer : '';
      return userLetter === this.getOptionLetter(index);
    }
    if (question.type === QuestionType.TRUE_FALSE) {
      const userBool = typeof question.userAnswer === 'boolean' ? question.userAnswer :
        String(question.userAnswer).toLowerCase() === 'true';
      const optionBool = option.toLowerCase() === 'verdadeiro';
      return userBool === optionBool;
    }
    return false;
  }

  // Checa se a opção é a resposta correta
  isCorrectAnswer(question: Question, option: string): boolean {
    const normalizedOption = option.trim().toLowerCase();
    const normalizedExpected = (typeof question.expectedAnswer === 'string'
      ? question.expectedAnswer
      : String(question.expectedAnswer)).trim().toLowerCase();

    return normalizedOption === normalizedExpected;
  }

  // Para TRUE/FALSE, checa se é a resposta correta
  isTrueFalseCorrect(question: Question, isTrue: boolean): boolean {
    const expected = typeof question.expectedAnswer === 'boolean'
      ? question.expectedAnswer
      : String(question.expectedAnswer).toLowerCase() === 'true';
    return expected === isTrue;
  }

  // Para TRUE/FALSE, checa se é a resposta do usuário
  isTrueFalseUserAnswer(question: Question, isTrue: boolean): boolean {
    const userAns = typeof question.userAnswer === 'boolean'
      ? question.userAnswer
      : String(question.userAnswer).toLowerCase() === 'true';
    return userAns === isTrue;
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
