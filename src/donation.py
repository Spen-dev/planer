"""Donation settings and payment helpers for Planer."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode

DEFAULT_DONATION = {
    "message": "Поддержите развитие Планера — любая сумма помогает улучшать приложение.",
    "presets": [100, 300, 500, 1000],
    "min_amount": 50,
    "max_amount": 100000,
    "yoomoney_wallet": "",
    "sbp_phone": "",
    "sbp_name": "",
    "yoomoney_label": "Оплатить через ЮMoney",
    "sbp_label": "СБП — скопировать номер",
}


def donation_config_path(data_dir: Path) -> Path:
    return data_dir / "donation.json"


def load_donation_config(data_dir: Path | None = None) -> dict:
    from license import LICENSE_DIR

    base = data_dir or LICENSE_DIR
    cfg = dict(DEFAULT_DONATION)
    path = donation_config_path(base)
    if path.is_file():
        try:
            user = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(user, dict):
                cfg.update({k: v for k, v in user.items() if v is not None})
        except (json.JSONDecodeError, OSError):
            pass
    return cfg


def normalize_amount(value, cfg: dict) -> tuple[float | None, str | None]:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None, "Укажите сумму поддержки."
    if amount != amount or amount <= 0:
        return None, "Укажите сумму поддержки."
    min_amount = float(cfg.get("min_amount") or 50)
    max_amount = float(cfg.get("max_amount") or 100000)
    if amount < min_amount:
        return None, f"Минимальная сумма — {int(min_amount)} ₽."
    if amount > max_amount:
        return None, f"Максимальная сумма — {int(max_amount)} ₽."
    rounded = round(amount, 2)
    if rounded == int(rounded):
        return float(int(rounded)), None
    return rounded, None


def yoomoney_url(wallet: str, amount: float, label: str = "planer") -> str:
    sum_text = f"{amount:.2f}".rstrip("0").rstrip(".")
    params = {
        "receiver": wallet.strip(),
        "quickpay-form": "donate",
        "targets": "Поддержка Планера",
        "sum": sum_text,
        "label": label,
    }
    return "https://yoomoney.ru/quickpay/confirm.xml?" + urlencode(params)


def sbp_copy_text(cfg: dict, amount: float | None = None) -> str:
    phone = (cfg.get("sbp_phone") or "").strip()
    name = (cfg.get("sbp_name") or "").strip()
    lines = ["Поддержка проекта Планер"]
    if amount is not None:
        amount_text = str(int(amount)) if amount == int(amount) else str(amount)
        lines.append(f"Сумма: {amount_text} ₽")
    if phone:
        lines.append(f"СБП: {phone}")
    if name:
        lines.append(f"Получатель: {name}")
    return "\n".join(lines)
