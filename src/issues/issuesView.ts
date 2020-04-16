/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IssueModel } from '../github/issueModel';
import { MilestoneModel } from '../github/milestoneModel';
import { StateManager } from './stateManager';
import { Resource } from '../common/resources';

export class IssuesTreeData implements vscode.TreeDataProvider<IssueModel | MilestoneModel | vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<IssueModel | MilestoneModel | null | undefined> = new vscode.EventEmitter();
	public onDidChangeTreeData: vscode.Event<IssueModel | MilestoneModel | null | undefined> = this._onDidChangeTreeData.event;
	private firstLabel: string | undefined;

	constructor(private stateManager: StateManager, context: vscode.ExtensionContext) {
		context.subscriptions.push(this.stateManager.onDidChangeIssueData(() => {
			this._onDidChangeTreeData.fire();
		}));

		context.subscriptions.push(this.stateManager.onDidChangeCurrentIssue(() => {
			this._onDidChangeTreeData.fire();
		}));
	}

	getTreeItem(element: IssueModel | MilestoneModel | vscode.TreeItem): vscode.TreeItem {
		let treeItem: vscode.TreeItem;
		if (element instanceof vscode.TreeItem) {
			treeItem = element;
			treeItem.collapsibleState = element.label === this.firstLabel ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
		} else if (!(element instanceof IssueModel)) {
			treeItem = new vscode.TreeItem(element.milestone.title, element.issues.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
		} else {
			treeItem = new vscode.TreeItem(`${element.number}: ${element.title}`, vscode.TreeItemCollapsibleState.None);
			treeItem.iconPath = {
				light: Resource.icons.light.Issues,
				dark: Resource.icons.dark.Issues
			};
			if (this.stateManager.currentIssue?.issue.number === element.number) {
				treeItem.label = `✓ ${treeItem.label}`;
				treeItem.contextValue = 'currentissue';
			} else {
				treeItem.contextValue = 'issue';
			}
		}
		return treeItem;
	}

	getChildren(element: IssueModel | MilestoneModel | vscode.TreeItem | undefined): Promise<(IssueModel | MilestoneModel)[]> | IssueModel[] | vscode.TreeItem[] {
		if (element === undefined) {
			// If there's only one query, don't display a title for it
			if (this.stateManager.issueCollection.size === 1) {
				return Array.from(this.stateManager.issueCollection.values())[0];
			}
			const queryLabels = Array.from(this.stateManager.issueCollection.keys());
			this.firstLabel = queryLabels[0];
			return queryLabels.map(label => {
				const item = new vscode.TreeItem(label);
				item.contextValue = 'query';
				return item;
			});
		} else if (element instanceof vscode.TreeItem) {
			return this.stateManager.issueCollection.get(element.label!) ?? [];
		} else if (!(element instanceof IssueModel)) {
			return element.issues;
		} else {
			return [];
		}
	}

}