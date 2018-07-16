'use strict';
import { join } from 'path';
import * as vscode from 'vscode';
import { parseTestName, platformWin32, quote } from './util';

export function activate(context: vscode.ExtensionContext) {
  let terminalStack: vscode.Terminal[] = [];

  function getLatestTerminal() {
    return terminalStack[terminalStack.length - 1];
  }

  function getJestPath(): string {
    const jestPath: string = vscode.workspace.getConfiguration().get('jestrunner.jestPath');
    if (jestPath) {
      return jestPath;
    }
    const jestDirectoy = platformWin32() ? 'node_modules/jest/bin/jest.js' : 'node_modules/.bin/jest';
    return join(vscode.workspace.workspaceFolders[0].uri.fsPath, jestDirectoy);
  }

  function getConfigPath(): string {
    const configPath: string = vscode.workspace.getConfiguration().get('jestrunner.configPath');
    if (!configPath) {
      return;
    }
    return join(vscode.workspace.workspaceFolders[0].uri.fsPath, configPath);
  }

  vscode.window.onDidCloseTerminal(() => {
    terminalStack = [];
  });

  const runJest = vscode.commands.registerCommand('extension.runJest', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const configuration = getConfigPath();
    const testName = parseTestName(editor);

    const jestPath = getJestPath();

    if (terminalStack.length === 0) {
      terminalStack.push(vscode.window.createTerminal('jest'));
    }

    let command = `node ${jestPath} -t ${quote(testName)}`;
    if (configuration) {
      command += ` -c ${quote(configuration)}`;
    }

    await editor.document.save();

    const terminal = getLatestTerminal();
    terminal.show();
    terminal.sendText(command);
  });

  const debugJest = vscode.commands.registerCommand('extension.debugJest', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const configuration = getConfigPath();
    const testName = parseTestName(editor);

    const config = {
      args: [],
      console: 'integratedTerminal',
      internalConsoleOptions: 'neverOpen',
      name: 'Debug Jest Tests',
      program: getJestPath(),
      request: 'launch',
      env: {
          'NODE_PATH': '.'
      },
      type: 'node',
      skipFiles: [
          "${workspaceFolder}/node_modules/**/*.js",
          "<node_internals>/**/*.js"
      ]
    };

    config.args.push('-i');
    if (configuration) {
      config.args.push('-c');
      config.args.push(configuration);
    }
    config.args.push('-t');
    config.args.push(testName);
    config.args.push('--testPathPattern');
    config.args.push(vscode.window.activeTextEditor.document.fileName);

    await editor.document.save();

    vscode.debug.startDebugging(undefined, config);
  });

  context.subscriptions.push(runJest);
  context.subscriptions.push(debugJest);
}

export function deactivate() {
  // deactivate
}
