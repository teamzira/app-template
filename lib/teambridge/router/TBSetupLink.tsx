'use client';

import { useSyncExternalStore, type ComponentProps, type MouseEvent } from 'react';

const isEmbedded = () => window.parent !== window;
const noSubscription = () => () => {};

/**
 * Opens this app's setup review in Teambridge's App Library, where an admin
 * maps what the app needs (its install manifest) to the account's own
 * collections and fields.
 *
 * The review is a page of the Teambridge host, not of this app: the host
 * sandboxes the iframe without top navigation, and `TBRouter`'s messages only
 * move within the app's own `/apps/<slug>` path. So this asks the host with a
 * `tb:setup` message, and the host opens the review of whichever app sent it.
 * Once an admin has saved there, Teambridge's "Open" brings them back to the
 * app.
 *
 * Renders a button; give it the look of a link or a `Button asChild`. Outside
 * Teambridge (standalone dev mode) there is no host to ask, so it renders its
 * children as plain text.
 */
export function TBSetupLink({
  children,
  onClick,
  ...props
}: Omit<ComponentProps<'button'>, 'type'>) {
  const embedded = useSyncExternalStore(noSubscription, isEmbedded, () => false);
  if (!embedded) return <span>{children}</span>;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // The message carries nothing but its type, so any parent origin may read it.
    window.parent.postMessage({ type: 'tb:setup' }, '*');
  };

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
