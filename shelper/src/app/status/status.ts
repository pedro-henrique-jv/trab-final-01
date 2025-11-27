import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

interface IndicatorDto {
  indicatorTag: string;
  correctCount: number;
  answeredCount: number;
}

interface AnalyticsResponse {
  indicatorDtoList: IndicatorDto[];
  timeSpent: number;
}

interface IndicatorWithPercentage extends IndicatorDto {
  percentage: number;
  incorrectCount: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatProgressBarModule,
    HttpClientModule,
    MatChipsModule
  ],
  templateUrl: './status.html',
  styleUrls: ['./status.scss']
})
export class StatusComponent implements OnInit {
  analytics: AnalyticsResponse | null = null;
  isLoading = true;

  totalCorrect = 0;
  totalIncorrect = 0;
  totalAnswered = 0;
  formattedTime = '';

  sortedIndicators: IndicatorWithPercentage[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  hasAnyAnsweredQuestions(): boolean {
    if (!this.analytics) return false;

    return this.analytics.indicatorDtoList.some(
      indicator => indicator.answeredCount > 0
    );
  }

  ngOnInit(): void {
    const studyflowId = localStorage.getItem('studyflowId');

    if (!studyflowId) {
      this.router.navigate(['/home']);
      return;
    }

    this.isLoading = true;

    this.http.get<AnalyticsResponse>(
      `http://localhost:8080/api/studyflow/status`,
      { params: { studyflowId } }
    ).subscribe({
      next: (response) => {
        this.analytics = response;
        this.calculateStats();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao buscar analytics:', error);
        this.isLoading = false;
        this.router.navigate(['/home']);
      }
    });
  }

  private calculateStats(): void {
    if (!this.analytics) return;

    this.totalCorrect = this.analytics.indicatorDtoList.reduce(
      (sum, ind) => sum + ind.correctCount, 0
    );

    this.totalAnswered = this.analytics.indicatorDtoList.reduce(
      (sum, ind) => sum + ind.answeredCount, 0
    );

    this.totalIncorrect = this.totalAnswered - this.totalCorrect;

    this.formattedTime = this.formatTime(this.analytics.timeSpent);

    // Processa indicadores com porcentagem e ordena
    this.sortedIndicators = this.analytics.indicatorDtoList
      .map(ind => ({
        ...ind,
        percentage: ind.answeredCount > 0
          ? (ind.correctCount / ind.answeredCount) * 100
          : 0,
        incorrectCount: ind.answeredCount - ind.correctCount
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getPerformanceColor(percentage: number): string {
    if (percentage >= 80) return '#4CAF50'; // Verde
    if (percentage >= 60) return '#FF9800'; // Laranja
    return '#f44336'; // Vermelho
  }

  getPerformanceLabel(percentage: number): string {
    if (percentage >= 80) return 'Excelente';
    if (percentage >= 60) return 'Bom';
    if (percentage >= 40) return 'Regular';
    return 'Precisa melhorar';
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }
}
