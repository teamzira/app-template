"use client";

import AlloyButton from "@teamzira/alloy/components/buttons/AlloyButton";
import AlloyCallout from "@teamzira/alloy/components/callout/AlloyCallout";
import PlusIcon from "@teamzira/alloy/icons-js/General/PlusIcon";

/**
 * Smoke test for the @teamzira/alloy integration.
 *
 * AlloyCallout imports its status icon internally via Vite's `?react` syntax,
 * so rendering it exercises the Turbopack icon rewrite wired by withAlloy.
 * AlloyButton takes icons as props; PlusIcon comes from the pre-bundled
 * `icons-js` modules (the documented Next/webpack import path).
 */
export default function AlloyDemoPage() {
  return (
    <main className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Alloy demo</h1>
      <AlloyCallout variant="info">
        Rendered from <code>@teamzira/alloy</code>.
      </AlloyCallout>
      <AlloyButton
        label="Add item"
        leadingIcon={<PlusIcon.Raw />}
        onClick={() => window.alert("clicked")}
      />
    </main>
  );
}
