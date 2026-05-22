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
}