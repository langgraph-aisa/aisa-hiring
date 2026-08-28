export type ConfiguredQuestion = {
  fieldKey: string;
  label: string;
  hardFail?: boolean;
  acceptedAnswers?: unknown[];
  answerConfig?: { min?: number; max?: number; minMonths?: number; maxMonths?: number };
};

export type RuleResult = {
  fieldKey: string;
  passed: boolean;
  hardFail: boolean;
  reason: string;
};

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  const match = String(value ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

export function evaluateDeterministic(questions: ConfiguredQuestion[], answers: Record<string, unknown>) {
  const results: RuleResult[] = questions.map(question => {
    const value = answers[question.fieldKey];
    const accepted = (question.acceptedAnswers ?? []).map(String);
    const config = question.answerConfig ?? {};
    let passed = true;
    let reason = "Respuesta recibida";

    if (question.hardFail && accepted.length > 0) {
      passed = accepted.includes(String(value ?? "").trim());
      reason = passed ? "Coincide con una respuesta aceptada" : `No coincide con las respuestas aceptadas: ${accepted.join(", ")}`;
    }

    const numericValue = asNumber(value);
    if (passed && Number.isFinite(numericValue) && config.min !== undefined && numericValue < config.min) {
      passed = false;
      reason = `El valor es menor que el mínimo configurado (${config.min})`;
    }
    if (passed && Number.isFinite(numericValue) && config.max !== undefined && numericValue > config.max) {
      passed = false;
      reason = `El valor es mayor que el máximo configurado (${config.max})`;
    }
    if (passed && Number.isFinite(numericValue) && config.minMonths !== undefined && numericValue < config.minMonths) {
      passed = false;
      reason = `La experiencia es menor que el mínimo configurado (${config.minMonths} meses)`;
    }
    if (passed && Number.isFinite(numericValue) && config.maxMonths !== undefined && numericValue > config.maxMonths) {
      passed = false;
      reason = `La experiencia supera el máximo configurado (${config.maxMonths} meses)`;
    }

    return { fieldKey: question.fieldKey, passed, hardFail: Boolean(question.hardFail), reason };
  });

  const hardFail = results.find(result => result.hardFail && !result.passed);
  return {
    passed: !hardFail,
    results,
    hardFailReason: hardFail ? questions.find(question => question.fieldKey === hardFail.fieldKey)?.label ?? hardFail.reason : null,
  };
}
