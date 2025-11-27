import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';

interface Studyflow {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    HttpClientModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatToolbarModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  studyflows: any[] = [];
  isLoading = false;

  ngOnInit() {
    localStorage.setItem('studyflowId', "");
    const userId = localStorage.getItem('userId');
    if (userId === null){
      localStorage.clear();
      this.router.navigate(['/login']);
    }
    this.http.get('http://localhost:8080/api/studyflow', {
      params: { studentId: userId ?? '' }
    })
      .subscribe({
        next: (response) => {
          this.studyflows = [...this.mapResponseToStudyflows(response as any[])];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isLoading = false;
          this.snackBar.open(
            error.error?.message || 'Erro ao buscar os últimos flows!',
            'Fechar',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            }
          );
        }
      });
  }

  private mapResponseToStudyflows(response: any[]): Studyflow[] {
    return response.map(item => {
      const date = new Date(item.creationDate);
      const isValidDate = !isNaN(date.getTime());

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        tags: item.mainTags ?? [],
        createdAt: isValidDate ? date : new Date()
      };
    });
  }

  getAllInfo(){

  }

  constructor(private router: Router,
              private http: HttpClient,
              private snackBar: MatSnackBar,
              private cdr: ChangeDetectorRef
  ) {}

  getFirstThreeTags(tags: string[]): string[] {
    return tags.slice(0, 3);
  }

  onNewStudyflow(): void {
    this.router.navigate(['/new-studyflow']);
  }

  onConfiguration(): void {
    console.log('Navigate to configuration');
  }

  onAnalytics(): void {
    console.log('Navigate to analytics');
  }

  onLogout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  onStudyflowClick(studyflow: Studyflow): void {
    console.log('Open studyflow:', studyflow.title);
  }

  openStudyflow(studyflow: string){
    localStorage.setItem('studyflowId', studyflow);
    this.router.navigate(['/studyflow']);
  }
}
