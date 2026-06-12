import type { Language, Theme } from "../preferences";

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export interface Strings {
  app: {
    projects: string;
    sections: string;
    pages: string;
    newProject: string;
    newSection: string;
    newPage: string;
    noProjects: string;
    noPageSelected: string;
    untitled: string;
    saving: string;
    saved: string;
    syncing: string;
    synced: string;
    syncConflictTitle: string;
    syncConflictMessage: string;
    keepDrive: string;
    keepThisComputer: string;
  };
  editor: {
    placeholder: string;
    heading1: string;
    heading2: string;
    bold: string;
    italic: string;
    strikethrough: string;
    bulletList: string;
    numberedList: string;
    checklist: string;
    quote: string;
    codeBlock: string;
    image: string;
  };
  dialogs: {
    cancel: string;
    close: string;
    ok: string;
    create: string;
    delete: string;
    import: string;
    connectErrorTitle: string;
    connectErrorMessage: (error: string) => string;
    importBackupTitle: string;
    importBackupMessage: string;
    deleteTitle: (label: string) => string;
    deleteMessage: string;
    createProjectTitle: string;
    createProjectLabel: string;
    createProjectPlaceholder: string;
    createSectionTitle: string;
    createSectionLabel: string;
    createSectionPlaceholder: string;
    exportBackupTitle: string;
    exportBackupDefaultName: string;
    backupFilterName: string;
    importDialogTitle: string;
    pickBackgroundTitle: string;
    imageFilterName: string;
  };
  titleBar: {
    toggleSidebar: string;
    keyboardShortcuts: string;
    preferences: string;
    minimize: string;
    maximize: string;
    close: string;
  };
  prefs: {
    title: string;
    save: string;
    accountGroup: string;
    customizationGroup: string;
    utilityGroup: string;
    profile: string;
    yourName: string;
    theme: string;
    accent: string;
    editorBackground: string;
    none: string;
    chooseImage: string;
    opacity: string;
    ambient: string;
    floatingParticles: string;
    backup: string;
    export: string;
    import: string;
    language: string;
    sync: string;
    connectDrive: string;
    disconnect: string;
    syncNow: string;
    syncing: string;
    connected: string;
    lastSync: string;
    themes: Record<Theme, string>;
    languages: Record<Language, string>;
  };
  command: {
    placeholder: string;
    createPage: string;
    createProject: string;
    exportBackup: string;
    importBackup: string;
    keyboardShortcuts: string;
    navigate: string;
    open: string;
    close: string;
  };
  find: {
    placeholder: string;
    previous: string;
    next: string;
    close: string;
  };
  shortcuts: {
    title: string;
    groups: ShortcutGroup[];
  };
}
