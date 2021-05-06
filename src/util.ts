export { map2Json, json2Map, getStringFromUser, getTimeString };

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

const getTimeString = (): string => {
    const date = new Date();
    const hours = `0${date.getHours()}`.slice(-2);
    const minutes = `0${date.getMinutes()}`.slice(-2);
    //    const seconds = `0${date.getSeconds()}`.slice(-2);
    const dateString = `${hours}:${minutes}`;
    return dateString;
};


