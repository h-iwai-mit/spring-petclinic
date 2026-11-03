# PetClinic E2E

初回準備:

```bash
npm ci
npx playwright install --with-deps chromium
npm run e2e:verify
```

標準H2初期データを使用します。8080番ポートの既存サーバーを再利用し、未起動ならPlaywrightのwebServerがMaven Wrapperで起動します。Chromium・workers=1・ヘッドレスが既定です。Dev Containerの再構築は不要です。

- 正本: [specification.yaml](specification.yaml)
- 生成仕様書: [test-specification.md](test-specification.md)
- 状態モデル: [state-model.json](state-model.json)
- 発見調査: [MVC](discovery-mvc.json)、[テンプレート](discovery-templates.json)、[ブラウザ](discovery-browser.json)
- [網羅性管理表](coverage-matrix.md)、[実行報告](execution-report.md)、[再開状態](progress.json)
- 独立レビュー: [review.md](review.md)、[発見照合](reconciliation.json)

仕様変更後は`npm run e2e:generate-docs`でMarkdownを生成します。直接編集は禁止です。`e2e:verify`は型検査、検証器の不正データ試験、仕様・参照・実装・POM検証、全ブラウザ試験、実行時網羅性、証跡完全性を順番に検証します。失敗時は非ゼロ終了し、`e2e/evidence/run-*/verification.json`に失敗段階を保存します。

各操作の前後PNG・操作記録、全アサーションの期待値/実測値/結果、ログ、HTMLレポート、失敗Traceは`e2e/evidence/run-*/`に保存します。リトライは`attempt-N`で分離されます。最新runは`e2e/evidence/latest.json`で参照できます。`npx playwright show-report <runのhtmlディレクトリ>`で閲覧してください。証跡はGit管理対象外のため、別環境では再実行が必要です。

既存の通知消去スクリプトには欠落DOM要素参照の例外があり、実行報告で追跡しています。画面状態の検証とJavaScript例外ゼロは別の基準です。
