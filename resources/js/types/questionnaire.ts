export type QuestionnaireMode = 'quadrimoji' | 'open';

export type OpenQuestionType =
  | 'short_text'
  | 'long_text'
  | 'rating_1_5'
  | 'rating_1_10'
  | 'single_choice'
  | 'multi_choice';

export interface OpenQuestionOption {
  id: string;
  label: string;
  is_other?: boolean;
}

export interface OpenQuestion {
  id?: string;
  label: string;
  type: OpenQuestionType;
  options?: OpenQuestionOption[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface BranchModeEntry {
  branch_id: string;
  name: string;
  mode: QuestionnaireMode | null;
}

export interface OpenAnswer {
  question_id: string;
  type: OpenQuestionType;
  answer: string | number | string[] | null;
  other_texts?: Record<string, string>;
}
