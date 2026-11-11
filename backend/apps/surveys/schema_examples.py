"""OpenAPI examples (trimmed real responses of the seeded team survey)."""

_SECTION_ID = "88f959fd-b8c6-4d17-97db-946ec123756f"
_Q_SINGLE = "25ee43d1-5641-4d2e-9b22-61f8783044df"
_Q_NUMBER = "b79ad4ab-fc41-47aa-b1be-2ea334c91412"
_Q_SCALE = "f799f390-078e-4c6e-88b5-7e9e97874d3a"
_Q_MULTI = "b180c910-eba3-4520-92d6-470cba625e9e"
_Q_TEXT = "0de7985e-9c18-4d12-bf9e-e69f8c224699"
_OPT_A = "adb8c36d-5789-45a8-9c70-9b34b80f7b30"
_OPT_B = "7517ace5-23e9-496e-9832-ca87fe6a27c9"
_OPT_NONE = "53ebb3f8-4e32-45f6-95c3-a3d08f8e6671"
_FOLLOW_UP = {
    "title": "Готов участвовать",
    "token": "a14ca5fb-6350-4130-8efe-cc792ae94db7",
    "url": "https://crm.deo-core.codes/survey/a14ca5fb-6350-4130-8efe-cc792ae94db7/",
}

PUBLIC_STRUCTURE_EXAMPLE = {
    "title": "Опрос команды DEO CORE",
    "description": "Привет! Это опрос о том, как нам работается в DEO CORE.\n\n…",
    "thank_you_text": "Спасибо! Если хочешь, … заполни короткую форму с именем по ссылке ниже.",
    "is_anonymous": True,
    "starts_at": "2026-11-11T06:00:00Z",
    "ends_at": "2026-11-25T21:00:00Z",
    "follow_up": _FOLLOW_UP,
    "sections": [
        {
            "id": _SECTION_ID,
            "title": "Загрузка и время",
            "description": "",
            "questions": [
                {
                    "id": _Q_NUMBER,
                    "code": "2.1",
                    "text": "Сколько часов в неделю ты в среднем тратишь на студию сейчас?",
                    "help_text": "Часы в неделю",
                    "type": "number",
                    "required": True,
                    "scale_min": 1,
                    "scale_max": 5,
                    "scale_labels": {},
                    "max_choices": None,
                    "has_other": False,
                    "other_label": "Другое",
                    "min_value": 0.0,
                    "max_value": None,
                    "max_length": None,
                    "identifies_respondent": False,
                    "options": [],
                },
                {
                    "id": _Q_SCALE,
                    "code": "2.4",
                    "text": "Как ты оцениваешь свою загрузку в последний месяц?",
                    "help_text": "",
                    "type": "scale",
                    "required": True,
                    "scale_min": 1,
                    "scale_max": 5,
                    "scale_labels": {
                        "1": "работы почти не было",
                        "3": "загрузка нормальная",
                        "5": "перегружен",
                    },
                    "max_choices": None,
                    "has_other": False,
                    "other_label": "Другое",
                    "min_value": None,
                    "max_value": None,
                    "max_length": None,
                    "identifies_respondent": False,
                    "options": [],
                },
                {
                    "id": _Q_MULTI,
                    "code": "2.5",
                    "text": "Что, кроме клиентских задач, забирает больше всего времени?",
                    "help_text": "",
                    "type": "multiple_choice",
                    "required": True,
                    "scale_min": 1,
                    "scale_max": 5,
                    "scale_labels": {},
                    "max_choices": 2,
                    "has_other": False,
                    "other_label": "Другое",
                    "min_value": None,
                    "max_value": None,
                    "max_length": None,
                    "identifies_respondent": False,
                    "options": [
                        {
                            "id": _OPT_B,
                            "text": "Созвоны и переписка внутри команды",
                            "is_exclusive": False,
                        },
                        {
                            "id": _OPT_NONE,
                            "text": "Ничего заметного, почти всё время уходит на клиентские задачи",
                            "is_exclusive": True,
                        },
                    ],
                },
            ],
        }
    ],
}

PUBLIC_SUBMIT_EXAMPLE = {
    "answers": [
        {"question": _Q_SINGLE, "value": None, "other_text": "Аналитика"},
        {"question": _Q_NUMBER, "value": 20},
        {"question": _Q_SCALE, "value": 4},
        {"question": _Q_MULTI, "value": [_OPT_B]},
        {"question": _Q_TEXT, "value": "Быстрее согласовывать ТЗ"},
    ]
}

