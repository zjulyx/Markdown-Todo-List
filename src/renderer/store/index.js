import Vue from 'vue'
import Vuex from 'vuex'
import * as constants from "../../model/constants";
import * as util from "../../utils/util";
import {
    remote
} from 'electron'

let initSharedData = JSON.parse(JSON.stringify(remote.getGlobal('sharedData')))

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        [constants.CurTab]: initSharedData[constants.CurTab],
        [constants.CurId]: initSharedData[constants.CurId],
        [constants.OnlyShowContentDate]: initSharedData[constants.OnlyShowContentDate],
        [constants.FullHeight]: util.GetCurrentFullHeight(),
        [constants.FullWidth]: util.GetCurrentFullWidth()
    },
    mutations: {
        SetData(state, payload) {
            let newData = payload.newData
            state[payload.dataName] = newData
        }
    }
})
