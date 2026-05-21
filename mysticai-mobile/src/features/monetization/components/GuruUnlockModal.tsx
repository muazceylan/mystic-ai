import React from 'react';
import { ActionUnlockSheet } from './ActionUnlockSheet';

interface GuruUnlockModalProps {
  visible: boolean;
  moduleKey: string;
  actionKey: string;
  contentKey?: string;
  onUnlocked: () => void;
  onDismiss: () => void;
  onShowAdOffer?: () => void;
  onShowPurchase?: () => void;
}

export function GuruUnlockModal({
  visible,
  moduleKey,
  actionKey,
  contentKey,
  onUnlocked,
  onDismiss,
  onShowPurchase,
}: GuruUnlockModalProps) {
  return (
    <ActionUnlockSheet
      visible={visible}
      moduleKey={moduleKey}
      actionKey={actionKey}
      contentKey={contentKey}
      onUnlocked={onUnlocked}
      onClose={onDismiss}
      onShowPurchase={onShowPurchase}
    />
  );
}
