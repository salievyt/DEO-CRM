"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  Send,
  Copy,
  Check,
  ExternalLink,
  Star,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, formatCurrency, cn } from "@/shared/utils/formatters";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
};

interface Milestone {
  id: string;
  name: string;
  status: string;
  order: number;
  due_date: string;
  completed_date: string | null;
  rejection_reason: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status_name: string;
  status_color: string;
  progress: number;
  budget: number | null;
  deadline: string;
  milestones: Milestone[];
  tasks: any[];
  feedback: any[];
}

interface Project {
  id: string;
  name: string;
  status_name: string;
  status_color: string;
  progress: number;
  deadline: string;
  milestones: { total: number; completed: number; pending: number };
}

export function CabinetPage() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["cabinet-dashboard"],
    queryFn: () => cabinetApi.dashboard(),
    select: (res) => res.data,
  });

  const { data: projects } = useQuery({
    queryKey: ["cabinet-projects"],
    queryFn: () => cabinetApi.projects(),
    select: (res) => res.data as Project[],
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["cabinet-project", selectedProject],
    queryFn: () => cabinetApi.projectDetail(selectedProject!),
    select: (res) => res.data as ProjectDetail,
    enabled: !!selectedProject,
  });

  const { data: shareLink } = useQuery({
    queryKey: ["cabinet-share-link", selectedProject],
    queryFn: () => cabinetApi.shareLink.get(selectedProject!),
    select: (res) => res.data,
    enabled: !!selectedProject,
  });

  const approveMilestone = useMutation({
    mutationFn: (milestoneId: string) =>
      cabinetApi.milestones.approve(selectedProject!, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-project", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["cabinet-projects"] });
    },
  });

  const rejectMilestone = useMutation({
    mutationFn: ({ milestoneId, reason }: { milestoneId: string; reason: string }) =>
      cabinetApi.milestones.reject(selectedProject!, milestoneId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-project", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["cabinet-projects"] });
    },
  });

  const submitFeedback = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      cabinetApi.feedback.create(selectedProject!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-project", selectedProject] });
      setFeedbackText("");
      setFeedbackRating(0);
    },
  });

  const generateShareLink = useMutation({
    mutationFn: () => cabinetApi.shareLink.create(selectedProject!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-share-link", selectedProject] });
    },
  });

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (dashLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мой кабинет"
        description="Личный кабинет клиента — управление проектами"
      />

      {/* Stats with Approval Count */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <FolderKanban className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.active_projects || 0}
          </p>
          <p className="text-sm text-surface-500">Активные проекты</p>
        </Card>
        <Card>
          <Activity className="h-5 w-5 text-yellow-600" />
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.pending_approvals || 0}
          </p>
          <p className="text-sm text-surface-500">Ожидают согласования</p>
        </Card>
        <Card>
          <FileText className="h-5 w-5 text-purple-600" />
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.total_documents || 0}
          </p>
          <p className="text-sm text-surface-500">Документы</p>
        </Card>
        <Card>
          <DollarSign className="h-5 w-5 text-warning-600" />
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.open_invoices || 0}
          </p>
          <p className="text-sm text-surface-500">Открытые счета</p>
        </Card>
        <Card>
          <MessageSquare className="h-5 w-5 text-success-600" />
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.unread_messages || 0}
          </p>
          <p className="text-sm text-surface-500">Непрочитанные</p>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(projects || []).map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={cn(
              "card text-left transition-all hover:shadow-md hover:-translate-y-0.5",
              selectedProject === project.id && "ring-2 ring-brand-500"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-white">
                  {project.name}
                </h3>
                <StatusBadge status={project.status_name} />
              </div>
            </div>

            {/* Progress with milestone info */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                <span>Прогресс</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700">
                <div
                  className="h-2 rounded-full bg-brand-600 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {/* Milestone badges */}
            {project.milestones && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  {project.milestones.completed}/{project.milestones.total}
                </span>
                {project.milestones.pending > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-3 w-3" />
                    {project.milestones.pending} на согласовании
                  </span>
                )}
              </div>
            )}

            {project.deadline && (
              <div className="mt-2 flex items-center gap-1 text-xs text-surface-500">
                <Clock className="h-3 w-3" />
                Срок: {formatDate(project.deadline)}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Project Detail Panel */}
      {selectedProject && projectDetail && (
        <div className="space-y-6">
          {/* Project Header */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                  {projectDetail.name}
                </h2>
                <p className="mt-1 text-sm text-surface-500">
                  {projectDetail.description || "Нет описания"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {projectDetail.budget && (
                  <Badge variant="outline">
                    Бюджет: {formatCurrency(projectDetail.budget)}
                  </Badge>
                )}
                <StatusBadge status={projectDetail.status_name} />
              </div>
            </div>

            {/* Large Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-surface-700 dark:text-surface-200">
                  Общий прогресс
                </span>
                <span className="text-2xl font-bold text-brand-600">
                  {projectDetail.progress}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-200 dark:bg-surface-700">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                  style={{ width: `${projectDetail.progress}%` }}
                />
              </div>
            </div>

            {projectDetail.deadline && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-surface-500">
                <Clock className="h-4 w-4" />
                Срок сдачи: {formatDate(projectDetail.deadline)}
              </div>
            )}
          </Card>

          {/* Live Progress — Timeline / Gantt */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
              <Activity className="h-4 w-4" />
              Прогресс по этапам
            </h3>

            {projectDetail.milestones && projectDetail.milestones.length > 0 ? (
              <div className="space-y-0">
                {projectDetail.milestones.map((ms, idx) => (
                  <div key={ms.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2",
                          ms.status === "approved"
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : ms.status === "rejected"
                              ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                              : ms.status === "pending"
                                ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        )}
                      >
                        {ms.status === "approved" ? "✓" : ms.status === "rejected" ? "✗" : idx + 1}
                      </div>
                      {idx < projectDetail.milestones.length - 1 && (
                        <div className="h-full w-0.5 bg-surface-200 dark:bg-surface-700" />
                      )}
                    </div>

                    {/* Milestone content */}
                    <div className="flex-1 pb-6">
                      <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-surface-900 dark:text-white">
                              {ms.name}
                            </h4>
                            <span
                              className={cn(
                                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                                STATUS_COLORS[ms.status] || ""
                              )}
                            >
                              {ms.status === "pending" && "Ожидает согласования"}
                              {ms.status === "approved" && "✅ Согласован"}
                              {ms.status === "rejected" && "❌ Отклонен"}
                              {ms.status === "in_progress" && "🔄 В работе"}
                            </span>
                          </div>
                          <div className="text-right text-xs text-surface-500">
                            {ms.due_date && (
                              <p>Срок: {formatDate(ms.due_date)}</p>
                            )}
                            {ms.completed_date && (
                              <p className="text-green-600">
                                Завершен: {formatDate(ms.completed_date)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rejection reason */}
                        {ms.status === "rejected" && ms.rejection_reason && (
                          <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20">
                            Причина: {ms.rejection_reason}
                          </div>
                        )}

                        {/* Approval actions */}
                        {ms.status === "pending" && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => approveMilestone.mutate(ms.id)}
                              disabled={approveMilestone.isPending}
                              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Согласовать
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Причина отклонения:");
                                if (reason) rejectMilestone.mutate({ milestoneId: ms.id, reason });
                              }}
                              disabled={rejectMilestone.isPending}
                              className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Отклонить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-surface-400">
                Этапы пока не добавлены
              </p>
            )}
          </Card>

          {/* Feedback Board */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
              <MessageCircle className="h-4 w-4" />
              Оставить отзыв
            </h3>

            {/* Existing feedback */}
            {projectDetail.feedback && projectDetail.feedback.length > 0 && (
              <div className="mb-4 space-y-2">
                {projectDetail.feedback.map((f: any) => (
                  <div
                    key={f.id}
                    className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-surface-700 dark:text-surface-300">
                        {f.content}
                      </p>
                      {f.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: f.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-surface-400">
                      {formatDate(f.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* New feedback form */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFeedbackRating(rating)}
                    className="transition-colors"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        rating <= feedbackRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-surface-300 dark:text-surface-600"
                      )}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-[80px] resize-none"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Напишите ваш отзыв или замечания..."
              />
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    submitFeedback.mutate({
                      content: feedbackText,
                      rating: feedbackRating || undefined,
                      feedback_type: feedbackRating > 3 ? "approval" : "revision",
                    })
                  }
                  disabled={!feedbackText || submitFeedback.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Отправить отзыв
                </button>
              </div>
            </div>
          </Card>

          {/* Shareable Link */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
              <Share2 className="h-4 w-4" />
              Поделиться статусом проекта
            </h3>
            <p className="mb-3 text-xs text-surface-500">
              Сгенерируйте публичную ссылку для отправки заказчику. Авторизация не требуется.
            </p>

            {shareLink?.url ? (
              <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-surface-400" />
                <code className="flex-1 truncate text-xs text-surface-600 dark:text-surface-300">
                  {shareLink.url}
                </code>
                <button
                  onClick={() => handleCopyLink(shareLink.url)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <Button
                onClick={() => generateShareLink.mutate()}
                loading={generateShareLink.isPending}
                variant="secondary"
              >
                <Share2 className="h-4 w-4" />
                Сгенерировать ссылку
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* No project selected */}
      {!selectedProject && (projects || []).length > 0 && (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <FolderKanban className="mb-2 h-8 w-8 text-surface-300" />
            <p className="text-sm text-surface-500">
              Выберите проект, чтобы увидеть детальную информацию
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
