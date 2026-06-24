from django.urls import path

from . import views

urlpatterns = [
    path("", views.TaskListCreateView.as_view(), name="task-list"),
    path("kanban/", views.TaskKanbanView.as_view(), name="task-kanban"),
    path("my/", views.MyTasksView.as_view(), name="task-my"),
    path("upcoming/", views.UpcomingTasksView.as_view(), name="task-upcoming"),
    path("<uuid:pk>/", views.TaskDetailView.as_view(), name="task-detail"),
    path(
        "<uuid:pk>/change-status/",
        views.TaskChangeStatusView.as_view(),
        name="task-change-status",
    ),
    path(
        "<uuid:pk>/assign/",
        views.TaskAssignView.as_view(),
        name="task-assign",
    ),
    path(
        "<uuid:task_pk>/comments/",
        views.TaskCommentListView.as_view(),
        name="task-comments",
    ),
    path(
        "<uuid:pk>/timer/start/",
        views.TaskTimerStartView.as_view(),
        name="task-timer-start",
    ),
    path(
        "<uuid:pk>/timer/stop/",
        views.TaskTimerStopView.as_view(),
        name="task-timer-stop",
    ),
    path("statuses/", views.TaskStatusListView.as_view(), name="task-statuses"),
    path("priorities/", views.TaskPriorityListView.as_view(), name="task-priorities"),
]
