# Zoom のメイン画面

ディレクトリ構成をなんとかしたい


- [Main.tsx](Main.tsx)
    - クライアントサイドの **状態** やその更新に必要な関数を定義するモジュール
    - これがトップレベル（エントリーポイント）となる
	- Elm Architecture でいうところの Model
    - Redux などで置き換えたい気分
	

- [UI.tsx](Main.tsx)
    - 部屋に入って名前も入力した後のメイン画面
    - 画面は下部にメニューバーを表示し，
	  中央のペインは 30:70 で左右に分割して，左にチャット画面，右にメイン画面（カメラの映像・共有スライド）を表示する
  

- [UI/](components)
    - メイン画面 （UI）のコンポーネント

- [ts/](ts)
    - サーバと通信をするための TypeScript，クライアントサイドの状態の型など
	- クライアントサイドの状態の型はこのディレクトリにおくべきではない気がする（Main.tsx の近くが良い？）
	- config.ts はルートディレクトリに持って行った方が良いかも
	

・チャットとかを動的にサイズ変更するのは react-rnd を使うと楽  
・ビデオの高さをいい感じにしたい