RESULTS_EXAMPLE = {
    "survey": {
        "id": "fac755c7-6a06-4a1b-b766-34d0d1be52a4",
        "title": "Опрос команды DEO CORE",
        "is_anonymous": True,
        "status": "open",
    },
    "total_responses": 3,
    "questions": [
        {
            "id": _Q_SINGLE,
            "code": "1.1",
            "text": "Твоё основное направление в студии.",
            "type": "single_choice",
            "required": True,
            "section": {"id": "fb6964c2-c8e6-48ad-8a6e-a8bf5b4b7617", "title": "О себе и роли"},
            "answered_count": 3,
            "skipped_count": 0,
            "options": [
                {"id": _OPT_A, "text": "Дизайн (product / UX/UI)", "count": 2, "percent": 66.7},
                {
                    "id": "d28d2e33-3e11-4443-92a6-537524888a58",
                    "text": "Разработка (веб, мобильная, бэкенд)",
                    "count": 0,
                    "percent": 0.0,
                },
            ],
            "other": {"label": "Другое", "count": 1, "percent": 33.3, "answers": ["Аналитика"]},
        },
        {
            "id": _Q_NUMBER,
            "code": "2.1",
            "text": "Сколько часов в неделю ты в среднем тратишь на студию сейчас?",
            "type": "number",
            "required": True,
            "section": {"id": _SECTION_ID, "title": "Загрузка и время"},
            "answered_count": 3,
            "skipped_count": 0,
            "stats": {"average": 20.83, "median": 20, "min": 12.5, "max": 30, "sum": 62.5},
            "values": [20, 12.5, 30],
        },
        {
            "id": _Q_SCALE,
            "code": "2.4",
            "text": "Как ты оцениваешь свою загрузку в последний месяц?",
            "type": "scale",
            "required": True,
            "section": {"id": _SECTION_ID, "title": "Загрузка и время"},
            "answered_count": 3,
            "skipped_count": 0,
            "stats": {"average": 4.0, "median": 4, "min": 3, "max": 5, "sum": 12},
            "scale": {
                "min": 1,
                "max": 5,
                "labels": {
                    "1": "работы почти не было",
                    "3": "загрузка нормальная",
                    "5": "перегружен",
                },
            },
            "distribution": [
                {"value": 1, "count": 0},
                {"value": 2, "count": 0},
                {"value": 3, "count": 1},
                {"value": 4, "count": 1},
                {"value": 5, "count": 1},
            ],
        },
        {
            "id": _Q_MULTI,
            "code": "2.5",
            "text": "Что, кроме клиентских задач, забирает больше всего времени?",
            "type": "multiple_choice",
            "required": True,
            "section": {"id": _SECTION_ID, "title": "Загрузка и время"},
            "answered_count": 3,
            "skipped_count": 0,
            "options": [
                {
                    "id": _OPT_B,
                    "text": "Созвоны и переписка внутри команды",
                    "count": 2,
                    "percent": 66.7,
                },
                {
                    "id": _OPT_NONE,
                    "text": "Ничего заметного, почти всё время уходит на клиентские задачи",
                    "count": 0,
                    "percent": 0.0,
                },
            ],
            "other": None,
        },
        {
            "id": _Q_TEXT,
            "code": "9.1",
            "text": "Если поменять в студии одну вещь, … что бы ты поменял?",
            "type": "long_text",
            "required": True,
            "section": {
                "id": "2dd1be41-7606-4923-9d15-5e3e85b7fa2d",
                "title": "Идеи и что бы ты изменил",
            },
            "answered_count": 2,
            "skipped_count": 1,
            "answers": [
                {
                    "response_id": "274040b9-98e2-4edd-a2f6-4375bed87afa",
                    "respondent_name": None,
                    "text": "Шаблоны КП",
                },
                {
                    "response_id": "c7cf828a-01ac-4b37-9db7-cd1097f78d50",
                    "respondent_name": None,
                    "text": "Быстрее согласовывать ТЗ",
                },
            ],
        },
    ],
}

TABLE_EXAMPLE = {
    "count": 3,
    "next": "https://api.example/api/v1/surveys/<id>/responses/?page=2&page_size=2",
    "previous": None,
    "is_anonymous": True,
    "columns": [
        {
            "id": _Q_SINGLE,
            "code": "1.1",
            "text": "Твоё основное направление в студии.",
            "type": "single_choice",
            "section_title": "О себе и роли",
        },
        {
            "id": _Q_NUMBER,
            "code": "2.1",
            "text": "Сколько часов в неделю…",
            "type": "number",
            "section_title": "Загрузка и время",
        },
        {
            "id": _Q_MULTI,
            "code": "2.5",
            "text": "Что, кроме клиентских задач…",
            "type": "multiple_choice",
            "section_title": "Загрузка и время",
        },
        {
            "id": _Q_TEXT,
            "code": "9.1",
            "text": "Если поменять в студии одну вещь…",
            "type": "long_text",
            "section_title": "Идеи и что бы ты изменил",
        },
    ],
    "results": [
        {
            "id": "274040b9-98e2-4edd-a2f6-4375bed87afa",
            "submitted_date": "2026-11-11",
            "submitted_at": None,
            "respondent_name": None,
            "user_id": None,
            "answers": {
                _Q_SINGLE: {
                    "value": None,
                    "other_text": "Аналитика",
                    "display": "Другое: Аналитика",
                },
                _Q_NUMBER: {"value": 20, "other_text": None, "display": "20"},
                _Q_MULTI: {
                    "value": [_OPT_B],
                    "other_text": None,
                    "display": "Созвоны и переписка внутри команды",
                },
                _Q_TEXT: None,
            },
        }
    ],
}
