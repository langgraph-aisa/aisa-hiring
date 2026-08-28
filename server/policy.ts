export const applicationStatuses = ["en_revision", "calificado", "no_calificado", "entrevista_iniciada", "entrevista_en_curso", "entrevista_finalizada", "pendiente_revision_humana", "error_procesamiento"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];
export type RecruitmentRole = "user" | "reclutador" | "admin";

export function canOperateCandidates(role: RecruitmentRole) { return role === "reclutador" || role === "admin"; }
export function canManageConfiguration(role: RecruitmentRole) { return role === "admin"; }
export function shouldContinueAfterReview(status: string) { return status === "calificado"; }
export function duplicateIdentity(phoneInternational: string, positionId: number) { return `${phoneInternational}:${positionId}`; }
export function canChangeStatus(role: RecruitmentRole, nextStatus: string) { return canOperateCandidates(role) && applicationStatuses.includes(nextStatus as ApplicationStatus); }
