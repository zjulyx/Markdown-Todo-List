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

// export function GenerateComputed(dataName, setCallback) {
//     return {
//         set(newData) {
//             SetVuxData(newData, dataName)
//             if (setCallback) {
//                 setCallback(newData);
//             }
//         },
//         get() {
//             return GetVuxData(dataName)
//         }
//     }
// }
