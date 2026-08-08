"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  CalendarDays,
  Award,
  FileText,
  Building2,
  Star,
  ExternalLink,
  Globe,
  Download,
  Trash2,
  Upload,
  Clock,
  AlertCircle,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { Tabs } from "@/shared/ui/Tabs";
import { employeeProfileApi } from "@/shared/api/base";
import { formatDate, cn } from "@/shared/utils/formatters";

const PROFILE_TABS = [
  { value: "overview", label: "Обзор" },
  { value: "skills", label: "Навыки" },
  { value: "certificates", label: "Сертификаты" },
  { value: "files", label: "Файлы" },
];

interface EmployeeProfile {
  id: string;
  photo: string | null;
  bio: string;
  skills: string[];
  social_links: Record<string, string>;
  birth_date: string | null;
  emergency_contact: string;
  notes: string;
  certificates: Certificate[];
  user_email: string;
  user_full_name: string;
  user_first_name: string;
  user_last_name: string;
  user_phone: string;
  user_role: { id: number; name: string } | null;
  user_is_active: boolean;
  user_avatar: string | null;
  user_date_joined: string;
  teams: TeamMembership[];
}

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  file: string;
  issued_date: string | null;
  expires_date: string | null;
  description: string;
}

interface TeamMembership {
  id: string;
  name: string;
  team_type: string;
  role: string;
  position: string;
  color: string;
}

interface EmployeeStats {
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  active_projects: number;
}

const roleLabels: Record<string, string> = {
  head: "Руководитель",
  deputy: "Заместитель",
  member: "Участник",
  trainee: "Стажёр",
};

