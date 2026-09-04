"use client";

import { useTranslation } from "@/hooks/useLanguage";
import UnifiedModal from "@/components/ui/UnifiedModal";

export default function AnnouncementModal({ message, open, onClose }) {
  const { t } = useTranslation();
  return (
    <UnifiedModal
      open={open}
      role="alertdialog"
      title={t("admin.operations.announcementTitle")}
      description={message}
      closeLabel={t("notifications.close")}
      confirmLabel={t("admin.common.ok")}
      onClose={onClose}
      onConfirm={onClose}
      singleAction
    />
  );
}
