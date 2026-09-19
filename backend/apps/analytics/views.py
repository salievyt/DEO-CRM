from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAnalyticsViewer, IsOwner

from .models import AnalyticsDashboard
from .serializers import DashboardSerializer, ReportSerializer

User = get_user_model()


class DashboardListCreateView(generics.ListCreateAPIView):
    """List or create dashboards."""

    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSerializer

    def get_queryset(self):
        return AnalyticsDashboard.objects.filter(owner=self.request.user).all()


class SummaryMetricsView(views.APIView):
    """Get summary metrics for main dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.clients.models import Client
        from apps.projects.models import Project
        from apps.finance.models import Invoice
        from apps.tasks.models import Task

        now = timezone.now()
        start_month = now.replace(day=1, hour=0, minute=0, second=0)

        return Response(
            {
                "total_clients": Client.objects.count(),
                "active_projects": Project.objects.exclude(
                    status__name__in=["Завершён", "Отменён", "На паузе", "Приостановлен"]
                ).count(),
                "monthly_revenue": float(
                    Invoice.objects.filter(status="paid", paid_at__gte=start_month).aggregate(
                        total=Sum("amount")
                    )["total"]
                    or 0
                ),
                "open_tasks": Task.objects.exclude(
                    status__name__in=["Выполнена", "Отклонена"]
                ).count(),
            }
        )


class SalesMetricsView(views.APIView):
    """Sales pipeline metrics."""

    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        from apps.leads.models import Lead, LeadStage

        stages = LeadStage.objects.annotate(lead_count=Count("leads")).order_by("order")
        total_budget = (
            Lead.objects.filter(is_active=True).aggregate(total=Sum("budget"))["total"] or 0
        )

        return Response(
            {
                "total_leads": Lead.objects.count(),
                "active_leads": Lead.objects.filter(is_active=True).count(),
                "total_pipeline_value": float(total_budget),
                "stages": [
                    {"name": s.name, "count": s.lead_count, "color": s.color} for s in stages
                ],
            }
        )


class TaskMetricsView(views.APIView):
    """Task completion metrics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.tasks.models import Task

        total = Task.objects.count()
        completed = Task.objects.filter(status__name="Выполнена").count()
        overdue = (
            Task.objects.filter(
                deadline__lt=timezone.now().date(),
            )
            .exclude(status__name__in=["Выполнена", "Отклонена"])
            .count()
        )

        return Response(
            {
                "total": total,
                "completed": completed,
                "completion_rate": round(completed / total * 100, 1) if total else 0,
                "overdue": overdue,
            }
        )


