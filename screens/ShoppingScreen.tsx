import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
  RefreshControl, Modal, TextInput, Alert, Switch, ActivityIndicator, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { format } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ShoppingList {
  id: number;
  name: string;
  description?: string;
  targetDate?: string;
  isPrivate?: number;
  isActive?: number;
}
interface ShoppingItem {
  id: number;
  listId: number;
  name: string;
  quantity?: string;
  checked?: number;
}

type ShoppingTab = 'lists' | 'history';

const EMPTY_LIST_FORM = { name: '', description: '', targetDate: undefined as Date | undefined, isPrivate: false };

export default function ShoppingScreen() {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const s = getStyles(isDark);
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<ShoppingTab>('lists');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [showChecked, setShowChecked] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modaux
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [listSelectorModal, setListSelectorModal] = useState(false);

  // Formulaires liste
  const [createForm, setCreateForm] = useState({ ...EMPTY_LIST_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_LIST_FORM });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTarget, setDateTarget] = useState<'create' | 'edit'>('create');

  // Article
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQty, setEditItemQty] = useState('');

  // ── tRPC ──
  const { data: allLists = [], refetch: refetchLists, isLoading: listsLoading } =
    trpc.shopping.listsByFamily.useQuery({ familyId: 1 });
  const { data: itemsHistory = [] } =
    trpc.shopping.itemsHistory.useQuery({ familyId: 1 });
  const { data: items = [], refetch: refetchItems } =
    trpc.shopping.itemsByList.useQuery({ listId: selectedListId || 0 }, { enabled: !!selectedListId });

  const activeLists = useMemo(() => allLists.filter((l: ShoppingList) => l.isActive !== 0), [allLists]);
  const archivedLists = useMemo(() => allLists.filter((l: ShoppingList) => l.isActive === 0), [allLists]);
  const filteredItems = useMemo(() => showChecked ? items : items.filter((i: ShoppingItem) => !i.checked), [items, showChecked]);
  const uncheckedCount = useMemo(() => items.filter((i: ShoppingItem) => !i.checked).length, [items]);
  const checkedCount = useMemo(() => items.filter((i: ShoppingItem) => i.checked).length, [items]);

  const suggestions = useMemo(() => {
    if (!newItemName.trim() || newItemName.length < 2) return [];
    const q = newItemName.toLowerCase();
    return (itemsHistory as any[]).filter(i => i.name.toLowerCase().includes(q)).slice(0, 5);
  }, [newItemName, itemsHistory]);

  useEffect(() => {
    if (!selectedListId && activeLists.length > 0) setSelectedListId(activeLists[0].id);
  }, [activeLists]);

  const getLocale = () => i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;

  // ── Mutations ──
  const createListMut = trpc.shopping.createList.useMutation({
    onSuccess: () => { utils.shopping.listsByFamily.invalidate(); setCreateModal(false); setCreateForm({ ...EMPTY_LIST_FORM }); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const updateListMut = trpc.shopping.updateList.useMutation({
    onSuccess: () => { utils.shopping.listsByFamily.invalidate(); setEditModal(false); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const deleteListMut = trpc.shopping.deleteList.useMutation({
    onSuccess: () => { utils.shopping.listsByFamily.invalidate(); setSelectedListId(null); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const archiveListMut = trpc.shopping.archiveList.useMutation({
    onSuccess: () => utils.shopping.listsByFamily.invalidate(),
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const unarchiveListMut = trpc.shopping.unarchiveList.useMutation({
    onSuccess: () => utils.shopping.listsByFamily.invalidate(),
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const duplicateListMut = trpc.shopping.duplicateList.useMutation({
    onSuccess: (data: any) => { utils.shopping.listsByFamily.invalidate(); if (data?.listId) setSelectedListId(data.listId); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const addItemMut = trpc.shopping.addItem.useMutation({
    onSuccess: () => { utils.shopping.itemsByList.invalidate(); setNewItemName(''); setNewItemQty(''); setShowSuggestions(false); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const toggleItemMut = trpc.shopping.toggleItem.useMutation({
    onSuccess: () => utils.shopping.itemsByList.invalidate(),
  });
  const deleteItemMut = trpc.shopping.deleteItem.useMutation({
    onSuccess: () => utils.shopping.itemsByList.invalidate(),
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const deleteCheckedMut = trpc.shopping.deleteCheckedItems.useMutation({
    onSuccess: () => utils.shopping.itemsByList.invalidate(),
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const updateItemMut = trpc.shopping.updateItem.useMutation({
    onSuccess: () => { utils.shopping.itemsByList.invalidate(); setEditingItem(null); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const deduplicateMut = trpc.shopping.deduplicateItems.useMutation({
    onSuccess: (data: any) => {
      utils.shopping.itemsByList.invalidate();
      Alert.alert(data?.removed > 0 ? '✅' : 'ℹ️', data?.removed > 0 ? `${data.removed} doublon(s) supprimé(s)` : 'Aucun doublon trouvé');
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchLists();
    if (selectedListId) await refetchItems();
    setRefreshing(false);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !selectedListId) return;
    addItemMut.mutate({ listId: selectedListId, name: newItemName.trim(), quantity: newItemQty.trim() || undefined });
  };

  const handleCreateList = () => {
    if (!createForm.name.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
    createListMut.mutate({
      name: createForm.name,
      description: createForm.description || undefined,
      targetDate: createForm.targetDate ? format(createForm.targetDate, 'yyyy-MM-dd') : undefined,
      isPrivate: createForm.isPrivate ? 1 : 0,
    });
  };

  const handleUpdateList = () => {
    if (!editingList || !editForm.name.trim()) return;
    updateListMut.mutate({
      listId: editingList.id,
      name: editForm.name,
      description: editForm.description || undefined,
      targetDate: editForm.targetDate ? format(editForm.targetDate, 'yyyy-MM-dd') : undefined,
      isPrivate: editForm.isPrivate ? 1 : 0,
    });
  };

  const openEditList = (list: ShoppingList) => {
    setEditingList(list);
    setEditForm({
      name: list.name,
      description: list.description || '',
      targetDate: list.targetDate ? new Date(list.targetDate) : undefined,
      isPrivate: list.isPrivate === 1,
    });
    setEditModal(true);
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert('Supprimer ?', `"${list.name}"`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteListMut.mutate({ listId: list.id }) },
    ]);
  };

  const handleDeleteItem = (item: ShoppingItem) => {
    Alert.alert('Supprimer ?', `"${item.name}"`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteItemMut.mutate({ itemId: item.id }) },
    ]);
  };

  const currentList = activeLists.find((l: ShoppingList) => l.id === selectedListId);

  // ── Composant formulaire liste ──
  const ListForm = ({ data, setData, isEdit = false }: { data: typeof EMPTY_LIST_FORM; setData: any; isEdit?: boolean }) => (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
      <View style={s.formGroup}>
        <Text style={s.label}>Nom *</Text>
        <TextInput style={s.input} placeholder="Nom de la liste" placeholderTextColor="#9ca3af" value={data.name} onChangeText={v => setData({ ...data, name: v })} />
      </View>
      <View style={s.formGroup}>
        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Description..." placeholderTextColor="#9ca3af" value={data.description} onChangeText={v => setData({ ...data, description: v })} multiline />
      </View>
      <View style={s.formGroup}>
        <Text style={s.label}>Date cible</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => { setDateTarget(isEdit ? 'edit' : 'create'); setShowDatePicker(true); }}>
          <Text style={s.pickerBtnText}>{data.targetDate ? format(data.targetDate, 'dd/MM/yyyy') : '📅 Choisir une date'}</Text>
          <Text style={{ color: '#9ca3af' }}>▼</Text>
        </TouchableOpacity>
      </View>
      <View style={s.formGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.label}>🔒 Liste privée</Text>
          <Switch value={data.isPrivate} onValueChange={v => setData({ ...data, isPrivate: v })} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor="#fff" />
        </View>
      </View>
    </ScrollView>
  );

  // ── Composant article ──
  const ItemCard = ({ item }: { item: ShoppingItem }) => {
    if (editingItem?.id === item.id) {
      return (
        <View style={s.itemCard}>
          <TextInput style={[s.input, { flex: 1, marginRight: 6 }]} value={editItemName} onChangeText={setEditItemName} autoFocus />
          <TextInput style={[s.input, { width: 70, marginRight: 6 }]} value={editItemQty} onChangeText={setEditItemQty} placeholder="Qté" placeholderTextColor="#9ca3af" />
          <TouchableOpacity style={s.iconBtnSm} onPress={() => updateItemMut.mutate({ itemId: item.id, name: editItemName, quantity: editItemQty || undefined })}>
            <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtnSm, { backgroundColor: '#6b7280', marginLeft: 4 }]} onPress={() => setEditingItem(null)}>
            <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity
        style={s.itemCard}
        onPress={() => toggleItemMut.mutate({ itemId: item.id })}
        onLongPress={() => { setEditingItem(item); setEditItemName(item.name); setEditItemQty(item.quantity || ''); }}
      >
        <View style={[s.checkbox, item.checked ? s.checkboxChecked : null]}>
          {item.checked ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>✓</Text> : null}
        </View>
        <Text style={[s.itemName, item.checked ? s.itemNameChecked : null]} numberOfLines={1}>{item.name}</Text>
        {item.quantity ? <Text style={s.itemQty}>{item.quantity}</Text> : null}
        <TouchableOpacity onPress={() => handleDeleteItem(item)} style={{ padding: 6 }}>
          <Text style={{ fontSize: 16 }}>🗑</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre */}
      <View style={s.titleBar}>
        <Text style={s.title}>{t('tabs.shopping') || 'Courses'}</Text>
      </View>

      {/* Bouton Nouvelle liste */}
      <View style={s.newBtnContainer}>
        <TouchableOpacity style={s.newBtn} onPress={() => setCreateModal(true)}>
          <Text style={s.newBtnText}>+ Nouvelle liste</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'lists' && s.tabActive]} onPress={() => setTab('lists')}>
          <Text style={[s.tabText, tab === 'lists' && s.tabTextActive]}>🛒 Actives ({activeLists.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'history' && s.tabActive]} onPress={() => setTab('history')}>
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>📦 Historique ({archivedLists.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Listes actives ── */}
        {tab === 'lists' && (
          <>
            {listsLoading ? (
              <View style={s.centered}><ActivityIndicator color="#7c3aed" size="large" /></View>
            ) : activeLists.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
                <Text style={s.emptyText}>Aucune liste de courses active</Text>
                <TouchableOpacity style={s.newBtn} onPress={() => setCreateModal(true)}>
                  <Text style={s.newBtnText}>Créer ma première liste</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Sélecteur de liste */}
                {activeLists.length === 1 ? (
                  <View style={s.listHeader}>
                    <Text style={s.listHeaderName} numberOfLines={1}>{activeLists[0].isPrivate === 1 ? '🔒 ' : '🌐 '}{activeLists[0].name}</Text>
                    {activeLists[0].targetDate && <Text style={s.listHeaderDate}>📅 {format(new Date(activeLists[0].targetDate), 'dd/MM', { locale: getLocale() })}</Text>}
                    <View style={s.listActions}>
                      <TouchableOpacity onPress={() => openEditList(activeLists[0])} style={s.actionBtn}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => duplicateListMut.mutate({ listId: activeLists[0].id })} style={s.actionBtn}><Text>📋</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => archiveListMut.mutate({ listId: activeLists[0].id })} style={s.actionBtn}><Text>📦</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteList(activeLists[0])} style={s.actionBtn}><Text>🗑</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.listSelectorRow}>
                    <TouchableOpacity style={s.listSelectorBtn} onPress={() => setListSelectorModal(true)}>
                      <Text style={s.listSelectorText} numberOfLines={1}>
                        {currentList ? `${currentList.isPrivate === 1 ? '🔒 ' : '🌐 '}${currentList.name}` : 'Choisir une liste'}
                      </Text>
                      <Text style={{ color: '#9ca3af' }}>▼</Text>
                    </TouchableOpacity>
                    {currentList && (
                      <View style={s.listActions}>
                        <TouchableOpacity onPress={() => openEditList(currentList)} style={s.actionBtn}><Text>✏️</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => duplicateListMut.mutate({ listId: currentList.id })} style={s.actionBtn}><Text>📋</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => archiveListMut.mutate({ listId: currentList.id })} style={s.actionBtn}><Text>📦</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteList(currentList)} style={s.actionBtn}><Text>🗑</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Compteurs + actions rapides */}
                {selectedListId && (
                  <View style={s.itemsHeader}>
                    <Text style={s.itemsCount}>{uncheckedCount} restant · {checkedCount} coché{checkedCount > 1 ? 's' : ''}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      <TouchableOpacity style={s.smallBtn} onPress={() => setShowChecked(p => !p)}>
                        <Text style={s.smallBtnText}>{showChecked ? '🙈' : '👁'}</Text>
                      </TouchableOpacity>
                      {checkedCount > 0 && (
                        <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#fef2f2' }]} onPress={() => Alert.alert('Supprimer ?', 'Supprimer tous les articles cochés ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => deleteCheckedMut.mutate({ listId: selectedListId! }) }])}>
                          <Text style={[s.smallBtnText, { color: '#ef4444' }]}>🗑 Cochés</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={s.smallBtn} onPress={() => deduplicateMut.mutate({ listId: selectedListId! })}>
                        <Text style={s.smallBtnText}>⚡</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Formulaire ajout article */}
                {selectedListId && (
                  <View style={s.addItemForm}>
                    <View style={{ flex: 1, position: 'relative' }}>
                      <TextInput
                        style={[s.input, { flex: 1, marginRight: 6 }]}
                        placeholder="Ajouter un article..."
                        placeholderTextColor="#9ca3af"
                        value={newItemName}
                        onChangeText={v => { setNewItemName(v); setShowSuggestions(v.length >= 2); }}
                        onSubmitEditing={handleAddItem}
                        returnKeyType="done"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <View style={s.suggestionsBox}>
                          {suggestions.map((sg: any, i: number) => (
                            <TouchableOpacity key={i} style={s.suggestionItem} onPress={() => { setNewItemName(sg.name); setNewItemQty(sg.quantity || ''); setShowSuggestions(false); }}>
                              <Text style={s.suggestionText}>{sg.name}</Text>
                              {sg.quantity ? <Text style={s.suggestionQty}>{sg.quantity}</Text> : null}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <TextInput style={[s.input, { width: 70, marginRight: 6 }]} placeholder="Qté" placeholderTextColor="#9ca3af" value={newItemQty} onChangeText={setNewItemQty} />
                    <TouchableOpacity style={s.addBtn} onPress={handleAddItem} disabled={addItemMut.isPending}>
                      <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Articles */}
                {filteredItems.map((item: ShoppingItem) => <ItemCard key={item.id} item={item} />)}
                {filteredItems.length === 0 && selectedListId && (
                  <View style={s.centered}><Text style={s.emptyText}>Aucun article dans cette liste</Text></View>
                )}
              </>
            )}
          </>
        )}

        {/* ── Historique ── */}
        {tab === 'history' && (
          <>
            {archivedLists.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
                <Text style={s.emptyText}>Aucune liste archivée</Text>
              </View>
            ) : (
              archivedLists.map((list: ShoppingList) => (
                <View key={list.id} style={s.archivedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.archivedName}>{list.isPrivate === 1 ? '🔒 ' : '🌐 '}{list.name}</Text>
                    {list.targetDate && <Text style={s.archivedDate}>📅 {format(new Date(list.targetDate), 'dd MMM yyyy', { locale: getLocale() })}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ede9fe' }]} onPress={() => unarchiveListMut.mutate({ listId: list.id })}>
                      <Text>♻️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => handleDeleteList(list)}>
                      <Text>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ══ MODAL Créer liste ══ */}
      <Modal visible={createModal} animationType="slide" transparent onRequestClose={() => setCreateModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouvelle liste</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => { setCreateModal(false); setCreateForm({ ...EMPTY_LIST_FORM }); }}>
                  <Text style={s.iconBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#7c3aed' }]} onPress={handleCreateList} disabled={createListMut.isPending}>
                  <Text style={[s.iconBtnText, { color: '#fff' }]}>{createListMut.isPending ? '…' : '✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <ListForm data={createForm} setData={setCreateForm} isEdit={false} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL Modifier liste ══ */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Modifier la liste</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => setEditModal(false)}>
                  <Text style={s.iconBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#7c3aed' }]} onPress={handleUpdateList} disabled={updateListMut.isPending}>
                  <Text style={[s.iconBtnText, { color: '#fff' }]}>{updateListMut.isPending ? '…' : '✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <ListForm data={editForm} setData={setEditForm} isEdit={true} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL Sélecteur liste ══ */}
      <Modal visible={listSelectorModal} animationType="fade" transparent onRequestClose={() => setListSelectorModal(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setListSelectorModal(false)}>
          <View style={s.pickerModal}>
            <Text style={s.pickerTitle}>Choisir une liste</Text>
            {activeLists.map((list: ShoppingList) => (
              <TouchableOpacity key={list.id} style={s.pickerOption} onPress={() => { setSelectedListId(list.id); setListSelectorModal(false); }}>
                <Text style={s.pickerOptionText}>{list.isPrivate === 1 ? '🔒 ' : '🌐 '}{list.name}</Text>
                {list.id === selectedListId && <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={(dateTarget === 'edit' ? editForm.targetDate : createForm.targetDate) || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) {
              if (dateTarget === 'edit') setEditForm(p => ({ ...p, targetDate: d }));
              else setCreateForm(p => ({ ...p, targetDate: d }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#111827' : '#f3f4f6';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    titleBar: { backgroundColor: card, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: text },
    newBtnContainer: { padding: 10, backgroundColor: card, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: border },
    newBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    newBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    tabs: { flexDirection: 'row', backgroundColor: card, paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: border },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center' },
    tabActive: { backgroundColor: '#7c3aed' },
    tabText: { fontSize: 12, color: subtext, fontWeight: '500' },
    tabTextActive: { color: '#fff', fontWeight: '700' },
    content: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },
    centered: { alignItems: 'center', paddingTop: 40 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyText: { fontSize: 15, color: subtext, textAlign: 'center', marginBottom: 16 },

    listHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: border },
    listHeaderName: { flex: 1, fontSize: 15, fontWeight: '600', color: text },
    listHeaderDate: { fontSize: 12, color: subtext, marginRight: 8 },
    listSelectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    listSelectorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: border },
    listSelectorText: { fontSize: 14, fontWeight: '600', color: text, flex: 1 },
    listActions: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6' },

    itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, flexWrap: 'wrap', gap: 4, marginBottom: 4 },
    itemsCount: { fontSize: 12, color: subtext },
    smallBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    smallBtnText: { fontSize: 11, color: text },

    addItemForm: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    addBtn: { backgroundColor: '#7c3aed', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: border },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    itemName: { flex: 1, fontSize: 15, color: text },
    itemNameChecked: { textDecorationLine: 'line-through', color: subtext },
    itemQty: { fontSize: 13, color: subtext, marginRight: 8 },

    suggestionsBox: { position: 'absolute', top: 44, left: 0, right: 6, backgroundColor: card, borderRadius: 10, borderWidth: 1, borderColor: border, zIndex: 100, elevation: 10 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border },
    suggestionText: { fontSize: 14, color: text },
    suggestionQty: { fontSize: 12, color: subtext },

    archivedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: border, opacity: 0.8 },
    archivedName: { fontSize: 14, fontWeight: '600', color: text },
    archivedDate: { fontSize: 12, color: subtext, marginTop: 2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: text, flex: 1 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    iconBtnSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },

    formGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: text, marginBottom: 5 },
    input: { backgroundColor: inputBg, borderRadius: 10, padding: 11, fontSize: 15, color: text, borderWidth: 1, borderColor: border },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: inputBg, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: border },
    pickerBtnText: { fontSize: 15, color: text, flex: 1 },

    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: { backgroundColor: card, borderRadius: 16, padding: 18, width: '85%', maxHeight: '70%' },
    pickerTitle: { fontSize: 17, fontWeight: 'bold', color: text, marginBottom: 12 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 8, marginBottom: 2 },
    pickerOptionText: { fontSize: 15, color: text },
  });
}
