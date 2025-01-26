// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

interface TabItem {
  label: string;
  description?: string;
  tabGroup: vscode.TabGroup;
  tab: vscode.Tab;
  shortcut?: string;
  kind?: vscode.QuickPickItemKind;
}

// Priority keys similar to snipe.nvim's dictionary
const PRIORITY_KEYS = "sadflewcmpghio";

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
  // Using a keyboard symbol and formatting the shortcut in a box-like style
  return `⌨ [${shortcut.toUpperCase()}] ${label}`;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("snipe-vscode is now active");

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
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
          });
        });
      });

      // Create quickpick with keyboard shortcuts
      const quickPick = vscode.window.createQuickPick<TabItem>();
      quickPick.items = allTabs;
      quickPick.placeholder =
        "Select tab to switch to... (type shortcut key to switch instantly)";
      quickPick.matchOnDescription = true;

      // Handle keyboard shortcuts
      quickPick.onDidChangeValue((value) => {
        const shortcutTab = allTabs.find(
          (tab) =>
            tab.shortcut === value.toLowerCase() &&
            tab.kind !== vscode.QuickPickItemKind.Separator
        );
        if (shortcutTab) {
          quickPick.hide();
          if (shortcutTab.tab.input instanceof vscode.TabInputText) {
            vscode.window.showTextDocument(shortcutTab.tab.input.uri, {
              preview: false,
              viewColumn: shortcutTab.tabGroup.viewColumn,
              preserveFocus: false,
            });
          }
        }
      });

      // Handle normal selection
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

// This method is called when your extension is deactivated
export function deactivate() {}
