"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  Paperclip,
  Inbox,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageCircle,
  Plus,
  UserRound,
  FileText,
  Download,
  Loader2,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { messagingApi, clientsApi, authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, timeAgo, cn, stringToColor } from "@/shared/utils/formatters";
import { useInboxSocket, type InboxSocketEvent } from "@/shared/lib/inboxSocket";
import type {
  InboxConversation,
  InboxMessage,
  WhatsAppTemplate,
  SendResult,
} from "@/entities/inbox/types";

type FilterKey = "all" | "unread" | "mine" | "whatsapp" | "closed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "unread", label: "Непрочитанные" },
  { key: "mine", label: "Мои" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "closed", label: "Закрытые" },
];

const INBOX_ROLES = ["superadmin", "owner", "project_manager", "marketer"];

export function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialConversation = searchParams.get("conversation");
  const prefillClientId = searchParams.get("client_id");

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialConversation);
  const [newModalOpen, setNewModalOpen] = useState(!!prefillClientId);
  const [pendingClientId, setPendingClientId] = useState<string | null>(prefillClientId);

  const listParams = useMemo(() => {
    const params: Record<string, unknown> = { page_size: 100 };
    if (filter === "unread") {
      params.unread = "true";
    }
    if (filter === "mine") {
      params.assigned = "me";
    }
    if (filter === "whatsapp") {
      params.channel = "whatsapp";
    }
    if (filter === "closed") {
      params.status = "closed";
    }
    if (search.trim()) {
      params.search = search.trim();
    }
    return params;
  }, [filter, search]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS, listParams],
    queryFn: () => messagingApi.conversations.list(listParams),
    select: (res): InboxConversation[] =>
      res.data?.results || (res.data as InboxConversation[]) || [],
    refetchInterval: 30000,
  });

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  // Realtime updates
  const onSocketEvent = useCallback(
    (event: InboxSocketEvent) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_UNREAD] });
      const target =
        (event.data?.conversation_id as string | undefined) || selectedId;
      if (target) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_MESSAGES, target] });
      }
    },
    [queryClient, selectedId]
  );
  useInboxSocket({ enabled: true, onEvent: onSocketEvent });

  // Reset selection if the conversation disappears from the list
  useEffect(() => {
    if (selectedId && conversations && !conversations.some((c) => c.id === selectedId)) {
      if (conversations.length > 0) {
        setSelectedId(conversations[0].id);
      } else {
        setSelectedId(null);
      }
    }
  }, [conversations, selectedId]);

  const openConversation = (id: string) => {
    setSelectedId(id);
    router.replace(`/inbox?conversation=${id}`, { scroll: false });
  };

  const openNewDialog = (clientId?: string) => {
    setPendingClientId(clientId ?? null);
    setNewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Общение с клиентами в WhatsApp и других каналах"
        actions={
          <Button variant="primary" onClick={() => openNewDialog()}>
            <Plus className="h-4 w-4" />
            Новый диалог
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-15.5rem)] min-h-[480px] gap-4">
        {/* Conversation list */}
        <Card padding="none" className="flex w-80 flex-shrink-0 flex-col lg:w-96">
          {/* Filters */}
          <div className="border-b border-surface-200 p-3 dark:border-surface-700">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск клиента или номера..."
                className="input pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                    filter === f.key
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <Inbox className="mb-3 h-10 w-10 text-surface-300" />
                <p className="text-sm text-surface-500">Диалогов пока нет</p>
                <p className="mt-1 text-xs text-surface-400">
                  Новые сообщения клиентов появятся здесь автоматически
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={conv.id === selectedId}
                  onClick={() => openConversation(conv.id)}
                />
              ))
            )}
          </div>
        </Card>

        {/* Chat pane */}
        {selected ? (
          <ChatPane
            key={selected.id}
            conversation={selected}
            onMarkRead={() =>
              queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_UNREAD] })
            }
          />
        ) : (
          <Card className="flex flex-1 flex-col items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
                <MessageCircle className="h-8 w-8 text-brand-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-300">
                Выберите диалог
              </p>
              <p className="mt-1 text-xs text-surface-400">
                Или начните новый диалог с клиентом
              </p>
            </div>
          </Card>
        )}
      </div>

      {newModalOpen && (
        <NewConversationModal
          prefillClientId={pendingClientId ?? undefined}
          onClose={() => {
            setNewModalOpen(false);
            setPendingClientId(null);
            const params = new URLSearchParams(searchParams.toString());
            params.delete("client_id");
            router.replace(`/inbox${params.toString() ? `?${params}` : ""}`, {
              scroll: false,
            });
          }}
          onCreated={(id) => openConversation(id)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- list item */
function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: InboxConversation;
  active: boolean;
  onClick: () => void;
}) {
  const isWhatsApp = conversation.channel === "whatsapp";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-surface-100 px-4 py-3 text-left transition-colors dark:border-surface-800",
        active
          ? "bg-brand-50 dark:bg-brand-900/20"
          : "hover:bg-surface-50 dark:hover:bg-surface-800/60"
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: stringToColor(conversation.contact_name) }}
        >
          {getInitialsFromName(conversation.contact_name)}
        </div>
        {isWhatsApp && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-surface-900"
            style={{ backgroundColor: "#25D366" }}
            title="WhatsApp"
          >
            <MessageCircle className="h-2 w-2 text-white" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
            {conversation.contact_name}
          </p>
          {conversation.last_message_at && (
            <span className="flex-shrink-0 text-[11px] text-surface-400">
              {timeAgo(conversation.last_message_at)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-xs",
              conversation.unread_count > 0
                ? "font-medium text-surface-800 dark:text-surface-200"
                : "text-surface-500"
            )}
          >
            {conversation.last_message_preview || "Нет сообщений"}
          </p>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {conversation.status === "closed" && (
              <Badge variant="default">закрыт</Badge>
            )}
            {conversation.unread_count > 0 && (
              <Badge variant="danger">{conversation.unread_count}</Badge>
            )}
          </div>
        </div>
        {conversation.assigned_user_name && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-surface-400">
            <UserRound className="h-3 w-3" />
            {conversation.assigned_user_name}
          </p>
        )}
      </div>
    </button>
  );
}

