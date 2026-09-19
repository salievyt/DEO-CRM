"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileText,
  Grid2X2,
  History,
  Image as ImageIcon,
  Link2,
  List,
  Lock,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { authApi, clientsApi, dealsApi, documentsApi, projectsApi } from "@/shared/api/base";
import type { Document } from "@/entities/document/types";

const statuses = [
  ["draft", "Черновик"],
  ["review", "На согласовании"],
  ["changes_requested", "Нужны правки"],
  ["approved", "Согласован"],
  ["signed", "Подписан"],
  ["archived", "Архив"],
];
const allowedMime = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const unwrap = (data: any) => data?.results || data || [];
const size = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
const statusName = (value: string) => statuses.find(([key]) => key === value)?.[1] || value;

function DocIcon({ mime }: { mime: string }) {
  if (mime?.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-success-500" />;
  if (mime === "application/pdf") return <FileText className="h-5 w-5 text-danger-500" />;
  return <File className="h-5 w-5 text-surface-500" />;
}

export function DocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");
  const [group, setGroup] = useState<"none" | "client" | "project">("none");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    document_type: "",
    status: "",
    client: "",
    project: "",
    created_by: "",
    date_from: "",
    date_to: "",
    ordering: "-created_at",
  });
  const queryClient = useQueryClient();

  const typesQuery = useQuery({
    queryKey: ["document-types"],
    queryFn: () => documentsApi.types(),
    select: (r) => unwrap(r.data),
  });
  const clientsQuery = useQuery({
    queryKey: ["document-clients"],
    queryFn: () => clientsApi.list({ page_size: 200 }),
    select: (r) => unwrap(r.data),
  });
  const projectsQuery = useQuery({
    queryKey: ["document-projects"],
    queryFn: () => projectsApi.list({ page_size: 200 }),
    select: (r) => unwrap(r.data),
  });
  const usersQuery = useQuery({
    queryKey: ["document-users"],
    queryFn: () => authApi.users.list({ page_size: 200 }),
    select: (r) => unwrap(r.data),
  });
  const documentsQuery = useQuery({
    queryKey: ["documents", page, filters],
    queryFn: () => documentsApi.list({ ...filters, page }),
  });
  const payload = documentsQuery.data?.data;
  const documents: Document[] = unwrap(payload);
  const count = payload?.count ?? documents.length;
  const totalPages = Math.max(1, Math.ceil(count / 20));

  const groups = useMemo(() => {
    if (group === "none") return [["Все документы", documents] as [string, Document[]]];
    const map = new Map<string, Document[]>();
    documents.forEach((doc) => {
      const key =
        group === "client" ? doc.client_name || "Без клиента" : doc.project_name || "Без проекта";
      map.set(key, [...(map.get(key) || []), doc]);
    });
    return Array.from(map.entries());
  }, [documents, group]);

  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Документы"
        description="Файлы, Google Docs, версии и согласования"
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Поиск по названию или файлу"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.document_type}
          onChange={(e) => setFilter("document_type", e.target.value)}
        >
          <option value="">Все типы</option>
          {(typesQuery.data || []).map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">Все статусы</option>
          {statuses.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.client}
          onChange={(e) => setFilter("client", e.target.value)}
        >
          <option value="">Все клиенты</option>
          {(clientsQuery.data || []).map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.full_name}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.project}
          onChange={(e) => setFilter("project", e.target.value)}
        >
          <option value="">Все проекты</option>
          {(projectsQuery.data || []).map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.created_by}
          onChange={(e) => setFilter("created_by", e.target.value)}
        >
          <option value="">Все авторы</option>
          {(usersQuery.data || []).map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.full_name || item.email}
            </option>
          ))}
        </select>
        <input
          className="input w-auto"
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilter("date_from", e.target.value)}
          title="Дата от"
        />
        <input
          className="input w-auto"
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilter("date_to", e.target.value)}
          title="Дата до"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-surface-200 py-3 dark:border-surface-700">
        <span className="text-sm text-surface-500">Найдено: {count}</span>
        <div className="flex items-center gap-2">
          <select
            className="input w-auto"
            value={group}
            onChange={(e) => setGroup(e.target.value as any)}
          >
            <option value="none">Без группировки</option>
            <option value="client">По клиентам</option>
            <option value="project">По проектам</option>
          </select>
          <select
            className="input w-auto"
            value={filters.ordering}
            onChange={(e) => setFilter("ordering", e.target.value)}
          >
            <option value="-created_at">Сначала новые</option>
            <option value="created_at">Сначала старые</option>
            <option value="title">По названию</option>
            <option value="-file_size">По размеру</option>
          </select>
          <div className="flex border border-surface-200 dark:border-surface-700">
            <button
              className={`p-2 ${view === "table" ? "bg-surface-100 dark:bg-surface-700" : ""}`}
              onClick={() => setView("table")}
              title="Таблица"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              className={`p-2 ${view === "cards" ? "bg-surface-100 dark:bg-surface-700" : ""}`}
              onClick={() => setView("cards")}
              title="Карточки"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {documentsQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="Документы не найдены"
          description="Измените фильтры или добавьте документ"
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          }
        />
      ) : (
        groups.map(([name, items]) => (
          <section key={name} className="space-y-2">
            {group !== "none" && (
              <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                {name} <span className="font-normal text-surface-400">({items.length})</span>
              </h2>
            )}
            {view === "table" ? (
              <DocumentTable
                documents={items}
                onOpen={setSelected}
                onDelete={(doc) =>
                  !doc.is_protected && confirm("Удалить документ?") && remove.mutate(doc.id)
                }
              />
            ) : (
              <DocumentCards
                documents={items}
                onOpen={setSelected}
                onDelete={(doc) =>
                  !doc.is_protected && confirm("Удалить документ?") && remove.mutate(doc.id)
                }
              />
            )}
          </section>
        ))
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-surface-500">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Добавить документы">
        <UploadForm
          types={typesQuery.data || []}
          clients={clientsQuery.data || []}
          projects={projectsQuery.data || []}
          onDone={() => {
            setUploadOpen(false);
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }}
        />
      </Modal>
      {selected && (
        <DocumentPanel
          document={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }}
        />
      )}
    </div>
  );
}

