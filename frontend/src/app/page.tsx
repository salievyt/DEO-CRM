import { redirect } from "next/navigation";

export default function RootPage() {
  // Этот компонент теперь не будет использоваться напрямую
  // Роутинг обрабатывается в middleware.ts
  // По умолчанию редирект на публичный сайт CRM
  redirect("/crm");
}
