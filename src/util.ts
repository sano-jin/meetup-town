/* 色々便利な共用する関数
 *
 */


export { map2Json, json2Map, getTimeString };

// Map オブジェクトを JSON に変換する
const map2Json = (mapObject: Map<any, any>): string => {
    return JSON.stringify(mapObject, (_, val) => {
        if (val instanceof Map) {
            return {
                __type__: 'Map',
                __value__: [...val]
            };
        }
        return val;
    });
}


// JSON を文字列で受け取り，Map オブジェクトへ変換する
const json2Map = (jsonObject: string): Map<any, any> => {
    return JSON.parse(jsonObject, function (_, val) {
        if (val != null && val.__type__ === 'Map') {
            return new Map(val.__value__);
        }
        return val;
    });
}


// 現在時刻の文字列を取得する
const getTimeString = (): string => {
    const date = new Date();
    const hours = `0${date.getHours()}`.slice(-2);
    const minutes = `0${date.getMinutes()}`.slice(-2);
    //    const seconds = `0${date.getSeconds()}`.slice(-2);
    const dateString = `${hours}:${minutes}`;
    return dateString;
};


