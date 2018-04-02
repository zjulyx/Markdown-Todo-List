import Vue from 'vue'
import Vuex from 'vuex'
import * as util from "../../utils/util";
import * as constants from "../../model/constants";
import {
    remote
} from 'electron'

let initSharedData = JSON.parse(JSON.stringify(remote.getGlobal('sharedData')))

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        [constants.FilterText]: '',
        [constants.TabsData]: initSharedData[constants.TabsData],
        [constants.CurTab]: initSharedData[constants.CurTab],
        [constants.Files]: initSharedData[constants.Files],
        [constants.NewTodo]: '',
        [constants.TitleNotEditing]: true,
        [constants.CurDate]: util.FormatDateTime(new Date())
    },
    mutations: {
        SetData(state, payload) {
            let newData = payload.newData
            state[payload.dataName] = newData
        }
    }
})
