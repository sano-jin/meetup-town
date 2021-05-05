export {
    map2Json,
    json2Map,
    getStringFromUser,
    waitPred,
    waitNonNull
};

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



function waitForOnce<T>(thunk: () => T): Promise<T> {
    const promise: Promise<T> = new Promise((resolve, _) => {
        window.setTimeout(() => resolve(thunk()), 500);
    });
    return promise;
};

/** 
 *  wait a bound value to become non null.
*/
async function waitPred<T>(pred: (arg: T) => boolean, thunk: () => T): Promise<T> {
    let th = thunk();
    let i = 0;
    while (pred(th) && i++ < 4) {
        th = await waitForOnce<T>(thunk);
    }
    return th;
};

async function waitNonNull<T>(thunk: () => T | null | undefined): Promise<T> {
    return (await waitPred<T | null | undefined>(th => th === null || th === undefined, thunk))!;
}
