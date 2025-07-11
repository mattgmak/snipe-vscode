import * as vscode from "vscode";

interface TabItem extends vscode.QuickPickItem {
  tabGroup: vscode.TabGroup;
  tab: vscode.Tab;
  shortcut?: string;
}

// Priority keys similar to snipe.nvim's dictionary
// const PRIORITY_KEYS = "sadflewcmpghio";
const PRIORITY_KEYS = "fjdksla;vmc,x.z/ghtybnrueiwoqp";

function getShortcut(index: number): string {
  if (index < PRIORITY_KEYS.length) {
    return PRIORITY_KEYS[index];
  }
  return "";
}

function formatLabel(label: string, shortcut: string): string {
  if (!shortcut) {
    return label;
  }

  // Get the configuration for uppercase/lowercase shortcuts
  const useUpperCase = vscode.workspace
    .getConfiguration("snipe-vscode")
    .get("uppercaseShortcuts", true);

  // Format the shortcut based on the case preference
  const formattedShortcut = useUpperCase
    ? shortcut.toUpperCase()
    : shortcut.toLowerCase();

  // Using ANSI codes for colored keyboard-style shortcut formatting
  return `${formattedShortcut} | ${label}`;
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  // const allLanguageContributes = vscode.extensions.all
  //   .map((ext) => {
  //     if (ext.packageJSON.contributes?.languages) {
  //       return ext.packageJSON.contributes.languages;
  //     }
  //     return null;
  //   })
  //   .flat()
  //   .filter((language) => language?.id && Array.isArray(language.extensions))
  //   .map((language) => {
  //     return [language.id, language.extensions];
  //   });
  // const allLanguageAssociations = Object.fromEntries(allLanguageContributes);
  // console.log(allLanguageAssociations);
  let disposable = vscode.commands.registerCommand(
    "snipe-vscode.switchTab",
    async () => {
      const tabGroups = vscode.window.tabGroups;
      const allTabs: TabItem[] = [];
      let shortcutIndex = 0;

      // Get configuration and active tab
      const showCurrentTab = vscode.workspace
        .getConfiguration("snipe-vscode")
        .get("showCurrentTab", false);
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      // const config = vscode.workspace.getConfiguration();
      // const iconTheme = config.get("workbench.iconTheme");
      // let extId = "";
      // let extJSON = {};
      // for (const ext of vscode.extensions.all) {
      //   if (ext.packageJSON.contributes?.iconThemes) {
      //     const id = ext.packageJSON.contributes.iconThemes[0].id;
      //     if (id === iconTheme) {
      //       extId = ext.id;
      //       extJSON = ext.packageJSON;
      //       const iconThemeId = ext.packageJSON.contributes.iconThemes[0].id;
      //       const themePath = path.join(
      //         ext.extensionPath,
      //         ext.packageJSON.contributes.iconThemes[0].path
      //       );
      //       const contributes = ext.packageJSON.contributes;
      //       console.log(contributes);
      //       console.log(iconThemeId);
      //       console.log(themePath);
      //       break;
      //     }
      //   }
      // }

      // Collect all tabs from all groups with dividers
      tabGroups.all.forEach((group, groupIndex) => {
        // Add group header
        if (groupIndex > 0) {
          allTabs.push({
            label: "─".repeat(30),
            description: "",
            tabGroup: group,
            tab: group.tabs[0],
            kind: vscode.QuickPickItemKind.Separator,
          });
        }

        allTabs.push({
          label: `Tab Group ${groupIndex + 1}`,
          description: group.isActive ? "(Active)" : "",
          tabGroup: group,
          tab: group.tabs[0],
          kind: vscode.QuickPickItemKind.Separator,
        });

        // Add tabs for this group
        group.tabs.forEach((tab) => {
          // Skip the current tab if showCurrentTab is false
          if (!showCurrentTab && tab === activeTab) {
            return;
          }

          const shortcut = getShortcut(shortcutIndex++);
          const label = tab.label;
          const description =
            tab.input instanceof vscode.TabInputText
              ? vscode.workspace.asRelativePath(tab.input.uri)
              : undefined;

          allTabs.push({
            label: formatLabel(label, shortcut),
            description,
            tabGroup: group,
            tab,
            shortcut,
            iconPath: vscode.ThemeIcon.File,
          });
        });
      });

      // Create quickpick with keyboard shortcuts
      const quickPick = vscode.window.createQuickPick<TabItem>();
      quickPick.items = allTabs;
      quickPick.placeholder =
        "Select tab to switch to... (type shortcut key to switch instantly)";
      quickPick.matchOnDescription = true;

      // Handle alias shortcuts
      quickPick.onDidChangeValue((value) => {
        // Check if typed character matches any special character command
        const specialCharacterCommands = vscode.workspace
          .getConfiguration("snipe-vscode")
          .get<Record<string, string>>("specialCharacterCommands", {
            " ": "workbench.action.quickOpen",
          });

        if (specialCharacterCommands[value]) {
          quickPick.hide();
          vscode.commands.executeCommand(specialCharacterCommands[value]);
          return;
        }

        quickPick.hide();
        const shortcutTab = allTabs.find(
          (tab) =>
            tab.shortcut === value.toLowerCase() &&
            tab.kind !== vscode.QuickPickItemKind.Separator
        );
        if (shortcutTab) {
          if (shortcutTab.tab.input instanceof vscode.TabInputText) {
            vscode.window.showTextDocument(shortcutTab.tab.input.uri, {
              preview: false,
              viewColumn: shortcutTab.tabGroup.viewColumn,
              preserveFocus: false,
            });
          }
        }
      });

      // Handle enter key
      quickPick.onDidAccept(async () => {
        const selectedTab = quickPick.selectedItems[0];
        if (
          selectedTab &&
          selectedTab.kind !== vscode.QuickPickItemKind.Separator &&
          selectedTab.tab.input instanceof vscode.TabInputText
        ) {
          await vscode.window.showTextDocument(selectedTab.tab.input.uri, {
            preview: false,
            viewColumn: selectedTab.tabGroup.viewColumn,
            preserveFocus: false,
          });
        }
        quickPick.hide();
      });

      quickPick.show();
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