function DocumentTable({
  documents,
  onOpen,
  onDelete,
}: {
  documents: Document[];
  onOpen: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}) {
  return (
    <div className="overflow-x-auto border-y border-surface-200 dark:border-surface-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-50 text-xs text-surface-500 dark:bg-surface-800">
          <tr>
            <th className="px-3 py-2">Документ</th>
            <th className="px-3 py-2">Связь</th>
            <th className="px-3 py-2">Статус</th>
            <th className="px-3 py-2">Версии</th>
            <th className="px-3 py-2">Дата</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="cursor-pointer border-t border-surface-100 hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800"
              onClick={() => onOpen(doc)}
            >
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <DocIcon mime={doc.mime_type} />
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-surface-400">
                      {doc.source === "google_docs"
                        ? "Google Docs"
                        : `${doc.file_name} · ${size(doc.file_size)}`}
                    </p>
                  </div>
                  {doc.is_protected && <Lock className="h-3.5 w-3.5 text-surface-400" />}
                </div>
              </td>
              <td className="px-3 py-3 text-surface-500">
                {doc.project_name || doc.client_name || doc.deal_name || "—"}
              </td>
              <td className="px-3 py-3">
                <span className="text-xs font-medium">{statusName(doc.status)}</span>
              </td>
              <td className="px-3 py-3 text-surface-500">{doc.version_count || 0}</td>
              <td className="px-3 py-3 text-surface-500">
                {new Date(doc.created_at).toLocaleDateString("ru-RU")}
              </td>
              <td className="px-3 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc);
                  }}
                  disabled={doc.is_protected}
                  title={doc.is_protected ? "Защищён от удаления" : "Удалить"}
                >
                  <Trash2 className="h-4 w-4 text-danger-500 disabled:opacity-40" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentCards({
  documents,
  onOpen,
  onDelete,
}: {
  documents: Document[];
  onOpen: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="cursor-pointer" onClick={() => onOpen(doc)}>
          <div className="flex items-start gap-3">
            <DocIcon mime={doc.mime_type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                {doc.title}
              </p>
              <p className="truncate text-xs text-surface-400">
                {doc.project_name || doc.client_name || doc.file_name}
              </p>
            </div>
            {doc.is_protected && <Lock className="h-4 w-4 text-surface-400" />}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-surface-500">
            <span>{statusName(doc.status)}</span>
            <span>{doc.source === "google_docs" ? "Google Docs" : size(doc.file_size)}</span>
          </div>
          <div className="mt-3 flex justify-end border-t border-surface-100 pt-2 dark:border-surface-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc);
              }}
              disabled={doc.is_protected}
            >
              <Trash2 className="h-4 w-4 text-danger-500" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function UploadForm({ types, clients, projects, onDone }: any) {
  const [source, setSource] = useState<"file" | "google_docs">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    title: "",
    document_type: "",
    client: "",
    project: "",
    deal: "",
    external_url: "",
    status: "draft",
    is_visible_to_client: false,
    is_protected: false,
  });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const dealsQuery = useQuery({
    queryKey: ["document-deals"],
    queryFn: () => dealsApi.list({ page_size: 200 }),
    select: (r) => unwrap(r.data),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const validateFiles = (incoming: File[]) => {
    const invalid = incoming.find(
      (file) => file.size > MAX_FILE_SIZE || !allowedMime.includes(file.type)
    );
    if (invalid) return setError(`Файл ${invalid.name} не поддерживается или превышает 25 МБ`);
    setError("");
    setFiles((current) => [...current, ...incoming]);
    if (!form.title && incoming[0])
      setForm((current) => ({ ...current, title: incoming[0].name.replace(/\.[^.]+$/, "") }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const items = source === "file" ? files : [null];
      if (source === "file" && !files.length) throw new Error("Добавьте хотя бы один файл");
      for (let i = 0; i < items.length; i++) {
        const data = new FormData();
        const file = items[i];
        if (file) data.append("file", file);
        data.append("source", source);
        data.append(
          "title",
          items.length > 1 && file ? file.name.replace(/\.[^.]+$/, "") : form.title
        );
        Object.entries(form).forEach(([key, value]) => {
          if (key !== "title" && value !== "" && value !== false) data.append(key, String(value));
        });
        await documentsApi.upload(data, (value) =>
          setProgress(Math.round(((i + value / 100) / items.length) * 100))
        );
      }
      onDone();
    } catch (err: any) {
      setError(
        err?.response?.data ? JSON.stringify(err.response.data) : err.message || "Ошибка загрузки"
      );
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        <button
          type="button"
          className={`flex-1 py-2 text-sm ${source === "file" ? "border-b-2 border-brand-500 font-medium" : ""}`}
          onClick={() => setSource("file")}
        >
          <Upload className="mr-2 inline h-4 w-4" />
          Файлы
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-sm ${source === "google_docs" ? "border-b-2 border-brand-500 font-medium" : ""}`}
          onClick={() => setSource("google_docs")}
        >
          <Link2 className="mr-2 inline h-4 w-4" />
          Google Docs
        </button>
      </div>
      {source === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            validateFiles(Array.from(e.dataTransfer.files));
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed p-7 text-center ${dragging ? "border-brand-500 bg-brand-50" : "border-surface-300 dark:border-surface-600"}`}
        >
          <Upload className="mx-auto h-7 w-7 text-surface-400" />
          <p className="mt-2 text-sm">Перетащите файлы или выберите на компьютере</p>
          <p className="mt-1 text-xs text-surface-400">
            PDF, изображения, Word, Excel, ZIP · до 25 МБ
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => validateFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 && (
            <div className="mt-3 space-y-1 text-left">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    {file.name} · {size(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles(files.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Input
          label="Ссылка Google Docs"
          type="url"
          value={form.external_url}
          onChange={(e) => setForm({ ...form, external_url: e.target.value })}
          placeholder="https://docs.google.com/document/d/.../edit"
          required
        />
      )}
      <Input
        label="Название"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="input"
          value={form.document_type}
          onChange={(e) => setForm({ ...form, document_type: e.target.value })}
          required
        >
          <option value="">Тип документа</option>
          {types.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          {statuses.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={form.client}
          onChange={(e) => setForm({ ...form, client: e.target.value })}
        >
          <option value="">Без клиента</option>
          {clients.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.full_name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={form.project}
          onChange={(e) => setForm({ ...form, project: e.target.value })}
        >
          <option value="">Без проекта</option>
          {projects.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="input sm:col-span-2"
          value={form.deal}
          onChange={(e) => setForm({ ...form, deal: e.target.value })}
        >
          <option value="">Без сделки</option>
          {(dealsQuery.data || []).map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.number} · {item.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_visible_to_client}
            onChange={(e) => setForm({ ...form, is_visible_to_client: e.target.checked })}
          />
          Доступен клиенту
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_protected}
            onChange={(e) => setForm({ ...form, is_protected: e.target.checked })}
          />
          Защитить от удаления
        </label>
      </div>
      {progress > 0 && progress < 100 && (
        <div>
          <div className="h-2 overflow-hidden bg-surface-100">
            <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-surface-500">Загружено {progress}%</p>
        </div>
      )}
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit">
          <Upload className="h-4 w-4" />
          Добавить
        </Button>
      </div>
    </form>
  );
}

function DocumentPanel({
  document,
  onClose,
  onChanged,
}: {
  document: Document;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"info" | "versions" | "comments" | "activity">("info");
  const [title, setTitle] = useState(document.title);
  const [status, setStatus] = useState(document.status);
  const [comment, setComment] = useState("");
  const versions = useQuery({
    queryKey: ["document-versions", document.id],
    queryFn: () => documentsApi.versions(document.id),
    select: (r) => unwrap(r.data),
    enabled: tab === "versions",
  });
  const comments = useQuery({
    queryKey: ["document-comments", document.id],
    queryFn: () => documentsApi.comments(document.id),
    select: (r) => unwrap(r.data),
    enabled: tab === "comments",
  });
  const activity = useQuery({
    queryKey: ["document-activity", document.id],
    queryFn: () => documentsApi.activity(document.id),
    select: (r) => unwrap(r.data),
    enabled: tab === "activity",
  });
  const update = useMutation({
    mutationFn: () => documentsApi.update(document.id, { title, status }),
    onSuccess: onChanged,
  });
  const addComment = useMutation({
    mutationFn: () => documentsApi.addComment(document.id, comment),
    onSuccess: () => {
      setComment("");
      comments.refetch();
    },
  });
  const addVersion = async (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("comment", prompt("Что изменилось?") || "");
    await documentsApi.addVersion(document.id, data);
    versions.refetch();
    onChanged();
  };
  const download = async () => {
    const response = await documentsApi.download(document.id);
    if (response.data.url) window.open(response.data.url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-xl dark:bg-surface-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-200 bg-white px-5 py-4 dark:border-surface-700 dark:bg-surface-900">
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-white">{document.title}</h2>
            <p className="text-xs text-surface-500">{document.document_type_name}</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="aspect-[16/9] bg-surface-100 dark:bg-surface-800">
          {document.preview_url &&
          (document.mime_type === "application/pdf" || document.source === "google_docs") ? (
            <iframe src={document.preview_url} className="h-full w-full" title={document.title} />
          ) : document.mime_type?.startsWith("image/") ? (
            <img
              src={document.preview_url || document.file}
              alt={document.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="h-16 w-16 text-surface-300" />
            </div>
          )}
        </div>
        <div className="flex border-b border-surface-200 px-5 dark:border-surface-700">
          {(
            [
              ["info", "Реквизиты"],
              ["versions", "Версии"],
              ["comments", "Комментарии"],
              ["activity", "Журнал"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-3 text-sm ${tab === key ? "border-b-2 border-brand-500 font-medium" : "text-surface-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4 p-5">
          {tab === "info" && (
            <>
              <Input label="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {statuses.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-surface-400">Клиент</dt>
                  <dd>{document.client_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">Проект</dt>
                  <dd>{document.project_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">Сделка</dt>
                  <dd>{document.deal_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">Автор</dt>
                  <dd>{document.created_by_name || "—"}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => update.mutate()} loading={update.isPending}>
                  <ShieldCheck className="h-4 w-4" />
                  Сохранить
                </Button>
                <Button variant="secondary" onClick={download}>
                  {document.source === "google_docs" ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {document.source === "google_docs" ? "Открыть" : "Скачать"}
                </Button>
              </div>
            </>
          )}
          {tab === "versions" && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-brand-600">
                <Plus className="h-4 w-4" />
                Загрузить новую версию
                <input type="file" hidden onChange={(e) => addVersion(e.target.files?.[0])} />
              </label>
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {(versions.data || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">
                        Версия {item.version} · {item.file_name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {item.comment || "Без комментария"} · {item.created_by_name}
                      </p>
                    </div>
                    <a href={item.file} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "comments" && (
            <>
              <div className="space-y-3">
                {(comments.data || []).map((item: any) => (
                  <div key={item.id} className="border-l-2 border-brand-400 pl-3">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-surface-400">
                      {item.author_name} · {new Date(item.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
              <textarea
                className="input min-h-24"
                placeholder="Комментарий"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={() => addComment.mutate()} disabled={!comment.trim()}>
                <MessageSquare className="h-4 w-4" />
                Добавить
              </Button>
            </>
          )}
          {tab === "activity" && (
            <div className="space-y-3">
              {(activity.data || []).map((item: any) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <History className="mt-0.5 h-4 w-4 text-surface-400" />
                  <div>
                    <p>{item.action}</p>
                    <p className="text-xs text-surface-400">
                      {item.user_name} · {new Date(item.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
