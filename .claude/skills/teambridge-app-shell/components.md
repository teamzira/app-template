# App building blocks

Every pattern an app page needs, mapped to the one Alloy component that draws it. Apps built so far
each drew their own version of the same thing (three stat-card styles, five ways to show a status),
so a page that follows this file looks like every other app without anyone comparing them.

Paths are under `@teamzira/alloy/components/` (source in `node_modules/@teamzira/alloy/src/components/`). Read the component's `.tsx` before writing props.
The sample apps are working examples: `samples/timesheet` (no nav), `samples/client-portal`
(tabs, pink), `samples/job-orders` (tabs, purple), `samples/scheduling` (sidebar with a folder,
a calendar tool page) and `samples/staffing` (sidebar, green), all in `teamzira/app-template`.

## Pattern → component

| On the page                                                         | Use                                                                                                                | Instead of                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| A number with a label (overdue, due this week)                      | `statCard/AlloyStatCard`                                                                                           | Gradient or tinted tiles (a colour per metric), coloured top borders, icon circles beside the number |
| A box around a group of content                                     | `<section className="alloy-chart-card">` (Alloy's card chrome)                                                     | Hand-rolled `border rounded-xl p-6`, shadows, coloured left or top borders                           |
| A list of records (people, steps, reqs)                             | `listItem/AlloyListItem` rows in a `CardList`, inside one card                                                     | Custom `<div>` rows, each row its own card                                                           |
| A person                                                            | `avatar/AlloyAvatar` (`name` makes the initials)                                                                   | Coloured circles with hand-written initials                                                          |
| A status (Overdue, Not started, Done)                               | `tags/AlloyStatusTag`                                                                                              | Filled red or grey buttons, red "35 days late" text, coloured dots before text                       |
| A category or type (Compliance, Frontline)                          | `tags/AlloyTag` with `color={AlloyColor.GREY}`                                                                     | One colour per category                                                                              |
| A count beside a label                                              | `badge/AlloyBadge`                                                                                                 | Pink number pills                                                                                    |
| Changing a status                                                   | `dropdown/AlloyDropdown` on an `AlloyButton style="tertiary"`, status shown with `AlloyStatusTag`                  | A full-colour select per row                                                                         |
| A title over a group                                                | `sectionHeader/AlloySectionHeader size="m"`                                                                        | Uppercase coloured labels, icons before titles                                                       |
| A greeting with the date, or an announcement, atop the landing page | `AppBanner` (see the skill's Banner rules)                                                                 | Hero panels, gradient welcome cards                                                                  |
| A notice or warning                                                 | `alert/AlloyAlert`                                                                                                 | Tinted boxes with an icon                                                                            |
| A breakdown (by stage, by location)                                 | `barList/AlloyBarList`                                                                                             | Hand-drawn segmented bars                                                                            |
| A trend (+3.1%)                                                     | `valueChangeLabel/AlloyValueChangeLabel` or `AlloyStatCard`'s `deltaPct`                                           | Arrows and red or green text                                                                         |
| A table of records                                                  | `table/AlloyTable`                                                                                                 | Grids of divs                                                                                        |
| Show and hide a group ("Coming up (10)")                            | `collapsibleSection/AlloyCollapsibleSection`                                                                       | Custom chevron toggles                                                                               |
| Switch views of one list (Upcoming / Calendar)                      | `segmentedControl/AlloySegmentedControl`                                                                           | Pill buttons                                                                                         |
| A divider                                                           | `divider/AlloyDivider`                                                                                             | `border-t` on a div                                                                                  |
| An action                                                           | `buttons/AlloyButton`: `primary` for the page's one main action, `tertiary` for row actions, `float` for icon-only | Coloured or outlined buttons styled by hand                                                          |

## Rules

**Colour means status, and status comes only from `AlloyStatusTag`.** Map every state to a
`TagStatus` once and reuse it: `NEGATIVE` for overdue or failed, `WARNING` for at risk, `PENDING`
for in progress, `INACTIVE` for not started, `POSITIVE` for done. Categories, teams and locations
stay grey. The account accent appears only on primary buttons, the selected tab or sidebar row,
and links.

**One card.** `alloy-chart-card` is the only card: hairline border (`--color-border-opaque`), 12px
corner, 20px padding, white. No shadows, gradients, tinted backgrounds or coloured edges. Cards
don't nest. A list is one card with rows, not a card per row, and the one thing that breaks the
card's padding (below).

**List rows.** Leading: an avatar or a 20px icon, never both. Title, then one detail line (`·`
between parts), then any category tag under it. Trailing: one status tag and at most one action, so
the text keeps its width on a phone. The row opens the record (`?rid=` in the app template); a
chevron is the only "go" signal.

**A list in a card.** The rows run edge to edge: wrap them in `CardList` and give each
`AlloyListItem` `{...cardRow(size)}` (`components/app-shell/card-list.tsx`).

- The list reaches the card's sides and bottom: a row's hover and divider span the card's full
  width, and the card has no padding under the last row. The list's bottom corners follow the
  card's, so the last row's hover doesn't square them off.
- The row's content keeps the card's 20px gutter, so avatars and labels line up with the card's
  title.
- The last row has no divider (`divider={index < rows.length - 1}`): the card's border is its edge.
- An empty list is one line of `text-alloy-slate-500` in the card's normal padding, not an empty
  `CardList`.

**Stat cards.** One row of 2–4 `AlloyStatCard`s at the top of a page, two per row on a phone.
Default `accent` is `slate`. Use `red`, `orange` or `yellow` only when the number is a problem
worth acting on. `title` is the label; put the period (`This week`) in `subtitle`, not in the number.

**Icons.** Alloy icons only, imported per call site from `@teamzira/alloy/icons-js/<Category>/<Name>Icon`. 16px in rows, tags and buttons,
20px in stat tiles and empty states. No icon before a section title, and no tinted circles around
icons outside `AlloyStatCard`.

**Type.** Page title from `AppPage`, group titles from `AlloySectionHeader size="m"`, body
text from `alloy-paragraph-m`, secondary text `alloy-paragraph-s text-alloy-slate-500`. No
uppercase labels, no letter-spacing, no coloured headings.

**Empty, loading, error.** Empty: one line in `text-alloy-slate-500` inside the card where the list
would be ("No steps due this week"). Loading: skeleton rows in the card. Error: `AlloyAlert
variant="error"` with what to do next.

## Tool pages: calendars and schedules

A month calendar or schedule is a `width="full"` page, usually with a side panel.

- **Filter bar:** the period stepper (‹ Today ›, then the period's label, e.g. "November 2026")
  first, then `AlloySelectField` filters (location, assignee). The period label lives here, not
  as the page title or an eyebrow; the title names the tool ("Clinic schedule").
- **Stats:** one row of `AlloyStatCard`s above the grid, bordered like every other stat row
  (the default, not `elevated`), not tiles squeezed beside the title.
- **Event chips:** white with a hairline border, time and title, and the status as a dot plus a
  count (`2/3`), coloured like `AlloyStatusTag`. No colour per location or per type: the chip's
  colour would compete with its status. "+N more" opens the day.
- **Legend:** a row of `AlloyStatusTag`s under the grid, the same labels the dots mean.
- **Settings for the tool** ("Arrival rules") are a Settings section or a page action, never a
  link in the tab row.

## Not in Alloy yet

Being built in Alloy. Until each lands, build the stand-in from Alloy parts, named for it, and
swap it in when it ships (see the skill's "Alloy is the default").

| Piece                                  | For                                                            | Stand-in until then                                                                            |
| -------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `AlloyCalendarMonth` + event chip slot | Month grids with day cells, today marker, "+N more"            | A 7-column grid of `alloy-chart-card`-bordered cells, chips as above                           |
| `AlloyPeriodStepper`                   | ‹ Today › with the period label (day, week, month, pay period) | Two `AlloyButton style="float" iconOnly` around a `tertiary` "Today", label in `alloy-label-l` |
| `AlloyProgressBar`                     | "3 of 21 done", "Filled 98%"                                   | Text ("3 of 21 done", "98% filled"); no hand-drawn bar                                         |
| Inline status picker                   | Changing a row's status in place                               | `AlloyDropdown` on an `AlloyButton style="tertiary"`, status shown with `AlloyStatusTag`       |
