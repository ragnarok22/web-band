import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { ServiceWorkerUpdate } from "@/components/providers/service-worker-update";
import { StorageWarning } from "@/components/providers/storage-warning";

export function AppNotifications() {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-xl flex-col gap-3 lg:right-4 lg:bottom-4 lg:left-auto lg:mx-0 lg:w-full">
      <SectionErrorBoundary section="storage warning" variant="silent">
        <StorageWarning />
      </SectionErrorBoundary>
      <SectionErrorBoundary section="update notice" variant="silent">
        <ServiceWorkerUpdate />
      </SectionErrorBoundary>
    </div>
  );
}
