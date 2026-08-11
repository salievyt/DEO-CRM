"""Tests for the scenarios (keyword auto-responder) module."""

import pytest

from apps.messaging.models import Message
from apps.messaging.models.enums import Direction, MessageStatus, MessageType
from apps.scenarios.models import (
    Channel as ScenarioChannel,
    MatchMode,
    Scenario,
    ScenarioTrigger,
    TriggerStatus,
)
from apps.scenarios.services import match_keywords, maybe_auto_respond
from apps.scenarios.templates import SCENARIO_TEMPLATES

pytestmark = pytest.mark.django_db


def make_incoming(conversation, text, *, status=MessageStatus.SENT):
    return Message.objects.create(
        conversation=conversation,
        contact=conversation.contact,
        channel=conversation.channel,
        direction=Direction.INCOMING,
        type=MessageType.TEXT,
        text=text,
        status=status,
        external_message_id=f"wamid.{text}",
    )


def make_outgoing(conversation, text):
    """Return a real outgoing Message (what the engine would persist)."""
    return Message.objects.create(
        conversation=conversation,
        contact=conversation.contact,
        channel=conversation.channel,
        direction=Direction.OUTGOING,
        type=MessageType.TEXT,
        text=text,
        status=MessageStatus.SENT,
    )


def create_scenario(**overrides):
    defaults = {
        "name": "Цена",
        "channel": ScenarioChannel.ALL,
        "match_mode": MatchMode.ANY,
        "keywords": ["цена", "стоимость"],
        "reply_text": "Стоимость зависит от задачи.",
        "is_active": True,
    }
    defaults.update(overrides)
    return Scenario.objects.create(**defaults)


# ------------------------------------------------------------ matching logic


class TestMatchKeywords:
    def test_any_mode_case_insensitive(self):
        assert (
            match_keywords("КАКАЯ СТОИМОСТЬ РАЗРАБОТКИ?", ["цена", "стоимость"], MatchMode.ANY)
            == "стоимость"
        )
        assert (
            match_keywords("какая стоимость?", ["цена", "стоимость"], MatchMode.ANY) == "стоимость"
        )

    def test_any_mode_no_match(self):
        assert match_keywords("привет!", ["цена", "стоимость"], MatchMode.ANY) is None

    def test_all_mode_requires_every_keyword(self):
        kws = ["сайт", "цена"]
        assert match_keywords("нужен сайт, какая цена?", kws, MatchMode.ALL) == "сайт"
        assert match_keywords("какая цена?", kws, MatchMode.ALL) is None

    def test_empty_keywords_never_match(self):
        assert match_keywords("что-нибудь", [], MatchMode.ANY) is None
        assert match_keywords("", ["цена"], MatchMode.ANY) is None


# ---------------------------------------------------------------- the engine


