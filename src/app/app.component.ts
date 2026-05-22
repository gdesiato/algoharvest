import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProblemService } from './services/problem.service';
import { Difficulty } from './models/problem.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  problemService = inject(ProblemService);

  title = '';

  difficulty: Difficulty = 'medium';

  // Temporary development user
  user = {
    id: 'dev-user',
    email: 'dev@algoharvest.local'
  };

  today = new Date()
    .toISOString()
    .split('T')[0];

  addProblem() {

    if (!this.title.trim()) {
      return;
    }

    this.problemService.addProblem(
      this.title,
      this.difficulty
    );

    this.title = '';

    this.difficulty = 'medium';
  }

  formatReviewDate(dateString: string): string {

    const today = new Date();

    const target = new Date(dateString);

    const diffMs =
      target.getTime() - today.getTime();

    const diffDays = Math.ceil(
      diffMs / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 0) {
      return 'Today';
    }

    if (diffDays === 1) {
      return 'Tomorrow';
    }

    if (diffDays < 7) {
      return `In ${diffDays} days`;
    }

    const weeks = Math.floor(diffDays / 7);

    return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
  }
}