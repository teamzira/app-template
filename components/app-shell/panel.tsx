import type { ReactNode } from 'react';
import AlloySectionHeader from '@teamzira/alloy/components/sectionHeader/AlloySectionHeader';

export type AppPanelProps = {
  title: string;
  /** One plain sentence on what the panel does. */
  description?: string;
  children: ReactNode;
  /** The panel's action buttons, under its body. */
  footer?: ReactNode;
};

/**
 * The one side panel a page may have: a working tool beside the content (a builder, an
 * inspector), in Alloy's card chrome. It stays in view while the content scrolls on wide screens
 * and drops below the content on narrow ones.
 */
export function AppPanel({ title, description, children, footer }: AppPanelProps) {
  return (
    <aside aria-label={title} className="alloy-chart-card w-full shrink-0 lg:sticky lg:top-4 lg:w-90">
      <AlloySectionHeader title={title} subtitle={description} size="m" titleAs="h3" />
      <div className="flex flex-col gap-4">{children}</div>
      {footer && <div className="flex flex-col gap-2">{footer}</div>}
    </aside>
  );
}
