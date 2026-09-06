import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Theme } from '../theme';

export function BottomSheet({
  visible,
  onClose,
  theme,
  snapPoints = ['55%', '92%'],
  children,
}: {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
}) {
  const ref = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  // Tracks whether *we* believe the modal is currently presented. gorhom's
  // BottomSheetModal.dismiss() permanently stalls the modal (it silently
  // stops rendering content, even on a later present()) if it's called
  // while the modal isn't in a clean "presented" state - which happens both
  // on initial mount (never presented yet) and, without this guard, a
  // second time right after the user swipes/taps the sheet closed: gorhom's
  // own onDismiss fires, we update `visible`, and that re-runs this effect,
  // which would call dismiss() again on a modal that already finished
  // closing itself.
  const isPresentedRef = useRef(false);
  const memoSnapPoints = useMemo(() => snapPoints, [snapPoints.join(',')]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      isPresentedRef.current = true;
      ref.current?.present();
    } else if (isPresentedRef.current) {
      isPresentedRef.current = false;
      ref.current?.dismiss();
    }
  }, [visible]);

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={handleDismiss}
      index={0}
      snapPoints={memoSnapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
    >
      {children}
    </BottomSheetModal>
  );
}
