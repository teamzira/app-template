/**
 * Stands in for `@/lib/teambridge/router`. Inside Teambridge, opening a record shows the host's
 * record panel; the preview has no host, so it says what would open instead.
 */
export function useOpenRecord() {
  return {
    openRecord: (recordId: string) => {
      window.dispatchEvent(new CustomEvent('preview:open-record', { detail: recordId }));
    },
  };
}

export const isRecordId = (id: string) => Boolean(id);
