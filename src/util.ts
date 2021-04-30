export { map2Json, json2Map, getStringFromUser };

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

const json2Map = (jsonObject: string): Map<any, any> => {
    return JSON.parse(jsonObject, function (_, val) {
        if (val != null && val.__type__ === 'Map') {
            return new Map(val.__value__);
        }
        return val;
    });
}

const getStringFromUser = (message: string): string => {
    let roomName = prompt(message);
    while (roomName === null || roomName === '') {
        roomName = prompt(message);
    }
    return roomName;
}

