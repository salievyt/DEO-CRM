// Who may manage surveys. Mirrors backend/apps/surveys/permissions.py.
export const SURVEY_MANAGER_ROLES = ["superadmin", "owner", "hr"] as const;

export function canManageSurveys(roleName: string | null | undefined): boolean {
  const role = (roleName || "").toLowerCase();
  return (SURVEY_MANAGER_ROLES as readonly string[]).includes(role);
}

/** Base path of the survey management section in the dashboard. */
export const SURVEYS_PATH = "/surveys";

/** Path of the public fill-in page; must match `Survey.public_url` on the backend. */
export const publicSurveyPath = (token: string) => `/survey/${token}/`;
