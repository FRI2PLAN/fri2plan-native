import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../i18n';

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function SettingsScreen({ onNavigate, onLogout , onPrevious, onNext}: SettingsScreenProps) {
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const { isDark, setDarkMode: setGlobalDarkMode } = useTheme();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    setShowLanguageModal(false);
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === 'fr') return 'Français';
    if (lang === 'en') return 'English';
    if (lang === 'de') return 'Deutsch';
    return 'Français';
  };

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            
            <TouchableOpacity 
              style={[styles.languageOption, currentLanguage === 'fr' && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('fr')}
            >
              <Text style={styles.languageOptionText}>🇫🇷 Français</Text>
              {currentLanguage === 'fr' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.languageOption, currentLanguage === 'en' && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.languageOptionText}>🇬🇧 English</Text>
              {currentLanguage === 'en' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.languageOption, currentLanguage === 'de' && styles.languageOptionSelected]}
              onPress={() => handleLanguageChange('de')}
            >
              <Text style={styles.languageOptionText}>🇩🇪 Deutsch</Text>
              {currentLanguage === 'de' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

            {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>⚙️ {t('settings.title')}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setGlobalDarkMode}
              trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌍</Text>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{getLanguageLabel(currentLanguage)}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>{t('settings.pushNotifications')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📧</Text>
              <Text style={styles.settingLabel}>{t('settings.emailNotifications')}</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>👤</Text>
              <Text style={styles.settingLabel}>{t('settings.personalInfo')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <Text style={styles.settingLabel}>{t('settings.passwordSecurity')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.privacy')}</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <Text style={styles.settingLabel}>{t('settings.privacyItem')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🛡️</Text>
              <Text style={styles.settingLabel}>{t('settings.securityItem')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <Text style={styles.settingLabel}>{t('settings.version')}</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📜</Text>
              <Text style={styles.settingLabel}>{t('settings.termsOfUse')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔐</Text>
              <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        {onLogout && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getStyles(isDark: boolean) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#f9fafb'},
  header: {
    padding: 20,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb'},
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#1f2937'},
  content: {
    flex: 1},
  section: {
    marginTop: 24,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8},
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#f3f4f6'},
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1},
  settingIcon: {
    fontSize: 20,
    marginRight: 12},
  settingLabel: {
    fontSize: 16,
    color: isDark ? '#f9fafb' : '#1f2937'},
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center'},
  settingValue: {
    fontSize: 15,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginRight: 8},
  settingArrow: {
    fontSize: 20,
    color: '#9ca3af'},
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16},
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'},
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400},
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#1f2937',
    marginBottom: 20,
    textAlign: 'center'},
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    marginBottom: 12},
  languageOptionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: isDark ? '#3b2f6e' : '#f3f4f6'},
  languageOptionText: {
    fontSize: 16,
    color: isDark ? '#f9fafb' : '#1f2937',
    fontWeight: '500'},
  checkmark: {
    fontSize: 20,
    color: '#7c3aed',
    fontWeight: 'bold'},
  modalCloseButton: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8},
  modalCloseButtonText: {
    color: isDark ? '#d1d5db' : '#6b7280',
    fontSize: 16,
    fontWeight: '600'},

  pageTitleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb'},
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#1f2937',
    textAlign: 'center'}}); }
