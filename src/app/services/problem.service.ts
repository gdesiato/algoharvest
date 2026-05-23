import { Injectable, computed, signal } from '@angular/core';
import { Problem, Difficulty } from '../models/problem.model';

import { supabase } from '../lib/supabase';

@Injectable({
  providedIn: 'root'
})
export class ProblemService {

  private STORAGE_KEY = 'algo-harvest-problems';

  private intervals = [1, 3, 7, 14, 30, 60];

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
    this.initialize();
  }

  private async initialize() {

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.user) {
      await this.loadProblemsFromSupabase();
    } else {
      this.loadProblemsFromLocalStorage();
    }
  }

  private async getCurrentUser() {

    return {
      id: 'dev-user'
    };
  }

  async loadProblemsFromSupabase() {

    const user = await this.getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    this.problems.set(
      data.map(p => ({
        id: p.id,

        title: p.title,

        difficulty: p.difficulty,

        level: p.level,

        reviewCount: p.review_count,

        nextReview: p.next_review,

        createdAt: p.created_at,

        lastReviewed: p.last_reviewed
      }))
    );
  }

  async addProblem(title: string, difficulty: Difficulty) {

    const user = await this.getCurrentUser();

    const newProblem = {
      title,

      difficulty,

      level: 0,

      review_count: 0,

      next_review: this.today(),

      created_at: new Date(),

      last_reviewed: null
    };

    // Logged user -> Supabase
    if (user) {

      const { data, error } = await supabase
        .from('problems')
        .insert({
          user_id: user.id,
          ...newProblem
        })

        .select()
        .single();

      console.log(data);
      console.log(error);

      if (error) {
        console.error(error);
        return;
      }

      this.problems.update(problems => [
        {
          id: data.id,

          title: data.title,

          difficulty: data.difficulty,

          level: data.level,

          reviewCount: data.review_count,

          nextReview: data.next_review,

          createdAt: data.created_at,

          lastReviewed: data.last_reviewed
        },
        ...problems
      ]);

      return;
    }

    // Guest user -> localStorage
    const localProblem: Problem = {
      id: crypto.randomUUID(),

      title,

      difficulty,

      level: 0,

      nextReview: this.today(),

      reviewCount: 0,

      createdAt: this.today()
    };

    this.problems.update(problems => [
      localProblem,
      ...problems
    ]);

    this.saveProblemsToLocalStorage();
  }

  async reviewProblem(
    problemId: string,
    result: 'remembered' | 'struggled' | 'forgot'
  ) {

    const current = this.problems().find(
      p => p.id === problemId
    );

    if (!current) {
      return;
    }

    let newLevel = current.level;

    if (result === 'remembered') {
      newLevel = Math.min(
        this.intervals.length - 1,
        current.level + 1
      );
    }

    if (result === 'forgot') {
      newLevel = Math.max(
        0,
        current.level - 1
      );
    }

    const updatedProblem = {
      ...current,

      level: newLevel,

      reviewCount: current.reviewCount + 1,

      lastReviewed: this.today(),

      nextReview: this.addDays(
        this.intervals[newLevel]
      )
    };

    this.problems.update(problems =>
      problems.map(p =>
        p.id === problemId
          ? updatedProblem
          : p
      )
    );

    const user = await this.getCurrentUser();

    if (user) {

      const { error } = await supabase
        .from('problems')
        .update({
          level: updatedProblem.level,

          review_count: updatedProblem.reviewCount,

          last_reviewed: updatedProblem.lastReviewed,

          next_review: updatedProblem.nextReview
        })
        .eq('id', problemId);

      if (error) {
        console.error(error);
      }

    } else {

      this.saveProblemsToLocalStorage();
    }
  }

  async deleteProblem(problemId: string) {

    this.problems.update(problems =>
      problems.filter(
        p => p.id !== problemId
      )
    );

    const user = await this.getCurrentUser();

    if (user) {

      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId);

      if (error) {
        console.error(error);
      }

    } else {

      this.saveProblemsToLocalStorage();
    }
  }

  private loadProblemsFromLocalStorage() {

    const raw = localStorage.getItem(
      this.STORAGE_KEY
    );

    if (!raw) {
      return;
    }

    try {

      const parsed = JSON.parse(raw);

      this.problems.set(parsed);

    } catch (err) {

      console.error(
        'Failed to load problems',
        err
      );
    }
  }

  private saveProblemsToLocalStorage() {

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

    date.setDate(
      date.getDate() + days
    );

    return date
      .toISOString()
      .split('T')[0];
  }
}