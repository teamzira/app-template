/**
 * Teambridge's header above an open app (z-web-rome's ExternalAppFullScreen and PageHeaderBar):
 * back to Apps, the app's name, and Feedback and Help, drawn by the host and not by the app.
 * The preview has no host, so it draws the same bar, and the buttons say where they'd go.
 */
import AlloyButton from '@teamzira/alloy/components/buttons/AlloyButton';
import ArrowLeftIcon from '@teamzira/alloy/icons-js/Arrows/ArrowLeftIcon';
import AnnotationIcon from '@teamzira/alloy/icons-js/Communication/AnnotationIcon';
import HelpCircleIcon from '@teamzira/alloy/icons-js/General/HelpCircleIcon';

const note = (message: string) => window.dispatchEvent(new CustomEvent('preview:note', { detail: message }));

export function HostHeader({ appName }: { appName: string }) {
  return (
    <div
      role="region"
      aria-label={appName}
      className="flex min-h-12 shrink-0 items-center justify-between gap-3 bg-white pr-2 pl-3"
    >
      <div className="flex min-w-0 items-center gap-1">
        <AlloyButton
          style="float"
          size="small"
          iconOnly
          aria-label="Back to Apps"
          leadingIcon={<ArrowLeftIcon.Raw />}
          onClick={() => note('In Teambridge, this goes back to the Apps page.')}
        />
        <h1 className="m-0 min-w-0 truncate alloy-label-m text-alloy-mono-1000">{appName}</h1>
      </div>
      {/* Teambridge leaves Feedback and Help off on a phone, where they'd crowd the bar. */}
      <div className="hidden items-center gap-3 md:flex">
        <AlloyButton
          style="float"
          size="small"
          label="Feedback"
          leadingIcon={<AnnotationIcon.Raw />}
          onClick={() => note('In Teambridge, this opens the feedback board.')}
        />
        <AlloyButton
          style="float"
          size="small"
          label="Help"
          leadingIcon={<HelpCircleIcon.Raw />}
          onClick={() => note('In Teambridge, this opens the help drawer.')}
        />
      </div>
    </div>
  );
}