export function EmployeeProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["employee-profile", userId],
    queryFn: () => employeeProfileApi.get(userId),
    select: (res) => res.data as EmployeeProfile,
    enabled: !!userId,
  });

  const { data: stats } = useQuery({
    queryKey: ["employee-stats", userId],
    queryFn: () => employeeProfileApi.stats(userId),
    select: (res) => res.data as EmployeeStats,
    enabled: !!userId,
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-surface-500">Сотрудник не найден</p>
      </div>
    );
  }

  const initials = ((profile.user_first_name?.[0] || "") + (profile.user_last_name?.[0] || "")).toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <a
        href="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к сотрудникам
      </a>

      {/* Profile Header Card */}
      <Card className="relative overflow-hidden">
        <div className="relative px-6 pb-6 pt-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
            {/* Photo/Avatar */}
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-600 text-3xl font-semibold text-white">
              {profile.photo ? (
                <img src={profile.photo} alt={profile.user_full_name} className="h-full w-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                    {profile.user_full_name}
                  </h1>
                  <p className="mt-0.5 text-sm text-surface-500">{profile.user_email}</p>
                </div>
                <Button variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5" />
                  Редактировать
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {profile.user_role && (
                  <Badge variant="default">{profile.user_role.name}</Badge>
                )}
                <Badge variant={profile.user_is_active ? "success" : "warning"}>
                  {profile.user_is_active ? "Активен" : "Отключен"}
                </Badge>
                {profile.birth_date && (
                  <span className="flex items-center gap-1 text-xs text-surface-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(profile.birth_date)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-surface-400">
                  <Clock className="h-3.5 w-3.5" />
                  В команде с {formatDate(profile.user_date_joined)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="text-center">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total_tasks}</p>
            <p className="text-xs text-surface-500">Всего задач</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-success-600">{stats.done_tasks}</p>
            <p className="text-xs text-surface-500">Выполнено</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-danger-600">{stats.overdue_tasks}</p>
            <p className="text-xs text-surface-500">Просрочено</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-brand-600">{stats.active_projects}</p>
            <p className="text-xs text-surface-500">Проектов</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} tabs={PROFILE_TABS} />

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          {/* Left column: bio, contacts, teams */}
          <div className="space-y-4">
            {/* Bio */}
            <Card>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
                <FileText className="h-4 w-4" />
                О сотруднике
              </h3>
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
                {profile.bio || "Нет информации"}
              </p>
              {profile.notes && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {profile.notes}
                </div>
              )}
            </Card>

            {/* Teams */}
            {profile.teams && profile.teams.length > 0 && (
              <Card>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
                  <Building2 className="h-4 w-4" />
                  Команды и подразделения
                </h3>
                <div className="mt-3 space-y-2">
                  {profile.teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-3 rounded-lg border border-surface-100 p-3 dark:border-surface-700">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: team.color + "20" }}
                      >
                        <Building2 className="h-4 w-4" style={{ color: team.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">
                          {team.name}
                        </p>
                        {team.position && (
                          <p className="text-xs text-surface-500">{team.position}</p>
                        )}
                      </div>
                      <Badge variant="default">
                        {roleLabels[team.role] || team.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right column: contacts, skills */}
          <div className="space-y-4">
            {/* Contacts */}
            <Card>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
                <Mail className="h-4 w-4" />
                Контакты
              </h3>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-4 w-4 text-surface-400" />
                  <a href={`mailto:${profile.user_email}`} className="text-brand-600 hover:underline">
                    {profile.user_email}
                  </a>
                </div>
                {profile.user_phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="h-4 w-4 text-surface-400" />
                    <a href={`tel:${profile.user_phone}`} className="text-surface-700 dark:text-surface-200 hover:underline">
                      {profile.user_phone}
                    </a>
                  </div>
                )}
                {profile.emergency_contact && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-surface-500">
                      Экстренный: {profile.emergency_contact}
                    </span>
                  </div>
                )}
              </div>

              {/* Social links */}
              {Object.keys(profile.social_links || {}).length > 0 && (
                <div className="mt-3 space-y-2 border-t border-surface-100 pt-3 dark:border-surface-700">
                  {Object.entries(profile.social_links).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2.5 text-sm">
                      <Globe className="h-4 w-4 text-surface-400" />
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
                        {key}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Skills Preview */}
            {profile.skills && profile.skills.length > 0 && (
              <Card>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
                  <Star className="h-4 w-4" />
                  Ключевые навыки
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.skills.slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="default" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {profile.skills.length > 8 && (
                    <Badge variant="default" className="text-xs">
                      +{profile.skills.length - 8}
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === "skills" && (
        <SkillsTab skills={profile.skills} />
      )}

      {/* Certificates Tab */}
      {activeTab === "certificates" && (
        <CertificatesTab certificates={profile.certificates} userId={userId} />
      )}

      {/* Files Tab */}
      {activeTab === "files" && (
        <FilesTab />
      )}
    </div>
  );
}

// ---- Skills Tab ----

function SkillsTab({ skills }: { skills: string[] }) {
  const grouped = skills.reduce<Record<string, string[]>>((acc, skill) => {
    const category = skill.split(":")[0]?.trim() || "Общие";
    const name = skill.includes(":") ? skill.split(":")[1]?.trim() : skill;
    if (!acc[category]) acc[category] = [];
    acc[category].push(name);
    return acc;
  }, {});

  if (skills.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-8 text-center">
          <Star className="mb-2 h-8 w-8 text-surface-300" />
          <p className="text-sm text-surface-500">Навыки не добавлены</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
            <Star className="h-4 w-4 text-amber-500" />
            {category}
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {items.map((skill) => (
              <Badge key={skill} variant="default" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---- Certificates Tab ----

function FilesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200 mb-4">
          <Upload className="h-4 w-4" />
          Загрузить резюме
        </h3>
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 p-8 dark:border-surface-700 dark:bg-surface-800/50">
          <Upload className="mb-3 h-10 w-10 text-surface-300" />
          <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
            Перетащите файл сюда или нажмите для выбора
          </p>
          <p className="mt-1 text-xs text-surface-400">
            PDF, DOC, DOCX — до 10 MB
          </p>
          <label className="mt-4 cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
            Выбрать файл
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
          </label>
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
            Загруженные файлы
          </h3>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <FileText className="mb-2 h-8 w-8 text-surface-300" />
          <p className="text-sm text-surface-500">Файлы не загружены</p>
        </div>
      </Card>
    </div>
  );
}

function CertificatesTab({ certificates, userId }: { certificates: Certificate[]; userId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm">
          <Upload className="h-3.5 w-3.5" />
          Загрузить сертификат
        </Button>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <Award className="mb-2 h-8 w-8 text-surface-300" />
            <p className="text-sm text-surface-500">Сертификаты не добавлены</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="transition-all hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                    {cert.title}
                  </p>
                  {cert.issuer && (
                    <p className="text-xs text-surface-500">{cert.issuer}</p>
                  )}
                </div>
              </div>

              {cert.description && (
                <p className="mt-2 text-xs text-surface-500 line-clamp-2">{cert.description}</p>
              )}

              <div className="mt-3 flex items-center gap-3 text-xs text-surface-400">
                {cert.issued_date && (
                  <span>Выдан: {formatDate(cert.issued_date)}</span>
                )}
                {cert.expires_date && (
                  <span>До: {formatDate(cert.expires_date)}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-surface-100 pt-3 dark:border-surface-700">
                <a
                  href={cert.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  <Download className="h-3 w-3" />
                  Скачать
                </a>
                <button className="ml-auto flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700">
                  <Trash2 className="h-3 w-3" />
                  Удалить
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
