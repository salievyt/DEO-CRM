"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileText,
  Download,
  Trash2,
  File,
  Image,
  FileArchive,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { documentsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatCurrency, timeAgo } from "@/shared/utils/formatters";
import type { Document } from "@/entities/document/types";

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

export function DocumentsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS],
    queryFn: () => documentsApi.list(),
    select: (res) => res.data?.results as Document[],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
    },
  });

  const documents = data || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Документы"
        description="Централизованное хранение документов"
        actions={
          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4" />
            Загрузить документ
          </Button>
        }
      />

      {/* Document List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="transition-all hover:shadow-md">
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
                <StatusBadge status={doc.status} />
                <span className="text-xs text-surface-400">
                  {formatFileSize(doc.file_size)}
                </span>
              </div>
              <span className="text-xs text-surface-400">
                {timeAgo(doc.created_at)}
              </span>
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
              <button
                onClick={() => {
                  if (confirm("Удалить документ?")) {
                    deleteMutation.mutate(doc.id);
                  }
                }}
                className="ml-auto flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700"
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </button>
            </div>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <EmptyState
          title="Нет документов"
          description="Загрузите первый документ"
          action={
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="h-4 w-4" />
              Загрузить документ
            </Button>
          }
        />
      )}

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Загрузить документ"
      >
        <DocumentUploadForm onCancel={() => setShowUploadModal(false)} />
      </Modal>
    </div>
  );
}

function DocumentUploadForm({ onCancel }: { onCancel: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  const { data: docTypes } = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENT_TYPES],
    queryFn: () => documentsApi.types(),
    select: (res) => res.data?.results || res.data as any[],
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => documentsApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
      onCancel();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (documentType) formData.append("document_type", documentType);
    if (clientId) formData.append("client", clientId);
    if (projectId) formData.append("project", projectId);
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          Файл
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="input mt-1"
          required
        />
      </div>
      <select
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        className="input"
      >
        <option value="">Тип документа</option>
        {(docTypes || []).map((dt: any) => (
          <option key={dt.id} value={dt.id}>
            {dt.name}
          </option>
        ))}
      </select>
      <Input
        label="ID клиента"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      />
      <Input
        label="ID проекта"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Загрузить
        </Button>
      </div>
    </form>
  );
}