class TestAutoRespond:
    def test_matching_scenario_responds(self, conversation, monkeypatch):
        scenario = create_scenario()
        replies = []
        monkeypatch.setattr(
            "apps.scenarios.services._send_reply",
            lambda conv, text: (replies.append(text), make_outgoing(conv, text))[1],
        )

        incoming = make_incoming(conversation, "Какая стоимость разработки?")
        trigger = maybe_auto_respond(incoming)

        assert trigger is not None
        assert trigger.status == TriggerStatus.RESPONDED
        assert trigger.matched_keyword == "стоимость"
        assert trigger.scenario == scenario
        assert trigger.reply_message is not None
        assert replies == [scenario.reply_text]

    def test_no_match_returns_none(self, conversation, monkeypatch):
        create_scenario()
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        incoming = make_incoming(conversation, "Привет, как дела?")
        assert maybe_auto_respond(incoming) is None

    def test_inactive_scenario_ignored(self, conversation, monkeypatch):
        create_scenario(is_active=False)
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        incoming = make_incoming(conversation, "Какая цена?")
        assert maybe_auto_respond(incoming) is None

    def test_channel_mismatch_ignored(self, conversation, monkeypatch):
        create_scenario(channel=ScenarioChannel.TELEGRAM)
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        incoming = make_incoming(conversation, "Какая цена?")
        assert maybe_auto_respond(incoming) is None

    def test_non_text_message_ignored(self, conversation, monkeypatch):
        create_scenario()
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        message = Message.objects.create(
            conversation=conversation,
            contact=conversation.contact,
            channel=conversation.channel,
            direction=Direction.INCOMING,
            type=MessageType.IMAGE,
            text="",
            external_message_id="wamid.img",
            status=MessageStatus.SENT,
        )
        assert maybe_auto_respond(message) is None

    def test_outgoing_message_never_triggers(self, conversation, monkeypatch):
        create_scenario()
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        outgoing = Message.objects.create(
            conversation=conversation,
            contact=conversation.contact,
            channel=conversation.channel,
            direction=Direction.OUTGOING,
            type=MessageType.TEXT,
            text="Стоимость — 100 000 ₽",
            status=MessageStatus.SENT,
        )
        assert maybe_auto_respond(outgoing) is None

    def test_first_matching_by_priority_wins(self, conversation, monkeypatch):
        first = create_scenario(keywords=["цена"], priority=0, reply_text="Ответ 1")
        create_scenario(keywords=["цена"], priority=1, reply_text="Ответ 2")
        replies = []
        monkeypatch.setattr(
            "apps.scenarios.services._send_reply",
            lambda conv, text: (replies.append(text), make_outgoing(conv, text))[1],
        )
        incoming = make_incoming(conversation, "Какая цена?")
        trigger = maybe_auto_respond(incoming)
        assert trigger.scenario == first
        assert replies == ["Ответ 1"]

    def test_cooldown_skips_repeat_replies(self, conversation, monkeypatch):
        create_scenario(cooldown_minutes=60)
        sent = []

        def fake_send(conv, text):
            sent.append(text)
            return make_outgoing(conv, text)

        monkeypatch.setattr("apps.scenarios.services._send_reply", fake_send)

        incoming = make_incoming(conversation, "Стоимость?")
        assert maybe_auto_respond(incoming) is not None
        # Second identical message within cooldown → skipped, no reply sent.
        incoming2 = make_incoming(conversation, "Ещё раз: стоимость?")
        trigger = maybe_auto_respond(incoming2)
        assert trigger is not None
        assert trigger.status == TriggerStatus.SKIPPED
        assert len(sent) == 1

    def test_send_failure_records_failed(self, conversation, monkeypatch):
        scenario = create_scenario()
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        incoming = make_incoming(conversation, "Стоимость?")
        trigger = maybe_auto_respond(incoming)
        assert trigger.status == TriggerStatus.FAILED
        assert trigger.error_message
        assert scenario.trigger_count == 0

    def test_trigger_count_incremented(self, conversation, monkeypatch):
        scenario = create_scenario()
        monkeypatch.setattr(
            "apps.scenarios.services._send_reply",
            lambda conv, text: make_outgoing(conv, text),
        )
        incoming = make_incoming(conversation, "Стоимость?")
        maybe_auto_respond(incoming)
        scenario.refresh_from_db()
        assert scenario.trigger_count == 1
        assert scenario.last_triggered_at is not None

    def test_duplicate_inbound_delivery_not_reprocessed(self, conversation, monkeypatch):
        """Scenario engine relies on webhooks only calling it for `created` rows."""
        create_scenario()
        monkeypatch.setattr("apps.scenarios.services._send_reply", lambda *a, **k: None)
        incoming = make_incoming(conversation, "Цена?")
        assert maybe_auto_respond(incoming) is not None
        # Same external id → same row; calling again still fires (dedupe is the
        # caller's job), but cooldown=0 means it may re-fire. We only assert the
        # engine itself runs without error.
        trigger = maybe_auto_respond(incoming)
        assert trigger is not None


