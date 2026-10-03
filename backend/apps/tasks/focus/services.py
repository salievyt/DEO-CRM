from django.utils import timezone
from apps.tasks.models import TaskTimer
from .models import FocusProfile


def elapsed(session, now=None):
    now = now or timezone.now()
    additional = (
        max(0, int((now - session.resumed_at).total_seconds()))
        if session.status == "running" and session.resumed_at
        else 0
    )
    return min(session.planned_seconds, session.elapsed_seconds + additional)


def finish(session, status="completed", now=None):
    if session.status not in ["running", "paused"]:
        return session
    now = now or timezone.now()
    effective_end = min(now, session.ends_at) if session.ends_at else now
    session.elapsed_seconds = elapsed(session, now)
    session.status = status
    session.finished_at = effective_end
    session.resumed_at = None
    session.ends_at = None
    if session.phase == "work" and session.task_id and session.elapsed_seconds:
        session.timer = TaskTimer.objects.create(
            task=session.task,
            user=session.user,
            start_time=session.started_at,
            end_time=effective_end,
            duration_seconds=session.elapsed_seconds,
            is_running=False,
            note=session.goal,
        )
        from apps.tasks.time_tracking import recalculate_task_time

        recalculate_task_time(session.task)
    if session.phase == "work" and status == "completed":
        profile, _ = FocusProfile.objects.select_for_update().get_or_create(user=session.user)
        profile.coins += session.elapsed_seconds // 60
        profile.save(update_fields=["coins", "updated_at"])
    session.save()
    return session


def settle(session, now=None):
    now = now or timezone.now()
    if session and session.status == "running" and session.ends_at <= now:
        finish(session, now=now)
    return session
