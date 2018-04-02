import store from './index'

function GetVuxData(dataName) {
    return store.state[dataName]
}

function SetVuxData(newData, dataName) {
    store.commit('SetData', {
        newData: newData,
        dataName: dataName
    })
}

export function GenerateComputed(dataName, setCallback) {
    return {
        set(newData) {
            if (setCallback) {
                setCallback();
            }
            return SetVuxData(newData, dataName)
        },
        get() {
            return GetVuxData(dataName)
        }
    }
}
