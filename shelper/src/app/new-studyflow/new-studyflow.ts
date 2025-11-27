import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

interface ResourceFile {
  file: File;
  filename: string;
  filetype: string;
  mime: string;
  indicator: boolean;
}

@Component({
  selector: 'app-new-studyflow',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatListModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './new-studyflow.html',
  styleUrls: ['./new-studyflow.scss']
})
export class NewStudyflowComponent implements OnInit {
  studyflowForm: FormGroup;
  isCreating = false;
  studyflowCreated = false;
  createdStudyflowId: string | null = null;
  selectedFiles: ResourceFile[] = [];
  isUploading = false;
  resourcesUploaded = false;
  isGeneratingQuestions = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.studyflowForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit() {
    const userId = localStorage.getItem('userId');
    if (userId === null){
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onCreateStudyflow(): void {
    if (!this.studyflowForm.valid) {
      Object.keys(this.studyflowForm.controls).forEach(key => {
        this.studyflowForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isCreating = true;
    const studentId = localStorage.getItem('userId');

    if (!studentId) {
      this.snackBar.open('User ID not found. Please login again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      this.isCreating = false;
      return;
    }

    const studyflowData = {
      studentId: studentId,
      title: this.studyflowForm.value.title,
      description: this.studyflowForm.value.description
    };

    this.http.post<any>('http://localhost:8080/api/studyflow', studyflowData, { observe: 'response' })
      .subscribe({
        next: (response) => {
          this.isCreating = false;

          if (response.status === 201) {
            this.studyflowCreated = true;
            this.createdStudyflowId = response.body.data;
            this.cdr.detectChanges();
            this.snackBar.open('Studyflow criado com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          }
        },
        error: (error) => {
          this.isCreating = false;
          this.snackBar.open(error.error?.message || 'Failed to create studyflow', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      this.selectedFiles.push({
        file: file,
        filename: file.name,
        filetype: fileExtension,
        mime: file.type,
        indicator: false
      });
    }

    input.value = '';
  }

  onRemoveFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  onToggleIndicator(index: number): void {
    // Unselect all other files as indicator
    this.selectedFiles.forEach((file, i) => {
      file.indicator = (i === index) ? !file.indicator : false;
    });
  }

  async onUploadResources(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;

    try {
      const resourceDtoList = await this.convertFilesToDtoList();

      this.http.post('http://localhost:8080/api/studyflow/resources', resourceDtoList, { observe: 'response' })
        .subscribe({
          next: (response) => {
            this.isUploading = false;

            if (response.status === 201) {
              this.resourcesUploaded = true;
              this.snackBar.open('Arquivos enviados com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.cdr.detectChanges();
            }
          },
          error: (error) => {
            this.isUploading = false;
            console.error('Failed to upload resources:', error);
            this.snackBar.open('Failed to upload resources', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
    } catch (error) {
      this.isUploading = false;
      this.snackBar.open('Error reading files', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  private convertFilesToDtoList(): Promise<any[]> {
    const promises = this.selectedFiles.map((resourceFile) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const binary = Array.from(uint8Array);

          resolve({
            binary: binary,
            filetype: resourceFile.filetype,
            mime: resourceFile.mime,
            filename: resourceFile.filename,
            studyflowId: this.createdStudyflowId,
            indicator: resourceFile.indicator
          });
        };

        reader.onerror = () => reject(new Error(`Failed to read ${resourceFile.filename}`));
        reader.readAsArrayBuffer(resourceFile.file);
      });
    });

    return Promise.all(promises);
  }

  onGenerateQuestions(): void {
    if (!this.createdStudyflowId) return;

    this.isGeneratingQuestions = true;

    this.http.post<any>('http://localhost:8080/api/studyflow/generate',
      `"${this.createdStudyflowId}"`,
      { headers: { 'Content-Type': 'application/json' } })
      .subscribe({
        next: (response) => {
          if (this.createdStudyflowId != null) {
            localStorage.setItem('studyflowId', this.createdStudyflowId);
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

  getErrorMessage(field: string): string {
    const control = this.studyflowForm.get(field);
    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Must be at least ${minLength} characters`;
    }
    return '';
  }

  getFileIcon(filetype: string): string {
    const icons: { [key: string]: string } = {
      'pdf': 'picture_as_pdf',
      'docx': 'description',
      'doc': 'description',
      'pptx': 'slideshow',
      'ppt': 'slideshow',
      'xlsx': 'table_chart',
      'txt': 'text_snippet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image'
    };
    return icons[filetype.toLowerCase()] || 'insert_drive_file';
  }

  getFileColor(filetype: string): string {
    const colors: { [key: string]: string } = {
      'pdf': '#f44336',
      'docx': '#2196F3',
      'doc': '#2196F3',
      'pptx': '#FF9800',
      'ppt': '#FF9800',
      'xlsx': '#4CAF50',
      'txt': '#9E9E9E',
      'png': '#9C27B0',
      'jpg': '#9C27B0',
      'jpeg': '#9C27B0'
    };
    return colors[filetype.toLowerCase()] || '#757575';
  }
}
