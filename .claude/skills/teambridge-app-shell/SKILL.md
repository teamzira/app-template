---
name: teambridge-app-shell
description: Lay out a Teambridge app built from this template with the standard shell — a sidebar, tab or no nav chosen in app/app-config.ts, the account's accent colour, one page frame (AppPage) with the same width, gutter and title everywhere, one optional banner and side panel, and Alloy components for everything inside. Use when building or restyling any page of this app, choosing sidebar, tabs or no nav, setting the account colour, building a calendar or schedule page, or when asked to make the app "look consistent", "use the same padding/title" or "use Alloy".
---

# Teambridge app shell

Every app on the Apps page used to draw its own header, padding, title, nav and cards, so no two
looked alike. This skill fixes what every app shares and leaves one choice open: the nav.

Code: `components/app-shell/`. Config: `app/app-config.ts`. Run it with `yarn dev` (dev mode, see
the README); the layout works without the host, but the record panel and URL sync need it.

## Alloy is the default

Every element the app draws is an Alloy component (`@teamzira/alloy`), styled with Alloy tokens
(`alloy-*` colours and type utilities) and Alloy icons. Not the shadcn primitives in
`components/ui/` (they stay for the setup page only), not lucide, not hand-rolled markup.

- **Components:** `import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton'` —
  one file per import; there's no barrel. Read the component's `.tsx` (in
  `node_modules/@teamzira/alloy/src/components/`) before writing props: they're often not what
  you'd guess (`AlloyButton` takes `style`, not `variant`).
