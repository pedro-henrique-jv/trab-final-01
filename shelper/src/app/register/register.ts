import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})

export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required],
      university: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (!this.registerForm.valid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const studentData = this.registerForm.value;

    this.http.post('http://localhost:8080/api/student', studentData, { responseType: 'text' })
      .subscribe({
        next: () => {
          Promise.resolve().then(() => {
            this.isLoading = false;

            this.snackBar.open('Registrado com sucesso!', 'Close', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['success-snackbar']
            });

            this.registerForm.reset();
            this.router.navigate(['/login']);
          });
        },

        error: (error) => {
          Promise.resolve().then(() => {
            this.isLoading = false;

            this.snackBar.open(
              error.error?.message || 'O registro falhou, tente novamente!',
              'Close',
              {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              }
            );
          });
        }
      });
  }


  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (control?.hasError('required')) {
      return `Por favor, insira um/uma ${field}`;
    }
    if (control?.hasError('email')) {
      return 'Insira um email válido';
    }
    if (control?.hasError('minlength')) {
      return 'A senha deve conter no mínimo 6 caracteres';
    }
    return '';
  }
}
