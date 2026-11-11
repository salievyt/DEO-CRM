import type { Metadata } from "next";
import { PublicSurveyPage } from "@/views/surveys/PublicSurveyPage";

// Public fill-in page. The path must match `Survey.public_url` on the backend
// (`{FORMS_PUBLIC_BASE_URL}/survey/{token}/`). Lives outside the (dashboard)
// group, so no AuthGuard and no login is required.
export const metadata: Metadata = {
  title: "Опрос",
  robots: { index: false, follow: false },
};

export default function PublicSurveyRoute({ params }: { params: { token: string } }) {
  return <PublicSurveyPage token={params.token} />;
}
