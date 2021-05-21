# selenium-test

Selenium によるテストスクリプト

現在 `test2.py` しかメンテしていない．

## How to
### GUI を目視で確認しながらテストしたい場合
1. webdriver をダウンロードして，このディレクトリ`/test`に解凍
2. `python3 test.py` を実行する
   1. webpack を用いたコンパイル
   2. サーバが，<http://localhost:8000> で Listen する
   3. selenium が上記アドレスにアクセスしに行き，`Create a new room` ボタンをクリックする

### Docker で（Headless で）テストしたい場合
1. docker を走らせておく
2. `testWithDocker.sh` を実行する

## Todo

- テストの追加
- 関数の分離



