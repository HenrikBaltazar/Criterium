import { calculateCandidateScore } from '../../backend/src/services/scoreCalculator';

export function runScoreEngineTests(): { name: string; passed: boolean; message?: string }[] {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  // Test 1: Candidate Default Composite Score is 0 pts (100% zerado por padrão)
  try {
    const score = calculateCandidateScore(null, [], [], { party: 'PT', education: 'SUPERIOR' });
    const passed = score.totalCompositeScore === 0 && score.objectiveScore === 0 && score.subjectiveScore === 0;
    results.push({
      name: 'Test 1: Candidato por padrão em modo visitante possui 0 pts (100% Zerado)',
      passed,
      message: `Score obtido por padrão: ${score.totalCompositeScore} pts`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 1: Default 0 score', passed: false, message: err.message });
  }

  // Test 2: Custom Automatic Rules Evaluation Engine
  try {
    const customSettings = {
      id: 'set-1',
      userId: 'user-1',
      presetName: 'CUSTOM',
      autoRulesJson: JSON.stringify([
        { id: 'r1', component: 'PARTY', categoryValue: 'PT', cargo: 'TODOS', points: 10 },
        { id: 'r2', component: 'EDUCATION', categoryValue: 'SUPERIOR COMPLETO', cargo: 'TODOS', points: 5 },
      ]),
      updatedAt: new Date(),
    };

    const candidateData = {
      party: 'PT',
      education: 'SUPERIOR COMPLETO',
      netWorth: 100000,
      occupation: 'ADVOGADO',
    };

    const score = calculateCandidateScore(customSettings, [], [], candidateData);
    const passed = score.objectiveScore === 15 && score.totalCompositeScore === 15;
    results.push({
      name: 'Test 2: Aplicação de Regras Automáticas de Pontuação (+15 pts calculados)',
      passed,
      message: `Score de regras automáticas obtido: ${score.totalCompositeScore} pts`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 2: Custom auto rules', passed: false, message: err.message });
  }

  // Test 3: Subjective User Evaluation Manual Points (+1 pt / -1 pt per click)
  try {
    const mockEvaluations: any[] = [
      { id: 'ev-1', userId: 'u1', candidateId: 'c1', itemType: 'PARTY', rating: 3, updatedAt: new Date() },
      { id: 'ev-2', userId: 'u1', candidateId: 'c1', itemType: 'PROPOSAL', rating: -1, updatedAt: new Date() },
    ];

    const score = calculateCandidateScore(null, mockEvaluations, []);
    const passed = score.subjectiveScore === 2 && score.totalCompositeScore === 2;
    results.push({
      name: 'Test 3: Avaliações Manuais do Eleitor (+2 pts somados no score composto)',
      passed,
      message: `Score subjetivo obtido: ${score.totalCompositeScore} pts`,
    });
  } catch (err: any) {
    results.push({ name: 'Test 3: User evaluations score', passed: false, message: err.message });
  }

  return results;
}
