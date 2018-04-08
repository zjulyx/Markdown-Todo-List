import store from './index'
import * as constants from '../../model/constants';

function GetVuxData(dataName) {
    return store.state[dataName]
}

function SetVuxData(newData, dataName) {
    store.commit('SetData', {
        newData: newData,
        dataName: dataName
    })
}

export function GetCurTab() {
    return GetVuxData(constants.CurTab)
}

export function SetCurTab(newData) {
    SetVuxData(newData, constants.CurTab)
}
