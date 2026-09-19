import { redirect } from "next/navigation";

export default function LegacyFormPage({ params }: { params: { token: string } }) {
  redirect(`/forms/${params.token}`);
}
