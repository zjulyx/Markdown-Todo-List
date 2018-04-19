import moment from 'moment'
import * as constants from '../model/constants'
import { remote, dialog } from 'electron'

export function IsMainProcess() {
    return process.type === constants.MainProcess
}

export function RemoveNullElementFromArray(arr) {
    let res = []
    arr.forEach(item => {
        if (item) {
            res.push(item)
        }
    })
    return res
}

export function ConvertProgressToDisplay(val) {
    return `${(val * 100 / constants.MAXPROGRESS).toFixed(2)}%`
}

export function ConvertProgressToInternal(str) {
    return parseFloat(str) * constants.MAXPROGRESS / 100
}

export function FormatDateTime(date) {
    if (!date || !moment(date).isValid()) {
        // invalid date
        return null
    } else {
        return moment(date).format('YYYY-MM-DD')
    }
}

export function GenerateNewTabData(filename, content) {
    let today = FormatDateTime(Date.now())
    return {
        [constants.Content]: content,
        [constants.FileName]: filename,
        [constants.TitleNotEditing]: true,
        [constants.CurDate]: today,
        [constants.FilterText]: '',
        [constants.NewTodo]: ''
    }
}

export function ShowDialog(msg, { type = constants.DialogTypes.error, resolve = null, reject = null } = {}) {
    let curDialog = IsMainProcess() ? dialog : remote.dialog

    curDialog.showMessageBox({
        type: type,
        buttons: type === constants.DialogTypes.question ? ['OK', 'Cancel'] : [],
        message: msg
    }, (response) => {
        if (response === 0) {
            // OK
            if (resolve) {
                resolve()
            }
        } else {
            // Cancel
            if (reject) {
                reject()
            }
        }
    })
}

export function ShowError(msg) {
    ShowDialog(msg, {
        type: constants.DialogTypes.error
    })
}

export function GetCurrentFullHeight() {
    return remote.getCurrentWindow().getContentBounds().height
}

export function GetCurrentFullWidth() {
    return remote.getCurrentWindow().getContentBounds().width
}
