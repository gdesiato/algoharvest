import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProblemService } from './services/problem.service';
import { Difficulty } from './models/problem.model';

import { supabase } from './lib/supabase';

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

  email = '';

  user: any = null;

  today = new Date()
    .toISOString()
    .split('T')[0];

  async ngOnInit() {

    const {
      data: { session }
    } = await supabase.auth.getSession();

    this.user = session?.user ?? null;

    supabase.auth.onAuthStateChange(
      (_event, session) => {

        this.user = session?.user ?? null;
      }
    );
  }

  async login() {

    const { error } = await supabase.auth.signInWithOtp({
      email: this.email
    });

    if (error) {
      console.error(error);
      return;
    }

    alert('Magic link sent!');
  }

  async logout() {

    await supabase.auth.signOut();

    this.user = null;
  }

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