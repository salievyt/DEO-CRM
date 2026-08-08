"""DEO AI provider integration.

Uses an OpenAI-compatible ``/chat/completions`` endpoint configured through
``AISettings`` (DB, with environment fallback).
"""

import json

import requests

DEFAULT_SYSTEM_PROMPT = (
    "Ты — DEO AI, интеллектуальный ассистент студии DEO. Отвечай на русском, "
    "структурируй ответы, будь конкретным и полезным."
)


class AIProviderError(Exception):
    """Provider call failed; message is user-facing (Russian)."""


def render_prompt(template, variables):
    """Substitute ``{variable}`` placeholders safely."""
    if not template:
        return ""
    text = template
    for key, value in (variables or {}).items():
        text = text.replace("{" + key + "}", str(value))
    return text


def _build_messages(system_prompt, user_prompt):
    return [
        {"role": "system", "content": system_prompt or DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def _call_provider(settings, messages, temperature=None):
    if not settings.configured:
        raise AIProviderError(
            "DEO AI не настроен: укажите API URL, API ключ и модель " "в разделе «Настройки»."
        )
    url = settings.api_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.model,
        "messages": messages,
        "temperature": float(temperature if temperature is not None else settings.temperature),
        "max_tokens": settings.max_tokens,
        "stream": False,
    }
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=settings.timeout,
        )
    except requests.RequestException as exc:
        raise AIProviderError(f"Не удалось подключиться к провайдеру: {exc}") from exc

    if response.status_code != 200:
        raise AIProviderError(
            f"Провайдер вернул ошибку {response.status_code}: {response.text[:300]}"
        )

    content_type = response.headers.get("content-type", "")
    if "text/event-stream" in content_type:
        # Some gateways always stream, even with stream=false
        content, usage = _parse_sse(response)
    else:
        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError) as exc:
            raise AIProviderError("Провайдер вернул некорректный ответ.") from exc
        usage = data.get("usage") or {}
        content, usage = content, {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
    return content, usage


def _parse_sse(response):
    """Parse an OpenAI-style server-sent events stream into text + usage."""
    parts = []
    usage = {}
    for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        payload = line[len("data:") :].strip()
        if payload == "[DONE]":
            break
        try:
            chunk = json.loads(payload)
        except ValueError:
            continue
        if chunk.get("usage"):
            usage = chunk["usage"]
        choices = chunk.get("choices") or []
        if choices:
            delta = choices[0].get("delta") or {}
            content = delta.get("content")
            if content:
                parts.append(content)
    content = "".join(parts)
    if not content:
        raise AIProviderError("Провайдер вернул пустой ответ.")
    return content, {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }


def generate_with_provider(settings, system_prompt, user_prompt, temperature=None):
    """Generate text with the configured provider. Returns (content, usage)."""
    return _call_provider(settings, _build_messages(system_prompt, user_prompt), temperature)


def test_connection(settings):
    """Send a minimal request to verify provider connectivity."""
    content, usage = _call_provider(
        settings,
        [
            {
                "role": "system",
                "content": "Ты — ассистент. Отвечай одним словом.",
            },
            {"role": "user", "content": "Привет! Напиши «OK»"},
        ],
        temperature=0.0,
    )
    return {
        "ok": True,
        "model": settings.model,
        "response": (content or "").strip()[:200],
        "tokens": usage,
    }


def build_default_prompts(prompt_type, variables):
    """Build system/user prompts when no template row exists for the type."""
    data = variables or {}
    labels = {
        "tz": "техническое задание",
        "commercial_offer": "коммерческое предложение",
        "contract": "договор",
        "report": "отчёт",
        "summary": "краткую сводку",
        "estimate": "оценку стоимости",
        "client_response": "ответ клиенту",
    }
    label = labels.get(prompt_type, prompt_type)
    system = (
        "Ты — DEO AI, ассистент студии DEO. Составь профессиональный документ "
        "на русском языке. Используй markdown-разметку."
    )
    user = (
        f"Составь {label} по следующим данным:\n\n{json.dumps(data, ensure_ascii=False, indent=2)}"
    )
    return system, user
