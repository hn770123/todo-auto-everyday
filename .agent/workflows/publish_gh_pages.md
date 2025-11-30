---
description: GitHub Pagesへの自動デプロイ手順
---

このワークフローは、GitHub Actionsを使用して変更を自動的にGitHub Pagesにデプロイするための手順です。

1. **GitHub Actionsの設定確認**
   - `.github/workflows/static.yml` がリポジトリに含まれていることを確認します（作成済みです）。

2. **コードのプッシュ**
   - 変更をコミットし、GitHubリポジトリの `main` ブランチにプッシュします。

3. **GitHubリポジトリの設定**
   - GitHubリポジトリのページを開きます。
   - "Settings" > "Pages" に移動します。
   - **Build and deployment** セクションの "Source" で、**"GitHub Actions"** を選択します。
     - ※以前の "Deploy from a branch" から変更する必要があります。

4. **デプロイの確認**
   - "Actions" タブに移動し、"Deploy static content to Pages" ワークフローが実行されていることを確認します。
   - 完了すると、緑色のチェックマークが付きます。
   - "Settings" > "Pages" に表示されているURLにアクセスして、サイトが更新されていることを確認します。
