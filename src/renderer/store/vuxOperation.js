import store from './index'

export function GetVuxData(dataName) {
    return store.state[dataName]
}

export function SetVuxData(newData, dataName) {
    store.commit('SetData', {
        newData: newData,
        dataName: dataName
    })
}

export function GenerateComputed(dataName, setCallback) {
    return {
        set(newData) {
            SetVuxData(newData, dataName)
            if (setCallback) {
                setCallback(newData);
            }
        },
        get() {
            return GetVuxData(dataName)
        }
    }
}