function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/* ------------------------------------------------------------------ chat pane */
function ChatPane({
  conversation,
  onMarkRead,
}: {
  conversation: InboxConversation;
  onMarkRead: () => void;
}) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipAutoScroll = useRef(false);
  const [text, setText] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [QUERY_KEYS.INBOX_MESSAGES, conversation.id],
    queryFn: () => messagingApi.messages.list(conversation.id, { page_size: 100 }),
    select: (res): InboxMessage[] =>
      res.data?.results || (res.data as InboxMessage[]) || [],
    refetchInterval: 15000,
  });

  // Pagination: "load earlier" uses the `before` cursor.
  const [earlierMessages, setEarlierMessages] = useState<InboxMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);

  const allMessages = useMemo(() => {
    const seen = new Set<string>();
    return [...earlierMessages, ...(messages || [])].filter((m) => {
      if (seen.has(m.id)) {
        return false;
      }
      seen.add(m.id);
      return true;
    });
  }, [earlierMessages, messages]);

  // Reset pagination only when the conversation changes (not on refetch).
  useEffect(() => {
    setEarlierMessages([]);
  }, [conversation.id]);

  useEffect(() => {
    setHasMore((messages?.length ?? 0) >= 100);
  }, [messages?.length]);

  const loadEarlier = async () => {
    const oldest = allMessages[0];
    if (!oldest || loadingEarlier) {
      return;
    }
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    skipAutoScroll.current = true;
    setLoadingEarlier(true);
    try {
      const res = await messagingApi.messages.list(conversation.id, {
        page_size: 100,
        before: oldest.created_at,
      });
      const older = (res.data?.results || []) as InboxMessage[];
      setEarlierMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !seen.has(m.id)), ...prev];
      });
      if (older.length < 100) {
        setHasMore(false);
      }
      // Preserve scroll position after prepending older messages.
      requestAnimationFrame(() => {
        const el2 = scrollRef.current;
        if (el2) {
          el2.scrollTop = el2.scrollHeight - prevHeight + prevTop;
        }
      });
    } catch {
      /* keep current messages */
    } finally {
      setLoadingEarlier(false);
    }
  };

  const { data: canSend } = useQuery({
    queryKey: [QUERY_KEYS.INBOX_CAN_SEND, conversation.id],
    queryFn: () => messagingApi.conversations.canSend(conversation.id),
    select: (res): { can_send_text: boolean; templates: WhatsAppTemplate[] } =>
      res.data,
    enabled: conversation.channel === "whatsapp",
  });

  const { data: users } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list({ page_size: 200 }),
    select: (res): { id: string; full_name: string; role_name?: string }[] =>
      res.data?.results || (res.data as { id: string; full_name: string; role_name?: string }[]) || [],
  });

  const assignableUsers = useMemo(
    () =>
      (users || []).filter((u) =>
        INBOX_ROLES.includes((u.role_name || "").toLowerCase())
      ),
    [users]
  );

  // Mark as read when opened
  const readMutation = useMutation({
    mutationFn: () => messagingApi.conversations.read(conversation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_UNREAD] });
      onMarkRead();
    },
  });
  useEffect(() => {
    if (conversation.unread_count > 0) {
      readMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread_count]);

  // Scroll to latest only when genuinely new messages arrive.
  useEffect(() => {
    if (skipAutoScroll.current) {
      skipAutoScroll.current = false;
      return;
    }
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [allMessages.length]);

  const sendMutation = useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) =>
      messagingApi.messages.send(conversation.id, payload),
    onSuccess: (res) => {
      const result = res.data as SendResult;
      if (result?.error?.template_required) {
        setTemplateModalOpen(true);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_MESSAGES, conversation.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_UNREAD] });
      if (!result?.error) {
        setText("");
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      messagingApi.conversations.assign(conversation.id, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] }),
  });

  const statusMutation = useMutation({
    mutationFn: (close: boolean) =>
      close
        ? messagingApi.conversations.close(conversation.id)
        : messagingApi.conversations.reopen(conversation.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] }),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) {
      return;
    }
    sendMutation.mutate({ text: trimmed });
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      return;
    }
    const form = new FormData();
    form.append("media", file);
    form.append("filename", file.name);
    setMediaUploading(true);
    sendMutation.mutate(form, {
      onSettled: () => setMediaUploading(false),
    });
  };

  const handleTemplate = (tpl: WhatsAppTemplate, parameters: string[]) => {
    sendMutation.mutate({
      template: { name: tpl.name, language: tpl.language, parameters },
    });
  };

  const isSending = sendMutation.isPending || mediaUploading;

  return (
    <Card padding="none" className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-5 py-3.5 dark:border-surface-700">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: stringToColor(conversation.contact_name) }}
          >
            {getInitialsFromName(conversation.contact_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-surface-900 dark:text-white">
                {conversation.contact_name}
              </p>
              {conversation.channel === "whatsapp" ? (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </span>
              ) : (
                <Badge variant="default">{conversation.channel}</Badge>
              )}
              {conversation.status === "closed" && (
                <Badge variant="default">закрыт</Badge>
              )}
            </div>
            <p className="flex items-center gap-2 truncate text-xs text-surface-500">
              <span>{conversation.contact_phone || "—"}</span>
              {conversation.company_name && (
                <span className="truncate">{conversation.company_name}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.channel === "whatsapp" &&
            canSend &&
            !canSend.can_send_text && (
              <button
                onClick={() => setTemplateModalOpen(true)}
                className="hidden items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 sm:flex dark:bg-amber-900/30 dark:text-amber-400"
                title="24-часовое окно закрыто — отправьте шаблонное сообщение"
              >
                <Clock className="h-3.5 w-3.5" />
                Шаблон
              </button>
            )}
          <select
            value={conversation.assigned_user || ""}
            onChange={(e) => {
              if (e.target.value) {
                assignMutation.mutate(e.target.value);
              }
            }}
            className="input hidden w-40 text-xs sm:block"
          >
            <option value="">Не назначен</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.id}
              </option>
            ))}
          </select>
          <a
            href={`/clients/${conversation.contact_id}`}
            className="rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            title="Карточка клиента"
          >
            <UserRound className="h-4 w-4" />
          </a>
          <button
            onClick={() => statusMutation.mutate(conversation.status !== "closed")}
            className="rounded-lg px-3 py-2 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            {conversation.status === "closed" ? "Открыть" : "Закрыть"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5 scrollbar-thin">
        {messagesLoading ? (
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-surface-400">
              {canSend && !canSend.can_send_text
                ? "Окно обслуживания закрыто. Начните с шаблонного сообщения."
                : "Напишите первое сообщение клиенту"}
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={loadEarlier}
                  disabled={loadingEarlier}
                  className="flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 disabled:opacity-50 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                >
                  {loadingEarlier ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  Загрузить ранее
                </button>
              </div>
            )}
            {allMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-surface-200 p-4 dark:border-surface-700">
        {sendMutation.isError && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-danger-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Не удалось отправить сообщение
          </p>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="rounded-lg p-2.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
            title="Прикрепить файл"
          >
            {mediaUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={
              canSend && !canSend.can_send_text
                ? "Окно закрыто — выберите шаблон..."
                : "Напишите сообщение..."
            }
            className="input max-h-32 min-h-[42px] flex-1 resize-none py-2.5"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendMutation.isPending && !mediaUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Template picker */}
      {templateModalOpen && (
        <TemplatePickerModal
          templates={canSend?.templates || []}
          onSend={handleTemplate}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- message bubble */
function MessageBubble({ message }: { message: InboxMessage }) {
  const outgoing = message.direction === "outgoing";
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  const loadMedia = async () => {
    if (mediaUrl) {
      return;
    }
    setMediaLoading(true);
    try {
      const res = await messagingApi.media(message.id);
      const blob = res.data as Blob;
      setMediaUrl(URL.createObjectURL(blob));
    } catch {
      /* media unavailable */
    } finally {
      setMediaLoading(false);
    }
  };

  const isMedia = ["image", "document", "audio", "video"].includes(message.type);
  const showStatusIcon = outgoing && !["pending"].includes(message.status);

  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm",
          outgoing
            ? "rounded-br-md bg-brand-600 text-white"
            : "rounded-bl-md bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-50"
        )}
      >
        {/* Media */}
        {isMedia && message.direction === "incoming" && !message.media_url && (
          <button
            onClick={loadMedia}
            className="mb-1.5 flex items-center gap-2 rounded-lg border border-dashed border-surface-300 px-3 py-2 text-xs transition-colors hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-700"
          >
            {mediaLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mediaUrl ? (
              <Download className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {mediaUrl ? (
              <span className="font-medium">Скачать файл</span>
            ) : (
              <span>
                {message.type === "image" ? "Открыть изображение" : "Открыть файл"}
              </span>
            )}
          </button>
        )}
        {mediaUrl && message.type === "image" && (
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="mb-1 block">
            <img
              src={mediaUrl}
              alt={message.media_name || "Изображение"}
              className="max-h-52 rounded-lg object-cover"
            />
          </a>
        )}
        {isMedia && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-xs dark:bg-black/30"
          >
            <FileText className="h-4 w-4" />
            <span className="truncate">{message.media_name || "Вложение"}</span>
          </a>
        )}

        {message.text && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.text}
          </p>
        )}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1.5 text-[11px]",
            outgoing ? "text-brand-100/80" : "text-surface-400"
          )}
        >
          <span>{formatDateTime(message.created_at, "HH:mm")}</span>
          {showStatusIcon && <StatusIcon status={message.status} />}
        </div>

        {message.status === "failed" && message.error_message && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px]",
              outgoing
                ? "bg-red-500/20 text-red-100"
                : "bg-danger-50 text-danger-600 dark:bg-red-900/30 dark:text-red-300"
            )}
            title={message.error_message}
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {message.error_code === "template_required"
              ? "Требуется шаблонное сообщение"
              : "Ошибка отправки"}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: InboxMessage["status"] }) {
  switch (status) {
    case "sent":
      return <Check className="h-3.5 w-3.5" />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5" />;
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
    case "pending":
      return <Clock className="h-3.5 w-3.5" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------ template picker */
function TemplatePickerModal({
  templates,
  onSend,
  onClose,
}: {
  templates: WhatsAppTemplate[];
  onSend: (_tpl: WhatsAppTemplate, _parameters: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<WhatsAppTemplate | null>(
    templates.find((t) => t.status === "APPROVED") || templates[0] || null
  );
  const [params, setParams] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const choose = (tpl: WhatsAppTemplate) => {
    setSelected(tpl);
    setParams(Array(tpl.parameter_count).fill(""));
  };

  const submit = () => {
    if (!selected) {
      return;
    }
    if (params.some((p) => !p.trim())) {
      return;
    }
    setSending(true);
    onSend(selected, params);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-xl border border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-700">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Шаблонное сообщение
            </h3>
            <p className="text-xs text-surface-500">
              Окно обслуживания закрыто — WhatsApp позволяет отправлять только
              одобренные шаблоны
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-4 scrollbar-thin">
          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-surface-500">
              Шаблоны не найдены. Создайте и одобрите шаблон в Meta Business
              Manager.
            </p>
          ) : (
            <div className="space-y-2">
              {templates
                .filter((t) => t.status === "APPROVED" || !selected)
                .map((tpl) => (
                  <button
                    key={`${tpl.name}-${tpl.language}`}
                    onClick={() => choose(tpl)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all",
                      selected?.name === tpl.name && selected?.language === tpl.language
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-surface-900 dark:text-white">
                        {tpl.name}
                        <span className="ml-2 text-xs font-normal text-surface-400">
                          {tpl.language}
                        </span>
                      </p>
                      {tpl.status !== "APPROVED" && (
                        <Badge variant="default">{tpl.status.toLowerCase()}</Badge>
                      )}
                    </div>
                    {tpl.body_text && (
                      <p className="mt-1 line-clamp-2 text-xs text-surface-500">
                        {tpl.body_text}
                      </p>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="space-y-3 border-t border-surface-200 px-5 py-4 dark:border-surface-700">
            {selected.parameter_count > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-surface-500">
                  Заполните параметры шаблона
                </p>
                {Array.from({ length: selected.parameter_count }).map((_, i) => (
                  <input
                    key={i}
                    value={params[i] || ""}
                    onChange={(e) =>
                      setParams((prev) =>
                        prev.map((p, idx) => (idx === i ? e.target.value : p))
                      )
                    }
                    placeholder={`Параметр ${i + 1}`}
                    className="input"
                  />
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Отмена
              </Button>
              <Button
                variant="primary"
                disabled={!selected || params.some((p) => !p.trim())}
                onClick={submit}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Отправить
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- new conversation */
function NewConversationModal({
  prefillClientId,
  onClose,
  onCreated,
}: {
  prefillClientId?: string;
  onClose: () => void;
  onCreated: (_id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    prefillClientId || null
  );
  const [channel, setChannel] = useState("whatsapp");
  const [creating, setCreating] = useState(false);

  const { data: clients } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, "inbox-search", search],
    queryFn: () => clientsApi.list({ search: search || undefined, page_size: 20 }),
    select: (res): { id: string; full_name: string; phone: string }[] =>
      res.data?.results || (res.data as { id: string; full_name: string; phone: string }[]) || [],
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId) || null;

  const createMutation = useMutation({
    mutationFn: () =>
      messagingApi.conversations.create({
        contact_id: selectedClientId,
        channel,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INBOX_CONVERSATIONS] });
      onCreated((res.data as InboxConversation).id);
    },
    onSettled: () => setCreating(false),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-xl border border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-white">
            Новый диалог
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-200">
              Клиент
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск клиента..."
                className="input pl-10"
              />
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto scrollbar-thin">
              {selectedClient && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-2 text-sm dark:bg-brand-900/20">
                  <span className="font-medium">{selectedClient.full_name}</span>
                  <span className="text-xs text-surface-500">
                    {selectedClient.phone}
                  </span>
                </div>
              )}
              {!selectedClient &&
                clients?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      setSearch(c.full_name);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-xs text-surface-400">{c.phone}</span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-200">
              Канал
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="input"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-200 px-5 py-4 dark:border-surface-700">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            disabled={!selectedClientId || creating}
            onClick={() => {
              setCreating(true);
              createMutation.mutate();
            }}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Создать диалог
          </Button>
        </div>
      </div>
    </div>
  );
}
