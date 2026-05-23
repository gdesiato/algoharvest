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
  password = '';
  email = '';
  authLoading = true;

  user: any = null;

  difficulty: Difficulty = 'medium';

  get today(): string {

  return new Date()
    .toISOString()
    .split('T')[0];
}

  addProblem() {

    if (!this.title.trim()) {
      alert('Please enter a problem title');
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

  async ngOnInit() {

    const {
      data: { session }
    } = await supabase.auth.getSession();

    this.user = session?.user ?? null;

    this.authLoading = false;

    supabase.auth.onAuthStateChange(
      async (_event, session) => {

        this.user = session?.user ?? null;

        if (session?.user) {
          await this.problemService.loadProblemsFromSupabase();
        } else {
          this.problemService.problems.set([]);
        }
      }
    );
  }

  async signUp() {

    const { error } = await supabase.auth.signUp({
      email: this.email,
      password: this.password
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {

      await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email
        });
    }

    alert('Account created!');
  }

  async login() {

    const { error } = await supabase.auth.signInWithPassword({
      email: this.email,
      password: this.password
    });

    if (error) {
      console.error(error);
      alert(JSON.stringify(error));
      alert(error.message);
      return;
    }

    alert('Logged in!');
  }

  async logout() {

    await supabase.auth.signOut();

    this.user = null;
  }
}