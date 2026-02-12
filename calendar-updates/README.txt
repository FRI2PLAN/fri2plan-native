📦 CALENDAR UPDATES - INSTRUCTIONS D'INSTALLATION
================================================

✅ FICHIERS INCLUS :
- screens/CalendarScreen.tsx (modifié - ~1800 lignes)
- package.json (modifié - expo-document-picker ajouté)
- todo.md (modifié - phases 2-7 terminées)

🔧 INSTALLATION (5 minutes) :

1. Extraire ce ZIP
2. Copier les fichiers dans votre projet local fri2plan-native :
   - Remplacer screens/CalendarScreen.tsx
   - Remplacer package.json
   - Remplacer todo.md

3. Dans le terminal de votre projet :
   npm install

4. Faire le commit Git :
   git add -A
   git commit -m "Calendar improvements: icon toggles, day click, dropdown, filters, ICS import"
   git push

5. Faire le build EAS :
   eas build --platform android --profile preview

🎉 AMÉLIORATIONS INCLUSES :

Phase 2: Toggle icônes uniquement (📅30, 📆7, 🗓️1, 📝)
Phase 3: Clic jour vide → Modal création (horaires pré-remplis)
Phase 4: Clic jour plein → Dropdown événements + modification
Phase 5: Événements filtrés par vue (Mois/Semaine/Jour/Agenda)
Phase 6: Filtres événements (catégorie + membre) avec badge
Phase 7: Import ICS basique (sélection fichier .ics)

⚠️ IMPORTANT :
- Vous ne perdez AUCUN code existant
- Seuls 3 fichiers sont remplacés
- Tout le reste de votre projet reste intact
- expo-document-picker sera installé automatiquement avec npm install

✅ RIEN N'EST PERDU !