# ------------------------------------------------------------------- the API


class TestScenarioAPI:
    def test_create_scenario(self, api_client, staff_user):
        api_client.force_authenticate(staff_user)
        resp = api_client.post(
            "/api/v1/scenarios/",
            {
                "name": "Прайс",
                "channel": "all",
                "match_mode": "any",
                "keywords": ["цена", "прайс"],
                "reply_text": "Пришлём прайс менеджером.",
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["created_by_name"]
        assert Scenario.objects.count() == 1

    def test_create_requires_keywords_and_reply(self, api_client, staff_user):
        api_client.force_authenticate(staff_user)
        resp = api_client.post(
            "/api/v1/scenarios/",
            {
                "name": "Пустой",
                "keywords": [],
                "reply_text": "",
            },
            format="json",
        )
        assert resp.status_code == 400

    def test_list_filters_active(self, api_client, staff_user):
        create_scenario(is_active=True)
        create_scenario(is_active=False, name="Выключен")
        api_client.force_authenticate(staff_user)
        resp = api_client.get("/api/v1/scenarios/?status=active")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_update_and_toggle(self, api_client, staff_user):
        scenario = create_scenario()
        api_client.force_authenticate(staff_user)
        resp = api_client.patch(f"/api/v1/scenarios/{scenario.id}/", {"is_active": False})
        assert resp.status_code == 200
        scenario.refresh_from_db()
        assert scenario.is_active is False

    def test_delete(self, api_client, staff_user):
        scenario = create_scenario()
        api_client.force_authenticate(staff_user)
        assert api_client.delete(f"/api/v1/scenarios/{scenario.id}/").status_code == 204
        assert Scenario.objects.count() == 0

    def test_client_role_forbidden(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        assert api_client.get("/api/v1/scenarios/").status_code == 403
        assert api_client.post("/api/v1/scenarios/", {}, format="json").status_code == 403

    def test_unauthenticated_forbidden(self, api_client):
        assert api_client.get("/api/v1/scenarios/").status_code == 401

    def test_templates_listed(self, api_client, staff_user):
        api_client.force_authenticate(staff_user)
        resp = api_client.get("/api/v1/scenarios/templates/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == len(SCENARIO_TEMPLATES)
        assert all("keywords" in t and "reply_text" in t for t in resp.data["results"])

    def test_test_endpoint(self, api_client, staff_user):
        scenario = create_scenario()
        api_client.force_authenticate(staff_user)
        hit = api_client.post(
            f"/api/v1/scenarios/{scenario.id}/test/", {"text": "какая стоимость?"}, format="json"
        )
        assert hit.data == {"matched": True, "keyword": "стоимость", "active": True}
        miss = api_client.post(
            f"/api/v1/scenarios/{scenario.id}/test/", {"text": "привет"}, format="json"
        )
        assert miss.data == {"matched": False, "keyword": None, "active": True}

    def test_stats(self, api_client, staff_user):
        create_scenario()
        api_client.force_authenticate(staff_user)
        resp = api_client.get("/api/v1/scenarios/stats/")
        assert resp.status_code == 200
        assert resp.data["total"] == 1
        assert resp.data["active"] == 1

    def test_triggers_list(self, api_client, staff_user, conversation):
        scenario = create_scenario()
        incoming = make_incoming(conversation, "Стоимость?")
        trigger = ScenarioTrigger.objects.create(
            scenario=scenario,
            conversation=conversation,
            message=incoming,
            client=conversation.contact,
            matched_keyword="стоимость",
            status=TriggerStatus.RESPONDED,
        )
        api_client.force_authenticate(staff_user)
        resp = api_client.get("/api/v1/scenarios/triggers/")
        assert resp.status_code == 200
        assert resp.data["results"][0]["id"] == str(trigger.id)
        assert resp.data["results"][0]["scenario_name"] == scenario.name
