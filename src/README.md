# Планер (исходники)

В корне проекта — только **`Planer.exe`**.

## Защита

- Лицензионный ключ (offline) — `license.py`, `generate_key.py`
- Шифрование данных и бэкапов — `app.js`
- Минификация JS при сборке — `bundle.py`

## Сборка

```bat
build.bat
```

## Генерация ключа

```bat
python generate_key.py customer-001
```
