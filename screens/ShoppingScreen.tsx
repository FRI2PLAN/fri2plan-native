/**
 * ShoppingScreen — Onglet Courses
 * Connecté à la BD via tRPC (routes shopping.*)
 * Pattern familyId : trpc.family.list → families[0].id
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, ScrollView, Alert, ActivityIndicator} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShoppingList {
  id: number;
  name: string;
  description?: string;
  targetDate?: string;
  isPrivate?: number;
  isArchived?: number;
  createdAt?: string;
  itemCount?: number;
}

interface ShoppingItem {
  id: number;
  listId: number;
  name: string;
  quantity?: string;
  checked?: boolean | number;
  addedBy?: number;
}

type ShoppingTab = 'lists' | 'history';

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ShoppingScreen({
  embedded = false,
  externalTab,
  onTabChange,
  triggerCreate = 0,
}: {
  embedded?: boolean;
  externalTab?: 'lists' | 'history';
  onTabChange?: (tab: 'lists' | 'history') => void;
  triggerCreate?: number;
} = {}) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const s = getStyles(isDark);
  const utils = trpc.useUtils();

  // ─── Famille ─────────────────────────────────────────────────────────────────────────────
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamily = ctxFamilyId ? (families as any[]).find((f: any) => f.id === ctxFamilyId) ?? families[0] : families[0];
  const familyId = activeFamily?.id;

  // ─── Onglets ─────────────────────────────────────────────────────────────────────────────
  const [internalTab, setInternalTab] = useState<ShoppingTab>('lists');
  const tab = externalTab ?? internalTab;
  const setTab = (t: ShoppingTab) => {
    setInternalTab(t);
    onTabChange?.(t);
  };
  const prevTriggerCreate = React.useRef(0);

  // ─── Listes ────────────────────────────────────────────────────────────────
  const { data: allLists = [], isLoading: listsLoading } = trpc.shopping.listsByFamily.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );
  const activeLists = useMemo(() => allLists.filter((l: ShoppingList) => !l.isArchived), [allLists]);
  const archivedLists = useMemo(() => allLists.filter((l: ShoppingList) => !!l.isArchived), [allLists]);

  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);

  // ─── Articles ──────────────────────────────────────────────────────────────
  const { data: items = [], isLoading: itemsLoading } = trpc.shopping.itemsByList.useQuery(
    { listId: selectedList?.id! },
    { enabled: !!selectedList?.id }
  );
  const { data: history = [] } = trpc.shopping.itemsHistory.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );

  const [hideChecked, setHideChecked] = useState(false);
  const visibleItems = useMemo(
    () => hideChecked ? items.filter((i: ShoppingItem) => !i.checked) : items,
    [items, hideChecked]
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createList = trpc.shopping.createList.useMutation({ onSuccess: () => utils.shopping.listsByFamily.invalidate() });
  const updateList = trpc.shopping.updateList.useMutation({ onSuccess: () => utils.shopping.listsByFamily.invalidate() });
  const deleteList = trpc.shopping.deleteList.useMutation({ onSuccess: () => { utils.shopping.listsByFamily.invalidate(); setSelectedList(null); } });
  const archiveList = trpc.shopping.archiveList.useMutation({ onSuccess: () => { utils.shopping.listsByFamily.invalidate(); setSelectedList(null); } });
  const unarchiveList = trpc.shopping.unarchiveList.useMutation({ onSuccess: () => utils.shopping.listsByFamily.invalidate() });
  const duplicateList = trpc.shopping.duplicateList.useMutation({ onSuccess: () => utils.shopping.listsByFamily.invalidate() });
  const addItem = trpc.shopping.addItem.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const addItemsMerged = trpc.shopping.addItemsMerged.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const toggleItem = trpc.shopping.toggleItem.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const updateItem = trpc.shopping.updateItem.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const deleteItem = trpc.shopping.deleteItem.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const deleteChecked = trpc.shopping.deleteCheckedItems.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });
  const deduplicate = trpc.shopping.deduplicateItems.useMutation({ onSuccess: () => utils.shopping.itemsByList.invalidate() });

  // ─── Formulaire liste ──────────────────────────────────────────────────────
  const [showListForm, setShowListForm] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [listForm, setListForm] = useState({ name: '', description: '', isPrivate: false });
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openCreateList = () => {
    setEditingList(null);
    setListForm({ name: '', description: '', isPrivate: false });
    setTargetDate(undefined);
    setShowListForm(true);
  };

  // Trigger create from parent action bar
  React.useEffect(() => {
    if (triggerCreate > 0 && triggerCreate !== prevTriggerCreate.current) {
      prevTriggerCreate.current = triggerCreate;
      openCreateList();
    }
  }, [triggerCreate]);
  const openEditList = (list: ShoppingList) => {
    setEditingList(list);
    setListForm({ name: list.name, description: list.description || '', isPrivate: !!list.isPrivate });
    setTargetDate(list.targetDate ? new Date(list.targetDate) : undefined);
    setShowListForm(true);
    setShowListActions(false);
  };
  const saveList = async () => {
    if (!listForm.name.trim() || !familyId) return;
    if (editingList) {
      await updateList.mutateAsync({ listId: editingList.id, name: listForm.name.trim(), description: listForm.description, isPrivate: listForm.isPrivate ? 1 : 0, targetDate: targetDate?.toISOString() });
    } else {
      await createList.mutateAsync({ familyId, name: listForm.name.trim(), description: listForm.description, isPrivate: listForm.isPrivate ? 1 : 0, targetDate });
    }
    setShowListForm(false);
  };

  // ─── Actions liste ─────────────────────────────────────────────────────────
  const [showListActions, setShowListActions] = useState(false);
  const [actionTarget, setActionTarget] = useState<ShoppingList | null>(null);

  const openListActions = (list: ShoppingList) => {
    setActionTarget(list);
    setShowListActions(true);
  };

  // ─── Ajout article ─────────────────────────────────────────────────────────
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [autocomplete, setAutocomplete] = useState<ShoppingItem[]>([]);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQty, setEditItemQty] = useState('');

  const onItemNameChange = (text: string) => {
    setNewItemName(text);
    if (text.length >= 2) {
      const suggestions = (history as ShoppingItem[]).filter(h =>
        h.name.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5);
      setAutocomplete(suggestions);
    } else {
      setAutocomplete([]);
    }
  };

  const submitItem = async () => {
    if (!newItemName.trim() || !selectedList) return;
    await addItem.mutateAsync({ listId: selectedList.id, name: newItemName.trim(), quantity: newItemQty.trim() || undefined });
    setNewItemName('');
    setNewItemQty('');
    setAutocomplete([]);
  };

  const saveEditItem = async () => {
    if (!editingItem || !editItemName.trim()) return;
    await updateItem.mutateAsync({ itemId: editingItem.id, name: editItemName.trim(), quantity: editItemQty.trim() || undefined });
    setEditingItem(null);
  };

  // ─── Rendu article ─────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[s.itemRow, item.checked && s.itemRowChecked]}
      onPress={() => toggleItem.mutate({ itemId: item.id })}
      onLongPress={() => { setEditingItem(item); setEditItemName(item.name); setEditItemQty(item.quantity || ''); }}
    >
      <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
        {item.checked ? <Text style={s.checkMark}>✓</Text> : null}
      </View>
      <View style={s.itemInfo}>
        <Text style={[s.itemName, item.checked && s.itemNameChecked]}>{item.name}</Text>
        {item.quantity ? <Text style={s.itemQty}>{item.quantity}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => Alert.alert(t('common.delete') || 'Supprimer', `${item.name} ?`, [
        { text: t('common.cancel') || 'Annuler', style: 'cancel' },
        { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: () => deleteItem.mutate({ itemId: item.id }) },
      ])}>
        <Text style={s.deleteBtn}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ─── Rendu liste ───────────────────────────────────────────────────────────
  const renderList = ({ item }: { item: ShoppingList }) => (
    <TouchableOpacity style={s.listCard} onPress={() => setSelectedList(item)} onLongPress={() => openListActions(item)}>
      <View style={s.listCardHeader}>
        <Text style={s.listCardName}>{item.name}</Text>
        <TouchableOpacity onPress={() => openListActions(item)}>
          <Text style={s.moreBtn}>⋯</Text>
        </TouchableOpacity>
      </View>
      {item.description ? <Text style={s.listCardDesc}>{item.description}</Text> : null}
      <View style={s.listCardFooter}>
        {item.isPrivate ? <Text style={s.privateBadge}>🔒</Text> : null}
        {item.targetDate ? <Text style={s.dateBadge}>📅 {new Date(item.targetDate).toLocaleDateString(i18n.language)}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  // ─── Vue détail liste ──────────────────────────────────────────────────────
  if (selectedList) {
    return (
      <View style={s.container}>
        {/* Header */}
        <View style={s.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedList(null)} style={s.backBtn}>
            <Text style={s.backBtnText}>← {t('common.back') || 'Retour'}</Text>
          </TouchableOpacity>
          <Text style={s.detailTitle} numberOfLines={1}>{selectedList.name}</Text>
          <TouchableOpacity onPress={() => openListActions(selectedList)}>
            <Text style={s.moreBtn}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Actions rapides */}
        <View style={s.quickActions}>
          <TouchableOpacity style={s.quickBtn} onPress={() => setHideChecked(!hideChecked)}>
            <Text style={s.quickBtnText}>{hideChecked ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => {
            Alert.alert(t('shopping.deleteChecked') || 'Supprimer cochés', '', [
              { text: t('common.cancel') || 'Annuler', style: 'cancel' },
              { text: '🗑', style: 'destructive', onPress: () => deleteChecked.mutate({ listId: selectedList.id }) },
            ]);
          }}>
            <Text style={s.quickBtnText}>🗑✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => deduplicate.mutate({ listId: selectedList.id })}>
            <Text style={s.quickBtnText}>⚡</Text>
          </TouchableOpacity>
        </View>

        {/* Ajout article */}
        <View style={s.addItemRow}>
          <View style={s.addItemInputs}>
            <TextInput
              style={[s.input, { flex: 2, marginRight: 6 }]}
              placeholder={t('shopping.itemName') || 'Article...'}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={newItemName}
              onChangeText={onItemNameChange}
              onSubmitEditing={submitItem}
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={t('shopping.quantity') || 'Qté'}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={newItemQty}
              onChangeText={setNewItemQty}
            />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={submitItem}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Autocomplétion */}
        {autocomplete.length > 0 && (
          <View style={s.autocomplete}>
            {autocomplete.map(s2 => (
              <TouchableOpacity key={s2.id} style={s.autocompleteItem} onPress={() => { setNewItemName(s2.name); setAutocomplete([]); }}>
                <Text style={s.autocompleteText}>{s2.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Liste articles */}
        {itemsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" />
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={i => i.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={<Text style={s.emptyText}>{t('shopping.noItems') || 'Aucun article'}</Text>}
          />
        )}

        {/* Modal édition article */}
        <Modal visible={!!editingItem} transparent animationType="fade">
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{t('shopping.editItem') || 'Modifier l\'article'}</Text>
              <TextInput style={s.input} value={editItemName} onChangeText={setEditItemName} placeholder={t('shopping.itemName') || 'Nom'} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              <TextInput style={s.input} value={editItemQty} onChangeText={setEditItemQty} placeholder={t('shopping.quantity') || 'Quantité'} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingItem(null)}><Text style={s.cancelBtnText}>✕</Text></TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={saveEditItem}><Text style={s.saveBtnText}>✓</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal actions liste */}
        <Modal visible={showListActions} transparent animationType="fade">
          <TouchableOpacity style={s.overlay} onPress={() => setShowListActions(false)}>
            <View style={s.actionsModal}>
              <TouchableOpacity style={s.actionItem} onPress={() => openEditList(actionTarget || selectedList)}>
                <Text style={s.actionIcon}>✏️</Text>
                <Text style={s.actionText}>{t('common.edit') || 'Modifier'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionItem} onPress={() => { duplicateList.mutate({ listId: (actionTarget || selectedList).id }); setShowListActions(false); }}>
                <Text style={s.actionIcon}>📋</Text>
                <Text style={s.actionText}>{t('shopping.duplicate') || 'Dupliquer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionItem} onPress={() => { archiveList.mutate({ listId: (actionTarget || selectedList).id }); setShowListActions(false); }}>
                <Text style={s.actionIcon}>📦</Text>
                <Text style={s.actionText}>{t('shopping.archive') || 'Archiver'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionItem, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#e5e7eb' }]} onPress={() => {
                Alert.alert(t('common.delete') || 'Supprimer', `${(actionTarget || selectedList).name} ?`, [
                  { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                  { text: '🗑', style: 'destructive', onPress: () => { deleteList.mutate({ listId: (actionTarget || selectedList).id }); setShowListActions(false); } },
                ]);
              }}>
                <Text style={s.actionIcon}>🗑</Text>
                <Text style={[s.actionText, { color: '#ef4444' }]}>{t('common.delete') || 'Supprimer'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── Vue principale (liste des listes) ────────────────────────────────────
  const content = (
    <View style={s.container}>

      {listsLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" />
      ) : (
        <FlatList
          data={tab === 'lists' ? activeLists : archivedLists}
          keyExtractor={l => l.id.toString()}
          renderItem={tab === 'lists' ? renderList : ({ item }) => (
            <View style={s.listCard}>
              <View style={s.listCardHeader}>
                <Text style={s.listCardName}>{item.name}</Text>
                <TouchableOpacity onPress={() => unarchiveList.mutate({ listId: item.id })}>
                  <Text style={s.unarchiveBtn}>↩️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={<Text style={s.emptyText}>{tab === 'lists' ? (t('shopping.noLists') || 'Aucune liste active') : (t('shopping.noHistory') || 'Aucune liste archivée')}</Text>}
        />
      )}

      {/* Modal formulaire liste */}
      <Modal visible={showListForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editingList ? (t('shopping.editList') || 'Modifier la liste') : (t('shopping.newList') || 'Nouvelle liste')}</Text>
            <Text style={s.label}>{t('common.name') || 'Nom'}</Text>
            <TextInput style={s.input} value={listForm.name} onChangeText={n => setListForm(p => ({ ...p, name: n }))} placeholder={t('shopping.listName') || 'Nom de la liste'} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={s.label}>{t('common.description') || 'Description'}</Text>
            <TextInput style={[s.input, { height: 70 }]} value={listForm.description} onChangeText={d => setListForm(p => ({ ...p, description: d }))} placeholder={t('shopping.listDescription') || 'Description (optionnel)'} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} multiline />
            <Text style={s.label}>{t('shopping.targetDate') || 'Date cible'}</Text>
            <TouchableOpacity style={s.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: targetDate ? (isDark ? '#f9fafb' : '#111827') : (isDark ? '#6b7280' : '#9ca3af') }}>
                {targetDate ? targetDate.toLocaleDateString(i18n.language) : (t('shopping.noDate') || 'Aucune date')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker mode="date" value={targetDate || new Date()} onChange={(_, d) => { setShowDatePicker(false); if (d) setTargetDate(d); }} />
            )}
            <TouchableOpacity style={s.privateToggle} onPress={() => setListForm(p => ({ ...p, isPrivate: !p.isPrivate }))}>
              <Text style={s.privateToggleText}>{listForm.isPrivate ? '🔒' : '🔓'} {t('common.private') || 'Privé'}</Text>
            </TouchableOpacity>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowListForm(false)}><Text style={s.cancelBtnText}>✕</Text></TouchableOpacity>
              {editingList && (
                <TouchableOpacity style={[s.cancelBtn, { backgroundColor: '#ef4444' }]} onPress={() => {
                  Alert.alert(t('common.delete') || 'Supprimer', `${editingList.name} ?`, [
                    { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                    { text: '🗑', style: 'destructive', onPress: () => { deleteList.mutate({ listId: editingList.id }); setShowListForm(false); } },
                  ]);
                }}><Text style={s.saveBtnText}>🗑</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={s.saveBtn} onPress={saveList}><Text style={s.saveBtnText}>✓</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal actions liste (depuis la liste principale) */}
      <Modal visible={showListActions} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} onPress={() => setShowListActions(false)}>
          <View style={s.actionsModal}>
            <TouchableOpacity style={s.actionItem} onPress={() => { openEditList(actionTarget!); }}>
              <Text style={s.actionIcon}>✏️</Text>
              <Text style={s.actionText}>{t('common.edit') || 'Modifier'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionItem} onPress={() => { setSelectedList(actionTarget); setShowListActions(false); }}>
              <Text style={s.actionIcon}>📂</Text>
              <Text style={s.actionText}>{t('shopping.open') || 'Ouvrir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionItem} onPress={() => { duplicateList.mutate({ listId: actionTarget!.id }); setShowListActions(false); }}>
              <Text style={s.actionIcon}>📋</Text>
              <Text style={s.actionText}>{t('shopping.duplicate') || 'Dupliquer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionItem} onPress={() => { archiveList.mutate({ listId: actionTarget!.id }); setShowListActions(false); }}>
              <Text style={s.actionIcon}>📦</Text>
              <Text style={s.actionText}>{t('shopping.archive') || 'Archiver'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionItem, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#e5e7eb' }]} onPress={() => {
              Alert.alert(t('common.delete') || 'Supprimer', `${actionTarget?.name} ?`, [
                { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                { text: '🗑', style: 'destructive', onPress: () => { deleteList.mutate({ listId: actionTarget!.id }); setShowListActions(false); } },
              ]);
            }}>
              <Text style={s.actionIcon}>🗑</Text>
              <Text style={[s.actionText, { color: '#ef4444' }]}>{t('common.delete') || 'Supprimer'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  if (embedded) return content;
  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {content}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#000000' : '#ffffff';
  const inputBorder = isDark ? '#ffffff' : '#d1d5db';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '700', color: text },
    createBtn: { backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: isDark ? '#374151' : '#f3f4f6' },
    tabBtnActive: { backgroundColor: '#7c3aed' },
    tabBtnText: { fontSize: 13, fontWeight: '600', color: subtext },
    tabBtnTextActive: { color: '#fff' },
    listCard: { backgroundColor: card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: border },
    listCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listCardName: { fontSize: 16, fontWeight: '700', color: text, flex: 1 },
    listCardDesc: { fontSize: 13, color: subtext, marginTop: 4 },
    listCardFooter: { flexDirection: 'row', gap: 8, marginTop: 8 },
    privateBadge: { fontSize: 14 },
    dateBadge: { fontSize: 12, color: subtext },
    moreBtn: { fontSize: 22, color: subtext, paddingHorizontal: 4 },
    unarchiveBtn: { fontSize: 20 },
    emptyText: { textAlign: 'center', color: subtext, marginTop: 40, fontSize: 15 },
    // Détail liste
    detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: border },
    backBtn: { paddingRight: 8 },
    backBtnText: { color: '#7c3aed', fontWeight: '600', fontSize: 15 },
    detailTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: text, textAlign: 'center' },
    quickActions: { flexDirection: 'row', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: border },
    quickBtn: { flex: 1, backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
    quickBtnText: { fontSize: 16 },
    addItemRow: { flexDirection: 'row', padding: 10, gap: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: border },
    addItemInputs: { flex: 1, flexDirection: 'row' },
    addBtn: { backgroundColor: '#7c3aed', borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
    autocomplete: { backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 8, marginHorizontal: 10 },
    autocompleteItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: border },
    autocompleteText: { color: text, fontSize: 14 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
    itemRowChecked: { opacity: 0.6 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#7c3aed' },
    checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: text },
    itemNameChecked: { textDecorationLine: 'line-through', color: subtext },
    itemQty: { fontSize: 12, color: subtext, marginTop: 2 },
    deleteBtn: { fontSize: 18, padding: 4 },
    // Modaux
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modal: { backgroundColor: card, borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: text, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: subtext, marginBottom: 4, marginTop: 8 },
    input: { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 10, padding: 12, color: text, fontSize: 15, marginBottom: 4 },
    privateToggle: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 8 },
    privateToggleText: { color: text, fontSize: 15 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    cancelBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { color: text, fontSize: 18, fontWeight: '700' },
    saveBtn: { backgroundColor: '#7c3aed', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    actionsModal: { backgroundColor: card, borderRadius: 16, padding: 8, width: '80%', maxWidth: 320 },
    actionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    actionIcon: { fontSize: 20 },
    actionText: { fontSize: 15, fontWeight: '500', color: text }});
}
