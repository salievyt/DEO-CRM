"""Explainable qualification score; evidence, not a prediction of a sale."""
from django.utils import timezone
from apps.messaging.models import Message


def score_lead(lead):
    replied = bool(lead.client_id and Message.objects.filter(
        contact_id=lead.client_id, direction="incoming",
        created_at__gte=timezone.now() - timezone.timedelta(days=30),
    ).exists())
    factors = [
        ("budget", "Указан бюджет", 20, bool(lead.budget and lead.budget > 0)),
        ("decision_maker", "Известен ЛПР", 20, bool(lead.decision_maker.strip())),
        ("target_date", "Обозначены сроки", 15, bool(lead.target_date and lead.target_date >= timezone.localdate())),
        ("brief", "Анкета заполнена", 15, lead.brief_completed),
        ("reply", "Ответ за последние 30 дней", 15, replied),
        ("need", "Сформулирована задача", 15, bool(lead.business_need.strip())),
    ]
    score = sum(weight for _, _, weight, met in factors if met)
    return {"score": score, "tier": "hot" if score >= 70 else "warm" if score >= 40 else "cold",
            "factors": [dict(key=key, label=label, weight=weight, met=met) for key, label, weight, met in factors]}
