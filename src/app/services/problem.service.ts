import { Injectable, computed, signal } from '@angular/core';
import { Problem, Difficulty } from '../models/problem.model';

import { supabase } from '../lib/supabase';

@Injectable({
  providedIn: 'root'
})
export class ProblemService {

  private STORAGE_KEY = 'algo-harvest-problems';

  private intervals = [1, 3, 7, 14, 30, 60];

  private async getCurrentUser() {

    const {
        data: { user }
    } = await supabase.auth.getUser();

    return user;
  }

  problems = signal<Problem[]>([]);

  dueProblems = computed(() => {
    const today = this.today();

    return this.problems().filter(
      p => p.nextReview <= today
    );
  });

  masteredCount = computed(() => {
    return this.problems().filter(
      p => p.level >= this.intervals.length - 1
    ).length;
  });

  constructor() {
    this.loadProblems();
  }

  async addProblem(title: string, difficulty: Difficulty) {

    const newProblem: Problem = {
      id: crypto.randomUUID(),

      title,

      difficulty,

      level: 0,

      nextReview: this.today(),

      reviewCount: 0,

      createdAt: this.today()
    };
    const user = await this.getCurrentUser();

    if (!user) {
    return;
    }

    const { error } = await supabase
    .from('problems')
    .insert({
        user_id: user.id,

        title: newProblem.title,

        difficulty: newProblem.difficulty,

        level: newProblem.level,

        review_count: newProblem.reviewCount,

        next_review: newProblem.nextReview,

        created_at: new Date(),

        last_reviewed: null
    });

    if (error) {
    console.error(error);
    }

    this.problems.update(problems => [
      newProblem,
      ...problems
    ]);

    this.saveProblems();
  }

  reviewProblem(
    problemId: string,
    result: 'remembered' | 'struggled' | 'forgot'
  ) {

    this.problems.update(problems =>
      problems.map(problem => {

        if (problem.id !== problemId) {
          return problem;
        }

        let newLevel = problem.level;

        if (result === 'remembered') {
          newLevel = Math.min(
            this.intervals.length - 1,
            problem.level + 1
          );
        }

        if (result === 'struggled') {
          newLevel = problem.level;
        }

        if (result === 'forgot') {
          newLevel = Math.max(0, problem.level - 1);
        }

        const nextInterval = this.intervals[newLevel];

        return {
            ...problem,

            level: newLevel,

            reviewCount: problem.reviewCount + 1,

            lastReviewed: this.today(),

            nextReview: this.addDays(nextInterval)
        };
      })
    );

    this.saveProblems();
  }

  deleteProblem(problemId: string) {

    this.problems.update(problems =>
      problems.filter(p => p.id !== problemId)
    );

    this.saveProblems();
  }

  private loadProblems() {

    const raw = localStorage.getItem(this.STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {

      const parsed = JSON.parse(raw);

      this.problems.set(parsed);

    } catch (err) {

      console.error('Failed to load problems', err);
    }
  }

  private saveProblems() {

    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this.problems())
    );
  }

  private today(): string {

    return new Date()
      .toISOString()
      .split('T')[0];
  }

  private addDays(days: number): string {

    const date = new Date();

    date.setDate(date.getDate() + days);

    return date
      .toISOString()
      .split('T')[0];
  }
}