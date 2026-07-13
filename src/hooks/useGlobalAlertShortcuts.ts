/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { SlackAlert } from '../types';

export function useGlobalAlertShortcuts(
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
  onAlertAction: (id: string, action: 'acknowledged' | 'resolved') => Promise<void>,
  alerts: SlackAlert[]
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut when typing in inputs/textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // [A] key for Bulk Acknowledge
      if (key === 'a') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const targetIds = Array.from(selectedIds);
          // Only bulk process those that are pending
          const pendingIds = targetIds.filter(id => {
            const match = alerts.find(a => a.id === id);
            return match && match.status === 'pending';
          });

          if (pendingIds.length > 0) {
            Promise.all(pendingIds.map(id => onAlertAction(id, 'acknowledged')))
              .then(() => {
                setSelectedIds(new Set());
              })
              .catch(err => {
                console.error('Bulk acknowledge shortcut failed:', err);
              });
          }
        }
      }

      // [R] key for Bulk Resolve
      if (key === 'r') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const targetIds = Array.from(selectedIds);
          // Only bulk process those that are not resolved
          const unresolvedIds = targetIds.filter(id => {
            const match = alerts.find(a => a.id === id);
            return match && match.status !== 'resolved';
          });

          if (unresolvedIds.length > 0) {
            Promise.all(unresolvedIds.map(id => onAlertAction(id, 'resolved')))
              .then(() => {
                setSelectedIds(new Set());
              })
              .catch(err => {
                console.error('Bulk resolve shortcut failed:', err);
              });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, setSelectedIds, onAlertAction, alerts]);
}
