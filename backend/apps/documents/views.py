from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (Document, DocumentActivity, DocumentTemplate,
                     DocumentType, DocumentVersion)
from .serializers import (DocumentActivitySerializer,
                          DocumentCommentSerializer, DocumentDetailSerializer,
                          DocumentListSerializer, DocumentTemplateSerializer,
                          DocumentTypeSerializer, DocumentUploadSerializer,
                          DocumentVersionSerializer)


def log_activity(document, user, action, details=None):
    DocumentActivity.objects.create(
        document=document, user=user, action=action, details=details or {}
    )


def visible_documents(user):
    qs = Document.objects.all()
    role = getattr(getattr(user, "role", None), "name", None)
    if role == "client":
        return qs.filter(is_visible_to_client=True, client__user=user)
    if role not in ("superadmin", "owner"):
        qs = qs.filter(Q(allowed_roles=[]) | Q(allowed_roles__contains=[role]))
    return qs


class DocumentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["document_type", "status", "client", "project", "deal", "created_by"]
    search_fields = ["title", "file_name"]
    ordering_fields = ["title", "created_at", "updated_at", "file_size", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return DocumentUploadSerializer if self.request.method == "POST" else DocumentListSerializer

    def get_queryset(self):
        qs = (
            visible_documents(self.request.user)
            .select_related(
                "document_type", "created_by", "client", "project", "deal", "approval_assignee"
            )
            .annotate(version_count=Count("versions"))
        )
        if self.request.query_params.get("date_from"):
            qs = qs.filter(created_at__date__gte=self.request.query_params["date_from"])
        if self.request.query_params.get("date_to"):
            qs = qs.filter(created_at__date__lte=self.request.query_params["date_to"])
        return qs

    def perform_create(self, serializer):
        if getattr(getattr(self.request.user, "role", None), "name", None) == "client":
            raise PermissionDenied("Клиенты не могут добавлять документы")
        document = serializer.save(created_by=self.request.user)
        log_activity(document, self.request.user, "created")


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self):
        return visible_documents(self.request.user).select_related(
            "document_type", "client", "project", "deal", "created_by", "approval_assignee"
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        log_activity(instance, request.user, "viewed")
        return Response(self.get_serializer(instance).data)

    def perform_update(self, serializer):
        if getattr(getattr(self.request.user, "role", None), "name", None) == "client":
            raise PermissionDenied("Клиенты не могут изменять документы")
        document = serializer.save()
        log_activity(
            document, self.request.user, "updated", {"fields": list(self.request.data.keys())}
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        role = getattr(getattr(request.user, "role", None), "name", None)
        if role == "client":
            raise PermissionDenied("Клиенты не могут удалять документы")
        if instance.is_protected and role not in ("superadmin", "owner"):
            return Response({"detail": "Документ защищён от удаления"}, status=403)
        return super().destroy(request, *args, **kwargs)


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = visible_documents(request.user).get(pk=pk)
            log_activity(doc, request.user, "downloaded")
            url = (
                doc.external_url
                if doc.source == "google_docs"
                else (doc.file.url if doc.file else None)
            )
            return Response({"url": url, "file_name": doc.file_name, "mime_type": doc.mime_type})
        except Document.DoesNotExist:
            return Response({"error": "Документ не найден"}, status=404)


class DocumentTypeListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer


class DocumentTemplateListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = DocumentTemplate.objects.select_related("document_type").all()
    serializer_class = DocumentTemplateSerializer


class DocumentVersionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = DocumentVersionSerializer

    def get_document(self):
        return visible_documents(self.request.user).get(pk=self.kwargs["pk"])

    def get_queryset(self):
        return self.get_document().versions.select_related("created_by")

    def create(self, request, *args, **kwargs):
        document = self.get_document()
        if getattr(getattr(request.user, "role", None), "name", None) == "client":
            raise PermissionDenied("Клиенты не могут добавлять версии")
        file = request.FILES.get("file")
        if not file:
            return Response({"file": "Выберите файл"}, status=400)
        latest = document.versions.order_by("-version").first()
        version = DocumentVersion.objects.create(
            document=document,
            version=(latest.version if latest else 0) + 1,
            file=file,
            file_name=file.name,
            file_size=file.size or 0,
            comment=request.data.get("comment", ""),
            created_by=request.user,
        )
        document.file = file
        document.file_name = file.name
        document.file_size = file.size or 0
        document.mime_type = file.content_type or ""
        document.source = "file"
        document.save(
            update_fields=["file", "file_name", "file_size", "mime_type", "source", "updated_at"]
        )
        log_activity(document, request.user, "version_added", {"version": version.version})
        return Response(self.get_serializer(version).data, status=201)


class DocumentCommentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentCommentSerializer

    def get_document(self):
        return visible_documents(self.request.user).get(pk=self.kwargs["pk"])

    def get_queryset(self):
        return self.get_document().comments.select_related("author")

    def perform_create(self, serializer):
        document = self.get_document()
        serializer.save(document=document, author=self.request.user)
        log_activity(document, self.request.user, "commented")


class DocumentActivityListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentActivitySerializer

    def get_queryset(self):
        document = visible_documents(self.request.user).get(pk=self.kwargs["pk"])
        return document.activities.select_related("user")
