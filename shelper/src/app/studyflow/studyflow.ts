import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {firstValueFrom} from 'rxjs';

interface Resource {
  binary: string;
  mime: string;
  filename: string;
  studyflowId: string;
  indicator: boolean;
}

interface StudyflowDetail {
  id: string;
  title: string;
  description: string;
  mainTags: string[];
  creationDate: string;
  resources: Resource[];
  status: string | null;
}

@Component({
  selector: 'app-studyflow-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatListModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './studyflow.html',
  styleUrls: ['./studyflow.scss']
})
export class StudyflowComponent implements OnInit {
  studyflow: StudyflowDetail | null = null;
  loading: boolean = true;
  error: string | null = null;
  studyflowId : string | null = '';
  isGeneratingQuestions = false;

  constructor(
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (localStorage.getItem('studyflowId') === ""){
      this.router.navigate(['/home']);
    }
    else{
      this.studyflowId = localStorage.getItem('studyflowId');
    }
    this.loadStudyflow();
  }

  loadStudyflow(): void {
    const studyflowId = localStorage.getItem('studyflowId');

    if (!studyflowId) {
      this.error = 'No studyflow ID found';
      this.loading = false;
      return;
    }

    this.http.get<StudyflowDetail>(`http://localhost:8080/api/studyflow/byId?studyflowId=${studyflowId}`)
      .subscribe({
        next: (data) => {
          console.log(data);
          this.studyflow = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading studyflow:', err);
          this.error = 'Failed to load studyflow';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onAddResource(): void {
  }

  onGenerateOverview(): void {
    const id = localStorage.getItem('studyflowId');

    this.http.get<any>(`http://localhost:8080/api/studyflow/overview?id=${id}`).subscribe({
      next: (response) => {
        try {
          console.log('Response:', response);

          if (!response.data) {
            console.error('No PDF data received');
            return;
          }

          // Decode Base64 string to binary
          const binaryString = atob(response.data);
          const byteArray = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
          }

          console.log('Byte array length:', byteArray.length);

          const blob = new Blob([byteArray], { type: 'application/pdf' });
          console.log('Blob size:', blob.size);

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `overview-${id}.pdf`;

          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);

          console.log('PDF downloaded successfully');
        } catch (error) {
          console.error('Error processing PDF:', error);
        }
      },
      error: (error) => {
        console.error('Error fetching overview:', error);
      }
    });
  }

  async onGenerateQuestions(): Promise<void> {
    if (!this.studyflowId) return;

    const generate: boolean = await this.loadQuestions(this.studyflowId);

    if (!generate) {
      this.router.navigate(['/studyflow-questions']);
    }
    else{
      this.http.post<any>('http://localhost:8080/api/studyflow/generate',
        `"${this.studyflowId}"`,
        { headers: { 'Content-Type': 'application/json' } })
        .subscribe({
          next: (response) => {
            if (this.studyflowId != null) {
              localStorage.setItem('studyflowId', this.studyflowId);
            }
            this.isGeneratingQuestions = false;
            this.snackBar.open('Questões geradas com sucesso!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/studyflow-questions']);
          },
          error: (error) => {
            this.isGeneratingQuestions = false;
            this.snackBar.open('Falha ao gerar questões', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
    }
  }

  questions: Question[] = [];

  onViewAnsweredQuestions(): void {
    this.router.navigate(['/answered-questions']);
  }

  onViewStatus(): void {
    this.router.navigate(['/studyflow-status'])
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const icons: { [key: string]: string } = {
      'pdf': 'picture_as_pdf',
      'docx': 'description',
      'doc': 'description',
      'pptx': 'slideshow',
      'ppt': 'slideshow',
      'xlsx': 'table_chart',
      'xls': 'table_chart',
      'txt': 'text_snippet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image'
    };
    return icons[extension] || 'insert_drive_file';
  }

  getFileColor(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const colors: { [key: string]: string } = {
      'pdf': '#f44336',
      'docx': '#2196F3',
      'doc': '#2196F3',
      'pptx': '#FF9800',
      'ppt': '#FF9800',
      'xlsx': '#4CAF50',
      'xls': '#4CAF50',
      'txt': '#9E9E9E',
      'png': '#9C27B0',
      'jpg': '#9C27B0',
      'jpeg': '#9C27B0'
    };
    return colors[extension] || '#757575';
  }

  getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toUpperCase() || '';
    return extension;
  }

  async loadQuestions(studyflowId: string): Promise<boolean> {
    const url = `http://localhost:8080/api/studyflow/questions?studyflowId=${studyflowId}`;

    try {
      const data = await firstValueFrom(this.http.get<any[]>(url));
      const unanswered = data.filter(q => !q.answered);
      return unanswered.length === 0;
    } catch (err) {
      return true;
    }
  }

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

enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK'
}
