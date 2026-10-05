from decimal import Decimal
from django.utils import timezone
from apps.finance.models import Expense
from .models import Project

DONE = {"выполнена", "отклонена", "завершена", "закрыта", "done", "closed", "выполнено", "готово"}
BLOCKED = {"заблокирована", "заблокировано", "blocked", "блокер"}


def project_health(project):
    today = timezone.localdate()
    risks = []
    score = 100
    tasks = list(project.tasks.select_related("status"))
    if project.deadline and project.deadline < today and project.progress < 100:
        risks.append({"key": "deadline", "label": f"Срок проекта прошёл ({project.deadline:%d.%m.%Y})", "points": 30})
    open_tasks = [t for t in tasks if t.status.name.strip().casefold() not in DONE]
    overdue = [t for t in open_tasks if t.deadline and t.deadline < today]
    blocked = [t for t in open_tasks if t.status.name.strip().casefold() in BLOCKED]
    if overdue:
        risks.append({"key": "tasks_overdue", "label": f"Просрочено задач: {len(overdue)}", "points": min(35, 10 + 5 * (len(overdue)-1))})
    if blocked:
        risks.append({"key": "blocked", "label": f"Заблокировано задач: {len(blocked)}", "points": min(35, 15 + 5 * (len(blocked)-1))})
    if project.hours_budget and project.tracked_hours > project.hours_budget:
        percent = int(project.tracked_hours / project.hours_budget * 100)
        risks.append({"key": "hours", "label": f"Время превышает план ({percent}%)", "points": 20 if percent < 125 else 30})
    total = sum((e.amount for e in project.expenses.all() if e.expense_date <= today), Decimal("0"))
    if project.budget and total > project.budget:
        percent = int(total / project.budget * 100)
        risks.append({"key": "cost", "label": f"Расходы превысили бюджет ({percent}%)", "points": 20 if percent < 125 else 30})
    score = max(0, score - sum(r["points"] for r in risks))
    level = "critical" if score < 55 else "attention" if score < 80 else "healthy"
    return {"score": score, "level": level, "label": {"healthy": "В норме", "attention": "Требует внимания", "critical": "Критический риск"}[level], "risks": risks}
