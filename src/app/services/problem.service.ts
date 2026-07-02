import { Injectable, computed, signal } from '@angular/core';
import { Problem, Difficulty } from '../models/problem.model';

import { supabase } from '../lib/supabase';

@Injectable({
  providedIn: 'root'
})
export class ProblemService {

  private currentUser: any = null;
  private reviewInProgress = false;

  public setCurrentUser(user: any) {

    console.log('SETTING USER', user);
    this.currentUser = user;
  }

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

    supabase.auth.onAuthStateChange(
      async (_event, session) => {

        if (session?.user) {
          await this.loadProblemsFromSupabase();
        } else {
          this.problems.set([]);
        }
      }
    );
  }

  private async initialize() {

    const {
      data: { session }
    } = await supabase.auth.getSession();

    this.currentUser = session?.user ?? null;

    if (session?.user) {
      await this.loadProblemsFromSupabase();
    } else {
      this.problems.set([]);
    }
  }

  async loadProblemsFromSupabase() {

    console.log('LOAD START');

    const user = await this.getCurrentUser();

    console.log('LOAD USER', user);

    if (!user) {
      console.log('NO USER');
      return;
    }

    console.log('BEFORE SELECT');

    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('AFTER SELECT');

    console.log('LOAD DATA', data);

    if (data) {

      const validAnagram = data.find(
        p => p.title === 'Valid Anagram'
      );

      console.log(
        'VALID ANAGRAM FROM DB',
        validAnagram
      );
    }

    console.log('LOAD ERROR', error);

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

    console.log(
      'PROBLEMS UPDATED',
      this.problems().length
    );
  }

  async addProblem(title: string, difficulty: Difficulty) {

    console.log('ADD START');

    const normalizedTitle = title.trim().toLowerCase();

    const alreadyExists = this.problems().some(
      p => p.title.trim().toLowerCase() === normalizedTitle
    );

    console.log('ALREADY EXISTS', alreadyExists);

    if (alreadyExists) {
      alert('Problem already added');
      return;
    }

    const user = await this.getCurrentUser();

    console.log('ADD USER', user);

    const newProblem = {
      title: title.trim(),

      difficulty,

      level: 0,

      review_count: 0,

      next_review: this.addDays(1),

      created_at: new Date(),

      last_reviewed: null
    };

    console.log('NEW PROBLEM', newProblem);

    // Logged user -> Supabase
    if (user) {

      console.log('BEFORE INSERT');

      try {

        const result = await Promise.race([

          supabase
            .from('problems')
            .insert({
              user_id: user.id,
              ...newProblem
            })
            .select()
            .single(),

          new Promise((_, reject) =>
            setTimeout(
              () => reject('INSERT TIMEOUT'),
              5000
            )
          )

        ]);

        console.log('AFTER INSERT', result);

      } catch (e) {

        console.error('INSERT FAILED', e);
        return;
      }

      console.log('BEFORE RELOAD');

      await this.loadProblemsFromSupabase();

      console.log('AFTER RELOAD');

      return;
    }

    console.log('NO USER');
  }

  async reviewProblem(
    problemId: string,
    result: 'remembered' | 'struggled' | 'forgot'
  ) {

    console.log('REVIEW CLICKED', problemId, result);

    if (this.reviewInProgress) {
      console.log('REVIEW ALREADY RUNNING');
      return;
    }

    this.reviewInProgress = true;

    console.log('REVIEW LOCK ACQUIRED');

    try {

      const current = this.problems().find(
        p => p.id === problemId
      );

      console.log('CURRENT', current);

      if (!current) {
        console.log('CURRENT IS NULL');
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

      const user = await this.getCurrentUser();

      console.log('USER', user);

      if (user) {

        console.log('UPDATED PROBLEM', updatedProblem);

        console.log('BEFORE UPDATE');

        console.log('STARTING UPDATE REQUEST');

        console.log('PROBLEM ID TYPE', typeof problemId);
        console.log('PROBLEM ID VALUE', problemId);

        console.log('BEFORE QUERY TIMESTAMP', Date.now());

        
        let error = null;

        try {

          console.log('BEFORE QUERY TIMESTAMP', Date.now());

          const result = await supabase
            .from('problems')
            .update({
              level: updatedProblem.level,
              review_count: updatedProblem.reviewCount,
              last_reviewed: updatedProblem.lastReviewed,
              next_review: updatedProblem.nextReview
            })
            .eq('id', problemId);

          console.log('AFTER QUERY TIMESTAMP', Date.now());

          console.log('UPDATE REQUEST FINISHED');

          console.log('FULL RESULT', result);

          error = result.error;

        } catch (e) {

          console.error('UPDATE THREW EXCEPTION', e);

          return;

        }

        console.log('AFTER UPDATE', error);


        if (error) {
          console.error(error);
          return;
        }

        console.log('BEFORE RELOAD');

        await this.loadProblemsFromSupabase();

        console.log('AFTER RELOAD');
      }

    } finally {

      this.reviewInProgress = false;
      console.log('REVIEW LOCK RELEASED');
    }
  }

  async deleteProblem(problemId: string) {

    const user = await this.getCurrentUser();

    if (user) {

      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId);

      if (error) {
        console.error(error);
        return;
      }

      await this.loadProblemsFromSupabase();
    }
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

  private async getCurrentUser() {

    console.log('CURRENT USER', this.currentUser);
    return this.currentUser;
  }

}