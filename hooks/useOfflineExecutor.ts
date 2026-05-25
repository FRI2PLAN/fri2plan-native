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

import { useEffect } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { trpc } from '../lib/trpc';
import { OfflineAction } from './useOfflineQueue';

export function useOfflineExecutor() {
  const { registerExecutor } = useOffline();

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
  const createNote = trpc.notes.create.useMutation();
  const updateNote = trpc.notes.update.useMutation();
  const deleteNote = trpc.notes.delete.useMutation();

  // Mutations tRPC pour Messages
  const sendMessage = trpc.messages.create.useMutation();

  useEffect(() => {
    const executor = async (action: OfflineAction): Promise<void> => {
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
          break;
        case 'note.update':
          await updateNote.mutateAsync(action.payload as Parameters<typeof updateNote.mutateAsync>[0]);
          break;
        case 'note.delete':
          await deleteNote.mutateAsync(action.payload as Parameters<typeof deleteNote.mutateAsync>[0]);
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
    registerExecutor,
    createTask, updateTask, deleteTask, completeTask,
    addShoppingItem, toggleShoppingItem, deleteShoppingItem,
    createNote, updateNote, deleteNote,
    sendMessage,
  ]);
}
