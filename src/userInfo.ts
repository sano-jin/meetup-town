/* ユーザ情報（名前）
 *
*/

export { UserInfo, UserId };

// 現在ユーザ情報は名前のみ
interface UserInfo {
    userName: string
}

// UserId はユーザに一意に割り当てる文字列
// TODO: 「文字列」じゃなくてもっとちゃんとした型にしておきたい？
type UserId = string;
