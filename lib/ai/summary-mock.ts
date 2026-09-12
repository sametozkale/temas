export function mockApplicantSummary(input: {
  applicant: string;
  answers: Record<string, unknown>;
}) {
  const blob = JSON.stringify(input.answers).toLowerCase();
  let score = 3;
  if (/\b(income|salary|employed|reference)\b/.test(blob)) score += 1;
  if (/\b(deposit|guarantor)\b/.test(blob)) score += 1;
  if (/\bunemployed\b|evict|\bdebt\b/.test(blob)) score -= 2;
  score = Math.min(5, Math.max(1, score));
  const riskNote =
    score <= 2
      ? "Answers look incomplete or flag a risk — review before shortlisting."
      : undefined;
  return {
    summary: `${input.applicant} applied with the submitted form answers. Score reflects ability to pay, timing and completeness of the file.`,
    score,
    riskNote,
  };
}
