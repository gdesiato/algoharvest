export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
  id: string;

  title: string;

  difficulty: Difficulty;

  level: number;

  nextReview: string;

  reviewCount: number;

  createdAt: string;
}