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
