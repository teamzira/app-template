/**
 * Stands in for `@/lib/teambridge/router`. Inside Teambridge, opening a record shows the host's
 * record panel; the preview has no host, so it says what would open instead.
 */
export function useOpenRecord() {
  return {
    openRecord: (_recordId: string) => {
      window.dispatchEvent(
        new CustomEvent('preview:note', { detail: 'In Teambridge, this opens the record in its own detail panel.' })
      );
    },
  };
}

export const isRecordId = (id: string) => Boolean(id);
