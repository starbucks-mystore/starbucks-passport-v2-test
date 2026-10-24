# マイストアパスポート Ver.2.0 βテスト公開手順

## 目的と安全策

このフォルダのファイルは **テスト用の別リポジトリ** だけにアップロードしてください。現行リポジトリ `starbucks-passport` には何も変更しません。

- 推奨テスト用リポジトリ名: `starbucks-passport-v2-test`
- テスト用URLの形（デプロイ完了後のみ有効）: `https://starbucks-mystore.github.io/starbucks-passport-v2-test/`
- GitHub Pagesの同一ユーザーホスト内では別パスでもIndexedDB等のオリジンが共通です。本β版のIndexedDB名は `msp-v2-beta-test-20261025` として旧版とは分離しています。
- ベータ版で記録した訪問履歴は本番へ自動移行しません。定期的にJSONバックアップしてください。
- 本β版は公開ウェブページです。`noindex`指定は検索エンジンに対する依頼であり、アクセス制限ではありません。

## GitHub Pagesで公開（現行サイトを変更しない）

1. GitHubで **別の新規リポジトリ** `starbucks-passport-v2-test` を作成（公開リポジトリ）。
2. この `publish/` 内のファイル（`.nojekyll` を含む）を **新規リポジトリのルート** にアップロードしてコミットします。`publish` というフォルダ自体を1階層含めて配置しないでください。
3. 新規リポジトリの `Settings` → `Pages` → `Build and deployment` で、`Source: Deploy from a branch`、`Branch: main`、`Folder: /(root)` を選び `Save`。
4. `Settings` → `Pages` に表示された公開URLにアクセスし、表示を確認します。
5. まずはiPhone Safariからテストし、訪問記録、再読み込み時の保持、JSONバックアップ・復元、検索、地図表示を確認します。
6. 正式公開への切り替えは旧版の訪問記録移行テストが完了してから。β版を現行リポジトリへそのまま上書きしないでください。

公式手順: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 注意点

- HTTPSで配信してください（位置情報はHTTPS等の安全なコンテキストが必要）。
- 外部地図はLeaflet CDNとOSMタイルにアクセスします。地図表示はネットワークと提供元の利用条件に依存します。
- `stores.json` は2,176店舗、うち66閉店の**試験マスター**。全国最新情報を保証しません。
- 同名でも旧店・新店は別ID。訪問履歴の自動統合や自動移行をしません。
- Safariのプライベートブラウズや端末のデータ削除で、端末内データは失われる可能性があります。
