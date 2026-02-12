# /parsing-runs/[runId] — поиск доменов + тема (Light/Dark)

## Цель

- Сделать блок поиска "Поиск по домену…" **на всю ширину** контентной области на странице `/parsing-runs/[runId]`.
- Сделать поиск и dropdown фильтров **theme-aware** (light/dark) без жёстко заданного чёрного/неонового оформления.
- Добавить глобальный переключатель темы в верхний navbar и обеспечить **сохранение темы** после обновления страницы.

## Что было (Before)

- Поиск выглядел как чёрная «светящаяся капсула» на светлом фоне и визуально выбивался из дизайна.
- Dropdown/поверхности имели неуниверсальные цвета.
- Переключателя темы в navbar не было (или тема не была подключена глобально).

## Что стало (After)

- Блок поиска переразложен на `flex`:
  - Поиск — `flex-1`, занимает всю доступную ширину.
  - Справа на десктопе: сортировка + кнопка "Выбрать все (N)".
  - На маленьких экранах элементы аккуратно переносятся вниз.
- Dropdown фильтров поиска использует theme-aware токены:
  - `bg-popover`, `text-popover-foreground`, `border-border`, `bg-accent`.
- В navbar добавлена кнопка "Переключить тему" (next-themes), тема сохраняется после refresh.

## Скриншоты

- Light (dropdown открыт): `parsing-runs-search-light.png`
- Dark (dropdown открыт): `parsing-runs-search-dark.png`

## Чеклист acceptance criteria

- [x] Search bar full width внутри контентного контейнера `/parsing-runs/[runId]`.
- [x] Light theme: светлая поверхность поиска + тонкий border, без неонового glow.
- [x] Dark theme: тёмная поверхность поиска + тонкий border, без неонового glow.
- [x] Theme toggle в navbar присутствует.
- [x] Theme toggle сохраняется после refresh (проверено: `html` содержит класс `dark` после reload).
- [x] Dropdown фильтров theme-aware (без хардкодного чёрного фона).

## Технические детали

- Реализация темы: `next-themes` через `components/theme-provider.tsx` + подключение в `app/layout.tsx`.
- Toggle: `components/navigation.tsx`.
- Поиск: `components/ui/uiverse-search-input.tsx` и блок на странице `app/parsing-runs/[runId]/page.tsx`.
