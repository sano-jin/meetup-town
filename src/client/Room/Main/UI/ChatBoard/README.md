# Zoom のメイン画面で使うコンポーネント

ディレクトリ構成をなんとかしたい


- [ChatMessageBoard.tsx](ChatMessageBoard.tsx)
    - 送受信したチャットメッセージの一覧を表示する

- [ChatSender.tsx](ChatSender.tsx)
    - チャットを送信するための送信ボックス

- [ChatBoard.tsx](ChatBoard.tsx)
    - チャットのためのコンポーネントのトップレベル
    - 現在まだこれを使わずに UI.tsx から直接 ChatMessageBoard.tsx, ChatSender.tsx を呼び出している

