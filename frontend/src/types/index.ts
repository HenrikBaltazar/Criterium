export interface ElectionYear {
  id: string;
  year: number;
  label: string;
  description?: string;
  status: 'UPCOMING' | 'ACTIVE' | 'PAST';
}

export interface Cargo {
  id: string;
  code: string;
  name: string;
  scope: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';
}

export interface LegislativeStat {
  id: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  projectsPresented: number;
  projectsApproved: number;
  approvalRate: number;
  publicSpending: number;
  spendingLimit: number;
  fiscalSavingsRate: number;
  sourceUrl?: string;
}

export interface JudicialRecord {
  id: string;
  title: string;
  description: string;
  status: 'CONVICTED' | 'UNDER_INVESTIGATION' | 'ACQUITTED' | 'DISMISSED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  processNumber?: string;
  court?: string;
  sourceUrl?: string;
}

export interface Proposal {
  id: string;
  category: string;
  title: string;
  description: string;
  sourceUrl?: string;
}

export interface CareerItem {
  id: string;
  period: string;
  role: string;
  party: string;
  description?: string;
}

export interface Controversy {
  id: string;
  title: string;
  summary: string;
  date?: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceUrl?: string;
}

export interface ScoreBreakdown {
  objectiveScore: number;
  subjectiveScore: number;
  totalCompositeScore: number; // Open points scale (can be negative or positive)
  experienceTag: 'OUTSIDER' | 'EXPERIENTE' | 'INTERMEDIATE';
  yearsInPolitics: number;
  details: {
    userEvaluationsPts: number;
    autoRuleItems?: any[];
  };
}

export interface PublicPerformance {
  id: string;
  candidateId: string;
  source: string;
  totalSessions: number;
  attendedSessions: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  attendanceRate: number;
  sourceUrl?: string;
}

export interface UserEvaluation {
  id?: string;
  candidateId: string;
  itemType: 'PROPOSAL' | 'CAREER' | 'CONTROVERSY' | 'GENERAL' | 'AUTO_OVERRIDE' | 'PARTY' | 'OCCUPATION' | 'EDUCATION' | 'ASSETS' | 'VICE' | 'EXPERIENCE' | 'PERFORMANCE' | 'ANNOTATION';
  itemId?: string;
  rating: number; // Scale from -5 to +5
  comment?: string;
  createdAt?: string;
}

export interface CandidateAnnotation {
  id: string;
  userId?: string;
  candidateId: string;
  title: string;
  description: string;
  eventDate?: string;
  sourceUrl?: string;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Candidate {
  id: string;
  sqCandidato?: string;
  electionYearId: string;
  cargoId: string;
  name: string;
  popularName: string;
  party: string;
  partyNumber: number;
  candidateNumber: number;
  state: string;
  city?: string;
  photoUrl?: string;
  netWorth: number;
  education: string;
  occupation?: string;
  status: string;
  summary: string;
  biography?: string;
  socialLinks?: string;
  assetsJson?: string;
  vicesJson?: string;
  priorElectionsJson?: string;
  proposalsJson?: string;
  academicHistoryJson?: string;
  infoSourceUrl?: string;
  birthDate?: string;
  gender?: string;
  genderIdentity?: string;
  cpf?: string;
  sexualOrientation?: string;
  race?: string;
  isQuilombola?: string;
  maritalStatus?: string;
  nationality?: string;
  coalitionComposition?: string;
  spendingLimitCampaign?: string;
  createdAt?: string;
  updatedAt?: string;
  electionYear?: ElectionYear;
  cargo?: Cargo;
  proposals?: Proposal[];
  careerItems?: CareerItem[];
  controversies?: Controversy[];
  userEvaluations?: UserEvaluation[];
  publicPerformance?: PublicPerformance;
  annotations?: CandidateAnnotation[];
  score: ScoreBreakdown;
  rank?: number;
}

export interface AutoScoreRule {
  id: string;
  component: 'PARTY' | 'EDUCATION' | 'ASSETS' | 'OCCUPATION' | 'EXPERIENCE' | 'PERFORMANCE';
  categoryValue?: string;
  minValue?: number;
  maxValue?: number;
  cargo?: string;
  points: number;
}

export interface UserSettings {
  id?: string;
  presetName: string;
  autoRulesJson?: string;
  isGuest?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
