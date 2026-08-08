"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Download, File, Image, FileArchive, CalendarDays } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, timeAgo } from "@/shared/utils/formatters";

const fileIconMap: Record<string, React.ReactNode> = {
  "application/pdf": <FileText className="h-5 w-5 text-danger-500" />,
  "image/jpeg": <Image className="h-5 w-5 text-success-500" />,
  "image/png": <Image className="h-5 w-5 text-success-500" />,
  "application/zip": <FileArchive className="h-5 w-5 text-warning-500" />,
};

function getFileIcon(mimeType: string) {
  return fileIconMap[mimeType] || <File className="h-5 w-5 text-surface-400" />;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface CabinetDocument {
  id: string;
  title: string;
  file: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

export function CabinetDocumentsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-documents"],
    queryFn: () => cabinetApi.documents(),
    select: (res): CabinetDocument[] => res.data?.results || (res.data as CabinetDocument[]) || [],
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const documents = data || [];

  if (documents.length === 0) {
    return <EmptyState title="Нет документов" description="У вас пока нет загруженных документов" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="transition-all hover:-translate-y-0.5">
          <div className="flex items-start gap-3">
            {getFileIcon(doc.mime_type)}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                {doc.title}
              </p>
              <p className="text-xs text-surface-500">{doc.file_name}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={doc.status === "active" ? "success" : "default"}>
                {doc.status === "active" ? "Активен" : doc.status}
              </Badge>
              <span className="text-xs text-surface-400">{formatFileSize(doc.file_size)}</span>
            </div>
            <span className="text-xs text-surface-400">{timeAgo(doc.created_at)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-surface-100 pt-3 dark:border-surface-700">
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              <Download className="h-3 w-3" />
              Скачать
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}