- **Icons:** `import ClockIcon from '@teamzira/alloy/icons-js/Time/ClockIcon'` — the Next.js
  path, named `<PascalName>Icon` by category folder. `<ClockIcon size={16} />` is the wrapped form;
  `<ClockIcon.Raw />` goes where the parent owns the slot (`AlloyButton`'s `leadingIcon`, a list
  row's `leadingSlot`). Sizes 12, 14, 16, 20, 24, 32.
- **Type and colour:** one `alloy-*` typography class per text element (`alloy-paragraph-m`,
  `alloy-label-s`); `alloy-*` colour tokens (`text-alloy-slate-500`). No hex, no arbitrary colours.

When Alloy has no component for the job:

1. Check [components.md](components.md) → "Not in Alloy yet": some pieces are being built, and it
   says what to use until they land.
2. Otherwise build the smallest stand-in in the app, from Alloy components and tokens only, named
   for the Alloy piece it waits for (`CalendarMonth` for `AlloyCalendarMonth`), with a one-line
   comment saying so. It follows every rule here, so swapping it out later changes no layout.
3. List each stand-in in the PR, so the gap gets built in Alloy once, not per app.

Never restyle an Alloy component from the outside to get a look it doesn't offer; that's a
request for Alloy. (The account accent is the one sanctioned exception, and the shell owns it.)

## The frame

Teambridge draws the header above the app's iframe: back button, the app's name, Feedback and
Help. The app never draws its own header, title bar, logo, breadcrumbs or back link. Inside the
iframe there are two layers, nav and page:

```
Sidebar                                     Tabs, or none
┌────────────┬──────────────────────────┐   ┌──────────────────────────────────────┐
│ Section    │  Page title     [actions]│   │   Page title               [actions] │
│ Section    │  Description             │   │   Section  Section  Section          │
│ ▾ Folder   │                          │   │   ─────────────────────────────────  │
│   Section  │  content                 │   │   content of the selected tab        │
│ ────────── │                          │   │                                      │
│ Settings   │                          │   │                                      │
└────────────┴──────────────────────────┘   └──────────────────────────────────────┘
```

- **Nav** — `AppShell` (in `app/layout.tsx`) draws it from `app/app-config.ts`. Sections are
  routes: each has an `href`, and the current one comes from the URL, so reloads and shared links
  land on it.
- **Page** — every page renders one `AppPage`: a centred column at the template's content width
  (`max-w-6xl`), 40px padding (16px on a phone), `gap-5` between blocks, and the title as an
  `AlloySectionHeader` `<h2>` (Teambridge's header holds the `<h1>`) with an optional one-sentence
  description and actions. In a tabs app the tabs sit under the title.

```ts
// app/app-config.ts
export const appConfig: AppShellConfig = {
  navStyle: 'sidebar',
  accent: 'pink',
  sections: [
    { href: '/', label: 'Overview', icon: Home03Icon },
    { href: '/schedule/', label: 'Schedule', icon: CalendarIcon },
    { key: 'reports', label: 'Reports', icon: BarChart10Icon, sections: [
      { href: '/reports/hours/', label: 'Hours report' },
      { href: '/reports/pay/', label: 'Pay report' },
    ] },
  ],
};
```

```tsx
// app/schedule/page.tsx
<AppPage title="Schedule" description="Shifts for the week." actions={<AlloyButton style="primary" size="medium" label="New shift" />}>
  …
</AppPage>
```

Pass each icon as the component (`CalendarIcon`), not an element: the sidebar draws `.Raw`, a
tab the 16px form. Settings is added by the shell when the deployment can save settings: at the
foot of the sidebar, last among tabs, or as a gear beside a one-page app's title.

## Choosing the nav

| Pick      | When                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `none`    | One page: a single list, board or form, with nothing to switch between                                 |
| `tabs`    | 2–6 sections, all peers, short labels; the content wants the full width (tables, boards, calendars)    |
| `sidebar` | 5+ sections, or sections that will keep growing; people jump between sections all day                   |

- **Tabs app:** the title block stays the same on every tab. Give each tab route the same
  `AppPage` title and actions (put them in one small component the routes share), so switching tabs
  changes only the content. The title names the app's area ("Dashboard"), never the app again.
- **Sidebar app:** each section's page is titled with the section's name.
- **Phone:** a sidebar shows as tabs under the title, which Alloy collapses into a dropdown.
  Don't build a separate mobile nav.
- **Folders (sidebar only):** `{ key, label, icon, sections }`, one level deep, two or more
  sections each. Sections in a folder show no icon; name each to make sense alone ("Pay report",
  not "Pay"), since a phone lists them flat. A tabs app has no folders.
- One nav only. A section that needs sub-views uses a segmented control inside its page.

## Account colour

Set `accent` in `app/app-config.ts` to the nearest Alloy hue to the account's brand (its logo or
site); ask if it isn't clear.

| `accent`  | Fill                    | White text contrast |
| --------- | ----------------------- | ------------------- |
| `default` | Alloy black (mono-1000) | —                   |
| `blue`    | blue-600                | 6.7:1               |
| `azure`   | azure-600               | 6.6:1               |
| `purple`  | purple-600              | 7.4:1               |
| `pink`    | pink-600                | 5.1:1               |
| `red`     | red-600                 | 5.6:1               |
| `orange`  | orange-700              | 5.6:1               |
| `green`   | green-700               | 6.9:1               |

- It recolours only **primary `AlloyButton`s** and the **selected tab's underline**. Buttons with a
  semantic `accent` (`destructive`, `affirmative`) keep their own colour; disabled ones stay grey.
  Alloy dialogs and menus portalled outside the shell keep Alloy black.
- **Links** use the same colour with `text-(--app-accent)`.
- Never use the accent for backgrounds, stripes, gradients or headings. No exact brand hex;
  yellow and matcha brands use `default`.

## Page rules

- **Every page is one `AppPage`.** No padding, max width or background around it or inside its root.
- **Width:** `standard` (default) for dashboards, lists and tables; `readable` (`max-w-4xl`) for
  forms; `full` for tool pages whose grid needs every column (a month calendar, a schedule).
- **Side panel** (`panel`): at most one, for a working tool beside the content (a builder, an
  inspector). `{ title, description, children, footer }`; 360px, kept in view on wide screens,
  below the content under 1024px. Not for navigation, filters, stats or help. Usually `width="full"`.
- **Actions:** buttons for the whole page, primary last, `size="medium"`.
- **Inside the page, build only from the blocks in [components.md](components.md).**
- **States:** handle loading (`loading.tsx` with skeletons inside an `AppPage`), errors and empty
  results inside the page; never a blank page. Error copy never says the app can't reach Teambridge.

## Banner

One optional `AppBanner`, the first block of the landing page, above the stat row.

```tsx
<AppBanner kind="greeting" name={firstName} summary="3 shifts still need someone." />
<AppBanner kind="announcement" title="Holiday pay changes on December 1" message="Shifts on company holidays pay 1.5x." action={<AlloyButton style="tertiary" size="small" label="View schedule" />} />
```

- **Greeting:** date and "Good afternoon, {name}", written in the browser's time; `summary` is one
  sentence from data the page already shows, or nothing.
- **Announcement:** something people must know or act on (a policy change, a deadline). Keep its
  text in the app's data, not hard-coded. Not for marketing or tips. It replaces the greeting.
- No other banner, hero or welcome card, ever.

## Allowed elements — nothing else

| Region            | May contain                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| Nav (shell)       | Section rows, folders or tabs from `app-config.ts`; Settings                         |
| Page title block  | `title` (text), `description` (one plain sentence), `actions` (buttons, a select)   |
| Banner            | `AppBanner` only, first block of the landing page                                    |
| Filter bar        | First block of the content: `AlloySelectField`s, a search field, a date range, export |
| Side panel        | `AppPage` `panel` only                                                               |
| Content           | The Alloy blocks in [components.md](components.md)                                   |

**Banned, wherever it would go:** a header, logo, account or app name, user card or "Powered by"
line inside the app; "MENU" labels or plain group headings in the sidebar (use a folder); icon
tiles or emoji beside the title; badges or dates beside the description; eyebrows, stripes,
gradients, tinted cards, shadows, illustrations or background images; any banner but `AppBanner`;
breadcrumbs, back links or a second nav; a different width or gutter per page; `min-h-screen`.

## Data

Pages read real records through the template's Teambridge client (see AGENTS.md → "Data access").
Never ship placeholder or invented records: if the account lacks the data a page needs, show the
page's empty state and say which collection or field is missing.
