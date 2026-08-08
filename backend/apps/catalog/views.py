"""API views for the catalog app."""

import csv
import io
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F
from django_filters import rest_framework as django_filters
from rest_framework import generics, status, views
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from common.pagination import StandardPagination

from .models import CatalogCategory, CatalogItem, InventoryMovement, PriceHistory
from .permissions import (
    CanCreateCatalogItem,
    CanDeleteCatalogItem,
    CanEditCatalogItem,
    CanManageInventory,
    CanManagePrices,
    CanViewCatalog,
)
from .serializers import (
    BulkOperationSerializer,
    CatalogCategorySerializer,
    CatalogItemDetailSerializer,
    CatalogItemListSerializer,
    CatalogItemWriteSerializer,
    RestockSerializer,
)

EXPORT_HEADERS = [
    "name",
    "type",
    "category",
    "sku",
    "price",
    "cost_price",
    "tax",
    "discount",
    "stock",
    "unit",
    "status",
    "duration_minutes",
    "billing_period",
    "description",
]


class CatalogItemFilter(django_filters.FilterSet):
    stock_status = django_filters.ChoiceFilter(
        choices=[("out", "out"), ("low", "low"), ("ok", "ok")],
        method="filter_stock_status",
    )

    class Meta:
        model = CatalogItem
        fields = ["type", "status", "category", "stock_status"]

    def filter_stock_status(self, queryset, name, value):
        if value == "out":
            return queryset.filter(type=CatalogItem.TYPE_PRODUCT, stock__lte=0)
        if value == "low":
            return queryset.filter(
                type=CatalogItem.TYPE_PRODUCT,
                stock__gt=0,
                stock__lte=F("low_stock_threshold"),
            )
        return queryset.exclude(
            type=CatalogItem.TYPE_PRODUCT,
            stock__lte=F("low_stock_threshold"),
        )


