import { SurveyAccessGuard } from "@/features/surveys/SurveyAccessGuard";

// Survey management (/surveys/...): superadmin, owner and hr only (same rule as the backend).
export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return <SurveyAccessGuard>{children}</SurveyAccessGuard>;
}
