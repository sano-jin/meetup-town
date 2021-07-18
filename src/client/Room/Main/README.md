# Zoom のメイン画面

ディレクトリ構成をなんとかしたい


- Elm Architecture でいうところの Model, View, update/command (reduce)
- Redux などで置き換えたい気分


- [Model.tsx](Model.tsx)
    - クライアントサイドの **状態** やその更新を行う関数を定義するモジュール
    - これがトップレベル（エントリーポイント）となる
	- Elm Architecture でいうところの Model（と command と update）
    - Redux などで置き換えたい気分


- [Model.tsx](Model.tsx)
    - クライアントサイドの状態の型


- [View.tsx](View.tsx)
    - 部屋に入って名前も入力した後のメイン画面
    - 画面は下部にメニューバーを表示し，
	  中央のペインは 30:70 で左右に分割して，左にチャット画面，右にメイン画面（カメラの映像・共有スライド）を表示する
  

- [View/](View)
    - メイン画面 （View）のコンポーネント


- [reduce.ts](reduce.ts)
    - クライアントサイドの **状態** の更新に必要な関数を定義するモジュール
    - `updateWith + ...` の実装をしている（下記参照）
	- Elm Architecture でいうところの update
    - Redux などで置き換えたい気分
    - サーバと通信をするための TypeScript





## 状態を変化させる関数の実装（命名規則）

雑なコーディング規約
- これはこうすることを強制するとか言うことでは全然なくて，
  「ぼくはできるだけこうするつもりなので，そう思って読むと読みやすいかも」
  と言うだけ
- 従う必要はないし，むしろもっと良いやり方があるなら是非そうするべき
- 僕がこれに従っていない場合は，おそらく直し忘れなので，できれば直しておいてください



### サブモジュールで定義され，親モジュールで使われる状態の更新を行う関数

   Redux などの導入を後でしやすくするために，
   サブモジュールで定義され，親モジュールで使われる，状態変化（副作用）を起こす関数は，
   `updateWith` + <呼び出す引数・状況> のように命名することにする

   これらの関数は
   1. ゼロ個以上の引数と，一つ前の状態を渡し
   2. 次の状態を返す（この戻り値を使って，状態の更新を行う）

      ```typescript
	// 自分が部屋に入ったとサーバから返事が返ってきた場合
	// 自分の userId と先に部屋にいた人たちの情報をサーバに返してもらう
	socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
	    this.setState(state => updateWithJoined(myUserId, jsonStrOtherUsers)(state);
	});
      ```

   
   `updateWith` + ... は常にサブモジュールからインポートされて使用される
   - props として，サブモジュールに渡すようなことはしない

### 親モジュールで定義され，サブモジュールで使われる状態の更新を伴う関数

   Redux を後で導入しやすくするために，
   親モジュールで定義され，サブモジュールで使われる，状態変化（副作用）を起こす関数は，
   `dispatch` + <動作> のように命名することにする
 
   内部でさらに他の状態変化を起こす関数を呼び出す際は，
   1. それらを全て先に呼び出してから，
   2. （必要なら）状態の更新を行う
   ように実装する
 

   ```typescript
     // チャットメッセージの送信による状態変化
     const dispatchSendChatMessage = (chatMessage: ChatMessage) => {
	 this.dispatchSendMessageTo(undefined)({ type: 'chat', chatMessage }); // チャットをブロードキャスト送信
	 this.setState(state => ({
	     ...state, chats: [...state.chats, chatMessage] // 自分のチャットメッセージ一覧にも追加しておく
	 }));
     };
   ```

   `dispatch` + ... は常に props として，親モジュールからサブモジュールに渡す
   - サブモジュールからインポートされて使用されるようなことはしない









# サーバと通信をするための TypeScript，クライアントサイドの状態の型など


ディレクトリ構成をなんとかしたい


- [clientState.ts](clientState.ts)
    - クライアントサイドの **状態** の型を定義するモジュール
	- Elm Architecture でいうところの Model の型宣言
    - Redux などで置き換えたい気分
	- クライアントサイドの状態の型はこのディレクトリにおくべきではない気がする（Main.tsx の近くが良い？）


- [client.ts](client.ts)
    - サーバと通信をするための TypeScript，クライアントサイドの状態の型など


- [config.ts](config.ts)
    - Ice server の config
	- こういう API のキーみたいなのはルートディレクトリに持って行った方が良いかも
