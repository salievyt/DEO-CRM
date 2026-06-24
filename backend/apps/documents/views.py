from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, DocumentTemplate, DocumentType
from .serializers import (
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentTemplateSerializer,
    DocumentTypeSerializer,
    DocumentUploadSerializer,
)


class DocumentListCreateView(generics.ListCreateAPIView):
    """List or upload documents."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["document_type", "status"]
    search_fields = ["title", "file_name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DocumentUploadSerializer
        return DocumentListSerializer

    def get_queryset(self):
        qs = Document.objects.select_related(
            "document_type", "created_by"
        ).all()
        project = self.request.query_params.get("project")
        client = self.request.query_params.get("client")
        if project:
            qs = qs.filter(project_id=project)
        if client:
            qs = qs.filter(client_id=client)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a document."""
    permission_classes = [IsAuthenticated]
    queryset = Document.objects.select_related("document_type").all()
    serializer_class = DocumentDetailSerializer


class DocumentDownloadView(APIView):
    """Get download URL for a document."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
            return Response({
                "url": doc.file.url if doc.file else None,
                "file_name": doc.file_name,
                "mime_type": doc.mime_type,
            })
        except Document.DoesNotExist:
            return Response({"error": "Документ не найден"}, status=404)


class DocumentTypeListView(generics.ListAPIView):
    """List document types."""
    permission_classes = [IsAuthenticated]
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer


class DocumentTemplateListView(generics.ListAPIView):
    """List document templates."""
    permission_classes = [IsAuthenticated]
    queryset = DocumentTemplate.objects.select_related("document_type").all()
    serializer_class = DocumentTemplateSerializer