class CatalogItemListCreateView(generics.ListCreateAPIView):
    """List catalog items with search / filters / ordering / pagination."""

    pagination_class = StandardPagination
    filter_backends = [
        django_filters.DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_class = CatalogItemFilter
    search_fields = ["name", "sku", "description"]
    ordering_fields = ["name", "price", "cost_price", "stock", "created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateCatalogItem()]
        return [CanViewCatalog()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CatalogItemWriteSerializer
        return CatalogItemListSerializer

    def get_queryset(self):
        return CatalogItem.objects.select_related("category").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CatalogItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve / update / delete a catalog item."""

    queryset = CatalogItem.objects.select_related("category").prefetch_related(
        "package_items", "price_history", "inventory_movements"
    )
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CatalogItemDetailSerializer
        return CatalogItemWriteSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [CanViewCatalog()]
        if self.request.method == "DELETE":
            return [CanDeleteCatalogItem()]
        return [CanEditCatalogItem()]

    def update(self, request, *args, **kwargs):
        price_keys = {"price", "cost_price", "discount", "tax"}
        wants_price_change = price_keys.intersection(request.data.keys())
        if wants_price_change and not CanManagePrices().has_permission(request, self):
            return Response(
                {"detail": "Недостаточно прав для изменения цен."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


class CatalogCategoryListCreateView(generics.ListCreateAPIView):
    """List / create catalog categories (with item counts)."""

    pagination_class = None
    permission_classes = [CanViewCatalog]
    serializer_class = CatalogCategorySerializer

    def get_queryset(self):
        return CatalogCategory.objects.annotate(item_count=Count("items")).order_by("name")

    def perform_create(self, serializer):
        self.check_permissions(self.request)
        if not CanCreateCatalogItem().has_permission(self.request, self):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Недостаточно прав для создания категорий.")
        serializer.save()


class CatalogBulkView(views.APIView):
    """Bulk operations: status / category / price / delete."""

    def post(self, request):
        serializer = BulkOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        action = data["action"]
        ids = data["ids"]

        user = request.user
        can_edit = CanEditCatalogItem().has_permission(request, self)
        can_delete = CanDeleteCatalogItem().has_permission(request, self)
        can_prices = CanManagePrices().has_permission(request, self)

        if action == "delete" and not can_delete:
            return Response(
                {"detail": "Недостаточно прав для удаления."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if action in ("change_status", "change_category") and not can_edit:
            return Response(
                {"detail": "Недостаточно прав для редактирования."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if action == "adjust_price" and not can_prices:
            return Response(
                {"detail": "Недостаточно прав для изменения цен."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = CatalogItem.objects.filter(id__in=ids)
        if action == "change_status":
            count = qs.update(status=data["status"])
        elif action == "change_category":
            count = qs.update(category_id=data["category"])
        elif action == "adjust_price":
            percent = data["percent"]
            with transaction.atomic():
                items = list(qs)
                count = len(items)
                for item in items:
                    new_price = round(item.price * (1 + percent / 100), 2)
                    if new_price != item.price:
                        PriceHistory.objects.create(
                            item=item,
                            old_price=item.price,
                            new_price=new_price,
                            changed_by=user,
                        )
                        CatalogItem.objects.filter(id=item.id).update(price=new_price)
        else:  # delete
            count, _ = qs.delete()
        return Response({"affected": count})


class CatalogRestockView(views.APIView):
    """Restock / adjust product inventory (records movement)."""

    permission_classes = [CanManageInventory]

    def post(self, request, pk):
        try:
            item = CatalogItem.objects.get(pk=pk)
        except CatalogItem.DoesNotExist:
            return Response({"error": "Позиция не найдена"}, status=404)

        if item.type != CatalogItem.TYPE_PRODUCT:
            return Response(
                {"error": "Остатки отслеживаются только для товаров."},
                status=400,
            )

        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delta = serializer.validated_data["quantity"]
        note = serializer.validated_data.get("note", "")

        with transaction.atomic():
            CatalogItem.objects.filter(id=item.id).update(stock=F("stock") + delta)
            item.refresh_from_db()
            InventoryMovement.objects.create(
                item=item,
                movement_type=InventoryMovement.TYPE_RESTOCK,
                quantity=delta,
                balance_after=item.stock,
                note=note,
                created_by=request.user,
            )
        return Response(
            {"id": str(item.id), "stock": item.stock},
            status=status.HTTP_200_OK,
        )


class CatalogExportView(views.APIView):
    """Export filtered catalog items as CSV."""

    permission_classes = [CanViewCatalog]

    def get(self, request):
        qs = CatalogItem.objects.select_related("category").all()
        item_type = request.query_params.get("type")
        status_ = request.query_params.get("status")
        category = request.query_params.get("category")
        if item_type:
            qs = qs.filter(type=item_type)
        if status_:
            qs = qs.filter(status=status_)
        if category:
            qs = qs.filter(category_id=category)

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(EXPORT_HEADERS)
        for item in qs:
            writer.writerow(
                [
                    item.name,
                    item.type,
                    item.category.name if item.category else "",
                    item.sku or "",
                    str(item.price),
                    str(item.cost_price),
                    str(item.tax),
                    str(item.discount),
                    item.stock,
                    item.unit,
                    item.status,
                    item.duration_minutes or "",
                    item.billing_period or "",
                    item.description,
                ]
            )

        from django.http import HttpResponse

        response = HttpResponse(
            "\ufeff" + buf.getvalue(),
            content_type="text/csv; charset=utf-8",
        )
        response["Content-Disposition"] = 'attachment; filename="catalog_export.csv"'
        return response


class CatalogImportView(views.APIView):
    """Import catalog items from an uploaded CSV."""

    permission_classes = [CanCreateCatalogItem]
    parser_classes = [MultiPartParser, FormParser]

    TYPE_MAP = dict(CatalogItem.TYPE_CHOICES)
    STATUS_MAP = dict(CatalogItem.STATUS_CHOICES)

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "Файл не передан."}, status=400)

        try:
            decoded = file.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception as exc:  # noqa: BLE001
            return Response({"error": f"Не удалось прочитать CSV: {exc}"}, status=400)

        created, updated, errors = 0, 0, []
        with transaction.atomic():
            for row_no, row in enumerate(reader, start=2):
                try:
                    name = (row.get("name") or "").strip()
                    item_type = (row.get("type") or "").strip().lower()
                    if not name:
                        raise ValueError("Поле name обязательно")
                    if item_type not in self.TYPE_MAP:
                        raise ValueError(
                            f"Неизвестный тип «{item_type}» (допустимо: "
                            f"{', '.join(self.TYPE_MAP)})."
                        )

                    category_name = (row.get("category") or "").strip()
                    category = None
                    if category_name:
                        category, _ = CatalogCategory.objects.get_or_create(name=category_name)

                    sku = (row.get("sku") or "").strip() or None
                    defaults = {
                        "name": name,
                        "description": row.get("description") or "",
                        "type": item_type,
                        "category": category,
                        "price": self._decimal(row.get("price"), "price", 0),
                        "cost_price": self._decimal(row.get("cost_price"), "cost_price", 0),
                        "tax": self._decimal(row.get("tax"), "tax", 0),
                        "discount": self._decimal(row.get("discount"), "discount", 0),
                        "stock": int(float(row.get("stock") or 0)),
                        "unit": row.get("unit") or "шт.",
                        "status": self._status(row.get("status")),
                        "duration_minutes": self._int_or_none(row.get("duration_minutes")),
                        "billing_period": self._billing(row.get("billing_period")),
                    }

                    if sku and CatalogItem.objects.filter(sku=sku).exists():
                        CatalogItem.objects.filter(sku=sku).update(**defaults)
                        updated += 1
                    else:
                        CatalogItem.objects.create(sku=sku, created_by=request.user, **defaults)
                        created += 1
                except Exception as exc:  # noqa: BLE001
                    errors.append({"row": row_no, "error": str(exc)})

        return Response(
            {
                "created": created,
                "updated": updated,
                "errors": errors,
            }
        )

    @staticmethod
    def _decimal(value, field, default):
        if value is None or str(value).strip() == "":
            return default
        try:
            return Decimal(str(value)).quantize(Decimal("0.01"))
        except (ValueError, ArithmeticError) as exc:
            raise ValueError(f"Поле {field}: не число «{value}»") from exc

    @staticmethod
    def _int_or_none(value):
        if value is None or str(value).strip() == "":
            return None
        try:
            return int(float(value))
        except ValueError as exc:
            raise ValueError(f"Не число «{value}»") from exc

    @classmethod
    def _status(cls, value):
        if value in cls.STATUS_MAP:
            return value
        return CatalogItem.STATUS_ACTIVE

    @classmethod
    def _billing(cls, value):
        if value in CatalogItem.BILLING_CHOICES:
            return value
        return None
