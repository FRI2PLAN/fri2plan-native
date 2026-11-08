/**
 * useOfflineExecutor — Enregistre l'exécuteur de mutations tRPC
 *
 * Ce hook doit être appelé dans un composant qui a accès aux mutations tRPC.
 * Il enregistre la fonction d'exécution dans le OfflineContext pour que
 * le replay automatique fonctionne à la reconnexion.
 *
 * Usage (dans AppNavigator ou un composant racine authentifié) :
 *   useOfflineExecutor();
 */

import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { noteScope, noteReplayBlockReason, noteListKey, isNoteOfflineAction } from '../lib/noteScope';
import { useOffline } from '../contexts/OfflineContext';
import { trpc } from '../lib/trpc';
import { OfflineAction } from './useOfflineQueue';

export function useOfflineExecutor() {
  const { registerExecutor } = useOffline();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeFamilyId, isReady, isCircleTransitioning } = useFamily();
  const queryClient = useQueryClient();
  const liveNoteScope = useRef(noteScope(user?.id, activeFamilyId, isReady, isCircleTransitioning));
  liveNoteScope.current = noteScope(user?.id, activeFamilyId, isReady, isCircleTransitioning);
  const notifiedNoteBlock = useRef<string | null>(null);
  const blockedScope = `${user?.id}:${activeFamilyId}:${isReady}:${isCircleTransitioning}`;
  useEffect(() => { notifiedNoteBlock.current = null; }, [blockedScope]);

  // Mutations tRPC pour Tâches
  const createTask = trpc.tasks.create.useMutation();
  const updateTask = trpc.tasks.update.useMutation();
  const deleteTask = trpc.tasks.delete.useMutation();
  const completeTask = trpc.tasks.complete.useMutation();

  // Mutations tRPC pour Courses
  const addShoppingItem = trpc.shopping.addItem.useMutation();
  const toggleShoppingItem = trpc.shopping.toggleItem.useMutation();
  const deleteShoppingItem = trpc.shopping.deleteItem.useMutation();

  // Mutations tRPC pour Notes
  const createNote = trpc.notes.create.useMutation({ networkMode: 'always', retry: false });
  const updateNote = trpc.notes.update.useMutation({ networkMode: 'always', retry: false });
  const deleteNote = trpc.notes.delete.useMutation({ networkMode: 'always', retry: false });

  // Mutations tRPC pour Messages
  const sendMessage = trpc.messages.create.useMutation();

  useEffect(() => {
    const executor = async (action: OfflineAction): Promise<void> => {
      if (isNoteOfflineAction(action)) {
        const reason = noteReplayBlockReason(action, liveNoteScope.current);
        if (reason) {
          const message = t(reason === 'legacy' ? 'notes.offlineLegacyBlocked' : 'notes.offlineScopeBlocked');
          if (notifiedNoteBlock.current !== reason) {
            notifiedNoteBlock.current = reason;
            Alert.alert(t('common.error'), message);
          }
          throw new Error(message);
        }
      }
      switch (action.type) {
        case 'task.create':
          await createTask.mutateAsync(action.payload as Parameters<typeof createTask.mutateAsync>[0]);
          break;
        case 'task.update':
          await updateTask.mutateAsync(action.payload as Parameters<typeof updateTask.mutateAsync>[0]);
          break;
        case 'task.delete':
          await deleteTask.mutateAsync(action.payload as Parameters<typeof deleteTask.mutateAsync>[0]);
          break;
        case 'task.complete':
          await completeTask.mutateAsync(action.payload as Parameters<typeof completeTask.mutateAsync>[0]);
          break;
        case 'shopping.addItem':
          await addShoppingItem.mutateAsync(action.payload as Parameters<typeof addShoppingItem.mutateAsync>[0]);
          break;
        case 'shopping.toggleItem':
          await toggleShoppingItem.mutateAsync(action.payload as Parameters<typeof toggleShoppingItem.mutateAsync>[0]);
          break;
        case 'shopping.deleteItem':
          await deleteShoppingItem.mutateAsync(action.payload as Parameters<typeof deleteShoppingItem.mutateAsync>[0]);
          break;
        case 'note.create':
          await createNote.mutateAsync(action.payload as Parameters<typeof createNote.mutateAsync>[0]);
          void queryClient.invalidateQueries({ queryKey: noteListKey(action.scope!), exact: true });
          break;
        case 'note.update':
          await updateNote.mutateAsync(action.payload as Parameters<typeof updateNote.mutateAsync>[0]);
          void queryClient.invalidateQueries({ queryKey: noteListKey(action.scope!), exact: true });
          break;
        case 'note.delete':
          await deleteNote.mutateAsync(action.payload as Parameters<typeof deleteNote.mutateAsync>[0]);
          void queryClient.invalidateQueries({ queryKey: noteListKey(action.scope!), exact: true });
          break;
        case 'message.send':
          await sendMessage.mutateAsync(action.payload as Parameters<typeof sendMessage.mutateAsync>[0]);
          break;
        default:
          console.warn('[OfflineExecutor] Unknown action type:', (action as OfflineAction).type);
      }
    };

    registerExecutor(executor);
  }, [
    registerExecutor, t, queryClient,
    createTask, updateTask, deleteTask, completeTask,
    addShoppingItem, toggleShoppingItem, deleteShoppingItem,
    createNote, updateNote, deleteNote,
    sendMessage,
  ]);
}
