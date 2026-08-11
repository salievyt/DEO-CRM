from django.utils.text import slugify
from rest_framework import serializers

from .models import Article


# Django's ``slugify`` strips Cyrillic, so Russian titles are transliterated
# before slug generation (``Что такое CRM?`` → ``chto-takoe-crm``).
_CYRILLIC_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e",
    "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k",
    "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
    "э": "e", "ю": "yu", "я": "ya",
}


def transliterate(text: str) -> str:
    """Lowercase Cyrillic → Latin transliteration (non-Russian kept as-is)."""
    return "".join(_CYRILLIC_TRANSLIT.get(ch, ch) for ch in text.lower())


class ArticleListSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    section_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "category",
            "category_display",
            "reading_time_minutes",
            "section_count",
            "order",
        ]


class ArticleDetailSerializer(ArticleListSerializer):
    class Meta(ArticleListSerializer.Meta):
        fields = ArticleListSerializer.Meta.fields + ["sections", "updated_at"]


class ArticleAdminListSerializer(serializers.ModelSerializer):
    """Admin list: includes publication state and last-updated time."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    section_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = ArticleListSerializer.Meta.fields + ["is_published", "updated_at"]


class ArticleWriteSerializer(serializers.ModelSerializer):
    """Create / update an article from the frontend admin editor.

    ``sections`` is a list of ``{"heading": str, "blocks": [...]}`` blocks,
    see ``models.Article``. ``slug`` is optional — when blank it is generated
    from the title (with a numeric suffix on collision).
    """

    # slug is optional — a blank value triggers auto-generation from the title.
    slug = serializers.SlugField(required=False, allow_blank=True)
    reading_time_minutes = serializers.IntegerField(
        required=False, min_value=1, default=5
    )
    order = serializers.IntegerField(required=False, min_value=0, default=0)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "category",
            "reading_time_minutes",
            "order",
            "is_published",
            "sections",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_title(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Укажите название статьи")
        return value

    def validate_summary(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Укажите краткое описание")
        return value

    def validate_slug(self, value):
        value = slugify((value or "").strip())
        if not value:
            return ""  # generated from the title on save
        qs = Article.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Статья с таким слагом уже существует")
        return value

    def validate_sections(self, value):
        allowed_types = {"paragraph", "list", "steps", "callout"}
        if not isinstance(value, list):
            raise serializers.ValidationError("Разделы должны быть списком")
        for section in value:
            if not isinstance(section, dict) or not (section.get("heading") or "").strip():
                raise serializers.ValidationError("Каждый раздел должен содержать заголовок")
            blocks = section.get("blocks")
            if not isinstance(blocks, list):
                raise serializers.ValidationError("Поле blocks раздела должно быть списком")
            for block in blocks:
                if not isinstance(block, dict) or block.get("type") not in allowed_types:
                    raise serializers.ValidationError("Неизвестный тип блока в разделе")
        return value

    def _unique_slug(self, title: str) -> str:
        base = slugify(transliterate(title)) or "article"
        slug, n = base, 1
        while Article.objects.filter(slug=slug).exists():
            n += 1
            slug = f"{base}-{n}"
        return slug

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = self._unique_slug(validated_data["title"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Regenerate only when the client explicitly sent an empty slug — a
        # partial PATCH without ``slug`` must keep the existing URL.
        if "slug" in validated_data and not validated_data["slug"]:
            validated_data["slug"] = self._unique_slug(
                validated_data.get("title") or instance.title
            )
        return super().update(instance, validated_data)