class WorkloadMetricsView(views.APIView):
    """Team workload heatmap data — tasks per user per day."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.tasks.models import Task, TaskTimer

        # Date range: last 4 weeks by default
        today = timezone.now().date()
        days_back = int(request.query_params.get("days", "28"))
        start_date = today - timedelta(days=days_back - 1)

        # Get active team members (users who have tasks or timers)
        users_with_tasks = (
            User.objects.filter(
                Q(assigned_tasks__isnull=False) | Q(tasktimer__isnull=False),
                is_active=True,
            )
            .distinct()
            .order_by("first_name", "last_name")
        )

        # Pre-compute task counts per user per day
        workload_data = []
        for user in users_with_tasks:
            daily_breakdown = []
            cursor = start_date
            while cursor <= today:
                day_start = timezone.make_aware(datetime.combine(cursor, datetime.min.time()))
                day_end = timezone.make_aware(datetime.combine(cursor, datetime.max.time()))

                tasks_assigned = (
                    Task.objects.filter(
                        assignee=user,
                        created_at__lte=day_end,
                    )
                    .exclude(status__name__in=["Выполнена", "Отклонена"])
                    .count()
                )

                # Tasks completed on this day
                tasks_completed = Task.objects.filter(
                    assignee=user,
                    updated_at__range=(day_start, day_end),
                    status__name="Выполнена",
                ).count()

                # Tasks due on this day
                tasks_due = (
                    Task.objects.filter(
                        assignee=user,
                        deadline=cursor,
                    )
                    .exclude(status__name__in=["Выполнена", "Отклонена"])
                    .count()
                )

                # Hours tracked via timers
                timer_seconds = (
                    TaskTimer.objects.filter(
                        user=user,
                        start_time__gte=day_start,
                        start_time__lte=day_end,
                        is_running=False,
                    ).aggregate(total=Sum("duration_seconds"))["total"]
                    or 0
                )

                daily_breakdown.append(
                    {
                        "date": cursor.isoformat(),
                        "weekday": cursor.weekday(),
                        "tasks_assigned": tasks_assigned,
                        "tasks_completed": tasks_completed,
                        "tasks_due": tasks_due,
                        "hours_tracked": round(timer_seconds / 3600, 1),
                    }
                )
                cursor += timedelta(days=1)

            # Compute weekly summary
            total_hours = sum(d["hours_tracked"] for d in daily_breakdown)
            avg_daily_tasks = sum(d["tasks_assigned"] for d in daily_breakdown) / max(
                len(daily_breakdown), 1
            )

            workload_data.append(
                {
                    "user_id": str(user.id),
                    "user_name": user.get_full_name() or user.email,
                    "initials": f"{user.first_name[0] if user.first_name else ''}"
                    f"{user.last_name[0] if user.last_name else ''}",
                    "daily": daily_breakdown,
                    "total_hours": round(total_hours, 1),
                    "avg_daily_tasks": round(avg_daily_tasks, 1),
                    "active_task_count": Task.objects.filter(assignee=user)
                    .exclude(status__name__in=["Выполнена", "Отклонена"])
                    .count(),
                }
            )

        # Compute team-level summaries
        team_total_hours = sum(u["total_hours"] for u in workload_data)
        team_active_tasks = sum(u["active_task_count"] for u in workload_data)
        member_count = len(workload_data)

        return Response(
            {
                "start_date": start_date.isoformat(),
                "end_date": today.isoformat(),
                "total_days": days_back,
                "team": {
                    "member_count": member_count,
                    "total_hours": round(team_total_hours, 1),
                    "total_active_tasks": team_active_tasks,
                    "avg_hours_per_member": round(team_total_hours / max(member_count, 1), 1),
                    "avg_tasks_per_member": round(team_active_tasks / max(member_count, 1), 1),
                },
                "members": workload_data,
            }
        )


class CapacityPlanningView(views.APIView):
    """Future team load: committed vs available hours per user per week.

    GET parameters:
      - ``weeks``         — number of future weeks (default 4, max 12)
      - ``weekly_hours``  — default weekly working hours per user (default 40)
      - ``user``          — restrict to a single user id
    """

    permission_classes = [IsAuthenticated, IsAnalyticsViewer]

    def get(self, request):
        from apps.tasks.models import Task

        weeks = min(max(int(request.query_params.get("weeks", 4)), 1), 12)
        weekly_hours = int(request.query_params.get("weekly_hours", 40))

        today = timezone.now().date()
        current_monday = today - timedelta(days=today.weekday())

        week_defs = []
        for index in range(weeks):
            start = current_monday + timedelta(days=7 * index)
            week_defs.append((start, start + timedelta(days=6)))

        users = (
            User.objects.filter(is_active=True)
            .exclude(role__name="client")
            .order_by("first_name", "last_name")
        )
        user_filter = request.query_params.get("user")
        if user_filter:
            users = users.filter(id=user_filter)

        done_statuses = ["Выполнена", "Отклонена"]
        members = []
        for user in users:
            per_week = []
            for week_index, (start, end) in enumerate(week_defs):
                committed = (
                    Task.objects.filter(
                        assignee=user,
                        deadline__gte=start,
                        deadline__lte=end,
                    )
                    .exclude(status__name__in=done_statuses)
                    .aggregate(total=Sum("estimated_hours"))["total"]
                    or 0
                )
                committed = float(committed)
                per_week.append(
                    {
                        "week": week_index + 1,
                        "start_date": start.isoformat(),
                        "end_date": end.isoformat(),
                        "committed_hours": round(committed, 1),
                        "available_hours": round(max(weekly_hours - committed, 0), 1),
                        "over_allocated": committed > weekly_hours,
                    }
                )

            members.append(
                {
                    "user_id": str(user.id),
                    "user_name": user.get_full_name() or user.email,
                    "role": user.role.name if user.role else None,
                    "avg_committed_hours": round(
                        sum(w["committed_hours"] for w in per_week) / max(weeks, 1),
                        1,
                    ),
                    "weeks": per_week,
                }
            )

        # Team-wide per-week summary
        team_weeks = []
        for week_index in range(weeks):
            committed_sum = sum(
                m["weeks"][week_index]["committed_hours"] for m in members
            )
            available_sum = sum(
                m["weeks"][week_index]["available_hours"] for m in members
            )
            team_weeks.append(
                {
                    "week": week_index + 1,
                    "start_date": week_defs[week_index][0].isoformat(),
                    "end_date": week_defs[week_index][1].isoformat(),
                    "committed_hours": round(committed_sum, 1),
                    "available_hours": round(available_sum, 1),
                    "capacity_hours": round(
                        available_sum + sum(
                            m["weeks"][week_index]["committed_hours"] for m in members
                        ),
                        1,
                    ),
                }
            )

        return Response(
            {
                "weekly_hours_default": weekly_hours,
                "weeks": weeks,
                "team": {
                    "member_count": len(members),
                    "weeks": team_weeks,
                },
                "members": members,
            }
        )


class ReportGenerateView(views.APIView):
    """Generate and save a report."""

    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        from .models import Report

        report = Report.objects.create(
            title=request.data.get("title", "Отчет"),
            type=request.data.get("type", "custom"),
            filters=request.data.get("filters", {}),
            data=request.data.get("data", {}),
            format=request.data.get("format", "pdf"),
            generated_by=request.user,
        )
        return Response(ReportSerializer(report).data)
