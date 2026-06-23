# Alloy components reference (for agents)

Real components from the **`@teamzira/alloy`** package, for the cases the shadcn
replica in `components/ui/` doesn't cover. Add this file as a v0 **Source** (and
it's read automatically by Claude/Cursor in-repo).

## When to use these vs shadcn

**Prefer a real Alloy component first** whenever one fits — it's the actual
design system. This includes the no-shadcn-equivalent patterns below (segmented
control, trend/delta label, eyebrow, collapsible section, rich list row, color
tag), and the package also ships its own button, dialog, table, tabs, checkbox,
select, etc. (`@teamzira/alloy/components/*`) if you want the exact Alloy
component rather than the token-styled shadcn one.

**Fall back to shadcn (`components/ui/`)** when Alloy has no equivalent — most
generic form/layout primitives — or when a build can't install the private
package. shadcn is styled on-brand via the Alloy tokens, so it stays consistent.

## Prerequisites

- **The package is not installed by default — opt in first:** run
  **`./scripts/enable-alloy.sh`** (installs `@teamzira/alloy`, wires
  `globals.css` + `next.config.ts`). It needs a `read:packages` token
  (`gh auth refresh -s read:packages`). After that, the fork's Vercel deploy
  needs `NODE_AUTH_TOKEN` (the script reminds you).
- Icons passed to `leadingIcon` come from the pre-bundled set and use `.Raw`:
  `import StarIcon from '@teamzira/alloy/icons-js/General/StarIcon'` → `<StarIcon.Raw />`.

---

## AlloySegmentedControl

Pill toggle between 2–4 mutually exclusive views. No shadcn equivalent.

```tsx
import { AlloySegmentedControl } from '@teamzira/alloy/components/segmentedControl/AlloySegmentedControl'

<AlloySegmentedControl value={view} onChange={setView} size="md">
  <AlloySegmentedControl.Item value="list">List</AlloySegmentedControl.Item>
  <AlloySegmentedControl.Item value="board">Board</AlloySegmentedControl.Item>
</AlloySegmentedControl>
```

- **Root** (named export, compound): `value?`, `defaultValue?`, `onChange?(value: string)`, `size?: 'sm' | 'md' | 'lg'` (default `'md'`), `disabled?`, `fullWidth?`.
- **`.Item`**: `value: string` (required), `leadingIcon?` (`.Raw` icon), children = label.

## AlloyValueChangeLabel

Trend/delta label (arrow + color) or a colored status text. No shadcn equivalent.

```tsx
import { AlloyValueChangeLabel } from '@teamzira/alloy/components/valueChangeLabel/AlloyValueChangeLabel'

<AlloyValueChangeLabel mode="trend" trend="up" value="12%" />          {/* arrow + auto color */}
<AlloyValueChangeLabel mode="text" severity="warning" value="Pending" />
```

Discriminated union on `mode` (named export):
- `mode="trend"`: `value: string`, `trend: 'up' | 'down'`, `severity?: 'positive' | 'warning' | 'negative'` (defaults from trend).
- `mode="text"`: `value: string`, `severity: 'positive' | 'warning' | 'negative'` (required).

## AlloyEyebrow

Small overline/label above a heading; optionally an accordion toggle. No shadcn equivalent.

```tsx
import AlloyEyebrow from '@teamzira/alloy/components/eyebrow/AlloyEyebrow'

<AlloyEyebrow>Team summary</AlloyEyebrow>
<AlloyEyebrow accordion defaultOpen onOpenChange={setOpen}>Details</AlloyEyebrow>
```

- Default export. Props: `children`, `as?` (element tag, default `'span'`), `accordion?` (default `false`), `open?`, `defaultOpen?`, `onOpenChange?(open: boolean)`, `className`, `id`, `aria-label`, `aria-controls`.

## AlloyCollapsibleSection

Titled show/hide section with a chevron. (shadcn collapsible isn't installed here.)

```tsx
import AlloyCollapsibleSection from '@teamzira/alloy/components/collapsibleSection/AlloyCollapsibleSection'

<AlloyCollapsibleSection title="Advanced options" defaultOpen={false}>
  <FieldGroup />
</AlloyCollapsibleSection>
```

- Default export. Props: `title: ReactNode`, `children`, `defaultOpen?`, `maxHeight?: number`, `renderDivider?`, `headingClassName?`, `dividerClassName?`.

## AlloyListItem

Rich list row — leading slot, label + description, up to 3 trailing slots, optional checkbox/accordion/badge. Richer than anything in shadcn.

```tsx
import AlloyListItem from '@teamzira/alloy/components/listItem/AlloyListItem'

<AlloyListItem
  label="Jane Doe"
  description="Day shift · 8h"
  leadingSlot={<Avatar src={url} />}
  trailingSlot={<span className="text-muted-foreground">$240</span>}
  size="medium"
  interactive
  onClick={openDetail}
/>
```

- Default export. Key props: `label: ReactNode` (required), `description?`, `leadingSlot?`, `trailingSlot?` (1–3 nodes via a fragment), `accordion?` + `accordionPosition?: 'leading' | 'trailing'` + `expanded?` + `onToggleExpand?`, `checked?` / `defaultChecked?` / `onCheckedChange?`, `badgeCount?`, `badgeLabel?`, `divider?`, `size?: 'xs' | 'small' | 'medium' | 'large'`, `interactive?`, `selected?`, `destructive?`. Forwards `onClick` and standard element props.

## AlloyTag

Colored tag/chip, optionally removable. (shadcn `Badge` exists but is single-color and not removable — use AlloyTag when you need the Alloy color palette or a remove affordance.)

```tsx
import AlloyTag from '@teamzira/alloy/components/tags/AlloyTag'

<AlloyTag label="Urgent" color="red" size="medium" />
<AlloyTag label="Owner" color="blue" onRemove={() => remove(id)} />
```

- Default export. Props: `label: string` (required), `color` (required — an Alloy color token: `blue` | `azure` | `purple` | `pink` | `red` | `orange` | `yellow` | `matcha` | `green` | `slate` | `grey`, or a raw hex string), `size?: 'small' | 'medium' | 'large'`, `leadingIcon?` (`.Raw` icon), `onRemove?` (renders an × when provided).

---

> Keep this in sync with the package — if a prop signature here drifts from
> `@teamzira/alloy`, v0 will generate against stale APIs. Regenerate from the
> package source when bumping the Alloy version.
